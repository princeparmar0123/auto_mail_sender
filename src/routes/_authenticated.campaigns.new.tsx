import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { templatesQuery, resumesQuery } from "@/lib/queries";
import { parseCsv, validateRecipients, type ValidatedRecipient } from "@/lib/csv";
import { PageHeader } from "./_authenticated";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { CheckCircle2, AlertCircle, Upload } from "lucide-react";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/_authenticated/campaigns/new")({
  head: () => ({ meta: [{ title: "New campaign — JobMailer AI" }] }),
  component: NewCampaign,
});

function NewCampaign() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: templates = [] } = useQuery(templatesQuery);
  const { data: resumes = [] } = useQuery(resumesQuery);

  const [name, setName] = useState("");
  const [templateId, setTemplateId] = useState<string>("");
  const [resumeId, setResumeId] = useState<string>("none");
  const [parsed, setParsed] = useState<{ valid: ValidatedRecipient[]; invalid: ValidatedRecipient[]; duplicates: number } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const rows = parseCsv(String(reader.result));
        const result = validateRecipients(rows);
        setParsed(result);
        toast.success(`Parsed ${result.valid.length} valid recipients`);
      } catch (err) {
        toast.error("Could not parse CSV");
      }
    };
    reader.readAsText(file);
  }

  async function onCreate() {
    if (!name.trim()) return toast.error("Name your campaign");
    if (!templateId) return toast.error("Pick a template");
    if (!parsed || parsed.valid.length === 0) return toast.error("Upload a CSV with valid recipients");
    if (!user) return;
    setSubmitting(true);
    const { data: campaign, error } = await supabase
      .from("campaigns")
      .insert({
        user_id: user.id,
        name,
        template_id: templateId,
        resume_id: resumeId === "none" ? null : resumeId,
        total_recipients: parsed.valid.length,
        status: "draft",
      })
      .select()
      .single();
    if (error || !campaign) {
      setSubmitting(false);
      return toast.error(error?.message ?? "Failed to create");
    }
    const recipientRows = parsed.valid.map((r) => ({
      campaign_id: campaign.id,
      user_id: user.id,
      email: r.email,
      company_name: r.company_name || null,
      recruiter_name: r.recruiter_name || null,
      job_title: r.job_title || null,
    }));
    const { error: rErr } = await supabase.from("campaign_recipients").insert(recipientRows);
    setSubmitting(false);
    if (rErr) return toast.error(rErr.message);
    toast.success("Campaign created");
    navigate({ to: "/campaigns/$id", params: { id: campaign.id } });
  }

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <PageHeader title="New campaign" description="Upload a CSV, choose a template, launch." />

      <div className="space-y-6">
        <div className="rounded-lg border border-border bg-card p-6 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Campaign name</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Frontend roles — SF Q2" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Template</Label>
              <Select value={templateId} onValueChange={setTemplateId}>
                <SelectTrigger><SelectValue placeholder={templates.length ? "Select template" : "Create one first"} /></SelectTrigger>
                <SelectContent>
                  {templates.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Resume (optional)</Label>
              <Select value={resumeId} onValueChange={setResumeId}>
                <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {resumes.map((r) => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card p-6">
          <Label className="mb-3 block">Recipients CSV</Label>
          <p className="text-xs text-muted-foreground mb-3">
            Columns: <code className="text-foreground">email, company_name, recruiter_name, job_title</code>. Only <code>email</code> is required.
          </p>
          <label className="flex items-center justify-center gap-2 rounded-md border border-dashed border-border bg-background/40 p-8 cursor-pointer hover:bg-background/60">
            <Upload className="size-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Click to upload CSV</span>
            <input type="file" accept=".csv" className="hidden" onChange={onFile} />
          </label>

          {parsed && (
            <div className="mt-4 grid grid-cols-3 gap-3 text-sm">
              <div className="rounded-md border border-border p-3">
                <div className="flex items-center gap-1.5 text-emerald-400"><CheckCircle2 className="size-4" /> Valid</div>
                <div className="text-2xl font-semibold mt-1">{parsed.valid.length}</div>
              </div>
              <div className="rounded-md border border-border p-3">
                <div className="flex items-center gap-1.5 text-destructive"><AlertCircle className="size-4" /> Invalid</div>
                <div className="text-2xl font-semibold mt-1">{parsed.invalid.length}</div>
              </div>
              <div className="rounded-md border border-border p-3">
                <div className="text-muted-foreground">Duplicates</div>
                <div className="text-2xl font-semibold mt-1">{parsed.duplicates}</div>
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end">
          <Button onClick={onCreate} disabled={submitting}>{submitting ? "Creating…" : "Create campaign"}</Button>
        </div>
      </div>
    </div>
  );
}