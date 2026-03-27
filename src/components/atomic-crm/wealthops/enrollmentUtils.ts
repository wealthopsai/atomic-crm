/**
 * enrollmentUtils.ts
 * Helpers for auto-enrollment logic triggered by first-touch email drafts.
 */

/**
 * Returns true if an email draft qualifies as a first-touch A1 step 1 draft
 * that should trigger sequence enrollment.
 */
export function isFirstTouchDraft(
  sequenceId: string | null,
  sequenceStep: number | null,
): boolean {
  return sequenceId === "A1" && sequenceStep === 1;
}

/**
 * Calculates the next_action_date for step 2 of sequence A1 (day 3 from now).
 * Returns an ISO string.
 */
export function getA1Step2DueDate(fromDate: Date = new Date()): string {
  const due = new Date(fromDate);
  due.setDate(due.getDate() + 3);
  return due.toISOString();
}

/**
 * Builds the sequence_enrolled event payload for an A1 enrollment.
 */
export function buildEnrollmentEventPayload(
  sequenceName: string,
  draftId: number,
): Record<string, unknown> {
  return {
    sequence_name: sequenceName,
    step: 1,
    triggered_by: "first_touch_draft_insert",
    draft_id: draftId,
  };
}

/**
 * Returns the stage a contact should be moved to on first-touch enrollment.
 * Only transitions from 'researched' to 'first_touch_active'.
 */
export function resolveStageAfterEnrollment(
  currentStage: string,
): string {
  if (currentStage === "researched") return "first_touch_active";
  return currentStage;
}
