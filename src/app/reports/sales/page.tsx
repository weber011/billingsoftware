import { AppShell } from "@/components/layout/app-shell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { readCollection, Invoice, initializeStoreIfEmpty } from "@/lib/store";
import { formatCurrency, formatDate } from "@/lib/utils";
import Link from "next/link";
import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

export const revalidate = 0;

export default async function SalesReportPage() {
  initializeStoreIfEmpty();
  const invoices = readCollection<Invoice>("invoices", []).filter((i) => i.status === "FINALIZED");

  const totalGross = invoices.reduce((acc, i) => acc + i.subtotal, 0);
  const totalDiscounts = invoices.reduce((acc, i) => acc + i.totalDiscount, 0);
  const totalTaxable = invoices.reduce((acc, i) => acc + i.taxableAmount, 0);
  const totalTax = invoices.reduce((acc, i) => acc + i.totalTax, 0);
  const totalNet = invoices.reduce((acc, i) => acc + i.finalAmount, 0);

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Sales Register Report</h1>
            <p className="text-sm text-slate-500">
              Chronological log of finalized sales invoices, itemized turnover, and tax collected
            </p>
          </div>
        </div>

        {/* Financial Summary */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <Card className="p-3">
            <span className="text-[10px] text-slate-500 uppercase font-semibold">Gross Sales</span>
            <p className="text-base font-bold font-mono text-slate-900">{formatCurrency(totalGross)}</p>
          </Card>
          <Card className="p-3">
            <span className="text-[10px] text-slate-500 uppercase font-semibold">Discounts Given</span>
            <p className="text-base font-bold font-mono text-rose-600">-{formatCurrency(totalDiscounts)}</p>
          </Card>
          <Card className="p-3">
            <span className="text-[10px] text-slate-500 uppercase font-semibold">Taxable Turnover</span>
            <p className="text-base font-bold font-mono text-slate-800">{formatCurrency(totalTaxable)}</p>
          </Card>
          <Card className="p-3">
            <span className="text-[10px] text-slate-500 uppercase font-semibold">Total GST Tax</span>
            <p className="text-base font-bold font-mono text-teal-800">{formatCurrency(totalTax)}</p>
          </Card>
          <Card className="p-3 bg-teal-50/50 border-teal-200">
            <span className="text-[10px] text-teal-900 uppercase font-semibold">Net Sales (Invoiced)</span>
            <p className="text-base font-bold font-mono text-teal-950">{formatCurrency(totalNet)}</p>
          </Card>
        </div>

        <Card className="shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">Invoices Register ({invoices.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {invoices.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-xs">No sales recorded.</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice #</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Taxable Value</TableHead>
                    <TableHead>Tax Amount</TableHead>
                    <TableHead>Total Invoiced</TableHead>
                    <TableHead>Paid</TableHead>
                    <TableHead className="text-right">Balance Due</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoices.map((inv) => (
                    <TableRow key={inv.id}>
                      <TableCell className="font-mono text-xs font-semibold text-teal-800">
                        <Link href={`/billing/${inv.id}`} className="hover:underline">
                          {inv.invoiceNumber}
                        </Link>
                      </TableCell>
                      <TableCell className="text-xs text-slate-500 font-mono">
                        {formatDate(inv.invoiceDate)}
                      </TableCell>
                      <TableCell className="text-xs font-medium text-slate-900">
                        {inv.customerName}
                      </TableCell>
                      <TableCell className="text-xs font-mono">{formatCurrency(inv.taxableAmount)}</TableCell>
                      <TableCell className="text-xs font-mono">{formatCurrency(inv.totalTax)}</TableCell>
                      <TableCell className="text-xs font-bold font-mono text-slate-900">
                        {formatCurrency(inv.finalAmount)}
                      </TableCell>
                      <TableCell className="text-xs font-mono text-emerald-700">
                        {formatCurrency(inv.amountPaid)}
                      </TableCell>
                      <TableCell className="text-xs font-mono text-right">
                        {inv.balanceDue > 0 ? (
                          <span className="text-amber-700 font-semibold">{formatCurrency(inv.balanceDue)}</span>
                        ) : (
                          <span className="text-emerald-700">Nil</span>
                        )}
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
