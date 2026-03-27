import { describe, expect, it } from "vitest";
import {
  isFirstTouchDraft,
  getA1Step2DueDate,
  buildEnrollmentEventPayload,
  resolveStageAfterEnrollment,
} from "./enrollmentUtils";

describe("isFirstTouchDraft", () => {
  it("returns true for A1 step 1", () => {
    expect(isFirstTouchDraft("A1", 1)).toBe(true);
  });

  it("returns false for A1 step 2", () => {
    expect(isFirstTouchDraft("A1", 2)).toBe(false);
  });

  it("returns false for non-A1 sequence at step 1", () => {
    expect(isFirstTouchDraft("A2", 1)).toBe(false);
  });

  it("returns false for null sequence", () => {
    expect(isFirstTouchDraft(null, 1)).toBe(false);
  });

  it("returns false for null step", () => {
    expect(isFirstTouchDraft("A1", null)).toBe(false);
  });

  it("returns false for both null", () => {
    expect(isFirstTouchDraft(null, null)).toBe(false);
  });
});

describe("getA1Step2DueDate", () => {
  it("returns a date 3 days from the provided date", () => {
    const base = new Date("2026-03-27T00:00:00Z");
    const result = getA1Step2DueDate(base);
    const expected = new Date("2026-03-30T00:00:00Z");
    expect(new Date(result).getTime()).toBe(expected.getTime());
  });

  it("returns an ISO string", () => {
    const result = getA1Step2DueDate(new Date());
    expect(typeof result).toBe("string");
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });
});

describe("buildEnrollmentEventPayload", () => {
  it("includes sequence name, step, triggered_by, and draft_id", () => {
    const payload = buildEnrollmentEventPayload("First Touch", 42);
    expect(payload.sequence_name).toBe("First Touch");
    expect(payload.step).toBe(1);
    expect(payload.triggered_by).toBe("first_touch_draft_insert");
    expect(payload.draft_id).toBe(42);
  });
});

describe("resolveStageAfterEnrollment", () => {
  it("transitions 'researched' to 'first_touch_active'", () => {
    expect(resolveStageAfterEnrollment("researched")).toBe("first_touch_active");
  });

  it("does not change 'first_touch_active'", () => {
    expect(resolveStageAfterEnrollment("first_touch_active")).toBe(
      "first_touch_active",
    );
  });

  it("does not change other stages", () => {
    expect(resolveStageAfterEnrollment("new")).toBe("new");
    expect(resolveStageAfterEnrollment("replied_positive")).toBe(
      "replied_positive",
    );
    expect(resolveStageAfterEnrollment("nurture")).toBe("nurture");
  });
});
