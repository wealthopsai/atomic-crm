import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  DragDropContext,
  Droppable,
  Draggable,
  type OnDragEndResponder,
} from "@hello-pangea/dnd";
import { supabase } from "@/components/atomic-crm/providers/supabase/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useIsMobile } from "@/hooks/use-mobile";
import type { PipelineContact, PipelineStage } from "./types";
import { PIPELINE_STAGES } from "./types";
import {
  formatStageName,
  getCardColor,
  getLeadScoreColor,
  getDueDateColor,
  getContactsByStage,
} from "./pipelineUtils";

interface MoveConfirmation {
  contact: PipelineContact;
  fromStage: string;
  toStage: string;
  sourceIndex: number;
  destIndex: number;
}

export const PipelineBoard = () => {
  const [playbookFilter, setPlaybookFilter] = useState("all");
  const [sequenceFilter, setSequenceFilter] = useState("all");
  const [moveConfirm, setMoveConfirm] = useState<MoveConfirmation | null>(null);
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();

  const {
    data: contacts,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["pipeline_contacts", playbookFilter, sequenceFilter],
    queryFn: async () => {
      let query = supabase
        .from("contacts")
        .select(
          "id, first_name, last_name, current_stage, trigger_event, lead_score, next_action_date, last_touch_date, estimated_aum, avatar, company_id, playbook, current_sequence",
        )
        .not("current_stage", "is", null);

      if (playbookFilter !== "all") {
        query = query.eq("playbook", playbookFilter);
      }
      if (sequenceFilter !== "all") {
        query = query.eq("current_sequence", sequenceFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as PipelineContact[];
    },
  });

  const { data: sequences } = useQuery({
    queryKey: ["sequences_list_pipeline"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sequences")
        .select("id, name");
      if (error) throw error;
      return data as { id: string; name: string }[];
    },
  });

  const contactsByStage = contacts ? getContactsByStage(contacts) : null;

  const confirmMove = async () => {
    if (!moveConfirm || !contactsByStage) return;
    const { contact, toStage } = moveConfirm;

    await supabase
      .from("contacts")
      .update({ current_stage: toStage })
      .eq("id", contact.id);

    await supabase.from("events").insert({
      event_type: "stage_changed",
      contact_id: contact.id,
      actor: "marshall",
      payload: {
        from_stage: moveConfirm.fromStage,
        to_stage: toStage,
        reason: "manual",
      },
    });

    setMoveConfirm(null);
    queryClient.invalidateQueries({ queryKey: ["pipeline_contacts"] });
  };

  const onDragEnd: OnDragEndResponder = (result) => {
    const { destination, source } = result;
    if (!destination) return;
    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    )
      return;
    if (!contactsByStage) return;

    const sourceStage = source.droppableId;
    const destStage = destination.droppableId;
    const contact = contactsByStage[sourceStage as PipelineStage][source.index];

    if (sourceStage !== destStage) {
      setMoveConfirm({
        contact,
        fromStage: sourceStage,
        toStage: destStage,
        sourceIndex: source.index,
        destIndex: destination.index,
      });
    }
  };

  if (error) {
    return (
      <div className="p-6 text-center text-destructive">
        <p>Failed to load pipeline data.</p>
        <Button
          variant="outline"
          onClick={() =>
            queryClient.invalidateQueries({ queryKey: ["pipeline_contacts"] })
          }
          className="mt-2"
        >
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-4">
      <h1 className="text-2xl font-bold">Pipeline Board</h1>

      <div className="flex flex-col sm:flex-row gap-2">
        <Select value={playbookFilter} onValueChange={setPlaybookFilter}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Playbook" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Playbooks</SelectItem>
            <SelectItem value="A">Playbook A</SelectItem>
            <SelectItem value="B">Playbook B</SelectItem>
          </SelectContent>
        </Select>
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
      </div>

      {isLoading ? (
        <PipelineSkeleton />
      ) : isMobile ? (
        <MobilePipeline contactsByStage={contactsByStage} />
      ) : (
        <DragDropContext onDragEnd={onDragEnd}>
          <div className="flex gap-3 overflow-x-auto pb-4">
            {PIPELINE_STAGES.map((stage) => (
              <PipelineColumn
                key={stage}
                stage={stage}
                contacts={contactsByStage?.[stage] ?? []}
              />
            ))}
          </div>
        </DragDropContext>
      )}

      <Dialog
        open={!!moveConfirm}
        onOpenChange={(open) => !open && setMoveConfirm(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Stage Change</DialogTitle>
          </DialogHeader>
          {moveConfirm && (
            <p className="text-sm">
              Move{" "}
              <strong>
                {moveConfirm.contact.first_name} {moveConfirm.contact.last_name}
              </strong>{" "}
              from <strong>{formatStageName(moveConfirm.fromStage)}</strong> to{" "}
              <strong>{formatStageName(moveConfirm.toStage)}</strong>?
            </p>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setMoveConfirm(null)}>
              Cancel
            </Button>
            <Button onClick={confirmMove}>Confirm</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

function PipelineColumn({
  stage,
  contacts,
}: {
  stage: PipelineStage;
  contacts: PipelineContact[];
}) {
  return (
    <div className="min-w-[220px] flex-shrink-0">
      <div className="flex items-center gap-2 mb-2 px-1">
        <h3 className="text-sm font-semibold">{formatStageName(stage)}</h3>
        <Badge variant="secondary" className="text-xs">
          {contacts.length}
        </Badge>
      </div>
      <Droppable droppableId={stage}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`flex flex-col gap-2 min-h-[200px] max-h-[calc(100vh-250px)] overflow-y-auto rounded-lg p-2 ${
              snapshot.isDraggingOver ? "bg-muted" : "bg-muted/30"
            }`}
          >
            {contacts.map((contact, index) => (
              <Draggable
                key={String(contact.id)}
                draggableId={String(contact.id)}
                index={index}
              >
                {(dragProvided, dragSnapshot) => (
                  <div
                    ref={dragProvided.innerRef}
                    {...dragProvided.draggableProps}
                    {...dragProvided.dragHandleProps}
                  >
                    <PipelineCard
                      contact={contact}
                      isDragging={dragSnapshot.isDragging}
                    />
                  </div>
                )}
              </Draggable>
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </div>
  );
}

function PipelineCard({
  contact,
  isDragging,
}: {
  contact: PipelineContact;
  isDragging: boolean;
}) {
  const cardColor = getCardColor(contact);
  const scoreColor = getLeadScoreColor(contact.lead_score);
  const dueDateColor = getDueDateColor(contact.next_action_date);

  const borderColorClass =
    cardColor === "green"
      ? "border-l-green-500"
      : cardColor === "yellow"
        ? "border-l-yellow-500"
        : "border-l-red-500";

  const scoreBadgeClass =
    scoreColor === "green"
      ? "bg-green-100 text-green-800"
      : scoreColor === "yellow"
        ? "bg-yellow-100 text-yellow-800"
        : "bg-red-100 text-red-800";

  const dueDateTextClass =
    dueDateColor === "red"
      ? "text-red-600"
      : dueDateColor === "yellow"
        ? "text-yellow-600"
        : "text-muted-foreground";

  return (
    <Card
      className={`border-l-4 ${borderColorClass} transition-all duration-200 ${
        isDragging
          ? "opacity-90 rotate-1 shadow-lg"
          : "shadow-sm hover:shadow-md"
      }`}
    >
      <CardContent className="p-3 space-y-1">
        <p className="font-semibold text-sm">
          {contact.first_name} {contact.last_name}
        </p>
        {contact.trigger_event && (
          <p className="text-xs text-muted-foreground truncate">
            {contact.trigger_event}
          </p>
        )}
        <div className="flex items-center gap-2 flex-wrap">
          {contact.lead_score != null && (
            <span
              className={`text-xs px-1.5 py-0.5 rounded ${scoreBadgeClass}`}
            >
              {contact.lead_score}
            </span>
          )}
          {contact.estimated_aum && (
            <span className="text-xs text-muted-foreground">
              {contact.estimated_aum}
            </span>
          )}
        </div>
        {contact.next_action_date && (
          <p className={`text-xs ${dueDateTextClass}`}>
            Due: {new Date(contact.next_action_date).toLocaleDateString()}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function MobilePipeline({
  contactsByStage,
}: {
  contactsByStage: Record<PipelineStage, PipelineContact[]> | null;
}) {
  const [expandedStages, setExpandedStages] = useState<Set<string>>(
    new Set(["new", "first_touch_active"]),
  );

  const toggleStage = (stage: string) => {
    setExpandedStages((prev) => {
      const next = new Set(prev);
      if (next.has(stage)) {
        next.delete(stage);
      } else {
        next.add(stage);
      }
      return next;
    });
  };

  return (
    <div className="space-y-2">
      {PIPELINE_STAGES.map((stage) => {
        const stageContacts = contactsByStage?.[stage] ?? [];
        const isExpanded = expandedStages.has(stage);

        return (
          <div key={stage} className="border rounded-lg">
            <button
              className="w-full flex items-center justify-between p-3 text-left"
              onClick={() => toggleStage(stage)}
            >
              <span className="font-semibold text-sm">
                {formatStageName(stage)}
              </span>
              <Badge variant="secondary">{stageContacts.length}</Badge>
            </button>
            {isExpanded && (
              <div className="px-3 pb-3 space-y-2">
                {stageContacts.map((contact) => (
                  <PipelineCard
                    key={contact.id}
                    contact={contact}
                    isDragging={false}
                  />
                ))}
                {stageContacts.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-2">
                    No contacts
                  </p>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function PipelineSkeleton() {
  return (
    <div className="flex gap-3 overflow-x-auto pb-4">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="min-w-[220px]">
          <Skeleton className="h-6 w-32 mb-2" />
          <div className="space-y-2">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        </div>
      ))}
    </div>
  );
}
