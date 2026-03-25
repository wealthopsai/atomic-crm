export function getPriorityOrder(priority: string): number {
  switch (priority) {
    case "hot":
      return 0;
    case "normal":
      return 1;
    case "low":
      return 2;
    default:
      return 3;
  }
}

export function getPriorityBadgeClass(priority: string): string {
  switch (priority) {
    case "hot":
      return "bg-red-100 text-red-800";
    case "normal":
      return "bg-yellow-100 text-yellow-800";
    case "low":
      return "bg-gray-100 text-gray-700";
    default:
      return "bg-gray-100 text-gray-700";
  }
}

export function getPriorityLabel(priority: string): string {
  switch (priority) {
    case "hot":
      return "\u{1F534} Hot";
    case "normal":
      return "\u{1F7E1} Normal";
    case "low":
      return "\u26AA Low";
    default:
      return "\u26AA " + priority;
  }
}

const CENTRAL_STATES = new Set([
  "TX",
  "OK",
  "AR",
  "LA",
  "MO",
  "IA",
  "MN",
  "WI",
  "IL",
  "TN",
  "MS",
  "AL",
  "KS",
  "NE",
  "SD",
  "ND",
]);

const PACIFIC_STATES = new Set([
  "CA",
  "OR",
  "WA",
  "NV",
  "ID",
  "MT",
  "WY",
  "UT",
  "CO",
  "NM",
  "AK",
]);

const EASTERN_STATES = new Set([
  "NY",
  "MA",
  "CT",
  "RI",
  "VT",
  "NH",
  "ME",
  "PA",
  "NJ",
  "MD",
  "DE",
  "DC",
  "VA",
  "WV",
  "NC",
  "SC",
  "GA",
  "FL",
  "OH",
  "MI",
  "IN",
  "KY",
]);

export function getTimezoneFromState(state: string | null): string {
  if (!state) return "America/Chicago";
  const s = state.toUpperCase();
  if (s === "AZ") return "America/Phoenix";
  if (CENTRAL_STATES.has(s)) return "America/Chicago";
  if (PACIFIC_STATES.has(s)) return "America/Los_Angeles";
  if (EASTERN_STATES.has(s)) return "America/New_York";
  return "America/Chicago";
}

const TZ_ABBR: Record<string, string> = {
  "America/Chicago": "CT",
  "America/Los_Angeles": "PT",
  "America/New_York": "ET",
  "America/Phoenix": "AZ",
};

export function getBestCallWindow(state: string | null): string {
  const tz = getTimezoneFromState(state);
  const abbr = TZ_ABBR[tz] ?? "CT";

  const now = new Date();
  const localTimeStr = now.toLocaleTimeString("en-US", {
    timeZone: tz,
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
  });
  const [hours] = localTimeStr.split(":").map(Number);

  if (hours < 9) {
    return `8:00\u20139:15 AM ${abbr}`;
  }
  return `4:30\u20135:30 PM ${abbr}`;
}

export function formatCallDuration(seconds: number | null): string {
  if (seconds == null || seconds === 0) return "< 1 min";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${s}s`;
}

export function getNextActionForOutcome(outcome: string): string {
  switch (outcome) {
    case "connected_positive":
      return "Generate meeting confirmation draft";
    case "connected_not_interested":
      return "Review for disqualify or DNC";
    case "voicemail":
      return "Schedule retry in 3 days";
    case "no_answer":
      return "Retry same day or next morning";
    case "callback_requested":
      return "Scheduled callback \u2014 mark as Hot";
    case "wrong_number":
      return "Update phone, continue email/LinkedIn only";
    default:
      return "No action defined";
  }
}

export function getStageUpdateForOutcome(outcome: string): string | null {
  switch (outcome) {
    case "connected_positive":
      return "replied_positive";
    case "connected_not_interested":
      return "replied_negative";
    default:
      return null;
  }
}

export function getNextActionDateOffset(outcome: string): number | null {
  switch (outcome) {
    case "voicemail":
      return 3;
    case "no_answer":
      return 1;
    case "callback_requested":
      return 0;
    default:
      return null;
  }
}
