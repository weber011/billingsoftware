"use server";

import { prisma } from "@/lib/prisma";
import { safeRevalidatePath } from "@/lib/revalidate";
import { calculateGSTInvoice, LineItemInput, roundTo2 } from "@/lib/gst";

function toNumber(val: any): number {
  if (val === null || val === undefined) return 0;
  return Number(val);
}

export async function getInvoices(filterStatus?: string) {
  const where = filterStatus && filterStatus !== "ALL" ? { status: filterStatus } : undefined;
  const invoices = await prisma.invoice.findMany({
    where,
    include: { items: true, payments: true, customer: true },
    orderBy: { createdAt: "desc" },
  });

  return invoices.map((inv) => ({
    id: inv.id,
    invoiceNumber: inv.invoiceNumber,
    invoiceDate: inv.invoiceDate.toISOString(),
    customerId: inv.customerId,
    customerName: inv.customerName,
    customerPhone: inv.customerPhone,
    customerAddress: inv.customerAddress,
    customerGstin: inv.customerGstin,
    orderId: inv.orderId,
    status: inv.status,
    placeOfSupply: inv.placeOfSupply,
    placeOfSupplyCode: inv.placeOfSupplyCode,
    isInterState: inv.isInterState,
    isTaxInclusive: inv.isTaxInclusive,
    subtotal: toNumber(inv.subtotal),
    totalDiscount: toNumber(inv.discountAmount),
    taxableAmount: toNumber(inv.taxableAmount),
    cgstTotal: toNumber(inv.cgstTotal),
    sgstTotal: toNumber(inv.sgstTotal),
    igstTotal: toNumber(inv.igstTotal),
    totalTax: toNumber(inv.totalTax),
    grandTotal: toNumber(inv.grandTotal),
    roundOff: toNumber(inv.roundOff),
    finalAmount: toNumber(inv.finalAmount),
    amountPaid: toNumber(inv.amountPaid),
    balanceDue: toNumber(inv.balanceDue),
    notes: inv.notes,
    createdAt: inv.createdAt.toISOString(),
    updatedAt: inv.updatedAt.toISOString(),
    items: inv.items.map((it) => ({
      id: it.id,
      productId: it.productId,
      description: it.description,
      hsnCode: it.hsnCode || "9003",
      quantity: it.quantity,
      unitPrice: toNumber(it.unitPrice),
      discount: toNumber(it.discount),
      taxableAmount: toNumber(it.taxableAmount),
      gstRate: toNumber(it.gstRate),
      cgstAmount: toNumber(it.cgstAmount),
      sgstAmount: toNumber(it.sgstAmount),
      igstAmount: toNumber(it.igstAmount),
      totalAmount: toNumber(it.totalAmount),
    })),
  }));
}

