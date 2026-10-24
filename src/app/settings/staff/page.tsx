import { AppShell } from "@/components/layout/app-shell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ShieldCheck, UserCheck, Lock } from "lucide-react";

export const revalidate = 0;

export default function StaffRolesPage() {
  const roles = [
    {
      name: "OWNER",
      displayName: "Store Owner",
      description: "Full administrative access to billing, inventory, financial reports, tax setup, and staff accounts",
      permissions: ["billing:full", "patients:full", "prescriptions:full", "inventory:full", "finance:full", "settings:full"],
      staffCount: 1,
    },
    {
      name: "MANAGER",
      displayName: "Store Manager",
      description: "Manage daily optical retail operations, order approvals, inventory adjustments, and sales registers",
      permissions: ["billing:create", "patients:full", "orders:full", "inventory:adjust", "finance:read", "reports:read"],
      staffCount: 1,
    },
    {
      name: "BILLING_STAFF",
      displayName: "Cashier / Billing Staff",
      description: "Create GST tax invoices, register new patients, collect payments, and issue thermal receipts",
      permissions: ["billing:create", "patients:create", "patients:read", "finance:payment_record"],
      staffCount: 2,
    },
    {
      name: "OPTOMETRIST",
      displayName: "Consultant Optometrist",
      description: "Perform optical refractions, record eye power, pupillary distance, and vision recommendations",
      permissions: ["patients:read", "prescriptions:create", "prescriptions:read", "orders:create"],
      staffCount: 1,
    },
    {
      name: "INVENTORY_STAFF",
      displayName: "Inventory Executive",
      description: "Manage product catalog, receive stock from suppliers, track movements, and monitor low stock",
      permissions: ["inventory:full", "suppliers:read", "reports:inventory"],
      staffCount: 1,
    },
  ];

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Staff Accounts & Role-Based Access Control (RBAC)
          </h1>
          <p className="text-sm text-slate-500">
            Server-enforced permission model ensuring least-privilege security for optical retail operations
          </p>
        </div>

        <Card className="shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">Configured Optical Store Roles</CardTitle>
            <CardDescription className="text-xs">
              Permissions are verified server-side on every protected mutation
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Role Name</TableHead>
                  <TableHead>Display Title</TableHead>
                  <TableHead>Operational Responsibilities</TableHead>
                  <TableHead>Assigned Privileges</TableHead>
                  <TableHead className="text-right">Active Users</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {roles.map((r) => (
                  <TableRow key={r.name}>
                    <TableCell className="font-mono text-xs font-bold text-teal-800">
                      {r.name}
                    </TableCell>
                    <TableCell className="text-xs font-semibold text-slate-900">
                      {r.displayName}
                    </TableCell>
                    <TableCell className="text-xs text-slate-600 max-w-xs">{r.description}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1 max-w-xs">
                        {r.permissions.map((p) => (
                          <span
                            key={p}
                            className="font-mono text-[9px] bg-slate-100 text-slate-700 px-1 py-0.5 rounded border"
                          >
                            {p}
                          </span>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs font-bold">
                      {r.staffCount}
                    </TableCell>
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
