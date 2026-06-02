import nodemailer from "nodemailer";
import type { Database } from "@/integrations/supabase/types";

export type SmtpSettingsRow = Database["public"]["Tables"]["smtp_settings"]["Row"];

export type EmailAttachment = {
  filename: string;
  content: Buffer;
  contentType?: string;
};

export type SendEmailInput = {
  to: string;
  subject: string;
  body: string;
  attachments?: EmailAttachment[];
};

export function getSmtpConfig(settings: SmtpSettingsRow | null) {
  if (!settings) return null;
  if (!settings.from_email?.trim()) return null;
  if (!settings.smtp_host?.trim()) return null;
  if (!settings.smtp_port) return null;
  if (!settings.smtp_username?.trim()) return null;
  if (!settings.smtp_password?.trim()) return null;

  return {
    senderName: settings.sender_name?.trim() || undefined,
    fromEmail: settings.from_email.trim(),
    smtpHost: settings.smtp_host.trim(),
    smtpPort: settings.smtp_port,
    smtpUsername: settings.smtp_username.trim(),
    smtpPassword: settings.smtp_password,
  };
}

export function smtpConfigError(settings: SmtpSettingsRow | null): string | null {
  if (!settings) return "Configure SMTP settings before sending.";
  if (!settings.from_email?.trim()) return "From email is required in Settings.";
  if (!settings.smtp_host?.trim()) return "SMTP host is required in Settings.";
  if (!settings.smtp_port) return "SMTP port is required in Settings.";
  if (!settings.smtp_username?.trim()) return "SMTP username is required in Settings.";
  if (!settings.smtp_password?.trim()) return "SMTP password is required in Settings.";
  return null;
}

function createTransport(config: NonNullable<ReturnType<typeof getSmtpConfig>>) {
  return nodemailer.createTransport({
    host: config.smtpHost,
    port: config.smtpPort,
    secure: config.smtpPort === 465,
    auth: {
      user: config.smtpUsername,
      pass: config.smtpPassword,
    },
  });
}

export async function sendEmail(
  settings: SmtpSettingsRow,
  input: SendEmailInput,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const config = getSmtpConfig(settings);
  const configErr = smtpConfigError(settings);
  if (!config || configErr) return { ok: false, error: configErr ?? "Invalid SMTP settings." };

  const from = config.senderName
    ? `"${config.senderName}" <${config.fromEmail}>`
    : config.fromEmail;

  try {
    const transport = createTransport(config);
    await transport.sendMail({
      from,
      to: input.to,
      subject: input.subject,
      text: input.body,
      html: input.body.replace(/\n/g, "<br>"),
      attachments: input.attachments?.map((a) => ({
        filename: a.filename,
        content: a.content,
        contentType: a.contentType,
      })),
    });
    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to send email.";
    return { ok: false, error: message };
  }
}

export async function verifySmtpConnection(
  settings: SmtpSettingsRow,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const config = getSmtpConfig(settings);
  const configErr = smtpConfigError(settings);
  if (!config || configErr) return { ok: false, error: configErr ?? "Invalid SMTP settings." };

  try {
    const transport = createTransport(config);
    await transport.verify();
    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "SMTP connection failed.";
    return { ok: false, error: message };
  }
}
