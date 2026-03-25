import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/components/atomic-crm/providers/supabase/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type {
  EmailDraftWithContact,
  LinkedInDraftWithContact,
  RetailCommTracker,
} from "./types";
import {
  getRetailCommStatus,
  formatStepLabel,
  formatDraftType,
  getCharacterCountColor,
} from "./draftQueueUtils";

export const DraftQueue = () => {
  const [statusFilter, setStatusFilter] = useState("draft");
  const [sequenceFilter, setSequenceFilter] = useState("all");
  const queryClient = useQueryClient();

  const {
    data: emailDrafts,
    isLoading: emailLoading,
    error: emailError,
  } = useQuery({
    queryKey: ["email_drafts", statusFilter, sequenceFilter],
    queryFn: async () => {
      let query = supabase
        .from("email_drafts")
        .select(
          "*, contacts(id, first_name, last_name, company_id, trigger_event, estimated_aum, avatar, companies(id, name))",
        )
        .order("created_at", { ascending: true });

      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }
      if (sequenceFilter !== "all") {
        query = query.eq("sequence_id", sequenceFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as EmailDraftWithContact[];
    },
  });

  const {
    data: linkedinDrafts,
    isLoading: linkedinLoading,
    error: linkedinError,
  } = useQuery({
    queryKey: ["linkedin_drafts", statusFilter, sequenceFilter],
    queryFn: async () => {
      let query = supabase
        .from("linkedin_drafts")
        .select(
          "*, contacts(id, first_name, last_name, company_id, trigger_event, estimated_aum, avatar, companies(id, name))",
        )
        .order("created_at", { ascending: true });

      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }
      if (sequenceFilter !== "all") {
        query = query.eq("sequence_id", sequenceFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as LinkedInDraftWithContact[];
    },
  });

  const { data: retailComm } = useQuery({
    queryKey: ["retail_comm_tracker"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("retail_comm_tracker")
        .select("*")
        .order("period_end", { ascending: false })
        .limit(1)
        .single();
      if (error) throw error;
      return data as RetailCommTracker;
    },
  });

  const { data: sequences } = useQuery({
    queryKey: ["sequences_list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sequences")
        .select("id, name");
      if (error) throw error;
      return data as { id: string; name: string }[];
    },
  });

  const retailCount = retailComm?.contact_count ?? 0;
  const retailStatus = getRetailCommStatus(retailCount);

  const invalidateDrafts = () => {
    queryClient.invalidateQueries({ queryKey: ["email_drafts"] });
    queryClient.invalidateQueries({ queryKey: ["linkedin_drafts"] });
  };

  const handleEmailAction = async (
    draftId: number,
    action: "approved" | "rejected" | "edited",
    updates?: { subject?: string; body?: string; marshall_notes?: string },
  ) => {
    const updateData: Record<string, unknown> = {
      status: action,
      ...(action !== "edited" ? { reviewed_at: new Date().toISOString() } : {}),
      ...updates,
    };
    await supabase.from("email_drafts").update(updateData).eq("id", draftId);
    invalidateDrafts();
  };

  const handleLinkedInAction = async (
    draftId: number,
    action: "sent" | "rejected" | "edited",
    updates?: { message_body?: string },
  ) => {
    const updateData: Record<string, unknown> = {
      status: action === "edited" ? "draft" : action,
      ...(action === "sent" ? { sent_at: new Date().toISOString() } : {}),
      ...updates,
    };
    await supabase.from("linkedin_drafts").update(updateData).eq("id", draftId);
    invalidateDrafts();
  };

  const error = emailError || linkedinError;

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold">Draft Queue</h1>
        <Badge
          variant={retailStatus.color === "red" ? "destructive" : "default"}
          className="text-sm w-fit"
        >
          {retailStatus.label}
        </Badge>
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
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="sent">Sent</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
            <SelectItem value="edited">Edited</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {error && (
        <div className="text-destructive text-center py-8">
          <p>Failed to load drafts.</p>
          <Button variant="outline" onClick={invalidateDrafts} className="mt-2">
            Retry
          </Button>
        </div>
      )}

      <Tabs defaultValue="email">
        <TabsList>
          <TabsTrigger value="email">
            Email Drafts
            {emailDrafts && (
              <Badge variant="secondary" className="ml-2">
                {emailDrafts.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="linkedin">
            LinkedIn Drafts
            {linkedinDrafts && (
              <Badge variant="secondary" className="ml-2">
                {linkedinDrafts.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="email" className="space-y-4 mt-4">
          {emailLoading ? (
            <LoadingSkeleton />
          ) : (
            emailDrafts?.map((draft) => (
              <EmailDraftCard
                key={draft.id}
                draft={draft}
                onAction={handleEmailAction}
              />
            ))
          )}
          {!emailLoading && emailDrafts?.length === 0 && (
            <p className="text-muted-foreground text-center py-8">
              No email drafts found.
            </p>
          )}
        </TabsContent>

        <TabsContent value="linkedin" className="space-y-4 mt-4">
          {linkedinLoading ? (
            <LoadingSkeleton />
          ) : (
            linkedinDrafts?.map((draft) => (
              <LinkedInDraftCard
                key={draft.id}
                draft={draft}
                onAction={handleLinkedInAction}
              />
            ))
          )}
          {!linkedinLoading && linkedinDrafts?.length === 0 && (
            <p className="text-muted-foreground text-center py-8">
              No LinkedIn drafts found.
            </p>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

function EmailDraftCard({
  draft,
  onAction,
}: {
  draft: EmailDraftWithContact;
  onAction: (
    id: number,
    action: "approved" | "rejected" | "edited",
    updates?: { subject?: string; body?: string; marshall_notes?: string },
  ) => void;
}) {
  const [editingSubject, setEditingSubject] = useState(false);
  const [editingBody, setEditingBody] = useState(false);
  const [subject, setSubject] = useState(draft.subject ?? "");
  const [body, setBody] = useState(draft.body ?? "");
  const [notes, setNotes] = useState(draft.marshall_notes ?? "");

  const contact = draft.contacts;
  const initials = contact
    ? `${contact.first_name?.[0] ?? ""}${contact.last_name?.[0] ?? ""}`
    : "?";

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex items-center gap-3 flex-1">
            <Avatar className="h-10 w-10">
              {contact?.avatar?.src && <AvatarImage src={contact.avatar.src} />}
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-base">
                {contact
                  ? `${contact.first_name} ${contact.last_name}`
                  : "Unknown"}
              </CardTitle>
              <div className="flex flex-wrap gap-1 mt-1">
                {draft.contacts?.companies?.name && (
                  <span className="text-sm text-muted-foreground">
                    {draft.contacts.companies.name}
                  </span>
                )}
                {contact?.trigger_event && (
                  <Badge variant="outline" className="text-xs">
                    {contact.trigger_event}
                  </Badge>
                )}
                {contact?.estimated_aum && (
                  <span className="text-xs text-muted-foreground">
                    AUM: {contact.estimated_aum}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-1">
            <Badge variant="secondary">
              {formatStepLabel(draft.sequence_id, draft.sequence_step)}
            </Badge>
            {draft.retail_comm_flag && (
              <Badge className="bg-orange-500 text-white hover:bg-orange-600">
                RETAIL COMM
              </Badge>
            )}
            <Badge
              variant={draft.compliance_cleared ? "default" : "destructive"}
            >
              {draft.compliance_cleared ? "CLEARED" : "PENDING"}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <label className="text-xs font-medium text-muted-foreground">
            Subject
          </label>
          {editingSubject ? (
            <Input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              onBlur={() => setEditingSubject(false)}
              autoFocus
            />
          ) : (
            <p
              className="text-sm cursor-pointer hover:bg-muted p-1 rounded"
              onClick={() => setEditingSubject(true)}
            >
              {subject || "(no subject)"}
            </p>
          )}
        </div>

        <div>
          <label className="text-xs font-medium text-muted-foreground">
            Body
          </label>
          {editingBody ? (
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              onBlur={() => setEditingBody(false)}
              rows={6}
              autoFocus
            />
          ) : (
            <p
              className="text-sm cursor-pointer hover:bg-muted p-2 rounded whitespace-pre-wrap"
              onClick={() => setEditingBody(true)}
            >
              {body || "(no body)"}
            </p>
          )}
        </div>

        <div>
          <label className="text-xs font-medium text-muted-foreground">
            Marshall Notes
          </label>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add notes..."
            rows={2}
          />
        </div>

        <div className="flex flex-wrap gap-2 pt-2">
          <Button
            size="sm"
            className="bg-green-600 hover:bg-green-700 text-white"
            onClick={() =>
              onAction(draft.id, "approved", { marshall_notes: notes })
            }
          >
            Approve
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              onAction(draft.id, "edited", {
                subject,
                body,
                marshall_notes: notes,
              })
            }
          >
            Edit
          </Button>
          <Button
            size="sm"
            variant="destructive"
            onClick={() =>
              onAction(draft.id, "rejected", { marshall_notes: notes })
            }
          >
            Reject
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function LinkedInDraftCard({
  draft,
  onAction,
}: {
  draft: LinkedInDraftWithContact;
  onAction: (
    id: number,
    action: "sent" | "rejected" | "edited",
    updates?: { message_body?: string },
  ) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [messageBody, setMessageBody] = useState(draft.message_body ?? "");

  const contact = draft.contacts;
  const charCount = messageBody.length;
  const charColor = getCharacterCountColor(charCount, draft.draft_type);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex-1">
            <CardTitle className="text-base">
              {contact
                ? `${contact.first_name} ${contact.last_name}`
                : "Unknown"}
              {draft.linkedin_url && (
                <a
                  href={draft.linkedin_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-2 text-blue-500 hover:text-blue-600 text-xs"
                >
                  LinkedIn ↗
                </a>
              )}
            </CardTitle>
          </div>
          <div className="flex flex-wrap gap-1">
            <Badge variant="outline">{formatDraftType(draft.draft_type)}</Badge>
            <Badge variant="secondary">
              {formatStepLabel(draft.sequence_id, draft.sequence_step)}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <label className="text-xs font-medium text-muted-foreground">
            Message
          </label>
          {editing ? (
            <Textarea
              value={messageBody}
              onChange={(e) => setMessageBody(e.target.value)}
              onBlur={() => setEditing(false)}
              rows={4}
              autoFocus
            />
          ) : (
            <p
              className="text-sm cursor-pointer hover:bg-muted p-2 rounded whitespace-pre-wrap"
              onClick={() => setEditing(true)}
            >
              {messageBody || "(no message)"}
            </p>
          )}
          <span
            className={`text-xs ${charColor === "red" ? "text-destructive" : "text-muted-foreground"}`}
          >
            {charCount} / 280
          </span>
        </div>

        <div className="flex flex-wrap gap-2 pt-2">
          <Button
            size="sm"
            className="bg-green-600 hover:bg-green-700 text-white"
            onClick={() => onAction(draft.id, "sent")}
          >
            Mark Sent
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              onAction(draft.id, "edited", { message_body: messageBody })
            }
          >
            Edit
          </Button>
          <Button
            size="sm"
            variant="destructive"
            onClick={() => onAction(draft.id, "rejected")}
          >
            Reject
          </Button>
        </div>
      </CardContent>
    </Card>
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
            <Skeleton className="h-20 w-full" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
