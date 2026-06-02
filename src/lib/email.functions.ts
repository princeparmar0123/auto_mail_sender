import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { sendEmail, verifySmtpConnection, type EmailAttachment } from "@/lib/email.server";

function renderTemplate(template: string, vars: Record<string, string>) {
  return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, k) => vars[k] ?? "");
}

export const testSmtpSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ to: z.string().email().optional() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: settings, error } = await supabase
      .from("smtp_settings")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!settings) throw new Error("Save your SMTP settings first.");

    const verify = await verifySmtpConnection(settings);
    if (!verify.ok) throw new Error(verify.error);

    const to = data.to ?? settings.from_email;
    if (!to) throw new Error("No recipient email available for test send.");

    const result = await sendEmail(settings, {
      to,
      subject: "JobMailer AI — test email",
      body: "Your SMTP settings are working. Campaign emails will be sent from this account.",
    });
    if (!result.ok) throw new Error(result.error);

    await supabase
      .from("smtp_settings")
      .update({ last_tested_at: new Date().toISOString() })
      .eq("user_id", userId);

    return { sentTo: to };
  });

export const sendManualEmails = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        recipients: z.array(z.string().email()).min(1).max(200),
        subject: z.string().min(1),
        body: z.string().min(1),
        recruiterName: z.string().optional(),
        companyName: z.string().optional(),
        jobTitle: z.string().optional(),
        resumeId: z.string().uuid().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: settings, error } = await supabase
      .from("smtp_settings")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!settings) throw new Error("Save your SMTP settings first.");

    const verify = await verifySmtpConnection(settings);
    if (!verify.ok) throw new Error(verify.error);

    const attachments: EmailAttachment[] = [];
    if (data.resumeId) {
      const { data: resume, error: resumeErr } = await supabase
        .from("resumes")
        .select("id, name, storage_path, mime_type")
        .eq("id", data.resumeId)
        .maybeSingle();
      if (resumeErr) throw new Error(resumeErr.message);
      if (!resume) throw new Error("Selected resume not found.");

      const { data: fileBlob, error: dlErr } = await supabase.storage
        .from("resumes")
        .download(resume.storage_path);
      if (dlErr || !fileBlob) throw new Error(dlErr?.message ?? "Could not download selected resume.");

      attachments.push({
        filename: resume.name,
        content: Buffer.from(await fileBlob.arrayBuffer()),
        contentType: resume.mime_type ?? undefined,
      });
    }

    let sent = 0;
    let failed = 0;
    const failures: Array<{ email: string; error: string }> = [];

    for (const email of data.recipients) {
      const vars = {
        recruiter_name: data.recruiterName ?? "there",
        company_name: data.companyName ?? "your company",
        job_title: data.jobTitle ?? "the role",
        email,
      };
      const subject = renderTemplate(data.subject, vars);
      const body = renderTemplate(data.body, vars);

      const result = await sendEmail(settings, { to: email, subject, body, attachments });

      if (result.ok) {
        sent++;
        await supabase.from("email_logs").insert({
          user_id: userId,
          campaign_id: null,
          recipient_email: email,
          company_name: data.companyName ?? null,
          status: "sent",
        });
      } else {
        failed++;
        failures.push({ email, error: result.error });
        await supabase.from("email_logs").insert({
          user_id: userId,
          campaign_id: null,
          recipient_email: email,
          company_name: data.companyName ?? null,
          status: "failed",
          error_message: result.error,
        });
      }
    }

    return { sent, failed, total: data.recipients.length, failures };
  });
