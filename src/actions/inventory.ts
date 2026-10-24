"use server";

import { safeRevalidatePath } from "@/lib/revalidate";
import {
  readCollection,
  writeCollection,
  Product,
  StockMovement,
  AuditLogEntry,
  initializeStoreIfEmpty,
} from "@/lib/store";

export async function getProducts(options?: {
  category?: string;
  searchQuery?: string;
  lowStockOnly?: boolean;
}): Promise<Product[]> {
  initializeStoreIfEmpty();
  let products = readCollection<Product>("products", []);

  if (options?.category && options.category !== "ALL") {
    products = products.filter((p) => p.category === options.category);
  }

  if (options?.lowStockOnly) {
    products = products.filter((p) => p.trackInventory && p.currentStock <= p.reorderThreshold);
  }

  if (options?.searchQuery && options.searchQuery.trim() !== "") {
    const q = options.searchQuery.toLowerCase().trim();
    products = products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        p.brand.toLowerCase().includes(q) ||
        (p.barcode && p.barcode.includes(q)) ||
        (p.model && p.model.toLowerCase().includes(q))
    );
  }

  return products.sort((a, b) => a.name.localeCompare(b.name));
}

export async function getProductById(id: string): Promise<{
  product: Product | null;
  movements: StockMovement[];
}> {
  initializeStoreIfEmpty();
  const products = readCollection<Product>("products", []);
  const product = products.find((p) => p.id === id) || null;
  const allMovements = readCollection<StockMovement>("stock_movements", []);
  const movements = allMovements
    .filter((m) => m.productId === id)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return { product, movements };
}

