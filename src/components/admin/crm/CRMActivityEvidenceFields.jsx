import { useState } from "react";
import {
  FaCrosshairs,
  FaFileAlt,
  FaMapMarkerAlt,
  FaTimes,
} from "react-icons/fa";

const MAX_FILES = 5;
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ACCEPTED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
  "application/pdf",
]);

function formatFileSize(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return "";
  }

  if (bytes < 1024 * 1024) {
    return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function CRMActivityEvidenceFields({
  files = [],
  onFilesChange,
  location = null,
  onLocationChange,
  disabled = false,
}) {
  const [errorMessage, setErrorMessage] = useState("");
  const [locating, setLocating] = useState(false);

  function handleFilesChange(event) {
    const selectedFiles = Array.from(event.target.files || []);

    if (selectedFiles.length > MAX_FILES) {
      setErrorMessage("Puedes adjuntar como máximo 5 evidencias por actividad.");
      event.target.value = "";
      return;
    }

    const invalidType = selectedFiles.find(
      (file) => !ACCEPTED_TYPES.has(file.type),
    );

    if (invalidType) {
      setErrorMessage(
        "Adjunta imágenes JPG, PNG, WEBP, HEIC o archivos PDF.",
      );
      event.target.value = "";
      return;
    }

    const oversized = selectedFiles.find(
      (file) => file.size > MAX_FILE_SIZE,
    );

    if (oversized) {
      setErrorMessage("Cada evidencia puede pesar como máximo 5 MB.");
      event.target.value = "";
      return;
    }

    setErrorMessage("");
    onFilesChange?.(selectedFiles);
  }

  function clearFiles() {
    setErrorMessage("");
    onFilesChange?.([]);
  }

  function captureLocation() {
    if (!navigator.geolocation) {
      setErrorMessage(
        "Este navegador no permite registrar la ubicación.",
      );
      return;
    }

    setLocating(true);
    setErrorMessage("");

    navigator.geolocation.getCurrentPosition(
      (position) => {
        onLocationChange?.({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          capturedAt: new Date().toISOString(),
        });
        setLocating(false);
      },
      () => {
        setErrorMessage(
          "No se pudo obtener la ubicación. Puedes continuar sin registrarla.",
        );
        setLocating(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      },
    );
  }

  return (
    <div className="md:col-span-2 rounded-2xl border border-gray-200 bg-gray-50 p-4">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
        <div>
          <p className="text-xs font-black uppercase tracking-wide text-gray-500">
            Evidencias de la actividad
          </p>
          <p className="mt-1 text-sm font-bold text-gray-950">
            Fotos o documentos
          </p>
          <p className="mt-1 text-xs leading-5 text-gray-500">
            Opcional. Hasta 5 archivos de 5 MB cada uno. La ubicación también
            es opcional y solo se registra si la autorizas.
          </p>
        </div>

        {files.length > 0 ? (
          <button
            type="button"
            onClick={clearFiles}
            disabled={disabled}
            className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-black text-gray-700 transition hover:bg-gray-100 disabled:opacity-50"
          >
            <FaTimes />
            Quitar archivos
          </button>
        ) : null}
      </div>

      <label className="mt-4 block cursor-pointer rounded-2xl border border-dashed border-gray-300 bg-white px-4 py-4 text-center transition hover:border-red-300 hover:bg-red-50/30">
        <input
          type="file"
          multiple
          disabled={disabled}
          accept="image/jpeg,image/png,image/webp,image/heic,image/heif,application/pdf"
          onChange={handleFilesChange}
          className="sr-only"
        />
        <span className="inline-flex items-center gap-2 text-sm font-black text-gray-950">
          <FaFileAlt className="text-red-700" />
          {files.length > 0
            ? `${files.length} evidencia(s) seleccionada(s)`
            : "Adjuntar evidencias"}
        </span>
        <span className="mt-1 block text-xs text-gray-500">
          JPG, PNG, WEBP, HEIC o PDF
        </span>
      </label>

      {files.length > 0 ? (
        <div className="mt-3 space-y-2">
          {files.map((file) => (
            <div
              key={`${file.name}-${file.size}-${file.lastModified}`}
              className="flex items-center justify-between gap-3 rounded-xl bg-white px-3 py-2 text-xs ring-1 ring-gray-200"
            >
              <span className="min-w-0 truncate font-bold text-gray-800">
                {file.name}
              </span>
              <span className="shrink-0 text-gray-400">
                {formatFileSize(file.size)}
              </span>
            </div>
          ))}
        </div>
      ) : null}

      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
        <button
          type="button"
          onClick={captureLocation}
          disabled={disabled || locating}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-xs font-black text-gray-700 transition hover:border-gray-300 hover:bg-gray-100 disabled:opacity-50"
        >
          <FaCrosshairs />
          {locating
            ? "Obteniendo ubicación..."
            : location
              ? "Actualizar ubicación"
              : "Registrar ubicación actual"}
        </button>

        {location ? (
          <>
            <span className="inline-flex items-center gap-2 text-xs font-bold text-emerald-700">
              <FaMapMarkerAlt />
              Ubicación registrada
              {Number.isFinite(location.accuracy)
                ? ` · precisión aprox. ${Math.round(location.accuracy)} m`
                : ""}
            </span>
            <button
              type="button"
              onClick={() => onLocationChange?.(null)}
              disabled={disabled}
              className="text-left text-xs font-black text-red-700 transition hover:text-red-900 disabled:opacity-50"
            >
              Quitar ubicación
            </button>
          </>
        ) : null}
      </div>

      {errorMessage ? (
        <p className="mt-3 text-xs font-bold text-amber-700">
          {errorMessage}
        </p>
      ) : null}
    </div>
  );
}
