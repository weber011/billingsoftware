"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Receipt,
  Users,
  Glasses,
  Package,
  Truck,
  IndianRupee,
  BarChart3,
  Settings,
  ChevronDown,
  Sparkles,
  FileText,
  AlertTriangle,
  History,
  ShieldCheck,
  X,
  MapPin,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";

interface NavItem {
  title: string;
  href: string;
  icon: any;
  subItems?: Array<{ title: string; href: string }>;
}

const navItems: NavItem[] = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "Billing",
    href: "/billing",
    icon: Receipt,
    subItems: [
      { title: "New Invoice", href: "/billing/new" },
      { title: "All Invoices", href: "/billing" },
      { title: "Credit Notes", href: "/billing/credit-notes" },
    ],
  },
  {
    title: "Patients",
    href: "/patients",
    icon: Users,
    subItems: [
      { title: "All Patients", href: "/patients" },
      { title: "Add Patient", href: "/patients/new" },
      { title: "Prescriptions", href: "/prescriptions" },
    ],
  },
  {
    title: "Optical Orders",
    href: "/orders",
    icon: Glasses,
    subItems: [
      { title: "All Orders", href: "/orders" },
      { title: "New Order", href: "/orders/new" },
      { title: "Ready for Collection", href: "/orders?status=READY_FOR_COLLECTION" },
    ],
  },
  {
    title: "Inventory",
    href: "/inventory",
    icon: Package,
    subItems: [
      { title: "All Products", href: "/inventory" },
      { title: "Frames", href: "/inventory?category=FRAME" },
      { title: "Lenses", href: "/inventory?category=LENS" },
      { title: "Sunglasses", href: "/inventory?category=SUNGLASSES" },
      { title: "Stock Movements", href: "/inventory/movements" },
      { title: "Low Stock Alert", href: "/inventory?lowStock=true" },
    ],
  },
  {
    title: "Suppliers",
    href: "/purchases/suppliers",
    icon: Truck,
  },
  {
    title: "Finance",
    href: "/finance/payments",
    icon: IndianRupee,
    subItems: [
      { title: "Payment Register", href: "/finance/payments" },
      { title: "Outstanding Balances", href: "/finance/outstanding" },
    ],
  },
  {
    title: "Reports & GST",
    href: "/reports/gst",
    icon: BarChart3,
    subItems: [
      { title: "GST Tax Report", href: "/reports/gst" },
      { title: "Sales Register", href: "/reports/sales" },
      { title: "Inventory Valuation", href: "/reports/inventory" },
    ],
  },
  {
    title: "Administration",
    href: "/settings",
    icon: Settings,
    subItems: [
      { title: "Business Profile", href: "/settings" },
      { title: "Tax & HSN Setup", href: "/settings/tax" },
      { title: "Audit Trail", href: "/settings/audit" },
    ],
  },
];

