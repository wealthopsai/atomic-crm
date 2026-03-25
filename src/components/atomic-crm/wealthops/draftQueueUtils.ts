export function getRetailCommStatus(count: number): {
  color: "green" | "red";
  label: string;
} {
  return {
    color: count >= 20 ? "red" : "green",
    label: `${count} / 25 retail comms this month`,
  };
}

export function isOverdue(date: string | null): boolean {
  if (!date) return false;
  return new Date(date) < new Date();
}

export function formatStepLabel(
  sequenceId: string | null,
  step: number | null,
): string {
  if (!sequenceId || step == null) return "—";
  return `${sequenceId} — Step ${step}`;
}

export function formatDraftType(
  draftType: "connection_request" | "direct_message" | "content_engagement",
): string {
  const map: Record<string, string> = {
    connection_request: "Connection Request",
    direct_message: "Direct Message",
    content_engagement: "Content Engagement",
  };
  return map[draftType] ?? draftType;
}

export function getCharacterCountColor(
  count: number,
  draftType: string,
): "red" | "default" {
  if (draftType === "connection_request" && count > 280) return "red";
  return "default";
}
