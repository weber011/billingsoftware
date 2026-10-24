import { AppShell } from "@/components/layout/app-shell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { readCollection, Product, initializeStoreIfEmpty } from "@/lib/store";
import { formatCurrency } from "@/lib/utils";
import Link from "next/link";

export const revalidate = 0;

export default async function InventoryValuationPage() {
  initializeStoreIfEmpty();
  const products = readCollection<Product>("products", []);

  let totalUnits = 0;
  let totalCostValuation = 0;
  let totalRetailValuation = 0;

  for (const p of products) {
    if (p.trackInventory) {
      totalUnits += p.currentStock;
      totalCostValuation += p.currentStock * p.purchaseCost;
      totalRetailValuation += p.currentStock * p.sellingPrice;
    }
  }

  const potentialGrossMargin = totalRetailValuation - totalCostValuation;

  return (
    <AppShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Inventory Valuation & Stock Report
          </h1>
          <p className="text-sm text-slate-500">
            Current asset valuation computed at purchase cost and retail selling price
          </p>
        </div>

        {/* Valuation KPI Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <Card className="p-4 shadow-sm border-l-4 border-l-slate-800">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Total Units on Hand
            </span>
            <p className="text-2xl font-bold font-mono text-slate-900 mt-1">{totalUnits} pcs</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Across {products.length} catalog items</p>
          </Card>

          <Card className="p-4 shadow-sm border-l-4 border-l-blue-600">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Cost Valuation (Asset Value)
            </span>
            <p className="text-2xl font-bold font-mono text-blue-700 mt-1">
              {formatCurrency(totalCostValuation)}
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">Inventory held at purchase cost</p>
          </Card>

          <Card className="p-4 shadow-sm border-l-4 border-l-teal-600">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Retail Valuation (Realizable)
            </span>
            <p className="text-2xl font-bold font-mono text-teal-800 mt-1">
              {formatCurrency(totalRetailValuation)}
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">At current catalogue selling price</p>
          </Card>

          <Card className="p-4 shadow-sm border-l-4 border-l-emerald-600">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Potential Gross Margin
            </span>
            <p className="text-2xl font-bold font-mono text-emerald-700 mt-1">
              {formatCurrency(potentialGrossMargin)}
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">Unrealized retail profit</p>
          </Card>
        </div>

        <Card className="shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">Stock Valuation by Item</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>SKU</TableHead>
                  <TableHead>Product Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Unit Cost</TableHead>
                  <TableHead className="text-right">Selling Price</TableHead>
                  <TableHead className="text-center">Stock Qty</TableHead>
                  <TableHead className="text-right">Cost Value</TableHead>
                  <TableHead className="text-right">Retail Value</TableHead>
                </TableRow>
              </TableHeader>
              <tbody className="divide-y text-xs">
                {products.map((p) => {
                  const costVal = p.currentStock * p.purchaseCost;
                  const retailVal = p.currentStock * p.sellingPrice;
                  const isLow = p.trackInventory && p.currentStock <= p.reorderThreshold;

                  return (
                    <tr key={p.id} className="hover:bg-slate-50">
                      <td className="p-3 font-mono font-semibold text-teal-800">{p.sku}</td>
                      <td className="p-3 font-medium text-slate-900">{p.name}</td>
                      <td className="p-3">
                        <Badge variant="outline" className="text-[10px]">
                          {p.category}
                        </Badge>
                      </td>
                      <td className="p-3 text-right font-mono">{formatCurrency(p.purchaseCost)}</td>
                      <td className="p-3 text-right font-mono">{formatCurrency(p.sellingPrice)}</td>
                      <td className="p-3 text-center font-mono font-bold">
                        <span className={isLow ? "text-rose-600" : "text-slate-800"}>
                          {p.currentStock}
                        </span>
                      </td>
                      <td className="p-3 text-right font-mono font-semibold text-slate-700">
                        {formatCurrency(costVal)}
                      </td>
                      <td className="p-3 text-right font-mono font-bold text-slate-900">
                        {formatCurrency(retailVal)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
