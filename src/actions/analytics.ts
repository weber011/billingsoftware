"use server";

import { prisma } from "@/lib/prisma";

export interface DashboardMetrics {
  todaySales: number;
  monthSales: number;
  totalInvoicesCount: number;
  totalOrdersCount: number;
  outstandingReceivables: number;
  paymentsReceived: number;
  totalTaxCollected: number;
  cgstCollected: number;
  sgstCollected: number;
  igstCollected: number;
  lowStockCount: number;
  readyForCollectionCount: number;
  totalPatientsCount: number;
  recentInvoices: any[];
  recentOrders: any[];
  paymentMethodDistribution: Array<{ method: string; total: number }>;
  categorySalesDistribution: Array<{ category: string; total: number }>;
}

export async function getDashboardMetrics(): Promise<DashboardMetrics> {
  const now = new Date();
  const todayStr = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(now);
  const todayStart = new Date(todayStr + "T00:00:00.000Z");
  const monthStart = new Date(todayStr.substring(0, 7) + "-01T00:00:00.000Z");

  // All finalized invoices
  const invoices = await prisma.invoice.findMany({
    where: { status: "FINALIZED" },
    include: { items: true },
  });

  let todaySales = 0, monthSales = 0;
  let cgstCollected = 0, sgstCollected = 0, igstCollected = 0;
  let outstandingReceivables = 0;

  for (const inv of invoices) {
    const invDate = inv.invoiceDate;
    const finalAmt = Number(inv.finalAmount);
    
    if (invDate >= todayStart) todaySales += finalAmt;
    if (invDate >= monthStart) monthSales += finalAmt;

    cgstCollected += Number(inv.cgstTotal);
    sgstCollected += Number(inv.sgstTotal);
    igstCollected += Number(inv.igstTotal);
    outstandingReceivables += Number(inv.balanceDue);
  }

  const payments = await prisma.payment.findMany({ where: { status: "COMPLETED" } });
  const paymentsReceived = payments.reduce((sum, p) => sum + Number(p.amount), 0);

  // Payment method distribution
  const methodMap = new Map<string, number>();
  for (const p of payments) {
    const m = p.paymentMethod;
    methodMap.set(m, (methodMap.get(m) || 0) + Number(p.amount));
  }
  const paymentMethodDistribution = Array.from(methodMap.entries()).map(([method, total]) => ({ method, total }));

  // Low stock products
  const lowStockCount = await prisma.product.count({
    where: {
      trackInventory: true,
      isActive: true,
      currentStock: { lte: 5 },
    },
  });

  // Ready for collection orders
  const readyForCollectionCount = await prisma.opticalOrder.count({
    where: { status: "READY_FOR_COLLECTION" },
  });

  const totalPatientsCount = await prisma.customer.count();
  const totalOrdersCount = await prisma.opticalOrder.count();

  // Recent invoices
  const recentInvoicesRaw = await prisma.invoice.findMany({
    where: { status: "FINALIZED" },
    orderBy: { createdAt: "desc" },
    take: 5,
  });
  const recentInvoices = recentInvoicesRaw.map((inv) => ({
    id: inv.id,
    invoiceNumber: inv.invoiceNumber,
    customerName: inv.customerName,
    finalAmount: Number(inv.finalAmount),
    balanceDue: Number(inv.balanceDue),
    invoiceDate: inv.invoiceDate.toISOString(),
    status: inv.status,
  }));

  // Recent orders
  const recentOrdersRaw = await prisma.opticalOrder.findMany({
    include: { customer: true },
    orderBy: { createdAt: "desc" },
    take: 5,
  });
  const recentOrders = recentOrdersRaw.map((o) => ({
    id: o.id,
    orderNumber: o.orderNumber,
    customerName: o.customer.name,
    totalAmount: Number(o.totalAmount),
    status: o.status,
    orderDate: o.orderDate.toISOString(),
  }));

  return {
    todaySales: Math.round(todaySales * 100) / 100,
    monthSales: Math.round(monthSales * 100) / 100,
    totalInvoicesCount: invoices.length,
    totalOrdersCount,
    outstandingReceivables: Math.round(outstandingReceivables * 100) / 100,
    paymentsReceived: Math.round(paymentsReceived * 100) / 100,
    totalTaxCollected: Math.round((cgstCollected + sgstCollected + igstCollected) * 100) / 100,
    cgstCollected: Math.round(cgstCollected * 100) / 100,
    sgstCollected: Math.round(sgstCollected * 100) / 100,
    igstCollected: Math.round(igstCollected * 100) / 100,
    lowStockCount,
    readyForCollectionCount,
    totalPatientsCount,
    recentInvoices,
    recentOrders,
    paymentMethodDistribution,
    categorySalesDistribution: [],
  };
}