export async function getInvoiceById(id: string) {
  const invoice = await prisma.invoice.findUnique({
    where: { id },
    include: {
      items: { orderBy: { itemOrder: "asc" } },
      payments: { orderBy: { createdAt: "desc" } },
      creditNotes: true,
      taxComponents: true,
      customer: true,
    },
  });

  if (!invoice) {
    const business = await prisma.business.findFirst();
    return {
      invoice: null,
      payments: [],
      creditNotes: [],
      settings: {
        name: business?.name || "LensArt Optical Store",
        legalName: business?.legalName || "",
        address: business?.address || "",
        city: business?.city || "Ranchi",
        state: business?.state || "Jharkhand",
        stateCode: business?.stateCode || "20",
        pinCode: business?.pinCode || "834001",
        phone: business?.phone || "",
        email: business?.email || "",
        gstin: business?.gstin || "",
        isGstRegistered: business?.isGstRegistered || true,
        invoicePrefix: business?.invoicePrefix || "LA/2026-27/",
        invoiceNextNumber: business?.invoiceNextNumber || 1,
        signatory: business?.signatory || "Authorized Signatory",
        invoiceFooter: business?.invoiceFooter || "",
      },
    };
  }

  const business = await prisma.business.findFirst();

  return {
    invoice: {
      id: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      invoiceDate: invoice.invoiceDate.toISOString(),
      customerId: invoice.customerId,
      customerName: invoice.customerName,
      customerPhone: invoice.customerPhone,
      customerAddress: invoice.customerAddress,
      customerGstin: invoice.customerGstin,
      orderId: invoice.orderId,
      status: invoice.status,
      placeOfSupply: invoice.placeOfSupply || "Jharkhand",
      placeOfSupplyCode: invoice.placeOfSupplyCode || "20",
      isInterState: invoice.isInterState,
      isTaxInclusive: invoice.isTaxInclusive,
      businessName: invoice.businessName,
      businessAddress: invoice.businessAddress,
      businessGstin: invoice.businessGstin,
      businessState: invoice.businessState,
      businessStateCode: invoice.businessStateCode,
      subtotal: toNumber(invoice.subtotal),
      totalDiscount: toNumber(invoice.discountAmount),
      taxableAmount: toNumber(invoice.taxableAmount),
      cgstTotal: toNumber(invoice.cgstTotal),
      sgstTotal: toNumber(invoice.sgstTotal),
      igstTotal: toNumber(invoice.igstTotal),
      totalTax: toNumber(invoice.totalTax),
      grandTotal: toNumber(invoice.grandTotal),
      roundOff: toNumber(invoice.roundOff),
      finalAmount: toNumber(invoice.finalAmount),
      amountPaid: toNumber(invoice.amountPaid),
      balanceDue: toNumber(invoice.balanceDue),
      notes: invoice.notes,
      finalizedAt: invoice.finalizedAt?.toISOString(),
      finalizedBy: invoice.finalizedBy,
      createdAt: invoice.createdAt.toISOString(),
      updatedAt: invoice.updatedAt.toISOString(),
      items: invoice.items.map((it) => ({
        id: it.id,
        productId: it.productId,
        description: it.description,
        hsnCode: it.hsnCode || "9003",
        quantity: it.quantity,
        unitPrice: toNumber(it.unitPrice),
        discount: toNumber(it.discount),
        taxableAmount: toNumber(it.taxableAmount),
        gstRate: toNumber(it.gstRate),
        cgstAmount: toNumber(it.cgstAmount),
        sgstAmount: toNumber(it.sgstAmount),
        igstAmount: toNumber(it.igstAmount),
        totalAmount: toNumber(it.totalAmount),
      })),
      taxSummary: invoice.taxComponents.map((tc) => ({
        hsnCode: "9003",
        gstRate: toNumber(tc.taxRate),
        taxableAmount: toNumber(tc.taxableAmount),
        cgstAmount: toNumber(tc.cgstAmount),
        sgstAmount: toNumber(tc.sgstAmount),
        igstAmount: toNumber(tc.igstAmount),
        totalTax: toNumber(tc.totalTax),
        hasUnverifiedRate: false,
      })),
    },
    payments: invoice.payments.map((p) => ({
      id: p.id,
      paymentNumber: p.paymentNumber,
      invoiceId: p.invoiceId,
      invoiceNumber: invoice.invoiceNumber,
      customerId: p.customerId,
      customerName: invoice.customerName,
      amount: toNumber(p.amount),
      paymentMethod: p.paymentMethod,
      transactionRef: p.transactionRef,
      paymentDate: p.paymentDate.toISOString(),
      status: p.status,
      notes: p.notes,
      createdAt: p.createdAt.toISOString(),
    })),
    creditNotes: invoice.creditNotes.map((cn) => ({
      id: cn.id,
      creditNoteNumber: cn.creditNoteNumber,
      invoiceId: cn.invoiceId,
      invoiceNumber: invoice.invoiceNumber,
      creditNoteDate: cn.creditNoteDate.toISOString(),
      reason: cn.reason,
      subtotal: toNumber(cn.subtotal),
      taxAmount: toNumber(cn.taxAmount),
      totalAmount: toNumber(cn.totalAmount),
      status: cn.status,
      createdAt: cn.createdAt.toISOString(),
    })),
    settings: {
      name: business?.name || "LensArt",
      legalName: business?.legalName || "",
      address: business?.address || "",
      city: business?.city || "Ranchi",
      state: business?.state || "Jharkhand",
      stateCode: business?.stateCode || "20",
      pinCode: business?.pinCode || "834001",
      phone: business?.phone || "",
      email: business?.email || "",
      gstin: business?.gstin || "",
      isGstRegistered: business?.isGstRegistered || true,
      invoicePrefix: business?.invoicePrefix || "LA/2026-27/",
      invoiceNextNumber: business?.invoiceNextNumber || 1,
      signatory: business?.signatory || "Authorized Signatory",
      invoiceFooter: business?.invoiceFooter || "",
      returnPolicy: business?.returnPolicy || "",
      warrantyPolicy: business?.warrantyPolicy || "",
      termsAndConditions: business?.termsAndConditions || "",
    },
  };
}

