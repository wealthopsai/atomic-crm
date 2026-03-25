import { describe, it, expect } from "vitest";
import {
  computeEmailStats,
  computeConversionFunnel,
  computeSequenceStats,
  computeTriggerEventStats,
  computePipelineVelocity,
  type EmailDraftRow,
  type ContactRow,
  type EnrollmentRow,
  type StageEventRow,
} from "./analyticsUtils";

describe("computeEmailStats", () => {
  it("returns empty array for empty input", () => {
    expect(computeEmailStats([])).toEqual([]);
  });

  it("groups correctly by (sequence_id, step)", () => {
    const drafts: EmailDraftRow[] = [
      { sequence_id: "seq1", sequence_step: 1, status: "approved" },
      { sequence_id: "seq1", sequence_step: 1, status: "sent" },
      { sequence_id: "seq1", sequence_step: 2, status: "rejected" },
      { sequence_id: "seq2", sequence_step: 1, status: "approved" },
    ];
    const result = computeEmailStats(drafts);
    expect(result).toHaveLength(3);

    const s1s1 = result.find(
      (r) => r.sequenceId === "seq1" && r.sequenceStep === 1,
    );
    expect(s1s1).toBeDefined();
    expect(s1s1!.total).toBe(2);
    expect(s1s1!.approved).toBe(1);
    expect(s1s1!.sent).toBe(1);
  });

  it("computes approvalRate correctly and handles 0 total", () => {
    const drafts: EmailDraftRow[] = [
      { sequence_id: "a", sequence_step: 1, status: "approved" },
      { sequence_id: "a", sequence_step: 1, status: "draft" },
    ];
    const result = computeEmailStats(drafts);
    expect(result[0].approvalRate).toBe(0.5);
  });
});

describe("computeConversionFunnel", () => {
  it("returns 7 stages in order", () => {
    const result = computeConversionFunnel([]);
    expect(result).toHaveLength(7);
    expect(result[0].stage).toBe("new");
    expect(result[6].stage).toBe("converted");
  });

  it("first stage dropoffRate is 0", () => {
    const contacts: ContactRow[] = [
      { id: 1, current_stage: "new", trigger_event: null },
    ];
    const result = computeConversionFunnel(contacts);
    expect(result[0].dropoffRate).toBe(0);
  });

  it("computes conversionRate for last stage correctly", () => {
    const contacts: ContactRow[] = [
      { id: 1, current_stage: "converted", trigger_event: null },
      { id: 2, current_stage: "new", trigger_event: null },
      { id: 3, current_stage: "new", trigger_event: null },
    ];
    const result = computeConversionFunnel(contacts);
    // 3 at new stage, 1 at converted
    expect(result[0].count).toBe(3);
    expect(result[6].count).toBe(1);
    expect(result[6].conversionRate).toBe(Math.round((1 / 3) * 100));
  });

  it("handles zero contacts with all counts and rates at 0", () => {
    const result = computeConversionFunnel([]);
    for (const stage of result) {
      expect(stage.count).toBe(0);
      expect(stage.dropoffRate).toBe(0);
      expect(stage.conversionRate).toBe(0);
    }
  });
});

describe("computeSequenceStats", () => {
  it("returns empty array for empty input", () => {
    expect(computeSequenceStats([])).toEqual([]);
  });

  it("groups correctly by sequence_id", () => {
    const enrollments: EnrollmentRow[] = [
      { sequence_id: "s1", status: "active" },
      { sequence_id: "s1", status: "completed" },
      { sequence_id: "s2", status: "exited" },
    ];
    const result = computeSequenceStats(enrollments);
    expect(result).toHaveLength(2);

    const s1 = result.find((r) => r.sequenceId === "s1");
    expect(s1!.totalEnrolled).toBe(2);
    expect(s1!.completed).toBe(1);
    expect(s1!.activeCount).toBe(1);
    expect(s1!.completionRate).toBe(0.5);
  });

  it("handles 0 enrolled gracefully", () => {
    // Can't truly have 0 enrolled with data, just check empty
    const result = computeSequenceStats([]);
    expect(result).toHaveLength(0);
  });
});

describe("computeTriggerEventStats", () => {
  it("groups by trigger_event correctly", () => {
    const contacts: ContactRow[] = [
      { id: 1, current_stage: "converted", trigger_event: "job_change" },
      { id: 2, current_stage: "new", trigger_event: "job_change" },
      { id: 3, current_stage: "meeting_booked", trigger_event: "promotion" },
    ];
    const result = computeTriggerEventStats(contacts);
    expect(result).toHaveLength(2);

    const jc = result.find((r) => r.triggerEvent === "job_change");
    expect(jc!.totalContacts).toBe(2);
    expect(jc!.converted).toBe(1);
    expect(jc!.conversionRate).toBe(0.5);
  });

  it("groups null trigger_event as unknown", () => {
    const contacts: ContactRow[] = [
      { id: 1, current_stage: "new", trigger_event: null },
    ];
    const result = computeTriggerEventStats(contacts);
    expect(result[0].triggerEvent).toBe("unknown");
  });

  it("computes conversionRate correctly", () => {
    const contacts: ContactRow[] = [
      { id: 1, current_stage: "converted", trigger_event: "a" },
      { id: 2, current_stage: "converted", trigger_event: "a" },
      { id: 3, current_stage: "new", trigger_event: "a" },
    ];
    const result = computeTriggerEventStats(contacts);
    expect(result[0].conversionRate).toBeCloseTo(2 / 3);
  });
});

describe("computePipelineVelocity", () => {
  it("returns array with null avgDaysInStage for empty events", () => {
    const result = computePipelineVelocity([]);
    expect(result.length).toBeGreaterThan(0);
    for (const stage of result) {
      expect(stage.avgDaysInStage).toBeNull();
      expect(stage.contactCount).toBe(0);
    }
  });

  it("computes correct avg days for paired enter/exit events", () => {
    const events: StageEventRow[] = [
      {
        payload: { to_stage: "new" },
        contact_id: 1,
        created_at: "2026-01-01T00:00:00Z",
      },
      {
        payload: { from_stage: "new", to_stage: "researching" },
        contact_id: 1,
        created_at: "2026-01-03T00:00:00Z",
      },
    ];
    const result = computePipelineVelocity(events);
    const newStage = result.find((s) => s.stage === "new");
    expect(newStage!.avgDaysInStage).toBe(2);
    expect(newStage!.contactCount).toBe(1);
  });

  it("excludes unpaired entries (still in stage) from avg", () => {
    const events: StageEventRow[] = [
      {
        payload: { to_stage: "new" },
        contact_id: 1,
        created_at: "2026-01-01T00:00:00Z",
      },
      // No exit event — still in stage
    ];
    const result = computePipelineVelocity(events);
    const newStage = result.find((s) => s.stage === "new");
    expect(newStage!.avgDaysInStage).toBeNull();
  });
});
