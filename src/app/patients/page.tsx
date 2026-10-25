import { getPatients } from "@/actions/patients";
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDate } from "@/lib/utils";
import Link from "next/link";
import { Users, UserPlus, Search, Eye, Phone, MapPin } from "lucide-react";

export const revalidate = 0;

export default async function PatientsPage({
  searchParams,
}: {
  searchParams: { search?: string };
}) {
  const searchQuery = searchParams?.search || "";
  const patients = await getPatients(searchQuery);

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Patient Directory</h1>
            <p className="text-sm text-slate-500">
              Manage optical patient profiles, historical prescriptions, and vision records
            </p>
          </div>
          <Link href="/patients/new">
            <Button className="bg-teal-700 hover:bg-teal-800 text-white gap-2 font-medium shadow-sm">
              <UserPlus className="h-4 w-4" /> Register New Patient
            </Button>
          </Link>
        </div>

        {/* Search Bar */}
        <Card className="shadow-sm">
          <CardContent className="pt-6">
            <form method="GET" className="flex items-center gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <Input
                  name="search"
                  defaultValue={searchQuery}
                  placeholder="Search by patient ID (e.g. PT-501), name, or phone number..."
                  className="pl-9"
                />
              </div>
              <Button type="submit" variant="secondary" className="font-medium">
                Search
              </Button>
              {searchQuery && (
                <Link href="/patients">
                  <Button variant="ghost" type="button">
                    Clear
                  </Button>
                </Link>
              )}
            </form>
          </CardContent>
        </Card>

        {/* Patients Table */}
        <Card className="shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">
              Patients List ({patients.length})
            </CardTitle>
            <CardDescription className="text-xs">
              Click on any patient to view clinical prescriptions, spectacles order history, and invoices
            </CardDescription>
          </CardHeader>
          <CardContent>
            {patients.length === 0 ? (
              <div className="text-center py-12 text-slate-500 text-sm">
                No patients found matching your search.
              </div>
            ) : (
              <>
                {/* Mobile Cards View (Visible on phones) */}
                <div className="block md:hidden space-y-3">
                  {patients.map((patient) => (
                    <div
                      key={patient.id}
                      className="p-3.5 rounded-lg border bg-slate-50/60 space-y-2.5 text-xs shadow-xs"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-bold text-teal-800 text-xs px-2 py-0.5 rounded bg-teal-50 border border-teal-200">
                          {patient.customerCode}
                        </span>
                        <Badge variant={patient.isActive ? "success" : "secondary"} className="text-[10px]">
                          {patient.isActive ? "Active" : "Archived"}
                        </Badge>
                      </div>

                      <div>
                        <Link
                          href={`/patients/${patient.id}`}
                          className="font-bold text-slate-900 text-sm hover:underline"
                        >
                          {patient.name}
                        </Link>
                        {patient.phone && (
                          <div className="mt-1">
                            <a
                              href={`tel:${patient.phone}`}
                              className="inline-flex items-center gap-1.5 text-teal-700 font-medium text-xs hover:underline"
                            >
                              <Phone className="h-3 w-3" />
                              {patient.phone}
                            </a>
                          </div>
                        )}
                        {(patient.city || patient.address) && (
                          <p className="text-[11px] text-slate-500 flex items-center gap-1 mt-1">
                            <MapPin className="h-3 w-3 text-slate-400 shrink-0" />
                            <span className="truncate">{patient.city || patient.address}</span>
                          </p>
                        )}
                      </div>

                      <div className="pt-2 border-t border-slate-200/70 flex items-center justify-between">
                        <span className="text-[10px] text-slate-400 font-mono">
                          Reg: {formatDate(patient.createdAt)}
                        </span>
                        <Link href={`/patients/${patient.id}`}>
                          <Button size="sm" variant="outline" className="h-7 text-xs gap-1 font-medium bg-white">
                            <Eye className="h-3.5 w-3.5" /> View Profile
                          </Button>
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Desktop & Tablet Table */}
                <div className="hidden md:block">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-24">ID</TableHead>
                        <TableHead>Patient Name</TableHead>
                        <TableHead>Contact Phone</TableHead>
                        <TableHead>City / Address</TableHead>
                        <TableHead>Registered On</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {patients.map((patient) => (
                        <TableRow key={patient.id} className="hover:bg-slate-50/80">
                          <TableCell className="font-mono text-xs font-semibold text-teal-800">
                            {patient.customerCode}
                          </TableCell>
                          <TableCell className="font-medium text-slate-900">
                            <Link
                              href={`/patients/${patient.id}`}
                              className="hover:underline text-teal-900 font-semibold"
                            >
                              {patient.name}
                            </Link>
                            {patient.notes && (
                              <p className="text-[11px] text-slate-400 truncate max-w-xs">
                                {patient.notes}
                              </p>
                            )}
                          </TableCell>
                          <TableCell className="text-xs text-slate-600">
                            <span className="flex items-center gap-1">
                              <Phone className="h-3 w-3 text-slate-400" />
                              {patient.phone}
                            </span>
                          </TableCell>
                          <TableCell className="text-xs text-slate-600">
                            {patient.city || patient.address ? (
                              <span className="flex items-center gap-1">
                                <MapPin className="h-3 w-3 text-slate-400" />
                                {patient.city || patient.address}
                              </span>
                            ) : (
                              "-"
                            )}
                          </TableCell>
                          <TableCell className="text-xs text-slate-500">
                            {formatDate(patient.createdAt)}
                          </TableCell>
                          <TableCell>
                            <Badge variant={patient.isActive ? "success" : "secondary"} className="text-[10px]">
                              {patient.isActive ? "Active" : "Archived"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Link href={`/patients/${patient.id}`}>
                              <Button size="sm" variant="outline" className="h-7 text-xs gap-1">
                                <Eye className="h-3.5 w-3.5" /> View Profile
                              </Button>
                            </Link>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
