import { PIPELINE_STAGES } from "./types";

// ---- Input Row Types ----

export interface EmailDraftRow {
  sequence_id: string | null;
  sequence_step: number | null;
  status: string;
}

export interface ContactRow {
  id: number;
  current_stage: string | null;
  trigger_event: string | null;
}

export interface StageEventRow {
  payload: { from_stage?: string; to_stage?: string } | null;
  contact_id: number | null;
  created_at: string;
}

export interface EnrollmentRow {
  sequence_id: string | null;
  status: string;
}

// ---- Email Performance ----

export interface EmailStats {
  sequenceId: string;
  sequenceStep: number;
  total: number;
  approved: number;
  sent: number;
  rejected: number;
  approvalRate: number;
}

export function computeEmailStats(drafts: EmailDraftRow[]): EmailStats[] {
  const map = new Map<string, EmailStats>();

  for (const d of drafts) {
    const seqId = d.sequence_id ?? "unknown";
    const step = d.sequence_step ?? 0;
    const key = `${seqId}::${step}`;

    let entry = map.get(key);
    if (!entry) {
      entry = {
        sequenceId: seqId,
        sequenceStep: step,
        total: 0,
        approved: 0,
        sent: 0,
        rejected: 0,
        approvalRate: 0,
      };
      map.set(key, entry);
    }

    entry.total += 1;
    if (d.status === "approved") entry.approved += 1;
    if (d.status === "sent") entry.sent += 1;
    if (d.status === "rejected") entry.rejected += 1;
  }

  const result = Array.from(map.values());
  for (const entry of result) {
    entry.approvalRate = entry.total > 0 ? entry.approved / entry.total : 0;
  }

  return result.sort((a, b) =>
    a.sequenceId === b.sequenceId
      ? a.sequenceStep - b.sequenceStep
      : a.sequenceId.localeCompare(b.sequenceId),
  );
}

// ---- Conversion Funnel ----

export interface FunnelStage {
  stage: string;
  label: string;
  count: number;
  dropoffRate: number;
  conversionRate: number;
}

const FUNNEL_STAGES = [
  "new",
  "researched",
  "first_touch_active",
  "replied_positive",
  "meeting_booked",
  "meeting_completed",
  "converted",
] as const;

