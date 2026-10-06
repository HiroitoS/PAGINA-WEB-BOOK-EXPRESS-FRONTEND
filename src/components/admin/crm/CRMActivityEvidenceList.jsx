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

export default function CRMActivityEvidenceList({
  evidences = [],
  compact = false,
}) {
  if (!Array.isArray(evidences) || evidences.length === 0) {
    return null;
  }

  return (
    <div className={compact ? "mt-3" : "mt-4"}>
      <p className="text-xs font-black uppercase tracking-wide text-gray-500">
        Evidencias · {evidences.length}
      </p>

      <div className="mt-2 flex flex-wrap gap-2">
        {evidences.map((evidence) => {
          const isPhoto = evidence.evidence_type === "photo";
          const Icon = isPhoto ? FaRegImage : FaFileAlt;

          return (
            <a
              key={evidence.id}
              href={evidence.file_url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex max-w-full items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-bold text-gray-700 transition hover:border-red-200 hover:text-red-700"
              title={evidence.original_name}
            >
              <Icon className="shrink-0" />
              <span className="max-w-48 truncate">
                {evidence.original_name || evidence.evidence_type_display}
              </span>
              {formatFileSize(evidence.size_bytes) ? (
                <span className="shrink-0 font-medium text-gray-400">
                  {formatFileSize(evidence.size_bytes)}
                </span>
              ) : null}
              {evidence.latitude !== null
              && evidence.latitude !== undefined
              && evidence.longitude !== null
              && evidence.longitude !== undefined ? (
                <FaMapMarkerAlt
                  className="shrink-0 text-emerald-600"
                  title="Ubicación registrada"
                />
              ) : null}
            </a>
          );
        })}
      </div>
    </div>
  );
}
