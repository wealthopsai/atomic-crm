import type { PipelineContact, PipelineStage } from "./types";
import { PIPELINE_STAGES } from "./types";

export function formatStageName(stage: string): string {
  return stage
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export function getCardColor(contact: {
  next_action_date: string | null;
  last_touch_date: string | null;
}): "green" | "yellow" | "red" {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  if (contact.next_action_date) {
    const nextAction = new Date(contact.next_action_date);
    const nextActionDay = new Date(
      nextAction.getFullYear(),
      nextAction.getMonth(),
      nextAction.getDate(),
    );

    if (nextActionDay.getTime() === today.getTime()) return "yellow";
    if (nextActionDay > today) return "green";
    return "red";
  }

  if (contact.last_touch_date) {
    const lastTouch = new Date(contact.last_touch_date);
    const daysSinceTouch = Math.floor(
      (now.getTime() - lastTouch.getTime()) / (1000 * 60 * 60 * 24),
    );
    if (daysSinceTouch > 14) return "red";
  }

  return "red";
}

export function getLeadScoreColor(
  score: number | null,
): "green" | "yellow" | "red" {
  if (score == null) return "red";
  if (score >= 70) return "green";
  if (score >= 40) return "yellow";
  return "red";
}

export function getContactsByStage(
  contacts: PipelineContact[],
): Record<PipelineStage, PipelineContact[]> {
  const result = {} as Record<PipelineStage, PipelineContact[]>;
  for (const stage of PIPELINE_STAGES) {
    result[stage] = [];
  }
  for (const contact of contacts) {
    const stage = contact.current_stage as PipelineStage;
    if (result[stage]) {
      result[stage].push(contact);
    }
  }
  return result;
}

export function getDueDateColor(
  dateStr: string | null,
): "red" | "yellow" | "gray" {
  if (!dateStr) return "gray";
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const date = new Date(dateStr);
  const dateDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  if (dateDay < today) return "red";
  if (dateDay.getTime() === today.getTime()) return "yellow";
  return "gray";
}