export async function createProduct(data: {
  sku: string;
  name: string;
  category: Product["category"];
  brand: string;
  model?: string;
  description?: string;
  barcode?: string;
  supplierId?: string;
  purchaseCost: number;
  sellingPrice: number;
  hsnCode: string;
  gstRate: number;
  isVerifiedRate?: boolean;
  reorderThreshold?: number;
  initialStock?: number;

  // Frame
  frameShape?: string;
  frameMaterial?: string;
  frameColor?: string;
  eyeSize?: string;
  bridgeSize?: string;
  templeLength?: string;

  // Lens
  lensType?: string;
  lensMaterial?: string;
  refractiveIndex?: string;
  isPhotochromic?: boolean;
  isBlueFilter?: boolean;
}): Promise<{ success: boolean; product?: Product; error?: string }> {
  try {
    initializeStoreIfEmpty();
    if (!data.name || data.name.trim() === "") {
      return { success: false, error: "Product name is required" };
    }
    if (!data.sku || data.sku.trim() === "") {
      return { success: false, error: "SKU is required" };
    }

    const products = readCollection<Product>("products", []);
    if (products.some((p) => p.sku.toLowerCase() === data.sku.toLowerCase())) {
      return { success: false, error: `SKU '${data.sku}' already exists` };
    }

    const initialStock = Math.max(0, Number(data.initialStock) || 0);

    const newProduct: Product = {
      id: `prod-${Date.now()}`,
      sku: data.sku.trim().toUpperCase(),
      name: data.name.trim(),
      category: data.category,
      brand: data.brand.trim(),
      model: data.model?.trim() || undefined,
      description: data.description?.trim() || undefined,
      barcode: data.barcode?.trim() || undefined,
      supplierId: data.supplierId || undefined,
      purchaseCost: Math.max(0, Number(data.purchaseCost) || 0),
      sellingPrice: Math.max(0, Number(data.sellingPrice) || 0),
      hsnCode: data.hsnCode?.trim() || "9003",
      gstRate: Number(data.gstRate) || 12,
      isVerifiedRate: data.isVerifiedRate ?? false,
      isActive: true,
      trackInventory: true,
      reorderThreshold: Math.max(0, Number(data.reorderThreshold) || 5),
      currentStock: initialStock,

      frameShape: data.frameShape,
      frameMaterial: data.frameMaterial,
      frameColor: data.frameColor,
      eyeSize: data.eyeSize,
      bridgeSize: data.bridgeSize,
      templeLength: data.templeLength,
      lensType: data.lensType,
      lensMaterial: data.lensMaterial,
      refractiveIndex: data.refractiveIndex,
      isPhotochromic: data.isPhotochromic,
      isBlueFilter: data.isBlueFilter,

      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    products.push(newProduct);
    writeCollection("products", products);

    // Initial stock movement record if stock > 0
    if (initialStock > 0) {
      const movements = readCollection<StockMovement>("stock_movements", []);
      movements.push({
        id: `mov-${Date.now()}`,
        productId: newProduct.id,
        productName: newProduct.name,
        movementType: "INITIAL",
        quantity: initialStock,
        previousStock: 0,
        newStock: initialStock,
        reason: "Initial inventory setup",
        performedBy: "Store Manager",
        createdAt: new Date().toISOString(),
      });
      writeCollection("stock_movements", movements);
    }

    // Audit log
    const auditLogs = readCollection<AuditLogEntry>("audit_logs", []);
    auditLogs.push({
      id: `audit-${Date.now()}`,
      eventType: "CREATE",
      module: "inventory",
      recordType: "Product",
      recordId: newProduct.id,
      description: `Added product ${newProduct.name} (${newProduct.sku}) with ${initialStock} units`,
      createdAt: new Date().toISOString(),
    });
    writeCollection("audit_logs", auditLogs);

    safeRevalidatePath("/inventory");
    return { success: true, product: newProduct };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to create product" };
  }
}

export async function adjustStock(data: {
  productId: string;
  adjustmentQty: number; // positive to add, negative to remove
  reason: string;
  performedBy?: string;
}): Promise<{ success: boolean; newStock?: number; error?: string }> {
  try {
    initializeStoreIfEmpty();
    if (!data.productId) return { success: false, error: "Product is required" };
    if (!data.reason || data.reason.trim() === "") {
      return { success: false, error: "Reason for stock adjustment is required for audit trail" };
    }

    const products = readCollection<Product>("products", []);
    const index = products.findIndex((p) => p.id === data.productId);
    if (index === -1) return { success: false, error: "Product not found" };

    const product = products[index];
    const previousStock = product.currentStock;
    const newStock = previousStock + data.adjustmentQty;

    if (newStock < 0) {
      return {
        success: false,
        error: `Adjustment would cause negative inventory (${newStock}). Current available stock is ${previousStock}.`,
      };
    }

    product.currentStock = newStock;
    product.updatedAt = new Date().toISOString();
    products[index] = product;
    writeCollection("products", products);

    // Record stock movement ledger
    const movements = readCollection<StockMovement>("stock_movements", []);
    movements.push({
      id: `mov-${Date.now()}`,
      productId: product.id,
      productName: product.name,
      movementType: "ADJUSTMENT",
      quantity: data.adjustmentQty,
      previousStock,
      newStock,
      referenceType: "ADJUSTMENT",
      reason: data.reason.trim(),
      performedBy: data.performedBy || "Store Manager",
      createdAt: new Date().toISOString(),
    });
    writeCollection("stock_movements", movements);

    // Audit log
    const auditLogs = readCollection<AuditLogEntry>("audit_logs", []);
    auditLogs.push({
      id: `audit-${Date.now()}`,
      eventType: "ADJUST_STOCK",
      module: "inventory",
      recordType: "Product",
      recordId: product.id,
      description: `Adjusted stock for ${product.name} by ${data.adjustmentQty} (New: ${newStock}). Reason: ${data.reason}`,
      createdAt: new Date().toISOString(),
    });
    writeCollection("audit_logs", auditLogs);

    safeRevalidatePath("/inventory");
    return { success: true, newStock };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to adjust stock" };
  }
}

export async function getStockMovements(): Promise<StockMovement[]> {
  initializeStoreIfEmpty();
  const movements = readCollection<StockMovement>("stock_movements", []);
  return movements.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}