export async function createAndFinalizeInvoice(data: {
  customerId: string;
  orderId?: string;
  isTaxInclusive?: boolean;
  placeOfSupplyCode?: string;
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
    paymentMethod: string;
    transactionRef?: string;
  };
}) {
  try {
    if (!data.customerId) return { success: false, error: "Customer is required" };
    if (!data.items?.length) return { success: false, error: "At least one item is required" };

    const customer = await prisma.customer.findUnique({ where: { id: data.customerId } });
    if (!customer) return { success: false, error: "Customer not found" };

    const business = await prisma.business.findFirst();
    if (!business) return { success: false, error: "Business settings not configured" };

    const branch = await prisma.branch.findFirst();
    if (!branch) return { success: false, error: "Branch not configured" };

    const user = await prisma.user.findFirst();
    if (!user) return { success: false, error: "System user not configured" };

    const supplierStateCode = business.stateCode || "20";
    const placeOfSupplyCode = data.placeOfSupplyCode || supplierStateCode;

    // Server-side GST calculation
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
      isSupplierGstRegistered: business.isGstRegistered,
      invoiceDiscountAmount: data.invoiceDiscountAmount,
    });

    // Generate sequential invoice number
    const nextNum = business.invoiceNextNumber;
    const prefix = business.invoicePrefix || "LA/2026-27/";
    const invoiceNumber = `${prefix}${nextNum.toString().padStart(4, "0")}`;

    // Increment invoice number
    await prisma.business.update({
      where: { id: business.id },
      data: { invoiceNextNumber: nextNum + 1 },
    });

    const initialPaymentAmount = Math.min(
      calcResult.finalPayable,
      Math.max(0, Number(data.payment?.amount) || 0)
    );
    const balanceDue = roundTo2(calcResult.finalPayable - initialPaymentAmount);

    // Create invoice with items in a transaction
    const invoice = await prisma.$transaction(async (tx) => {
      const inv = await tx.invoice.create({
        data: {
          invoiceNumber,
          invoiceDate: new Date(),
          customerId: customer.id,
          branchId: branch.id,
          orderId: data.orderId || null,
          status: "FINALIZED",
          businessName: business.name,
          businessAddress: `${business.address || ""}, ${business.city || ""}, ${business.state || ""}`,
          businessGstin: business.gstin,
          businessState: business.state,
          businessStateCode: business.stateCode,
          customerName: customer.name,
          customerPhone: customer.phone,
          customerAddress: customer.address ? `${customer.address}, ${customer.city || ""}, ${customer.state || ""}` : null,
          customerGstin: customer.gstin,
          customerState: customer.state,
          placeOfSupply: placeOfSupplyCode,
          placeOfSupplyCode,
          isInterState: calcResult.isInterState,
          isTaxInclusive: calcResult.isTaxInclusive,
          subtotal: calcResult.subtotal,
          discountAmount: calcResult.totalDiscount,
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
          notes: data.notes || null,
          footer: business.invoiceFooter,
          finalizedAt: new Date(),
          finalizedBy: user.name,
          createdById: user.id,
          items: {
            create: calcResult.items.map((ci, idx) => ({
              productId: data.items[idx]?.productId || null,
              itemOrder: idx,
              description: ci.description,
              hsnCode: ci.hsnCode || "9003",
              quantity: ci.quantity,
              unitPrice: ci.unitPrice,
              discount: ci.totalDiscount,
              taxableAmount: ci.taxableValue,
              gstRate: ci.gstRate,
              cgstAmount: ci.cgstAmount,
              sgstAmount: ci.sgstAmount,
              igstAmount: ci.igstAmount,
              totalAmount: ci.totalAmount,
            })),
          },
          taxComponents: {
            create: calcResult.taxSummary.map((ts) => ({
              taxRate: ts.gstRate,
              taxableAmount: ts.taxableAmount,
              cgstRate: calcResult.isInterState ? 0 : ts.gstRate / 2,
              cgstAmount: ts.cgstAmount,
              sgstRate: calcResult.isInterState ? 0 : ts.gstRate / 2,
              sgstAmount: ts.sgstAmount,
              igstRate: calcResult.isInterState ? ts.gstRate : 0,
              igstAmount: ts.igstAmount,
              totalTax: ts.totalTax,
            })),
          },
        },
        include: { items: true },
      });

      // Stock deduction for linked products
      for (let i = 0; i < data.items.length; i++) {
        const it = data.items[i];
        if (it.productId) {
          const product = await tx.product.findUnique({ where: { id: it.productId } });
          if (product && product.trackInventory) {
            const prevStock = product.currentStock;
            const newStock = prevStock - (Number(it.quantity) || 1);
            await tx.product.update({
              where: { id: it.productId },
              data: { currentStock: newStock },
            });
            await tx.inventoryMovement.create({
              data: {
                productId: it.productId,
                movementType: "SALE_OUT",
                quantity: -(Number(it.quantity) || 1),
                previousStock: prevStock,
                newStock,
                referenceType: "INVOICE",
                referenceId: inv.id,
                reason: `Billed in invoice ${invoiceNumber}`,
                performedBy: user.name,
              },
            });
          }
        }
      }

      // Record initial payment
      if (initialPaymentAmount > 0 && data.payment) {
        const payCount = await tx.payment.count();
        await tx.payment.create({
          data: {
            paymentNumber: `PAY-${payCount + 101}`,
            invoiceId: inv.id,
            customerId: customer.id,
            amount: initialPaymentAmount,
            paymentMethod: data.payment.paymentMethod || "CASH",
            transactionRef: data.payment.transactionRef || null,
            paymentDate: new Date(),
            status: "COMPLETED",
            recordedById: user.id,
          },
        });
      }

      return inv;
    });

    safeRevalidatePath("/billing");
    safeRevalidatePath("/dashboard");

    return {
      success: true,
      invoice: {
        id: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        invoiceDate: invoice.invoiceDate.toISOString(),
        customerId: invoice.customerId,
        customerName: invoice.customerName,
        status: invoice.status,
        finalAmount: toNumber(invoice.finalAmount),
        amountPaid: toNumber(invoice.amountPaid),
        balanceDue: toNumber(invoice.balanceDue),
        createdAt: invoice.createdAt.toISOString(),
      },
    };
  } catch (err: any) {
    console.error("Invoice creation failed:", err);
    return { success: false, error: err.message || "Failed to finalize invoice" };
  }
}

