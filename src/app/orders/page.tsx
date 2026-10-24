import { getOrders } from "@/actions/orders";
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency, formatDate } from "@/lib/utils";
import Link from "next/link";
import { Glasses, Plus, Eye, Clock, CheckCircle2 } from "lucide-react";

export const revalidate = 0;

export default async function OrdersListPage({
  searchParams,
}: {
  searchParams: { status?: string };
}) {
  const statusFilter = searchParams?.status || "ALL";
  const orders = await getOrders(statusFilter);

  const statuses = [
    { label: "All Orders", val: "ALL" },
    { label: "Confirmed", val: "ORDER_CONFIRMED" },
    { label: "In Production", val: "IN_PRODUCTION" },
    { label: "Ready for Collection", val: "READY_FOR_COLLECTION" },
    { label: "Delivered", val: "DELIVERED" },
  ];

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Spectacle Orders & Lab Workflow
            </h1>
            <p className="text-sm text-slate-500">
              Track custom spectacles from prescription recording, optical lab processing to patient collection
            </p>
          </div>
          <Link href="/orders/new">
            <Button className="bg-teal-700 hover:bg-teal-800 text-white gap-2 font-medium shadow-sm">
              <Plus className="h-4 w-4" /> Place Spectacle Order
            </Button>
          </Link>
        </div>

        {/* Status Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {statuses.map((s) => (
            <Link key={s.val} href={`/orders?status=${s.val}`}>
              <Button
                variant={statusFilter === s.val ? "default" : "outline"}
                size="sm"
                className={statusFilter === s.val ? "bg-slate-900 text-white" : "text-xs"}
              >
                {s.label}
              </Button>
            </Link>
          ))}
        </div>

        <Card className="shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">
              Spectacle Orders ({orders.length})
            </CardTitle>
            <CardDescription className="text-xs">
              Separate optical order status from financial invoice status with complete production audit trail
            </CardDescription>
          </CardHeader>
          <CardContent>
            {orders.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-xs">
                No orders found under this status filter.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order #</TableHead>
                    <TableHead>Patient Name</TableHead>
                    <TableHead>Order Date</TableHead>
                    <TableHead>Expected Delivery</TableHead>
                    <TableHead>Items</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Advance Paid</TableHead>
                    <TableHead>Balance Due</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.map((ord) => (
                    <TableRow key={ord.id} className="hover:bg-slate-50/80">
                      <TableCell className="font-mono text-xs font-semibold text-teal-800">
                        {ord.orderNumber}
                      </TableCell>
                      <TableCell className="font-medium text-slate-900 text-xs">
                        <Link href={`/patients/${ord.customerId}`} className="hover:underline text-teal-900 font-semibold">
                          {ord.customerName}
                        </Link>
                        {ord.customerPhone && (
                          <p className="text-[10px] text-slate-400">{ord.customerPhone}</p>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-slate-500 font-mono">
                        {formatDate(ord.orderDate)}
                      </TableCell>
                      <TableCell className="text-xs font-medium text-slate-800">
                        {ord.expectedCompletionDate ? formatDate(ord.expectedCompletionDate) : "Standard (3 days)"}
                      </TableCell>
                      <TableCell className="text-xs text-slate-600 max-w-xs truncate">
                        {ord.items.map((i) => i.description).join(" + ")}
                      </TableCell>
                      <TableCell className="text-xs font-bold text-slate-900 font-mono">
                        {formatCurrency(ord.totalAmount)}
                      </TableCell>
                      <TableCell className="text-xs text-emerald-700 font-medium font-mono">
                        {formatCurrency(ord.advancePaid)}
                      </TableCell>
                      <TableCell className="text-xs font-semibold font-mono">
                        {ord.balanceDue > 0 ? (
                          <span className="text-amber-700">{formatCurrency(ord.balanceDue)}</span>
                        ) : (
                          <span className="text-emerald-700">Nil</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            ord.status === "DELIVERED"
                              ? "success"
                              : ord.status === "READY_FOR_COLLECTION"
                              ? "info"
                              : ord.status === "PAYMENT_PENDING"
                              ? "warning"
                              : "secondary"
                          }
                          className="text-[10px]"
                        >
                          {ord.status.replace(/_/g, " ")}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Link href={`/orders/${ord.id}`}>
                          <Button size="sm" variant="outline" className="h-7 text-xs gap-1">
                            <Eye className="h-3.5 w-3.5" /> Details
                          </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
