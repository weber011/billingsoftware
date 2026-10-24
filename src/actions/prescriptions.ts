"use server";

import { safeRevalidatePath } from "@/lib/revalidate";
import {
  readCollection,
  writeCollection,
  Prescription,
  Customer,
  AuditLogEntry,
  initializeStoreIfEmpty,
} from "@/lib/store";

export async function getPrescriptions(customerId?: string): Promise<Prescription[]> {
  initializeStoreIfEmpty();
  const allRx = readCollection<Prescription>("prescriptions", []);
  if (customerId) {
    return allRx
      .filter((rx) => rx.customerId === customerId)
      .sort((a, b) => new Date(b.examinationDate).getTime() - new Date(a.examinationDate).getTime());
  }
  return allRx.sort(
    (a, b) => new Date(b.examinationDate).getTime() - new Date(a.examinationDate).getTime()
  );
}

export async function getPrescriptionById(id: string): Promise<Prescription | null> {
  initializeStoreIfEmpty();
  const allRx = readCollection<Prescription>("prescriptions", []);
  return allRx.find((rx) => rx.id === id) || null;
}

export async function createPrescription(data: {
  customerId: string;
  examinationDate: string;
  prescribedBy: string;
  prescriptionType?: "SPECTACLE" | "CONTACT_LENS" | "BOTH";
  
  // Right Eye
  rightSph?: string;
  rightCyl?: string;
  rightAxis?: number;
  rightAdd?: string;
  rightVa?: string;
  rightPrism?: string;
  rightBase?: string;

  // Left Eye
  leftSph?: string;
  leftCyl?: string;
  leftAxis?: number;
  leftAdd?: string;
  leftVa?: string;
  leftPrism?: string;
  leftBase?: string;

  // Measurement
  pd?: number;
  pdRight?: number;
  pdLeft?: number;
  nearVisionDetails?: string;
  distanceVisionDetails?: string;
  lensRecommendation?: string;
  notes?: string;
  nextExaminationDate?: string;
  createdByName?: string;
}): Promise<{ success: boolean; prescription?: Prescription; error?: string }> {
  try {
    initializeStoreIfEmpty();
    if (!data.customerId) {
      return { success: false, error: "Patient ID is required" };
    }
    if (!data.examinationDate) {
      return { success: false, error: "Examination date is required" };
    }

    const customers = readCollection<Customer>("customers", []);
    const customer = customers.find((c) => c.id === data.customerId);
    if (!customer) {
      return { success: false, error: "Patient not found" };
    }

    const prescriptions = readCollection<Prescription>("prescriptions", []);
    const rxNumber = prescriptions.length + 101;
    const prescriptionCode = `RX-${rxNumber}`;

    const newPrescription: Prescription = {
      id: `rx-${Date.now()}`,
      prescriptionCode,
      customerId: data.customerId,
      customerName: customer.name,
      examinationDate: data.examinationDate,
      prescribedBy: data.prescribedBy?.trim() || "Optometrist",
      prescriptionType: data.prescriptionType || "SPECTACLE",
      rightSph: data.rightSph?.trim() || undefined,
      rightCyl: data.rightCyl?.trim() || undefined,
      rightAxis: data.rightAxis ? Number(data.rightAxis) : undefined,
      rightAdd: data.rightAdd?.trim() || undefined,
      rightVa: data.rightVa?.trim() || undefined,
      rightPrism: data.rightPrism?.trim() || undefined,
      rightBase: data.rightBase?.trim() || undefined,

      leftSph: data.leftSph?.trim() || undefined,
      leftCyl: data.leftCyl?.trim() || undefined,
      leftAxis: data.leftAxis ? Number(data.leftAxis) : undefined,
      leftAdd: data.leftAdd?.trim() || undefined,
      leftVa: data.leftVa?.trim() || undefined,
      leftPrism: data.leftPrism?.trim() || undefined,
      leftBase: data.leftBase?.trim() || undefined,

      pd: data.pd ? Number(data.pd) : undefined,
      pdRight: data.pdRight ? Number(data.pdRight) : undefined,
      pdLeft: data.pdLeft ? Number(data.pdLeft) : undefined,
      nearVisionDetails: data.nearVisionDetails?.trim() || undefined,
      distanceVisionDetails: data.distanceVisionDetails?.trim() || undefined,
      lensRecommendation: data.lensRecommendation?.trim() || undefined,
      notes: data.notes?.trim() || undefined,
      nextExaminationDate: data.nextExaminationDate || undefined,

      createdById: "user-1",
      createdByName: data.createdByName || data.prescribedBy || "Optometrist",
      createdAt: new Date().toISOString(),
    };

    prescriptions.push(newPrescription);
    writeCollection("prescriptions", prescriptions);

    // Audit log
    const auditLogs = readCollection<AuditLogEntry>("audit_logs", []);
    auditLogs.push({
      id: `audit-${Date.now()}`,
      eventType: "CREATE",
      module: "prescriptions",
      recordType: "Prescription",
      recordId: newPrescription.id,
      description: `Recorded prescription ${newPrescription.prescriptionCode} for patient ${customer.name}`,
      createdAt: new Date().toISOString(),
    });
    writeCollection("audit_logs", auditLogs);

    safeRevalidatePath("/prescriptions");
    safeRevalidatePath(`/patients/${data.customerId}`);
    return { success: true, prescription: newPrescription };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to create prescription" };
  }
}
