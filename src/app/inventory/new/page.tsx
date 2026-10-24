"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createProduct } from "@/actions/inventory";
import { toast } from "sonner";
import Link from "next/link";
import { ArrowLeft, Package, Plus } from "lucide-react";

export default function NewProductPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [category, setCategory] = useState<"FRAME" | "LENS" | "SUNGLASSES" | "ACCESSORY">("FRAME");

  const [formData, setFormData] = useState({
    sku: "",
    name: "",
    brand: "LensArt",
    model: "",
    description: "",
    barcode: "",
    purchaseCost: "",
    sellingPrice: "",
    hsnCode: "9003",
    gstRate: "12",
    reorderThreshold: "5",
    initialStock: "10",

    // Frame fields
    frameShape: "Rectangle",
    frameMaterial: "Titanium",
    frameColor: "Matte Black",
    eyeSize: "52",
    bridgeSize: "18",
    templeLength: "140",

    // Lens fields
    lensType: "Single Vision",
    lensMaterial: "CR-39 Resin",
    refractiveIndex: "1.56",
    isPhotochromic: false,
    isBlueFilter: true,
  });

  const handleCategoryChange = (newCat: any) => {
    setCategory(newCat);
    if (newCat === "FRAME") {
      setFormData((prev) => ({ ...prev, hsnCode: "9003", gstRate: "12" }));
    } else if (newCat === "LENS") {
      setFormData((prev) => ({ ...prev, hsnCode: "9001", gstRate: "12" }));
    } else if (newCat === "SUNGLASSES") {
      setFormData((prev) => ({ ...prev, hsnCode: "90041000", gstRate: "28" }));
    } else if (newCat === "ACCESSORY") {
      setFormData((prev) => ({ ...prev, hsnCode: "3307", gstRate: "18" }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error("Product name is required");
      return;
    }
    if (!formData.sku.trim()) {
      toast.error("SKU is required");
      return;
    }

    setLoading(true);
    try {
      const res = await createProduct({
        sku: formData.sku,
        name: formData.name,
        category,
        brand: formData.brand,
        model: formData.model || undefined,
        description: formData.description || undefined,
        barcode: formData.barcode || undefined,
        purchaseCost: Number(formData.purchaseCost) || 0,
        sellingPrice: Number(formData.sellingPrice) || 0,
        hsnCode: formData.hsnCode,
        gstRate: Number(formData.gstRate) || 12,
        isVerifiedRate: false,
        reorderThreshold: Number(formData.reorderThreshold) || 5,
        initialStock: Number(formData.initialStock) || 0,

        frameShape: category === "FRAME" ? formData.frameShape : undefined,
        frameMaterial: category === "FRAME" ? formData.frameMaterial : undefined,
        frameColor: category === "FRAME" ? formData.frameColor : undefined,
        eyeSize: category === "FRAME" ? formData.eyeSize : undefined,
        bridgeSize: category === "FRAME" ? formData.bridgeSize : undefined,
        templeLength: category === "FRAME" ? formData.templeLength : undefined,

        lensType: category === "LENS" ? formData.lensType : undefined,
        lensMaterial: category === "LENS" ? formData.lensMaterial : undefined,
        refractiveIndex: category === "LENS" ? formData.refractiveIndex : undefined,
        isPhotochromic: category === "LENS" ? formData.isPhotochromic : undefined,
        isBlueFilter: category === "LENS" ? formData.isBlueFilter : undefined,
      });

      if (res.success && res.product) {
        toast.success(`Product ${res.product.name} created!`);
        router.push("/inventory");
      } else {
        toast.error(res.error || "Failed to create product");
      }
    } catch (err: any) {
      toast.error(err.message || "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppShell>
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <Link href="/inventory">
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Add Product to Inventory</h1>
            <p className="text-xs text-slate-500">
              Configure frames, lenses, sunglasses, or accessories with accurate optical taxonomy
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Category Selector */}
          <Card className="shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">1. Product Classification</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { id: "FRAME", label: "Spectacle Frame" },
                  { id: "LENS", label: "Prescription Lens" },
                  { id: "SUNGLASSES", label: "Sunglasses" },
                  { id: "ACCESSORY", label: "Accessory / Kit" },
                ].map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => handleCategoryChange(cat.id)}
                    className={`p-3 text-center rounded-lg border text-xs font-semibold transition-colors ${
                      category === cat.id
                        ? "bg-teal-50 border-teal-600 text-teal-900 shadow-sm"
                        : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Core Info */}
          <Card className="shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">2. General Identification</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="sku">
                    SKU Code <span className="text-rose-500">*</span>
                  </Label>
                  <Input
                    id="sku"
                    required
                    placeholder="e.g. FRM-TIT-03"
                    value={formData.sku}
                    onChange={(e) => setFormData({ ...formData, sku: e.target.value.toUpperCase() })}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="name">
                    Product Title / Name <span className="text-rose-500">*</span>
                  </Label>
                  <Input
                    id="name"
                    required
                    placeholder="e.g. LensArt NeoFlex Rimless Titanium"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="brand">Brand</Label>
                  <Input
                    id="brand"
                    value={formData.brand}
                    onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="model">Model / Style Code</Label>
                  <Input
                    id="model"
                    placeholder="e.g. NF-909"
                    value={formData.model}
                    onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                  />
                </div>
              </div>

              {/* Dynamic Frame Fields */}
              {category === "FRAME" && (
                <div className="p-4 bg-slate-50 rounded-lg space-y-3 border">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Frame Specifications
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Shape</Label>
                      <Input
                        value={formData.frameShape}
                        onChange={(e) => setFormData({ ...formData, frameShape: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Material</Label>
                      <Input
                        value={formData.frameMaterial}
                        onChange={(e) => setFormData({ ...formData, frameMaterial: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Colour</Label>
                      <Input
                        value={formData.frameColor}
                        onChange={(e) => setFormData({ ...formData, frameColor: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Eye Size (mm)</Label>
                      <Input
                        value={formData.eyeSize}
                        onChange={(e) => setFormData({ ...formData, eyeSize: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Bridge (mm)</Label>
                      <Input
                        value={formData.bridgeSize}
                        onChange={(e) => setFormData({ ...formData, bridgeSize: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Temple Length (mm)</Label>
                      <Input
                        value={formData.templeLength}
                        onChange={(e) => setFormData({ ...formData, templeLength: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Dynamic Lens Fields */}
              {category === "LENS" && (
                <div className="p-4 bg-slate-50 rounded-lg space-y-3 border">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Lens Technical Details
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Lens Type</Label>
                      <Input
                        value={formData.lensType}
                        onChange={(e) => setFormData({ ...formData, lensType: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Material</Label>
                      <Input
                        value={formData.lensMaterial}
                        onChange={(e) => setFormData({ ...formData, lensMaterial: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Refractive Index</Label>
                      <Input
                        value={formData.refractiveIndex}
                        onChange={(e) => setFormData({ ...formData, refractiveIndex: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Pricing, GST & Stock Tracking */}
          <Card className="shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">3. Pricing, GST & Stock Setup</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="cost">Purchase Cost (₹)</Label>
                  <Input
                    id="cost"
                    type="number"
                    placeholder="1200"
                    value={formData.purchaseCost}
                    onChange={(e) => setFormData({ ...formData, purchaseCost: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="price">Selling Price (₹)</Label>
                  <Input
                    id="price"
                    type="number"
                    placeholder="3499"
                    value={formData.sellingPrice}
                    onChange={(e) => setFormData({ ...formData, sellingPrice: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="hsn">HSN Code</Label>
                  <Input
                    id="hsn"
                    value={formData.hsnCode}
                    onChange={(e) => setFormData({ ...formData, hsnCode: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="gst">Applicable GST Rate (%)</Label>
                  <Input
                    id="gst"
                    type="number"
                    value={formData.gstRate}
                    onChange={(e) => setFormData({ ...formData, gstRate: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t">
                <div className="space-y-1.5">
                  <Label htmlFor="initialStock">Initial Opening Stock (Units)</Label>
                  <Input
                    id="initialStock"
                    type="number"
                    value={formData.initialStock}
                    onChange={(e) => setFormData({ ...formData, initialStock: e.target.value })}
                  />
                  <p className="text-[11px] text-slate-400">Creates an auditable INITIAL stock ledger record</p>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="threshold">Reorder Alert Threshold</Label>
                  <Input
                    id="threshold"
                    type="number"
                    value={formData.reorderThreshold}
                    onChange={(e) => setFormData({ ...formData, reorderThreshold: e.target.value })}
                  />
                  <p className="text-[11px] text-slate-400">Triggers low stock alert when inventory reaches this level</p>
                </div>
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t">
                <Link href="/inventory">
                  <Button type="button" variant="outline">
                    Cancel
                  </Button>
                </Link>
                <Button
                  type="submit"
                  disabled={loading}
                  className="bg-teal-700 hover:bg-teal-800 text-white font-medium"
                >
                  {loading ? "Adding Product..." : "Save Product to Inventory"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </form>
      </div>
    </AppShell>
  );
}
