import { getProducts } from "@/actions/inventory";
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency, formatDate } from "@/lib/utils";
import Link from "next/link";
import { Package, Plus, AlertTriangle, ArrowUpDown, Filter, History } from "lucide-react";

export const revalidate = 0;

export default async function InventoryPage({
  searchParams,
}: {
  searchParams: { category?: string; lowStock?: string; search?: string };
}) {
  const category = searchParams?.category || "ALL";
  const lowStockOnly = searchParams?.lowStock === "true";
  const searchQuery = searchParams?.search || "";

  const products = await getProducts({
    category,
    lowStockOnly,
    searchQuery,
  });

  const categories = [
    { label: "All Items", val: "ALL" },
    { label: "Frames", val: "FRAME" },
    { label: "Lenses", val: "LENS" },
    { label: "Sunglasses", val: "SUNGLASSES" },
    { label: "Accessories", val: "ACCESSORY" },
  ];

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Optical Inventory & Stock Ledger
            </h1>
            <p className="text-sm text-slate-500">
              Frames, ophthalmic lenses, sunglasses, accessories & live inventory tracking
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/inventory/movements">
              <Button variant="outline" className="gap-1.5 text-xs">
                <History className="h-4 w-4" /> Stock Movements
              </Button>
            </Link>
            <Link href="/inventory/new">
              <Button className="bg-teal-700 hover:bg-teal-800 text-white gap-2 font-medium shadow-sm">
                <Plus className="h-4 w-4" /> Add Product
              </Button>
            </Link>
          </div>
        </div>

        {/* Filters Bar */}
        <div className="flex flex-wrap items-center gap-2">
          {categories.map((c) => (
            <Link
              key={c.val}
              href={`/inventory?category=${c.val}${lowStockOnly ? "&lowStock=true" : ""}`}
            >
              <Button
                variant={category === c.val ? "default" : "outline"}
                size="sm"
                className={category === c.val ? "bg-slate-900 text-white" : "text-xs"}
              >
                {c.label}
              </Button>
            </Link>
          ))}
          <Link href={`/inventory?category=${category}&lowStock=${!lowStockOnly}`}>
            <Button
              variant={lowStockOnly ? "destructive" : "outline"}
              size="sm"
              className="text-xs gap-1.5 ml-auto"
            >
              <AlertTriangle className="h-3.5 w-3.5" />
              {lowStockOnly ? "Showing Low Stock" : "Filter Low Stock"}
            </Button>
          </Link>
        </div>

        {/* Products Table */}
        <Card className="shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">
              Product Catalog ({products.length})
            </CardTitle>
            <CardDescription className="text-xs">
              Every item is tracked with SKU, HSN, verified/unverified GST slab, and reorder alerts
            </CardDescription>
          </CardHeader>
          <CardContent>
            {products.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-xs">
                No products found matching the selected filter.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>SKU</TableHead>
                    <TableHead>Product Name / Brand</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>HSN Code</TableHead>
                    <TableHead>GST Rate</TableHead>
                    <TableHead>Purchase Cost</TableHead>
                    <TableHead>Selling Price</TableHead>
                    <TableHead>Stock Level</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products.map((p) => {
                    const isLowStock = p.trackInventory && p.currentStock <= p.reorderThreshold;

                    return (
                      <TableRow key={p.id} className="hover:bg-slate-50/80">
                        <TableCell className="font-mono text-xs font-semibold text-teal-800">
                          {p.sku}
                        </TableCell>
                        <TableCell>
                          <div className="font-medium text-slate-900 text-xs">{p.name}</div>
                          <div className="text-[11px] text-slate-400">
                            {p.brand} {p.model ? `• Model: ${p.model}` : ""}
                            {p.frameColor ? ` • Color: ${p.frameColor}` : ""}
                            {p.refractiveIndex ? ` • Index: ${p.refractiveIndex}` : ""}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-[10px]">
                            {p.category}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono text-xs text-slate-600">
                          {p.hsnCode}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <span className="font-mono text-xs font-semibold">{p.gstRate}%</span>
                            {!p.isVerifiedRate && (
                              <span
                                title="Unverified tax rate - requires review by GST professional"
                                className="cursor-help inline-block px-1 py-0.2 text-[9px] bg-amber-100 text-amber-800 rounded font-semibold"
                              >
                                Review
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-xs text-slate-500 font-mono">
                          {formatCurrency(p.purchaseCost)}
                        </TableCell>
                        <TableCell className="text-xs font-semibold text-slate-900 font-mono">
                          {formatCurrency(p.sellingPrice)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`font-bold font-mono text-xs ${
                                isLowStock ? "text-rose-600" : "text-emerald-700"
                              }`}
                            >
                              {p.currentStock} units
                            </span>
                            {isLowStock && (
                              <Badge variant="destructive" className="text-[9px] px-1 py-0">
                                Low
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <Link href={`/inventory/movements?productId=${p.id}`}>
                            <Button size="sm" variant="ghost" className="h-7 text-xs">
                              Movements
                            </Button>
                          </Link>
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
