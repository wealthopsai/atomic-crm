import { describe, expect, it } from "vitest";
import { formatStageName, getCardColor } from "./pipelineUtils";

describe("formatStageName", () => {
  it('formats "first_touch_active" to "First Touch Active"', () => {
    expect(formatStageName("first_touch_active")).toBe("First Touch Active");
  });

  it('formats "new" to "New"', () => {
    expect(formatStageName("new")).toBe("New");
  });

  it('formats "meeting_booked" to "Meeting Booked"', () => {
    expect(formatStageName("meeting_booked")).toBe("Meeting Booked");
  });
});

describe("getCardColor", () => {
  it("returns green when next_action_date is in the future", () => {
    const result = getCardColor({
      next_action_date: "2099-12-31T00:00:00Z",
      last_touch_date: null,
    });
    expect(result).toBe("green");
  });

  it("returns yellow when next_action_date is today", () => {
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}T12:00:00Z`;
    const result = getCardColor({
      next_action_date: todayStr,
      last_touch_date: null,
    });
    expect(result).toBe("yellow");
  });

  it("returns red when next_action_date is in the past", () => {
    const result = getCardColor({
      next_action_date: "2020-01-01T00:00:00Z",
      last_touch_date: null,
    });
    expect(result).toBe("red");
  });

  it("returns red when no next_action_date and last_touch_date is over 14 days ago", () => {
    const result = getCardColor({
      next_action_date: null,
      last_touch_date: "2020-01-01T00:00:00Z",
    });
    expect(result).toBe("red");
  });

  it("returns red when no dates are set", () => {
    const result = getCardColor({
      next_action_date: null,
      last_touch_date: null,
    });
    expect(result).toBe("red");
  });
});
