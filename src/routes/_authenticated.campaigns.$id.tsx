import { createFileRoute, useParams } from "@tanstack/react-router";
import { useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import { campaignDetailQuery } from "@/lib/queries";
import { PageHeader } from "./_authenticated";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Play, Pause, RotateCw, Trash2 } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { sendNextBatch } from "@/lib/campaigns.functions";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { templatesQuery } from "@/lib/queries";
import { useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/_authenticated/campaigns/$id")({
  head: () => ({ meta: [{ title: "Campaign — JobMailer AI" }] }),
  loader: ({ context, params }) => context.queryClient.ensureQueryData(campaignDetailQuery(params.id)),
  component: CampaignDetail,
  errorComponent: ({ error }) => <div className="p-8 text-destructive text-sm">{error.message}</div>,
});

function CampaignDetail() {
  const { id } = useParams({ from: "/_authenticated/campaigns/$id" });
  const { data } = useSuspenseQuery(campaignDetailQuery(id));
  const { data: templates = [] } = useQuery(templatesQuery);
  const qc = useQueryClient();
  const navigate = useNavigate();
  const send = useServerFn(sendNextBatch);
  const [busy, setBusy] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);

  if (!data.campaign) return <div className="p-8">Not found.</div>;
  const c = data.campaign;

  function renderTemplate(template: string, vars: Record<string, string>) {
    return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, k) => vars[k] ?? "");
  }

  async function changeStatus(status: "draft" | "sending" | "paused" | "completed" | "failed") {
    const { error } = await supabase.from("campaigns").update({ status }).eq("id", id);
    if (error) {
      toast.error(error.message);
      return false;
    }
    qc.invalidateQueries({ queryKey: ["campaign", id] });
    return true;
  }

  async function run() {
    setBusy(true);
    try {
      const res = await send({ data: { campaignId: id } });
      toast.success(`Processed ${res.processed} (${res.sent} sent, ${res.failed} failed)`);
      qc.invalidateQueries({ queryKey: ["campaign", id] });
      qc.invalidateQueries({ queryKey: ["email-logs"] });
    } catch (e) {
      toast.error((e as Error).message);
    } finally { setBusy(false); }
  }

  async function startCampaign() {
    const changed = await changeStatus("sending");
    if (!changed) return;
    setPreviewOpen(false);
    await run();
  }

  async function remove() {
    if (!confirm("Delete this campaign?")) return;
    await supabase.from("campaign_recipients").delete().eq("campaign_id", id);
    await supabase.from("campaigns").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["campaigns"] });
    navigate({ to: "/campaigns" });
  }

  const counts = {
    pending: data.recipients.filter((r) => r.status === "pending").length,
    sent: data.recipients.filter((r) => r.status === "sent").length,
    failed: data.recipients.filter((r) => r.status === "failed").length,
  };
  const firstRecipient = data.recipients.find((r) => r.status === "pending") ?? data.recipients[0];
  const selectedTemplate = templates.find((t) => t.id === c.template_id);
  const previewVars: Record<string, string> = {
    recruiter_name: firstRecipient?.recruiter_name ?? "there",
    company_name: firstRecipient?.company_name ?? "your company",
    job_title: firstRecipient?.job_title ?? "the role",
    email: firstRecipient?.email ?? "",
  };
  const previewSubject = selectedTemplate
    ? renderTemplate(selectedTemplate.subject, previewVars)
    : "Application";
  const previewBody = selectedTemplate
    ? renderTemplate(selectedTemplate.body, previewVars)
    : "";

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <PageHeader
        title={c.name}
        description={`Created ${new Date(c.created_at).toLocaleString()}`}
        badge={c.status}
        actions={
          <div className="flex gap-2">
            {c.status !== "sending" && (
              <Button onClick={() => setPreviewOpen(true)} disabled={busy}>
                <Play className="size-4 mr-1" /> {busy ? "Sending…" : "Run batch"}
              </Button>
            )}
            {c.status === "sending" && (
              <Button variant="outline" onClick={() => changeStatus("paused")}>
                <Pause className="size-4 mr-1" /> Pause
              </Button>
            )}
            <Button variant="outline" onClick={run} disabled={busy}>
              <RotateCw className="size-4 mr-1" /> Process next
            </Button>
            <Button variant="ghost" onClick={remove}><Trash2 className="size-4" /></Button>
          </div>
        }
      />

      <div className="grid grid-cols-4 gap-3 mb-8">
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="text-xs text-muted-foreground">Total</div>
          <div className="text-2xl font-semibold mt-1">{c.total_recipients}</div>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="text-xs text-amber-400">Pending</div>
          <div className="text-2xl font-semibold mt-1">{counts.pending}</div>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="text-xs text-emerald-400">Sent</div>
          <div className="text-2xl font-semibold mt-1">{counts.sent}</div>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="text-xs text-destructive">Failed</div>
          <div className="text-2xl font-semibold mt-1">{counts.failed}</div>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-secondary/40 text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="text-left px-4 py-2">Email</th>
              <th className="text-left px-4 py-2">Company</th>
              <th className="text-left px-4 py-2">Recruiter</th>
              <th className="text-left px-4 py-2">Status</th>
              <th className="text-left px-4 py-2">Sent at</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {data.recipients.map((r) => (
              <tr key={r.id}>
                <td className="px-4 py-2 font-mono text-xs">{r.email}</td>
                <td className="px-4 py-2">{r.company_name ?? "—"}</td>
                <td className="px-4 py-2">{r.recruiter_name ?? "—"}</td>
                <td className="px-4 py-2 capitalize">
                  <span className={
                    r.status === "sent" ? "text-emerald-400" :
                    r.status === "failed" ? "text-destructive" :
                    r.status === "pending" ? "text-amber-400" : "text-muted-foreground"
                  }>{r.status}</span>
                </td>
                <td className="px-4 py-2 text-muted-foreground text-xs">{r.sent_at ? new Date(r.sent_at).toLocaleString() : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Email preview before sending</DialogTitle>
            <DialogDescription>
              This is how the first recipient will receive the message.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 overflow-y-auto pr-1">
            <div className="rounded-md border border-border bg-card p-3 text-sm">
              <div><span className="text-muted-foreground">To:</span> {firstRecipient?.email ?? "No recipients found"}</div>
              <div><span className="text-muted-foreground">Subject:</span> {previewSubject}</div>
            </div>

            <div className="rounded-md border border-border bg-card p-4 max-h-[50vh] overflow-y-auto">
              <pre className="whitespace-pre-wrap break-words text-sm font-sans">{previewBody || "No email body content."}</pre>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setPreviewOpen(false)}>Cancel</Button>
            <Button onClick={startCampaign} disabled={busy || !firstRecipient}>
              {busy ? "Sending…" : "Start campaign"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}