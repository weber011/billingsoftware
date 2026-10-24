import { getInvoiceById } from "@/actions/billing";
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/utils";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Receipt,
  ArrowLeft,
  Printer,
  Glasses,
  CheckCircle2,
  AlertCircle,
  CreditCard,
  FileText,
} from "lucide-react";
import { InvoicePrintClient } from "./invoice-print-client";

export const revalidate = 0;

export default async function InvoiceDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const { invoice, payments, creditNotes, settings } = await getInvoiceById(params.id);

  if (!invoice) {
    notFound();
  }

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Navigation & Action Bar */}
        <div className="no-print flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link href="/billing">
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                  {invoice.invoiceNumber}
                </h1>
                <Badge variant="success" className="text-xs">
                  {invoice.status}
                </Badge>
                {invoice.balanceDue > 0 ? (
                  <Badge variant="warning" className="text-xs">
                    Due: {formatCurrency(invoice.balanceDue)}
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-xs text-emerald-800 bg-emerald-50">
                    Paid in Full
                  </Badge>
                )}
              </div>
              <p className="text-xs text-slate-500">
                Issued on {formatDate(invoice.invoiceDate)} | Created by {invoice.finalizedBy || "Staff"}
              </p>
            </div>
          </div>

          <InvoicePrintClient invoice={invoice} />
        </div>

        {/* ============================================================== */}
        {/* OFFICIAL A4 TAX INVOICE PRINTABLE DOCUMENT                     */}
        {/* ============================================================== */}
        <div
          id="printable-invoice"
          className="bg-white p-8 md:p-12 rounded-xl border border-slate-200 shadow-sm text-slate-800 space-y-6 print:p-0 print:border-none print:shadow-none"
        >
          {/* Header & Brand */}
          <div className="flex justify-between items-start border-b pb-6">
            <div>
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded bg-teal-800 text-white flex items-center justify-center font-bold">
                  <Glasses className="h-5 w-5" />
                </div>
                <span className="text-2xl font-black tracking-tight text-teal-950 uppercase">
                  LensArt
                </span>
              </div>
              <p className="text-xs font-semibold text-slate-700 mt-1">{settings.legalName}</p>
              <p className="text-xs text-slate-500 max-w-sm">{settings.address}, {settings.city}, {settings.state} - {settings.pinCode}</p>
              <p className="text-xs text-slate-600 font-mono mt-1">
                GSTIN: <span className="font-bold">{settings.gstin}</span> (State Code: {settings.stateCode})
              </p>
              <p className="text-xs text-slate-500">Phone: {settings.phone} | Email: {settings.email}</p>
            </div>

            <div className="text-right">
              <div className="inline-block bg-slate-900 text-white px-3 py-1 rounded text-xs font-bold uppercase tracking-wider mb-2">
                Tax Invoice
              </div>
              <p className="text-sm font-bold font-mono text-teal-950">{invoice.invoiceNumber}</p>
              <p className="text-xs text-slate-500">Date: {formatDate(invoice.invoiceDate)}</p>
              <p className="text-xs text-slate-500">Time: {formatDateTime(invoice.invoiceDate)}</p>
              <p className="text-xs font-semibold text-slate-700 mt-1">
                Place of Supply: {invoice.placeOfSupplyCode}
              </p>
            </div>
          </div>

          {/* Billed To / Recipient Details */}
          <div className="grid grid-cols-2 gap-6 p-4 bg-slate-50/70 rounded-lg text-xs">
            <div>
              <p className="font-bold text-slate-500 uppercase tracking-wider text-[10px] mb-1">
                Billed To (Customer):
              </p>
              <p className="text-sm font-bold text-slate-900">{invoice.customerName}</p>
              {invoice.customerAddress && <p className="text-slate-600">{invoice.customerAddress}</p>}
              <p className="text-slate-600">Phone: {invoice.customerPhone || "N/A"}</p>
              {invoice.customerGstin && (
                <p className="font-mono font-semibold text-teal-950">GSTIN: {invoice.customerGstin}</p>
              )}
            </div>

            <div className="text-right">
              <p className="font-bold text-slate-500 uppercase tracking-wider text-[10px] mb-1">
                Supply Classification:
              </p>
              <p className="font-medium text-slate-800">
                {invoice.isInterState ? "Inter-State Supply (IGST)" : "Intra-State Supply (CGST + SGST)"}
              </p>
              <p className="text-slate-500 mt-1">
                Pricing: {invoice.isTaxInclusive ? "Tax Inclusive" : "Tax Exclusive"}
              </p>
              {invoice.orderId && (
                <p className="text-slate-600 font-mono mt-1">Linked Order ID: {invoice.orderId}</p>
              )}
            </div>
          </div>

          {/* Line Items Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="border-b-2 border-slate-900 text-slate-900 font-bold uppercase text-[11px]">
                  <th className="py-2.5 px-2">#</th>
                  <th className="py-2.5 px-2">Description of Optical Goods</th>
                  <th className="py-2.5 px-2">HSN</th>
                  <th className="py-2.5 px-2 text-center">Qty</th>
                  <th className="py-2.5 px-2 text-right">Unit Rate</th>
                  <th className="py-2.5 px-2 text-right">Taxable Value</th>
                  <th className="py-2.5 px-2 text-center">GST %</th>
                  {!invoice.isInterState ? (
                    <>
                      <th className="py-2.5 px-2 text-right">CGST</th>
                      <th className="py-2.5 px-2 text-right">SGST</th>
                    </>
                  ) : (
                    <th className="py-2.5 px-2 text-right">IGST</th>
                  )}
                  <th className="py-2.5 px-2 text-right">Total (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {invoice.items.map((it, idx) => (
                  <tr key={it.id} className="hover:bg-slate-50">
                    <td className="py-2 px-2 text-slate-400">{idx + 1}</td>
                    <td className="py-2 px-2 font-medium text-slate-900">{it.description}</td>
                    <td className="py-2 px-2 font-mono text-slate-600">{it.hsnCode}</td>
                    <td className="py-2 px-2 text-center font-mono">{it.quantity}</td>
                    <td className="py-2 px-2 text-right font-mono">{formatCurrency(it.unitPrice)}</td>
                    <td className="py-2 px-2 text-right font-mono">{formatCurrency(it.taxableAmount)}</td>
                    <td className="py-2 px-2 text-center font-mono">{it.gstRate}%</td>
                    {!invoice.isInterState ? (
                      <>
                        <td className="py-2 px-2 text-right font-mono text-slate-600">
                          {formatCurrency(it.cgstAmount)}
                        </td>
                        <td className="py-2 px-2 text-right font-mono text-slate-600">
                          {formatCurrency(it.sgstAmount)}
                        </td>
                      </>
                    ) : (
                      <td className="py-2 px-2 text-right font-mono text-slate-600">
                        {formatCurrency(it.igstAmount)}
                      </td>
                    )}
                    <td className="py-2 px-2 text-right font-mono font-bold text-slate-900">
                      {formatCurrency(it.totalAmount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Tax Summary & Grand Total Calculation */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 pt-4 border-t">
            {/* Left: GST Tax Rate Breakdown Box */}
            <div className="space-y-3">
              <p className="font-bold text-[11px] text-slate-700 uppercase tracking-wider">
                GST Tax Summary
              </p>
              <div className="overflow-x-auto">
                <table className="w-full text-[11px] border border-slate-200 rounded text-center">
                  <thead className="bg-slate-100 text-slate-700 font-semibold">
                    <tr>
                      <th className="p-1.5">HSN</th>
                      <th className="p-1.5">Rate</th>
                      <th className="p-1.5 text-right">Taxable</th>
                      {!invoice.isInterState ? (
                        <>
                          <th className="p-1.5 text-right">CGST</th>
                          <th className="p-1.5 text-right">SGST</th>
                        </>
                      ) : (
                        <th className="p-1.5 text-right">IGST</th>
                      )}
                      <th className="p-1.5 text-right">Total Tax</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y font-mono">
                    {invoice.taxSummary.map((ts, i) => (
                      <tr key={i}>
                        <td className="p-1.5">{ts.hsnCode}</td>
                        <td className="p-1.5">{ts.gstRate}%</td>
                        <td className="p-1.5 text-right">{formatCurrency(ts.taxableAmount)}</td>
                        {!invoice.isInterState ? (
                          <>
                            <td className="p-1.5 text-right">{formatCurrency(ts.cgstAmount)}</td>
                            <td className="p-1.5 text-right">{formatCurrency(ts.sgstAmount)}</td>
                          </>
                        ) : (
                          <td className="p-1.5 text-right">{formatCurrency(ts.igstAmount)}</td>
                        )}
                        <td className="p-1.5 text-right font-semibold">{formatCurrency(ts.totalTax)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {invoice.notes && (
                <p className="text-xs text-slate-500 italic mt-2">Notes: {invoice.notes}</p>
              )}
            </div>

            {/* Right: Authoritative Financial Totals */}
            <div className="space-y-2 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal (Gross Value):</span>
                <span className="font-mono">{formatCurrency(invoice.subtotal)}</span>
              </div>
              {invoice.totalDiscount > 0 && (
                <div className="flex justify-between text-rose-600">
                  <span>Total Discount:</span>
                  <span className="font-mono">-{formatCurrency(invoice.totalDiscount)}</span>
                </div>
              )}
              <div className="flex justify-between text-slate-700 font-medium">
                <span>Total Taxable Amount:</span>
                <span className="font-mono">{formatCurrency(invoice.taxableAmount)}</span>
              </div>
              {!invoice.isInterState ? (
                <>
                  <div className="flex justify-between text-slate-600">
                    <span>Central GST (CGST):</span>
                    <span className="font-mono">{formatCurrency(invoice.cgstTotal)}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>State GST (SGST):</span>
                    <span className="font-mono">{formatCurrency(invoice.sgstTotal)}</span>
                  </div>
                </>
              ) : (
                <div className="flex justify-between text-slate-600">
                  <span>Integrated GST (IGST):</span>
                  <span className="font-mono">{formatCurrency(invoice.igstTotal)}</span>
                </div>
              )}
              {invoice.roundOff !== 0 && (
                <div className="flex justify-between text-slate-500 text-[11px]">
                  <span>Round Off:</span>
                  <span className="font-mono">
                    {invoice.roundOff > 0 ? `+${invoice.roundOff}` : invoice.roundOff}
                  </span>
                </div>
              )}
              <div className="flex justify-between text-base font-bold text-slate-900 pt-2 border-t">
                <span>Grand Total:</span>
                <span className="font-mono text-teal-900">{formatCurrency(invoice.finalAmount)}</span>
              </div>
              <div className="flex justify-between text-emerald-700 font-semibold pt-1">
                <span>Amount Paid:</span>
                <span className="font-mono">{formatCurrency(invoice.amountPaid)}</span>
              </div>
              <div className="flex justify-between text-amber-800 font-bold text-sm pt-1 border-t">
                <span>Balance Due:</span>
                <span className="font-mono">{formatCurrency(invoice.balanceDue)}</span>
              </div>
            </div>
          </div>

          {/* Payment Receipts History */}
          {payments.length > 0 && (
            <div className="pt-4 border-t text-xs">
              <p className="font-bold text-[10px] text-slate-500 uppercase tracking-wider mb-1">
                Payment Transactions Received:
              </p>
              <div className="space-y-1">
                {payments.map((p) => (
                  <div key={p.id} className="flex justify-between font-mono text-[11px] text-slate-600">
                    <span>
                      {p.paymentNumber} • {formatDateTime(p.paymentDate)} via {p.paymentMethod}
                      {p.transactionRef ? ` (Ref: ${p.transactionRef})` : ""}
                    </span>
                    <span className="font-bold text-emerald-700">{formatCurrency(p.amount)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Policies & Authorized Signatory */}
          <div className="pt-8 border-t flex flex-col sm:flex-row justify-between items-end gap-6 text-[10px] text-slate-500">
            <div className="max-w-md space-y-1">
              <p className="font-bold text-slate-700">Terms & Conditions:</p>
              <p>{settings.termsAndConditions}</p>
              <p>{settings.returnPolicy}</p>
              <p>{settings.warrantyPolicy}</p>
            </div>

            <div className="text-center sm:text-right">
              <div className="h-12 flex items-end justify-center sm:justify-end">
                <span className="font-serif italic text-slate-600 font-semibold">[Digitally Signed]</span>
              </div>
              <div className="border-t border-slate-300 pt-1 mt-1 font-semibold text-slate-800">
                {settings.signatory}
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
