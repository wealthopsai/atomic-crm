import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/components/atomic-crm/providers/supabase/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import type { CallBrief, CallLog } from "./types";
import {
  getPriorityOrder,
  getPriorityBadgeClass,
  getPriorityLabel,
  getBestCallWindow,
  formatCallDuration,
  getNextActionForOutcome,
  getStageUpdateForOutcome,
  getNextActionDateOffset,
} from "./callUtils";

type Outcome = CallLog["outcome"];

const OUTCOME_OPTIONS: Array<{
  value: Outcome;
  label: string;
  emoji: string;
  color: string;
}> = [
  {
    value: "connected_positive",
    label: "Connected — Positive",
    emoji: "\u2705",
    color: "bg-green-600 hover:bg-green-700 text-white",
  },
  {
    value: "connected_not_interested",
    label: "Connected — Not Interested",
    emoji: "\u274C",
    color: "bg-red-600 hover:bg-red-700 text-white",
  },
  {
    value: "voicemail",
    label: "Voicemail",
    emoji: "\u{1F4EC}",
    color: "bg-blue-600 hover:bg-blue-700 text-white",
  },
  {
    value: "no_answer",
    label: "No Answer",
    emoji: "\u{1F4F5}",
    color: "bg-gray-500 hover:bg-gray-600 text-white",
  },
  {
    value: "callback_requested",
    label: "Callback Requested",
    emoji: "\u{1F550}",
    color: "bg-yellow-500 hover:bg-yellow-600 text-white",
  },
  {
    value: "wrong_number",
    label: "Wrong Number",
    emoji: "\u2753",
    color: "bg-orange-500 hover:bg-orange-600 text-white",
  },
];

const OUTCOME_LABELS: Record<string, string> = {};
for (const opt of OUTCOME_OPTIONS) {
  OUTCOME_LABELS[opt.value] = `${opt.emoji} ${opt.label}`;
}

function getStartOfToday(): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

