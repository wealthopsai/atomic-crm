import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/components/atomic-crm/providers/supabase/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { CallLog } from "./types";
import {
  filterLogsByPeriod,
  computeSummaryStats,
  computeOutcomeDistribution,
  groupCallsByHour,
  groupCallsByDayOfWeek,
} from "./callAnalyticsUtils";
import { formatCallDuration } from "./callUtils";

const PERIODS = [
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "30 days" },
  { value: "90d", label: "90 days" },
  { value: "all", label: "All Time" },
] as const;

const OUTCOME_LABELS: Record<string, string> = {
  connected_positive: "\u2705 Connected — Positive",
  connected_not_interested: "\u274C Connected — Not Interested",
  voicemail: "\u{1F4EC} Voicemail",
  no_answer: "\u{1F4F5} No Answer",
  callback_requested: "\u{1F550} Callback Requested",
  wrong_number: "\u2753 Wrong Number",
};

export const CallAnalytics = () => {
  const [period, setPeriod] = useState("30d");
  const queryClient = useQueryClient();

  const {
    data: allLogs,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["call_logs_analytics"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("call_logs")
        .select(
          "*, contacts(id, first_name, last_name, company_id, current_stage, trigger_event, estimated_aum, state, avatar, current_sequence, total_calls, last_touch_date, last_touch_type, next_action, next_action_date)",
        )
        .order("called_at", { ascending: false });

      if (error) throw error;
      return data as CallLog[];
    },
  });

  const logs = allLogs ? filterLogsByPeriod(allLogs, period) : [];
  const stats = computeSummaryStats(logs);
  const outcomeDistribution = computeOutcomeDistribution(logs);
  const hourStats = groupCallsByHour(logs);
  const dayStats = groupCallsByDayOfWeek(logs);

  if (error) {
    return (
      <div className="p-6 text-center text-destructive">
        <p>Failed to load call analytics.</p>
        <Button
          variant="outline"
          onClick={() =>
            queryClient.invalidateQueries({
              queryKey: ["call_logs_analytics"],
            })
          }
          className="mt-2"
        >
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <h1 className="text-2xl font-bold">Call Analytics</h1>
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
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <SummaryCard label="Total Calls" value={String(stats.totalCalls)} />
            <SummaryCard label="Connect Rate" value={`${stats.connectRate}%`} />
            <SummaryCard
              label="Meetings Booked"
              value={String(stats.meetingsBooked)}
            />
            <SummaryCard
              label="Avg Calls/Meeting"
              value={
                stats.avgCallsPerMeeting !== null
                  ? String(stats.avgCallsPerMeeting)
                  : "\u2014"
              }
            />
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Outcome Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              {outcomeDistribution.length === 0 ? (
                <p className="text-sm text-muted-foreground">No data.</p>
              ) : (
                <div className="space-y-2">
                  {outcomeDistribution.map((o) => (
                    <div key={o.outcome} className="flex items-center gap-3">
                      <span className="text-sm w-48 shrink-0 truncate">
                        {OUTCOME_LABELS[o.outcome] ?? o.outcome}
                      </span>
                      <div className="flex-1 h-5 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-500 rounded-full"
                          style={{ width: `${o.percentage}%` }}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground w-16 text-right">
                        {o.count} ({o.percentage}%)
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Calls by Hour of Day</CardTitle>
            </CardHeader>
            <CardContent>
              <HourChart data={hourStats} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Calls by Day of Week</CardTitle>
            </CardHeader>
            <CardContent>
              <DayChart data={dayStats} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Recent Call History</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <RecentCallsTable logs={logs.slice(0, 20)} />
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardContent className="p-4 text-center">
        <p className="text-2xl font-bold">{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </CardContent>
    </Card>
  );
}

function getBarColor(connectRate: number): string {
  if (connectRate > 30) return "bg-green-500";
  if (connectRate >= 15) return "bg-yellow-500";
  return "bg-blue-400";
}

function HourChart({
  data,
}: {
  data: Array<{ hour: number; count: number; connectRate: number }>;
}) {
  const filtered = data.filter((d) => d.hour >= 6 && d.hour <= 20);
  const maxCount = Math.max(...filtered.map((d) => d.count), 1);

  return (
    <div className="space-y-1">
      {filtered.map((d) => {
        const label =
          d.hour === 0
            ? "12 AM"
            : d.hour < 12
              ? `${d.hour} AM`
              : d.hour === 12
                ? "12 PM"
                : `${d.hour - 12} PM`;
        const widthPct = (d.count / maxCount) * 100;

        return (
          <div key={d.hour} className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground w-12 text-right shrink-0">
              {label}
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

function DayChart({
  data,
}: {
  data: Array<{
    day: number;
    dayLabel: string;
    count: number;
    connectRate: number;
  }>;
}) {
  const maxCount = Math.max(...data.map((d) => d.count), 1);

  return (
    <div className="space-y-1">
      {data.map((d) => {
        const widthPct = (d.count / maxCount) * 100;
        return (
          <div key={d.day} className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground w-12 text-right shrink-0">
              {d.dayLabel}
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

function RecentCallsTable({ logs }: { logs: CallLog[] }) {
  if (logs.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-4">
        No calls in this period.
      </p>
    );
  }

  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b text-left">
          <th className="py-2 pr-3 font-medium">Date</th>
          <th className="py-2 pr-3 font-medium">Prospect</th>
          <th className="py-2 pr-3 font-medium">Outcome</th>
          <th className="py-2 pr-3 font-medium">Duration</th>
          <th className="py-2 font-medium">Notes</th>
        </tr>
      </thead>
      <tbody>
        {logs.map((log) => (
          <tr key={log.id} className="border-b last:border-0">
            <td className="py-2 pr-3 text-muted-foreground whitespace-nowrap">
              {new Date(log.called_at).toLocaleDateString()}
            </td>
            <td className="py-2 pr-3 whitespace-nowrap">
              {log.contact
                ? `${log.contact.first_name} ${log.contact.last_name}`
                : `#${log.contact_id}`}
            </td>
            <td className="py-2 pr-3">
              <Badge variant="secondary" className="text-xs whitespace-nowrap">
                {OUTCOME_LABELS[log.outcome] ?? log.outcome}
              </Badge>
            </td>
            <td className="py-2 pr-3 text-muted-foreground whitespace-nowrap">
              {formatCallDuration(log.duration_seconds)}
            </td>
            <td className="py-2 text-muted-foreground truncate max-w-[200px]">
              {log.notes
                ? log.notes.length > 60
                  ? `${log.notes.slice(0, 60)}...`
                  : log.notes
                : "\u2014"}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
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
      <Card>
        <CardContent className="p-4 space-y-2">
          <Skeleton className="h-5 w-full" />
          <Skeleton className="h-5 w-full" />
          <Skeleton className="h-5 w-3/4" />
        </CardContent>
      </Card>
    </div>
  );
}
