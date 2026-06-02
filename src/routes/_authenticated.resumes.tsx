import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import { resumesQuery } from "@/lib/queries";
import { PageHeader } from "./_authenticated";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { useState } from "react";
import { toast } from "sonner";
import { Upload, Trash2, FileText } from "lucide-react";

export const Route = createFileRoute("/_authenticated/resumes")({
  head: () => ({ meta: [{ title: "Resumes — JobMailer AI" }] }),
  loader: ({ context }) => context.queryClient.ensureQueryData(resumesQuery),
  component: ResumesPage,
  errorComponent: ({ error }) => <div className="p-8 text-destructive text-sm">{error.message}</div>,
});

function ResumesPage() {
  const { data: resumes } = useSuspenseQuery(resumesQuery);
  const { user } = useAuth();
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (file.size > 10 * 1024 * 1024) return toast.error("Max 10 MB");
    setBusy(true);
    const path = `${user.id}/${Date.now()}-${file.name}`;
    const { error: uErr } = await supabase.storage.from("resumes").upload(path, file);
    if (uErr) { setBusy(false); return toast.error(uErr.message); }
    const { error } = await supabase.from("resumes").insert({
      user_id: user.id,
      name: file.name,
      storage_path: path,
      file_size: file.size,
      mime_type: file.type,
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Uploaded");
    qc.invalidateQueries({ queryKey: ["resumes"] });
  }

  async function remove(id: string, path: string) {
    if (!confirm("Delete resume?")) return;
    await supabase.storage.from("resumes").remove([path]);
    await supabase.from("resumes").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["resumes"] });
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <PageHeader
        title="Resumes"
        description="Attach a resume to outgoing campaigns."
        actions={
          <label className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium cursor-pointer hover:opacity-90">
            <Upload className="size-4" /> {busy ? "Uploading…" : "Upload"}
            <input type="file" accept=".pdf,.doc,.docx" className="hidden" onChange={onFile} disabled={busy} />
          </label>
        }
      />
      <div className="grid gap-3">
        {resumes.length === 0 && <div className="p-8 text-center text-sm text-muted-foreground border border-border rounded-lg bg-card">No resumes uploaded.</div>}
        {resumes.map((r) => (
          <div key={r.id} className="flex items-center justify-between rounded-lg border border-border bg-card p-4">
            <div className="flex items-center gap-3 min-w-0">
              <FileText className="size-5 text-muted-foreground shrink-0" />
              <div className="min-w-0">
                <div className="font-medium truncate">{r.name}</div>
                <div className="text-xs text-muted-foreground">{((r.file_size ?? 0) / 1024).toFixed(0)} KB · {new Date(r.created_at).toLocaleDateString()}</div>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={() => remove(r.id, r.storage_path)}><Trash2 className="size-4" /></Button>
          </div>
        ))}
      </div>
    </div>
  );
}