export function buildCRMActivityEvidenceFormData(file, location = null) {
  const payload = new FormData();
  payload.append("file", file);

  if (
    location
    && Number.isFinite(location.latitude)
    && Number.isFinite(location.longitude)
  ) {
    payload.append("latitude", String(location.latitude));
    payload.append("longitude", String(location.longitude));

    if (Number.isFinite(location.accuracy)) {
      payload.append("accuracy_m", String(location.accuracy));
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
