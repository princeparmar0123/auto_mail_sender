import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { campaignsQuery } from "@/lib/queries";
import { PageHeader } from "./_authenticated";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export const Route = createFileRoute("/_authenticated/campaigns/")({
  head: () => ({ meta: [{ title: "Campaigns — JobMailer AI" }] }),
  loader: ({ context }) => context.queryClient.ensureQueryData(campaignsQuery),
  component: CampaignsList,
  errorComponent: ({ error }) => <div className="p-8 text-destructive text-sm">{error.message}</div>,
});

function CampaignsList() {
  const { data: campaigns } = useSuspenseQuery(campaignsQuery);
  return (
    <div className="p-8 max-w-6xl mx-auto">
      <PageHeader
        title="Campaigns"
        description="Every batch of recruiter outreach you've launched."
        actions={<Link to="/campaigns/new"><Button><Plus className="size-4 mr-1" /> New campaign</Button></Link>}
      />
      <div className="rounded-lg border border-border bg-card divide-y divide-border">
        {campaigns.length === 0 && (
          <div className="p-12 text-center">
            <p className="text-sm text-muted-foreground">No campaigns yet.</p>
            <Link to="/campaigns/new"><Button className="mt-4"><Plus className="size-4 mr-1" /> Create your first</Button></Link>
          </div>
        )}
        {campaigns.map((c) => (
          <Link key={c.id} to="/campaigns/$id" params={{ id: c.id }} className="flex items-center justify-between p-4 hover:bg-secondary/40">
            <div>
              <div className="font-medium">{c.name}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{new Date(c.created_at).toLocaleString()}</div>
            </div>
            <div className="flex items-center gap-4 text-xs">
              <span className="px-2 py-0.5 rounded-full border border-border capitalize text-muted-foreground">{c.status}</span>
              <span className="text-muted-foreground">{c.sent_count}/{c.total_recipients}</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}