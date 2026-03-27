-- Migration: Load sequence definitions from Hunter's outreach playbook
-- Sprint: sprint-4
-- Task: acafebc1-137b-4073-b464-9f2c62277082
-- Date: 2026-03-27

-- ============================================================
-- A1 — First Touch (New prospects, lead_score >= 70)
-- ============================================================
INSERT INTO sequences (id, name, playbook, description, total_steps, max_days, steps, active)
VALUES (
  'A1',
  'First Touch',
  'A',
  'New prospects with lead_score >= 70. Objective: get a reply. Email-first, LinkedIn at Day 7, phone at Day 14. 7 touches maximum over 28 days.',
  7,
  28,
  $steps_a1$[
    {
      "step_number": 1,
      "day": 1,
      "channel": "email",
      "purpose": "First impression — personal, brief, non-salesy. Hook on their specific trigger event.",
      "message_angle": "Lead with personalization_hooks.recommended_approach. Reference trigger_event and trigger_event_date. Subject formula: [First name] [company or event] — personal and specific. 75-120 words. CTA: propose specific days for a call. Warm smart friend tone, not a pitch. Sign as Marshall.",
      "send_window": {"start": "07:30", "end": "09:00", "days": ["tuesday","wednesday","thursday"]},
      "condition": null,
      "branch_logic": {
        "on_reply_positive": "Pause A1. Move stage to replied_positive. Enroll in A2 within 24h. Generate call brief for same-day or next-morning call.",
        "on_reply_negative": "Halt all sequences. Move stage to replied_negative. Set do_not_contact=true if unsubscribe or explicit remove. Log event reply_received sentiment=negative.",
        "on_reply_not_now": "Halt A1. Move stage to replied_not_now. Enroll in A3 starting Month 1. Log event reply_received sentiment=neutral.",
        "on_hard_bounce": "Halt email steps. Flag email_invalid=true. Attempt LinkedIn and phone only. Move to disqualified after 7 days if all channels fail.",
        "on_soft_bounce": "Retry after 3 days. After 3 soft bounces treat as hard bounce.",
        "on_no_response": "Proceed to step 2 on day 3."
      }
    },
    {
      "step_number": 2,
      "day": 3,
      "channel": "email",
      "purpose": "Soft follow-up. Acknowledge they are busy. Add a second angle.",
      "message_angle": "Different hook from personalization_hooks.hooks[1]. Brief value signal mentioning Goldman custody or alternatives access casually. Reply thread from Touch 1 same subject with Re: prefix. 50-80 words. Do not say just checking in or following up.",
      "send_window": {"start": "07:30", "end": "09:00", "days": ["tuesday","wednesday","thursday"]},
      "condition": "no_reply_to_step_1",
      "branch_logic": {
        "on_reply_positive": "Pause A1. Move stage to replied_positive. Enroll in A2 within 24h.",
        "on_reply_negative": "Halt all sequences. Move stage to replied_negative.",
        "on_reply_not_now": "Halt A1. Move stage to replied_not_now. Enroll in A3.",
        "on_hard_bounce": "Halt email steps. Flag email_invalid=true. Attempt LinkedIn and phone.",
        "on_no_response": "Proceed to step 3 on day 7."
      }
    },
    {
      "step_number": 3,
      "day": 7,
      "channel": "linkedin",
      "purpose": "Multi-channel presence. LinkedIn is a warmer surface for HNW individuals.",
      "message_angle": "Send connection request with personalized note max 280 chars: Hi [First name] I came across your [company/event] and wanted to connect. I work with entrepreneurs and business owners at Precept Legacy in Dallas. Happy to exchange ideas. Marshall. Do not pitch in the note.",
      "send_window": null,
      "condition": "no_reply_steps_1_2",
      "branch_logic": {
        "on_connection_accepted": "Log linkedin_connected=true with acceptance date. Proceed to step 4. Day 17 DM becomes available.",
        "on_connection_not_accepted_by_day_14": "Do not send DM. Continue email and phone steps on schedule. Do not send second connection request.",
        "on_reply_via_linkedin_dm": "Treat as positive reply. Pause A1. Move stage to replied_positive. Enroll in A2.",
        "on_no_response": "Proceed to step 4 on day 10."
      }
    },
    {
      "step_number": 4,
      "day": 10,
      "channel": "email",
      "purpose": "Add genuine value. Not a follow-up — a new reason to engage.",
      "message_angle": "Use personalization_hooks.hooks[2] or relevant market observation tied to their situation. If inheritance: estate planning complexity. If business sale: QSBS and tax structuring. 60-90 words. CTA: Happy to put together a few ideas if relevant.",
      "send_window": {"start": "07:30", "end": "09:00", "days": ["tuesday","wednesday","thursday"]},
      "condition": "no_reply_any_channel",
      "branch_logic": {
        "on_reply_positive": "Pause A1. Move stage to replied_positive. Enroll in A2 within 24h.",
        "on_reply_negative": "Halt all sequences. Move stage to replied_negative.",
        "on_reply_not_now": "Halt A1. Move stage to replied_not_now. Enroll in A3.",
        "on_no_response": "Proceed to step 5 on day 14."
      }
    },
    {
      "step_number": 5,
      "day": 14,
      "channel": "phone",
      "purpose": "Escalate to voice. Phone is the differentiator for HNW who have not responded to email.",
      "message_angle": "Call window: 8:00-9:00 AM or 4:30-5:30 PM prospect local time. Never during market hours. Call brief includes: one-sentence prospect summary, trigger event and date, opener line, 2-3 talking points, 3 objection handlers, proposed next step, voicemail script max 30 seconds: name, Precept Legacy, reference event, propose callback, number twice.",
      "send_window": {"start": "08:00", "end": "09:00", "secondary_start": "16:30", "secondary_end": "17:30"},
      "condition": "no_reply_any_channel",
      "branch_logic": {
        "on_connected_positive": "Move stage to replied_positive. Move to A2. Generate meeting confirmation email draft. Update stage.",
        "on_connected_not_interested": "Stage to replied_negative. Review for disqualify or DNC.",
        "on_voicemail": "Log outcome. Schedule next call attempt +3 days. Continue email sequence in parallel.",
        "on_no_answer": "Log outcome. Retry same day different time or next day.",
        "on_callback_requested": "Create scheduled call reminder for specific date and time. Flag as Hot.",
        "on_wrong_number": "Update phone_jsonb. Flag number invalid. Continue email and LinkedIn only.",
        "on_no_response": "Proceed to step 6 on day 17 if LinkedIn connected."
      }
    },
    {
      "step_number": 6,
      "day": 17,
      "channel": "linkedin",
      "purpose": "Personal channel, lower friction than email. Only if connection was accepted.",
      "message_angle": "Short personal DM referencing connection: Good to be connected — I sent you a note by email a couple weeks ago. Happy to grab coffee if the timing is ever right. No pressure. 40-60 words.",
      "send_window": null,
      "condition": "linkedin_connected AND no_reply_any_channel",
      "branch_logic": {
        "on_reply_positive": "Pause A1. Move stage to replied_positive. Enroll in A2.",
        "on_reply_negative": "Halt all sequences. Move stage to replied_negative.",
        "on_not_connected": "Skip this step. Do not send DM. Continue to step 7.",
        "on_no_response": "Proceed to step 7 on day 21."
      }
    },
    {
      "step_number": 7,
      "day": 21,
      "channel": "email",
      "purpose": "Graceful breakup email. Creates urgency through finality. Highest reply rate step.",
      "message_angle": "Going to stop reaching out — know timing matters and do not want to be noise. If anything changes, info is below. New subject not reply thread: Closing the loop. 40-60 words. No CTA — just leave the door open.",
      "send_window": {"start": "07:30", "end": "09:00", "days": ["tuesday","wednesday","thursday"]},
      "condition": "no_reply_any_channel",
      "branch_logic": {
        "on_reply_positive": "Pause A1. Move stage to replied_positive. Enroll in A2.",
        "on_reply_negative": "Halt all sequences. Move stage to replied_negative.",
        "on_reply_not_now": "Halt A1. Move stage to replied_not_now. Enroll in A3.",
        "on_no_response_by_day_28": "Move stage to nurture. Enroll in A3 with nurture_reason=no_response."
      }
    }
  ]$steps_a1$::jsonb,
  true
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name, playbook = EXCLUDED.playbook,
  description = EXCLUDED.description, total_steps = EXCLUDED.total_steps,
  max_days = EXCLUDED.max_days, steps = EXCLUDED.steps,
  active = EXCLUDED.active, updated_at = now();

-- ============================================================
-- A2 — Warm Follow-Up (Positive reply, no meeting booked)
-- ============================================================
INSERT INTO sequences (id, name, playbook, description, total_steps, max_days, steps, active)
VALUES (
  'A2',
  'Warm Follow-Up',
  'A',
  'Triggered when prospect replies positively to A1 on any channel. Objective: book a specific meeting within 7 days. 4 touches maximum over 7-10 days. High priority — treat as hot, same-day response target.',
  4,
  10,
  $steps_a2$[
    {
      "step_number": 1,
      "day": 0,
      "channel": "phone",
      "purpose": "Same-day or next-morning call to thank them for responding and set a specific meeting time.",
      "message_angle": "Call same day if reply arrives before 3 PM local, next morning if after. Objective: set specific meeting time. If voicemail: leave brief message referencing their reply, give 2 specific time options, say you will follow up by email.",
      "send_window": {"same_day_cutoff": "15:00", "morning_window_start": "08:00", "morning_window_end": "09:30"},
      "condition": null,
      "branch_logic": {
        "on_meeting_booked": "Move stage to meeting_booked. Exit A2. Prepare call brief for meeting.",
        "on_voicemail": "Proceed to step 2 (email) same day.",
        "on_no_answer": "Proceed to step 2 (email) same day.",
        "on_no_response": "Proceed to step 2 on day 0."
      }
    },
    {
      "step_number": 2,
      "day": 0,
      "channel": "email",
      "purpose": "Email reply to their message if call not made or voicemail. Propose specific meeting times.",
      "message_angle": "Reference what they said specifically. Propose 2-3 specific time options: Would Monday at 2 PM or Tuesday at 10 AM work? Offer Zoom or in-person (Dallas meetings preferred). Short and direct. 40-60 words.",
      "send_window": null,
      "condition": "call_not_reached OR voicemail",
      "branch_logic": {
        "on_meeting_booked": "Move stage to meeting_booked. Exit A2.",
        "on_no_response": "Proceed to step 3 on day 3."
      }
    },
    {
      "step_number": 3,
      "day": 3,
      "channel": "email",
      "purpose": "Follow-up if no meeting confirmed. Make it easy to respond.",
      "message_angle": "Just wanted to make sure my last note did not get buried — happy to make it easy, just reply with a time that works. Include Calendly link or specific times again. 30-40 words.",
      "send_window": null,
      "condition": "no_meeting_confirmed",
      "branch_logic": {
        "on_meeting_booked": "Move stage to meeting_booked. Exit A2.",
        "on_no_response": "Proceed to step 4 on day 7."
      }
    },
    {
      "step_number": 4,
      "day": 7,
      "channel": "phone",
      "purpose": "Second call attempt if no meeting confirmed.",
      "message_angle": "Call brief includes: what they said in their reply, what was proposed, new time options. Voicemail: Still hoping to connect — let me know if a different time works, or feel free to grab time here: [Calendly].",
      "send_window": {"start": "08:00", "end": "09:30"},
      "condition": "no_meeting_confirmed",
      "branch_logic": {
        "on_meeting_booked": "Move stage to meeting_booked. Exit A2.",
        "on_no_meeting_after_day_10": "Move to A4 trigger at Day 30 from last contact. Stage stays replied_positive with note: went cold after positive reply."
      }
    }
  ]$steps_a2$::jsonb,
  true
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name, playbook = EXCLUDED.playbook,
  description = EXCLUDED.description, total_steps = EXCLUDED.total_steps,
  max_days = EXCLUDED.max_days, steps = EXCLUDED.steps,
  active = EXCLUDED.active, updated_at = now();

-- ============================================================
-- A3 — Long-Term Nurture (No response after A1, or not-now reply)
-- ============================================================
INSERT INTO sequences (id, name, playbook, description, total_steps, max_days, steps, active)
VALUES (
  'A3',
  'Long-Term Nurture',
  'A',
  'Triggered when A1 completes with no response (stage=nurture) OR explicit not-now reply. Objective: stay top of mind until timing aligns. Monthly for first 3 months, then bi-monthly. Indefinite until re-activation or explicit DNC.',
  5,
  NULL,
  $steps_a3$[
    {
      "step_number": 1,
      "day": 30,
      "channel": "email",
      "purpose": "Stay top of mind. First monthly nurture touch — market commentary.",
      "message_angle": "Market commentary email. 1 paragraph relevant to their wealth situation (interest rate environment, liquidity planning for business owners, etc). No fund pitches. Rotate touch types monthly: market commentary, article forward, event invitation, soft check-in, LinkedIn engagement.",
      "send_window": {"start": "07:30", "end": "09:00", "days": ["tuesday","wednesday","thursday"]},
      "condition": null,
      "branch_logic": {
        "on_reply": "Move stage to replied_positive. Enroll in A2 immediately.",
        "on_link_click_tracked": "Flag as warm. Escalate next touch to call and email combo.",
        "on_no_response": "Proceed to step 2 at day 60."
      }
    },
    {
      "step_number": 2,
      "day": 60,
      "channel": "email",
      "purpose": "Second monthly nurture — article forward.",
      "message_angle": "Relevant article forward: Saw this and thought of you given [trigger_event] plus 1-sentence note plus link. 20-30 words total.",
      "send_window": {"start": "07:30", "end": "09:00", "days": ["tuesday","wednesday","thursday"]},
      "condition": "no_reply",
      "branch_logic": {
        "on_reply": "Move stage to replied_positive. Enroll in A2.",
        "on_new_trigger_event": "Reset stage to researched. Re-enroll in A1.",
        "on_linkedin_content_engagement": "DM within 24h referencing their engagement.",
        "on_no_response": "Proceed to step 3 at day 90."
      }
    },
    {
      "step_number": 3,
      "day": 90,
      "channel": "email",
      "purpose": "Third monthly nurture — event invitation.",
      "message_angle": "Invite to Precept webinar, Dallas YPO event, or industry conference where Marshall will be present. Frame as low-key. No pressure.",
      "send_window": {"start": "07:30", "end": "09:00", "days": ["tuesday","wednesday","thursday"]},
      "condition": "no_reply",
      "branch_logic": {
        "on_reply": "Move stage to replied_positive. Enroll in A2.",
        "on_linkedin_accepted": "Send A1 Day 17 DM. Log engagement.",
        "on_no_response": "Proceed to step 4 at day 150 (bi-monthly)."
      }
    },
    {
      "step_number": 4,
      "day": 150,
      "channel": "email",
      "purpose": "Bi-monthly soft check-in.",
      "message_angle": "Still think about what you mentioned re: timing. Wanted to see if anything has changed. No pressure. 30 words.",
      "send_window": {"start": "07:30", "end": "09:00", "days": ["tuesday","wednesday","thursday"]},
      "condition": "no_reply",
      "branch_logic": {
        "on_reply": "Move stage to replied_positive. Enroll in A2.",
        "on_new_trigger_event": "Reset stage to researched. Re-enroll in A1.",
        "on_referral_received": "Override to A2. Personalized intro acknowledging referrer.",
        "on_no_response": "Proceed to step 5 at day 210."
      }
    },
    {
      "step_number": 5,
      "day": 210,
      "channel": "linkedin",
      "purpose": "LinkedIn content engagement — maintain presence without direct message.",
      "message_angle": "Like or comment on a relevant post (business, leadership, entrepreneurship). No message needed. Just presence. Max 1 engagement per week per prospect. Do not engage with personal posts.",
      "send_window": null,
      "condition": "linkedin_connected AND no_reply",
      "branch_logic": {
        "on_linkedin_dm_received": "Treat as positive reply. Enroll in A2.",
        "on_linkedin_engages_marshalls_content": "DM within 24h: Saw you liked [post] — glad it resonated. Still happy to connect if the timing is ever right.",
        "on_12_months_zero_engagement": "Send one final re-engagement email. If no response, move to disqualified.",
        "on_no_response": "Continue bi-monthly cycle. Repeat steps 4-5 alternating."
      }
    }
  ]$steps_a3$::jsonb,
  true
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name, playbook = EXCLUDED.playbook,
  description = EXCLUDED.description, total_steps = EXCLUDED.total_steps,
  max_days = EXCLUDED.max_days, steps = EXCLUDED.steps,
  active = EXCLUDED.active, updated_at = now();

-- ============================================================
-- A4 — Re-Engagement (Went cold after positive reply)
-- ============================================================
INSERT INTO sequences (id, name, playbook, description, total_steps, max_days, steps, active)
VALUES (
  'A4',
  'Re-Engagement',
  'A',
  'Triggered 30 days after a positive reply with no meeting booked. Objective: win back lost momentum with a completely different angle. 3 touches over 14 days (days 30, 37, 44 from last contact).',
  3,
  14,
  $steps_a4$[
    {
      "step_number": 1,
      "day": 30,
      "channel": "email",
      "purpose": "Different angle entirely — do not reference prior email thread. Win back momentum.",
      "message_angle": "New subject line. New personalization hook (hooks[1] if not used, or derive new hook from updated research). Lightly acknowledge time: I know things have a way of getting busy. Attach or reference something of genuine value: market observation, fund access note relevant to their situation. CTA: specific meeting ask framed as easy — even a 15-minute call would be worthwhile. 80-100 words.",
      "send_window": {"start": "07:30", "end": "09:00", "days": ["tuesday","wednesday","thursday"]},
      "condition": "30_days_since_last_contact_AND_positive_reply_on_record",
      "branch_logic": {
        "on_reply_positive": "Move stage to replied_positive. Enroll in A2.",
        "on_reply_negative": "Move stage to replied_negative. Halt all sequences.",
        "on_no_response": "Proceed to step 2 on day 37."
      }
    },
    {
      "step_number": 2,
      "day": 37,
      "channel": "phone",
      "purpose": "Re-engagement phone call. Reference original positive engagement.",
      "message_angle": "Call brief flagged as re-engagement — previously responded positively. Opener: We connected briefly a while back... Voicemail: short, name, Precept, reference their situation, propose a time.",
      "send_window": {"start": "08:00", "end": "09:00", "secondary_start": "16:30", "secondary_end": "17:30"},
      "condition": "no_reply_step_1",
      "branch_logic": {
        "on_connected_positive": "Move stage to replied_positive. Enroll in A2.",
        "on_connected_not_interested": "Move stage to replied_negative.",
        "on_voicemail": "Log. Continue to step 3.",
        "on_no_answer": "Log. Retry once. Continue to step 3.",
        "on_no_response": "Proceed to step 3 on day 44."
      }
    },
    {
      "step_number": 3,
      "day": 44,
      "channel": "email",
      "purpose": "Final breakup email — shorter version. Leave door open with zero pressure.",
      "message_angle": "Will stop reaching out — but the door is open whenever the timing makes sense. Breakup format, short, no CTA.",
      "send_window": {"start": "07:30", "end": "09:00", "days": ["tuesday","wednesday","thursday"]},
      "condition": "no_reply_steps_1_2",
      "branch_logic": {
        "on_reply_positive": "Move stage to replied_positive. Enroll in A2.",
        "on_no_response": "Move to nurture (A3) with nurture_reason=re_engagement_failed. Lower touch frequency to bi-monthly."
      }
    }
  ]$steps_a4$::jsonb,
  true
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name, playbook = EXCLUDED.playbook,
  description = EXCLUDED.description, total_steps = EXCLUDED.total_steps,
  max_days = EXCLUDED.max_days, steps = EXCLUDED.steps,
  active = EXCLUDED.active, updated_at = now();

-- ============================================================
-- B1 — Institutional First Touch (Family offices and RIAs)
-- ============================================================
INSERT INTO sequences (id, name, playbook, description, total_steps, max_days, steps, active)
VALUES (
  'B1',
  'Institutional First Touch',
  'B',
  'Triggered when research is complete and institutional prospect is in first_touch_active. Objective: establish peer-level relationship and propose a 20-minute intro call. 6 touches over 45 days. Peer-to-peer tone, allocator-to-allocator.',
  6,
  45,
  $steps_b1$[
    {
      "step_number": 1,
      "day": 1,
      "channel": "email",
      "purpose": "First peer-level email. Establish access, infrastructure, structural benefits — not performance.",
      "message_angle": "Subject: [Your firm name] + Silver Lake Access — [their firm name]. Lead with access angle: may already have direct Silver Lake exposure but our vehicle offers reduced minimums with quarterly liquidity windows and Precept handling all administration. Include: Goldman Sachs Advisor Solutions custody, Precept handles fund administration with no operational lift, quarterly allocation windows with next date, offer to share investment memo and DDQ. 100-150 words. CTA: Would a 20-minute call make sense in the next two weeks?",
      "send_window": {"start": "08:00", "end": "09:30", "days": ["tuesday","wednesday","thursday"]},
      "condition": null,
      "branch_logic": {
        "on_reply_positive": "Move stage to engaged. Schedule intro call. Prepare institutional intro deck.",
        "on_reply_negative_explicit_pass": "Move stage to declined. Note reason: mandate conflict, existing Silver Lake direct, etc. Consider revisiting in 12 months.",
        "on_reply_not_this_quarter": "Move stage to nurture. Enroll in B3. Note next allocation window, flag re-engagement 45 days prior.",
        "on_no_response": "Proceed to step 2 on day 5."
      }
    },
    {
      "step_number": 2,
      "day": 5,
      "channel": "email",
      "purpose": "Add one structural data point not in Touch 1.",
      "message_angle": "Reply thread from Touch 1. Add one new data point: e.g., Precept direct relationship with Silver Lake fund management team, or quarterly minimum allocation figure. 60-80 words.",
      "send_window": {"start": "08:00", "end": "09:30", "days": ["tuesday","wednesday","thursday"]},
      "condition": "no_reply_step_1",
      "branch_logic": {
        "on_reply_positive": "Move stage to engaged. Schedule intro call.",
        "on_reply_not_this_quarter": "Move stage to nurture. Enroll in B3.",
        "on_no_response": "Proceed to step 3 on day 10."
      }
    },
    {
      "step_number": 3,
      "day": 10,
      "channel": "linkedin",
      "purpose": "Professional LinkedIn connection request.",
      "message_angle": "Note max 280 chars: Hi [First name] — I reached out by email regarding Silver Lake access. Wanted to connect here as well. Marshall McKinney, Precept Legacy. Do not pitch in the connection note.",
      "send_window": null,
      "condition": "no_reply_steps_1_2",
      "branch_logic": {
        "on_connection_accepted_no_email_reply": "Send LinkedIn DM on day 20 (5 days after connection): Good to connect. I sent a couple emails about our Silver Lake feeder vehicle — happy to share the memo if it is worth a look.",
        "on_reply_via_linkedin": "Move stage to engaged. Schedule intro call.",
        "on_no_response": "Proceed to step 4 on day 15."
      }
    },
    {
      "step_number": 4,
      "day": 15,
      "channel": "email",
      "purpose": "New angle referencing their ADV investment mandate.",
      "message_angle": "Reference their ADV filing: I noticed [their firm] has meaningful alts exposure — thought this might be worth a look given your existing orientation. Frame as peer insight not sales. 80-100 words.",
      "send_window": {"start": "08:00", "end": "09:30", "days": ["tuesday","wednesday","thursday"]},
      "condition": "no_reply_any_channel",
      "branch_logic": {
        "on_reply_positive": "Move stage to engaged.",
        "on_reply_not_this_quarter": "Move stage to nurture. Enroll in B3.",
        "on_no_response": "Proceed to step 5 on day 25."
      }
    },
    {
      "step_number": 5,
      "day": 25,
      "channel": "phone",
      "purpose": "Institutional cold call with peer tone.",
      "message_angle": "Call brief includes: firm name, CIO name, AUM, known alts allocation, Silver Lake value prop, institutional objection handlers. Voicemail max 30 seconds peer tone referencing prior emails and proposing a call. Best call time for family office CIOs: 8:30-9:30 AM or 3:30-4:30 PM.",
      "send_window": {"start": "08:30", "end": "09:30", "secondary_start": "15:30", "secondary_end": "16:30"},
      "condition": "no_reply_any_channel",
      "branch_logic": {
        "on_connected_positive": "Move stage to engaged. Schedule intro call.",
        "on_connected_not_interested": "Move stage to declined.",
        "on_voicemail": "Log. Continue to step 6.",
        "on_no_answer": "Log. Retry once. Continue to step 6.",
        "on_no_response": "Proceed to step 6 on day 35."
      }
    },
    {
      "step_number": 6,
      "day": 35,
      "channel": "email",
      "purpose": "Final breakup email. Leave door open for future allocation window.",
      "message_angle": "Will stop reaching out — but if the timing ever aligns with an allocation window, happy to revisit. Include fund one-pager as attachment if compliance-approved.",
      "send_window": {"start": "08:00", "end": "09:30", "days": ["tuesday","wednesday","thursday"]},
      "condition": "no_reply_any_channel",
      "branch_logic": {
        "on_reply_positive": "Move stage to engaged.",
        "on_no_response_after_day_45": "Move stage to nurture. Enroll in B3."
      }
    }
  ]$steps_b1$::jsonb,
  true
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name, playbook = EXCLUDED.playbook,
  description = EXCLUDED.description, total_steps = EXCLUDED.total_steps,
  max_days = EXCLUDED.max_days, steps = EXCLUDED.steps,
  active = EXCLUDED.active, updated_at = now();

-- ============================================================
-- B2 — Due Diligence Support
-- ============================================================
INSERT INTO sequences (id, name, playbook, description, total_steps, max_days, steps, active)
VALUES (
  'B2',
  'Due Diligence Support',
  'B',
  'Triggered when institutional prospect moves to dd_active. Objective: make due diligence as easy as possible. Remove friction. Answer everything fast. Send full materials package within 24h of DD request. Weekly check-ins through decision.',
  6,
  42,
  $steps_b2$[
    {
      "step_number": 1,
      "day": 0,
      "channel": "email",
      "purpose": "Send complete materials package within 24h of DD request.",
      "message_angle": "Send full DD package: fund investment memo (2-3 pages), DDQ (standard institutional DDQ), Silver Lake fund overview and track record summary (permissible to share), Precept firm brochure (ADV Part 2), Goldman Sachs Advisor Solutions custody summary, References: 2-3 existing allocators willing to speak. Update dd_checklist: memo_sent=true, ddq_sent=true.",
      "send_window": null,
      "condition": "dd_request_received",
      "branch_logic": {
        "on_ddq_returned": "Update dd_checklist ddq_received=true. Schedule 30-min call to walk through materials.",
        "on_questions_received": "Answer within 24h. Update notes.",
        "on_no_response_day_5": "Follow up to confirm receipt."
      }
    },
    {
      "step_number": 2,
      "day": 7,
      "channel": "phone",
      "purpose": "30-minute call with Marshall to walk through materials.",
      "message_angle": "Offer to walk through the materials and answer any questions. Update dd_checklist call_completed=true after call.",
      "send_window": {"start": "09:00", "end": "16:00"},
      "condition": "materials_sent",
      "branch_logic": {
        "on_call_completed": "Update dd_checklist call_completed=true.",
        "on_references_requested": "Arrange references within 48h. Update dd_checklist references_provided=true.",
        "on_no_response": "Follow up by email."
      }
    },
    {
      "step_number": 3,
      "day": 14,
      "channel": "email",
      "purpose": "References coordination if requested, or soft check-in on process.",
      "message_angle": "If references requested: arrange within 48h and introduce. If not requested: soft check-in — Where are you in your process? Any outstanding questions? Weekly cadence from here.",
      "send_window": {"start": "09:00", "end": "11:00"},
      "condition": "dd_active",
      "branch_logic": {
        "on_references_provided": "Update dd_checklist references_provided=true.",
        "on_ic_presentation_scheduled": "Update dd_checklist ic_presented=true.",
        "on_no_response": "Continue weekly check-ins."
      }
    },
    {
      "step_number": 4,
      "day": 21,
      "channel": "email",
      "purpose": "Weekly check-in: process status and outstanding questions.",
      "message_angle": "Where are you in your process? Any outstanding questions I can answer? Keep brief. Monthly: send any fund updates, NAV reports, or Silver Lake news relevant to their evaluation.",
      "send_window": {"start": "09:00", "end": "11:00"},
      "condition": "dd_active AND no_verbal_commitment",
      "branch_logic": {
        "on_verbal_commitment": "Move stage to allocation_pending.",
        "on_explicit_pass": "Move stage to declined. Note reason.",
        "on_no_response": "Continue weekly check-ins."
      }
    },
    {
      "step_number": 5,
      "day": 28,
      "channel": "email",
      "purpose": "Fund update or NAV report or Silver Lake portfolio news.",
      "message_angle": "Send any relevant fund updates, NAV reports, or Silver Lake portfolio news (acquisition, IPO, exit). Brief note contextualizing relevance to their evaluation.",
      "send_window": {"start": "09:00", "end": "11:00"},
      "condition": "dd_active AND no_verbal_commitment",
      "branch_logic": {
        "on_verbal_commitment": "Move stage to allocation_pending.",
        "on_no_response": "Continue to step 6."
      }
    },
    {
      "step_number": 6,
      "day": 35,
      "channel": "phone",
      "purpose": "Final check-in call. Assess where they are in decision process.",
      "message_angle": "Check all DD checklist items: memo_sent, ddq_sent, ddq_received, references_provided, call_completed, ic_presented. Move to dd_complete when all done and prospect confirms. Verbal commitment moves to allocation_pending.",
      "send_window": {"start": "09:00", "end": "16:00"},
      "condition": "dd_active",
      "branch_logic": {
        "on_verbal_commitment": "Move stage to allocation_pending.",
        "on_dd_complete_all_items": "Move stage to dd_complete.",
        "on_explicit_pass": "Move stage to declined.",
        "on_no_response": "Continue monthly updates while in dd_active."
      }
    }
  ]$steps_b2$::jsonb,
  true
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name, playbook = EXCLUDED.playbook,
  description = EXCLUDED.description, total_steps = EXCLUDED.total_steps,
  max_days = EXCLUDED.max_days, steps = EXCLUDED.steps,
  active = EXCLUDED.active, updated_at = now();

-- ============================================================
-- B3 — Institutional Nurture (Quarterly touches)
-- ============================================================
INSERT INTO sequences (id, name, playbook, description, total_steps, max_days, steps, active)
VALUES (
  'B3',
  'Institutional Nurture',
  'B',
  'Triggered after B1 completes with no response or a not-this-quarter reply. Objective: stay visible to institutional prospects. Quarterly touches tied to fund activity and allocation windows. Indefinite until re-activation or explicit decline.',
  5,
  NULL,
  $steps_b3$[
    {
      "step_number": 1,
      "day": 45,
      "channel": "email",
      "purpose": "Quarterly allocation window reminder — 45 days before next window.",
      "message_angle": "Allocation window reminder with current available capacity and updated fund details. Specific: next allocation window is [date], capacity available is [amount]. Peer tone. No pitch language.",
      "send_window": {"start": "08:00", "end": "09:30", "days": ["tuesday","wednesday","thursday"]},
      "condition": "allocation_window_approaching_45_days",
      "branch_logic": {
        "on_reply_positive": "Move stage to engaged. Enroll in B2 or schedule intro call.",
        "on_reply_not_this_quarter": "Note timing constraint. Re-trigger step 1 before next allocation window.",
        "on_no_response": "Proceed to step 2 at next trigger event."
      }
    },
    {
      "step_number": 2,
      "day": 0,
      "channel": "email",
      "purpose": "Silver Lake portfolio event news — major acquisition, IPO, or exit.",
      "message_angle": "Thought this might be relevant given our access to SLPE. Brief, non-sales. 1-2 sentences plus link to news. No pitch.",
      "send_window": {"start": "08:00", "end": "09:30"},
      "condition": "silver_lake_major_portfolio_event",
      "branch_logic": {
        "on_reply": "Move stage to engaged. Enroll in B1 step 4 or schedule call.",
        "on_no_response": "Log and continue quarterly cadence."
      }
    },
    {
      "step_number": 3,
      "day": 0,
      "channel": "email",
      "purpose": "Major market event commentary relevant to PE allocation.",
      "message_angle": "1-paragraph market commentary relevant to PE allocation or alternatives in general. Contextual to their known mandate. Non-sales. Example: rate environment impact on PE return expectations, LP liquidity dynamics.",
      "send_window": {"start": "08:00", "end": "09:30"},
      "condition": "major_market_event_relevant_to_pe",
      "branch_logic": {
        "on_reply": "Move stage to engaged.",
        "on_no_response": "Continue quarterly cadence."
      }
    },
    {
      "step_number": 4,
      "day": 365,
      "channel": "email",
      "purpose": "Annual re-engagement check-in.",
      "message_angle": "It has been a year — wanted to check if your mandate or timeline has changed. Short, direct, peer tone. 30-40 words.",
      "send_window": {"start": "08:00", "end": "09:30", "days": ["tuesday","wednesday","thursday"]},
      "condition": "12_months_since_enrollment",
      "branch_logic": {
        "on_reply_positive": "Move stage to engaged. Re-enroll in B1 from step 4 with fresh angle.",
        "on_reply_negative": "Move stage to declined.",
        "on_no_response": "Continue bi-annual touches."
      }
    },
    {
      "step_number": 5,
      "day": 0,
      "channel": "email",
      "purpose": "New CIO or PM joins their firm — fresh outreach to new decision maker.",
      "message_angle": "Research new contact. Start B1 fresh for new CIO or PM. Previous history with firm noted in context but new relationship starts from scratch.",
      "send_window": null,
      "condition": "new_cio_or_pm_detected",
      "branch_logic": {
        "on_contact_identified": "Create new contact record for new CIO or PM. Link to institutional_firms. Enroll in B1.",
        "on_regulatory_change_affecting_pe_access": "Email plus LinkedIn note about regulatory change relevance.",
        "on_adv_amendment_shows_pe": "Re-engage with updated pitch referencing new mandate signal."
      }
    }
  ]$steps_b3$::jsonb,
  true
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name, playbook = EXCLUDED.playbook,
  description = EXCLUDED.description, total_steps = EXCLUDED.total_steps,
  max_days = EXCLUDED.max_days, steps = EXCLUDED.steps,
  active = EXCLUDED.active, updated_at = now();

-- Verify all 7 sequences inserted
SELECT id, name, playbook, total_steps, max_days, jsonb_array_length(steps) AS step_count, active
FROM sequences
ORDER BY playbook, id;
