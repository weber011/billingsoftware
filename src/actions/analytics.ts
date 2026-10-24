"use server";

import {
  readCollection,
  Invoice,
  OpticalOrder,
  Payment,
  Product,
  Customer,
  initializeStoreIfEmpty,
} from "@/lib/store";

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
  recentInvoices: Invoice[];
  recentOrders: OpticalOrder[];
  paymentMethodDistribution: Array<{ method: string; total: number }>;
  categorySalesDistribution: Array<{ category: string; total: number }>;
}

export async function getDashboardMetrics(): Promise<DashboardMetrics> {
  initializeStoreIfEmpty();

  const invoices = readCollection<Invoice>("invoices", []);
  const finalizedInvoices = invoices.filter((i) => i.status === "FINALIZED");
  const orders = readCollection<OpticalOrder>("orders", []);
  const payments = readCollection<Payment>("payments", []).filter((p) => p.status === "COMPLETED");
  const products = readCollection<Product>("products", []);
  const customers = readCollection<Customer>("customers", []);

  const now = new Date();
  // Using Asia/Kolkata date string YYYY-MM-DD
  const todayStr = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(now);
  const currentYearMonth = todayStr.substring(0, 7); // e.g. "2026-10"

  let todaySales = 0;
  let monthSales = 0;
  let cgstCollected = 0;
  let sgstCollected = 0;
  let igstCollected = 0;
  let outstandingReceivables = 0;

  for (const inv of finalizedInvoices) {
    const invDateStr = inv.invoiceDate.substring(0, 10);
    const invYearMonth = inv.invoiceDate.substring(0, 7);

    if (invDateStr === todayStr) {
      todaySales += inv.finalAmount;
    }
    if (invYearMonth === currentYearMonth) {
      monthSales += inv.finalAmount;
    }

    cgstCollected += inv.cgstTotal;
    sgstCollected += inv.sgstTotal;
    igstCollected += inv.igstTotal;
    outstandingReceivables += inv.balanceDue;
  }

  const paymentsReceived = payments.reduce((acc, p) => acc + p.amount, 0);
  const totalTaxCollected = cgstCollected + sgstCollected + igstCollected;

  const lowStockCount = products.filter(
    (p) => p.trackInventory && p.currentStock <= p.reorderThreshold
  ).length;

  const readyForCollectionCount = orders.filter(
    (o) => o.status === "READY_FOR_COLLECTION"
  ).length;

  // Payment method distribution
  const methodMap = new Map<string, number>();
  for (const pay of payments) {
    const m = pay.paymentMethod || "OTHER";
    methodMap.set(m, (methodMap.get(m) || 0) + pay.amount);
  }
  const paymentMethodDistribution = Array.from(methodMap.entries()).map(([method, total]) => ({
    method,
    total,
  }));

  // Category sales breakdown from finalized invoice items
  const catMap = new Map<string, number>();
  for (const inv of finalizedInvoices) {
    for (const item of inv.items) {
      const prod = products.find((p) => p.id === item.productId);
      const cat = prod?.category || "SPECTACLES";
      catMap.set(cat, (catMap.get(cat) || 0) + item.totalAmount);
    }
  }
  const categorySalesDistribution = Array.from(catMap.entries()).map(([category, total]) => ({
    category,
    total,
  }));

  return {
    todaySales: Math.round(todaySales * 100) / 100,
    monthSales: Math.round(monthSales * 100) / 100,
    totalInvoicesCount: finalizedInvoices.length,
    totalOrdersCount: orders.length,
    outstandingReceivables: Math.round(outstandingReceivables * 100) / 100,
    paymentsReceived: Math.round(paymentsReceived * 100) / 100,
    totalTaxCollected: Math.round(totalTaxCollected * 100) / 100,
    cgstCollected: Math.round(cgstCollected * 100) / 100,
    sgstCollected: Math.round(sgstCollected * 100) / 100,
    igstCollected: Math.round(igstCollected * 100) / 100,
    lowStockCount,
    readyForCollectionCount,
    totalPatientsCount: customers.length,
    recentInvoices: finalizedInvoices.slice(0, 5),
    recentOrders: orders.slice(0, 5),
    paymentMethodDistribution,
    categorySalesDistribution,
  };
}
