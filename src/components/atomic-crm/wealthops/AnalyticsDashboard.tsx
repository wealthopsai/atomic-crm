import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/components/atomic-crm/providers/supabase/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { CallLog, RetailCommTracker } from "./types";
import {
  filterLogsByPeriod,
  computeSummaryStats,
  groupCallsByHour,
  groupCallsByDayOfWeek,
} from "./callAnalyticsUtils";
import {
  computeEmailStats,
  computeConversionFunnel,
  computePipelineVelocity,
  computeSequenceStats,
  computeTriggerEventStats,
  type ContactRow,
  type EmailDraftRow,
  type StageEventRow,
  type EnrollmentRow,
} from "./analyticsUtils";

interface LinkedInRow {
  id: number;
  draft_type: string;
  status: string;
}

const PERIODS = [
  { value: "7d", label: "7d" },
  { value: "30d", label: "30d" },
  { value: "90d", label: "90d" },
  { value: "all", label: "All Time" },
] as const;

export const AnalyticsDashboard = () => {
  const [period, setPeriod] = useState("30d");

  const {
    data: emailDrafts,
    isLoading: emailLoading,
    error: emailError,
  } = useQuery({
    queryKey: ["analytics_email_drafts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("email_drafts")
        .select("id, sequence_id, sequence_step, status");
      if (error) throw error;
      return data as EmailDraftRow[];
    },
  });

  const {
    data: linkedinDrafts,
    isLoading: linkedinLoading,
    error: linkedinError,
  } = useQuery({
    queryKey: ["analytics_linkedin_drafts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("linkedin_drafts")
        .select("id, draft_type, status");
      if (error) throw error;
      return data as LinkedInRow[];
    },
  });

  const {
    data: callLogs,
    isLoading: callsLoading,
    error: callsError,
  } = useQuery({
    queryKey: ["analytics_call_logs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("call_logs")
        .select("id, contact_id, outcome, called_at, duration_seconds")
        .order("called_at", { ascending: false });
      if (error) throw error;
      return data as CallLog[];
    },
  });

  const {
    data: contacts,
    isLoading: contactsLoading,
    error: contactsError,
  } = useQuery({
    queryKey: ["analytics_contacts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contacts")
        .select("id, current_stage, trigger_event");
      if (error) throw error;
      return data as ContactRow[];
    },
  });

  const {
    data: enrollments,
    isLoading: enrollmentsLoading,
    error: enrollmentsError,
  } = useQuery({
    queryKey: ["analytics_enrollments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sequence_enrollments")
        .select("id, sequence_id, status");
      if (error) throw error;
      return data as EnrollmentRow[];
    },
  });

  const {
    data: stageEvents,
    isLoading: eventsLoading,
    error: eventsError,
  } = useQuery({
    queryKey: ["analytics_stage_events"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("events")
        .select("event_type, contact_id, payload, created_at")
        .eq("event_type", "stage_changed");
      if (error) throw error;
      return data as StageEventRow[];
    },
  });

  const { data: retailComm } = useQuery({
    queryKey: ["analytics_retail_comm"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("retail_comm_tracker")
        .select("*")
        .order("period_end", { ascending: false })
        .limit(1)
        .single();
      if (error) throw error;
      return data as RetailCommTracker;
    },
  });

  const { data: dncCount } = useQuery({
    queryKey: ["analytics_dnc_count"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("contacts")
        .select("id", { count: "exact", head: true })
        .eq("do_not_contact", true);
      if (error) throw error;
      return count ?? 0;
    },
  });

  const { data: pendingComplianceCount } = useQuery({
    queryKey: ["analytics_pending_compliance"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("email_drafts")
        .select("id", { count: "exact", head: true })
        .eq("compliance_cleared", false)
        .not("status", "eq", "rejected");
      if (error) throw error;
      return count ?? 0;
    },
  });

  const isLoading =
    emailLoading ||
    linkedinLoading ||
    callsLoading ||
    contactsLoading ||
    enrollmentsLoading ||
    eventsLoading;

  const hasError =
    emailError ||
    linkedinError ||
    callsError ||
    contactsError ||
    enrollmentsError ||
    eventsError;

  // Compute derived data
  const filteredLogs = callLogs ? filterLogsByPeriod(callLogs, period) : [];
  const callStats = computeSummaryStats(filteredLogs);
  const hourStats = groupCallsByHour(filteredLogs);
  const dayStats = groupCallsByDayOfWeek(filteredLogs);

  const emailStats = emailDrafts ? computeEmailStats(emailDrafts) : [];
  const totalEmailDrafts = emailDrafts?.length ?? 0;
  const approvedEmails =
    emailDrafts?.filter((d) => d.status === "approved" || d.status === "sent")
      .length ?? 0;
  const sentEmails =
    emailDrafts?.filter((d) => d.status === "sent").length ?? 0;
  const emailApprovalRate =
    totalEmailDrafts > 0
      ? Math.round((approvedEmails / totalEmailDrafts) * 100)
      : 0;

  const funnel = contacts ? computeConversionFunnel(contacts) : [];
  const velocity = stageEvents ? computePipelineVelocity(stageEvents) : [];
  const seqStats = enrollments ? computeSequenceStats(enrollments) : [];
  const triggerStats = contacts ? computeTriggerEventStats(contacts) : [];

  const totalLinkedin = linkedinDrafts?.length ?? 0;
  const linkedinConnReq =
    linkedinDrafts?.filter((d) => d.draft_type === "connection_request")
      .length ?? 0;
  const linkedinDM =
    linkedinDrafts?.filter((d) => d.draft_type === "direct_message").length ??
    0;
  const linkedinSent =
    linkedinDrafts?.filter((d) => d.status === "sent").length ?? 0;
  const linkedinSendRate =
    totalLinkedin > 0 ? Math.round((linkedinSent / totalLinkedin) * 100) : 0;

  const linkedinByType = getLinkedInByType(linkedinDrafts ?? []);

  const retailCount = retailComm?.contact_count ?? 0;
  const retailColor =
    retailCount >= 25
      ? "text-red-600"
      : retailCount >= 20
        ? "text-yellow-600"
        : "text-green-600";

  const handleExportCSV = () => {
    if (!filteredLogs.length) return;
    const headers = [
      "id",
      "contact_id",
      "outcome",
      "called_at",
      "duration_seconds",
    ];
    const rows = filteredLogs.map((l) =>
      [l.id, l.contact_id, l.outcome, l.called_at, l.duration_seconds ?? ""]
        .map((v) => `"${v}"`)
        .join(","),
    );
    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `call_logs_${period}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (hasError) {
    return (
      <div className="p-6 text-center text-destructive">
        <p>Failed to load analytics data.</p>
        <Button
          variant="outline"
          className="mt-2"
          onClick={() => location.reload()}
        >
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <h1 className="text-2xl font-bold">Analytics Dashboard</h1>
        <div className="flex gap-2 flex-wrap">
          {PERIODS.map((p) => (
            <Button
              key={p.value}
              variant={period === p.value ? "default" : "outline"}
              size="sm"
              onClick={() => setPeriod(p.value)}
            >
              {p.label}
            </Button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <AnalyticsSkeleton />
      ) : (
        <>
          {/* Email Performance */}
          <section className="space-y-3">
            <h2 className="text-lg font-semibold">Email Performance</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <StatCard label="Total Drafts" value={String(totalEmailDrafts)} />
              <StatCard label="Approved" value={String(approvedEmails)} />
              <StatCard label="Sent" value={String(sentEmails)} />
              <StatCard label="Approval Rate" value={`${emailApprovalRate}%`} />
            </div>
            {emailStats.length > 0 ? (
              <div className="border rounded-lg overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left">
                      <th className="py-2 px-3 font-medium">Sequence</th>
                      <th className="py-2 px-3 font-medium">Step</th>
                      <th className="py-2 px-3 font-medium">Total</th>
                      <th className="py-2 px-3 font-medium">Approval Rate</th>
                      <th className="py-2 px-3 font-medium">Sent</th>
                    </tr>
                  </thead>
                  <tbody>
                    {emailStats.map((s) => (
                      <tr
                        key={`${s.sequenceId}-${s.sequenceStep}`}
                        className="border-b last:border-0"
                      >
                        <td className="py-2 px-3">{s.sequenceId}</td>
                        <td className="py-2 px-3">{s.sequenceStep}</td>
                        <td className="py-2 px-3">{s.total}</td>
                        <td className="py-2 px-3">
                          {Math.round(s.approvalRate * 100)}%
                        </td>
                        <td className="py-2 px-3">{s.sent}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState message="No email drafts yet." />
            )}
          </section>

          {/* Call Performance */}
          <section className="space-y-3">
            <h2 className="text-lg font-semibold">Call Performance</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <StatCard
                label="Total Calls"
                value={String(callStats.totalCalls)}
              />
              <StatCard
                label="Connect Rate"
                value={`${callStats.connectRate}%`}
              />
              <StatCard
                label="Positive Rate"
                value={
                  callStats.totalCalls > 0
                    ? `${Math.round((callStats.meetingsBooked / callStats.totalCalls) * 100)}%`
                    : "0%"
                }
              />
              <StatCard
                label="Voicemail Rate"
                value={
                  filteredLogs.length > 0
                    ? `${Math.round((filteredLogs.filter((l) => l.outcome === "voicemail").length / filteredLogs.length) * 100)}%`
                    : "0%"
                }
              />
            </div>
            {filteredLogs.length > 0 ? (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">
                      Calls by Hour of Day
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <BarChart
                      data={hourStats
                        .filter((d) => d.hour >= 6 && d.hour <= 20)
                        .map((d) => ({
                          label: formatHour(d.hour),
                          count: d.count,
                          connectRate: d.connectRate,
                        }))}
                    />
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">
                      Calls by Day of Week
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <BarChart
                      data={dayStats.map((d) => ({
                        label: d.dayLabel,
                        count: d.count,
                        connectRate: d.connectRate,
                      }))}
                    />
                  </CardContent>
                </Card>
              </>
            ) : (
              <EmptyState message="No calls logged yet. Start making calls from the Daily Call List." />
            )}
          </section>

          {/* LinkedIn Performance */}
          <section className="space-y-3">
            <h2 className="text-lg font-semibold">LinkedIn Performance</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <StatCard label="Total Drafts" value={String(totalLinkedin)} />
              <StatCard
                label="Connection Requests"
                value={String(linkedinConnReq)}
              />
              <StatCard label="Direct Messages" value={String(linkedinDM)} />
              <StatCard label="Send Rate" value={`${linkedinSendRate}%`} />
            </div>
            {linkedinByType.length > 0 ? (
              <div className="border rounded-lg overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left">
                      <th className="py-2 px-3 font-medium">Type</th>
                      <th className="py-2 px-3 font-medium">Total</th>
                      <th className="py-2 px-3 font-medium">Sent</th>
                      <th className="py-2 px-3 font-medium">Send Rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {linkedinByType.map((t) => (
                      <tr key={t.type} className="border-b last:border-0">
                        <td className="py-2 px-3">{formatDraftType(t.type)}</td>
                        <td className="py-2 px-3">{t.total}</td>
                        <td className="py-2 px-3">{t.sent}</td>
                        <td className="py-2 px-3">
                          {t.total > 0
                            ? `${Math.round((t.sent / t.total) * 100)}%`
                            : "0%"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState message="No LinkedIn drafts yet." />
            )}
          </section>

          {/* Conversion Funnel */}
          <section className="space-y-3">
            <h2 className="text-lg font-semibold">Conversion Funnel</h2>
            {funnel.some((f) => f.count > 0) ? (
              <FunnelChart stages={funnel} />
            ) : (
              <EmptyState message="No contacts in the pipeline yet." />
            )}
          </section>

          {/* Pipeline Velocity */}
          <section className="space-y-3">
            <h2 className="text-lg font-semibold">Pipeline Velocity</h2>
            <div className="border rounded-lg overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="py-2 px-3 font-medium">Stage</th>
                    <th className="py-2 px-3 font-medium">Avg Days in Stage</th>
                    <th className="py-2 px-3 font-medium">Contact Count</th>
                  </tr>
                </thead>
                <tbody>
                  {velocity.map((v) => (
                    <tr key={v.stage} className="border-b last:border-0">
                      <td className="py-2 px-3">{v.label}</td>
                      <td className="py-2 px-3">
                        {v.avgDaysInStage !== null
                          ? `${v.avgDaysInStage} days`
                          : "\u2014"}
                      </td>
                      <td className="py-2 px-3">{v.contactCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-muted-foreground">
              Based on manual stage changes. Velocity improves as more data is
              logged.
            </p>
          </section>

          {/* Sequence Comparison */}
          <section className="space-y-3">
            <h2 className="text-lg font-semibold">Sequence Comparison</h2>
            {seqStats.length > 0 ? (
              <div className="border rounded-lg overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left">
                      <th className="py-2 px-3 font-medium">Sequence</th>
                      <th className="py-2 px-3 font-medium">Enrolled</th>
                      <th className="py-2 px-3 font-medium">Active</th>
                      <th className="py-2 px-3 font-medium">Completed</th>
                      <th className="py-2 px-3 font-medium">Exited</th>
                      <th className="py-2 px-3 font-medium">Completion Rate</th>
                      <th className="py-2 px-3 font-medium">Exit Rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...seqStats]
                      .sort((a, b) => b.completionRate - a.completionRate)
                      .map((s) => (
                        <tr
                          key={s.sequenceId}
                          className="border-b last:border-0"
                        >
                          <td className="py-2 px-3">{s.sequenceId}</td>
                          <td className="py-2 px-3">{s.totalEnrolled}</td>
                          <td className="py-2 px-3">{s.activeCount}</td>
                          <td className="py-2 px-3">{s.completed}</td>
                          <td className="py-2 px-3">{s.exited}</td>
                          <td className="py-2 px-3">
                            {Math.round(s.completionRate * 100)}%
                          </td>
                          <td className="py-2 px-3">
                            {Math.round(s.exitRate * 100)}%
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState message="No sequence enrollments yet." />
            )}
          </section>

          {/* Trigger Event Analysis */}
          <section className="space-y-3">
            <h2 className="text-lg font-semibold">Trigger Event Analysis</h2>
            {triggerStats.length > 0 ? (
              <div className="border rounded-lg overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left">
                      <th className="py-2 px-3 font-medium">Trigger Event</th>
                      <th className="py-2 px-3 font-medium">Contacts</th>
                      <th className="py-2 px-3 font-medium">
                        Replied Positive
                      </th>
                      <th className="py-2 px-3 font-medium">Meeting Booked</th>
                      <th className="py-2 px-3 font-medium">Converted</th>
                      <th className="py-2 px-3 font-medium">Conv. Rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...triggerStats]
                      .sort((a, b) => b.conversionRate - a.conversionRate)
                      .map((t) => (
                        <tr
                          key={t.triggerEvent}
                          className="border-b last:border-0"
                        >
                          <td className="py-2 px-3">{t.triggerEvent}</td>
                          <td className="py-2 px-3">{t.totalContacts}</td>
                          <td className="py-2 px-3">{t.repliedPositive}</td>
                          <td className="py-2 px-3">{t.meetingBooked}</td>
                          <td className="py-2 px-3">{t.converted}</td>
                          <td className="py-2 px-3">
                            {Math.round(t.conversionRate * 100)}%
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState message="No contacts with trigger events yet." />
            )}
          </section>

          {/* Compliance Panel */}
          <section className="space-y-3">
            <h2 className="text-lg font-semibold">Compliance Panel</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Retail Comm Counter
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className={`text-2xl font-bold ${retailColor}`}>
                    {retailCount} / 25
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Period ends{" "}
                    {retailComm
                      ? new Date(retailComm.period_end).toLocaleDateString()
                      : "\u2014"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Threshold warning sent:{" "}
                    {retailComm?.threshold_warning_sent ? "Yes" : "No"}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    DNC Status
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm">
                    {dncCount === 0
                      ? "No contacts flagged do_not_contact"
                      : `${dncCount} contact${dncCount === 1 ? "" : "s"} on DNC list`}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Compliance Flags
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm">
                    {pendingComplianceCount === 0
                      ? "No drafts pending compliance review"
                      : `${pendingComplianceCount} draft${pendingComplianceCount === 1 ? "" : "s"} pending compliance review`}
                  </p>
                </CardContent>
              </Card>
            </div>
          </section>

          {/* Export */}
          <section className="space-y-3">
            <h2 className="text-lg font-semibold">Export</h2>
            <Button variant="outline" onClick={handleExportCSV}>
              Export All Data (CSV)
            </Button>
          </section>
        </>
      )}
    </div>
  );
};

// ---- Helper Components ----

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardContent className="p-4 text-center">
        <p className="text-2xl font-bold">{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </CardContent>
    </Card>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <p className="text-sm text-muted-foreground text-center py-6">{message}</p>
  );
}

function getBarColor(connectRate: number): string {
  if (connectRate > 30) return "bg-green-500";
  if (connectRate >= 15) return "bg-yellow-500";
  return "bg-blue-400";
}

function BarChart({
  data,
}: {
  data: Array<{ label: string; count: number; connectRate: number }>;
}) {
  const maxCount = Math.max(...data.map((d) => d.count), 1);

  return (
    <div className="space-y-1">
      {data.map((d) => {
        const widthPct = (d.count / maxCount) * 100;
        return (
          <div key={d.label} className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground w-12 text-right shrink-0">
              {d.label}
            </span>
            <div className="flex-1 h-5 bg-muted rounded-sm overflow-hidden">
              <div
                className={`h-full rounded-sm ${getBarColor(d.connectRate)}`}
                style={{ width: `${widthPct}%` }}
              />
            </div>
            <span className="text-xs text-muted-foreground w-24 text-right shrink-0">
              {d.count} calls {d.connectRate}%
            </span>
          </div>
        );
      })}
    </div>
  );
}

function getFunnelColor(conversionFromPrev: number): string {
  if (conversionFromPrev >= 50) return "bg-green-500";
  if (conversionFromPrev >= 25) return "bg-yellow-500";
  return "bg-red-500";
}

function FunnelChart({
  stages,
}: {
  stages: Array<{
    stage: string;
    label: string;
    count: number;
    dropoffRate: number;
    conversionRate: number;
  }>;
}) {
  const topCount = stages[0]?.count ?? 1;

  return (
    <div className="space-y-1">
      {stages.map((s, i) => {
        const widthPct = topCount > 0 ? (s.count / topCount) * 100 : 0;
        const convFromPrev = i === 0 ? 100 : 100 - s.dropoffRate;
        return (
          <div key={s.stage}>
            <div className="flex items-center gap-3">
              <span className="text-xs w-32 text-right shrink-0 truncate">
                {s.label}
              </span>
              <div className="flex-1 h-6 bg-muted rounded-sm overflow-hidden">
                <div
                  className={`h-full rounded-sm ${getFunnelColor(convFromPrev)}`}
                  style={{ width: `${Math.max(widthPct, 2)}%` }}
                />
              </div>
              <span className="text-xs text-muted-foreground w-28 text-right shrink-0">
                {s.count} ({s.conversionRate}%)
              </span>
            </div>
            {i < stages.length - 1 && s.dropoffRate > 0 && (
              <p className="text-xs text-muted-foreground ml-36 my-0.5">
                {"\u2193"} {stages[i + 1].dropoffRate}% dropped off
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}

function formatHour(hour: number): string {
  if (hour === 0) return "12 AM";
  if (hour < 12) return `${hour} AM`;
  if (hour === 12) return "12 PM";
  return `${hour - 12} PM`;
}

function formatDraftType(type: string): string {
  return type
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function getLinkedInByType(
  drafts: LinkedInRow[],
): Array<{ type: string; total: number; sent: number }> {
  const map = new Map<string, { total: number; sent: number }>();
  for (const d of drafts) {
    const entry = map.get(d.draft_type) ?? { total: 0, sent: 0 };
    entry.total += 1;
    if (d.status === "sent") entry.sent += 1;
    map.set(d.draft_type, entry);
  }
  return Array.from(map.entries()).map(([type, stats]) => ({
    type,
    ...stats,
  }));
}

function AnalyticsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <Skeleton className="h-8 w-16 mx-auto mb-2" />
              <Skeleton className="h-3 w-20 mx-auto" />
            </CardContent>
          </Card>
        ))}
      </div>
      <Skeleton className="h-40 w-full" />
      <Skeleton className="h-40 w-full" />
    </div>
  );
}
