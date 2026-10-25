"use server";

import { prisma } from "@/lib/prisma";
import { safeRevalidatePath } from "@/lib/revalidate";

export async function getPrescriptions(customerId?: string) {
  const where = customerId ? { customerId } : undefined;
  const prescriptions = await prisma.prescription.findMany({
    where,
    include: { customer: true },
    orderBy: { examinationDate: "desc" },
  });

  return prescriptions.map((rx) => ({
    id: rx.id,
    prescriptionCode: rx.prescriptionCode,
    customerId: rx.customerId,
    customerName: rx.customer.name,
    examinationDate: rx.examinationDate.toISOString().substring(0, 10),
    prescribedBy: rx.prescribedBy,
    prescriptionType: rx.prescriptionType,
    rightSph: rx.rightSph?.toString() || "",
    rightCyl: rx.rightCyl?.toString() || "",
    rightAxis: rx.rightAxis,
    rightAdd: rx.rightAdd?.toString() || "",
    rightVa: rx.rightVa || "6/6",
    rightPrism: rx.rightPrism?.toString() || "",
    rightBase: rx.rightBase || "",
    leftSph: rx.leftSph?.toString() || "",
    leftCyl: rx.leftCyl?.toString() || "",
    leftAxis: rx.leftAxis,
    leftAdd: rx.leftAdd?.toString() || "",
    leftVa: rx.leftVa || "6/6",
    leftPrism: rx.leftPrism?.toString() || "",
    leftBase: rx.leftBase || "",
    pd: rx.pd ? Number(rx.pd) : undefined,
    pdRight: rx.pdRight ? Number(rx.pdRight) : undefined,
    pdLeft: rx.pdLeft ? Number(rx.pdLeft) : undefined,
    nearVisionDetails: rx.nearVisionDetails,
    distanceVisionDetails: rx.distanceVisionDetails,
    lensRecommendation: rx.lensRecommendation,
    notes: rx.notes,
    createdAt: rx.createdAt.toISOString(),
  }));
}

export async function getPrescriptionById(id: string) {
  const rx = await prisma.prescription.findUnique({
    where: { id },
    include: { customer: true },
  });
  if (!rx) return null;

  return {
    id: rx.id,
    prescriptionCode: rx.prescriptionCode,
    customerId: rx.customerId,
    customerName: rx.customer.name,
    examinationDate: rx.examinationDate.toISOString().substring(0, 10),
    prescribedBy: rx.prescribedBy,
    prescriptionType: rx.prescriptionType,
    rightSph: rx.rightSph?.toString() || "",
    rightCyl: rx.rightCyl?.toString() || "",
    rightAxis: rx.rightAxis,
    rightAdd: rx.rightAdd?.toString() || "",
    rightVa: rx.rightVa || "6/6",
    rightPrism: rx.rightPrism?.toString() || "",
    rightBase: rx.rightBase || "",
    leftSph: rx.leftSph?.toString() || "",
    leftCyl: rx.leftCyl?.toString() || "",
    leftAxis: rx.leftAxis,
    leftAdd: rx.leftAdd?.toString() || "",
    leftVa: rx.leftVa || "6/6",
    leftPrism: rx.leftPrism?.toString() || "",
    leftBase: rx.leftBase || "",
    pd: rx.pd ? Number(rx.pd) : undefined,
    pdRight: rx.pdRight ? Number(rx.pdRight) : undefined,
    pdLeft: rx.pdLeft ? Number(rx.pdLeft) : undefined,
    nearVisionDetails: rx.nearVisionDetails,
    distanceVisionDetails: rx.distanceVisionDetails,
    lensRecommendation: rx.lensRecommendation,
    notes: rx.notes,
    createdAt: rx.createdAt.toISOString(),
  };
}

export async function createPrescription(data: {
  customerId: string;
  examinationDate: string;
  prescribedBy?: string;
  prescriptionType?: string;
  rightSph?: string; rightCyl?: string; rightAxis?: number;
  rightAdd?: string; rightVa?: string; rightPrism?: string; rightBase?: string;
  leftSph?: string; leftCyl?: string; leftAxis?: number;
  leftAdd?: string; leftVa?: string; leftPrism?: string; leftBase?: string;
  pd?: number; pdRight?: number; pdLeft?: number;
  nearVisionDetails?: string; distanceVisionDetails?: string;
  lensRecommendation?: string; notes?: string;
  nextExaminationDate?: string;
}) {
  try {
    if (!data.customerId) return { success: false, error: "Patient is required" };

    const customer = await prisma.customer.findUnique({ where: { id: data.customerId } });
    if (!customer) return { success: false, error: "Patient not found" };

    const user = await prisma.user.findFirst();
    if (!user) return { success: false, error: "System user not configured" };

    const rxCount = await prisma.prescription.count();
    const prescriptionCode = `RX-${(rxCount + 101).toString().padStart(4, "0")}`;

    const parseDecimal = (val?: string) => val && val.trim() !== "" ? parseFloat(val) : null;

    const rx = await prisma.prescription.create({
      data: {
        prescriptionCode,
        customerId: data.customerId,
        examinationDate: new Date(data.examinationDate || new Date()),
        prescribedBy: data.prescribedBy || null,
        prescriptionType: data.prescriptionType || "SPECTACLE",
        rightSph: parseDecimal(data.rightSph),
        rightCyl: parseDecimal(data.rightCyl),
        rightAxis: data.rightAxis || null,
        rightAdd: parseDecimal(data.rightAdd),
        rightVa: data.rightVa || null,
        rightPrism: parseDecimal(data.rightPrism),
        rightBase: data.rightBase || null,
        leftSph: parseDecimal(data.leftSph),
        leftCyl: parseDecimal(data.leftCyl),
        leftAxis: data.leftAxis || null,
        leftAdd: parseDecimal(data.leftAdd),
        leftVa: data.leftVa || null,
        leftPrism: parseDecimal(data.leftPrism),
        leftBase: data.leftBase || null,
        pd: data.pd || null,
        pdRight: data.pdRight || null,
        pdLeft: data.pdLeft || null,
        nearVisionDetails: data.nearVisionDetails || null,
        distanceVisionDetails: data.distanceVisionDetails || null,
        lensRecommendation: data.lensRecommendation || null,
        notes: data.notes || null,
        nextExaminationDate: data.nextExaminationDate ? new Date(data.nextExaminationDate) : null,
        createdById: user.id,
      },
    });

    safeRevalidatePath("/prescriptions");
    return { success: true, prescription: { ...rx, examinationDate: rx.examinationDate.toISOString().substring(0, 10), createdAt: rx.createdAt.toISOString() } };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to create prescription" };
  }
}
