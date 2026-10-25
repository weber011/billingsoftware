"use server";

import { prisma } from "@/lib/prisma";
import { safeRevalidatePath } from "@/lib/revalidate";

export async function getProducts(options?: {
  category?: string;
  searchQuery?: string;
  lowStockOnly?: boolean;
}) {
  const where: any = { isActive: true };

  if (options?.category && options.category !== "ALL") {
    const cat = await prisma.productCategory.findUnique({ where: { slug: options.category.toLowerCase() } });
    if (cat) where.categoryId = cat.id;
  }

  if (options?.lowStockOnly) {
    where.trackInventory = true;
    where.currentStock = { lte: prisma.product.fields?.reorderThreshold || 5 };
  }

  if (options?.searchQuery?.trim()) {
    const q = options.searchQuery.trim();
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { sku: { contains: q, mode: "insensitive" } },
      { brand: { contains: q, mode: "insensitive" } },
    ];
  }

  const products = await prisma.product.findMany({
    where: Object.keys(where).length > 1 || where.isActive ? where : undefined,
    include: { category: true },
    orderBy: { name: "asc" },
  });

  return products.map((p) => ({
    id: p.id,
    sku: p.sku,
    name: p.name,
    category: p.category?.name || "Uncategorized",
    brand: p.brand,
    model: p.model,
    barcode: p.barcode,
    purchaseCost: Number(p.purchaseCost),
    sellingPrice: Number(p.sellingPrice),
    hsnCode: p.hsnCode || "9003",
    gstRate: 12,
    isVerifiedRate: false,
    isActive: p.isActive,
    trackInventory: p.trackInventory,
    reorderThreshold: p.reorderThreshold,
    currentStock: p.currentStock,
    frameShape: p.frameShape,
    frameMaterial: p.frameMaterial,
    frameColor: p.frameColor,
    eyeSize: p.eyeSize,
    bridgeSize: p.bridgeSize,
    templeLength: p.templeLength,
    lensType: p.lensType,
    lensMaterial: p.lensMaterial,
    refractiveIndex: p.refractiveIndex,
    isPhotochromic: p.isPhotochromic,
    isBlueFilter: p.isBlueFilter,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  }));
}

export async function createProduct(data: {
  sku: string;
  name: string;
  category: string;
  brand?: string;
  model?: string;
  description?: string;
  barcode?: string;
  purchaseCost: number;
  sellingPrice: number;
  hsnCode?: string;
  gstRate?: number;
  isVerifiedRate?: boolean;
  currentStock?: number;
  initialStock?: number;
  reorderThreshold?: number;
  frameShape?: string;
  frameMaterial?: string;
  frameColor?: string;
  eyeSize?: string;
  bridgeSize?: string;
  templeLength?: string;
  lensType?: string;
  lensMaterial?: string;
  refractiveIndex?: string;
  isPhotochromic?: boolean;
  isBlueFilter?: boolean;
}) {
  try {
    if (!data.sku?.trim()) return { success: false, error: "SKU is required" };
    if (!data.name?.trim()) return { success: false, error: "Product name is required" };

    // Get or create category
    const catSlug = (data.category || "frames").toLowerCase().replace(/\s+/g, "-");
    let category = await prisma.productCategory.findUnique({ where: { slug: catSlug } });
    if (!category) {
      category = await prisma.productCategory.create({
        data: { name: data.category || "Frames", slug: catSlug },
      });
    }

    const initialStock = Number(data.initialStock ?? data.currentStock) || 0;
    const user = await prisma.user.findFirst();

    const product = await prisma.product.create({
      data: {
        sku: data.sku.trim(),
        name: data.name.trim(),
        description: data.description?.trim() || null,
        categoryId: category.id,
        brand: data.brand?.trim() || null,
        model: data.model?.trim() || null,
        barcode: data.barcode?.trim() || null,
        purchaseCost: data.purchaseCost || 0,
        sellingPrice: data.sellingPrice || 0,
        hsnCode: data.hsnCode || "9003",
        currentStock: initialStock,
        reorderThreshold: data.reorderThreshold || 5,
        frameShape: data.frameShape || null,
        frameMaterial: data.frameMaterial || null,
        frameColor: data.frameColor || null,
        eyeSize: data.eyeSize || null,
        bridgeSize: data.bridgeSize || null,
        templeLength: data.templeLength || null,
        lensType: data.lensType || null,
        lensMaterial: data.lensMaterial || null,
        refractiveIndex: data.refractiveIndex || null,
        isPhotochromic: data.isPhotochromic || false,
        isBlueFilter: data.isBlueFilter || false,
      },
    });

    // Record initial stock movement
    if (initialStock > 0) {
      await prisma.inventoryMovement.create({
        data: {
          productId: product.id,
          movementType: "INITIAL",
          quantity: initialStock,
          previousStock: 0,
          newStock: initialStock,
          referenceType: "ADJUSTMENT",
          reason: "Initial stock entry",
          performedBy: user?.name || "System",
        },
      });
    }

    safeRevalidatePath("/inventory");
    return { success: true, product: { ...product, purchaseCost: Number(product.purchaseCost), sellingPrice: Number(product.sellingPrice) } };
  } catch (err: any) {
    if (err.code === "P2002") return { success: false, error: "A product with this SKU already exists" };
    return { success: false, error: err.message || "Failed to create product" };
  }
}

export async function adjustStock(data: {
  productId: string;
  adjustment?: number;
  adjustmentQty?: number;
  reason: string;
  movementType?: string;
}) {
  try {
    const product = await prisma.product.findUnique({ where: { id: data.productId } });
    if (!product) return { success: false, error: "Product not found" };

    const adj = Number(data.adjustment ?? data.adjustmentQty ?? 0);
    const newStock = product.currentStock + adj;
    if (newStock < 0) {
      return { success: false, error: `Insufficient stock. Current: ${product.currentStock}, Requested: ${adj}` };
    }

    const user = await prisma.user.findFirst();

    await prisma.$transaction([
      prisma.product.update({
        where: { id: data.productId },
        data: { currentStock: newStock },
      }),
      prisma.inventoryMovement.create({
        data: {
          productId: data.productId,
          movementType: data.movementType || (adj > 0 ? "PURCHASE_IN" : "ADJUSTMENT"),
          quantity: adj,
          previousStock: product.currentStock,
          newStock,
          referenceType: "ADJUSTMENT",
          reason: data.reason || "Manual stock adjustment",
          performedBy: user?.name || "System",
        },
      }),
    ]);

    safeRevalidatePath("/inventory");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to adjust stock" };
  }
}

export async function getStockMovements(productId?: string) {
  const where = productId ? { productId } : undefined;
  const movements = await prisma.inventoryMovement.findMany({
    where,
    include: { product: true },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return movements.map((m) => ({
    id: m.id,
    productId: m.productId,
    productName: m.product.name,
    movementType: m.movementType,
    quantity: m.quantity,
    previousStock: m.previousStock,
    newStock: m.newStock,
    referenceType: m.referenceType,
    reason: m.reason,
    performedBy: m.performedBy,
    createdAt: m.createdAt.toISOString(),
  }));
}
