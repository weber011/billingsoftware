import { getPrescriptions } from "@/actions/prescriptions";
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDate } from "@/lib/utils";
import Link from "next/link";
import { Glasses, Plus, Eye, User } from "lucide-react";

export const revalidate = 0;

export default async function PrescriptionsListPage() {
  const prescriptions = await getPrescriptions();

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Optical Prescriptions
            </h1>
            <p className="text-sm text-slate-500">
              Chronological refractive records, eye measurements, and clinical examination history
            </p>
          </div>
          <Link href="/prescriptions/new">
            <Button className="bg-teal-700 hover:bg-teal-800 text-white gap-2 font-medium shadow-sm">
              <Plus className="h-4 w-4" /> Record New Prescription
            </Button>
          </Link>
        </div>

        <Card className="shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">
              All Examination Records ({prescriptions.length})
            </CardTitle>
            <CardDescription className="text-xs">
              Every prescription is stored with an immutable identity and preserved with historical integrity
            </CardDescription>
          </CardHeader>
          <CardContent>
            {prescriptions.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-xs">
                No prescriptions recorded yet.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Rx Code</TableHead>
                    <TableHead>Patient Name</TableHead>
                    <TableHead>Exam Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Right Eye (SPH/CYL/AXIS)</TableHead>
                    <TableHead>Left Eye (SPH/CYL/AXIS)</TableHead>
                    <TableHead>PD (mm)</TableHead>
                    <TableHead>Examiner</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {prescriptions.map((rx) => (
                    <TableRow key={rx.id}>
                      <TableCell className="font-mono text-xs font-semibold text-teal-800">
                        {rx.prescriptionCode}
                      </TableCell>
                      <TableCell className="font-medium text-slate-900">
                        <Link href={`/patients/${rx.customerId}`} className="hover:underline">
                          {rx.customerName || "Patient"}
                        </Link>
                      </TableCell>
                      <TableCell className="text-xs text-slate-500">
                        {formatDate(rx.examinationDate)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px]">
                          {rx.prescriptionType}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {rx.rightSph || "0.00"} / {rx.rightCyl || "0.00"} / {rx.rightAxis ? `${rx.rightAxis}°` : "-"}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {rx.leftSph || "0.00"} / {rx.leftCyl || "0.00"} / {rx.leftAxis ? `${rx.leftAxis}°` : "-"}
                      </TableCell>
                      <TableCell className="text-xs font-medium text-slate-700">
                        {rx.pd ? `${rx.pd} mm` : "-"}
                      </TableCell>
                      <TableCell className="text-xs text-slate-600">
                        {rx.prescribedBy}
                      </TableCell>
                      <TableCell className="text-right">
                        <Link href={`/patients/${rx.customerId}`}>
                          <Button size="sm" variant="ghost" className="h-7 text-xs gap-1">
                            <Eye className="h-3.5 w-3.5" /> View Rx
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
