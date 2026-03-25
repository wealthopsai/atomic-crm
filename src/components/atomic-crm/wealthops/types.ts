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
}

export interface EnrollmentWithRelations extends SequenceEnrollment {
  contacts: DraftContact | null;
  sequences: Sequence | null;
  company_name?: string;
}

export interface EmailDraftWithContact extends EmailDraft {
  contacts: DraftContact | null;
  company_name?: string;
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
  "meeting_booked",
  "meeting_completed",
  "proposal_sent",
  "converted",
  "nurture",
  "disqualified",
] as const;

export type PipelineStage = (typeof PIPELINE_STAGES)[number];
