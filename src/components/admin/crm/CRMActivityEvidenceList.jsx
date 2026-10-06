import {
  FaFileAlt,
  FaMapMarkerAlt,
  FaRegImage,
} from "react-icons/fa";

function formatFileSize(bytes) {
  const value = Number(bytes);

  if (!Number.isFinite(value) || value <= 0) {
    return "";
  }

  if (value < 1024 * 1024) {
    return `${Math.max(1, Math.round(value / 1024))} KB`;
  }

  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

function canPreviewImage(evidence) {
  return (
    evidence?.evidence_type === "photo"
    && typeof evidence?.file_url === "string"
    && evidence.file_url
    && !/\.(heic|heif)(\?|$)/i.test(evidence.file_url)
  );
}

export default function CRMActivityEvidenceList({
  evidences = [],
  compact = false,
}) {
  if (!Array.isArray(evidences) || evidences.length === 0) {
    return null;
  }

  return (
    <div className={compact ? "mt-3" : "mt-4"}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-black uppercase tracking-wide text-gray-500">
          Evidencias · {evidences.length}
        </p>
        <p className="text-xs font-semibold text-gray-400">
          Abrir para revisar
        </p>
      </div>

      <div className="mt-2 grid gap-2 sm:grid-cols-2">
        {evidences.map((evidence) => {
          const isPhoto = evidence.evidence_type === "photo";
          const hasLocation = (
            evidence.latitude !== null
            && evidence.latitude !== undefined
            && evidence.longitude !== null
            && evidence.longitude !== undefined
          );

          return (
            <a
              key={evidence.id}
              href={evidence.file_url}
              target="_blank"
              rel="noreferrer"
              className="flex min-w-0 items-center gap-3 rounded-xl border border-gray-200 bg-white p-2.5 transition hover:border-red-200 hover:bg-red-50/30"
              title={evidence.original_name}
            >
              {canPreviewImage(evidence) ? (
                <img
                  src={evidence.file_url}
                  alt=""
                  className="h-12 w-12 shrink-0 rounded-lg object-cover ring-1 ring-gray-200"
                  loading="lazy"
                />
              ) : (
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-600 ring-1 ring-gray-200">
                  {isPhoto ? <FaRegImage /> : <FaFileAlt />}
                </span>
              )}

              <span className="min-w-0">
                <span className="block truncate text-xs font-black text-gray-900">
                  {evidence.original_name || evidence.evidence_type_display}
                </span>

                <span className="mt-1 flex flex-wrap items-center gap-2 text-xs text-gray-500">
                  <span>
                    {evidence.evidence_type_display || (isPhoto ? "Foto" : "Documento")}
                    {formatFileSize(evidence.size_bytes)
                      ? ` · ${formatFileSize(evidence.size_bytes)}`
                      : ""}
                  </span>

                  {hasLocation ? (
                    <span className="inline-flex items-center gap-1 font-bold text-emerald-700">
                      <FaMapMarkerAlt />
                      Con ubicación
                    </span>
                  ) : null}
                </span>
              </span>
            </a>
          );
        })}
      </div>
    </div>
  );
}
