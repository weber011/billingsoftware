"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { createOrder } from "@/actions/orders";
import { getPatients } from "@/actions/patients";
import { getPrescriptions } from "@/actions/prescriptions";
import { getProducts } from "@/actions/inventory";
import { Customer, Prescription, Product } from "@/lib/store";
import { formatCurrency, formatDate } from "@/lib/utils";
import { toast } from "sonner";
import Link from "next/link";
import { ArrowLeft, Glasses, Plus, Trash2, CheckCircle2 } from "lucide-react";

function NewOrderContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const customerIdParam = searchParams.get("customerId");
  const prescriptionIdParam = searchParams.get("prescriptionId");

  const [patients, setPatients] = useState<Customer[]>([]);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [catalogProducts, setCatalogProducts] = useState<Product[]>([]);

  const [selectedCustomerId, setSelectedCustomerId] = useState(customerIdParam || "");
  const [selectedRxId, setSelectedRxId] = useState(prescriptionIdParam || "");
  const [expectedDate, setExpectedDate] = useState("");
  const [labInfo, setLabInfo] = useState("In-House Edging Lab");
  const [fittingDetails, setFittingDetails] = useState("");
  const [advancePaid, setAdvancePaid] = useState("");
  const [internalNotes, setInternalNotes] = useState("");
  const [loading, setLoading] = useState(false);

  // Line Items
  const [items, setItems] = useState<
    Array<{
      productId?: string;
      description: string;
      itemType: "FRAME" | "LENS" | "ACCESSORY" | "SERVICE";
      quantity: number;
      unitPrice: number;
      discount: number;
    }>
  >([
    {
      description: "Spectacle Frame",
      itemType: "FRAME",
      quantity: 1,
      unitPrice: 2499,
      discount: 0,
    },
    {
      description: "Prescription Lenses (Pair)",
      itemType: "LENS",
      quantity: 1,
      unitPrice: 1800,
      discount: 0,
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
  }, []);

  useEffect(() => {
    if (selectedCustomerId) {
      getPrescriptions(selectedCustomerId).then((rxList) => {
        setPrescriptions(rxList);
        if (rxList.length > 0 && !selectedRxId) {
          setSelectedRxId(rxList[0].id);
        }
      });
    } else {
      setPrescriptions([]);
    }
  }, [selectedCustomerId]);

  // Quick select catalog product into an item
  const handleSelectProduct = (index: number, productId: string) => {
    const prod = catalogProducts.find((p) => p.id === productId);
    if (!prod) return;

    setItems((prev) => {
      const copy = [...prev];
      copy[index] = {
        productId: prod.id,
        description: `${prod.name} (${prod.sku})`,
        itemType: prod.category === "LENS" ? "LENS" : prod.category === "ACCESSORY" ? "ACCESSORY" : "FRAME",
        quantity: 1,
        unitPrice: prod.sellingPrice,
        discount: 0,
      };
      return copy;
    });
  };

  const addItem = (type: "FRAME" | "LENS" | "ACCESSORY" | "SERVICE") => {
    setItems((prev) => [
      ...prev,
      {
        description: type === "FRAME" ? "Spectacle Frame" : type === "LENS" ? "Lens Pair" : "Fitting Service",
        itemType: type,
        quantity: 1,
        unitPrice: 0,
        discount: 0,
      },
    ]);
  };

  const removeItem = (index: number) => {
    if (items.length <= 1) {
      toast.error("Order must contain at least one item");
      return;
    }
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const totalAmount = items.reduce(
    (acc, it) => acc + Math.max(0, it.quantity * it.unitPrice - (it.discount || 0)),
    0
  );
  const advanceNum = Math.min(totalAmount, Math.max(0, Number(advancePaid) || 0));
  const balanceDue = Math.max(0, totalAmount - advanceNum);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomerId) {
      toast.error("Please select a patient");
      return;
    }

    setLoading(true);
    try {
      const res = await createOrder({
        customerId: selectedCustomerId,
        prescriptionId: selectedRxId || undefined,
        expectedCompletionDate: expectedDate || undefined,
        labInfo: labInfo || undefined,
        fittingDetails: fittingDetails || undefined,
        advancePaid: advanceNum,
        internalNotes: internalNotes || undefined,
        items,
      });

      if (res.success && res.order) {
        toast.success(`Order ${res.order.orderNumber} placed successfully!`);
        router.push(`/orders/${res.order.id}`);
      } else {
        toast.error(res.error || "Failed to create order");
      }
    } catch (err: any) {
      toast.error(err.message || "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  const activeRx = prescriptions.find((r) => r.id === selectedRxId);

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <Link href="/orders">
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Place Spectacle Order</h1>
            <p className="text-xs text-slate-500">
              Configure custom lenses, frame mounting, lab instructions, and advance deposit
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Patient & Prescription Linkage */}
          <Card className="shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">1. Patient & Optical Prescription</CardTitle>
              <CardDescription className="text-xs">
                The selected prescription will be captured as an immutable snapshot for lab fitting
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="cust">
                    Patient <span className="text-rose-500">*</span>
                  </Label>
                  <select
                    id="cust"
                    className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
                    value={selectedCustomerId}
                    onChange={(e) => setSelectedCustomerId(e.target.value)}
                    required
                  >
                    <option value="">-- Select Patient --</option>
                    {patients.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.customerCode}) - {p.phone}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="rx">Attached Prescription</Label>
                  <select
                    id="rx"
                    className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
                    value={selectedRxId}
                    onChange={(e) => setSelectedRxId(e.target.value)}
                  >
                    <option value="">-- No Prescription Attached --</option>
                    {prescriptions.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.prescriptionCode} (Exam: {formatDate(r.examinationDate)})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Prescription Snapshot Preview */}
              {activeRx && (
                <div className="p-3 bg-teal-50/60 rounded-lg border border-teal-100 text-xs text-teal-950 space-y-1.5">
                  <div className="flex items-center justify-between font-semibold">
                    <span>Active Rx: {activeRx.prescriptionCode}</span>
                    <span>Examined: {formatDate(activeRx.examinationDate)}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 font-mono text-[11px]">
                    <p>OD: SPH {activeRx.rightSph || "0.00"} | CYL {activeRx.rightCyl || "0.00"} | AXIS {activeRx.rightAxis || "-"}</p>
                    <p>OS: SPH {activeRx.leftSph || "0.00"} | CYL {activeRx.leftCyl || "0.00"} | AXIS {activeRx.leftAxis || "-"}</p>
                  </div>
                  {activeRx.pd && <p className="text-[11px]">PD: {activeRx.pd} mm | Rec: {activeRx.lensRecommendation || "Standard"}</p>}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Spectacle Line Items */}
          <Card className="shadow-sm">
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-semibold">2. Frame & Lens Selection</CardTitle>
                <CardDescription className="text-xs">Choose items from catalog or enter custom specifications</CardDescription>
              </div>
              <div className="flex items-center gap-1.5">
                <Button type="button" size="sm" variant="outline" onClick={() => addItem("FRAME")} className="text-xs">
                  + Add Frame
                </Button>
                <Button type="button" size="sm" variant="outline" onClick={() => addItem("LENS")} className="text-xs">
                  + Add Lens
                </Button>
                <Button type="button" size="sm" variant="outline" onClick={() => addItem("SERVICE")} className="text-xs">
                  + Fitting
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                {items.map((it, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-lg border bg-slate-50/50 flex flex-col sm:flex-row items-start sm:items-center gap-3 text-xs"
                  >
                    <div className="w-24 shrink-0">
                      <Badge variant="outline" className="text-[10px]">
                        {it.itemType}
                      </Badge>
                    </div>

                    <div className="flex-1 space-y-1 w-full">
                      <Input
                        placeholder="Description"
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
                        <option value="">-- Or Pick From Inventory Catalog --</option>
                        {catalogProducts.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name} ({p.sku}) - ₹{p.sellingPrice} (Stock: {p.currentStock})
                          </option>
                        ))}
                      </select>
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
                      <Label className="text-[10px] text-slate-400">Discount (₹)</Label>
                      <Input
                        type="number"
                        value={it.discount}
                        onChange={(e) => {
                          const val = Number(e.target.value) || 0;
                          setItems((prev) => {
                            const c = [...prev];
                            c[idx].discount = val;
                            return c;
                          });
                        }}
                      />
                    </div>

                    <div className="w-24 text-right pt-3 font-mono font-bold text-slate-900">
                      {formatCurrency(Math.max(0, it.quantity * it.unitPrice - it.discount))}
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

              {/* Order Financial Totals */}
              <div className="flex justify-end pt-3 border-t">
                <div className="w-64 space-y-2 text-xs">
                  <div className="flex justify-between font-semibold text-sm">
                    <span>Order Total:</span>
                    <span className="font-mono text-teal-900">{formatCurrency(totalAmount)}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <Label htmlFor="adv" className="text-xs">
                      Advance Paid (₹):
                    </Label>
                    <Input
                      id="adv"
                      type="number"
                      placeholder="0"
                      className="w-28 text-right font-mono"
                      value={advancePaid}
                      onChange={(e) => setAdvancePaid(e.target.value)}
                    />
                  </div>

                  <div className="flex justify-between font-bold text-sm pt-2 border-t text-amber-800">
                    <span>Balance Due on Delivery:</span>
                    <span className="font-mono">{formatCurrency(balanceDue)}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Lab Processing & Completion */}
          <Card className="shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">3. Lab Processing & Expected Date</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="lab">Optical Lab Assignment</Label>
                  <Input
                    id="lab"
                    value={labInfo}
                    onChange={(e) => setLabInfo(e.target.value)}
                    placeholder="e.g. In-House Edging Lab or Essilor Lab"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="expDate">Expected Ready for Collection Date</Label>
                  <Input
                    id="expDate"
                    type="date"
                    value={expectedDate}
                    onChange={(e) => setExpectedDate(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="fitting">Fitting Measurements & Special Glazing Instructions</Label>
                <Input
                  id="fitting"
                  placeholder="e.g. Segment Height 18mm, Pantoscopic tilt 8°, bevel location 40%"
                  value={fittingDetails}
                  onChange={(e) => setFittingDetails(e.target.value)}
                />
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t">
                <Link href="/orders">
                  <Button type="button" variant="outline">
                    Cancel
                  </Button>
                </Link>
                <Button
                  type="submit"
                  disabled={loading}
                  className="bg-teal-700 hover:bg-teal-800 text-white font-medium"
                >
                  {loading ? "Placing Order..." : "Confirm & Place Order"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </form>
      </div>
    </AppShell>
  );
}

export default function NewOrderPage() {
  return (
    <Suspense fallback={<div className="p-12 text-center text-xs text-slate-400">Loading order form...</div>}>
      <NewOrderContent />
    </Suspense>
  );
}
