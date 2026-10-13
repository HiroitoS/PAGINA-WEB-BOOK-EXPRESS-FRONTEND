import { FaMapMarkerAlt } from "react-icons/fa";

function hasActivityLocation(activity) {
  return (
    activity?.latitude !== null
    && activity?.latitude !== undefined
    && activity?.longitude !== null
    && activity?.longitude !== undefined
  );
}

function formatAccuracy(value) {
  const accuracy = Number(value);

  if (!Number.isFinite(accuracy)) {
    return "";
  }

  return ` · precisión aprox. ${Math.round(accuracy)} m`;
}

export default function CRMActivityLocationSummary({ activity }) {
  if (!hasActivityLocation(activity)) {
    return null;
  }

  const mapUrl = `https://www.google.com/maps?q=${activity.latitude},${activity.longitude}`;

  return (
    <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2 text-xs">
      <span className="inline-flex items-center gap-1 font-black text-emerald-800">
        <FaMapMarkerAlt />
        Ubicación registrada
        {formatAccuracy(activity.location_accuracy_m)}
      </span>

      <a
        href={mapUrl}
        target="_blank"
        rel="noreferrer"
        className="font-black text-emerald-900 underline decoration-emerald-300 underline-offset-2 transition hover:text-gray-950"
      >
        Ver ubicación
      </a>
    </div>
  );
}
