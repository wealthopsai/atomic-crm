import { describe, it, expect } from "vitest";
import {
  getPriorityOrder,
  getPriorityBadgeClass,
  getPriorityLabel,
  getTimezoneFromState,
  formatCallDuration,
  getNextActionForOutcome,
  getStageUpdateForOutcome,
  getNextActionDateOffset,
} from "./callUtils";

describe("getPriorityOrder", () => {
  it("returns hot < normal < low", () => {
    expect(getPriorityOrder("hot")).toBeLessThan(getPriorityOrder("normal"));
    expect(getPriorityOrder("normal")).toBeLessThan(getPriorityOrder("low"));
  });

  it("returns 0 for hot, 1 for normal, 2 for low", () => {
    expect(getPriorityOrder("hot")).toBe(0);
    expect(getPriorityOrder("normal")).toBe(1);
    expect(getPriorityOrder("low")).toBe(2);
  });
});

describe("getPriorityLabel", () => {
  it("returns correct emoji + label for each value", () => {
    expect(getPriorityLabel("hot")).toBe("\u{1F534} Hot");
    expect(getPriorityLabel("normal")).toBe("\u{1F7E1} Normal");
    expect(getPriorityLabel("low")).toBe("\u26AA Low");
  });
});

describe("getPriorityBadgeClass", () => {
  it("returns correct class string for each priority", () => {
    expect(getPriorityBadgeClass("hot")).toBe("bg-red-100 text-red-800");
    expect(getPriorityBadgeClass("normal")).toBe(
      "bg-yellow-100 text-yellow-800",
    );
    expect(getPriorityBadgeClass("low")).toBe("bg-gray-100 text-gray-700");
  });
});

describe("getTimezoneFromState", () => {
  it("returns Chicago for TX", () => {
    expect(getTimezoneFromState("TX")).toBe("America/Chicago");
  });

  it("returns Los_Angeles for CA", () => {
    expect(getTimezoneFromState("CA")).toBe("America/Los_Angeles");
  });

  it("returns New_York for NY", () => {
    expect(getTimezoneFromState("NY")).toBe("America/New_York");
  });

  it("returns Phoenix for AZ", () => {
    expect(getTimezoneFromState("AZ")).toBe("America/Phoenix");
  });

  it("returns Chicago for null", () => {
    expect(getTimezoneFromState(null)).toBe("America/Chicago");
  });

  it("returns Chicago for unknown state", () => {
    expect(getTimezoneFromState("ZZ")).toBe("America/Chicago");
  });
});

describe("formatCallDuration", () => {
  it("returns '< 1 min' for null", () => {
    expect(formatCallDuration(null)).toBe("< 1 min");
  });

  it("returns '< 1 min' for 0", () => {
    expect(formatCallDuration(0)).toBe("< 1 min");
  });

  it("formats 60 seconds as '1m 0s'", () => {
    expect(formatCallDuration(60)).toBe("1m 0s");
  });

  it("formats 154 seconds as '2m 34s'", () => {
    expect(formatCallDuration(154)).toBe("2m 34s");
  });
});

describe("getNextActionForOutcome", () => {
  it("returns correct action for all 6 outcomes", () => {
    expect(getNextActionForOutcome("connected_positive")).toBe(
      "Generate meeting confirmation draft",
    );
    expect(getNextActionForOutcome("connected_not_interested")).toBe(
      "Review for disqualify or DNC",
    );
    expect(getNextActionForOutcome("voicemail")).toBe(
      "Schedule retry in 3 days",
    );
    expect(getNextActionForOutcome("no_answer")).toBe(
      "Retry same day or next morning",
    );
    expect(getNextActionForOutcome("callback_requested")).toBe(
      "Scheduled callback \u2014 mark as Hot",
    );
    expect(getNextActionForOutcome("wrong_number")).toBe(
      "Update phone, continue email/LinkedIn only",
    );
  });
});

describe("getStageUpdateForOutcome", () => {
  it("returns replied_positive for connected_positive", () => {
    expect(getStageUpdateForOutcome("connected_positive")).toBe(
      "replied_positive",
    );
  });

  it("returns replied_negative for connected_not_interested", () => {
    expect(getStageUpdateForOutcome("connected_not_interested")).toBe(
      "replied_negative",
    );
  });

  it("returns null for voicemail", () => {
    expect(getStageUpdateForOutcome("voicemail")).toBeNull();
  });

  it("returns null for no_answer", () => {
    expect(getStageUpdateForOutcome("no_answer")).toBeNull();
  });
});

describe("getNextActionDateOffset", () => {
  it("returns 3 for voicemail", () => {
    expect(getNextActionDateOffset("voicemail")).toBe(3);
  });

  it("returns 1 for no_answer", () => {
    expect(getNextActionDateOffset("no_answer")).toBe(1);
  });

  it("returns 0 for callback_requested", () => {
    expect(getNextActionDateOffset("callback_requested")).toBe(0);
  });

  it("returns null for connected_positive", () => {
    expect(getNextActionDateOffset("connected_positive")).toBeNull();
  });
});
