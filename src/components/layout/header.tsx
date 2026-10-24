"use client";

import { Bell, Search, UserCircle, HelpCircle, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

export function Header() {
  return (
    <header className="no-print h-16 border-b border-border bg-card px-6 flex items-center justify-between sticky top-0 z-30">
      {/* Search / Store State */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 text-xs bg-muted/60 px-3 py-1.5 rounded-full border border-border">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="font-medium text-foreground">Operational</span>
          <span className="text-muted-foreground">|</span>
          <span className="text-muted-foreground">Asia/Kolkata (IST)</span>
        </div>
      </div>

      {/* Quick Action Shortcuts & User Profile */}
      <div className="flex items-center gap-3">
        <Link href="/billing/new">
          <Button size="sm" className="bg-teal-700 hover:bg-teal-800 text-white gap-1.5 font-medium shadow-sm">
            + Quick Bill / Invoice
          </Button>
        </Link>
        <Link href="/patients/new">
          <Button size="sm" variant="outline" className="gap-1.5 text-xs">
            + Add Patient
          </Button>
        </Link>
        <Link href="/orders/new">
          <Button size="sm" variant="outline" className="gap-1.5 text-xs">
            + New Order
          </Button>
        </Link>

        <div className="h-4 w-px bg-border mx-1" />

        <div className="flex items-center gap-2 text-right">
          <div className="h-8 w-8 rounded-full bg-slate-800 text-teal-300 flex items-center justify-center font-semibold text-xs border border-slate-700">
            LA
          </div>
          <div className="text-left hidden sm:block">
            <p className="text-xs font-semibold leading-tight">LensArt Admin</p>
            <p className="text-[10px] text-muted-foreground">Role: OWNER</p>
          </div>
        </div>
      </div>
    </header>
  );
}
