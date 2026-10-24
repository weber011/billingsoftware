import { getPatientById } from "@/actions/patients";
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency, formatDate } from "@/lib/utils";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  User,
  Phone,
  Mail,
  MapPin,
  Calendar,
  FileText,
  Glasses,
  Receipt,
  CreditCard,
  Plus,
  ArrowLeft,
  Eye,
  CheckCircle2,
} from "lucide-react";

export const revalidate = 0;

export default async function PatientProfilePage({
  params,
}: {
  params: { id: string };
}) {
  const { patient, prescriptions, orders, invoices, payments } = await getPatientById(params.id);

  if (!patient) {
    notFound();
  }

  const latestRx = prescriptions[0] || null;

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Back and Profile Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link href="/patients">
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">{patient.name}</h1>
                <Badge variant="outline" className="font-mono text-teal-800 bg-teal-50">
                  {patient.customerCode}
                </Badge>
                <Badge variant={patient.isActive ? "success" : "secondary"} className="text-[10px]">
                  {patient.isActive ? "Active" : "Archived"}
                </Badge>
              </div>
              <p className="text-xs text-slate-500">
                Registered on {formatDate(patient.createdAt)} | Patient Record ID: {patient.id}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link href={`/prescriptions/new?customerId=${patient.id}`}>
              <Button size="sm" className="bg-teal-700 hover:bg-teal-800 text-white gap-1.5 font-medium">
                <Glasses className="h-4 w-4" /> + Add Prescription
              </Button>
            </Link>
            <Link href={`/orders/new?customerId=${patient.id}`}>
              <Button size="sm" variant="outline" className="gap-1.5">
                + New Spectacle Order
              </Button>
            </Link>
            <Link href={`/billing/new?customerId=${patient.id}`}>
              <Button size="sm" variant="outline" className="gap-1.5">
                + New GST Invoice
              </Button>
            </Link>
          </div>
        </div>

        {/* Patient Contact & Demographics Card */}
        <Card className="shadow-sm bg-gradient-to-r from-slate-50 to-white">
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
              <div className="flex items-center gap-2 text-slate-700">
                <Phone className="h-4 w-4 text-slate-400 shrink-0" />
                <div>
                  <p className="text-[10px] text-slate-400 font-medium">PHONE NUMBER</p>
                  <p className="font-semibold text-slate-900">{patient.phone}</p>
                </div>
              </div>

              <div className="flex items-center gap-2 text-slate-700">
                <Mail className="h-4 w-4 text-slate-400 shrink-0" />
                <div>
                  <p className="text-[10px] text-slate-400 font-medium">EMAIL</p>
                  <p className="font-semibold text-slate-900">{patient.email || "Not recorded"}</p>
                </div>
              </div>

              <div className="flex items-center gap-2 text-slate-700">
                <MapPin className="h-4 w-4 text-slate-400 shrink-0" />
                <div>
                  <p className="text-[10px] text-slate-400 font-medium">LOCATION</p>
                  <p className="font-semibold text-slate-900">
                    {[patient.city, patient.state].filter(Boolean).join(", ") || "Not recorded"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 text-slate-700">
                <Calendar className="h-4 w-4 text-slate-400 shrink-0" />
                <div>
                  <p className="text-[10px] text-slate-400 font-medium">DATE OF BIRTH</p>
                  <p className="font-semibold text-slate-900">
                    {patient.dateOfBirth ? formatDate(patient.dateOfBirth) : "Not recorded"}
                  </p>
                </div>
              </div>
            </div>

            {patient.notes && (
              <div className="mt-4 pt-4 border-t text-xs text-slate-600 bg-amber-50/50 p-3 rounded-lg border border-amber-200/50">
                <span className="font-semibold text-amber-900">Clinical / Fitting Notes: </span>
                {patient.notes}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Multi-Tab Detailed Patient Record */}
        <Tabs defaultValue="prescriptions" className="w-full">
          <TabsList className="bg-slate-100 p-1 border">
            <TabsTrigger value="prescriptions" className="gap-1.5 text-xs">
              <Glasses className="h-3.5 w-3.5" /> Prescriptions ({prescriptions.length})
            </TabsTrigger>
            <TabsTrigger value="orders" className="gap-1.5 text-xs">
              <Glasses className="h-3.5 w-3.5" /> Orders ({orders.length})
            </TabsTrigger>
            <TabsTrigger value="invoices" className="gap-1.5 text-xs">
              <Receipt className="h-3.5 w-3.5" /> GST Invoices ({invoices.length})
            </TabsTrigger>
            <TabsTrigger value="payments" className="gap-1.5 text-xs">
              <CreditCard className="h-3.5 w-3.5" /> Payments ({payments.length})
            </TabsTrigger>
          </TabsList>

          {/* PRESCRIPTIONS TAB */}
          <TabsContent value="prescriptions" className="mt-4 space-y-4">
            {prescriptions.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-slate-400 text-xs">
                  No optical prescriptions on file for this patient. Click '+ Add Prescription' above.
                </CardContent>
              </Card>
            ) : (
              prescriptions.map((rx, idx) => (
                <Card key={rx.id} className="shadow-sm border-l-4 border-l-teal-600">
                  <CardHeader className="pb-3 flex flex-row items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-base font-semibold">{rx.prescriptionCode}</CardTitle>
                        {idx === 0 && (
                          <Badge variant="success" className="text-[10px]">
                            Latest Active Rx
                          </Badge>
                        )}
                        <Badge variant="outline" className="text-[10px]">
                          {rx.prescriptionType}
                        </Badge>
                      </div>
                      <CardDescription className="text-xs">
                        Examined on {formatDate(rx.examinationDate)} by {rx.prescribedBy}
                      </CardDescription>
                    </div>

                    <Link href={`/orders/new?customerId=${patient.id}&prescriptionId=${rx.id}`}>
                      <Button size="sm" variant="outline" className="text-xs gap-1">
                        Order Spectacles with this Rx
                      </Button>
                    </Link>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Standard Optical Prescription Matrix */}
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs text-center border border-slate-200 rounded-lg overflow-hidden">
                        <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                          <tr>
                            <th className="p-2 text-left bg-slate-200/80">Eye</th>
                            <th className="p-2">Sphere (SPH)</th>
                            <th className="p-2">Cylinder (CYL)</th>
                            <th className="p-2">Axis</th>
                            <th className="p-2">Add (Near)</th>
                            <th className="p-2">Visual Acuity (VA)</th>
                            <th className="p-2">Prism / Base</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                          <tr className="hover:bg-slate-50">
                            <td className="p-2 font-bold text-left bg-slate-50 text-teal-900">
                              Right Eye (OD)
                            </td>
                            <td className="p-2 font-mono font-semibold">{rx.rightSph || "0.00"}</td>
                            <td className="p-2 font-mono font-semibold">{rx.rightCyl || "0.00"}</td>
                            <td className="p-2 font-mono">{rx.rightAxis ? `${rx.rightAxis}°` : "-"}</td>
                            <td className="p-2 font-mono">{rx.rightAdd ? `+${rx.rightAdd}` : "-"}</td>
                            <td className="p-2 font-mono">{rx.rightVa || "-"}</td>
                            <td className="p-2 font-mono">
                              {rx.rightPrism ? `${rx.rightPrism} ${rx.rightBase || ""}` : "-"}
                            </td>
                          </tr>
                          <tr className="hover:bg-slate-50">
                            <td className="p-2 font-bold text-left bg-slate-50 text-teal-900">
                              Left Eye (OS)
                            </td>
                            <td className="p-2 font-mono font-semibold">{rx.leftSph || "0.00"}</td>
                            <td className="p-2 font-mono font-semibold">{rx.leftCyl || "0.00"}</td>
                            <td className="p-2 font-mono">{rx.leftAxis ? `${rx.leftAxis}°` : "-"}</td>
                            <td className="p-2 font-mono">{rx.leftAdd ? `+${rx.leftAdd}` : "-"}</td>
                            <td className="p-2 font-mono">{rx.leftVa || "-"}</td>
                            <td className="p-2 font-mono">
                              {rx.leftPrism ? `${rx.leftPrism} ${rx.leftBase || ""}` : "-"}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    {/* Pupillary Distance & Fitting Recommendations */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 bg-slate-50 rounded-lg text-xs">
                      <div>
                        <span className="text-slate-400 font-medium">Pupillary Distance (PD):</span>
                        <p className="font-semibold text-slate-800">
                          {rx.pd ? `${rx.pd} mm` : "Not measured"}
                          {rx.pdRight && rx.pdLeft ? ` (R: ${rx.pdRight} / L: ${rx.pdLeft})` : ""}
                        </p>
                      </div>
                      <div>
                        <span className="text-slate-400 font-medium">Near / Reading Vision:</span>
                        <p className="font-semibold text-slate-800">
                          {rx.nearVisionDetails || "Standard"}
                        </p>
                      </div>
                      <div>
                        <span className="text-slate-400 font-medium">Next Follow-Up Due:</span>
                        <p className="font-semibold text-slate-800">
                          {rx.nextExaminationDate ? formatDate(rx.nextExaminationDate) : "Annual"}
                        </p>
                      </div>
                    </div>

                    {rx.lensRecommendation && (
                      <p className="text-xs text-teal-900 bg-teal-50/60 p-2.5 rounded border border-teal-100">
                        <span className="font-semibold">Recommended Lens Option: </span>
                        {rx.lensRecommendation}
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          {/* SPECTACLE ORDERS TAB */}
          <TabsContent value="orders" className="mt-4">
            <Card>
              <CardContent className="pt-6">
                {orders.length === 0 ? (
                  <p className="text-center py-8 text-slate-400 text-xs">
                    No spectacle orders placed yet.
                  </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Order #</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Expected Ready</TableHead>
                        <TableHead>Items</TableHead>
                        <TableHead>Total Amount</TableHead>
                        <TableHead>Advance Paid</TableHead>
                        <TableHead>Balance Due</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {orders.map((ord) => (
                        <TableRow key={ord.id}>
                          <TableCell className="font-mono font-semibold text-xs text-teal-800">
                            {ord.orderNumber}
                          </TableCell>
                          <TableCell className="text-xs text-slate-500">
                            {formatDate(ord.orderDate)}
                          </TableCell>
                          <TableCell className="text-xs text-slate-700 font-medium">
                            {ord.expectedCompletionDate ? formatDate(ord.expectedCompletionDate) : "-"}
                          </TableCell>
                          <TableCell className="text-xs">
                            {ord.items.map((i) => i.description).join(", ")}
                          </TableCell>
                          <TableCell className="text-xs font-semibold text-slate-900">
                            {formatCurrency(ord.totalAmount)}
                          </TableCell>
                          <TableCell className="text-xs text-emerald-700 font-medium">
                            {formatCurrency(ord.advancePaid)}
                          </TableCell>
                          <TableCell className="text-xs text-amber-700 font-semibold">
                            {formatCurrency(ord.balanceDue)}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-[10px]">
                              {ord.status.replace(/_/g, " ")}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Link href={`/orders/${ord.id}`}>
                              <Button size="sm" variant="ghost" className="h-7 text-xs">
                                View Order
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
          </TabsContent>

          {/* INVOICES TAB */}
          <TabsContent value="invoices" className="mt-4">
            <Card>
              <CardContent className="pt-6">
                {invoices.length === 0 ? (
                  <p className="text-center py-8 text-slate-400 text-xs">
                    No GST invoices issued to this patient yet.
                  </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Invoice #</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Supply State</TableHead>
                        <TableHead>Taxable Value</TableHead>
                        <TableHead>GST Tax</TableHead>
                        <TableHead>Final Payable</TableHead>
                        <TableHead>Balance Due</TableHead>
                        <TableHead className="text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {invoices.map((inv) => (
                        <TableRow key={inv.id}>
                          <TableCell className="font-mono font-semibold text-xs text-teal-800">
                            {inv.invoiceNumber}
                          </TableCell>
                          <TableCell className="text-xs text-slate-500">
                            {formatDate(inv.invoiceDate)}
                          </TableCell>
                          <TableCell className="text-xs text-slate-600">
                            {inv.placeOfSupply} {inv.isInterState ? "(IGST)" : "(Intra-state)"}
                          </TableCell>
                          <TableCell className="text-xs text-slate-700">
                            {formatCurrency(inv.taxableAmount)}
                          </TableCell>
                          <TableCell className="text-xs text-slate-700">
                            {formatCurrency(inv.totalTax)}
                          </TableCell>
                          <TableCell className="text-xs font-bold text-slate-900">
                            {formatCurrency(inv.finalAmount)}
                          </TableCell>
                          <TableCell className="text-xs">
                            {inv.balanceDue > 0 ? (
                              <span className="font-semibold text-amber-700">
                                {formatCurrency(inv.balanceDue)}
                              </span>
                            ) : (
                              <span className="text-emerald-700 font-medium">Nil</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <Link href={`/billing/${inv.id}`}>
                              <Button size="sm" variant="outline" className="h-7 text-xs">
                                View / Print
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
          </TabsContent>

          {/* PAYMENTS TAB */}
          <TabsContent value="payments" className="mt-4">
            <Card>
              <CardContent className="pt-6">
                {payments.length === 0 ? (
                  <p className="text-center py-8 text-slate-400 text-xs">
                    No payment transactions recorded for this patient.
                  </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Receipt #</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Invoice #</TableHead>
                        <TableHead>Method</TableHead>
                        <TableHead>Txn Reference</TableHead>
                        <TableHead>Amount Paid</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {payments.map((pay) => (
                        <TableRow key={pay.id}>
                          <TableCell className="font-mono text-xs font-semibold text-slate-800">
                            {pay.paymentNumber}
                          </TableCell>
                          <TableCell className="text-xs text-slate-500">
                            {formatDate(pay.paymentDate)}
                          </TableCell>
                          <TableCell className="text-xs text-teal-800 font-mono">
                            {pay.invoiceNumber}
                          </TableCell>
                          <TableCell className="text-xs font-medium">{pay.paymentMethod}</TableCell>
                          <TableCell className="text-xs text-slate-500 font-mono">
                            {pay.transactionRef || "-"}
                          </TableCell>
                          <TableCell className="text-xs font-bold text-emerald-700">
                            {formatCurrency(pay.amount)}
                          </TableCell>
                          <TableCell>
                            <Badge variant="success" className="text-[10px]">
                              {pay.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppShell>
  );
}
