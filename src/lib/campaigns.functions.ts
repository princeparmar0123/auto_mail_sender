import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { sendEmail, smtpConfigError, type EmailAttachment } from "@/lib/email.server";

function renderTemplate(template: string, vars: Record<string, string>) {
  return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, k) => vars[k] ?? "");
}

async function loadResumeAttachments(
  supabase: SupabaseClient<Database>,
  resumeIds: (string | null | undefined)[],
): Promise<EmailAttachment[]> {
  const uniqueIds = [...new Set(resumeIds.filter(Boolean))] as string[];
  if (uniqueIds.length === 0) return [];

  const { data: rows, error } = await supabase
    .from("resumes")
    .select("id, name, storage_path, mime_type")
    .in("id", uniqueIds);
  if (error) throw new Error(error.message);

  const attachments: EmailAttachment[] = [];
  for (const row of rows ?? []) {
    const { data: blob, error: dlErr } = await supabase.storage.from("resumes").download(row.storage_path);
    if (dlErr || !blob) continue;
    const buffer = Buffer.from(await blob.arrayBuffer());
    attachments.push({
      filename: row.name,
      content: buffer,
      contentType: row.mime_type ?? undefined,
    });
  }
  return attachments;
}

function delayMs(minSeconds: number, maxSeconds: number) {
  const min = Math.max(0, minSeconds) * 1000;
  const max = Math.max(minSeconds, maxSeconds) * 1000;
  return min + Math.floor(Math.random() * (max - min + 1));
}

export const sendNextBatch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ campaignId: z.string().uuid(), batchSize: z.number().min(1).max(50).optional() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const batchSize = data.batchSize ?? 10;

    const [{ data: campaign, error: cErr }, { data: smtpSettings, error: sErr }] = await Promise.all([
      supabase
        .from("campaigns")
        .select("*, templates(*)")
        .eq("id", data.campaignId)
        .eq("user_id", userId)
        .maybeSingle(),
      supabase.from("smtp_settings").select("*").eq("user_id", userId).maybeSingle(),
    ]);
    if (cErr) throw new Error(cErr.message);
    if (sErr) throw new Error(sErr.message);
    if (!campaign) throw new Error("Campaign not found");

    const smtpError = smtpConfigError(smtpSettings);
    if (smtpError) throw new Error(smtpError);

    if (campaign.status === "paused" || campaign.status === "completed") {
      return { processed: 0, sent: 0, failed: 0, paused: true };
    }

    const { data: recipients, error: rErr } = await supabase
      .from("campaign_recipients")
      .select("*")
      .eq("campaign_id", data.campaignId)
      .eq("status", "pending")
      .limit(batchSize);
    if (rErr) throw new Error(rErr.message);
    if (!recipients?.length) {
      return { processed: 0, sent: 0, failed: 0, paused: false };
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const template = (campaign as any).templates as { subject: string; body: string } | null;
    const attachments = await loadResumeAttachments(supabase, [campaign.resume_id, campaign.cover_letter_id]);

    let sent = 0;
    let failed = 0;

    for (let i = 0; i < recipients.length; i++) {
      const r = recipients[i];
      const vars: Record<string, string> = {
        recruiter_name: r.recruiter_name ?? "there",
        company_name: r.company_name ?? "your company",
        job_title: r.job_title ?? "the role",
        email: r.email,
      };
      const subject = template ? renderTemplate(template.subject, vars) : "Application";
      const body = template ? renderTemplate(template.body, vars) : "";

      const result = await sendEmail(smtpSettings!, {
        to: r.email,
        subject,
        body,
        attachments,
      });

      if (result.ok) {
        sent++;
        await supabase.from("campaign_recipients").update({
          status: "sent",
          sent_at: new Date().toISOString(),
          personalized_subject: subject,
          personalized_body: body,
        }).eq("id", r.id);
        await supabase.from("email_logs").insert({
          user_id: userId,
          campaign_id: data.campaignId,
          recipient_email: r.email,
          company_name: r.company_name,
          status: "sent",
        });
      } else {
        failed++;
        await supabase.from("campaign_recipients").update({
          status: "failed",
          error_message: result.error,
        }).eq("id", r.id);
        await supabase.from("email_logs").insert({
          user_id: userId,
          campaign_id: data.campaignId,
          recipient_email: r.email,
          company_name: r.company_name,
          status: "failed",
          error_message: result.error,
        });
      }

      if (i < recipients.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, delayMs(campaign.min_delay_seconds, campaign.max_delay_seconds)));
      }
    }

    const { count: pendingCount } = await supabase
      .from("campaign_recipients")
      .select("id", { count: "exact", head: true })
      .eq("campaign_id", data.campaignId)
      .eq("status", "pending");
    const isDone = pendingCount === 0;

    await supabase.from("campaigns").update({
      sent_count: (campaign.sent_count ?? 0) + sent,
      failed_count: (campaign.failed_count ?? 0) + failed,
      status: isDone ? "completed" : "sending",
      started_at: campaign.started_at ?? new Date().toISOString(),
      completed_at: isDone ? new Date().toISOString() : null,
    }).eq("id", data.campaignId);

    return { processed: recipients.length, sent, failed, paused: false };
  });
