import { AppShell } from "@/components/layout/app-shell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { readCollection, Payment, initializeStoreIfEmpty } from "@/lib/store";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/utils";
import Link from "next/link";
import { CreditCard, CheckCircle2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export const revalidate = 0;

export default async function FinancePaymentsPage() {
  initializeStoreIfEmpty();
  const payments = readCollection<Payment>("payments", []).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  const totalCollected = payments.reduce((acc, p) => acc + p.amount, 0);

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Payment Register
            </h1>
            <p className="text-sm text-slate-500">
              Authoritative ledger of cash, UPI, card, and bank inflows linked to finalized invoices
            </p>
          </div>
          <div className="text-right">
            <span className="text-xs text-slate-500">Total Inflow Collected:</span>
            <p className="text-xl font-bold font-mono text-emerald-700">
              {formatCurrency(totalCollected)}
            </p>
          </div>
        </div>

        <Card className="shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">
              Payment Transactions ({payments.length})
            </CardTitle>
            <CardDescription className="text-xs">
              Every financial receipt has a unique receipt ID and reconciles with customer balances
            </CardDescription>
          </CardHeader>
          <CardContent>
            {payments.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-xs">
                No payments recorded yet.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Receipt #</TableHead>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>Invoice #</TableHead>
                    <TableHead>Patient / Customer</TableHead>
                    <TableHead>Payment Method</TableHead>
                    <TableHead>Txn Reference / UTR</TableHead>
                    <TableHead>Amount Paid</TableHead>
                    <TableHead>Cashier / Staff</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.map((p) => (
                    <TableRow key={p.id} className="hover:bg-slate-50/80">
                      <TableCell className="font-mono text-xs font-semibold text-slate-900">
                        {p.paymentNumber}
                      </TableCell>
                      <TableCell className="text-xs text-slate-500 font-mono">
                        {formatDateTime(p.paymentDate)}
                      </TableCell>
                      <TableCell className="font-mono text-xs text-teal-800">
                        <Link href={`/billing/${p.invoiceId}`} className="hover:underline">
                          {p.invoiceNumber}
                        </Link>
                      </TableCell>
                      <TableCell className="text-xs font-medium text-slate-900">
                        <Link href={`/patients/${p.customerId}`} className="hover:underline">
                          {p.customerName}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px] font-mono">
                          {p.paymentMethod}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs font-mono text-slate-500">
                        {p.transactionRef || "-"}
                      </TableCell>
                      <TableCell className="text-xs font-bold font-mono text-emerald-700">
                        {formatCurrency(p.amount)}
                      </TableCell>
                      <TableCell className="text-xs text-slate-500">{p.recordedBy}</TableCell>
                      <TableCell>
                        <Badge variant="success" className="text-[10px]">
                          {p.status}
                        </Badge>
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