function formatStageLabel(stage: string): string {
  return stage
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export function computeConversionFunnel(contacts: ContactRow[]): FunnelStage[] {
  // Build ordered index of stages for comparison
  const stageOrder = new Map<string, number>();
  for (let i = 0; i < PIPELINE_STAGES.length; i++) {
    stageOrder.set(PIPELINE_STAGES[i], i);
  }

  const stageCounts = new Map<string, number>();
  for (const s of FUNNEL_STAGES) {
    stageCounts.set(s, 0);
  }

  // A contact at a later stage has passed through all earlier funnel stages
  for (const c of contacts) {
    const contactOrder = stageOrder.get(c.current_stage ?? "") ?? -1;
    for (const funnelStage of FUNNEL_STAGES) {
      const funnelOrder = stageOrder.get(funnelStage) ?? -1;
      if (contactOrder >= funnelOrder && funnelOrder >= 0) {
        stageCounts.set(funnelStage, (stageCounts.get(funnelStage) ?? 0) + 1);
      }
    }
  }

  const topCount = stageCounts.get(FUNNEL_STAGES[0]) ?? 0;
  const result: FunnelStage[] = [];

  for (let i = 0; i < FUNNEL_STAGES.length; i++) {
    const stage = FUNNEL_STAGES[i];
    const count = stageCounts.get(stage) ?? 0;
    const prevCount = i > 0 ? (stageCounts.get(FUNNEL_STAGES[i - 1]) ?? 0) : 0;

    result.push({
      stage,
      label: formatStageLabel(stage),
      count,
      dropoffRate:
        i === 0
          ? 0
          : prevCount > 0
            ? Math.round(((prevCount - count) / prevCount) * 100)
            : 0,
      conversionRate: topCount > 0 ? Math.round((count / topCount) * 100) : 0,
    });
  }

  return result;
}

// ---- Pipeline Velocity ----

export interface StageVelocity {
  stage: string;
  label: string;
  avgDaysInStage: number | null;
  contactCount: number;
}

export function computePipelineVelocity(
  stageEvents: StageEventRow[],
): StageVelocity[] {
  // Sort events by time
  const sorted = [...stageEvents].sort(
    (a, b) =>
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  );

  // For each contact, collect enter/exit timestamps per stage
  const stageTimings = new Map<
    string,
    { durations: number[]; contactIds: Set<number> }
  >();

  // Track when each contact entered a stage
  const contactStageEntry = new Map<string, Date>();

  for (const event of sorted) {
    if (!event.payload || !event.contact_id) continue;
    const { from_stage, to_stage } = event.payload;
    const contactId = event.contact_id;
    const eventTime = new Date(event.created_at);

    // Exiting from_stage
    if (from_stage) {
      const entryKey = `${contactId}::${from_stage}`;
      const entryTime = contactStageEntry.get(entryKey);
      if (entryTime) {
        const durationMs = eventTime.getTime() - entryTime.getTime();
        const durationDays = durationMs / (1000 * 60 * 60 * 24);

        let timing = stageTimings.get(from_stage);
        if (!timing) {
          timing = { durations: [], contactIds: new Set() };
          stageTimings.set(from_stage, timing);
        }
        timing.durations.push(durationDays);
        timing.contactIds.add(contactId);
        contactStageEntry.delete(entryKey);
      }
    }

    // Entering to_stage
    if (to_stage) {
      const entryKey = `${contactId}::${to_stage}`;
      contactStageEntry.set(entryKey, eventTime);
    }
  }

  return PIPELINE_STAGES.map((stage) => {
    const timing = stageTimings.get(stage);
    const avgDays =
      timing && timing.durations.length > 0
        ? Math.round(
            (timing.durations.reduce((a, b) => a + b, 0) /
              timing.durations.length) *
              10,
          ) / 10
        : null;

    return {
      stage,
      label: formatStageLabel(stage),
      avgDaysInStage: avgDays,
      contactCount: timing?.contactIds.size ?? 0,
    };
  });
}

// ---- Sequence Comparison ----

export interface SequenceStats {
  sequenceId: string;
  totalEnrolled: number;
  completed: number;
  exited: number;
  activeCount: number;
  completionRate: number;
  exitRate: number;
}

export function computeSequenceStats(
  enrollments: EnrollmentRow[],
): SequenceStats[] {
  const map = new Map<string, SequenceStats>();

  for (const e of enrollments) {
    const seqId = e.sequence_id ?? "unknown";
    let entry = map.get(seqId);
    if (!entry) {
      entry = {
        sequenceId: seqId,
        totalEnrolled: 0,
        completed: 0,
        exited: 0,
        activeCount: 0,
        completionRate: 0,
        exitRate: 0,
      };
      map.set(seqId, entry);
    }

    entry.totalEnrolled += 1;
    if (e.status === "completed") entry.completed += 1;
    if (e.status === "exited") entry.exited += 1;
    if (e.status === "active") entry.activeCount += 1;
  }

  const result = Array.from(map.values());
  for (const entry of result) {
    entry.completionRate =
      entry.totalEnrolled > 0 ? entry.completed / entry.totalEnrolled : 0;
    entry.exitRate =
      entry.totalEnrolled > 0 ? entry.exited / entry.totalEnrolled : 0;
  }

  return result;
}

// ---- Trigger Event Analysis ----

export interface TriggerEventStats {
  triggerEvent: string;
  totalContacts: number;
  repliedPositive: number;
  meetingBooked: number;
  converted: number;
  conversionRate: number;
}

export function computeTriggerEventStats(
  contacts: ContactRow[],
): TriggerEventStats[] {
  const map = new Map<string, TriggerEventStats>();

  const PIPELINE_ORDER = new Map<string, number>();
  for (let i = 0; i < PIPELINE_STAGES.length; i++) {
    PIPELINE_ORDER.set(PIPELINE_STAGES[i], i);
  }

  const repliedPositiveIdx = PIPELINE_ORDER.get("replied_positive") ?? -1;
  const meetingBookedIdx = PIPELINE_ORDER.get("meeting_booked") ?? -1;
  const convertedIdx = PIPELINE_ORDER.get("converted") ?? -1;

  for (const c of contacts) {
    const trigger = c.trigger_event ?? "unknown";
    let entry = map.get(trigger);
    if (!entry) {
      entry = {
        triggerEvent: trigger,
        totalContacts: 0,
        repliedPositive: 0,
        meetingBooked: 0,
        converted: 0,
        conversionRate: 0,
      };
      map.set(trigger, entry);
    }

    entry.totalContacts += 1;
    const stageIdx = PIPELINE_ORDER.get(c.current_stage ?? "") ?? -1;
    if (stageIdx >= repliedPositiveIdx && repliedPositiveIdx >= 0)
      entry.repliedPositive += 1;
    if (stageIdx >= meetingBookedIdx && meetingBookedIdx >= 0)
      entry.meetingBooked += 1;
    if (stageIdx >= convertedIdx && convertedIdx >= 0) entry.converted += 1;
  }

  const result = Array.from(map.values());
  for (const entry of result) {
    entry.conversionRate =
      entry.totalContacts > 0 ? entry.converted / entry.totalContacts : 0;
  }

  return result;
}
