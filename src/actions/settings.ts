"use server";

import { safeRevalidatePath } from "@/lib/revalidate";
import {
  readCollection,
  writeCollection,
  BusinessSettings,
  AuditLogEntry,
  getInitialBusinessSettings,
  initializeStoreIfEmpty,
} from "@/lib/store";
import { validateGSTINFormat } from "@/lib/gst";

export async function getBusinessSettings(): Promise<BusinessSettings> {
  initializeStoreIfEmpty();
  const settingsList = readCollection<BusinessSettings>("business_settings", []);
  if (settingsList.length === 0) {
    const init = getInitialBusinessSettings();
    writeCollection("business_settings", [init]);
    return init;
  }
  return settingsList[0];
}

export async function updateBusinessSettings(
  data: Partial<BusinessSettings>
): Promise<{ success: boolean; settings?: BusinessSettings; error?: string; warning?: string }> {
  try {
    initializeStoreIfEmpty();
    const current = await getBusinessSettings();

    let warning: string | undefined = undefined;
    if (data.gstin && data.gstin.trim() !== "") {
      const gstinVal = validateGSTINFormat(data.gstin);
      if (!gstinVal.isValid) {
        warning = gstinVal.message;
      }
    }

    const updated: BusinessSettings = {
      ...current,
      ...data,
    };

    writeCollection("business_settings", [updated]);

    // Audit log
    const auditLogs = readCollection<AuditLogEntry>("audit_logs", []);
    auditLogs.push({
      id: `audit-${Date.now()}`,
      eventType: "UPDATE_SETTINGS",
      module: "settings",
      description: `Updated business profile and invoice settings`,
      createdAt: new Date().toISOString(),
    });
    writeCollection("audit_logs", auditLogs);

    safeRevalidatePath("/settings");
    safeRevalidatePath("/billing");
    return { success: true, settings: updated, warning };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to update business settings" };
  }
}
