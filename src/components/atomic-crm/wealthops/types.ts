import type { Identifier } from "ra-core";

export interface EmailDraft {
  id: number;
  contact_id: number;
  sequence_id: string | null;
  sequence_step: number | null;
  subject: string | null;
  body: string | null;
  from_address: string | null;
  to_address: string | null;
  status: "draft" | "approved" | "sent" | "rejected" | "edited";
  created_at: string;
  reviewed_at: string | null;
  sent_at: string | null;
  marshall_notes: string | null;
  retail_comm_flag: boolean | null;
  compliance_cleared: boolean | null;
}

export interface LinkedInDraft {
  id: number;
  contact_id: number;
  sequence_id: string | null;
  sequence_step: number | null;
  draft_type: "connection_request" | "direct_message" | "content_engagement";
  message_body: string | null;
  character_count: number | null;
  status: "draft" | "approved" | "sent" | "rejected";
  created_at: string;
  sent_at: string | null;
  linkedin_url: string | null;
}

export interface PipelineContact {
  id: number;
  first_name: string;
  last_name: string;
  current_stage: string;
  trigger_event: string | null;
  lead_score: number | null;
  next_action_date: string | null;
  last_touch_date: string | null;
  estimated_aum: string | null;
  avatar: { src: string } | null;
  company_id: Identifier | null;
  playbook: string | null;
  current_sequence: string | null;
}

export interface SequenceEnrollment {
  id: number;
  contact_id: number;
  sequence_id: string | null;
  enrolled_at: string | null;
  current_step: number | null;
  current_step_due: string | null;
  status: "active" | "paused" | "completed" | "exited";
  exit_reason: string | null;
  completed_at: string | null;
  paused_at: string | null;
  paused_reason: string | null;
  steps_completed: Record<string, unknown>[] | null;
  notes: string | null;
}

export interface Sequence {
  id: string;
  name: string;
  playbook: string | null;
  total_steps: number;
}

export interface RetailCommTracker {
  id: number;
  period_start: string;
  period_end: string;
  contact_count: number;
  threshold_warning_sent: boolean | null;
  threshold_exceeded: boolean | null;
}

export interface DraftContact {
  id: number;
  first_name: string;
  last_name: string;
  company_id: Identifier | null;
  trigger_event: string | null;
  estimated_aum: string | null;
  avatar: { src: string } | null;
  companies?: { id: number; name: string } | null;
}

export interface EnrollmentWithRelations extends SequenceEnrollment {
  contacts: DraftContact | null;
  sequences: Sequence | null;
}

export interface EmailDraftWithContact extends EmailDraft {
  contacts: DraftContact | null;
}

export interface LinkedInDraftWithContact extends LinkedInDraft {
  contacts: DraftContact | null;
}

export const PIPELINE_STAGES = [
  "new",
  "researching",
  "researched",
  "first_touch_active",
  "replied_positive",
  "replied_negative",
  "meeting_booked",
  "meeting_completed",
  "proposal_sent",
  "converted",
  "nurture",
  "disqualified",
] as const;

export type PipelineStage = (typeof PIPELINE_STAGES)[number];

export interface CallBrief {
  id: number;
  contact_id: number;
  sequence_id: string | null;
  sequence_step: number | null;
  call_priority: "hot" | "normal" | "low";
  scheduled_for: string | null;
  prospect_summary: string | null;
  trigger_summary: string | null;
  opener: string | null;
  talking_points: string[] | null;
  objection_handlers: Array<{ objection: string; response: string }> | null;
  voicemail_script: string | null;
  proposed_next_step: string | null;
  status: "pending" | "completed" | "skipped";
  created_at: string;
  call_log_id: number | null;
  // joined
  contact?: ContactSummary;
}

export interface CallLog {
  id: number;
  contact_id: number;
  call_brief_id: number | null;
  sequence_id: string | null;
  sequence_step: number | null;
  called_at: string;
  duration_seconds: number | null;
  outcome:
    | "connected_positive"
    | "connected_not_interested"
    | "voicemail"
    | "no_answer"
    | "callback_requested"
    | "wrong_number";
  notes: string | null;
  callback_scheduled_for: string | null;
  next_action_triggered: string | null;
  logged_by: string;
  created_at: string;
  // joined
  contact?: ContactSummary;
}

export interface ContactSummary {
  id: number;
  first_name: string;
  last_name: string;
  company_id: number | null;
  current_stage: string | null;
  trigger_event: string | null;
  estimated_aum: string | null;
  state: string | null;
  avatar: { src?: string } | null;
  current_sequence: string | null;
  total_calls: number;
  last_touch_date: string | null;
  last_touch_type: string | null;
  next_action: string | null;
  next_action_date: string | null;
  companies?: { id: number; name: string } | null;
}

export interface HourStats {
  hour: number;
  count: number;
  connectRate: number;
}

export interface DayStats {
  day: number;
  dayLabel: string;
  count: number;
  connectRate: number;
}

export interface OutcomeStats {
  outcome: string;
  count: number;
  percentage: number;
}

export interface SummaryStats {
  totalCalls: number;
  connectRate: number;
  meetingsBooked: number;
  avgCallsPerMeeting: number | null;
}

export interface LinkedInDraftRow {
  id: number;
  draft_type: string;
  status: string;
  created_at: string;
}