export async function recordPayment(data: {
  invoiceId: string;
  amount: number;
  paymentMethod: string;
  transactionRef?: string;
  notes?: string;
}) {
  try {
    if (!data.invoiceId) return { success: false, error: "Invoice is required" };
    const payAmt = Number(data.amount);
    if (!payAmt || payAmt <= 0) return { success: false, error: "Payment amount must be positive" };

    const invoice = await prisma.invoice.findUnique({ where: { id: data.invoiceId } });
    if (!invoice) return { success: false, error: "Invoice not found" };

    const currentBalance = toNumber(invoice.balanceDue);
    if (payAmt > currentBalance) {
      return { success: false, error: `Payment (₹${payAmt}) exceeds balance (₹${currentBalance})` };
    }

    const user = await prisma.user.findFirst();
    const payCount = await prisma.payment.count();

    const [payment] = await prisma.$transaction([
      prisma.payment.create({
        data: {
          paymentNumber: `PAY-${payCount + 101}`,
          invoiceId: invoice.id,
          customerId: invoice.customerId,
          amount: payAmt,
          paymentMethod: data.paymentMethod,
          transactionRef: data.transactionRef || null,
          paymentDate: new Date(),
          status: "COMPLETED",
          notes: data.notes || null,
          recordedById: user!.id,
        },
      }),
      prisma.invoice.update({
        where: { id: invoice.id },
        data: {
          amountPaid: roundTo2(toNumber(invoice.amountPaid) + payAmt),
          balanceDue: roundTo2(currentBalance - payAmt),
        },
      }),
    ]);

    safeRevalidatePath("/billing");
    safeRevalidatePath(`/billing/${invoice.id}`);
    return {
      success: true,
      payment: {
        ...payment,
        amount: toNumber(payment.amount),
        paymentDate: payment.paymentDate.toISOString(),
        createdAt: payment.createdAt.toISOString(),
      },
    };
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
    itemCondition: string;
    restockable: boolean;
    productId?: string;
  }>;
}) {
  try {
    const invoice = await prisma.invoice.findUnique({ where: { id: data.invoiceId } });
    if (!invoice) return { success: false, error: "Invoice not found" };

    const subtotal = data.items.reduce((acc, it) => acc + it.taxableAmount, 0);
    const totalAmount = data.items.reduce((acc, it) => acc + it.totalAmount, 0);
    const taxAmount = roundTo2(totalAmount - subtotal);

    const cnCount = await prisma.creditNote.count();
    const cnNumber = `CN-${cnCount + 101}`;

    const creditNote = await prisma.creditNote.create({
      data: {
        creditNoteNumber: cnNumber,
        invoiceId: invoice.id,
        creditNoteDate: new Date(),
        reason: data.reason,
        subtotal,
        taxAmount,
        totalAmount,
        status: "ISSUED",
        createdBy: "Store Manager",
        items: {
          create: data.items.map((it) => ({
            description: it.description,
            hsnCode: "9003",
            quantity: it.quantity,
            unitPrice: it.unitPrice,
            taxableAmount: it.taxableAmount,
            gstRate: it.gstRate,
            totalAmount: it.totalAmount,
            returnReason: it.returnReason,
            itemCondition: it.itemCondition,
            restockable: it.restockable,
          })),
        },
      },
    });

    safeRevalidatePath("/billing");
    return { success: true, creditNote: { ...creditNote, creditNoteDate: creditNote.creditNoteDate.toISOString() } };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to create credit note" };
  }
}
