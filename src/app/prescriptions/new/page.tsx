"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createPrescription } from "@/actions/prescriptions";
import { getPatients, createPatient } from "@/actions/patients";
import { Customer } from "@/lib/store";
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
import { ArrowLeft, Glasses, User, UserPlus } from "lucide-react";

function NewPrescriptionContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const customerIdParam = searchParams.get("customerId");

  const [patients, setPatients] = useState<Customer[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState(customerIdParam || "");
  const [loading, setLoading] = useState(false);

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
        toast.success(`Patient ${res.patient.name} (${res.patient.customerCode}) saved to database!`);
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

  // Form State
  const [formData, setFormData] = useState({
    examinationDate: new Date().toISOString().substring(0, 10),
    prescribedBy: "Dr. K. S. Nair, Optometrist",
    prescriptionType: "SPECTACLE" as "SPECTACLE" | "CONTACT_LENS" | "BOTH",

    // Right Eye (OD)
    rightSph: "",
    rightCyl: "",
    rightAxis: "",
    rightAdd: "",
    rightVa: "6/6",
    rightPrism: "",
    rightBase: "",

    // Left Eye (OS)
    leftSph: "",
    leftCyl: "",
    leftAxis: "",
    leftAdd: "",
    leftVa: "6/6",
    leftPrism: "",
    leftBase: "",

    // Measurements & Recommendations
    pd: "",
    pdRight: "",
    pdLeft: "",
    nearVisionDetails: "N6 at 40cm",
    distanceVisionDetails: "6/6 with correction",
    lensRecommendation: "1.56 BlueCut Anti-Glare lenses",
    notes: "",
    nextExaminationDate: "",
  });

  useEffect(() => {
    getPatients().then((list) => {
      setPatients(list);
      if (!selectedCustomerId && list.length > 0) {
        setSelectedCustomerId(list[0].id);
      }
    });
  }, [selectedCustomerId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomerId) {
      toast.error("Please select a patient");
      return;
    }

    setLoading(true);
    try {
      const res = await createPrescription({
        customerId: selectedCustomerId,
        examinationDate: formData.examinationDate,
        prescribedBy: formData.prescribedBy,
        prescriptionType: formData.prescriptionType,
        rightSph: formData.rightSph || undefined,
        rightCyl: formData.rightCyl || undefined,
        rightAxis: formData.rightAxis ? Number(formData.rightAxis) : undefined,
        rightAdd: formData.rightAdd || undefined,
        rightVa: formData.rightVa || undefined,
        rightPrism: formData.rightPrism || undefined,
        rightBase: formData.rightBase || undefined,

        leftSph: formData.leftSph || undefined,
        leftCyl: formData.leftCyl || undefined,
        leftAxis: formData.leftAxis ? Number(formData.leftAxis) : undefined,
        leftAdd: formData.leftAdd || undefined,
        leftVa: formData.leftVa || undefined,
        leftPrism: formData.leftPrism || undefined,
        leftBase: formData.leftBase || undefined,

        pd: formData.pd ? Number(formData.pd) : undefined,
        pdRight: formData.pdRight ? Number(formData.pdRight) : undefined,
        pdLeft: formData.pdLeft ? Number(formData.pdLeft) : undefined,
        nearVisionDetails: formData.nearVisionDetails || undefined,
        distanceVisionDetails: formData.distanceVisionDetails || undefined,
        lensRecommendation: formData.lensRecommendation || undefined,
        notes: formData.notes || undefined,
        nextExaminationDate: formData.nextExaminationDate || undefined,
      });

      if (res.success && res.prescription) {
        toast.success(`Prescription ${res.prescription.prescriptionCode} recorded!`);
        router.push(`/patients/${selectedCustomerId}`);
      } else {
        toast.error(res.error || "Failed to record prescription");
      }
    } catch (err: any) {
      toast.error(err.message || "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <Link href="/prescriptions">
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Record Optical Prescription</h1>
            <p className="text-xs text-slate-500">
              Input refractive examination measurements with clinical precision
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Patient Selection & Exam Info */}
          <Card className="shadow-sm">
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-semibold">1. Patient & Examination Details</CardTitle>
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
                  <Label htmlFor="patientSelect">
                    Select Patient <span className="text-rose-500">*</span>
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
                  id="patientSelect"
                  className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
                  value={selectedCustomerId}
                  onChange={(e) => setSelectedCustomerId(e.target.value)}
                  required
                >
                  <option value="">-- Choose Patient --</option>
                  {patients.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.customerCode}) - {p.phone || "No Phone"}
                    </option>
                  ))}
                </select>
                {patients.find((p) => p.id === selectedCustomerId) && (
                  <div className="text-[11px] text-slate-500 pt-0.5 flex flex-wrap gap-2">
                    <span>
                      📍 {patients.find((p) => p.id === selectedCustomerId)?.city || "Ranchi"},{" "}
                      {patients.find((p) => p.id === selectedCustomerId)?.state || "Jharkhand"}
                    </span>
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="examDate">Examination Date</Label>
                <Input
                  id="examDate"
                  type="date"
                  value={formData.examinationDate}
                  onChange={(e) => setFormData({ ...formData, examinationDate: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="prescribedBy">Optometrist / Examiner</Label>
                <Input
                  id="prescribedBy"
                  value={formData.prescribedBy}
                  onChange={(e) => setFormData({ ...formData, prescribedBy: e.target.value })}
                  required
                />
              </div>
            </CardContent>
          </Card>

          {/* Refractive Power Matrix */}
          <Card className="shadow-sm border-teal-200">
            <CardHeader className="pb-3 bg-teal-50/50 rounded-t-xl border-b border-teal-100">
              <CardTitle className="text-base font-semibold text-teal-950 flex items-center gap-2">
                <Glasses className="h-4 w-4 text-teal-700" /> 2. Refraction Power Matrix
              </CardTitle>
              <CardDescription className="text-xs text-teal-800">
                Standard optical notation: Right Eye (O.D. - Oculus Dexter) and Left Eye (O.S. - Oculus Sinister)
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4 space-y-6">
              {/* Right Eye (OD) */}
              <div>
                <h4 className="text-xs font-bold text-teal-900 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-teal-600" /> Right Eye (OD)
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">SPH (Sphere)</Label>
                    <Input
                      placeholder="-2.00"
                      value={formData.rightSph}
                      onChange={(e) => setFormData({ ...formData, rightSph: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">CYL (Cylinder)</Label>
                    <Input
                      placeholder="-0.50"
                      value={formData.rightCyl}
                      onChange={(e) => setFormData({ ...formData, rightCyl: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Axis (0-180°)</Label>
                    <Input
                      type="number"
                      placeholder="90"
                      value={formData.rightAxis}
                      onChange={(e) => setFormData({ ...formData, rightAxis: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Add (Near)</Label>
                    <Input
                      placeholder="+1.50"
                      value={formData.rightAdd}
                      onChange={(e) => setFormData({ ...formData, rightAdd: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Visual Acuity</Label>
                    <Input
                      placeholder="6/6"
                      value={formData.rightVa}
                      onChange={(e) => setFormData({ ...formData, rightVa: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Prism / Base</Label>
                    <Input
                      placeholder="1.0 BO"
                      value={formData.rightPrism}
                      onChange={(e) => setFormData({ ...formData, rightPrism: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              {/* Left Eye (OS) */}
              <div>
                <h4 className="text-xs font-bold text-teal-900 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-teal-600" /> Left Eye (OS)
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">SPH (Sphere)</Label>
                    <Input
                      placeholder="-2.25"
                      value={formData.leftSph}
                      onChange={(e) => setFormData({ ...formData, leftSph: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">CYL (Cylinder)</Label>
                    <Input
                      placeholder="-0.75"
                      value={formData.leftCyl}
                      onChange={(e) => setFormData({ ...formData, leftCyl: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Axis (0-180°)</Label>
                    <Input
                      type="number"
                      placeholder="85"
                      value={formData.leftAxis}
                      onChange={(e) => setFormData({ ...formData, leftAxis: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Add (Near)</Label>
                    <Input
                      placeholder="+1.50"
                      value={formData.leftAdd}
                      onChange={(e) => setFormData({ ...formData, leftAdd: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Visual Acuity</Label>
                    <Input
                      placeholder="6/6"
                      value={formData.leftVa}
                      onChange={(e) => setFormData({ ...formData, leftVa: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Prism / Base</Label>
                    <Input
                      placeholder="1.0 BI"
                      value={formData.leftPrism}
                      onChange={(e) => setFormData({ ...formData, leftPrism: e.target.value })}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Fitting Details & Recommendations */}
          <Card className="shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">3. Fitting Details & Clinical Recommendation</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="pd">Total Pupillary Distance (PD mm)</Label>
                  <Input
                    id="pd"
                    type="number"
                    step="0.5"
                    placeholder="e.g. 63"
                    value={formData.pd}
                    onChange={(e) => setFormData({ ...formData, pd: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="pdRight">Monocular PD Right (mm)</Label>
                  <Input
                    id="pdRight"
                    type="number"
                    step="0.5"
                    placeholder="e.g. 31.5"
                    value={formData.pdRight}
                    onChange={(e) => setFormData({ ...formData, pdRight: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="pdLeft">Monocular PD Left (mm)</Label>
                  <Input
                    id="pdLeft"
                    type="number"
                    step="0.5"
                    placeholder="e.g. 31.5"
                    value={formData.pdLeft}
                    onChange={(e) => setFormData({ ...formData, pdLeft: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="lensRec">Recommended Lens Specification</Label>
                  <Input
                    id="lensRec"
                    placeholder="e.g. 1.60 High Index, Anti-reflective coating"
                    value={formData.lensRecommendation}
                    onChange={(e) => setFormData({ ...formData, lensRecommendation: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="nextExam">Annual Follow-up Date (Optional)</Label>
                  <Input
                    id="nextExam"
                    type="date"
                    value={formData.nextExaminationDate}
                    onChange={(e) => setFormData({ ...formData, nextExaminationDate: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="notes">Examination Notes / Special Observations</Label>
                <Input
                  id="notes"
                  placeholder="e.g. Frequent night driving, computer screen strain"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                />
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t">
                <Link href="/prescriptions">
                  <Button type="button" variant="outline">
                    Cancel
                  </Button>
                </Link>
                <Button
                  type="submit"
                  disabled={loading}
                  className="bg-teal-700 hover:bg-teal-800 text-white font-medium"
                >
                  {loading ? "Saving Prescription..." : "Save Prescription Record"}
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
                Register a new patient directly into your database. They will be saved and immediately selected for this prescription.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleCreateNewPatient} className="space-y-4 pt-2">
              <div className="space-y-1.5">
                <Label htmlFor="rx-new-name">
                  Full Name <span className="text-rose-500">*</span>
                </Label>
                <Input
                  id="rx-new-name"
                  placeholder="e.g. Ramesh Kumar"
                  value={newPatientForm.name}
                  onChange={(e) => setNewPatientForm({ ...newPatientForm, name: e.target.value })}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="rx-new-phone">
                    Phone Number <span className="text-rose-500">*</span>
                  </Label>
                  <Input
                    id="rx-new-phone"
                    placeholder="+91 98350 12345"
                    value={newPatientForm.phone}
                    onChange={(e) => setNewPatientForm({ ...newPatientForm, phone: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="rx-new-email">Email (Optional)</Label>
                  <Input
                    id="rx-new-email"
                    type="email"
                    placeholder="patient@gmail.com"
                    value={newPatientForm.email}
                    onChange={(e) => setNewPatientForm({ ...newPatientForm, email: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="rx-new-addr">Address / Locality (Optional)</Label>
                <Input
                  id="rx-new-addr"
                  placeholder="e.g. Harmu Housing Colony, Argora"
                  value={newPatientForm.address}
                  onChange={(e) => setNewPatientForm({ ...newPatientForm, address: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="rx-new-city">City</Label>
                  <Input
                    id="rx-new-city"
                    value={newPatientForm.city}
                    onChange={(e) => setNewPatientForm({ ...newPatientForm, city: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="rx-new-state">State</Label>
                  <Input
                    id="rx-new-state"
                    value={newPatientForm.state}
                    onChange={(e) => setNewPatientForm({ ...newPatientForm, state: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="rx-new-pin">PIN Code</Label>
                  <Input
                    id="rx-new-pin"
                    placeholder="834001"
                    value={newPatientForm.pinCode}
                    onChange={(e) => setNewPatientForm({ ...newPatientForm, pinCode: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="rx-new-notes">Medical Notes (Optional)</Label>
                <Input
                  id="rx-new-notes"
                  placeholder="e.g. Diabietic retinopathy screen, previous cataract"
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

export default function NewPrescriptionPage() {
  return (
    <Suspense fallback={<div className="p-12 text-center text-xs text-slate-400">Loading prescription form...</div>}>
      <NewPrescriptionContent />
    </Suspense>
  );
}
