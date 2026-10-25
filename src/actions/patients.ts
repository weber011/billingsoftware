"use server";

import { prisma } from "@/lib/prisma";
import { safeRevalidatePath } from "@/lib/revalidate";

export async function getPatients(searchQuery?: string) {
  const where = searchQuery && searchQuery.trim() !== ""
    ? {
        OR: [
          { name: { contains: searchQuery, mode: "insensitive" as const } },
          { customerCode: { contains: searchQuery, mode: "insensitive" as const } },
          { phone: { contains: searchQuery } },
          { email: { contains: searchQuery, mode: "insensitive" as const } },
        ],
      }
    : undefined;

  return prisma.customer.findMany({
    where,
    orderBy: { createdAt: "desc" },
  });
}

export async function getPatientById(id: string) {
  const patient = await prisma.customer.findUnique({
    where: { id },
    include: {
      prescriptions: { orderBy: { createdAt: "desc" } },
      orders: { orderBy: { createdAt: "desc" }, include: { items: true } },
      invoices: { orderBy: { createdAt: "desc" }, include: { items: true, payments: true } },
      payments: { orderBy: { createdAt: "desc" }, include: { invoice: true } },
    },
  });

  if (!patient) {
    return { patient: null, prescriptions: [], orders: [], invoices: [], payments: [] };
  }

  return {
    patient: {
      ...patient,
      createdAt: patient.createdAt.toISOString(),
      updatedAt: patient.updatedAt.toISOString(),
    },
    prescriptions: patient.prescriptions.map((rx) => ({
      ...rx,
      rightSph: rx.rightSph?.toString(),
      rightCyl: rx.rightCyl?.toString(),
      rightCyl2: undefined,
      rightAxis: rx.rightAxis,
      rightAdd: rx.rightAdd?.toString(),
      rightVa: rx.rightVa,
      rightPrism: rx.rightPrism?.toString(),
      rightBase: rx.rightBase,
      leftSph: rx.leftSph?.toString(),
      leftCyl: rx.leftCyl?.toString(),
      leftAxis: rx.leftAxis,
      leftAdd: rx.leftAdd?.toString(),
      leftVa: rx.leftVa,
      leftPrism: rx.leftPrism?.toString(),
      leftBase: rx.leftBase,
      pd: rx.pd ? Number(rx.pd) : undefined,
      pdRight: rx.pdRight ? Number(rx.pdRight) : undefined,
      pdLeft: rx.pdLeft ? Number(rx.pdLeft) : undefined,
      examinationDate: rx.examinationDate.toISOString().substring(0, 10),
      createdAt: rx.createdAt.toISOString(),
      customerName: patient.name,
    })),
    orders: patient.orders.map((o) => ({
      ...o,
      totalAmount: Number(o.totalAmount),
      advancePaid: Number(o.advancePaid),
      balanceDue: Number(o.balanceDue),
      orderDate: o.orderDate.toISOString(),
      createdAt: o.createdAt.toISOString(),
      customerName: patient.name,
      items: o.items.map((it) => ({
        ...it,
        unitPrice: Number(it.unitPrice),
        discount: Number(it.discount),
        totalPrice: Number(it.totalPrice),
      })),
    })),
    invoices: patient.invoices.map((inv) => ({
      ...inv,
      invoiceDate: inv.invoiceDate.toISOString(),
      subtotal: Number(inv.subtotal),
      discountAmount: Number(inv.discountAmount),
      taxableAmount: Number(inv.taxableAmount),
      cgstTotal: Number(inv.cgstTotal),
      sgstTotal: Number(inv.sgstTotal),
      igstTotal: Number(inv.igstTotal),
      totalTax: Number(inv.totalTax),
      grandTotal: Number(inv.grandTotal),
      roundOff: Number(inv.roundOff),
      finalAmount: Number(inv.finalAmount),
      amountPaid: Number(inv.amountPaid),
      balanceDue: Number(inv.balanceDue),
      createdAt: inv.createdAt.toISOString(),
      customerName: patient.name,
    })),
    payments: patient.payments.map((p) => ({
      ...p,
      invoiceNumber: p.invoice?.invoiceNumber || "-",
      amount: Number(p.amount),
      paymentDate: p.paymentDate.toISOString(),
      createdAt: p.createdAt.toISOString(),
      customerName: patient.name,
    })),
  };
}

export async function createPatient(data: {
  name: string;
  phone: string;
  email?: string;
  dateOfBirth?: string;
  address?: string;
  city?: string;
  state?: string;
  pinCode?: string;
  gstin?: string;
  notes?: string;
}) {
  try {
    if (!data.name?.trim()) return { success: false, error: "Patient name is required" };
    if (!data.phone?.trim()) return { success: false, error: "Phone number is required" };

    // Generate sequential customer code
    const lastCustomer = await prisma.customer.findFirst({ orderBy: { customerCode: "desc" } });
    let nextNum = 501;
    if (lastCustomer?.customerCode) {
      const match = lastCustomer.customerCode.match(/\d+$/);
      if (match) nextNum = parseInt(match[0]) + 1;
    }
    const customerCode = `PT-${nextNum}`;

    const patient = await prisma.customer.create({
      data: {
        customerCode,
        name: data.name.trim(),
        phone: data.phone.trim(),
        email: data.email?.trim() || null,
        dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : null,
        address: data.address?.trim() || null,
        city: data.city?.trim() || "Ranchi",
        state: data.state?.trim() || "Jharkhand",
        pinCode: data.pinCode?.trim() || null,
        gstin: data.gstin?.trim() || null,
        notes: data.notes?.trim() || null,
      },
    });

    safeRevalidatePath("/patients");
    return { success: true, patient };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to register patient" };
  }
}

export async function updatePatient(id: string, data: Record<string, any>) {
  try {
    const patient = await prisma.customer.update({
      where: { id },
      data: {
        name: data.name,
        phone: data.phone,
        email: data.email || null,
        address: data.address || null,
        city: data.city || null,
        state: data.state || null,
        pinCode: data.pinCode || null,
        gstin: data.gstin || null,
        notes: data.notes || null,
      },
    });

    safeRevalidatePath("/patients");
    safeRevalidatePath(`/patients/${id}`);
    return { success: true, patient };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to update patient" };
  }
}
