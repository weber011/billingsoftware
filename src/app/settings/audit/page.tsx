import { AppShell } from "@/components/layout/app-shell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { readCollection, AuditLogEntry, initializeStoreIfEmpty } from "@/lib/store";
import { formatDateTime } from "@/lib/utils";
import { ShieldCheck, History } from "lucide-react";

export const revalidate = 0;

export default async function AuditLogPage() {
  initializeStoreIfEmpty();
  const auditLogs = readCollection<AuditLogEntry>("audit_logs", []).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return (
    <AppShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            System Security & Audit Trail
          </h1>
          <p className="text-sm text-slate-500">
            Immutable security log of all patient registrations, prescription recordings, invoice finalizations, and inventory movements
          </p>
        </div>

        <Card className="shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">
              Audit Event Records ({auditLogs.length})
            </CardTitle>
            <CardDescription className="text-xs">
              Every sensitive action is cryptographically recorded with acting user and timestamp
            </CardDescription>
          </CardHeader>
          <CardContent>
            {auditLogs.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-xs">
                No audit events logged yet.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>Event Type</TableHead>
                    <TableHead>Module</TableHead>
                    <TableHead>Target Entity</TableHead>
                    <TableHead>Description of Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {auditLogs.map((log) => (
                    <TableRow key={log.id} className="hover:bg-slate-50/80">
                      <TableCell className="text-xs font-mono text-slate-500">
                        {formatDateTime(log.createdAt)}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            log.eventType === "FINALIZE"
                              ? "success"
                              : log.eventType === "ADJUST_STOCK"
                              ? "warning"
                              : "outline"
                          }
                          className="text-[10px] font-mono"
                        >
                          {log.eventType}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs font-semibold text-slate-700 capitalize">
                        {log.module}
                      </TableCell>
                      <TableCell className="text-xs font-mono text-slate-600">
                        {log.recordType || "-"}
                      </TableCell>
                      <TableCell className="text-xs text-slate-800">{log.description}</TableCell>
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
