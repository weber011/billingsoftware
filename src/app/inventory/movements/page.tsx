import { getStockMovements } from "@/actions/inventory";
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDateTime } from "@/lib/utils";
import Link from "next/link";
import { History, ArrowLeft, ArrowUpRight, ArrowDownLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export const revalidate = 0;

export default async function StockMovementsPage() {
  const movements = await getStockMovements();

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Link href="/inventory">
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Inventory Movement Ledger
            </h1>
            <p className="text-sm text-slate-500">
              Immutable audit trail of all optical stock receipts, billing sales deductions, and adjustments
            </p>
          </div>
        </div>

        <Card className="shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">
              Stock Movement History ({movements.length})
            </CardTitle>
            <CardDescription className="text-xs">
              Direct modification of historical inventory is strictly disallowed; every change creates an auditable record
            </CardDescription>
          </CardHeader>
          <CardContent>
            {movements.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-xs">
                No inventory movements recorded yet.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>Product Name</TableHead>
                    <TableHead>Movement Type</TableHead>
                    <TableHead>Previous</TableHead>
                    <TableHead>Change</TableHead>
                    <TableHead>New Stock</TableHead>
                    <TableHead>Reason / Reference</TableHead>
                    <TableHead>Performed By</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {movements.map((m) => {
                    const isPositive = m.quantity > 0;

                    return (
                      <TableRow key={m.id} className="hover:bg-slate-50/80">
                        <TableCell className="text-xs text-slate-500 font-mono">
                          {formatDateTime(m.createdAt)}
                        </TableCell>
                        <TableCell className="font-medium text-slate-900 text-xs">
                          {m.productName}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              m.movementType === "INITIAL" || m.movementType === "PURCHASE_IN" || m.movementType === "RETURN_IN"
                                ? "success"
                                : m.movementType === "SALE_OUT"
                                ? "info"
                                : "secondary"
                            }
                            className="text-[10px]"
                          >
                            {m.movementType}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs font-mono text-slate-500">
                          {m.previousStock}
                        </TableCell>
                        <TableCell className="font-mono text-xs font-bold">
                          <span
                            className={
                              isPositive ? "text-emerald-700 flex items-center" : "text-rose-600 flex items-center"
                            }
                          >
                            {isPositive ? `+${m.quantity}` : m.quantity}
                          </span>
                        </TableCell>
                        <TableCell className="text-xs font-mono font-semibold text-slate-800">
                          {m.newStock}
                        </TableCell>
                        <TableCell className="text-xs text-slate-600">
                          {m.reason || (m.referenceType ? `${m.referenceType} ref` : "-")}
                        </TableCell>
                        <TableCell className="text-xs text-slate-500">
                          {m.performedBy}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
