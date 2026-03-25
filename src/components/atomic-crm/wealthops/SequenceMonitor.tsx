import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/components/atomic-crm/providers/supabase/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useIsMobile } from "@/hooks/use-mobile";
import type { EnrollmentWithRelations } from "./types";
import {
  getStatusBadgeVariant,
  formatStepFraction,
  getStepType,
  formatRelativeDate,
  getStatusLabel,
} from "./sequenceUtils";
import { getDueDateColor } from "./pipelineUtils";

export const SequenceMonitor = () => {
  const [statusFilter, setStatusFilter] = useState("all");
  const [sequenceFilter, setSequenceFilter] = useState("all");
  const [expandedRow, setExpandedRow] = useState<number | null>(null);
  const [pauseDialog, setPauseDialog] = useState<number | null>(null);
  const [removeDialog, setRemoveDialog] = useState<number | null>(null);
  const [pauseReason, setPauseReason] = useState("");
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();

  const {
    data: enrollments,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["sequence_enrollments", statusFilter, sequenceFilter],
    queryFn: async () => {
      let query = supabase
        .from("sequence_enrollments")
        .select(
          "*, contacts(id, first_name, last_name, company_id, avatar, companies(id, name)), sequences(id, name, total_steps)",
        )
        .order("current_step_due", { ascending: true });

      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }
      if (sequenceFilter !== "all") {
        query = query.eq("sequence_id", sequenceFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as EnrollmentWithRelations[];
    },
  });

  const { data: sequences } = useQuery({
    queryKey: ["sequences_list_monitor"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sequences")
        .select("id, name");
      if (error) throw error;
      return data as { id: string; name: string }[];
    },
  });

  const { data: stats } = useQuery({
    queryKey: ["sequence_stats"],
    queryFn: async () => {
      const now = new Date().toISOString();
      const weekAgo = new Date(
        Date.now() - 7 * 24 * 60 * 60 * 1000,
      ).toISOString();

      const [activeRes, overdueRes, pausedRes, completedRes] =
        await Promise.all([
          supabase
            .from("sequence_enrollments")
            .select("id", { count: "exact", head: true })
            .eq("status", "active"),
          supabase
            .from("sequence_enrollments")
            .select("id", { count: "exact", head: true })
            .eq("status", "active")
            .lt("current_step_due", now),
          supabase
            .from("sequence_enrollments")
            .select("id", { count: "exact", head: true })
            .eq("status", "paused"),
          supabase
            .from("sequence_enrollments")
            .select("id", { count: "exact", head: true })
            .eq("status", "completed")
            .gte("completed_at", weekAgo),
        ]);

      return {
        active: activeRes.count ?? 0,
        overdue: overdueRes.count ?? 0,
        paused: pausedRes.count ?? 0,
        completedThisWeek: completedRes.count ?? 0,
      };
    },
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["sequence_enrollments"] });
    queryClient.invalidateQueries({ queryKey: ["sequence_stats"] });
  };

  const handlePause = async (enrollmentId: number) => {
    await supabase
      .from("sequence_enrollments")
      .update({
        status: "paused",
        paused_at: new Date().toISOString(),
        paused_reason: pauseReason || null,
      })
      .eq("id", enrollmentId);
    setPauseDialog(null);
    setPauseReason("");
    invalidate();
  };

  const handleResume = async (enrollmentId: number) => {
    await supabase
      .from("sequence_enrollments")
      .update({
        status: "active",
        paused_at: null,
        paused_reason: null,
      })
      .eq("id", enrollmentId);
    invalidate();
  };

  const handleRemove = async (enrollmentId: number) => {
    await supabase
      .from("sequence_enrollments")
      .update({
        status: "exited",
        exit_reason: "manual",
        completed_at: new Date().toISOString(),
      })
      .eq("id", enrollmentId);
    setRemoveDialog(null);
    invalidate();
  };

  const handleNotesUpdate = async (enrollmentId: number, notes: string) => {
    await supabase
      .from("sequence_enrollments")
      .update({ notes })
      .eq("id", enrollmentId);
  };

  if (error) {
    return (
      <div className="p-6 text-center text-destructive">
        <p>Failed to load sequence data.</p>
        <Button variant="outline" onClick={invalidate} className="mt-2">
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-4">
      <h1 className="text-2xl font-bold">Sequence Monitor</h1>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard title="Active" value={stats?.active ?? 0} />
        <StatCard
          title="Overdue"
          value={stats?.overdue ?? 0}
          variant="destructive"
        />
        <StatCard title="Paused" value={stats?.paused ?? 0} variant="warning" />
        <StatCard
          title="Completed This Week"
          value={stats?.completedThisWeek ?? 0}
        />
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <Select value={sequenceFilter} onValueChange={setSequenceFilter}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Sequence" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Sequences</SelectItem>
            {sequences?.map((seq) => (
              <SelectItem key={seq.id} value={seq.id}>
                {seq.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="paused">Paused</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="exited">Exited</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <SequenceSkeleton />
      ) : isMobile ? (
        <MobileEnrollmentList
          enrollments={enrollments ?? []}
          onPause={(id) => setPauseDialog(id)}
          onResume={handleResume}
          onRemove={(id) => setRemoveDialog(id)}
        />
      ) : (
        <div className="border rounded-lg overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Prospect</TableHead>
                <TableHead>Company</TableHead>
                <TableHead>Sequence</TableHead>
                <TableHead>Step</TableHead>
                <TableHead>Step Type</TableHead>
                <TableHead>Next Due</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last Touch</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {enrollments?.map((enrollment) => (
                <EnrollmentRow
                  key={enrollment.id}
                  enrollment={enrollment}
                  isExpanded={expandedRow === enrollment.id}
                  onToggle={() =>
                    setExpandedRow(
                      expandedRow === enrollment.id ? null : enrollment.id,
                    )
                  }
                  onPause={() => setPauseDialog(enrollment.id)}
                  onResume={() => handleResume(enrollment.id)}
                  onRemove={() => setRemoveDialog(enrollment.id)}
                  onNotesUpdate={handleNotesUpdate}
                />
              ))}
              {enrollments?.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={9}
                    className="text-center text-muted-foreground py-8"
                  >
                    No enrollments found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog
        open={pauseDialog !== null}
        onOpenChange={(open) => !open && setPauseDialog(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Pause Enrollment</DialogTitle>
          </DialogHeader>
          <Textarea
            value={pauseReason}
            onChange={(e) => setPauseReason(e.target.value)}
            placeholder="Reason for pausing..."
            rows={3}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setPauseDialog(null)}>
              Cancel
            </Button>
            <Button onClick={() => pauseDialog && handlePause(pauseDialog)}>
              Pause
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={removeDialog !== null}
        onOpenChange={(open) => !open && setRemoveDialog(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove from Sequence</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This will exit the contact from the sequence. This action cannot be
            undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRemoveDialog(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => removeDialog && handleRemove(removeDialog)}
            >
              Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

function EnrollmentRow({
  enrollment,
  isExpanded,
  onToggle,
  onPause,
  onResume,
  onRemove,
  onNotesUpdate,
}: {
  enrollment: EnrollmentWithRelations;
  isExpanded: boolean;
  onToggle: () => void;
  onPause: () => void;
  onResume: () => void;
  onRemove: () => void;
  onNotesUpdate: (id: number, notes: string) => void;
}) {
  const [notes, setNotes] = useState(enrollment.notes ?? "");
  const contact = enrollment.contacts;
  const sequence = enrollment.sequences;
  const dueDateColor = getDueDateColor(enrollment.current_step_due);

  const dueDateClass =
    dueDateColor === "red"
      ? "text-red-600"
      : dueDateColor === "yellow"
        ? "text-yellow-600"
        : "text-muted-foreground";

  const initials = contact
    ? `${contact.first_name?.[0] ?? ""}${contact.last_name?.[0] ?? ""}`
    : "?";

  return (
    <>
      <TableRow className="cursor-pointer hover:bg-muted/50" onClick={onToggle}>
        <TableCell>
          <div className="flex items-center gap-2">
            <Avatar className="h-8 w-8">
              {contact?.avatar?.src && <AvatarImage src={contact.avatar.src} />}
              <AvatarFallback className="text-xs">{initials}</AvatarFallback>
            </Avatar>
            <span className="font-medium text-sm">
              {contact
                ? `${contact.first_name} ${contact.last_name}`
                : "Unknown"}
            </span>
          </div>
        </TableCell>
        <TableCell className="text-sm">
          {enrollment.contacts?.companies?.name ?? "—"}
        </TableCell>
        <TableCell>
          <Badge variant="outline">{enrollment.sequence_id ?? "—"}</Badge>
        </TableCell>
        <TableCell className="text-sm">
          {formatStepFraction(
            enrollment.current_step,
            sequence?.total_steps ?? null,
          )}
        </TableCell>
        <TableCell>
          <Badge variant="secondary" className="text-xs">
            {getStepType(enrollment.current_step)}
          </Badge>
        </TableCell>
        <TableCell className={`text-sm ${dueDateClass}`}>
          {enrollment.current_step_due
            ? new Date(enrollment.current_step_due).toLocaleDateString()
            : "—"}
        </TableCell>
        <TableCell>
          <Badge variant={getStatusBadgeVariant(enrollment.status)}>
            {getStatusLabel(enrollment.status)}
          </Badge>
        </TableCell>
        <TableCell className="text-sm text-muted-foreground">
          {formatRelativeDate(enrollment.enrolled_at)}
        </TableCell>
        <TableCell>
          <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
            {enrollment.status === "active" && (
              <Button size="sm" variant="outline" onClick={onPause}>
                ⏸️
              </Button>
            )}
            {enrollment.status === "paused" && (
              <Button size="sm" variant="outline" onClick={onResume}>
                ▶️
              </Button>
            )}
            <Button size="sm" variant="outline" onClick={onRemove}>
              ✕
            </Button>
          </div>
        </TableCell>
      </TableRow>
      {isExpanded && (
        <TableRow>
          <TableCell colSpan={9} className="bg-muted/30">
            <div className="p-3 space-y-3">
              <div>
                <h4 className="text-sm font-medium mb-1">Steps Completed</h4>
                {enrollment.steps_completed &&
                enrollment.steps_completed.length > 0 ? (
                  <pre className="text-xs bg-muted p-2 rounded overflow-auto">
                    {JSON.stringify(enrollment.steps_completed, null, 2)}
                  </pre>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    No steps completed yet.
                  </p>
                )}
              </div>
              <div>
                <h4 className="text-sm font-medium mb-1">Notes</h4>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  onBlur={() => onNotesUpdate(enrollment.id, notes)}
                  placeholder="Add notes..."
                  rows={2}
                />
              </div>
            </div>
          </TableCell>
        </TableRow>
      )}
    </>
  );
}

function MobileEnrollmentList({
  enrollments,
  onPause,
  onResume,
  onRemove,
}: {
  enrollments: EnrollmentWithRelations[];
  onPause: (id: number) => void;
  onResume: (id: number) => void;
  onRemove: (id: number) => void;
}) {
  return (
    <div className="space-y-3">
      {enrollments.map((enrollment) => {
        const contact = enrollment.contacts;
        const sequence = enrollment.sequences;
        const dueDateColor = getDueDateColor(enrollment.current_step_due);
        const dueDateClass =
          dueDateColor === "red"
            ? "text-red-600"
            : dueDateColor === "yellow"
              ? "text-yellow-600"
              : "text-muted-foreground";

        return (
          <Card key={enrollment.id}>
            <CardContent className="p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-sm">
                  {contact
                    ? `${contact.first_name} ${contact.last_name}`
                    : "Unknown"}
                </span>
                <Badge variant={getStatusBadgeVariant(enrollment.status)}>
                  {getStatusLabel(enrollment.status)}
                </Badge>
              </div>
              <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                <span>Seq: {enrollment.sequence_id ?? "—"}</span>
                <span>
                  Step:{" "}
                  {formatStepFraction(
                    enrollment.current_step,
                    sequence?.total_steps ?? null,
                  )}
                </span>
                <span className={dueDateClass}>
                  Due:{" "}
                  {enrollment.current_step_due
                    ? new Date(enrollment.current_step_due).toLocaleDateString()
                    : "—"}
                </span>
              </div>
              <div className="flex gap-2 pt-1">
                {enrollment.status === "active" && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onPause(enrollment.id)}
                  >
                    ⏸️ Pause
                  </Button>
                )}
                {enrollment.status === "paused" && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onResume(enrollment.id)}
                  >
                    ▶️ Resume
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onRemove(enrollment.id)}
                >
                  ✕ Remove
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}
      {enrollments.length === 0 && (
        <p className="text-center text-muted-foreground py-8">
          No enrollments found.
        </p>
      )}
    </div>
  );
}

function StatCard({
  title,
  value,
  variant,
}: {
  title: string;
  value: number;
  variant?: "destructive" | "warning";
}) {
  const textColor =
    variant === "destructive"
      ? "text-red-600"
      : variant === "warning"
        ? "text-yellow-600"
        : "";

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-xs font-medium text-muted-foreground">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className={`text-2xl font-bold ${textColor}`}>{value}</p>
      </CardContent>
    </Card>
  );
}

function SequenceSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-20 w-full" />
        ))}
      </div>
      <Skeleton className="h-64 w-full" />
    </div>
  );
}
