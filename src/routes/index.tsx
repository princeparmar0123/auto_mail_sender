import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { Mail, Sparkles, Zap, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "JobMailer AI — Personalized cold outreach at scale" },
      { name: "description", content: "Upload a CSV of recruiters, write one template, and send personalized job-application emails on autopilot." },
      { property: "og:title", content: "JobMailer AI" },
      { property: "og:description", content: "Personalized recruiter outreach at scale." },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <div className="min-h-screen bg-background text-foreground grid-bg">
      <header className="flex items-center justify-between px-6 py-5 max-w-7xl mx-auto">
        <div className="flex items-center gap-2">
          <div className="size-8 rounded-md bg-gradient-to-br from-primary to-primary-glow flex items-center justify-center">
            <Mail className="size-4 text-primary-foreground" />
          </div>
          <span className="font-semibold tracking-tight">JobMailer AI</span>
        </div>
        <nav className="flex items-center gap-2 text-sm">
          <Link to="/login" className="px-3 py-1.5 text-muted-foreground hover:text-foreground">Sign in</Link>
          <Link to="/signup" className="px-3 py-1.5 rounded-md bg-primary text-primary-foreground hover:opacity-90">Get started</Link>
        </nav>
      </header>

      <main className="max-w-5xl mx-auto px-6 pt-20 pb-24 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-border bg-card/50 text-xs text-muted-foreground mb-6">
          <Sparkles className="size-3" /> AI-personalized cold outreach
        </div>
        <h1 className="text-5xl sm:text-6xl font-semibold tracking-tight leading-tight">
          Land interviews on
          <span className="bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent"> autopilot.</span>
        </h1>
        <p className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto">
          Upload a CSV of recruiters, write one template, and JobMailer sends personalized
          job-application emails — with your resume attached — to every contact.
        </p>
        <div className="mt-10 flex items-center justify-center gap-3">
          <Link to="/signup" className="px-5 py-2.5 rounded-md bg-primary text-primary-foreground font-medium hover:opacity-90 shadow-glow">
            Start free
          </Link>
          <Link to="/login" className="px-5 py-2.5 rounded-md border border-border text-foreground hover:bg-accent">
            Sign in
          </Link>
        </div>

        <div className="mt-24 grid sm:grid-cols-3 gap-4 text-left">
          {[
            { icon: Zap, title: "CSV → campaign in 2 minutes", body: "Drop a CSV of recruiters and we deduplicate, validate, and queue every send." },
            { icon: Sparkles, title: "AI personalization", body: "Bring your OpenAI key. Each email is rewritten for the recipient's company and role." },
            { icon: ShieldCheck, title: "Full audit log", body: "Every send tracked. Pause, resume, or retry failed deliveries from one dashboard." },
          ].map(({ icon: Icon, title, body }) => (
            <div key={title} className="rounded-lg border border-border bg-card p-5">
              <Icon className="size-5 text-primary mb-3" />
              <h3 className="font-medium">{title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{body}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
