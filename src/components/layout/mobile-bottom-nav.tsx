"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Receipt, Users, Glasses, Menu } from "lucide-react";
import { cn } from "@/lib/utils";

interface MobileBottomNavProps {
  onMenuToggle: () => void;
}

export function MobileBottomNav({ onMenuToggle }: MobileBottomNavProps) {
  const pathname = usePathname();

  const isBilling = pathname.startsWith("/billing");
  const isOrders = pathname.startsWith("/orders");
  const isPatients = pathname.startsWith("/patients");
  const isDashboard = pathname === "/dashboard" || pathname === "/";

  return (
    <nav className="no-print lg:hidden fixed bottom-0 inset-x-0 z-40 bg-slate-900/95 backdrop-blur-md border-t border-slate-800 text-slate-300 pb-safe">
      <div className="flex items-center justify-around h-16 px-1 max-w-md mx-auto">
        {/* Dashboard */}
        <Link
          href="/dashboard"
          className={cn(
            "flex flex-col items-center justify-center flex-1 py-1 text-[11px] font-medium transition-colors",
            isDashboard ? "text-teal-400 font-semibold" : "text-slate-400 hover:text-slate-200"
          )}
        >
          <LayoutDashboard className="h-5 w-5 mb-0.5" />
          <span>Home</span>
        </Link>

        {/* Patients */}
        <Link
          href="/patients"
          className={cn(
            "flex flex-col items-center justify-center flex-1 py-1 text-[11px] font-medium transition-colors",
            isPatients ? "text-teal-400 font-semibold" : "text-slate-400 hover:text-slate-200"
          )}
        >
          <Users className="h-5 w-5 mb-0.5" />
          <span>Patients</span>
        </Link>

        {/* Central Floating Action: + New Bill */}
        <div className="flex-1 flex justify-center -translate-y-3">
          <Link
            href="/billing/new"
            aria-label="New Bill"
            className="h-13 w-13 rounded-full bg-teal-600 hover:bg-teal-500 active:scale-95 text-white flex flex-col items-center justify-center shadow-lg shadow-teal-900/50 ring-4 ring-slate-900 transition-all"
          >
            <Receipt className="h-5 w-5 mb-0.5" />
            <span className="text-[9px] font-bold tracking-tight uppercase">+ Bill</span>
          </Link>
        </div>

        {/* Orders */}
        <Link
          href="/orders"
          className={cn(
            "flex flex-col items-center justify-center flex-1 py-1 text-[11px] font-medium transition-colors",
            isOrders ? "text-teal-400 font-semibold" : "text-slate-400 hover:text-slate-200"
          )}
        >
          <Glasses className="h-5 w-5 mb-0.5" />
          <span>Orders</span>
        </Link>

        {/* Full Menu Toggle */}
        <button
          type="button"
          onClick={onMenuToggle}
          className="flex flex-col items-center justify-center flex-1 py-1 text-[11px] font-medium text-slate-400 hover:text-slate-200 active:scale-95 transition-colors"
        >
          <Menu className="h-5 w-5 mb-0.5" />
          <span>Menu</span>
        </button>
      </div>
    </nav>
  );
}
