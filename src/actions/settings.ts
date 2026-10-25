"use server";

import { prisma } from "@/lib/prisma";
import { safeRevalidatePath } from "@/lib/revalidate";
import { validateGSTINFormat } from "@/lib/gst";

export async function getBusinessSettings() {
  const business = await prisma.business.findFirst();
  if (!business) {
    return {
      name: "LensArt Optical Store",
      legalName: "LensArt Vision Care",
      address: "Shop No. 12, Upper Bazar, Main Road",
      city: "Ranchi",
      state: "Jharkhand",
      stateCode: "20",
      pinCode: "834001",
      phone: "+91 98350 12345",
      email: "contact@lensart.in",
      gstin: "20AABCL1234F1Z8",
      isGstRegistered: true,
      invoicePrefix: "LA/2026-27/",
      invoiceNextNumber: 1,
      orderPrefix: "ORD-26",
      orderNextNumber: 201,
      patientPrefix: "PT",
      patientNextNumber: 501,
      financialYear: "2026-2027",
      defaultPaymentMethods: ["UPI", "CASH", "CARD", "BANK_TRANSFER"],
      invoiceFooter: "Thank you for choosing LensArt!",
      returnPolicy: "",
      warrantyPolicy: "",
      termsAndConditions: "Subject to Ranchi jurisdiction.",
      signatory: "Authorized Signatory",
    };
  }

  return {
    name: business.name,
    legalName: business.legalName || "",
    address: business.address || "",
    city: business.city || "Ranchi",
    state: business.state || "Jharkhand",
    stateCode: business.stateCode || "20",
    pinCode: business.pinCode || "834001",
    phone: business.phone || "",
    email: business.email || "",
    gstin: business.gstin || "",
    isGstRegistered: business.isGstRegistered,
    invoicePrefix: business.invoicePrefix || "LA/2026-27/",
    invoiceNextNumber: business.invoiceNextNumber,
    orderPrefix: "ORD-26",
    orderNextNumber: 201,
    patientPrefix: "PT",
    patientNextNumber: 501,
    financialYear: "2026-2027",
    defaultPaymentMethods: business.defaultPaymentMethods || ["UPI", "CASH", "CARD", "BANK_TRANSFER"],
    invoiceFooter: business.invoiceFooter || "",
    returnPolicy: business.returnPolicy || "",
    warrantyPolicy: business.warrantyPolicy || "",
    termsAndConditions: business.termsAndConditions || "",
    signatory: business.signatory || "Authorized Signatory",
  };
}

export async function updateBusinessSettings(data: Record<string, any>) {
  try {
    let warning: string | undefined;
    if (data.gstin?.trim()) {
      const gstinVal = validateGSTINFormat(data.gstin);
      if (!gstinVal.isValid) warning = gstinVal.message;
    }

    let business = await prisma.business.findFirst();
    if (!business) {
      business = await prisma.business.create({
        data: {
          name: data.name || "LensArt",
          legalName: data.legalName || null,
          address: data.address || null,
          city: data.city || "Ranchi",
          state: data.state || "Jharkhand",
          stateCode: data.stateCode || "20",
          pinCode: data.pinCode || null,
          phone: data.phone || null,
          email: data.email || null,
          gstin: data.gstin || null,
          isGstRegistered: data.isGstRegistered ?? true,
          invoicePrefix: data.invoicePrefix || "LA/2026-27/",
          invoiceFooter: data.invoiceFooter || null,
          signatory: data.signatory || null,
        },
      });
    } else {
      business = await prisma.business.update({
        where: { id: business.id },
        data: {
          name: data.name ?? business.name,
          legalName: data.legalName ?? business.legalName,
          address: data.address ?? business.address,
          city: data.city ?? business.city,
          state: data.state ?? business.state,
          stateCode: data.stateCode ?? business.stateCode,
          pinCode: data.pinCode ?? business.pinCode,
          phone: data.phone ?? business.phone,
          email: data.email ?? business.email,
          gstin: data.gstin ?? business.gstin,
          isGstRegistered: data.isGstRegistered ?? business.isGstRegistered,
          invoicePrefix: data.invoicePrefix ?? business.invoicePrefix,
          invoiceFooter: data.invoiceFooter ?? business.invoiceFooter,
          signatory: data.signatory ?? business.signatory,
          returnPolicy: data.returnPolicy ?? business.returnPolicy,
          warrantyPolicy: data.warrantyPolicy ?? business.warrantyPolicy,
          termsAndConditions: data.termsAndConditions ?? business.termsAndConditions,
        },
      });
    }

    safeRevalidatePath("/settings");
    const settings = await getBusinessSettings();
    return { success: true, settings, warning };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to update settings" };
  }
}

export async function getAuditLogs() {
  const logs = await prisma.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return logs.map((l) => ({
    id: l.id,
    eventType: l.eventType,
    module: l.module,
    recordType: l.recordType,
    recordId: l.recordId,
    description: l.description,
    createdAt: l.createdAt.toISOString(),
  }));
}
