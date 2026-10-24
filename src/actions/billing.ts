"use server";

import { safeRevalidatePath } from "@/lib/revalidate";
import {
  readCollection,
  writeCollection,
  Invoice,
  Payment,
  CreditNote,
  Customer,
  Product,
  StockMovement,
  BusinessSettings,
  OpticalOrder,
  AuditLogEntry,
  initializeStoreIfEmpty,
  getInitialBusinessSettings,
} from "@/lib/store";
import { calculateGSTInvoice, LineItemInput, roundTo2 } from "@/lib/gst";

export async function getInvoices(filterStatus?: string): Promise<Invoice[]> {
  initializeStoreIfEmpty();
  const invoices = readCollection<Invoice>("invoices", []);
  if (!filterStatus || filterStatus === "ALL") {
    return invoices.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }
  return invoices
    .filter((inv) => inv.status === filterStatus)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function getInvoiceById(id: string): Promise<{
  invoice: Invoice | null;
  payments: Payment[];
  creditNotes: CreditNote[];
  settings: BusinessSettings;
}> {
  initializeStoreIfEmpty();
  const invoices = readCollection<Invoice>("invoices", []);
  const invoice = invoices.find((inv) => inv.id === id) || null;
  const allPayments = readCollection<Payment>("payments", []);
  const payments = allPayments.filter((p) => p.invoiceId === id);
  const allCN = readCollection<CreditNote>("credit_notes", []);
  const creditNotes = allCN.filter((cn) => cn.invoiceId === id);
  const settings = readCollection<BusinessSettings>("business_settings")[0] || getInitialBusinessSettings();

  return { invoice, payments, creditNotes, settings };
}

export async function createAndFinalizeInvoice(data: {
  customerId: string;
  orderId?: string;
  isTaxInclusive?: boolean;
  placeOfSupplyCode?: string; // 2-digit e.g. "27"
  invoiceDiscountAmount?: number;
  notes?: string;
  items: Array<{
    productId?: string;
    description: string;
    hsnCode: string;
    quantity: number;
    unitPrice: number;
    discountPercent?: number;
    discountAmount?: number;
    gstRate: number;
    isVerifiedRate?: boolean;
  }>;
  payment?: {
    amount: number;
    paymentMethod: Payment["paymentMethod"];
    transactionRef?: string;
  };
}): Promise<{ success: boolean; invoice?: Invoice; error?: string }> {
  try {
    initializeStoreIfEmpty();
    if (!data.customerId) {
      return { success: false, error: "Customer is required" };
    }
    if (!data.items || data.items.length === 0) {
      return { success: false, error: "At least one item is required on the invoice" };
    }

    const customers = readCollection<Customer>("customers", []);
    const customer = customers.find((c) => c.id === data.customerId);
    if (!customer) {
      return { success: false, error: "Customer not found" };
    }

    const settings = readCollection<BusinessSettings>("business_settings")[0] || {
      id: "biz-1",
      name: "LensArt Optical Retailers",
      stateCode: "27",
      isGstRegistered: true,
      invoiceNextNumber: 101,
      invoicePrefix: "INV-26",
    };
    const supplierStateCode = settings.stateCode || "27";
    const placeOfSupplyCode = data.placeOfSupplyCode || customer.state || supplierStateCode;

    // 1. Server-side tax & total computation
    const calcInput: LineItemInput[] = data.items.map((it) => ({
      description: it.description,
      hsnCode: it.hsnCode,
      quantity: Number(it.quantity) || 1,
      unitPrice: Number(it.unitPrice) || 0,
      discountPercent: Number(it.discountPercent) || 0,
      discountAmount: Number(it.discountAmount) || 0,
      gstRate: Number(it.gstRate) || 0,
      isVerifiedRate: it.isVerifiedRate ?? false,
    }));

    const calcResult = calculateGSTInvoice(calcInput, {
      isTaxInclusive: data.isTaxInclusive ?? false,
      supplierStateCode,
      placeOfSupplyCode,
      isSupplierGstRegistered: settings.isGstRegistered,
      invoiceDiscountAmount: data.invoiceDiscountAmount,
    });

    // 2. Generate unique sequential invoice number
    const nextNum = settings.invoiceNextNumber || 101;
    const prefix = settings.invoicePrefix || "INV-26";
    const invoiceNumber = `${prefix}-${nextNum.toString().padStart(4, "0")}`;

    settings.invoiceNextNumber = nextNum + 1;
    writeCollection("business_settings", [settings]);

    // 3. Stock deduction & inventory verification
    const products = readCollection<Product>("products", []);
    const movements = readCollection<StockMovement>("stock_movements", []);

    for (let i = 0; i < data.items.length; i++) {
      const it = data.items[i];
      if (it.productId) {
        const prodIndex = products.findIndex((p) => p.id === it.productId);
        if (prodIndex !== -1) {
          const prod = products[prodIndex];
          if (prod.trackInventory) {
            const qtyNeeded = Number(it.quantity) || 1;
            const prevStock = prod.currentStock;
            const newStock = prevStock - qtyNeeded;

            prod.currentStock = newStock;
            prod.updatedAt = new Date().toISOString();
            products[prodIndex] = prod;

            // Log stock movement
            movements.push({
              id: `mov-${Date.now()}-${i}`,
              productId: prod.id,
              productName: prod.name,
              movementType: "SALE_OUT",
              quantity: -qtyNeeded,
              previousStock: prevStock,
              newStock,
              referenceType: "INVOICE",
              reason: `Billed in invoice ${invoiceNumber}`,
              performedBy: "Billing Staff",
              createdAt: new Date().toISOString(),
            });
          }
        }
      }
    }
    writeCollection("products", products);
    writeCollection("stock_movements", movements);

    // 4. Record Initial Payment if specified
    const initialPaymentAmount = Math.min(
      calcResult.finalPayable,
      Math.max(0, Number(data.payment?.amount) || 0)
    );
    const balanceDue = roundTo2(calcResult.finalPayable - initialPaymentAmount);

    const invoiceId = `inv-${Date.now()}`;
    const finalizedDate = new Date().toISOString();

    const invoiceItems = calcResult.items.map((ci, idx) => ({
      id: `inv-item-${Date.now()}-${idx}`,
      productId: data.items[idx]?.productId,
      description: ci.description,
      hsnCode: ci.hsnCode || "9003",
      quantity: ci.quantity,
      unitPrice: ci.unitPrice,
      discount: ci.totalDiscount,
      taxableAmount: ci.taxableValue,
      gstRate: ci.gstRate,
      isVerifiedRate: ci.isVerifiedRate,
      cgstAmount: ci.cgstAmount,
      sgstAmount: ci.sgstAmount,
      igstAmount: ci.igstAmount,
      totalAmount: ci.totalAmount,
    }));

    const newInvoice: Invoice = {
      id: invoiceId,
      invoiceNumber,
      invoiceDate: finalizedDate,
      customerId: customer.id,
      customerName: customer.name,
      customerPhone: customer.phone,
      customerAddress: customer.address,
      customerGstin: customer.gstin,
      orderId: data.orderId,
      status: "FINALIZED",
      placeOfSupply: placeOfSupplyCode,
      placeOfSupplyCode,
      isInterState: calcResult.isInterState,
      isTaxInclusive: calcResult.isTaxInclusive,
      subtotal: calcResult.subtotal,
      totalDiscount: calcResult.totalDiscount,
      taxableAmount: calcResult.taxableAmount,
      cgstTotal: calcResult.cgstTotal,
      sgstTotal: calcResult.sgstTotal,
      igstTotal: calcResult.igstTotal,
      totalTax: calcResult.totalTax,
      grandTotal: calcResult.grandTotal,
      roundOff: calcResult.roundOff,
      finalAmount: calcResult.finalPayable,
      amountPaid: initialPaymentAmount,
      balanceDue,
      items: invoiceItems,
      taxSummary: calcResult.taxSummary.map((ts) => ({
        hsnCode: ts.hsnCode || "9003",
        gstRate: ts.gstRate,
        taxableAmount: ts.taxableAmount,
        cgstAmount: ts.cgstAmount,
        sgstAmount: ts.sgstAmount,
        igstAmount: ts.igstAmount,
        totalTax: ts.totalTax,
        hasUnverifiedRate: ts.hasUnverifiedRate,
      })),
      notes: data.notes,
      finalizedAt: finalizedDate,
      finalizedBy: "Billing Staff",
      createdAt: finalizedDate,
      updatedAt: finalizedDate,
    };

    const invoices = readCollection<Invoice>("invoices", []);
    invoices.push(newInvoice);
    writeCollection("invoices", invoices);

    // Record Payment
    if (initialPaymentAmount > 0 && data.payment) {
      const payments = readCollection<Payment>("payments", []);
      const payNum = payments.length + 101;
      payments.push({
        id: `pay-${Date.now()}`,
        paymentNumber: `PAY-${payNum}`,
        invoiceId: newInvoice.id,
        invoiceNumber: newInvoice.invoiceNumber,
        customerId: customer.id,
        customerName: customer.name,
        amount: initialPaymentAmount,
        paymentMethod: data.payment.paymentMethod || "CASH",
        transactionRef: data.payment.transactionRef,
        paymentDate: finalizedDate,
        status: "COMPLETED",
        recordedBy: "Billing Staff",
        createdAt: finalizedDate,
      });
      writeCollection("payments", payments);
    }

    // If linked to an order, update order status & invoice ID
    if (data.orderId) {
      const orders = readCollection<OpticalOrder>("orders", []);
      const ordIdx = orders.findIndex((o) => o.id === data.orderId);
      if (ordIdx !== -1) {
        const ord = orders[ordIdx];
        ord.invoiceId = newInvoice.id;
        ord.advancePaid = roundTo2(ord.advancePaid + initialPaymentAmount);
        ord.balanceDue = Math.max(0, ord.totalAmount - ord.advancePaid);
        if (balanceDue === 0 && ord.status === "READY_FOR_COLLECTION") {
          ord.status = "DELIVERED";
        }
        ord.updatedAt = finalizedDate;
        orders[ordIdx] = ord;
        writeCollection("orders", orders);
      }
    }

    // Audit log
    const auditLogs = readCollection<AuditLogEntry>("audit_logs", []);
    auditLogs.push({
      id: `audit-${Date.now()}`,
      eventType: "FINALIZE",
      module: "billing",
      recordType: "Invoice",
      recordId: newInvoice.id,
      description: `Finalized GST Tax Invoice ${newInvoice.invoiceNumber} for ₹${newInvoice.finalAmount} (Paid: ₹${initialPaymentAmount}, Balance: ₹${balanceDue})`,
      createdAt: finalizedDate,
    });
    writeCollection("audit_logs", auditLogs);

    safeRevalidatePath("/billing");
    safeRevalidatePath(`/patients/${customer.id}`);
    return { success: true, invoice: newInvoice };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to finalize invoice" };
  }
}

export async function recordPayment(data: {
  invoiceId: string;
  amount: number;
  paymentMethod: Payment["paymentMethod"];
  transactionRef?: string;
  notes?: string;
}): Promise<{ success: boolean; payment?: Payment; error?: string }> {
  try {
    initializeStoreIfEmpty();
    if (!data.invoiceId) return { success: false, error: "Invoice is required" };
    const payAmt = Number(data.amount);
    if (!payAmt || payAmt <= 0) return { success: false, error: "Payment amount must be greater than zero" };

    const invoices = readCollection<Invoice>("invoices", []);
    const invIdx = invoices.findIndex((i) => i.id === data.invoiceId);
    if (invIdx === -1) return { success: false, error: "Invoice not found" };

    const invoice = invoices[invIdx];
    if (payAmt > invoice.balanceDue) {
      return {
        success: false,
        error: `Payment amount (₹${payAmt}) cannot exceed outstanding balance (₹${invoice.balanceDue})`,
      };
    }

    const newAmountPaid = roundTo2(invoice.amountPaid + payAmt);
    const newBalanceDue = roundTo2(invoice.finalAmount - newAmountPaid);

    invoice.amountPaid = newAmountPaid;
    invoice.balanceDue = newBalanceDue;
    invoice.updatedAt = new Date().toISOString();
    invoices[invIdx] = invoice;
    writeCollection("invoices", invoices);

    const payments = readCollection<Payment>("payments", []);
    const payNum = payments.length + 101;
    const newPayment: Payment = {
      id: `pay-${Date.now()}`,
      paymentNumber: `PAY-${payNum}`,
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      customerId: invoice.customerId,
      customerName: invoice.customerName,
      amount: payAmt,
      paymentMethod: data.paymentMethod,
      transactionRef: data.transactionRef,
      paymentDate: new Date().toISOString(),
      status: "COMPLETED",
      notes: data.notes,
      recordedBy: "Cashier",
      createdAt: new Date().toISOString(),
    };
    payments.push(newPayment);
    writeCollection("payments", payments);

    // Audit log
    const auditLogs = readCollection<AuditLogEntry>("audit_logs", []);
    auditLogs.push({
      id: `audit-${Date.now()}`,
      eventType: "PAYMENT",
      module: "billing",
      recordType: "Payment",
      recordId: newPayment.id,
      description: `Recorded payment ${newPayment.paymentNumber} of ₹${payAmt} via ${data.paymentMethod} for invoice ${invoice.invoiceNumber}`,
      createdAt: new Date().toISOString(),
    });
    writeCollection("audit_logs", auditLogs);

    safeRevalidatePath("/billing");
    safeRevalidatePath(`/billing/${invoice.id}`);
    return { success: true, payment: newPayment };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to record payment" };
  }
}

export async function createCreditNote(data: {
  invoiceId: string;
  reason: string;
  items: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    taxableAmount: number;
    gstRate: number;
    totalAmount: number;
    returnReason: string;
    itemCondition: "GOOD" | "DAMAGED" | "DEFECTIVE";
    restockable: boolean;
    productId?: string;
  }>;
}): Promise<{ success: boolean; creditNote?: CreditNote; error?: string }> {
  try {
    initializeStoreIfEmpty();
    const invoices = readCollection<Invoice>("invoices", []);
    const invoice = invoices.find((i) => i.id === data.invoiceId);
    if (!invoice) return { success: false, error: "Invoice not found" };

    const subtotal = data.items.reduce((acc, it) => acc + it.taxableAmount, 0);
    const totalAmount = data.items.reduce((acc, it) => acc + it.totalAmount, 0);
    const taxAmount = roundTo2(totalAmount - subtotal);

    const creditNotes = readCollection<CreditNote>("credit_notes", []);
    const cnNumber = `CN-${creditNotes.length + 101}`;

    const newCreditNote: CreditNote = {
      id: `cn-${Date.now()}`,
      creditNoteNumber: cnNumber,
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      customerId: invoice.customerId,
      customerName: invoice.customerName,
      creditNoteDate: new Date().toISOString(),
      reason: data.reason,
      items: data.items,
      subtotal,
      taxAmount,
      totalAmount,
      status: "ISSUED",
      createdBy: "Store Manager",
      createdAt: new Date().toISOString(),
    };

    creditNotes.push(newCreditNote);
    writeCollection("credit_notes", creditNotes);

    // Restock evaluation: ONLY restock if condition is GOOD and marked restockable
    const products = readCollection<Product>("products", []);
    const movements = readCollection<StockMovement>("stock_movements", []);

    for (const item of data.items) {
      if (item.productId && item.restockable && item.itemCondition === "GOOD") {
        const pIdx = products.findIndex((p) => p.id === item.productId);
        if (pIdx !== -1) {
          const prod = products[pIdx];
          const prev = prod.currentStock;
          const nextStock = prev + item.quantity;
          prod.currentStock = nextStock;
          prod.updatedAt = new Date().toISOString();
          products[pIdx] = prod;

          movements.push({
            id: `mov-${Date.now()}`,
            productId: prod.id,
            productName: prod.name,
            movementType: "RETURN_IN",
            quantity: item.quantity,
            previousStock: prev,
            newStock: nextStock,
            referenceType: "RETURN",
            reason: `Restocked returned item from Credit Note ${cnNumber}`,
            performedBy: "Store Manager",
            createdAt: new Date().toISOString(),
          });
        }
      }
    }
    writeCollection("products", products);
    writeCollection("stock_movements", movements);

    // Audit log
    const auditLogs = readCollection<AuditLogEntry>("audit_logs", []);
    auditLogs.push({
      id: `audit-${Date.now()}`,
      eventType: "CREDIT_NOTE",
      module: "billing",
      recordType: "CreditNote",
      recordId: newCreditNote.id,
      description: `Issued Credit Note ${cnNumber} for invoice ${invoice.invoiceNumber} amounting to ₹${totalAmount}`,
      createdAt: new Date().toISOString(),
    });
    writeCollection("audit_logs", auditLogs);

    safeRevalidatePath("/billing");
    return { success: true, creditNote: newCreditNote };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to create credit note" };
  }
}
