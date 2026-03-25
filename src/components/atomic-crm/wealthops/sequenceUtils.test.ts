import { describe, expect, it } from "vitest";
import { getStatusBadgeVariant, formatStepFraction } from "./sequenceUtils";

describe("getStatusBadgeVariant", () => {
  it('returns "default" for active', () => {
    expect(getStatusBadgeVariant("active")).toBe("default");
  });

  it('returns "secondary" for paused', () => {
    expect(getStatusBadgeVariant("paused")).toBe("secondary");
  });

  it('returns "outline" for completed', () => {
    expect(getStatusBadgeVariant("completed")).toBe("outline");
  });

  it('returns "destructive" for exited', () => {
    expect(getStatusBadgeVariant("exited")).toBe("destructive");
  });

  it('returns "outline" for unknown status', () => {
    expect(getStatusBadgeVariant("unknown")).toBe("outline");
  });
});

describe("formatStepFraction", () => {
  it('returns "3 / 7" for step 3 of 7', () => {
    expect(formatStepFraction(3, 7)).toBe("3 / 7");
  });

  it('returns "1 / 1" for step 1 of 1', () => {
    expect(formatStepFraction(1, 1)).toBe("1 / 1");
  });

  it("returns dash for null current step", () => {
    expect(formatStepFraction(null, 7)).toBe("—");
  });

  it("returns dash for null total steps", () => {
    expect(formatStepFraction(3, null)).toBe("—");
  });
});
