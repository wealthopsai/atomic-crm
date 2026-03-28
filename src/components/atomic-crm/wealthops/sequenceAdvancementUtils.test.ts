import { describe, expect, it } from "vitest";
import {
  getStepAction,
  getNextActionDate,
  resolveReplyBranch,
  isEnrollmentComplete,
  resolveExhaustedStage,
  getStepDayOffset,
  isEnrollmentDueToday,
} from "./sequenceAdvancementUtils";

// -- Sample step definitions (mimic JSONB array from sequences.steps) --
const sampleSteps: Record<string, unknown>[] = [
  { step: 1, channel: "email", day: 0 },
  { step: 2, channel: "linkedin", day: 3 },
  { step: 3, channel: "phone", day: 5 },
  { step: 4, channel: "email", day: 7 },
  { step: 5, channel: "linkedin", day: 10 },
  { step: 6, channel: "email", day: 14 },
  { step: 7, channel: "call", day: 17 },
];

describe("getStepAction", () => {
  it('returns "email" for an email step', () => {
    expect(getStepAction("A1", 1, sampleSteps)).toBe("email");
  });

  it('returns "linkedin" for a linkedin step', () => {
    expect(getStepAction("A1", 2, sampleSteps)).toBe("linkedin");
  });

  it('returns "call" for a phone step', () => {
    expect(getStepAction("A1", 3, sampleSteps)).toBe("call");
  });

  it('returns "call" for a call step', () => {
    expect(getStepAction("A1", 7, sampleSteps)).toBe("call");
  });

  it("returns null for a step that does not exist", () => {
    expect(getStepAction("A1", 99, sampleSteps)).toBeNull();
  });

  it("returns null for empty steps array", () => {
    expect(getStepAction("A1", 1, [])).toBeNull();
  });

  it("supports step_number field as fallback", () => {
    const steps = [{ step_number: 1, channel: "email", day: 0 }];
    expect(getStepAction("A1", 1, steps)).toBe("email");
  });
});

describe("getNextActionDate", () => {
  const baseDate = new Date("2026-03-27T00:00:00Z");

  it("returns date offset by next step's day field", () => {
    // Completing step 1 → next is step 2 with day=3
    const result = getNextActionDate(sampleSteps, 1, baseDate);
    expect(result).not.toBeNull();
    const resultDate = new Date(result!);
    expect(resultDate.getTime()).toBe(
      new Date("2026-03-30T00:00:00Z").getTime(),
    );
  });

  it("returns correct offset for later steps", () => {
    // Completing step 2 → next is step 3 with day=5
    const result = getNextActionDate(sampleSteps, 2, baseDate);
    const resultDate = new Date(result!);
    expect(resultDate.getTime()).toBe(
      new Date("2026-04-01T00:00:00Z").getTime(),
    );
  });

  it("returns null when completing the last step", () => {
    expect(getNextActionDate(sampleSteps, 7, baseDate)).toBeNull();
  });

  it("returns null for empty steps array", () => {
    expect(getNextActionDate([], 1, baseDate)).toBeNull();
  });
});

