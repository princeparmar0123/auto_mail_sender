import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { logsQuery } from "@/lib/queries";
import { PageHeader } from "./_authenticated";

export const Route = createFileRoute("/_authenticated/logs")({
  head: () => ({ meta: [{ title: "Email logs — JobMailer AI" }] }),
  loader: ({ context }) => context.queryClient.ensureQueryData(logsQuery),
  component: LogsPage,
  errorComponent: ({ error }) => <div className="p-8 text-destructive text-sm">{error.message}</div>,
});

function LogsPage() {
  const { data: logs } = useSuspenseQuery(logsQuery);
  return (
    <div className="p-8 max-w-5xl mx-auto">
      <PageHeader title="Email logs" description="Recent send activity (last 200)." />
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-secondary/40 text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="text-left px-4 py-2">When</th>
              <th className="text-left px-4 py-2">Recipient</th>
              <th className="text-left px-4 py-2">Company</th>
              <th className="text-left px-4 py-2">Status</th>
              <th className="text-left px-4 py-2">Error</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {logs.length === 0 && (
              <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">No activity yet.</td></tr>
            )}
            {logs.map((l) => (
              <tr key={l.id}>
                <td className="px-4 py-2 text-xs text-muted-foreground">{new Date(l.created_at).toLocaleString()}</td>
                <td className="px-4 py-2 font-mono text-xs">{l.recipient_email}</td>
                <td className="px-4 py-2">{l.company_name ?? "—"}</td>
                <td className="px-4 py-2 capitalize">
                  <span className={l.status === "sent" ? "text-emerald-400" : "text-destructive"}>{l.status}</span>
                </td>
                <td className="px-4 py-2 text-xs text-muted-foreground">{l.error_message ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}