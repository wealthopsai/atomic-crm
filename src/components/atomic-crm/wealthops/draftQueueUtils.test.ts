import { describe, expect, it } from "vitest";
import {
  getRetailCommStatus,
  isOverdue,
  formatStepLabel,
} from "./draftQueueUtils";

describe("getRetailCommStatus", () => {
  it("returns green with correct label at 0", () => {
    const result = getRetailCommStatus(0);
    expect(result.color).toBe("green");
    expect(result.label).toBe("0 / 25 retail comms this month");
  });

  it("returns green at 15", () => {
    const result = getRetailCommStatus(15);
    expect(result.color).toBe("green");
    expect(result.label).toBe("15 / 25 retail comms this month");
  });

  it("returns red at 20", () => {
    const result = getRetailCommStatus(20);
    expect(result.color).toBe("red");
    expect(result.label).toBe("20 / 25 retail comms this month");
  });

  it("returns red at 25", () => {
    const result = getRetailCommStatus(25);
    expect(result.color).toBe("red");
    expect(result.label).toBe("25 / 25 retail comms this month");
  });
});

describe("isOverdue", () => {
  it("returns false for null date", () => {
    expect(isOverdue(null)).toBe(false);
  });

  it("returns true for past date", () => {
    expect(isOverdue("2020-01-01T00:00:00Z")).toBe(true);
  });

  it("returns false for future date", () => {
    expect(isOverdue("2099-01-01T00:00:00Z")).toBe(false);
  });
});

describe("formatStepLabel", () => {
  it("returns formatted label", () => {
    expect(formatStepLabel("A1", 3)).toBe("A1 — Step 3");
  });

  it("returns dash for null sequence", () => {
    expect(formatStepLabel(null, 3)).toBe("—");
  });

  it("returns dash for null step", () => {
    expect(formatStepLabel("A1", null)).toBe("—");
  });
});
