import { AppShell } from "@/components/layout/app-shell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { readCollection, Invoice, BusinessSettings, initializeStoreIfEmpty } from "@/lib/store";
import { formatCurrency, formatDate } from "@/lib/utils";
import { FileText, Download, Printer, ShieldAlert, AlertTriangle } from "lucide-react";

export const revalidate = 0;

export default async function GSTReportPage() {
  initializeStoreIfEmpty();
  const invoices = readCollection<Invoice>("invoices", []).filter((i) => i.status === "FINALIZED");
  const settings = readCollection<BusinessSettings>("business_settings")[0];

  // Aggregations
  let totalTaxable = 0;
  let totalCGST = 0;
  let totalSGST = 0;
  let totalIGST = 0;
  let totalGross = 0;

  // HSN-wise aggregation
  const hsnMap = new Map<
    string,
    {
      hsnCode: string;
      rate: number;
      taxableAmount: number;
      cgstAmount: number;
      sgstAmount: number;
      igstAmount: number;
      totalTax: number;
      count: number;
    }
  >();

  for (const inv of invoices) {
    totalTaxable += inv.taxableAmount;
    totalCGST += inv.cgstTotal;
    totalSGST += inv.sgstTotal;
    totalIGST += inv.igstTotal;
    totalGross += inv.finalAmount;

    for (const ts of inv.taxSummary) {
      const key = `${ts.hsnCode}_${ts.gstRate}`;
      const existing = hsnMap.get(key);
      if (!existing) {
        hsnMap.set(key, {
          hsnCode: ts.hsnCode,
          rate: ts.gstRate,
          taxableAmount: ts.taxableAmount,
          cgstAmount: ts.cgstAmount,
          sgstAmount: ts.sgstAmount,
          igstAmount: ts.igstAmount,
          totalTax: ts.totalTax,
          count: 1,
        });
      } else {
        existing.taxableAmount += ts.taxableAmount;
        existing.cgstAmount += ts.cgstAmount;
        existing.sgstAmount += ts.sgstAmount;
        existing.igstAmount += ts.igstAmount;
        existing.totalTax += ts.totalTax;
        existing.count += 1;
      }
    }
  }

  const hsnSummaries = Array.from(hsnMap.values());
  const totalTaxCollected = totalCGST + totalSGST + totalIGST;

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              GST Tax Report & GSTR-1 Preparation
            </h1>
            <p className="text-sm text-slate-500">
              Official tax register derived from finalized transaction snapshots for CA review and return preparation
            </p>
          </div>
          <div className="no-print flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                // Client-side print
                if (typeof window !== "undefined") window.print();
              }}
              className="text-xs gap-1.5"
            >
              <Printer className="h-4 w-4" /> Print GST Report
            </Button>
          </div>
        </div>

        {/* GST Notice Banner */}
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-900 space-y-1">
          <div className="flex items-center gap-2 font-bold text-blue-950">
            <ShieldAlert className="h-4 w-4 text-blue-700" />
            <span>Statutory Notice: Internal GST Return Preparation Export</span>
          </div>
          <p className="text-blue-800">
            This report reflects transaction data recorded in LensArt for GSTIN:{" "}
            <span className="font-mono font-bold">{settings.gstin}</span>. Tax rates and HSN
            classifications must be reviewed and approved by a qualified Indian Chartered Accountant
            or GST practitioner prior to portal submission. This software does not simulate government portal filing.
          </p>
        </div>

        {/* Key GST Totals Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <Card className="shadow-sm">
            <CardHeader className="pb-1">
              <CardTitle className="text-xs text-slate-500 uppercase tracking-wider">
                Total Taxable Value
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold font-mono text-slate-900">
                {formatCurrency(totalTaxable)}
              </div>
              <p className="text-[11px] text-slate-400 mt-1">Base value before GST</p>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader className="pb-1">
              <CardTitle className="text-xs text-slate-500 uppercase tracking-wider">
                Central Tax (CGST)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold font-mono text-teal-800">
                {formatCurrency(totalCGST)}
              </div>
              <p className="text-[11px] text-slate-400 mt-1">50% of intra-state rate</p>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader className="pb-1">
              <CardTitle className="text-xs text-slate-500 uppercase tracking-wider">
                State Tax (SGST)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold font-mono text-teal-800">
                {formatCurrency(totalSGST)}
              </div>
              <p className="text-[11px] text-slate-400 mt-1">50% of intra-state rate</p>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader className="pb-1">
              <CardTitle className="text-xs text-slate-500 uppercase tracking-wider">
                Integrated Tax (IGST)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold font-mono text-blue-700">
                {formatCurrency(totalIGST)}
              </div>
              <p className="text-[11px] text-slate-400 mt-1">Inter-state supplies</p>
            </CardContent>
          </Card>
        </div>

        {/* HSN-Wise Summary Table (Table 12 of GSTR-1) */}
        <Card className="shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">
              HSN-Wise Outward Supplies Summary (GSTR-1 Table 12 Format)
            </CardTitle>
            <CardDescription className="text-xs">
              Summary of taxable turnover and tax liability grouped by Harmonized System of Nomenclature code
            </CardDescription>
          </CardHeader>
          <CardContent>
            {hsnSummaries.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-xs">
                No finalized supplies to summarize.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>HSN Code</TableHead>
                    <TableHead>Applicable GST Rate</TableHead>
                    <TableHead>Taxable Value (₹)</TableHead>
                    <TableHead>CGST Amount (₹)</TableHead>
                    <TableHead>SGST Amount (₹)</TableHead>
                    <TableHead>IGST Amount (₹)</TableHead>
                    <TableHead className="text-right">Total Tax Liability (₹)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {hsnSummaries.map((h, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-mono text-xs font-bold text-slate-900">
                        {h.hsnCode}
                      </TableCell>
                      <TableCell className="font-mono text-xs font-semibold">{h.rate}%</TableCell>
                      <TableCell className="font-mono text-xs">{formatCurrency(h.taxableAmount)}</TableCell>
                      <TableCell className="font-mono text-xs text-slate-600">
                        {formatCurrency(h.cgstAmount)}
                      </TableCell>
                      <TableCell className="font-mono text-xs text-slate-600">
                        {formatCurrency(h.sgstAmount)}
                      </TableCell>
                      <TableCell className="font-mono text-xs text-slate-600">
                        {formatCurrency(h.igstAmount)}
                      </TableCell>
                      <TableCell className="font-mono text-xs font-bold text-right text-slate-900">
                        {formatCurrency(h.totalTax)}
                      </TableCell>
                    </TableRow>
                  ))}
                  {/* Totals Row */}
                  <TableRow className="bg-slate-100 font-bold">
                    <TableCell colSpan={2}>TOTALS</TableCell>
                    <TableCell className="font-mono text-xs">{formatCurrency(totalTaxable)}</TableCell>
                    <TableCell className="font-mono text-xs">{formatCurrency(totalCGST)}</TableCell>
                    <TableCell className="font-mono text-xs">{formatCurrency(totalSGST)}</TableCell>
                    <TableCell className="font-mono text-xs">{formatCurrency(totalIGST)}</TableCell>
                    <TableCell className="font-mono text-xs text-right text-teal-900">
                      {formatCurrency(totalTaxCollected)}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
