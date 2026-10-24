import { AppShell } from "@/components/layout/app-shell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { readCollection, CreditNote, initializeStoreIfEmpty } from "@/lib/store";
import { formatCurrency, formatDate } from "@/lib/utils";
import Link from "next/link";
import { ArrowLeft, RotateCcw, AlertTriangle, ShieldCheck } from "lucide-react";

export const revalidate = 0;

export default async function CreditNotesPage() {
  initializeStoreIfEmpty();
  const creditNotes = readCollection<CreditNote>("credit_notes", []);

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Link href="/billing">
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Sales Returns & Credit Notes
            </h1>
            <p className="text-sm text-slate-500">
              GST-compliant credit notes with mandatory restock inspection and tax reversals
            </p>
          </div>
        </div>

        <Card className="shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">
              Credit Note Register ({creditNotes.length})
            </CardTitle>
            <CardDescription className="text-xs">
              Damaged/defective optical goods are audited and isolated from active sellable inventory
            </CardDescription>
          </CardHeader>
          <CardContent>
            {creditNotes.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-xs">
                No credit notes issued. To process a return, open the relevant invoice from the Billing Register.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>CN #</TableHead>
                    <TableHead>Original Invoice #</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Taxable Value</TableHead>
                    <TableHead>Tax Reversed</TableHead>
                    <TableHead>Total Credit</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {creditNotes.map((cn) => (
                    <TableRow key={cn.id}>
                      <TableCell className="font-mono text-xs font-semibold text-teal-800">
                        {cn.creditNoteNumber}
                      </TableCell>
                      <TableCell className="font-mono text-xs text-slate-700">
                        <Link href={`/billing/${cn.invoiceId}`} className="hover:underline">
                          {cn.invoiceNumber}
                        </Link>
                      </TableCell>
                      <TableCell className="text-xs font-medium text-slate-900">
                        {cn.customerName}
                      </TableCell>
                      <TableCell className="text-xs text-slate-500 font-mono">
                        {formatDate(cn.creditNoteDate)}
                      </TableCell>
                      <TableCell className="text-xs text-slate-600 max-w-xs truncate">
                        {cn.reason}
                      </TableCell>
                      <TableCell className="text-xs font-mono">{formatCurrency(cn.subtotal)}</TableCell>
                      <TableCell className="text-xs font-mono text-rose-600">
                        -{formatCurrency(cn.taxAmount)}
                      </TableCell>
                      <TableCell className="text-xs font-bold font-mono text-slate-900">
                        {formatCurrency(cn.totalAmount)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px]">
                          {cn.status}
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
