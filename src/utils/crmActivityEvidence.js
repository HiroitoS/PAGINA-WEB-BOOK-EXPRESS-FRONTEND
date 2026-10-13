export function buildCRMActivityLocationPayload(location) {
  if (
    !location
    || !Number.isFinite(location.latitude)
    || !Number.isFinite(location.longitude)
  ) {
    return {};
  }

  return {
    latitude: Number(location.latitude).toFixed(6),
    longitude: Number(location.longitude).toFixed(6),
    location_accuracy_m: Number.isFinite(location.accuracy)
      ? Number(location.accuracy).toFixed(2)
      : null,
    location_captured_at: location.capturedAt || null,
  };
}

export function buildCRMActivityEvidenceFormData(file, location = null) {
  const payload = new FormData();
  payload.append("file", file);

  if (
    location
    && Number.isFinite(location.latitude)
    && Number.isFinite(location.longitude)
  ) {
    payload.append("latitude", Number(location.latitude).toFixed(6));
    payload.append("longitude", Number(location.longitude).toFixed(6));

    if (Number.isFinite(location.accuracy)) {
      payload.append(
        "accuracy_m",
        Number(location.accuracy).toFixed(2),
      );
    }

    if (location.capturedAt) {
      payload.append("captured_at", location.capturedAt);
    }
  }

  return payload;
}

export async function uploadCRMActivityEvidenceFiles({
  files = [],
  location = null,
  uploadFile,
}) {
  const uploaded = [];
  const failed = [];

  for (const file of files) {
    try {
      const evidence = await uploadFile(
        buildCRMActivityEvidenceFormData(file, location),
      );
      uploaded.push(evidence);
    } catch (error) {
      failed.push({ file, error });
    }
  }

  return {
    uploaded,
    failed,
  };
}
