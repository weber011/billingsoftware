import { getOrderById, updateOrderStatus } from "@/actions/orders";
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate } from "@/lib/utils";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Glasses,
  User,
  Calendar,
  Receipt,
  ArrowLeft,
  CheckCircle2,
  Clock,
  Printer,
  Truck,
  AlertCircle,
} from "lucide-react";
import { revalidatePath } from "next/cache";

export const revalidate = 0;

export default async function OrderDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const order = await getOrderById(params.id);
  if (!order) {
    notFound();
  }

  const handleStatusChange = async (formData: FormData) => {
    "use server";
    const newStatus = formData.get("status") as any;
    const notes = formData.get("notes") as string;
    await updateOrderStatus(order.id, newStatus, notes);
    revalidatePath(`/orders/${order.id}`);
  };

  const rx = order.prescriptionSnapshot as any;

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link href="/orders">
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                  Order {order.orderNumber}
                </h1>
                <Badge
                  variant={
                    order.status === "DELIVERED"
                      ? "success"
                      : order.status === "READY_FOR_COLLECTION"
                      ? "info"
                      : "secondary"
                  }
                  className="text-xs"
                >
                  {order.status.replace(/_/g, " ")}
                </Badge>
              </div>
              <p className="text-xs text-slate-500">
                Placed on {formatDate(order.orderDate)} | Patient:{" "}
                <Link href={`/patients/${order.customerId}`} className="underline font-semibold">
                  {order.customerName}
                </Link>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!order.invoiceId ? (
              <Link href={`/billing/new?orderId=${order.id}&customerId=${order.customerId}`}>
                <Button className="bg-teal-700 hover:bg-teal-800 text-white font-medium text-xs gap-1.5 shadow-sm">
                  <Receipt className="h-4 w-4" /> Finalize GST Invoice
                </Button>
              </Link>
            ) : (
              <Link href={`/billing/${order.invoiceId}`}>
                <Button variant="outline" className="text-xs gap-1.5">
                  <Receipt className="h-4 w-4" /> View Linked Invoice
                </Button>
              </Link>
            )}
          </div>
        </div>

        {/* Status Transition Control Card */}
        <Card className="shadow-sm border-teal-200 bg-gradient-to-r from-teal-50/50 to-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-teal-950">
              Lab & Production Status Workflow
            </CardTitle>
            <CardDescription className="text-xs text-teal-800">
              Advance the spectacle through controlled stages. This does not alter finalized invoices.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-center gap-2 pt-1">
              {[
                { status: "ORDER_CONFIRMED", label: "Confirmed" },
                { status: "SENT_TO_LAB", label: "Sent to Lab" },
                { status: "IN_PRODUCTION", label: "In Production" },
                { status: "QUALITY_CHECK", label: "Quality Check" },
                { status: "READY_FOR_COLLECTION", label: "Ready for Collection" },
                { status: "DELIVERED", label: "Mark Delivered" },
              ].map((s) => (
                <form key={s.status} action={handleStatusChange}>
                  <input type="hidden" name="status" value={s.status} />
                  <Button
                    type="submit"
                    size="sm"
                    variant={order.status === s.status ? "default" : "outline"}
                    className={
                      order.status === s.status
                        ? "bg-teal-800 text-white"
                        : "text-xs hover:bg-teal-50"
                    }
                  >
                    {order.status === s.status && <CheckCircle2 className="h-3.5 w-3.5 mr-1" />}
                    {s.label}
                  </Button>
                </form>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Optical Prescription Snapshot */}
        {rx && (
          <Card className="shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Glasses className="h-4 w-4 text-teal-700" /> Preserved Prescription Snapshot {rx.prescriptionCode ? `(${rx.prescriptionCode})` : ""}
              </CardTitle>
              <CardDescription className="text-xs">
                Immutable clinical measurements preserved when this order was placed
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-center border rounded-lg">
                  <thead className="bg-slate-100 text-slate-700 font-semibold border-b">
                    <tr>
                      <th className="p-2 text-left bg-slate-200/60">Eye</th>
                      <th className="p-2">SPH</th>
                      <th className="p-2">CYL</th>
                      <th className="p-2">Axis</th>
                      <th className="p-2">Add</th>
                      <th className="p-2">VA</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y font-mono">
                    <tr>
                      <td className="p-2 font-bold text-left bg-slate-50 text-teal-900 font-sans">Right (OD)</td>
                      <td className="p-2">{rx.rightSph || "0.00"}</td>
                      <td className="p-2">{rx.rightCyl || "0.00"}</td>
                      <td className="p-2">{rx.rightAxis ? `${rx.rightAxis}°` : "-"}</td>
                      <td className="p-2">{rx.rightAdd ? `+${rx.rightAdd}` : "-"}</td>
                      <td className="p-2">{rx.rightVa || "-"}</td>
                    </tr>
                    <tr>
                      <td className="p-2 font-bold text-left bg-slate-50 text-teal-900 font-sans">Left (OS)</td>
                      <td className="p-2">{rx.leftSph || "0.00"}</td>
                      <td className="p-2">{rx.leftCyl || "0.00"}</td>
                      <td className="p-2">{rx.leftAxis ? `${rx.leftAxis}°` : "-"}</td>
                      <td className="p-2">{rx.leftAdd ? `+${rx.leftAdd}` : "-"}</td>
                      <td className="p-2">{rx.leftVa || "-"}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              {rx.pd && (
                <p className="text-xs text-slate-600 mt-2 font-mono">
                  Pupillary Distance: <span className="font-bold">{rx.pd} mm</span>
                  {rx.lensRecommendation ? ` | Recommendation: ${rx.lensRecommendation}` : ""}
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Order Items Table & Financials */}
        <Card className="shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Mounted Spectacles & Lenses</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="divide-y border rounded-lg overflow-hidden text-xs">
              {order.items.map((it, idx) => (
                <div key={idx} className="p-3 flex items-center justify-between bg-slate-50/50">
                  <div>
                    <span className="font-semibold text-slate-900">{it.description}</span>
                    <Badge variant="outline" className="ml-2 text-[10px]">
                      {it.itemType}
                    </Badge>
                    <p className="text-slate-500 text-[11px]">
                      Qty: {it.quantity} × {formatCurrency(it.unitPrice)}
                      {it.discount > 0 ? ` (Disc: ₹${it.discount})` : ""}
                    </p>
                  </div>
                  <span className="font-mono font-bold text-slate-900">
                    {formatCurrency(it.totalPrice)}
                  </span>
                </div>
              ))}
            </div>

            <div className="flex justify-end pt-2">
              <div className="w-64 space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-600">Total Order Value:</span>
                  <span className="font-mono font-semibold">{formatCurrency(order.totalAmount)}</span>
                </div>
                <div className="flex justify-between text-emerald-700">
                  <span>Advance Deposited:</span>
                  <span className="font-mono font-semibold">{formatCurrency(order.advancePaid)}</span>
                </div>
                <div className="flex justify-between font-bold text-sm pt-2 border-t text-amber-800">
                  <span>Outstanding Balance:</span>
                  <span className="font-mono">{formatCurrency(order.balanceDue)}</span>
                </div>
              </div>
            </div>

            {order.fittingDetails && (
              <div className="p-3 bg-slate-50 rounded-lg text-xs text-slate-700 border">
                <span className="font-semibold">Glazing / Fitting Instructions: </span>
                {order.fittingDetails}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
