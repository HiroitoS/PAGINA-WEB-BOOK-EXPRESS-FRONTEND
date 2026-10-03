export function buildNavigationState({
  from,
  fromLabel,
  fromType,
  currentState,
  extra = {},
}) {
  return {
    from,
    fromLabel,
    fromType,
    returnState: currentState ?? null,
    ...extra,
  };
}

export function resolveReturnContext(
  locationState,
  {
    fallbackPath = "",
    fallbackLabel = "",
  } = {},
) {
  const candidatePath =
    typeof locationState?.from === "string"
      ? locationState.from
      : "";

  const isInternalAdminPath =
    candidatePath.startsWith("/admin/");

  const path = isInternalAdminPath
    ? candidatePath
    : fallbackPath;

  const label =
    typeof locationState?.fromLabel === "string"
    && locationState.fromLabel.trim()
      ? locationState.fromLabel.trim()
      : fallbackLabel;

  return {
    path,
    label,
    state: locationState?.returnState ?? undefined,
    type:
      typeof locationState?.fromType === "string"
        ? locationState.fromType
        : "",
  };
}
