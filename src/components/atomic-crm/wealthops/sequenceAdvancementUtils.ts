/**
 * sequenceAdvancementUtils.ts
 * Pure utility functions for advancing sequence enrollments.
 * No side effects, no fetch calls — operates on data structures from Supabase queries.
 */

/**
 * Determine what action to generate for a due enrollment step.
 * Reads the "channel" field from the step definition JSONB.
 */
export function getStepAction(
  sequenceId: string,
  stepNumber: number,
  steps: Record<string, unknown>[],
): "email" | "linkedin" | "call" | "skip" | null {
  const step = steps.find(
    (s) => s.step === stepNumber || s.step_number === stepNumber,
  );
  if (!step) return null;

  const channel = String(step.channel ?? "").toLowerCase();
  if (channel === "email") return "email";
  if (channel === "linkedin") return "linkedin";
  if (channel === "phone" || channel === "call") return "call";
  if (channel === "skip") return "skip";

  return null;
}

/**
 * Calculate next_action_date given a sequence's steps, the step just completed,
 * and a base date. Returns ISO string, or null if no more steps.
 */
export function getNextActionDate(
  steps: Record<string, unknown>[],
  currentStep: number,
  fromDate: Date = new Date(),
): string | null {
  const nextStepNumber = currentStep + 1;
  const nextStep = steps.find(
    (s) => s.step === nextStepNumber || s.step_number === nextStepNumber,
  );
  if (!nextStep) return null;

  const dayOffset = getStepDayOffset(nextStep);
  const due = new Date(fromDate);
  due.setDate(due.getDate() + dayOffset);
  return due.toISOString();
}

/**
 * Given a reply sentiment and current sequence, return the enrollment transition.
 */
export function resolveReplyBranch(opts: {
  sentiment: "positive" | "negative" | "not_now";
  currentSequenceId: string;
}): {
  newEnrollmentStatus: "paused" | "exited";
  newContactStage:
    | "replied_positive"
    | "replied_negative"
    | "replied_not_now"
    | "nurture";
  enrollInSequence: string | null;
  exitReason: string;
} {
  const { sentiment, currentSequenceId } = opts;

  switch (sentiment) {
    case "positive":
      return {
        newEnrollmentStatus: "paused",
        newContactStage: "replied_positive",
        enrollInSequence: "A2",
        exitReason: "positive_reply_received",
      };

    case "negative":
      return {
        newEnrollmentStatus: "exited",
        newContactStage: "replied_negative",
        enrollInSequence: null,
        exitReason: "negative_reply_received",
      };

    case "not_now": {
      // A2+ gets nurture stage; A1 gets replied_not_now
      const isA2OrLater =
        currentSequenceId !== "A1" && currentSequenceId >= "A2";
      return {
        newEnrollmentStatus: "exited",
        newContactStage: isA2OrLater ? "nurture" : "replied_not_now",
        enrollInSequence: "A3",
        exitReason: "not_now_reply_received",
      };
    }
  }
}

/**
 * Check if an enrollment is at or past its final step.
 */
export function isEnrollmentComplete(
  currentStep: number,
  totalSteps: number,
): boolean {
  return currentStep >= totalSteps;
}

/**
 * Get the stage to move to when a sequence completes with no reply
 * (exhausted all steps).
 */
export function resolveExhaustedStage(sequenceId: string): {
  newContactStage: "nurture" | "disqualified";
  enrollInSequence: string | null;
  exitReason: string;
} {
  if (sequenceId === "A1") {
    return {
      newContactStage: "nurture",
      enrollInSequence: "A3",
      exitReason: "no_response_sequence_exhausted",
    };
  }

  // A3 or any other sequence exhausted — disqualified, no further enrollment
  return {
    newContactStage: "disqualified",
    enrollInSequence: null,
    exitReason: "no_response_sequence_exhausted",
  };
}

/**
 * Given a step definition JSONB object, return its day offset.
 * Defaults to 0 if the "day" field is missing or not a number.
 */
export function getStepDayOffset(step: Record<string, unknown>): number {
  const day = step.day;
  if (typeof day === "number" && !isNaN(day)) return day;
  return 0;
}

/**
 * Validate whether a sequence enrollment should be processed today.
 * Returns true if currentStepDue <= today. Null due date means not due.
 */
export function isEnrollmentDueToday(
  currentStepDue: string | null,
  today: Date = new Date(),
): boolean {
  if (currentStepDue == null) return false;

  const dueDate = new Date(currentStepDue);
  // Compare UTC date portions only (ignore time)
  const dueDay = Date.UTC(
    dueDate.getUTCFullYear(),
    dueDate.getUTCMonth(),
    dueDate.getUTCDate(),
  );
  const todayDay = Date.UTC(
    today.getUTCFullYear(),
    today.getUTCMonth(),
    today.getUTCDate(),
  );

  return dueDay <= todayDay;
}
