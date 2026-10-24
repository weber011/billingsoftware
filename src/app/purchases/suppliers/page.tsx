import { AppShell } from "@/components/layout/app-shell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { readCollection, Supplier, initializeStoreIfEmpty } from "@/lib/store";
import { Truck, Plus, Phone, Mail, MapPin } from "lucide-react";
import Link from "next/link";

export const revalidate = 0;

export default async function SuppliersPage() {
  initializeStoreIfEmpty();
  const suppliers = readCollection<Supplier>("suppliers", []);

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Optical Suppliers & Vendors
            </h1>
            <p className="text-sm text-slate-500">
              Lens manufacturers, frame distributors, and optical accessory vendors
            </p>
          </div>
        </div>

        <Card className="shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">
              Supplier Directory ({suppliers.length})
            </CardTitle>
            <CardDescription className="text-xs">
              Supplier accounts and payables are segregated from retail customer accounts
            </CardDescription>
          </CardHeader>
          <CardContent>
            {suppliers.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-xs">
                No suppliers registered.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Supplier Name</TableHead>
                    <TableHead>Contact Person</TableHead>
                    <TableHead>Phone / Email</TableHead>
                    <TableHead>GSTIN</TableHead>
                    <TableHead>City / State</TableHead>
                    <TableHead>Payment Terms</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {suppliers.map((sup) => (
                    <TableRow key={sup.id} className="hover:bg-slate-50/80">
                      <TableCell className="font-semibold text-slate-900 text-xs">
                        {sup.name}
                        {sup.notes && (
                          <p className="text-[10px] text-slate-400 font-normal">{sup.notes}</p>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-slate-700">
                        {sup.contactPerson || "-"}
                      </TableCell>
                      <TableCell className="text-xs text-slate-600">
                        <p>{sup.phone}</p>
                        <p className="text-[10px] text-slate-400">{sup.email}</p>
                      </TableCell>
                      <TableCell className="font-mono text-xs text-slate-800">
                        {sup.gstin || "-"}
                      </TableCell>
                      <TableCell className="text-xs text-slate-600">
                        {[sup.city, sup.state].filter(Boolean).join(", ") || "-"}
                      </TableCell>
                      <TableCell className="text-xs text-slate-700 font-medium">
                        {sup.paymentTerms || "30 Days Net"}
                      </TableCell>
                      <TableCell>
                        <Badge variant="success" className="text-[10px]">
                          Active
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
