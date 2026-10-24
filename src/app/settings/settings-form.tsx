"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateBusinessSettings } from "@/actions/settings";
import { BusinessSettings } from "@/lib/store";
import { toast } from "sonner";
import { ShieldAlert, CheckCircle2 } from "lucide-react";

export function SettingsClientForm({ initialSettings }: { initialSettings: BusinessSettings }) {
  const [formData, setFormData] = useState(initialSettings);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await updateBusinessSettings(formData);
      if (res.success && res.settings) {
        toast.success("Business settings updated successfully");
        if (res.warning) {
          toast.warning(res.warning);
        }
      } else {
        toast.error(res.error || "Failed to update settings");
      }
    } catch (err: any) {
      toast.error(err.message || "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Legal & GST Details */}
      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">1. Legal Entity & GST Registration</CardTitle>
          <CardDescription className="text-xs">
            Appear on all issued GST tax invoices and credit notes
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="tradeName">Trade Name / Brand</Label>
              <Input
                id="tradeName"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="legalName">Legal Entity Name</Label>
              <Input
                id="legalName"
                value={formData.legalName}
                onChange={(e) => setFormData({ ...formData, legalName: e.target.value })}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="gstin">GSTIN (15 Digits)</Label>
              <Input
                id="gstin"
                className="font-mono"
                value={formData.gstin}
                onChange={(e) => setFormData({ ...formData, gstin: e.target.value.toUpperCase() })}
                placeholder="27AABCL1234F1Z8"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="stateCode">State Code (2 Digits for Place of Supply)</Label>
              <Input
                id="stateCode"
                className="font-mono"
                value={formData.stateCode}
                onChange={(e) => setFormData({ ...formData, stateCode: e.target.value })}
                placeholder="27"
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="address">Registered Address</Label>
            <Input
              id="address"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="state">State</Label>
              <Input
                id="state"
                value={formData.state}
                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="pinCode">PIN Code</Label>
              <Input
                id="pinCode"
                value={formData.pinCode}
                onChange={(e) => setFormData({ ...formData, pinCode: e.target.value })}
                required
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Invoice Sequence & Prefix */}
      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">2. Invoice Numbering & Sequence</CardTitle>
          <CardDescription className="text-xs">
            Standard prefix and sequential counter per Indian Financial Year rules
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="prefix">Invoice Prefix</Label>
              <Input
                id="prefix"
                className="font-mono"
                value={formData.invoicePrefix}
                onChange={(e) => setFormData({ ...formData, invoicePrefix: e.target.value })}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="nextNum">Next Invoice Number</Label>
              <Input
                id="nextNum"
                type="number"
                className="font-mono"
                value={formData.invoiceNextNumber}
                onChange={(e) =>
                  setFormData({ ...formData, invoiceNextNumber: Number(e.target.value) || 1 })
                }
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="fy">Financial Year</Label>
              <Input
                id="fy"
                className="font-mono"
                value={formData.financialYear}
                onChange={(e) => setFormData({ ...formData, financialYear: e.target.value })}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Terms & Warranty Policies */}
      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">3. Terms, Policies & Signatory</CardTitle>
          <CardDescription className="text-xs">
            Printed on A4 invoices for customer transparency
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="terms">Terms & Conditions</Label>
            <Input
              id="terms"
              value={formData.termsAndConditions}
              onChange={(e) => setFormData({ ...formData, termsAndConditions: e.target.value })}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="returnPolicy">Return Policy Statement</Label>
            <Input
              id="returnPolicy"
              value={formData.returnPolicy}
              onChange={(e) => setFormData({ ...formData, returnPolicy: e.target.value })}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="signatory">Authorized Signatory Name / Title</Label>
            <Input
              id="signatory"
              value={formData.signatory}
              onChange={(e) => setFormData({ ...formData, signatory: e.target.value })}
            />
          </div>

          <div className="pt-4 flex justify-end">
            <Button type="submit" disabled={loading} className="bg-teal-700 hover:bg-teal-800 text-white font-medium">
              {loading ? "Saving Settings..." : "Save Business Profile"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}