export const DailyCallList = () => {
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [sheetBrief, setSheetBrief] = useState<CallBrief | null>(null);
  const queryClient = useQueryClient();

  const {
    data: briefs,
    isLoading: briefsLoading,
    error: briefsError,
  } = useQuery({
    queryKey: ["call_briefs_daily"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("call_briefs")
        .select(
          "*, contacts(id, first_name, last_name, company_id, current_stage, trigger_event, estimated_aum, state, avatar, current_sequence, total_calls, last_touch_date, last_touch_type, next_action, next_action_date)",
        )
        .eq("status", "pending")
        .order("scheduled_for", { ascending: true });

      if (error) throw error;

      const briefsWithCompany: CallBrief[] = [];
      for (const brief of data as CallBrief[]) {
        let companyName: string | undefined;
        if (brief.contact?.company_id) {
          const { data: company } = await supabase
            .from("companies")
            .select("name")
            .eq("id", brief.contact.company_id)
            .single();
          companyName = company?.name ?? undefined;
        }
        briefsWithCompany.push({ ...brief, company_name: companyName });
      }

      return briefsWithCompany.sort(
        (a, b) =>
          getPriorityOrder(a.call_priority) - getPriorityOrder(b.call_priority),
      );
    },
  });

  const { data: todayLogs } = useQuery({
    queryKey: ["call_logs_today"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("call_logs")
        .select(
          "*, contacts(id, first_name, last_name, company_id, current_stage, trigger_event, estimated_aum, state, avatar, current_sequence, total_calls, last_touch_date, last_touch_type, next_action, next_action_date)",
        )
        .gte("called_at", getStartOfToday())
        .order("called_at", { ascending: false });

      if (error) throw error;
      return data as CallLog[];
    },
  });

  const activeBriefs = briefs?.filter(
    (b) => priorityFilter === "all" || b.call_priority === priorityFilter,
  );

  const todayConnected =
    todayLogs?.filter(
      (l) =>
        l.outcome === "connected_positive" ||
        l.outcome === "connected_not_interested",
    ).length ?? 0;
  const todayVoicemail =
    todayLogs?.filter((l) => l.outcome === "voicemail").length ?? 0;
  const todayNoAnswer =
    todayLogs?.filter((l) => l.outcome === "no_answer").length ?? 0;
  const todayMeetings =
    todayLogs?.filter((l) => l.outcome === "connected_positive").length ?? 0;

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ["call_briefs_daily"] });
    queryClient.invalidateQueries({ queryKey: ["call_logs_today"] });
  };

  const handleSkip = async (briefId: number) => {
    await supabase
      .from("call_briefs")
      .update({ status: "skipped" })
      .eq("id", briefId);
    invalidateAll();
  };

  if (briefsError) {
    return (
      <div className="p-6 text-center text-destructive">
        <p>Failed to load call briefs.</p>
        <Button variant="outline" onClick={invalidateAll} className="mt-2">
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <h1 className="text-2xl font-bold">Daily Call List</h1>
        <span className="text-sm text-muted-foreground">
          {new Date().toLocaleDateString("en-US", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </span>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-2">
        <StatCard label="Total Calls" value={todayLogs?.length ?? 0} />
        <StatCard label="Connected" value={todayConnected} />
        <StatCard label="Voicemail" value={todayVoicemail} />
        <StatCard label="No Answer" value={todayNoAnswer} />
        <StatCard label="Meetings Booked" value={todayMeetings} />
      </div>

      <div className="flex gap-2 flex-wrap">
        {["all", "hot", "normal", "low"].map((p) => (
          <Button
            key={p}
            variant={priorityFilter === p ? "default" : "outline"}
            size="sm"
            onClick={() => setPriorityFilter(p)}
          >
            {p === "all" ? "All" : getPriorityLabel(p)}
          </Button>
        ))}
      </div>

      {briefsLoading ? (
        <LoadingSkeleton />
      ) : (
        <div className="space-y-3">
          {activeBriefs?.map((brief) => (
            <CallCard
              key={brief.id}
              brief={brief}
              onLogOutcome={() => setSheetBrief(brief)}
              onSkip={() => handleSkip(brief.id)}
            />
          ))}
          {activeBriefs?.length === 0 && (
            <p className="text-muted-foreground text-center py-8">
              No pending calls.
            </p>
          )}
        </div>
      )}

      {todayLogs && todayLogs.length > 0 && (
        <CompletedSection logs={todayLogs} />
      )}

      <OutcomeSheet
        brief={sheetBrief}
        onClose={() => setSheetBrief(null)}
        onSuccess={invalidateAll}
      />
    </div>
  );
};

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <Card className="min-w-[120px] flex-shrink-0">
      <CardContent className="p-3 text-center">
        <p className="text-2xl font-bold">{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </CardContent>
    </Card>
  );
}

function CallCard({
  brief,
  onLogOutcome,
  onSkip,
}: {
  brief: CallBrief;
  onLogOutcome: () => void;
  onSkip: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const contact = brief.contact;
  const initials = contact
    ? `${contact.first_name?.[0] ?? ""}${contact.last_name?.[0] ?? ""}`
    : "?";

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex items-center gap-3 flex-1">
            <Avatar className="h-10 w-10">
              {contact?.avatar?.src && <AvatarImage src={contact.avatar.src} />}
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-medium ${getPriorityBadgeClass(brief.call_priority)}`}
                >
                  {getPriorityLabel(brief.call_priority)}
                </span>
                <CardTitle className="text-base">
                  {contact
                    ? `${contact.first_name} ${contact.last_name}`
                    : "Unknown"}
                </CardTitle>
                {brief.company_name && (
                  <span className="text-sm text-muted-foreground">
                    {brief.company_name}
                  </span>
                )}
              </div>
              <div className="flex flex-wrap gap-2 mt-1 text-xs text-muted-foreground">
                {contact?.trigger_event && (
                  <Badge variant="outline" className="text-xs">
                    {contact.trigger_event}
                  </Badge>
                )}
                {contact?.estimated_aum && (
                  <span>AUM: {contact.estimated_aum}</span>
                )}
                <span>{getBestCallWindow(contact?.state ?? null)}</span>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setExpanded(!expanded)}
            >
              {expanded ? "\u25B2" : "\u25BC"}
            </Button>
            <Button size="sm" onClick={onLogOutcome}>
              {"\u{1F4DE}"} Log Outcome
            </Button>
          </div>
        </div>
      </CardHeader>

      {expanded && (
        <CardContent className="space-y-4 pt-2">
          {brief.prospect_summary && (
            <div>
              <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-1">
                Prospect Summary
              </h4>
              <p className="text-sm">{brief.prospect_summary}</p>
            </div>
          )}

          {brief.trigger_summary && (
            <div>
              <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-1">
                Trigger Summary
              </h4>
              <p className="text-sm">{brief.trigger_summary}</p>
            </div>
          )}

          {brief.opener && (
            <div>
              <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-1">
                Opener
              </h4>
              <div className="bg-muted p-3 rounded-md text-sm">
                {brief.opener}
              </div>
            </div>
          )}

          {brief.talking_points && brief.talking_points.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-1">
                Talking Points
              </h4>
              <ul className="list-disc list-inside space-y-1 text-sm">
                {brief.talking_points.map((point, i) => (
                  <li key={i}>{point}</li>
                ))}
              </ul>
            </div>
          )}

          {brief.objection_handlers && brief.objection_handlers.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-1">
                Objection Handlers
              </h4>
              <div className="space-y-2">
                {brief.objection_handlers.map((handler, i) => (
                  <ObjectionRow key={i} handler={handler} />
                ))}
              </div>
            </div>
          )}

          {brief.voicemail_script && (
            <div>
              <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-1">
                Voicemail Script
              </h4>
              <div className="bg-muted p-3 rounded-md text-sm font-mono whitespace-pre-wrap relative">
                {brief.voicemail_script}
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute top-1 right-1 text-xs"
                  onClick={() => {
                    navigator.clipboard.writeText(brief.voicemail_script ?? "");
                    toast("Copied to clipboard");
                  }}
                >
                  Copy
                </Button>
              </div>
            </div>
          )}

          {brief.proposed_next_step && (
            <div>
              <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-1">
                Proposed Next Step
              </h4>
              <p className="text-sm">{brief.proposed_next_step}</p>
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <Button className="flex-1" onClick={onLogOutcome}>
              {"\u{1F4DE}"} Log Outcome
            </Button>
            <Button variant="outline" onClick={onSkip}>
              {"\u23ED"} Skip
            </Button>
          </div>
        </CardContent>
      )}
    </Card>
  );
}

function ObjectionRow({
  handler,
}: {
  handler: { objection: string; response: string };
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border rounded-md">
      <button
        className="w-full text-left p-2 text-sm font-medium flex justify-between items-center"
        onClick={() => setOpen(!open)}
      >
        <span>{handler.objection}</span>
        <span className="text-muted-foreground">
          {open ? "\u25B2" : "\u25BC"}
        </span>
      </button>
      {open && (
        <div className="px-2 pb-2 text-sm text-muted-foreground">
          {handler.response}
        </div>
      )}
    </div>
  );
}

function OutcomeSheet({
  brief,
  onClose,
  onSuccess,
}: {
  brief: CallBrief | null;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [selectedOutcome, setSelectedOutcome] = useState<Outcome | null>(null);
  const [duration, setDuration] = useState("");
  const [notes, setNotes] = useState("");
  const [callbackDate, setCallbackDate] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const resetForm = () => {
    setSelectedOutcome(null);
    setDuration("");
    setNotes("");
    setCallbackDate("");
    setSubmitting(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleConfirm = async () => {
    if (!brief || !selectedOutcome) return;
    setSubmitting(true);

    try {
      const contactId = brief.contact_id;
      const durationSeconds = duration ? parseInt(duration, 10) : null;
      const callbackScheduledFor =
        selectedOutcome === "callback_requested" && callbackDate
          ? new Date(callbackDate).toISOString()
          : null;
      const nextActionTriggered = getNextActionForOutcome(selectedOutcome);

      // 1. Insert call_log
      const { data: logData, error: logError } = await supabase
        .from("call_logs")
        .insert({
          contact_id: contactId,
          call_brief_id: brief.id,
          sequence_id: brief.sequence_id,
          sequence_step: brief.sequence_step,
          called_at: new Date().toISOString(),
          duration_seconds: durationSeconds,
          outcome: selectedOutcome,
          notes: notes || null,
          callback_scheduled_for: callbackScheduledFor,
          next_action_triggered: nextActionTriggered,
          logged_by: "marshall",
        })
        .select("id")
        .single();

      if (logError) throw logError;

      // 2. Update call_brief
      await supabase
        .from("call_briefs")
        .update({ status: "completed", call_log_id: logData.id })
        .eq("id", brief.id);

      // 3. Update contact
      const contactUpdate: Record<string, unknown> = {
        last_touch_date: new Date().toISOString(),
        last_touch_type: "call",
        next_action: nextActionTriggered,
      };

      const dateOffset = getNextActionDateOffset(selectedOutcome);
      if (dateOffset !== null) {
        if (selectedOutcome === "callback_requested" && callbackDate) {
          contactUpdate.next_action_date = new Date(callbackDate).toISOString();
        } else {
          const nextDate = new Date();
          nextDate.setDate(nextDate.getDate() + dateOffset);
          contactUpdate.next_action_date = nextDate.toISOString();
        }
      }

      const stageUpdate = getStageUpdateForOutcome(selectedOutcome);
      if (stageUpdate) {
        contactUpdate.current_stage = stageUpdate;
      }

      // Increment total_calls via RPC or raw update
      await supabase
        .rpc("increment_contact_calls", {
          p_contact_id: contactId,
        })
        .then(({ error }) => {
          // If RPC doesn't exist, fall back to direct update
          if (error) {
            return supabase
              .from("contacts")
              .update({
                ...contactUpdate,
                total_calls: (brief.contact?.total_calls ?? 0) + 1,
              })
              .eq("id", contactId);
          }
          return supabase
            .from("contacts")
            .update(contactUpdate)
            .eq("id", contactId);
        });

      // 5. Insert event
      await supabase.from("events").insert({
        event_type: "call_outcome",
        contact_id: contactId,
        actor: "marshall",
        channel: "phone",
        payload: {
          outcome: selectedOutcome,
          duration_seconds: durationSeconds,
          notes: notes || null,
          call_log_id: logData.id,
        },
        sequence_id: brief.sequence_id,
        sequence_step: brief.sequence_step,
      });

      toast(
        `Call logged \u2014 ${OUTCOME_LABELS[selectedOutcome] ?? selectedOutcome}`,
      );
      handleClose();
      onSuccess();
    } catch {
      toast("Failed to log call. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const contactName = brief?.contact
    ? `${brief.contact.first_name} ${brief.contact.last_name}`
    : "Unknown";

  return (
    <Sheet open={!!brief} onOpenChange={(open) => !open && handleClose()}>
      <SheetContent side="right" className="overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Log Outcome</SheetTitle>
          <SheetDescription>{contactName}</SheetDescription>
        </SheetHeader>

        <div className="p-4 space-y-4">
          {!selectedOutcome ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {OUTCOME_OPTIONS.map((opt) => (
                <Button
                  key={opt.value}
                  className={`h-auto py-3 text-sm ${opt.color}`}
                  onClick={() => setSelectedOutcome(opt.value)}
                >
                  <span className="block text-lg">{opt.emoji}</span>
                  <span className="block text-xs mt-1">{opt.label}</span>
                </Button>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedOutcome(null)}
              >
                {"\u2190"} Back
              </Button>

              <div>
                <p className="text-sm font-medium mb-1">
                  Outcome: {OUTCOME_LABELS[selectedOutcome]}
                </p>
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground">
                  Duration (seconds)
                </label>
                <Input
                  type="number"
                  placeholder="e.g. 120"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                />
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground">
                  Notes
                </label>
                <Textarea
                  placeholder="Call notes..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                />
              </div>

              {selectedOutcome === "callback_requested" && (
                <div>
                  <label className="text-xs font-medium text-muted-foreground">
                    Schedule callback for
                  </label>
                  <Input
                    type="datetime-local"
                    value={callbackDate}
                    onChange={(e) => setCallbackDate(e.target.value)}
                  />
                </div>
              )}

              <div className="bg-muted p-3 rounded-md">
                <p className="text-xs font-medium text-muted-foreground">
                  Next Action
                </p>
                <p className="text-sm">
                  {getNextActionForOutcome(selectedOutcome)}
                </p>
              </div>

              <Button
                className="w-full"
                disabled={submitting}
                onClick={handleConfirm}
              >
                {submitting ? "Logging..." : "Confirm & Log"}
              </Button>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function CompletedSection({ logs }: { logs: CallLog[] }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="border rounded-lg">
      <button
        className="w-full flex items-center justify-between p-3 text-left"
        onClick={() => setExpanded(!expanded)}
      >
        <span className="font-semibold text-sm">
          Completed Today ({logs.length})
        </span>
        <span className="text-muted-foreground">
          {expanded ? "\u25B2" : "\u25BC"}
        </span>
      </button>
      {expanded && (
        <div className="px-3 pb-3 space-y-2">
          {logs.map((log) => (
            <Card key={log.id}>
              <CardContent className="p-3 flex flex-col sm:flex-row sm:items-center gap-2">
                <span className="text-sm font-medium flex-1">
                  {log.contact
                    ? `${log.contact.first_name} ${log.contact.last_name}`
                    : `Contact #${log.contact_id}`}
                </span>
                <Badge variant="secondary" className="text-xs w-fit">
                  {OUTCOME_LABELS[log.outcome] ?? log.outcome}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {formatCallDuration(log.duration_seconds)}
                </span>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <Card key={i}>
          <CardHeader>
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Skeleton className="h-4 w-full mb-2" />
            <Skeleton className="h-4 w-3/4" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
