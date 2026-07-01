type ScopeLike = {
  id?: string | null;
  directionId?: string | null;
  serviceId?: string | null;
  bureauId?: string | null;
};

type RecipientTargetLike = {
  directionId?: string | null;
  targetKind?: "DIRECTION_GENERALE" | "DIRECTION" | "SERVICE" | "BUREAU" | "USER" | null;
  targetDepartmentId?: string | null;
  targetUserId?: string | null;
  targetDepartment?: {
    id?: string | null;
    code?: string | null;
    designation?: string | null;
  } | null;
  targetUser?: {
    id?: string | null;
    email?: string | null;
    nom?: string | null;
    prenom?: string | null;
  } | null;
  direction?: {
    id?: string | null;
    code?: string | null;
    designation?: string | null;
  } | null;
};

export function recipientMatchesScope(recipient: RecipientTargetLike, scope: ScopeLike) {
  const kind = recipient.targetKind ?? "DIRECTION";

  if (kind === "USER") {
    return Boolean(scope.id && recipient.targetUserId === scope.id);
  }

  if (kind === "BUREAU") {
    return Boolean(scope.bureauId && recipient.targetDepartmentId === scope.bureauId);
  }

  if (kind === "SERVICE") {
    return Boolean(scope.serviceId && recipient.targetDepartmentId === scope.serviceId);
  }

  return Boolean(scope.directionId && recipient.directionId === scope.directionId);
}

export function buildRecipientTargetLabel(recipient: RecipientTargetLike) {
  const kind = recipient.targetKind ?? "DIRECTION";

  if (kind === "USER") {
    const userName =
      [recipient.targetUser?.nom, recipient.targetUser?.prenom].filter(Boolean).join(" ").trim() ||
      recipient.targetUser?.email ||
      recipient.targetUserId ||
      "";

    return userName;
  }

  if (recipient.targetDepartment?.designation || recipient.targetDepartment?.code) {
    return [recipient.targetDepartment?.code, recipient.targetDepartment?.designation].filter(Boolean).join(" - ");
  }

  if (recipient.direction?.designation || recipient.direction?.code) {
    return [recipient.direction?.code, recipient.direction?.designation].filter(Boolean).join(" - ");
  }

  return recipient.targetDepartmentId ?? recipient.targetUserId ?? recipient.directionId ?? "";
}
