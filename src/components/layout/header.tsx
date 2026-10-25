"use client";

import { Menu, Glasses, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

interface HeaderProps {
  onMenuToggle?: () => void;
}

export function Header({ onMenuToggle }: HeaderProps) {
  return (
    <header className="no-print h-14 sm:h-16 border-b border-border bg-card/95 backdrop-blur-md px-3 sm:px-6 flex items-center justify-between sticky top-0 z-30">
      {/* Left: Mobile Menu Toggle & Brand / Operational Status */}
      <div className="flex items-center gap-2 sm:gap-4">
        {onMenuToggle && (
          <button
            type="button"
            onClick={onMenuToggle}
            className="lg:hidden p-2 rounded-lg text-foreground/80 hover:bg-muted active:scale-95 transition-all"
            aria-label="Open navigation menu"
          >
            <Menu className="h-5 w-5" />
          </button>
        )}

        {/* Brand for mobile */}
        <div className="flex items-center gap-2 lg:hidden">
          <div className="h-7 w-7 rounded-md bg-teal-600/10 border border-teal-600/30 flex items-center justify-center text-teal-600">
            <Glasses className="h-4 w-4" />
          </div>
          <span className="font-bold text-base tracking-tight text-foreground">
            LensArt
          </span>
        </div>

        {/* Operational badge (hidden on small phones) */}
        <div className="hidden sm:flex items-center gap-2 text-xs bg-muted/60 px-3 py-1.5 rounded-full border border-border">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="font-medium text-foreground">Operational</span>
          <span className="text-muted-foreground">|</span>
          <span className="text-muted-foreground">Ranchi (IST)</span>
        </div>
      </div>

      {/* Right: Quick Action Shortcuts & User Profile */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Quick Bill / Invoice button */}
        <Link href="/billing/new">
          <Button
            size="sm"
            className="h-8 sm:h-9 bg-teal-700 hover:bg-teal-800 text-white gap-1 sm:gap-1.5 font-medium shadow-sm px-2.5 sm:px-3 text-xs sm:text-sm active:scale-95 transition-all"
          >
            <Plus className="h-3.5 w-3.5" />
            <span className="hidden xs:inline">Quick Bill</span>
            <span className="xs:hidden">Bill</span>
          </Button>
        </Link>

        {/* Quick Add Patient */}
        <Link href="/patients/new" className="hidden sm:inline-block">
          <Button size="sm" variant="outline" className="h-8 sm:h-9 gap-1.5 text-xs">
            + Patient
          </Button>
        </Link>

        {/* Quick New Order */}
        <Link href="/orders/new" className="hidden md:inline-block">
          <Button size="sm" variant="outline" className="h-8 sm:h-9 gap-1.5 text-xs">
            + Order
          </Button>
        </Link>

        <div className="h-4 w-px bg-border mx-0.5 sm:mx-1 hidden sm:block" />

        {/* User avatar */}
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-full bg-slate-800 text-teal-300 flex items-center justify-center font-bold text-xs border border-slate-700 shrink-0">
            LA
          </div>
          <div className="text-left hidden sm:block">
            <p className="text-xs font-semibold leading-tight">LensArt</p>
            <p className="text-[10px] text-muted-foreground">Ranchi Store</p>
          </div>
        </div>
      </div>
    </header>
  );
}
