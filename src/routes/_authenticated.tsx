import { createFileRoute, Outlet, Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import {
  Mail, LayoutDashboard, Send, FileText, FileUp, Settings, ListChecks, LogOut, Sparkles, SendHorizonal,
} from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated")({
  component: AuthenticatedLayout,
});

const nav = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/campaigns", label: "Campaigns", icon: Send },
  { to: "/manual-send", label: "Manual email send", icon: SendHorizonal },
  { to: "/templates", label: "Templates", icon: FileText },
  { to: "/resumes", label: "Resumes", icon: FileUp },
  { to: "/logs", label: "Email logs", icon: ListChecks },
  { to: "/settings", label: "Settings", icon: Settings },
] as const;

function AuthenticatedLayout() {
  const { isAuthenticated, isLoading, user, signOut } = useAuth();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate({ to: "/login", replace: true });
    }
  }, [isLoading, isAuthenticated, navigate]);

  if (isLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen grid place-items-center bg-background">
        <div className="text-sm text-muted-foreground">Loading…</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-background text-foreground">
      <aside className="w-60 shrink-0 border-r border-border bg-card/40 flex flex-col">
        <Link to="/dashboard" className="flex items-center gap-2 px-5 py-5">
          <div className="size-8 rounded-md bg-gradient-to-br from-primary to-primary-glow grid place-items-center">
            <Mail className="size-4 text-primary-foreground" />
          </div>
          <span className="font-semibold">JobMailer AI</span>
        </Link>
        <nav className="flex-1 px-3 space-y-0.5">
          {nav.map(({ to, label, icon: Icon }) => {
            const active = pathname === to || pathname.startsWith(to + "/");
            return (
              <Link
                key={to}
                to={to}
                className={cn(
                  "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors",
                  active
                    ? "bg-secondary text-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary/60",
                )}
              >
                <Icon className="size-4" />
                {label}
              </Link>
            );
          })}
        </nav>
        <div className="p-3 border-t border-border">
          <div className="px-2 py-1.5 text-xs text-muted-foreground truncate">{user?.email}</div>
          <button
            onClick={async () => { await signOut(); navigate({ to: "/login" }); }}
            className="w-full mt-1 flex items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-secondary/60"
          >
            <LogOut className="size-4" /> Sign out
          </button>
        </div>
      </aside>
      <main className="flex-1 min-w-0 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}

// Shared page header
export function PageHeader({
  title, description, actions, badge,
}: { title: string; description?: string; actions?: React.ReactNode; badge?: string }) {
  return (
    <div className="flex items-start justify-between gap-4 mb-8">
      <div>
        {badge && (
          <div className="inline-flex items-center gap-1.5 mb-2 text-xs px-2 py-0.5 rounded-full border border-border bg-card/50 text-muted-foreground">
            <Sparkles className="size-3" /> {badge}
          </div>
        )}
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions}
    </div>
  );
}