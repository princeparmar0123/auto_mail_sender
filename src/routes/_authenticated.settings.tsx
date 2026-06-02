import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import { settingsQuery } from "@/lib/queries";
import { PageHeader } from "./_authenticated";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { testSmtpSettings } from "@/lib/email.functions";
import { useServerFn } from "@tanstack/react-start";

const SMTP_PRESETS = {
  gmail: { host: "smtp.gmail.com", port: 587 },
  outlook: { host: "smtp-mail.outlook.com", port: 587 },
  custom: { host: "", port: 587 },
} as const;

type ProviderPreset = keyof typeof SMTP_PRESETS;

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({ meta: [{ title: "Settings — JobMailer AI" }] }),
  loader: ({ context }) => context.queryClient.ensureQueryData(settingsQuery),
  component: SettingsPage,
  errorComponent: ({ error }) => <div className="p-8 text-destructive text-sm">{error.message}</div>,
});

function SettingsPage() {
  const { data: settings } = useSuspenseQuery(settingsQuery);
  const { user } = useAuth();
  const qc = useQueryClient();
  const testSmtp = useServerFn(testSmtpSettings);

  const [senderName, setSenderName] = useState(settings?.sender_name ?? "");
  const [fromEmail, setFromEmail] = useState(settings?.from_email ?? "");
  const [smtpHost, setSmtpHost] = useState(settings?.smtp_host ?? "");
  const [smtpPort, setSmtpPort] = useState(String(settings?.smtp_port ?? 587));
  const [smtpUsername, setSmtpUsername] = useState(settings?.smtp_username ?? "");
  const [smtpPassword, setSmtpPassword] = useState("");
  const [openaiKey, setOpenaiKey] = useState(settings?.openai_api_key ?? "");
  const [provider, setProvider] = useState<ProviderPreset>(
    settings?.provider === "outlook" ? "outlook" : settings?.provider === "custom" ? "custom" : "gmail",
  );
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    setSenderName(settings?.sender_name ?? "");
    setFromEmail(settings?.from_email ?? "");
    setSmtpHost(settings?.smtp_host ?? SMTP_PRESETS.gmail.host);
    setSmtpPort(String(settings?.smtp_port ?? 587));
    setSmtpUsername(settings?.smtp_username ?? "");
    setOpenaiKey(settings?.openai_api_key ?? "");
    setProvider(
      settings?.provider === "outlook" ? "outlook" : settings?.provider === "custom" ? "custom" : "gmail",
    );
  }, [settings]);

  function applyPreset(next: ProviderPreset) {
    setProvider(next);
    const preset = SMTP_PRESETS[next];
    setSmtpHost(preset.host);
    setSmtpPort(String(preset.port));
  }

  async function save(): Promise<boolean> {
    if (!user) return false;
    setSaving(true);
    const payload = {
      user_id: user.id,
      sender_name: senderName,
      from_email: fromEmail,
      smtp_host: smtpHost,
      smtp_port: Number(smtpPort) || 587,
      smtp_username: smtpUsername,
      openai_api_key: openaiKey,
      provider,
      updated_at: new Date().toISOString(),
    };
    const passwordPayload = smtpPassword.trim()
      ? { ...payload, smtp_password: smtpPassword }
      : payload;

    const { error } = settings
      ? await supabase.from("smtp_settings").update(passwordPayload).eq("user_id", user.id)
      : await supabase.from("smtp_settings").insert({
          ...passwordPayload,
          smtp_password: smtpPassword,
        });
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return false;
    }
    toast.success("Saved");
    setSmtpPassword("");
    qc.invalidateQueries({ queryKey: ["smtp-settings"] });
    return true;
  }

  async function testConnection() {
    setTesting(true);
    try {
      const needsSave = smtpPassword.trim() || !settings?.smtp_password;
      if (needsSave && !(await save())) return;

      const res = await testSmtp({ data: {} });
      toast.success(`Test email sent to ${res.sentTo}`);
      qc.invalidateQueries({ queryKey: ["smtp-settings"] });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setTesting(false);
    }
  }

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <PageHeader title="Settings" description="SMTP delivery and AI personalization." />

      <div className="rounded-lg border border-border bg-card p-6 space-y-4">
        <h2 className="font-medium">Email delivery (SMTP)</h2>
        <div className="space-y-2">
          <Label>Provider</Label>
          <Select value={provider} onValueChange={(v) => applyPreset(v as ProviderPreset)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="gmail">Gmail</SelectItem>
              <SelectItem value="outlook">Outlook / Hotmail</SelectItem>
              <SelectItem value="custom">Custom SMTP</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2"><Label>Sender name</Label><Input value={senderName} onChange={(e) => setSenderName(e.target.value)} placeholder="Jane Doe" /></div>
        <div className="space-y-2"><Label>From email</Label><Input type="email" value={fromEmail} onChange={(e) => setFromEmail(e.target.value)} placeholder="jane@gmail.com" /></div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-2"><Label>SMTP host</Label><Input value={smtpHost} onChange={(e) => setSmtpHost(e.target.value)} placeholder="smtp.gmail.com" /></div>
          <div className="space-y-2"><Label>SMTP port</Label><Input type="number" value={smtpPort} onChange={(e) => setSmtpPort(e.target.value)} placeholder="587" /></div>
        </div>
        <div className="space-y-2"><Label>SMTP username</Label><Input value={smtpUsername} onChange={(e) => setSmtpUsername(e.target.value)} placeholder="your.email@gmail.com" /></div>
        <div className="space-y-2">
          <Label>SMTP password</Label>
          <Input type="password" value={smtpPassword} onChange={(e) => setSmtpPassword(e.target.value)} placeholder={settings?.smtp_password ? "•••••••• (leave blank to keep)" : "App password"} />
        </div>
        <p className="text-xs text-muted-foreground">
          For Gmail, use an <a href="https://myaccount.google.com/apppasswords" className="underline" target="_blank" rel="noreferrer">App Password</a> (not your regular password). Port 587 with TLS is recommended.
        </p>
        {settings?.last_tested_at && (
          <p className="text-xs text-emerald-400">Last tested {new Date(settings.last_tested_at).toLocaleString()}</p>
        )}
      </div>

      <div className="rounded-lg border border-border bg-card p-6 space-y-4 mt-4">
        <h2 className="font-medium">AI personalization</h2>
        <div className="space-y-2"><Label>OpenAI API key</Label><Input type="password" value={openaiKey} onChange={(e) => setOpenaiKey(e.target.value)} placeholder="sk-…" /></div>
        <p className="text-xs text-muted-foreground">Stored securely on your account. Used only when a campaign opts into AI personalization.</p>
      </div>

      <div className="flex justify-end gap-2 mt-6">
        <Button variant="outline" onClick={testConnection} disabled={testing || saving}>
          {testing ? "Testing…" : "Send test email"}
        </Button>
        <Button onClick={save} disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
      </div>
    </div>
  );
}
