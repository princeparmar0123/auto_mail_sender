import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useSuspenseQuery } from "@tanstack/react-query";
import { PageHeader } from "./_authenticated";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { sendManualEmails } from "@/lib/email.functions";
import { resumesQuery, templatesQuery } from "@/lib/queries";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/manual-send")({
  head: () => ({ meta: [{ title: "Manual email send — JobMailer AI" }] }),
  loader: async ({ context }) => {
    await Promise.all([
      context.queryClient.ensureQueryData(templatesQuery),
      context.queryClient.ensureQueryData(resumesQuery),
    ]);
  },
  component: ManualSendPage,
  errorComponent: ({ error }) => <div className="p-8 text-destructive text-sm">{error.message}</div>,
});

function parseRecipients(raw: string) {
  return [...new Set(raw.split(/[\n,;\s]+/).map((v) => v.trim()).filter(Boolean))];
}

function ManualSendPage() {
  const sendManual = useServerFn(sendManualEmails);
  const { data: templates } = useSuspenseQuery(templatesQuery);
  const { data: resumes } = useSuspenseQuery(resumesQuery);
  const [templateId, setTemplateId] = useState<string>("custom");
  const [resumeId, setResumeId] = useState<string>("none");
  const [recipientsRaw, setRecipientsRaw] = useState("");
  const [subject, setSubject] = useState("Application for {{job_title}} at {{company_name}}");
  const [body, setBody] = useState("Hi {{recruiter_name}},\n\nI wanted to reach out regarding {{job_title}} opportunities at {{company_name}}.\n\nBest regards,");
  const [recruiterName, setRecruiterName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [sending, setSending] = useState(false);

  const recipientCount = parseRecipients(recipientsRaw).length;

  function onTemplateChange(nextTemplateId: string) {
    setTemplateId(nextTemplateId);
    if (nextTemplateId === "custom") return;
    const selected = templates.find((t) => t.id === nextTemplateId);
    if (!selected) return;
    setSubject(selected.subject);
    setBody(selected.body);
  }

  async function onSend() {
    const recipients = parseRecipients(recipientsRaw);
    if (recipients.length === 0) return toast.error("Enter at least one email.");
    if (!subject.trim()) return toast.error("Subject is required.");
    if (!body.trim()) return toast.error("Body is required.");

    setSending(true);
    try {
      const res = await sendManual({
        data: {
          recipients,
          subject,
          body,
          recruiterName: recruiterName || undefined,
          companyName: companyName || undefined,
          jobTitle: jobTitle || undefined,
          resumeId: resumeId === "none" ? undefined : resumeId,
        },
      });

      if (res.failed === 0) {
        toast.success(`Sent ${res.sent}/${res.total} emails.`);
      } else {
        toast.warning(`Sent ${res.sent}/${res.total}. Failed: ${res.failed}.`);
      }
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <PageHeader
        title="Manual email send"
        description="Send one message to multiple emails with custom subject/body."
      />

      <div className="space-y-6">
        <div className="rounded-lg border border-border bg-card p-6 space-y-4">
          <div className="space-y-2">
            <Label>Use existing template</Label>
            <Select value={templateId} onValueChange={onTemplateChange}>
              <SelectTrigger>
                <SelectValue placeholder={templates.length ? "Select template" : "No templates found"} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="custom">Custom message</SelectItem>
                {templates.map((template) => (
                  <SelectItem key={template.id} value={template.id}>
                    {template.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Recipient emails (multiple)</Label>
            <Textarea
              rows={5}
              value={recipientsRaw}
              onChange={(e) => setRecipientsRaw(e.target.value)}
              placeholder={"hr@company.com, hiring@company.com\nrecruiter@company.com"}
            />
            <p className="text-xs text-muted-foreground">
              Separate emails by comma, space, or new line. Total: {recipientCount}
            </p>
          </div>

          <div className="space-y-2">
            <Label>Attach resume (optional)</Label>
            <Select value={resumeId} onValueChange={setResumeId}>
              <SelectTrigger>
                <SelectValue placeholder={resumes.length ? "Select resume" : "No resumes found"} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {resumes.map((resume) => (
                  <SelectItem key={resume.id} value={resume.id}>
                    {resume.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Recruiter name (optional)</Label>
              <Input value={recruiterName} onChange={(e) => setRecruiterName(e.target.value)} placeholder="Alex" />
            </div>
            <div className="space-y-2">
              <Label>Company name (optional)</Label>
              <Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="Acme" />
            </div>
            <div className="space-y-2">
              <Label>Job title (optional)</Label>
              <Input value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} placeholder="Frontend Engineer" />
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card p-6 space-y-4">
          <div className="space-y-2">
            <Label>Subject</Label>
            <Input value={subject} onChange={(e) => setSubject(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Body</Label>
            <Textarea rows={12} value={body} onChange={(e) => setBody(e.target.value)} />
          </div>
          <p className="text-xs text-muted-foreground">
            Supported variables: <code>{"{{recruiter_name}}"}</code>, <code>{"{{company_name}}"}</code>, <code>{"{{job_title}}"}</code>, <code>{"{{email}}"}</code>
          </p>
        </div>

        <div className="flex justify-end">
          <Button onClick={onSend} disabled={sending}>
            {sending ? "Sending..." : "Send emails"}
          </Button>
        </div>
      </div>
    </div>
  );
}
