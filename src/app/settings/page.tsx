import { getBusinessSettings } from "@/actions/settings";
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { SettingsClientForm } from "./settings-form";

export const revalidate = 0;

export default async function SettingsPage() {
  const settings = await getBusinessSettings();

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Business Profile & Billing Configuration
          </h1>
          <p className="text-sm text-slate-500">
            Configure legal identity, Indian GST registration, invoice numbering prefix, and store policies
          </p>
        </div>

        <SettingsClientForm initialSettings={settings} />
      </div>
    </AppShell>
  );
}
