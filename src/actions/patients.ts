"use server";

import { safeRevalidatePath } from "@/lib/revalidate";
import {
  readCollection,
  writeCollection,
  Customer,
  BusinessSettings,
  AuditLogEntry,
  initializeStoreIfEmpty,
  Prescription,
  OpticalOrder,
  Invoice,
  Payment,
} from "@/lib/store";

export async function getPatients(searchQuery?: string): Promise<Customer[]> {
  initializeStoreIfEmpty();
  const patients = readCollection<Customer>("customers", []);
  if (!searchQuery || searchQuery.trim() === "") {
    return patients.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  const q = searchQuery.toLowerCase().trim();
  return patients
    .filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.customerCode.toLowerCase().includes(q) ||
        (p.phone && p.phone.includes(q)) ||
        (p.email && p.email.toLowerCase().includes(q))
    )
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function getPatientById(id: string): Promise<{
  patient: Customer | null;
  prescriptions: Prescription[];
  orders: OpticalOrder[];
  invoices: Invoice[];
  payments: Payment[];
}> {
  initializeStoreIfEmpty();
  const patients = readCollection<Customer>("customers", []);
  const patient = patients.find((p) => p.id === id) || null;

  if (!patient) {
    return {
      patient: null,
      prescriptions: [],
      orders: [],
      invoices: [],
      payments: [],
    };
  }

  const allPrescriptions = readCollection<Prescription>("prescriptions", []);
  const allOrders = readCollection<OpticalOrder>("orders", []);
  const allInvoices = readCollection<Invoice>("invoices", []);
  const allPayments = readCollection<Payment>("payments", []);

  return {
    patient,
    prescriptions: allPrescriptions
      .filter((rx) => rx.customerId === id)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    orders: allOrders
      .filter((o) => o.customerId === id)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    invoices: allInvoices
      .filter((inv) => inv.customerId === id)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    payments: allPayments
      .filter((pay) => pay.customerId === id)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
  };
}

export async function createPatient(data: {
  name: string;
  phone: string;
  email?: string;
  dateOfBirth?: string;
  address?: string;
  city?: string;
  state?: string;
  pinCode?: string;
  gstin?: string;
  notes?: string;
}): Promise<{ success: boolean; patient?: Customer; error?: string }> {
  try {
    initializeStoreIfEmpty();
    if (!data.name || data.name.trim() === "") {
      return { success: false, error: "Patient name is required" };
    }
    if (!data.phone || data.phone.trim() === "") {
      return { success: false, error: "Phone number is required for identification" };
    }

    const patients = readCollection<Customer>("customers", []);
    const settings = readCollection<BusinessSettings>("business_settings")[0];

    const nextNum = settings?.patientNextNumber || 501;
    const prefix = settings?.patientPrefix || "PT";
    const customerCode = `${prefix}-${nextNum}`;

    // Update settings with next patient number
    if (settings) {
      settings.patientNextNumber = nextNum + 1;
      writeCollection("business_settings", [settings]);
    }

    const newPatient: Customer = {
      id: `cust-${Date.now()}`,
      customerCode,
      name: data.name.trim(),
      phone: data.phone.trim(),
      email: data.email?.trim() || undefined,
      dateOfBirth: data.dateOfBirth || undefined,
      address: data.address?.trim() || undefined,
      city: data.city?.trim() || undefined,
      state: data.state?.trim() || undefined,
      pinCode: data.pinCode?.trim() || undefined,
      gstin: data.gstin?.trim() || undefined,
      notes: data.notes?.trim() || undefined,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    patients.push(newPatient);
    writeCollection("customers", patients);

    // Audit log
    const auditLogs = readCollection<AuditLogEntry>("audit_logs", []);
    auditLogs.push({
      id: `audit-${Date.now()}`,
      eventType: "CREATE",
      module: "patients",
      recordType: "Customer",
      recordId: newPatient.id,
      description: `Registered patient ${newPatient.name} (${newPatient.customerCode})`,
      createdAt: new Date().toISOString(),
    });
    writeCollection("audit_logs", auditLogs);

    safeRevalidatePath("/patients");
    return { success: true, patient: newPatient };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to register patient" };
  }
}

export async function updatePatient(
  id: string,
  data: Partial<Customer>
): Promise<{ success: boolean; patient?: Customer; error?: string }> {
  try {
    initializeStoreIfEmpty();
    const patients = readCollection<Customer>("customers", []);
    const index = patients.findIndex((p) => p.id === id);
    if (index === -1) {
      return { success: false, error: "Patient not found" };
    }

    const existing = patients[index];
    const updated: Customer = {
      ...existing,
      ...data,
      id: existing.id,
      customerCode: existing.customerCode, // Immutable identifier
      updatedAt: new Date().toISOString(),
    };

    patients[index] = updated;
    writeCollection("customers", patients);

    // Audit log
    const auditLogs = readCollection<AuditLogEntry>("audit_logs", []);
    auditLogs.push({
      id: `audit-${Date.now()}`,
      eventType: "UPDATE",
      module: "patients",
      recordType: "Customer",
      recordId: id,
      description: `Updated profile for patient ${updated.name} (${updated.customerCode})`,
      createdAt: new Date().toISOString(),
    });
    writeCollection("audit_logs", auditLogs);

    safeRevalidatePath("/patients");
    safeRevalidatePath(`/patients/${id}`);
    return { success: true, patient: updated };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to update patient" };
  }
}
