import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const dashboardStatsQuery = queryOptions({
  queryKey: ["dashboard-stats"],
  queryFn: async () => {
    const [campaigns, logs, recipients] = await Promise.all([
      supabase.from("campaigns").select("id,status,sent_count,failed_count,total_recipients,created_at"),
      supabase.from("email_logs").select("id,status").limit(1000),
      supabase.from("campaign_recipients").select("id,status"),
    ]);
    const camps = campaigns.data ?? [];
    const sent = (logs.data ?? []).filter((l) => l.status === "sent").length;
    const failed = (logs.data ?? []).filter((l) => l.status === "failed").length;
    const pending = (recipients.data ?? []).filter((r) => r.status === "pending").length;
    return {
      campaigns: camps,
      totals: { sent, failed, pending, totalCampaigns: camps.length },
    };
  },
});

export const campaignsQuery = queryOptions({
  queryKey: ["campaigns"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("campaigns")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data ?? [];
  },
});

export const templatesQuery = queryOptions({
  queryKey: ["templates"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("templates")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data ?? [];
  },
});

export const resumesQuery = queryOptions({
  queryKey: ["resumes"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("resumes")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data ?? [];
  },
});

export const settingsQuery = queryOptions({
  queryKey: ["smtp-settings"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("smtp_settings")
      .select("*")
      .maybeSingle();
    if (error) throw error;
    return data;
  },
});

export const logsQuery = queryOptions({
  queryKey: ["email-logs"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("email_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw error;
    return data ?? [];
  },
});

export function campaignDetailQuery(id: string) {
  return queryOptions({
    queryKey: ["campaign", id],
    queryFn: async () => {
      const [c, r] = await Promise.all([
        supabase.from("campaigns").select("*").eq("id", id).maybeSingle(),
        supabase.from("campaign_recipients").select("*").eq("campaign_id", id).order("created_at"),
      ]);
      if (c.error) throw c.error;
      if (r.error) throw r.error;
      return { campaign: c.data, recipients: r.data ?? [] };
    },
  });
}