interface SidebarProps {
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

export function Sidebar({ mobileOpen = false, onMobileClose }: SidebarProps) {
  const pathname = usePathname();
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    Billing: true,
    Patients: true,
    "Optical Orders": true,
    Inventory: true,
    "Reports & GST": false,
  });

  const toggleGroup = (title: string) => {
    setOpenGroups((prev) => ({ ...prev, [title]: !prev[title] }));
  };

  const handleLinkClick = () => {
    if (onMobileClose) {
      onMobileClose();
    }
  };

  const navContent = (
    <>
      {/* Brand Header */}
      <div className="h-16 flex items-center justify-between px-5 border-b border-slate-800 shrink-0">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-400">
            <Glasses className="h-5 w-5" />
          </div>
          <div>
            <span className="font-bold text-lg text-white tracking-tight flex items-center gap-1.5">
              LensArt
              <span className="text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded bg-teal-500/20 text-teal-300 border border-teal-500/30">
                Retail
              </span>
            </span>
            <p className="text-[11px] text-slate-400">Optical & GST Billing</p>
          </div>
        </div>

        {/* Mobile close button */}
        {onMobileClose && (
          <button
            type="button"
            onClick={onMobileClose}
            className="lg:hidden p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1 text-sm overscroll-contain">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href || (item.subItems && item.subItems.some((s) => pathname === s.href));
          const isOpen = openGroups[item.title];

          return (
            <div key={item.title} className="space-y-0.5">
              {item.subItems ? (
                <div>
                  <button
                    type="button"
                    onClick={() => toggleGroup(item.title)}
                    className={cn(
                      "w-full flex items-center justify-between px-3 py-2.5 rounded-lg font-medium text-slate-300 hover:text-white hover:bg-slate-800/60 active:bg-slate-800 transition-colors",
                      isActive && "bg-slate-800 text-white font-semibold"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <item.icon className={cn("h-4 w-4 shrink-0", isActive ? "text-teal-400" : "text-slate-400")} />
                      <span>{item.title}</span>
                    </div>
                    <ChevronDown
                      className={cn(
                        "h-4 w-4 text-slate-400 transition-transform duration-200 shrink-0",
                        isOpen && "transform rotate-180"
                      )}
                    />
                  </button>

                  {isOpen && (
                    <div className="pl-9 pr-2 py-1 space-y-1">
                      {item.subItems.map((sub) => {
                        const isSubActive = pathname === sub.href;
                        return (
                          <Link
                            key={sub.title}
                            href={sub.href}
                            onClick={handleLinkClick}
                            className={cn(
                              "block px-3 py-2 rounded-md text-xs text-slate-400 hover:text-white hover:bg-slate-800/40 active:bg-slate-800 transition-colors",
                              isSubActive && "text-teal-300 bg-teal-950/40 font-medium border-l-2 border-teal-400 rounded-l-none"
                            )}
                          >
                            {sub.title}
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              ) : (
                <Link
                  href={item.href}
                  onClick={handleLinkClick}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium text-slate-300 hover:text-white hover:bg-slate-800/60 active:bg-slate-800 transition-colors",
                    isActive && "bg-slate-800 text-teal-300 font-semibold"
                  )}
                >
                  <item.icon className={cn("h-4 w-4 shrink-0", isActive ? "text-teal-400" : "text-slate-400")} />
                  <span>{item.title}</span>
                </Link>
              )}
            </div>
          );
        })}
      </nav>

      {/* Footer Info */}
      <div className="p-4 border-t border-slate-800 bg-slate-950/70 shrink-0">
        <div className="flex items-center gap-2.5 text-xs text-slate-400">
          <MapPin className="h-4 w-4 text-teal-400 shrink-0" />
          <div className="truncate">
            <p className="text-slate-200 font-medium truncate">Ranchi, Jharkhand (Code 20)</p>
            <p className="text-[10px] text-slate-500 font-mono">GST: 20AABCL1234F1Z8</p>
          </div>
        </div>
      </div>
    </>
  );

  return (
    <>
      {/* Desktop Sidebar (Permanent) */}
      <aside className="no-print hidden lg:flex w-64 bg-slate-900 text-slate-200 border-r border-slate-800 flex-col shrink-0 h-screen sticky top-0 z-30">
        {navContent}
      </aside>

      {/* Mobile Drawer (Slide-out) */}
      {mobileOpen && (
        <div className="no-print lg:hidden fixed inset-0 z-50 flex">
          {/* Backdrop overlay */}
          <div
            className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm transition-opacity"
            onClick={onMobileClose}
            aria-hidden="true"
          />

          {/* Drawer panel */}
          <div className="relative w-[280px] max-w-[85vw] bg-slate-900 text-slate-200 flex flex-col h-full shadow-2xl border-r border-slate-800 z-10 animate-in slide-in-from-left duration-200">
            {navContent}
          </div>
        </div>
      )}
    </>
  );
}
