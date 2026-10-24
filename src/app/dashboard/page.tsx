import { getDashboardMetrics } from "@/actions/analytics";
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate } from "@/lib/utils";
import Link from "next/link";
import {
  IndianRupee,
  ShoppingBag,
  FileText,
  Clock,
  AlertTriangle,
  Users,
  CheckCircle2,
  TrendingUp,
  Receipt,
  Glasses,
  ArrowRight,
} from "lucide-react";

export const revalidate = 0; // always dynamic for fresh live data

export default async function DashboardPage() {
  const metrics = await getDashboardMetrics();

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Page Title & Status */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Store Dashboard</h1>
            <p className="text-sm text-slate-500">
              Live operational metrics & GST billing overview for LensArt Flagship
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/billing/new">
              <Button className="bg-teal-700 hover:bg-teal-800 text-white font-medium shadow-sm">
                + Create GST Invoice
              </Button>
            </Link>
          </div>
        </div>

        {/* Primary Financial Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-l-4 border-l-teal-600 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                Today's Sales
              </CardTitle>
              <div className="p-2 rounded-md bg-teal-50 text-teal-700">
                <IndianRupee className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-900">
                {formatCurrency(metrics.todaySales)}
              </div>
              <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                <span>Month:</span>
                <span className="font-semibold text-slate-700">{formatCurrency(metrics.monthSales)}</span>
              </p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-emerald-600 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                Payments Collected
              </CardTitle>
              <div className="p-2 rounded-md bg-emerald-50 text-emerald-700">
                <CheckCircle2 className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-emerald-700">
                {formatCurrency(metrics.paymentsReceived)}
              </div>
              <p className="text-xs text-slate-500 mt-1">Verified bank/cash/UPI inflows</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-amber-500 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                Outstanding Balance
              </CardTitle>
              <div className="p-2 rounded-md bg-amber-50 text-amber-700">
                <Clock className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-700">
                {formatCurrency(metrics.outstandingReceivables)}
              </div>
              <p className="text-xs text-slate-500 mt-1">Customer receivables due</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-blue-600 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                GST Tax Collected
              </CardTitle>
              <div className="p-2 rounded-md bg-blue-50 text-blue-700">
                <Receipt className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-700">
                {formatCurrency(metrics.totalTaxCollected)}
              </div>
              <p className="text-xs text-slate-500 mt-1">
                CGST: {formatCurrency(metrics.cgstCollected)} | SGST: {formatCurrency(metrics.sgstCollected)}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Operational Status Counters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-slate-50 border-slate-200">
            <CardContent className="pt-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500 font-medium">Ready for Collection</p>
                <p className="text-xl font-bold text-teal-800">{metrics.readyForCollectionCount}</p>
                <p className="text-[11px] text-slate-400">Spectacles waiting for patient pickup</p>
              </div>
              <div className="p-3 bg-white rounded-lg border border-slate-200 text-teal-700 shadow-sm">
                <Glasses className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-50 border-slate-200">
            <CardContent className="pt-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500 font-medium">Low Stock Alerts</p>
                <p className="text-xl font-bold text-rose-600">{metrics.lowStockCount}</p>
                <p className="text-[11px] text-slate-400">Items below reorder threshold</p>
              </div>
              <div className="p-3 bg-white rounded-lg border border-slate-200 text-rose-600 shadow-sm">
                <AlertTriangle className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-50 border-slate-200">
            <CardContent className="pt-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500 font-medium">Total Invoices Finalized</p>
                <p className="text-xl font-bold text-slate-800">{metrics.totalInvoicesCount}</p>
                <p className="text-[11px] text-slate-400">Legal GST tax invoices issued</p>
              </div>
              <div className="p-3 bg-white rounded-lg border border-slate-200 text-slate-600 shadow-sm">
                <FileText className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-50 border-slate-200">
            <CardContent className="pt-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500 font-medium">Registered Patients</p>
                <p className="text-xl font-bold text-slate-800">{metrics.totalPatientsCount}</p>
                <p className="text-[11px] text-slate-400">Active optical customer profiles</p>
              </div>
              <div className="p-3 bg-white rounded-lg border border-slate-200 text-slate-600 shadow-sm">
                <Users className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Invoices & Active Orders Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Invoices */}
          <Card className="shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between border-b pb-4">
              <div>
                <CardTitle className="text-base font-semibold">Recent Finalized Invoices</CardTitle>
                <CardDescription className="text-xs">Immutable legal tax billing documents</CardDescription>
              </div>
              <Link href="/billing">
                <Button variant="ghost" size="sm" className="text-xs text-teal-700 gap-1">
                  View All <ArrowRight className="h-3 w-3" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent className="pt-4">
              {metrics.recentInvoices.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-xs">
                  No invoices finalized yet. Create your first bill using '+ Quick Bill'.
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {metrics.recentInvoices.map((inv) => (
                    <div key={inv.id} className="py-3 flex items-center justify-between text-xs">
                      <div>
                        <Link
                          href={`/billing/${inv.id}`}
                          className="font-semibold text-teal-800 hover:underline"
                        >
                          {inv.invoiceNumber}
                        </Link>
                        <p className="text-slate-500">{inv.customerName}</p>
                        <p className="text-[10px] text-slate-400">{formatDate(inv.invoiceDate)}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-slate-900">{formatCurrency(inv.finalAmount)}</p>
                        {inv.balanceDue > 0 ? (
                          <Badge variant="warning" className="text-[10px]">
                            Due: {formatCurrency(inv.balanceDue)}
                          </Badge>
                        ) : (
                          <Badge variant="success" className="text-[10px]">
                            Fully Paid
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Active Orders */}
          <Card className="shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between border-b pb-4">
              <div>
                <CardTitle className="text-base font-semibold">Active Optical Orders</CardTitle>
                <CardDescription className="text-xs">Spectacle orders in lab & production pipeline</CardDescription>
              </div>
              <Link href="/orders">
                <Button variant="ghost" size="sm" className="text-xs text-teal-700 gap-1">
                  View All <ArrowRight className="h-3 w-3" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent className="pt-4">
              {metrics.recentOrders.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-xs">
                  No orders placed yet.
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {metrics.recentOrders.map((ord) => (
                    <div key={ord.id} className="py-3 flex items-center justify-between text-xs">
                      <div>
                        <Link
                          href={`/orders/${ord.id}`}
                          className="font-semibold text-slate-800 hover:underline"
                        >
                          {ord.orderNumber}
                        </Link>
                        <p className="text-slate-500">{ord.customerName}</p>
                        <p className="text-[10px] text-slate-400">
                          Due: {ord.expectedCompletionDate ? formatDate(ord.expectedCompletionDate) : "Standard"}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-slate-900">{formatCurrency(ord.totalAmount)}</p>
                        <Badge
                          variant={
                            ord.status === "DELIVERED"
                              ? "success"
                              : ord.status === "READY_FOR_COLLECTION"
                              ? "info"
                              : "secondary"
                          }
                          className="text-[10px]"
                        >
                          {ord.status.replace(/_/g, " ")}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
