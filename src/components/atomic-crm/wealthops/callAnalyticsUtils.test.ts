import { describe, it, expect } from "vitest";
import type { CallLog } from "./types";
import {
  groupCallsByHour,
  groupCallsByDayOfWeek,
  computeOutcomeDistribution,
  filterLogsByPeriod,
  computeSummaryStats,
} from "./callAnalyticsUtils";

function makeLog(
  overrides: Partial<CallLog> & Pick<CallLog, "called_at" | "outcome">,
): CallLog {
  return {
    id: 1,
    contact_id: 1,
    call_brief_id: null,
    sequence_id: null,
    sequence_step: null,
    duration_seconds: 60,
    notes: null,
    callback_scheduled_for: null,
    next_action_triggered: null,
    logged_by: "marshall",
    created_at: overrides.called_at,
    ...overrides,
  };
}

describe("computeOutcomeDistribution", () => {
  it("computes correct counts and percentages", () => {
    const logs: CallLog[] = [
      makeLog({ called_at: "2026-03-20T10:00:00Z", outcome: "voicemail" }),
      makeLog({ called_at: "2026-03-20T11:00:00Z", outcome: "voicemail" }),
      makeLog({
        called_at: "2026-03-20T12:00:00Z",
        outcome: "connected_positive",
      }),
      makeLog({ called_at: "2026-03-20T13:00:00Z", outcome: "no_answer" }),
    ];

    const result = computeOutcomeDistribution(logs);
    const voicemail = result.find((r) => r.outcome === "voicemail");
    expect(voicemail?.count).toBe(2);
    expect(voicemail?.percentage).toBe(50);

    const totalPercentage = result.reduce((s, r) => s + r.percentage, 0);
    expect(totalPercentage).toBe(100);
  });
});

describe("filterLogsByPeriod", () => {
  it("filters logs outside range", () => {
    const now = new Date();
    const recent = new Date(now);
    recent.setDate(recent.getDate() - 3);
    const old = new Date(now);
    old.setDate(old.getDate() - 15);

    const logs: CallLog[] = [
      makeLog({
        called_at: recent.toISOString(),
        outcome: "voicemail",
      }),
      makeLog({
        called_at: old.toISOString(),
        outcome: "no_answer",
      }),
    ];

    const filtered = filterLogsByPeriod(logs, "7d");
    expect(filtered).toHaveLength(1);
    expect(filtered[0].outcome).toBe("voicemail");
  });

  it("returns all logs for 'all' period", () => {
    const logs: CallLog[] = [
      makeLog({
        called_at: "2020-01-01T10:00:00Z",
        outcome: "voicemail",
      }),
    ];
    expect(filterLogsByPeriod(logs, "all")).toHaveLength(1);
  });
});

describe("groupCallsByHour", () => {
  it("places logs at hour 8 and 16 in correct buckets", () => {
    const logs: CallLog[] = [
      makeLog({
        called_at: "2026-03-20T08:15:00",
        outcome: "connected_positive",
      }),
      makeLog({
        called_at: "2026-03-20T08:45:00",
        outcome: "voicemail",
      }),
      makeLog({
        called_at: "2026-03-20T16:30:00",
        outcome: "connected_positive",
      }),
    ];

    const result = groupCallsByHour(logs);
    const hour8 = result.find((r) => r.hour === 8);
    const hour16 = result.find((r) => r.hour === 16);

    expect(hour8?.count).toBe(2);
    expect(hour8?.connectRate).toBe(50);
    expect(hour16?.count).toBe(1);
    expect(hour16?.connectRate).toBe(100);
  });

  it("returns 24 buckets", () => {
    const result = groupCallsByHour([]);
    expect(result).toHaveLength(24);
  });
});

describe("groupCallsByDayOfWeek", () => {
  it("places Wednesday logs in bucket 3", () => {
    // 2026-03-25 is a Wednesday
    const logs: CallLog[] = [
      makeLog({
        called_at: "2026-03-25T10:00:00",
        outcome: "voicemail",
      }),
    ];

    const result = groupCallsByDayOfWeek(logs);
    const wed = result.find((r) => r.day === 3);
    expect(wed?.count).toBe(1);
    expect(wed?.dayLabel).toBe("Wed");
  });

  it("returns 7 buckets", () => {
    const result = groupCallsByDayOfWeek([]);
    expect(result).toHaveLength(7);
  });
});

describe("computeSummaryStats", () => {
  it("computes stats correctly", () => {
    const logs: CallLog[] = [
      makeLog({
        called_at: "2026-03-20T10:00:00Z",
        outcome: "connected_positive",
      }),
      makeLog({
        called_at: "2026-03-20T11:00:00Z",
        outcome: "connected_not_interested",
      }),
      makeLog({ called_at: "2026-03-20T12:00:00Z", outcome: "voicemail" }),
      makeLog({ called_at: "2026-03-20T13:00:00Z", outcome: "no_answer" }),
    ];

    const stats = computeSummaryStats(logs);
    expect(stats.totalCalls).toBe(4);
    expect(stats.connectRate).toBe(50);
    expect(stats.meetingsBooked).toBe(1);
    expect(stats.avgCallsPerMeeting).toBe(4);
  });

  it("returns null avgCallsPerMeeting when zero meetings", () => {
    const logs: CallLog[] = [
      makeLog({ called_at: "2026-03-20T10:00:00Z", outcome: "voicemail" }),
    ];

    const stats = computeSummaryStats(logs);
    expect(stats.avgCallsPerMeeting).toBeNull();
  });
});
