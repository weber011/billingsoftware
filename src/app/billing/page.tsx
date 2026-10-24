import { getInvoices } from "@/actions/billing";
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency, formatDate } from "@/lib/utils";
import Link from "next/link";
import { Receipt, Plus, Eye, Printer, AlertTriangle } from "lucide-react";

export const revalidate = 0;

export default async function BillingInvoicesPage({
  searchParams,
}: {
  searchParams: { status?: string };
}) {
  const statusFilter = searchParams?.status || "ALL";
  const invoices = await getInvoices(statusFilter);

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              GST Tax Invoices
            </h1>
            <p className="text-sm text-slate-500">
              Tax-compliant Indian optical retail billing, place-of-supply determination, and payment receipts
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/billing/credit-notes">
              <Button variant="outline" className="text-xs">
                Credit Notes & Returns
              </Button>
            </Link>
            <Link href="/billing/new">
              <Button className="bg-teal-700 hover:bg-teal-800 text-white gap-2 font-medium shadow-sm">
                <Plus className="h-4 w-4" /> Create New GST Bill
              </Button>
            </Link>
          </div>
        </div>

        <Card className="shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">
              Invoice Register ({invoices.length})
            </CardTitle>
            <CardDescription className="text-xs">
              Finalized invoices have immutable historical tax snapshots and cannot be overwritten
            </CardDescription>
          </CardHeader>
          <CardContent>
            {invoices.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-xs">
                No invoices issued yet. Click '+ Create New GST Bill' to start billing.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice #</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Place of Supply</TableHead>
                    <TableHead>Taxable Value</TableHead>
                    <TableHead>CGST + SGST / IGST</TableHead>
                    <TableHead>Invoice Total</TableHead>
                    <TableHead>Paid</TableHead>
                    <TableHead>Balance Due</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoices.map((inv) => (
                    <TableRow key={inv.id} className="hover:bg-slate-50/80">
                      <TableCell className="font-mono text-xs font-semibold text-teal-800">
                        {inv.invoiceNumber}
                      </TableCell>
                      <TableCell className="text-xs text-slate-500 font-mono">
                        {formatDate(inv.invoiceDate)}
                      </TableCell>
                      <TableCell className="font-medium text-slate-900 text-xs">
                        <Link href={`/patients/${inv.customerId}`} className="hover:underline">
                          {inv.customerName}
                        </Link>
                        {inv.customerPhone && (
                          <p className="text-[10px] text-slate-400">{inv.customerPhone}</p>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-slate-600">
                        <span className="font-mono">{inv.placeOfSupplyCode}</span>{" "}
                        <span className="text-[10px] text-slate-400">
                          {inv.isInterState ? "(Inter-state)" : "(Intra-state)"}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs text-slate-700 font-mono">
                        {formatCurrency(inv.taxableAmount)}
                      </TableCell>
                      <TableCell className="text-xs text-slate-700 font-mono">
                        {formatCurrency(inv.totalTax)}
                      </TableCell>
                      <TableCell className="text-xs font-bold text-slate-900 font-mono">
                        {formatCurrency(inv.finalAmount)}
                      </TableCell>
                      <TableCell className="text-xs font-medium text-emerald-700 font-mono">
                        {formatCurrency(inv.amountPaid)}
                      </TableCell>
                      <TableCell className="text-xs font-mono">
                        {inv.balanceDue > 0 ? (
                          <Badge variant="warning" className="text-[10px]">
                            Due: {formatCurrency(inv.balanceDue)}
                          </Badge>
                        ) : (
                          <Badge variant="success" className="text-[10px]">
                            Settled
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Link href={`/billing/${inv.id}`}>
                          <Button size="sm" variant="outline" className="h-7 text-xs gap-1">
                            <Eye className="h-3.5 w-3.5" /> View / Print
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
