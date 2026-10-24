"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { createAndFinalizeInvoice } from "@/actions/billing";
import { getPatients } from "@/actions/patients";
import { getProducts } from "@/actions/inventory";
import { getOrderById } from "@/actions/orders";
import { getBusinessSettings } from "@/actions/settings";
import { calculateGSTInvoice, LineItemInput } from "@/lib/gst";
import { Customer, Product, BusinessSettings } from "@/lib/store";
import { formatCurrency } from "@/lib/utils";
import { toast } from "sonner";
import Link from "next/link";
import { ArrowLeft, Receipt, Plus, Trash2, CheckCircle2, AlertTriangle, ShieldCheck } from "lucide-react";

function NewInvoiceContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const customerIdParam = searchParams.get("customerId");
  const orderIdParam = searchParams.get("orderId");

  const [patients, setPatients] = useState<Customer[]>([]);
  const [catalogProducts, setCatalogProducts] = useState<Product[]>([]);
  const [businessSettings, setBusinessSettings] = useState<BusinessSettings | null>(null);

  const [selectedCustomerId, setSelectedCustomerId] = useState(customerIdParam || "");
  const [orderId, setOrderId] = useState(orderIdParam || "");
  const [placeOfSupplyCode, setPlaceOfSupplyCode] = useState("27"); // Maharashtra default
  const [isTaxInclusive, setIsTaxInclusive] = useState(false);
  const [invoiceDiscountAmount, setInvoiceDiscountAmount] = useState<number>(0);
  const [paymentAmount, setPaymentAmount] = useState<string>("");
  const [paymentMethod, setPaymentMethod] = useState<"CASH" | "UPI" | "CARD" | "BANK_TRANSFER">("UPI");
  const [transactionRef, setTransactionRef] = useState("");
  const [invoiceNotes, setInvoiceNotes] = useState("");
  const [loading, setLoading] = useState(false);

  // Line items
  const [items, setItems] = useState<
    Array<{
      productId?: string;
      description: string;
      hsnCode: string;
      quantity: number;
      unitPrice: number;
      discountAmount: number;
      gstRate: number;
      isVerifiedRate: boolean;
    }>
  >([
    {
      description: "LensArt AirTitanium Minimalist",
      hsnCode: "9003",
      quantity: 1,
      unitPrice: 3499,
      discountAmount: 0,
      gstRate: 12,
      isVerifiedRate: false,
    },
    {
      description: "ClarityPro 1.56 BlueCut Anti-Glare Lens (Pair)",
      hsnCode: "9001",
      quantity: 1,
      unitPrice: 1800,
      discountAmount: 0,
      gstRate: 12,
      isVerifiedRate: false,
    },
  ]);

  useEffect(() => {
    getPatients().then((list) => {
      setPatients(list);
      if (!selectedCustomerId && list.length > 0) {
        setSelectedCustomerId(list[0].id);
      }
    });
    getProducts().then(setCatalogProducts);
    getBusinessSettings().then((s) => {
      setBusinessSettings(s);
      if (s?.stateCode) {
        setPlaceOfSupplyCode(s.stateCode);
      }
    });

    if (orderIdParam) {
      getOrderById(orderIdParam).then((ord) => {
        if (ord && ord.items.length > 0) {
          const mappedItems = ord.items.map((oi) => ({
            productId: oi.productId,
            description: oi.description,
            hsnCode: oi.itemType === "FRAME" ? "9003" : oi.itemType === "LENS" ? "9001" : "3307",
            quantity: oi.quantity,
            unitPrice: oi.unitPrice,
            discountAmount: oi.discount || 0,
            gstRate: oi.itemType === "ACCESSORY" ? 18 : 12,
            isVerifiedRate: false,
          }));
          setItems(mappedItems);
          if (ord.advancePaid > 0) {
            setPaymentAmount(ord.advancePaid.toString());
          }
        }
      });
    }
  }, []);

  const handleSelectProduct = (index: number, productId: string) => {
    const prod = catalogProducts.find((p) => p.id === productId);
    if (!prod) return;

    setItems((prev) => {
      const copy = [...prev];
      copy[index] = {
        productId: prod.id,
        description: prod.name,
        hsnCode: prod.hsnCode || "9003",
        quantity: 1,
        unitPrice: prod.sellingPrice,
        discountAmount: 0,
        gstRate: prod.gstRate || 12,
        isVerifiedRate: prod.isVerifiedRate,
      };
      return copy;
    });
  };

  const addItem = () => {
    setItems((prev) => [
      ...prev,
      {
        description: "New Item",
        hsnCode: "9003",
        quantity: 1,
        unitPrice: 0,
        discountAmount: 0,
        gstRate: 12,
        isVerifiedRate: false,
      },
    ]);
  };

  const removeItem = (index: number) => {
    if (items.length <= 1) {
      toast.error("Invoice must have at least one line item");
      return;
    }
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  // Live GST Calculation computation
  const supplierStateCode = businessSettings?.stateCode || "27";
  const calcInput: LineItemInput[] = items.map((it) => ({
    description: it.description,
    hsnCode: it.hsnCode,
    quantity: Number(it.quantity) || 1,
    unitPrice: Number(it.unitPrice) || 0,
    discountAmount: Number(it.discountAmount) || 0,
    gstRate: Number(it.gstRate) || 0,
    isVerifiedRate: it.isVerifiedRate,
  }));

  const calcResult = calculateGSTInvoice(calcInput, {
    isTaxInclusive,
    supplierStateCode,
    placeOfSupplyCode,
    isSupplierGstRegistered: businessSettings?.isGstRegistered ?? true,
    invoiceDiscountAmount,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomerId) {
      toast.error("Please select a customer for the bill");
      return;
    }

    setLoading(true);
    try {
      const payNum = Number(paymentAmount) || 0;

      const res = await createAndFinalizeInvoice({
        customerId: selectedCustomerId,
        orderId: orderId || undefined,
        isTaxInclusive,
        placeOfSupplyCode,
        invoiceDiscountAmount,
        notes: invoiceNotes || undefined,
        items,
        payment:
          payNum > 0
            ? {
                amount: payNum,
                paymentMethod,
                transactionRef: transactionRef || undefined,
              }
            : undefined,
      });

      if (res.success && res.invoice) {
        toast.success(`GST Invoice ${res.invoice.invoiceNumber} finalized!`);
        router.push(`/billing/${res.invoice.id}`);
      } else {
        toast.error(res.error || "Failed to finalize invoice");
      }
    } catch (err: any) {
      toast.error(err.message || "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppShell>
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <Link href="/billing">
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Create GST Tax Invoice
            </h1>
            <p className="text-xs text-slate-500">
              Professional retail tax invoice with live CGST/SGST/IGST calculation & stock deduction
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Customer & Supply Location */}
          <Card className="shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">1. Customer & Place of Supply</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5 sm:col-span-1">
                <Label htmlFor="cust">
                  Select Customer <span className="text-rose-500">*</span>
                </Label>
                <select
                  id="cust"
                  className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
                  value={selectedCustomerId}
                  onChange={(e) => setSelectedCustomerId(e.target.value)}
                  required
                >
                  <option value="">-- Choose Patient / Customer --</option>
                  {patients.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.customerCode}) - {p.phone}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="pos">Place of Supply (State Code)</Label>
                <select
                  id="pos"
                  className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm font-mono"
                  value={placeOfSupplyCode}
                  onChange={(e) => setPlaceOfSupplyCode(e.target.value)}
                >
                  <option value="27">27 - Maharashtra (Intra-state CGST + SGST)</option>
                  <option value="29">29 - Karnataka (Inter-state IGST)</option>
                  <option value="07">07 - Delhi (Inter-state IGST)</option>
                  <option value="24">24 - Gujarat (Inter-state IGST)</option>
                  <option value="33">33 - Tamil Nadu (Inter-state IGST)</option>
                  <option value="36">36 - Telangana (Inter-state IGST)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <Label>Tax Treatment</Label>
                <div className="flex items-center gap-2 pt-1.5">
                  <Badge variant={calcResult.isInterState ? "info" : "success"} className="text-xs">
                    {calcResult.isInterState ? "Inter-state (IGST)" : "Intra-state (CGST + SGST)"}
                  </Badge>
                  <label className="text-xs flex items-center gap-1.5 cursor-pointer ml-auto">
                    <input
                      type="checkbox"
                      checked={isTaxInclusive}
                      onChange={(e) => setIsTaxInclusive(e.target.checked)}
                      className="rounded border-slate-300"
                    />
                    <span>Tax Inclusive Prices</span>
                  </label>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Line Items Table */}
          <Card className="shadow-sm">
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-semibold">2. Invoice Line Items</CardTitle>
                <CardDescription className="text-xs">
                  Items deducted from inventory upon finalization
                </CardDescription>
              </div>
              <Button type="button" size="sm" variant="outline" onClick={addItem} className="text-xs gap-1">
                <Plus className="h-3.5 w-3.5" /> Add Line
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                {items.map((it, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-lg border bg-slate-50/50 flex flex-col md:flex-row items-start md:items-center gap-2 text-xs"
                  >
                    <div className="flex-1 space-y-1 w-full">
                      <Input
                        placeholder="Item Description"
                        value={it.description}
                        onChange={(e) => {
                          const val = e.target.value;
                          setItems((prev) => {
                            const c = [...prev];
                            c[idx].description = val;
                            return c;
                          });
                        }}
                      />
                      <select
                        className="w-full h-7 rounded border border-input bg-white px-2 text-[11px]"
                        onChange={(e) => handleSelectProduct(idx, e.target.value)}
                        value={it.productId || ""}
                      >
                        <option value="">-- Or Select from Stock Catalog --</option>
                        {catalogProducts.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name} ({p.sku}) - ₹{p.sellingPrice} (Stock: {p.currentStock})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="w-20">
                      <Label className="text-[10px] text-slate-400">HSN Code</Label>
                      <Input
                        value={it.hsnCode}
                        onChange={(e) => {
                          const val = e.target.value;
                          setItems((prev) => {
                            const c = [...prev];
                            c[idx].hsnCode = val;
                            return c;
                          });
                        }}
                      />
                    </div>

                    <div className="w-16">
                      <Label className="text-[10px] text-slate-400">Qty</Label>
                      <Input
                        type="number"
                        min="1"
                        value={it.quantity}
                        onChange={(e) => {
                          const val = Number(e.target.value) || 1;
                          setItems((prev) => {
                            const c = [...prev];
                            c[idx].quantity = val;
                            return c;
                          });
                        }}
                      />
                    </div>

                    <div className="w-24">
                      <Label className="text-[10px] text-slate-400">Unit Price (₹)</Label>
                      <Input
                        type="number"
                        value={it.unitPrice}
                        onChange={(e) => {
                          const val = Number(e.target.value) || 0;
                          setItems((prev) => {
                            const c = [...prev];
                            c[idx].unitPrice = val;
                            return c;
                          });
                        }}
                      />
                    </div>

                    <div className="w-20">
                      <Label className="text-[10px] text-slate-400">Disc (₹)</Label>
                      <Input
                        type="number"
                        value={it.discountAmount}
                        onChange={(e) => {
                          const val = Number(e.target.value) || 0;
                          setItems((prev) => {
                            const c = [...prev];
                            c[idx].discountAmount = val;
                            return c;
                          });
                        }}
                      />
                    </div>

                    <div className="w-20">
                      <Label className="text-[10px] text-slate-400">GST %</Label>
                      <select
                        className="w-full h-9 rounded border border-input bg-white px-1 text-xs font-mono"
                        value={it.gstRate}
                        onChange={(e) => {
                          const val = Number(e.target.value) || 0;
                          setItems((prev) => {
                            const c = [...prev];
                            c[idx].gstRate = val;
                            return c;
                          });
                        }}
                      >
                        <option value="0">0%</option>
                        <option value="5">5%</option>
                        <option value="12">12%</option>
                        <option value="18">18%</option>
                        <option value="28">28%</option>
                      </select>
                    </div>

                    <div className="w-24 text-right pt-3 font-mono font-bold text-slate-900">
                      {formatCurrency(calcResult.items[idx]?.totalAmount || 0)}
                    </div>

                    <button
                      type="button"
                      onClick={() => removeItem(idx)}
                      className="text-slate-400 hover:text-rose-600 pt-3"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Tax & Discount Breakdown */}
              <div className="flex flex-col sm:flex-row justify-between items-start pt-4 border-t gap-6">
                <div className="space-y-2 text-xs flex-1 max-w-sm">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="invDisc" className="text-xs whitespace-nowrap">
                      Global Invoice Discount (₹):
                    </Label>
                    <Input
                      id="invDisc"
                      type="number"
                      placeholder="0"
                      className="h-8 font-mono"
                      value={invoiceDiscountAmount || ""}
                      onChange={(e) => setInvoiceDiscountAmount(Number(e.target.value) || 0)}
                    />
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Proportionally allocated across line items to preserve lawful GST calculation
                  </p>

                  {calcResult.warnings.length > 0 && (
                    <div className="p-2.5 bg-amber-50 rounded text-amber-800 text-[11px] border border-amber-200">
                      {calcResult.warnings.map((w, i) => (
                        <p key={i} className="flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3 shrink-0" /> {w}
                        </p>
                      ))}
                    </div>
                  )}
                </div>

                {/* Totals Summary */}
                <div className="w-72 space-y-2 text-xs">
                  <div className="flex justify-between text-slate-600">
                    <span>Subtotal (Gross):</span>
                    <span className="font-mono">{formatCurrency(calcResult.subtotal)}</span>
                  </div>
                  {calcResult.totalDiscount > 0 && (
                    <div className="flex justify-between text-rose-600">
                      <span>Total Discounts:</span>
                      <span className="font-mono">-{formatCurrency(calcResult.totalDiscount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-slate-700">
                    <span>Taxable Value:</span>
                    <span className="font-mono font-medium">{formatCurrency(calcResult.taxableAmount)}</span>
                  </div>

                  {!calcResult.isInterState ? (
                    <>
                      <div className="flex justify-between text-slate-600">
                        <span>CGST Total:</span>
                        <span className="font-mono">{formatCurrency(calcResult.cgstTotal)}</span>
                      </div>
                      <div className="flex justify-between text-slate-600">
                        <span>SGST Total:</span>
                        <span className="font-mono">{formatCurrency(calcResult.sgstTotal)}</span>
                      </div>
                    </>
                  ) : (
                    <div className="flex justify-between text-slate-600">
                      <span>IGST Total:</span>
                      <span className="font-mono">{formatCurrency(calcResult.igstTotal)}</span>
                    </div>
                  )}

                  {calcResult.roundOff !== 0 && (
                    <div className="flex justify-between text-slate-500 text-[11px]">
                      <span>Round Off:</span>
                      <span className="font-mono">
                        {calcResult.roundOff > 0 ? `+${calcResult.roundOff}` : calcResult.roundOff}
                      </span>
                    </div>
                  )}

                  <div className="flex justify-between text-base font-bold text-slate-900 pt-2 border-t">
                    <span>Final Amount Payable:</span>
                    <span className="font-mono text-teal-800">
                      {formatCurrency(calcResult.finalPayable)}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Payment & Finalization */}
          <Card className="shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">3. Payment Collection</CardTitle>
              <CardDescription className="text-xs">
                Record initial settlement or leave balance due on invoice
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="payAmt">Payment Amount Collected (₹)</Label>
                  <Input
                    id="payAmt"
                    type="number"
                    placeholder={calcResult.finalPayable.toString()}
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                  />
                  <div className="flex gap-1.5 pt-1">
                    <button
                      type="button"
                      onClick={() => setPaymentAmount(calcResult.finalPayable.toString())}
                      className="text-[10px] text-teal-700 hover:underline font-semibold"
                    >
                      [Pay Full]
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentAmount(Math.round(calcResult.finalPayable / 2).toString())}
                      className="text-[10px] text-teal-700 hover:underline font-semibold"
                    >
                      [Pay 50%]
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentAmount("0")}
                      className="text-[10px] text-slate-500 hover:underline"
                    >
                      [Pay Later]
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="payMethod">Payment Method</Label>
                  <select
                    id="payMethod"
                    className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
                    value={paymentMethod}
                    onChange={(e: any) => setPaymentMethod(e.target.value)}
                  >
                    <option value="UPI">UPI (GPay / PhonePe / QR)</option>
                    <option value="CASH">Cash</option>
                    <option value="CARD">Credit / Debit Card</option>
                    <option value="BANK_TRANSFER">Bank IMPS / NEFT</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="txnRef">Transaction Reference / UTR</Label>
                  <Input
                    id="txnRef"
                    placeholder="e.g. UPI Ref / Auth Code"
                    value={transactionRef}
                    onChange={(e) => setTransactionRef(e.target.value)}
                  />
                </div>
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t">
                <Link href="/billing">
                  <Button type="button" variant="outline">
                    Cancel
                  </Button>
                </Link>
                <Button
                  type="submit"
                  disabled={loading}
                  className="bg-teal-700 hover:bg-teal-800 text-white font-medium shadow-sm gap-2"
                >
                  <Receipt className="h-4 w-4" />
                  {loading ? "Finalizing Tax Invoice..." : "Finalize & Issue GST Invoice"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </form>
      </div>
    </AppShell>
  );
}

export default function NewInvoicePage() {
  return (
    <Suspense fallback={<div className="p-12 text-center text-xs text-slate-400">Loading invoice form...</div>}>
      <NewInvoiceContent />
    </Suspense>
  );
}
