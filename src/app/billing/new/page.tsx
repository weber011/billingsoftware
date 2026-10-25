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
import { getPatients, createPatient } from "@/actions/patients";
import { getProducts } from "@/actions/inventory";
import { getOrderById } from "@/actions/orders";
import { getBusinessSettings } from "@/actions/settings";
import { calculateGSTInvoice, LineItemInput, GST_STATE_LIST } from "@/lib/gst";
import { Customer, Product, BusinessSettings } from "@/lib/store";
import { formatCurrency } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import Link from "next/link";
import { ArrowLeft, Receipt, Plus, Trash2, CheckCircle2, AlertTriangle, ShieldCheck, UserPlus } from "lucide-react";

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
  const [placeOfSupplyCode, setPlaceOfSupplyCode] = useState("20"); // Jharkhand default (Ranchi)
  const [isManualPos, setIsManualPos] = useState(false);
  const [manualPosInput, setManualPosInput] = useState("20");

  // Quick Add Patient Modal state
  const [newPatientOpen, setNewPatientOpen] = useState(false);
  const [newPatientLoading, setNewPatientLoading] = useState(false);
  const [newPatientForm, setNewPatientForm] = useState({
    name: "",
    phone: "",
    email: "",
    address: "",
    city: "Ranchi",
    state: "Jharkhand",
    pinCode: "834001",
    gstin: "",
    notes: "",
  });

  const handleCreateNewPatient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPatientForm.name.trim()) {
      toast.error("Patient name is required");
      return;
    }
    if (!newPatientForm.phone.trim()) {
      toast.error("Phone number is required");
      return;
    }

    setNewPatientLoading(true);
    try {
      const res = await createPatient({
        name: newPatientForm.name.trim(),
        phone: newPatientForm.phone.trim(),
        email: newPatientForm.email?.trim() || undefined,
        address: newPatientForm.address?.trim() || undefined,
        city: newPatientForm.city?.trim() || "Ranchi",
        state: newPatientForm.state?.trim() || "Jharkhand",
        pinCode: newPatientForm.pinCode?.trim() || undefined,
        gstin: newPatientForm.gstin?.trim() || undefined,
        notes: newPatientForm.notes?.trim() || undefined,
      });

      if (res.success && res.patient) {
        toast.success(`Patient ${res.patient.name} (${res.patient.customerCode}) registered & saved to database!`);
        setPatients((prev) => [res.patient as any, ...prev]);
        setSelectedCustomerId(res.patient.id);
        setNewPatientForm({
          name: "",
          phone: "",
          email: "",
          address: "",
          city: "Ranchi",
          state: "Jharkhand",
          pinCode: "834001",
          gstin: "",
          notes: "",
        });
        setNewPatientOpen(false);
      } else {
        toast.error(res.error || "Failed to create patient");
      }
    } catch (err: any) {
      toast.error(err.message || "An error occurred creating patient");
    } finally {
      setNewPatientLoading(false);
    }
  };

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
            productId: oi.productId || undefined,
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
  const supplierStateCode = businessSettings?.stateCode || "20";
  const selectedPatient = patients.find((p) => p.id === selectedCustomerId);
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
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-semibold">1. Customer & Place of Supply</CardTitle>
                <CardDescription className="text-xs">
                  Select registered patient or quickly register a new patient directly into database
                </CardDescription>
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setNewPatientOpen(true)}
                className="text-xs gap-1.5 text-teal-800 border-teal-300 hover:bg-teal-50 shadow-sm"
              >
                <UserPlus className="h-3.5 w-3.5" /> + Add New Patient
              </Button>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5 sm:col-span-1">
                <div className="flex items-center justify-between">
                  <Label htmlFor="cust">
                    Select Customer <span className="text-rose-500">*</span>
                  </Label>
                  <button
                    type="button"
                    onClick={() => setNewPatientOpen(true)}
                    className="text-[11px] text-teal-700 hover:underline font-medium flex items-center gap-0.5"
                  >
                    <UserPlus className="h-3 w-3" /> Add New
                  </button>
                </div>
                <select
                  id="cust"
                  className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
                  value={selectedCustomerId}
                  onChange={(e) => {
                    const id = e.target.value;
                    setSelectedCustomerId(id);
                    const p = patients.find((item) => item.id === id);
                    if (p?.gstin && p.gstin.length >= 2 && /^\d{2}/.test(p.gstin)) {
                      const code = p.gstin.substring(0, 2);
                      setPlaceOfSupplyCode(code);
                      setManualPosInput(code);
                    }
                  }}
                  required
                >
                  <option value="">-- Choose Patient / Customer --</option>
                  {patients.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.customerCode}) - {p.phone || "No Phone"}
                    </option>
                  ))}
                </select>
                {selectedPatient && (
                  <div className="text-[11px] text-slate-500 pt-0.5 flex flex-wrap gap-2">
                    <span>📍 {selectedPatient.city || "Ranchi"}, {selectedPatient.state || "Jharkhand"}</span>
                    {selectedPatient.gstin && (
                      <span className="font-mono text-teal-800 font-medium bg-teal-50 px-1 rounded">
                        GST: {selectedPatient.gstin}
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Place of Supply (Dropdown or Manual Input) */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="pos">Place of Supply (State Code)</Label>
                  <button
                    type="button"
                    onClick={() => {
                      const next = !isManualPos;
                      setIsManualPos(next);
                      if (next) setManualPosInput(placeOfSupplyCode);
                    }}
                    className="text-[11px] text-teal-700 hover:underline font-medium"
                  >
                    {isManualPos ? "Switch to List" : "✏️ Add Manually"}
                  </button>
                </div>

                {isManualPos ? (
                  <div className="space-y-1">
                    <Input
                      id="pos-manual"
                      placeholder="Type State Code (e.g. 20, 10, 27)"
                      value={manualPosInput}
                      onChange={(e) => {
                        const val = e.target.value.trim().toUpperCase();
                        setManualPosInput(e.target.value);
                        setPlaceOfSupplyCode(val);
                      }}
                      className="font-mono text-sm h-9"
                      maxLength={30}
                    />
                    <div className="flex items-center justify-between text-[10px] text-slate-500">
                      <span>Enter 2-digit GST state code or name</span>
                      <button
                        type="button"
                        onClick={() => {
                          setPlaceOfSupplyCode("20");
                          setManualPosInput("20");
                        }}
                        className="text-teal-700 hover:underline font-medium"
                      >
                        Reset to 20 (Jharkhand)
                      </button>
                    </div>
                  </div>
                ) : (
                  <select
                    id="pos"
                    className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm font-mono"
                    value={placeOfSupplyCode}
                    onChange={(e) => {
                      setPlaceOfSupplyCode(e.target.value);
                      setManualPosInput(e.target.value);
                    }}
                  >
                    {GST_STATE_LIST.map((st) => (
                      <option key={st.code} value={st.code}>
                        {st.code} - {st.name} {st.code === supplierStateCode ? "(Intra-state CGST + SGST)" : "(Inter-state IGST)"}
                      </option>
                    ))}
                  </select>
                )}
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
                    className="p-3.5 rounded-lg border bg-slate-50/70 space-y-2.5 text-xs transition-shadow hover:shadow-sm"
                  >
                    {/* Item Description & Catalog Select */}
                    <div className="space-y-1.5 w-full">
                      <div className="flex items-center justify-between">
                        <Label className="text-[11px] font-semibold text-slate-700">Item #{idx + 1}</Label>
                        <button
                          type="button"
                          onClick={() => removeItem(idx)}
                          className="md:hidden text-rose-600 hover:text-rose-700 font-medium flex items-center gap-1 text-[11px] py-0.5 px-1.5 rounded active:bg-rose-50"
                        >
                          <Trash2 className="h-3.5 w-3.5" /> Remove
                        </button>
                      </div>
                      <Input
                        placeholder="Item Description (e.g. Ray-Ban Aviator, Crizal Lens)"
                        value={it.description}
                        className="bg-white text-xs h-9"
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
                        className="w-full h-8 rounded border border-input bg-white px-2 text-[11px] text-slate-600 truncate"
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

                    {/* Numeric Input Controls: Responsive Grid on Mobile, Flex on Desktop */}
                    <div className="grid grid-cols-2 sm:grid-cols-5 md:flex md:items-end gap-2 pt-1 border-t border-slate-200/60">
                      <div className="w-full md:w-20">
                        <Label className="text-[10px] text-slate-500 font-medium">HSN Code</Label>
                        <Input
                          value={it.hsnCode}
                          className="bg-white h-8 text-xs font-mono"
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

                      <div className="w-full md:w-16">
                        <Label className="text-[10px] text-slate-500 font-medium">Qty</Label>
                        <Input
                          type="number"
                          min="1"
                          value={it.quantity}
                          className="bg-white h-8 text-xs"
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

                      <div className="w-full md:w-24">
                        <Label className="text-[10px] text-slate-500 font-medium">Unit Price (₹)</Label>
                        <Input
                          type="number"
                          value={it.unitPrice}
                          className="bg-white h-8 text-xs font-mono"
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

                      <div className="w-full md:w-20">
                        <Label className="text-[10px] text-slate-500 font-medium">Disc (₹)</Label>
                        <Input
                          type="number"
                          value={it.discountAmount}
                          className="bg-white h-8 text-xs font-mono"
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

                      <div className="w-full md:w-20">
                        <Label className="text-[10px] text-slate-500 font-medium">GST Rate</Label>
                        <select
                          className="w-full h-8 rounded border border-input bg-white px-1 text-xs font-mono"
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

                      {/* Row Total & Delete on Desktop */}
                      <div className="col-span-2 sm:col-span-5 md:flex-1 flex items-center justify-between md:justify-end gap-3 pt-1 md:pt-0">
                        <div className="text-right">
                          <span className="text-[10px] text-slate-400 block md:hidden">Line Total</span>
                          <span className="font-mono font-bold text-slate-900 text-sm">
                            {formatCurrency(calcResult.items[idx]?.totalAmount || 0)}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeItem(idx)}
                          className="hidden md:inline-flex p-1.5 text-slate-400 hover:text-rose-600 rounded hover:bg-rose-50 transition-colors"
                          title="Delete Item"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
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

        {/* Quick Add Patient Modal */}
        <Dialog open={newPatientOpen} onOpenChange={setNewPatientOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-slate-900">
                <UserPlus className="h-5 w-5 text-teal-700" /> Add New Patient
              </DialogTitle>
              <DialogDescription>
                Register a new patient directly into your database. They will be saved and immediately selected for this invoice.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleCreateNewPatient} className="space-y-4 pt-2">
              <div className="space-y-1.5">
                <Label htmlFor="new-name">
                  Full Name <span className="text-rose-500">*</span>
                </Label>
                <Input
                  id="new-name"
                  placeholder="e.g. Ramesh Kumar"
                  value={newPatientForm.name}
                  onChange={(e) => setNewPatientForm({ ...newPatientForm, name: e.target.value })}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="new-phone">
                    Phone Number <span className="text-rose-500">*</span>
                  </Label>
                  <Input
                    id="new-phone"
                    placeholder="+91 98350 12345"
                    value={newPatientForm.phone}
                    onChange={(e) => setNewPatientForm({ ...newPatientForm, phone: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="new-email">Email (Optional)</Label>
                  <Input
                    id="new-email"
                    type="email"
                    placeholder="patient@gmail.com"
                    value={newPatientForm.email}
                    onChange={(e) => setNewPatientForm({ ...newPatientForm, email: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="new-addr">Address / Locality (Optional)</Label>
                <Input
                  id="new-addr"
                  placeholder="e.g. Harmu Housing Colony, Argora"
                  value={newPatientForm.address}
                  onChange={(e) => setNewPatientForm({ ...newPatientForm, address: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="new-city">City</Label>
                  <Input
                    id="new-city"
                    value={newPatientForm.city}
                    onChange={(e) => setNewPatientForm({ ...newPatientForm, city: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="new-state">State</Label>
                  <Input
                    id="new-state"
                    value={newPatientForm.state}
                    onChange={(e) => setNewPatientForm({ ...newPatientForm, state: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="new-pin">PIN Code</Label>
                  <Input
                    id="new-pin"
                    placeholder="834001"
                    value={newPatientForm.pinCode}
                    onChange={(e) => setNewPatientForm({ ...newPatientForm, pinCode: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="new-gstin">GSTIN (Optional, if business entity)</Label>
                <Input
                  id="new-gstin"
                  placeholder="20AAAAA0000A1Z5"
                  value={newPatientForm.gstin}
                  onChange={(e) => setNewPatientForm({ ...newPatientForm, gstin: e.target.value.toUpperCase() })}
                  className="font-mono text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="new-notes">Medical / Optical Notes (Optional)</Label>
                <Input
                  id="new-notes"
                  placeholder="e.g. Referred by Dr. Sinha, prefers anti-glare"
                  value={newPatientForm.notes}
                  onChange={(e) => setNewPatientForm({ ...newPatientForm, notes: e.target.value })}
                />
              </div>

              <DialogFooter className="pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setNewPatientOpen(false)}
                  disabled={newPatientLoading}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-teal-700 hover:bg-teal-800 text-white font-medium"
                  disabled={newPatientLoading}
                >
                  {newPatientLoading ? "Saving to Database..." : "Save & Select Patient"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
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
