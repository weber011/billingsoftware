import { AppShell } from "@/components/layout/app-shell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { readCollection, Invoice, initializeStoreIfEmpty } from "@/lib/store";
import { formatCurrency, formatDate } from "@/lib/utils";
import Link from "next/link";
import { Clock, Eye, AlertCircle } from "lucide-react";

export const revalidate = 0;

export default async function OutstandingBalancesPage() {
  initializeStoreIfEmpty();
  const invoices = readCollection<Invoice>("invoices", []);
  const outstandingInvoices = invoices
    .filter((inv) => inv.status === "FINALIZED" && inv.balanceDue > 0)
    .sort((a, b) => b.balanceDue - a.balanceDue);

  const totalOutstanding = outstandingInvoices.reduce((acc, i) => acc + i.balanceDue, 0);

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Outstanding Receivables
            </h1>
            <p className="text-sm text-slate-500">
              Invoices with pending customer balances requiring collection upon delivery
            </p>
          </div>
          <div className="text-right">
            <span className="text-xs text-slate-500">Total Uncollected Balance:</span>
            <p className="text-xl font-bold font-mono text-amber-700">
              {formatCurrency(totalOutstanding)}
            </p>
          </div>
        </div>

        <Card className="shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">
              Pending Invoices ({outstandingInvoices.length})
            </CardTitle>
            <CardDescription className="text-xs">
              Click 'Settle' to record payment and mark invoice as fully cleared
            </CardDescription>
          </CardHeader>
          <CardContent>
            {outstandingInvoices.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-xs">
                No outstanding balances! All customer accounts are fully settled.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice #</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Invoice Total</TableHead>
                    <TableHead>Amount Paid</TableHead>
                    <TableHead>Balance Due</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {outstandingInvoices.map((inv) => (
                    <TableRow key={inv.id} className="hover:bg-slate-50/80">
                      <TableCell className="font-mono text-xs font-semibold text-teal-800">
                        {inv.invoiceNumber}
                      </TableCell>
                      <TableCell className="text-xs text-slate-500 font-mono">
                        {formatDate(inv.invoiceDate)}
                      </TableCell>
                      <TableCell className="text-xs font-medium text-slate-900">
                        <Link href={`/patients/${inv.customerId}`} className="hover:underline">
                          {inv.customerName}
                        </Link>
                      </TableCell>
                      <TableCell className="text-xs font-mono text-slate-600">
                        {inv.customerPhone || "-"}
                      </TableCell>
                      <TableCell className="text-xs font-mono">{formatCurrency(inv.finalAmount)}</TableCell>
                      <TableCell className="text-xs font-mono text-emerald-700">
                        {formatCurrency(inv.amountPaid)}
                      </TableCell>
                      <TableCell className="text-xs font-bold font-mono text-amber-700">
                        {formatCurrency(inv.balanceDue)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Link href={`/billing/${inv.id}`}>
                          <Button size="sm" className="bg-teal-700 hover:bg-teal-800 text-white h-7 text-xs">
                            Settle / Pay
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
