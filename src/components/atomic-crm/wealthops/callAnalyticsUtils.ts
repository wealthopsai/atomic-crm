import type {
  CallLog,
  HourStats,
  DayStats,
  OutcomeStats,
  SummaryStats,
} from "./types";

const CONNECTED_OUTCOMES = new Set([
  "connected_positive",
  "connected_not_interested",
]);

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function groupCallsByHour(logs: CallLog[]): HourStats[] {
  const buckets = new Map<number, { total: number; connected: number }>();

  for (const log of logs) {
    const date = new Date(log.called_at);
    const hour = date.getHours();
    const existing = buckets.get(hour) ?? { total: 0, connected: 0 };
    existing.total += 1;
    if (CONNECTED_OUTCOMES.has(log.outcome)) {
      existing.connected += 1;
    }
    buckets.set(hour, existing);
  }

  const result: HourStats[] = [];
  for (let h = 0; h < 24; h++) {
    const bucket = buckets.get(h);
    if (bucket) {
      result.push({
        hour: h,
        count: bucket.total,
        connectRate:
          bucket.total > 0
            ? Math.round((bucket.connected / bucket.total) * 100)
            : 0,
      });
    } else {
      result.push({ hour: h, count: 0, connectRate: 0 });
    }
  }
  return result;
}

export function groupCallsByDayOfWeek(logs: CallLog[]): DayStats[] {
  const buckets = new Map<number, { total: number; connected: number }>();

  for (const log of logs) {
    const date = new Date(log.called_at);
    const day = date.getDay();
    const existing = buckets.get(day) ?? { total: 0, connected: 0 };
    existing.total += 1;
    if (CONNECTED_OUTCOMES.has(log.outcome)) {
      existing.connected += 1;
    }
    buckets.set(day, existing);
  }

  const result: DayStats[] = [];
  for (let d = 0; d < 7; d++) {
    const bucket = buckets.get(d);
    if (bucket) {
      result.push({
        day: d,
        dayLabel: DAY_LABELS[d],
        count: bucket.total,
        connectRate:
          bucket.total > 0
            ? Math.round((bucket.connected / bucket.total) * 100)
            : 0,
      });
    } else {
      result.push({
        day: d,
        dayLabel: DAY_LABELS[d],
        count: 0,
        connectRate: 0,
      });
    }
  }
  return result;
}

export function computeOutcomeDistribution(logs: CallLog[]): OutcomeStats[] {
  const counts = new Map<string, number>();

  for (const log of logs) {
    counts.set(log.outcome, (counts.get(log.outcome) ?? 0) + 1);
  }

  const total = logs.length;
  const result: OutcomeStats[] = [];

  for (const [outcome, count] of counts.entries()) {
    result.push({
      outcome,
      count,
      percentage: total > 0 ? Math.round((count / total) * 100) : 0,
    });
  }

  return result.sort((a, b) => b.count - a.count);
}

export function filterLogsByPeriod(logs: CallLog[], period: string): CallLog[] {
  if (period === "all") return logs;

  const now = new Date();
  let daysBack: number;
  switch (period) {
    case "7d":
      daysBack = 7;
      break;
    case "30d":
      daysBack = 30;
      break;
    case "90d":
      daysBack = 90;
      break;
    default:
      return logs;
  }

  const cutoff = new Date(now);
  cutoff.setDate(cutoff.getDate() - daysBack);
  cutoff.setHours(0, 0, 0, 0);

  return logs.filter((log) => new Date(log.called_at) >= cutoff);
}

export function computeSummaryStats(logs: CallLog[]): SummaryStats {
  const totalCalls = logs.length;
  const connected = logs.filter((l) =>
    CONNECTED_OUTCOMES.has(l.outcome),
  ).length;
  const meetingsBooked = logs.filter(
    (l) => l.outcome === "connected_positive",
  ).length;

  return {
    totalCalls,
    connectRate:
      totalCalls > 0 ? Math.round((connected / totalCalls) * 100) : 0,
    meetingsBooked,
    avgCallsPerMeeting:
      meetingsBooked > 0 ? Math.round(totalCalls / meetingsBooked) : null,
  };
}
