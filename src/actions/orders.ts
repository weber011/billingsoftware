"use server";

import { safeRevalidatePath } from "@/lib/revalidate";
import {
  readCollection,
  writeCollection,
  OpticalOrder,
  Customer,
  Prescription,
  BusinessSettings,
  AuditLogEntry,
  initializeStoreIfEmpty,
} from "@/lib/store";

export async function getOrders(filterStatus?: string): Promise<OpticalOrder[]> {
  initializeStoreIfEmpty();
  const orders = readCollection<OpticalOrder>("orders", []);
  if (!filterStatus || filterStatus === "ALL") {
    return orders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }
  return orders
    .filter((o) => o.status === filterStatus)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function getOrderById(id: string): Promise<OpticalOrder | null> {
  initializeStoreIfEmpty();
  const orders = readCollection<OpticalOrder>("orders", []);
  return orders.find((o) => o.id === id) || null;
}

export async function createOrder(data: {
  customerId: string;
  prescriptionId?: string;
  expectedCompletionDate?: string;
  assignedToName?: string;
  labInfo?: string;
  fittingDetails?: string;
  advancePaid?: number;
  internalNotes?: string;
  items: Array<{
    productId?: string;
    description: string;
    itemType: "FRAME" | "LENS" | "ACCESSORY" | "SERVICE";
    quantity: number;
    unitPrice: number;
    discount?: number;
  }>;
}): Promise<{ success: boolean; order?: OpticalOrder; error?: string }> {
  try {
    initializeStoreIfEmpty();
    if (!data.customerId) {
      return { success: false, error: "Customer is required" };
    }
    if (!data.items || data.items.length === 0) {
      return { success: false, error: "At least one item is required in the order" };
    }

    const customers = readCollection<Customer>("customers", []);
    const customer = customers.find((c) => c.id === data.customerId);
    if (!customer) {
      return { success: false, error: "Customer not found" };
    }

    let prescriptionSnapshot: Partial<Prescription> | undefined = undefined;
    if (data.prescriptionId) {
      const allRx = readCollection<Prescription>("prescriptions", []);
      const rx = allRx.find((r) => r.id === data.prescriptionId);
      if (rx) {
        prescriptionSnapshot = {
          prescriptionCode: rx.prescriptionCode,
          examinationDate: rx.examinationDate,
          prescribedBy: rx.prescribedBy,
          rightSph: rx.rightSph,
          rightCyl: rx.rightCyl,
          rightAxis: rx.rightAxis,
          rightAdd: rx.rightAdd,
          rightVa: rx.rightVa,
          leftSph: rx.leftSph,
          leftCyl: rx.leftCyl,
          leftAxis: rx.leftAxis,
          leftAdd: rx.leftAdd,
          leftVa: rx.leftVa,
          pd: rx.pd,
          pdRight: rx.pdRight,
          pdLeft: rx.pdLeft,
          lensRecommendation: rx.lensRecommendation,
        };
      }
    }

    const settings = readCollection<BusinessSettings>("business_settings")[0];
    const nextNum = settings?.orderNextNumber || 201;
    const prefix = settings?.orderPrefix || "ORD";
    const orderNumber = `${prefix}-${nextNum}`;

    if (settings) {
      settings.orderNextNumber = nextNum + 1;
      writeCollection("business_settings", [settings]);
    }

    const orderItems = data.items.map((it, idx) => {
      const qty = Math.max(1, Number(it.quantity) || 1);
      const price = Math.max(0, Number(it.unitPrice) || 0);
      const disc = Math.max(0, Number(it.discount) || 0);
      const total = Math.max(0, qty * price - disc);
      return {
        id: `item-${Date.now()}-${idx}`,
        productId: it.productId,
        description: it.description,
        itemType: it.itemType,
        quantity: qty,
        unitPrice: price,
        discount: disc,
        totalPrice: total,
      };
    });

    const totalAmount = orderItems.reduce((acc, it) => acc + it.totalPrice, 0);
    const advancePaid = Math.min(totalAmount, Math.max(0, Number(data.advancePaid) || 0));
    const balanceDue = Math.max(0, totalAmount - advancePaid);

    const initialStatus =
      advancePaid > 0 || totalAmount === 0 ? "ORDER_CONFIRMED" : "PAYMENT_PENDING";

    const orders = readCollection<OpticalOrder>("orders", []);
    const newOrder: OpticalOrder = {
      id: `ord-${Date.now()}`,
      orderNumber,
      customerId: customer.id,
      customerName: customer.name,
      customerPhone: customer.phone,
      prescriptionId: data.prescriptionId,
      prescriptionSnapshot,
      orderDate: new Date().toISOString(),
      expectedCompletionDate: data.expectedCompletionDate,
      status: initialStatus,
      assignedToName: data.assignedToName || "Optician Staff",
      labInfo: data.labInfo,
      fittingDetails: data.fittingDetails,
      items: orderItems,
      totalAmount,
      advancePaid,
      balanceDue,
      internalNotes: data.internalNotes,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    orders.push(newOrder);
    writeCollection("orders", orders);

    // Audit log
    const auditLogs = readCollection<AuditLogEntry>("audit_logs", []);
    auditLogs.push({
      id: `audit-${Date.now()}`,
      eventType: "CREATE",
      module: "orders",
      recordType: "OpticalOrder",
      recordId: newOrder.id,
      description: `Created optical order ${newOrder.orderNumber} for patient ${customer.name} (Amount: ₹${totalAmount})`,
      createdAt: new Date().toISOString(),
    });
    writeCollection("audit_logs", auditLogs);

    safeRevalidatePath("/orders");
    safeRevalidatePath(`/patients/${customer.id}`);
    return { success: true, order: newOrder };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to create order" };
  }
}

export async function updateOrderStatus(
  orderId: string,
  newStatus: OpticalOrder["status"],
  notes?: string
): Promise<{ success: boolean; order?: OpticalOrder; error?: string }> {
  try {
    initializeStoreIfEmpty();
    const orders = readCollection<OpticalOrder>("orders", []);
    const index = orders.findIndex((o) => o.id === orderId);
    if (index === -1) return { success: false, error: "Order not found" };

    const order = orders[index];
    const prevStatus = order.status;
    order.status = newStatus;
    order.updatedAt = new Date().toISOString();
    if (notes) {
      order.internalNotes = order.internalNotes ? `${order.internalNotes} | ${notes}` : notes;
    }

    orders[index] = order;
    writeCollection("orders", orders);

    // Audit log
    const auditLogs = readCollection<AuditLogEntry>("audit_logs", []);
    auditLogs.push({
      id: `audit-${Date.now()}`,
      eventType: "UPDATE_STATUS",
      module: "orders",
      recordType: "OpticalOrder",
      recordId: order.id,
      description: `Changed order ${order.orderNumber} status from ${prevStatus} to ${newStatus}`,
      createdAt: new Date().toISOString(),
    });
    writeCollection("audit_logs", auditLogs);

    safeRevalidatePath("/orders");
    safeRevalidatePath(`/orders/${orderId}`);
    return { success: true, order };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to update order status" };
  }
}
