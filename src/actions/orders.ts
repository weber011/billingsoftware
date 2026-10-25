"use server";

import { prisma } from "@/lib/prisma";
import { safeRevalidatePath } from "@/lib/revalidate";

export async function getOrders(filterStatus?: string) {
  const where = filterStatus && filterStatus !== "ALL" ? { status: filterStatus } : undefined;
  const orders = await prisma.opticalOrder.findMany({
    where,
    include: { items: true, customer: true, invoices: true },
    orderBy: { createdAt: "desc" },
  });

  return orders.map((o) => ({
    id: o.id,
    orderNumber: o.orderNumber,
    customerId: o.customerId,
    customerName: o.customer.name,
    customerPhone: o.customer.phone || null,
    prescriptionId: o.prescriptionId,
    orderDate: o.orderDate.toISOString(),
    expectedCompletionDate: o.expectedCompletionDate?.toISOString(),
    status: o.status,
    labInfo: o.labInfo,
    fittingDetails: o.fittingDetails,
    prescriptionSnapshot: o.prescriptionSnapshot,
    totalAmount: Number(o.totalAmount),
    advancePaid: Number(o.advancePaid),
    balanceDue: Number(o.balanceDue),
    internalNotes: o.internalNotes,
    invoiceId: o.invoices?.[0]?.id || null,
    createdAt: o.createdAt.toISOString(),
    updatedAt: o.updatedAt.toISOString(),
    items: o.items.map((it) => ({
      id: it.id,
      productId: it.productId,
      description: it.description,
      itemType: it.itemType,
      quantity: it.quantity,
      unitPrice: Number(it.unitPrice),
      discount: Number(it.discount),
      totalPrice: Number(it.totalPrice),
    })),
  }));
}

export async function getOrderById(id: string) {
  const order = await prisma.opticalOrder.findUnique({
    where: { id },
    include: { items: true, customer: true, statusHistory: { orderBy: { createdAt: "desc" } }, invoices: true },
  });

  if (!order) return null;

  return {
    id: order.id,
    orderNumber: order.orderNumber,
    customerId: order.customerId,
    customerName: order.customer.name,
    customerPhone: order.customer.phone || null,
    prescriptionId: order.prescriptionId,
    orderDate: order.orderDate.toISOString(),
    expectedCompletionDate: order.expectedCompletionDate?.toISOString(),
    status: order.status,
    labInfo: order.labInfo,
    fittingDetails: order.fittingDetails,
    prescriptionSnapshot: order.prescriptionSnapshot,
    totalAmount: Number(order.totalAmount),
    advancePaid: Number(order.advancePaid),
    balanceDue: Number(order.balanceDue),
    internalNotes: order.internalNotes,
    invoiceId: order.invoices?.[0]?.id || null,
    createdAt: order.createdAt.toISOString(),
    updatedAt: order.updatedAt.toISOString(),
    items: order.items.map((it) => ({
      id: it.id,
      productId: it.productId,
      description: it.description,
      itemType: it.itemType,
      quantity: it.quantity,
      unitPrice: Number(it.unitPrice),
      discount: Number(it.discount),
      totalPrice: Number(it.totalPrice),
    })),
    statusHistory: order.statusHistory.map((sh) => ({
      status: sh.status,
      notes: sh.notes,
      changedBy: sh.changedBy,
      createdAt: sh.createdAt.toISOString(),
    })),
  };
}