describe("resolveReplyBranch", () => {
  it("positive reply pauses enrollment and enrolls in A2", () => {
    const result = resolveReplyBranch({
      sentiment: "positive",
      currentSequenceId: "A1",
    });
    expect(result.newEnrollmentStatus).toBe("paused");
    expect(result.newContactStage).toBe("replied_positive");
    expect(result.enrollInSequence).toBe("A2");
    expect(result.exitReason).toBe("positive_reply_received");
  });

  it("negative reply exits enrollment with no new sequence", () => {
    const result = resolveReplyBranch({
      sentiment: "negative",
      currentSequenceId: "A1",
    });
    expect(result.newEnrollmentStatus).toBe("exited");
    expect(result.newContactStage).toBe("replied_negative");
    expect(result.enrollInSequence).toBeNull();
    expect(result.exitReason).toBe("negative_reply_received");
  });

  it("not_now reply from A1 sets replied_not_now and enrolls in A3", () => {
    const result = resolveReplyBranch({
      sentiment: "not_now",
      currentSequenceId: "A1",
    });
    expect(result.newEnrollmentStatus).toBe("exited");
    expect(result.newContactStage).toBe("replied_not_now");
    expect(result.enrollInSequence).toBe("A3");
  });

  it("not_now reply from A2 sets nurture stage", () => {
    const result = resolveReplyBranch({
      sentiment: "not_now",
      currentSequenceId: "A2",
    });
    expect(result.newEnrollmentStatus).toBe("exited");
    expect(result.newContactStage).toBe("nurture");
    expect(result.enrollInSequence).toBe("A3");
  });

  it("positive reply from A2 still pauses and enrolls in A2", () => {
    const result = resolveReplyBranch({
      sentiment: "positive",
      currentSequenceId: "A2",
    });
    expect(result.newEnrollmentStatus).toBe("paused");
    expect(result.newContactStage).toBe("replied_positive");
  });
});

describe("isEnrollmentComplete", () => {
  it("returns true when currentStep equals totalSteps", () => {
    expect(isEnrollmentComplete(7, 7)).toBe(true);
  });

  it("returns true when currentStep exceeds totalSteps", () => {
    expect(isEnrollmentComplete(8, 7)).toBe(true);
  });

  it("returns false when currentStep is less than totalSteps", () => {
    expect(isEnrollmentComplete(3, 7)).toBe(false);
  });

  it("returns true for 1/1", () => {
    expect(isEnrollmentComplete(1, 1)).toBe(true);
  });
});

describe("resolveExhaustedStage", () => {
  it("A1 exhausted → nurture with A3 enrollment", () => {
    const result = resolveExhaustedStage("A1");
    expect(result.newContactStage).toBe("nurture");
    expect(result.enrollInSequence).toBe("A3");
    expect(result.exitReason).toBe("no_response_sequence_exhausted");
  });

  it("A3 exhausted → disqualified with no further enrollment", () => {
    const result = resolveExhaustedStage("A3");
    expect(result.newContactStage).toBe("disqualified");
    expect(result.enrollInSequence).toBeNull();
    expect(result.exitReason).toBe("no_response_sequence_exhausted");
  });

  it("A2 exhausted → disqualified", () => {
    const result = resolveExhaustedStage("A2");
    expect(result.newContactStage).toBe("disqualified");
    expect(result.enrollInSequence).toBeNull();
  });
});

describe("getStepDayOffset", () => {
  it("returns the day field value", () => {
    expect(getStepDayOffset({ step: 2, channel: "email", day: 3 })).toBe(3);
  });

  it("returns 0 when day field is missing", () => {
    expect(getStepDayOffset({ step: 1, channel: "email" })).toBe(0);
  });

  it("returns 0 when day field is not a number", () => {
    expect(getStepDayOffset({ step: 1, channel: "email", day: "abc" })).toBe(0);
  });

  it("returns 0 for day field that is NaN", () => {
    expect(getStepDayOffset({ day: NaN })).toBe(0);
  });
});

describe("isEnrollmentDueToday", () => {
  const today = new Date("2026-03-27T12:00:00Z");

  it("returns true when due today", () => {
    expect(isEnrollmentDueToday("2026-03-27T00:00:00Z", today)).toBe(true);
  });

  it("returns true when due yesterday (overdue)", () => {
    expect(isEnrollmentDueToday("2026-03-26T00:00:00Z", today)).toBe(true);
  });

  it("returns false when due tomorrow", () => {
    expect(isEnrollmentDueToday("2026-03-28T00:00:00Z", today)).toBe(false);
  });

  it("returns false when currentStepDue is null", () => {
    expect(isEnrollmentDueToday(null, today)).toBe(false);
  });

  it("returns true when due is earlier today with time component", () => {
    expect(isEnrollmentDueToday("2026-03-27T23:59:59Z", today)).toBe(true);
  });
});
