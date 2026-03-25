export function getStatusBadgeVariant(
  status: string,
): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "active":
      return "default";
    case "paused":
      return "secondary";
    case "completed":
      return "outline";
    case "exited":
      return "destructive";
    default:
      return "outline";
  }
}

export function formatStepFraction(
  currentStep: number | null,
  totalSteps: number | null,
): string {
  if (currentStep == null || totalSteps == null) return "—";
  return `${currentStep} / ${totalSteps}`;
}

export function getStepType(
  step: number | null,
): "email" | "linkedin" | "call" {
  if (step == null) return "email";
  const mod = step % 3;
  if (mod === 1) return "email";
  if (mod === 2) return "linkedin";
  return "call";
}

export function formatRelativeDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "today";
  if (diffDays === 1) return "1 day ago";
  if (diffDays < 30) return `${diffDays} days ago`;
  const diffMonths = Math.floor(diffDays / 30);
  if (diffMonths === 1) return "1 month ago";
  return `${diffMonths} months ago`;
}

export function getStatusLabel(status: string): string {
  const map: Record<string, string> = {
    active: "Active",
    paused: "Paused",
    completed: "Completed",
    exited: "Exited",
  };
  return map[status] ?? status;
}