export async function createOrder(data: {
  customerId: string;
  prescriptionId?: string;
  expectedCompletionDate?: string;
  labInfo?: string;
  fittingDetails?: string;
  advancePaid?: number;
  internalNotes?: string;
  items: Array<{
    productId?: string;
    description: string;
    itemType: string;
    quantity: number;
    unitPrice: number;
    discount?: number;
  }>;
}) {
  try {
    if (!data.customerId) return { success: false, error: "Customer is required" };
    if (!data.items?.length) return { success: false, error: "At least one item is required" };

    const customer = await prisma.customer.findUnique({ where: { id: data.customerId } });
    if (!customer) return { success: false, error: "Customer not found" };

    const branch = await prisma.branch.findFirst();
    if (!branch) return { success: false, error: "Branch not configured" };

    // Calculate totals
    const totalAmount = data.items.reduce((sum, it) => {
      const qty = Number(it.quantity) || 1;
      const price = Number(it.unitPrice) || 0;
      const disc = Number(it.discount) || 0;
      return sum + (qty * price - disc);
    }, 0);

    const advancePaid = Math.min(totalAmount, Math.max(0, Number(data.advancePaid) || 0));
    const balanceDue = Math.round((totalAmount - advancePaid) * 100) / 100;

    // Generate order number
    const orderCount = await prisma.opticalOrder.count();
    const orderNumber = `ORD-${(orderCount + 201).toString().padStart(4, "0")}`;

    // Get prescription snapshot if provided
    let prescriptionSnapshot: any = undefined;
    if (data.prescriptionId) {
      const rx = await prisma.prescription.findUnique({ where: { id: data.prescriptionId } });
      if (rx) {
        prescriptionSnapshot = {
          rightSph: rx.rightSph?.toString(), rightCyl: rx.rightCyl?.toString(),
          rightAxis: rx.rightAxis, rightAdd: rx.rightAdd?.toString(), rightVa: rx.rightVa,
          leftSph: rx.leftSph?.toString(), leftCyl: rx.leftCyl?.toString(),
          leftAxis: rx.leftAxis, leftAdd: rx.leftAdd?.toString(), leftVa: rx.leftVa,
          pd: rx.pd ? Number(rx.pd) : null,
          lensRecommendation: rx.lensRecommendation,
        };
      }
    }

    const order = await prisma.opticalOrder.create({
      data: {
        orderNumber,
        customerId: customer.id,
        prescriptionId: data.prescriptionId || null,
        branchId: branch.id,
        expectedCompletionDate: data.expectedCompletionDate ? new Date(data.expectedCompletionDate) : null,
        status: "ORDER_CONFIRMED",
        labInfo: data.labInfo || null,
        fittingDetails: data.fittingDetails || null,
        prescriptionSnapshot: prescriptionSnapshot ?? undefined,
        totalAmount,
        advancePaid,
        balanceDue,
        internalNotes: data.internalNotes || null,
        items: {
          create: data.items.map((it) => {
            const qty = Number(it.quantity) || 1;
            const price = Number(it.unitPrice) || 0;
            const disc = Number(it.discount) || 0;
            return {
              productId: it.productId || null,
              description: it.description,
              itemType: it.itemType || "OTHER",
              quantity: qty,
              unitPrice: price,
              discount: disc,
              totalPrice: qty * price - disc,
            };
          }),
        },
        statusHistory: {
          create: {
            status: "ORDER_CONFIRMED",
            notes: "Order placed",
            changedBy: "Sales Staff",
          },
        },
      },
      include: { items: true },
    });

    safeRevalidatePath("/orders");
    return {
      success: true,
      order: {
        id: order.id,
        orderNumber: order.orderNumber,
        customerId: order.customerId,
        prescriptionSnapshot: order.prescriptionSnapshot,
        totalAmount: Number(order.totalAmount),
        advancePaid: Number(order.advancePaid),
        balanceDue: Number(order.balanceDue),
        status: order.status,
        createdAt: order.createdAt.toISOString(),
      },
    };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to create order" };
  }
}

export async function updateOrderStatus(orderId: string, newStatus: string, notes?: string) {
  try {
    const order = await prisma.opticalOrder.findUnique({ where: { id: orderId } });
    if (!order) return { success: false, error: "Order not found" };

    await prisma.$transaction([
      prisma.opticalOrder.update({
        where: { id: orderId },
        data: { status: newStatus },
      }),
      prisma.orderStatusHistory.create({
        data: {
          orderId,
          status: newStatus,
          notes: notes || null,
          changedBy: "Staff",
        },
      }),
    ]);

    safeRevalidatePath("/orders");
    safeRevalidatePath(`/orders/${orderId}`);
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to update order status" };
  }
}
