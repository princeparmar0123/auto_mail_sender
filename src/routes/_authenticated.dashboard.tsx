import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { dashboardStatsQuery } from "@/lib/queries";
import { PageHeader } from "./_authenticated";
import { Button } from "@/components/ui/button";
import { Send, CheckCircle2, XCircle, Clock, Plus } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — JobMailer AI" }] }),
  loader: ({ context }) => context.queryClient.ensureQueryData(dashboardStatsQuery),
  component: DashboardPage,
  errorComponent: ({ error }) => <div className="p-8 text-sm text-destructive">{error.message}</div>,
});

function StatCard({ label, value, icon: Icon, tint }: { label: string; value: number | string; icon: React.ComponentType<{ className?: string }>; tint: string }) {
  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <div className="flex items-center justify-between">
        <span className="text-xs uppercase tracking-wide text-muted-foreground">{label}</span>
        <Icon className={`size-4 ${tint}`} />
      </div>
      <div className="mt-3 text-3xl font-semibold tracking-tight">{value}</div>
    </div>
  );
}

function DashboardPage() {
  const { data } = useSuspenseQuery(dashboardStatsQuery);
  const { totals, campaigns } = data;
  return (
    <div className="p-8 max-w-6xl mx-auto">
      <PageHeader
        title="Dashboard"
        description="Overview of your outreach activity."
        actions={
          <Link to="/campaigns/new">
            <Button><Plus className="size-4 mr-1" /> New campaign</Button>
          </Link>
        }
      />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Campaigns" value={totals.totalCampaigns} icon={Send} tint="text-primary" />
        <StatCard label="Sent" value={totals.sent} icon={CheckCircle2} tint="text-emerald-400" />
        <StatCard label="Failed" value={totals.failed} icon={XCircle} tint="text-destructive" />
        <StatCard label="Pending" value={totals.pending} icon={Clock} tint="text-amber-400" />
      </div>

      <div className="mt-10">
        <h2 className="text-sm font-medium text-muted-foreground mb-3">Recent campaigns</h2>
        <div className="rounded-lg border border-border bg-card divide-y divide-border">
          {campaigns.length === 0 && (
            <div className="p-8 text-center text-sm text-muted-foreground">
              No campaigns yet. <Link to="/campaigns/new" className="text-primary hover:underline">Create your first.</Link>
            </div>
          )}
          {campaigns.slice(0, 8).map((c) => (
            <Link key={c.id} to="/campaigns/$id" params={{ id: c.id }} className="flex items-center justify-between p-4 hover:bg-secondary/40">
              <div>
                <div className="text-sm font-medium">Campaign {c.id.slice(0, 8)}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{new Date(c.created_at).toLocaleString()}</div>
              </div>
              <div className="flex items-center gap-4 text-xs">
                <span className="px-2 py-0.5 rounded-full border border-border bg-background/40 text-muted-foreground capitalize">{c.status}</span>
                <span className="text-muted-foreground">{c.sent_count}/{c.total_recipients} sent</span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}