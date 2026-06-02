import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import { templatesQuery } from "@/lib/queries";
import { PageHeader } from "./_authenticated";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { useState } from "react";
import { toast } from "sonner";
import { Pencil, Plus, Trash2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/templates")({
  head: () => ({ meta: [{ title: "Templates — JobMailer AI" }] }),
  loader: ({ context }) => context.queryClient.ensureQueryData(templatesQuery),
  component: TemplatesPage,
  errorComponent: ({ error }) => <div className="p-8 text-destructive text-sm">{error.message}</div>,
});

function TemplatesPage() {
  const { data: templates } = useSuspenseQuery(templatesQuery);
  const { user } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [subject, setSubject] = useState("Application for {{job_title}} at {{company_name}}");
  const [body, setBody] = useState("Hi {{recruiter_name}},\n\nI'm reaching out about opportunities at {{company_name}}…\n\nBest,\n");
  const [editOpen, setEditOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editSubject, setEditSubject] = useState("");
  const [editBody, setEditBody] = useState("");

  async function save() {
    if (!user) return;
    const { error } = await supabase.from("templates").insert({
      user_id: user.id, name, subject, body,
    });
    if (error) return toast.error(error.message);
    toast.success("Template saved");
    setOpen(false); setName("");
    qc.invalidateQueries({ queryKey: ["templates"] });
  }

  async function remove(id: string) {
    if (!confirm("Delete template?")) return;
    await supabase.from("templates").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["templates"] });
  }

  function startEdit(id: string, currentName: string, currentSubject: string, currentBody: string) {
    setEditingId(id);
    setEditName(currentName);
    setEditSubject(currentSubject);
    setEditBody(currentBody);
    setEditOpen(true);
  }

  async function updateTemplate() {
    if (!editingId) return;
    const { error } = await supabase
      .from("templates")
      .update({ name: editName, subject: editSubject, body: editBody, updated_at: new Date().toISOString() })
      .eq("id", editingId);
    if (error) return toast.error(error.message);
    toast.success("Template updated");
    setEditOpen(false);
    setEditingId(null);
    qc.invalidateQueries({ queryKey: ["templates"] });
  }

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader><DialogTitle>Edit template</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>Name</Label><Input value={editName} onChange={(e) => setEditName(e.target.value)} /></div>
            <div className="space-y-2"><Label>Subject</Label><Input value={editSubject} onChange={(e) => setEditSubject(e.target.value)} /></div>
            <div className="space-y-2"><Label>Body</Label><Textarea rows={10} value={editBody} onChange={(e) => setEditBody(e.target.value)} /></div>
            <p className="text-xs text-muted-foreground">Available: <code>{"{{recruiter_name}}"}</code>, <code>{"{{company_name}}"}</code>, <code>{"{{job_title}}"}</code></p>
            <div className="flex justify-end"><Button onClick={updateTemplate}>Update</Button></div>
          </div>
        </DialogContent>
      </Dialog>
      <PageHeader
        title="Templates"
        description="Reusable subject + body with {{variables}}."
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button><Plus className="size-4 mr-1" /> New template</Button></DialogTrigger>
            <DialogContent className="max-w-xl">
              <DialogHeader><DialogTitle>New template</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2"><Label>Name</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
                <div className="space-y-2"><Label>Subject</Label><Input value={subject} onChange={(e) => setSubject(e.target.value)} /></div>
                <div className="space-y-2"><Label>Body</Label><Textarea rows={10} value={body} onChange={(e) => setBody(e.target.value)} /></div>
                <p className="text-xs text-muted-foreground">Available: <code>{"{{recruiter_name}}"}</code>, <code>{"{{company_name}}"}</code>, <code>{"{{job_title}}"}</code></p>
                <div className="flex justify-end"><Button onClick={save}>Save</Button></div>
              </div>
            </DialogContent>
          </Dialog>
        }
      />
      <div className="grid gap-3">
        {templates.length === 0 && <div className="p-8 text-center text-sm text-muted-foreground border border-border rounded-lg bg-card">No templates yet.</div>}
        {templates.map((t) => (
          <div key={t.id} className="rounded-lg border border-border bg-card p-4">
            <div className="flex items-start justify-between">
              <div>
                <div className="font-medium">{t.name}</div>
                <div className="text-xs text-muted-foreground mt-0.5 truncate">{t.subject}</div>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => startEdit(t.id, t.name, t.subject, t.body)}
                  aria-label="Edit template"
                >
                  <Pencil className="size-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => remove(t.id)}><Trash2 className="size-4" /></Button>
              </div>
            </div>
            <pre className="mt-3 text-xs text-muted-foreground whitespace-pre-wrap font-sans">{t.body.slice(0, 240)}{t.body.length > 240 ? "…" : ""}</pre>
          </div>
        ))}
      </div>
    </div>
  );
}