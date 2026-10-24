import { AppShell } from "@/components/layout/app-shell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { OPTICAL_HSN_REFERENCE } from "@/lib/gst";
import { ShieldAlert, AlertTriangle, CheckCircle2, HelpCircle } from "lucide-react";

export const revalidate = 0;

export default function TaxSettingsPage() {
  return (
    <AppShell>
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            GST Tax Slabs & HSN Classifications
          </h1>
          <p className="text-sm text-slate-500">
            Harmonized System of Nomenclature (HSN) rates for spectacle frames, ophthalmic lenses, and accessories
          </p>
        </div>

        {/* Professional Review Notice */}
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 space-y-2">
          <div className="flex items-center gap-2 font-bold text-amber-950">
            <AlertTriangle className="h-4 w-4 text-amber-700" />
            <span>Mandatory GST Compliance Guidance</span>
          </div>
          <p>
            GST notifications and Advance Rulings frequently revise optical goods classifications.
            Rates listed below are indicative retail standards. Before beginning live commercial billing,
            the store owner must have these rates and product mappings reviewed by a qualified Indian
            Chartered Accountant or GST consultant.
          </p>
        </div>

        <Card className="shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">Optical HSN Classification Reference</CardTitle>
            <CardDescription className="text-xs">
              Configured tax rates applied during billing item lookups
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>HSN Code</TableHead>
                  <TableHead>Optical Category / Description</TableHead>
                  <TableHead>Indicative GST Rate</TableHead>
                  <TableHead>Legal Verification Status</TableHead>
                  <TableHead>Practitioner Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {OPTICAL_HSN_REFERENCE.map((h, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-mono text-xs font-bold text-teal-800">
                      {h.hsnCode}
                    </TableCell>
                    <TableCell className="text-xs font-medium text-slate-900 max-w-sm">
                      {h.description}
                    </TableCell>
                    <TableCell className="font-mono text-xs font-bold">{h.indicativeRate}%</TableCell>
                    <TableCell>
                      <Badge variant="warning" className="text-[10px] gap-1">
                        <AlertTriangle className="h-3 w-3" /> Pending Review
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-slate-500">{h.note}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
