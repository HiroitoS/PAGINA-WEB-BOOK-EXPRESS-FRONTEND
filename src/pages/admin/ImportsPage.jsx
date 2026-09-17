import { useEffect, useState } from "react";
import { Link } from "react-router";
import { motion } from "motion/react";
import {
  FaArrowLeft,
  FaCheckCircle,
  FaCloudUploadAlt,
  FaExclamationTriangle,
  FaFileExcel,
  FaSearch,
  FaHistory,
  FaInfoCircle,
  FaSyncAlt,
  FaTimes,
} from "react-icons/fa";
import {
  confirmProductImport,
  getAdminImports,
  previewProductImport,
} from "../../api/adminApi";
import { getResults } from "../../utils/formatters";

function getImportId(previewData) {
  return (
    previewData?.id ||
    previewData?.carga_id ||
    previewData?.import_id ||
    previewData?.carga?.id ||
    null
  );
}

function getPreviewDetails(previewData) {
  if (Array.isArray(previewData?.detalles)) return previewData.detalles;
  if (Array.isArray(previewData?.details)) return previewData.details;
  if (Array.isArray(previewData?.errores)) return previewData.errores;
  if (Array.isArray(previewData?.errors)) return previewData.errors;
  if (Array.isArray(previewData?.rows)) return previewData.rows;
  if (Array.isArray(previewData?.filas)) return previewData.filas;

  return [];
}

function getTotalRows(data) {
  return data?.total_filas || data?.total_rows || data?.total || 0;
}

function getNewRows(data) {
  return data?.total_nuevos || data?.total_new || data?.nuevos || 0;
}

function getUpdatedRows(data) {
  return (
    data?.total_actualizados ||
    data?.total_updated ||
    data?.actualizados ||
    0
  );
}

function getErrorRows(data) {
  return data?.total_errores || data?.total_errors || data?.errores || 0;
}

function getDetailRow(detail) {
  return (
    detail?.numero_fila ||
    detail?.fila ||
    detail?.row ||
    detail?.numero_fila_excel ||
    "-"
  );
}

function getDetailStatus(detail) {
  return String(
    detail?.accion ||
      detail?.estado ||
      detail?.status ||
      detail?.tipo ||
      "-"
  );
}

function getDetailMessage(detail) {
  const message =
    detail?.errores ||
    detail?.mensaje ||
    detail?.message ||
    detail?.error ||
    detail?.errors ||
    detail?.observacion ||
    detail?.observaciones ||
    "";

  if (Array.isArray(message)) {
    return message.join(", ");
  }

  if (message && typeof message === "object") {
    return JSON.stringify(message);
  }

  return String(message || "");
}

function isErrorDetail(detail) {
  const status = getDetailStatus(detail).toLowerCase();
  const message = getDetailMessage(detail);

  return (
    status.includes("error") ||
    status.includes("invalido") ||
    status.includes("invalid") ||
    Boolean(message.trim())
  );
}

function getErrorDetails(details) {
  return details.filter(isErrorDetail);
}

function getImportFileName(item) {
  const value =
    item?.nombre_archivo ||
    item?.file_name ||
    item?.archivo_nombre ||
    item?.archivo ||
    item?.file ||
    "";

  if (!value) {
    return `Importación #${item?.id || "-"}`;
  }

  const text = String(value);
  const parts = text.split("/");

  return parts[parts.length - 1] || text;
}

function getImportDateValue(item) {
  return (
    item?.creado_en ||
    item?.actualizado_en ||
    item?.created_at ||
    item?.updated_at ||
    item?.fecha_creacion ||
    item?.fecha_actualizacion ||
    item?.fecha_carga ||
    item?.fecha_importacion ||
    item?.fecha ||
    item?.created ||
    item?.modified ||
    item?.timestamp ||
    ""
  );
}

function getImportYear(item) {
  return item?.anio_catalogo || item?.year || item?.anio || "-";
}

function getImportStatus(item) {
  return item?.estado || item?.status || "-";
}

function getStatusClass(status) {
  const value = String(status || "").toLowerCase();

  if (value.includes("importado") || value.includes("completado")) {
    return "bg-green-50 text-green-700 ring-green-100";
  }

  if (value.includes("error")) {
    return "bg-red-50 text-red-700 ring-red-100";
  }

  if (value.includes("preview") || value.includes("vista")) {
    return "bg-yellow-50 text-yellow-700 ring-yellow-100";
  }

  if (value.includes("proces")) {
    return "bg-blue-50 text-blue-700 ring-blue-100";
  }

  return "bg-gray-100 text-gray-700 ring-gray-200";
}

function formatDate(value) {
  if (!value) return "-";

  try {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "-";
    }

    return date.toLocaleString("es-PE", {
      dateStyle: "short",
      timeStyle: "short",
    });
  } catch {
    return "-";
  }
}

function formatFileSize(file) {
  if (!file) return "";

  return `${(file.size / 1024 / 1024).toFixed(2)} MB`;
}

function getFriendlyError(error) {
  const backendData = error?.response?.data;

  if (!backendData) {
    return "No se pudo procesar la solicitud. Revisa el archivo e intenta nuevamente.";
  }

  if (backendData?.archivo) {
    return "No se recibió un archivo válido. Selecciona un Excel antes de continuar.";
  }

  if (backendData?.detail) {
    return String(backendData.detail);
  }

  if (typeof backendData === "string") {
    return backendData;
  }

  return "El archivo no pudo procesarse. Revisa columnas obligatorias, datos vacíos o formato de la plantilla.";
}

export default function ImportsPage() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewData, setPreviewData] = useState(null);
  const [imports, setImports] = useState([]);
  const [catalogYear, setCatalogYear] = useState("2026");

  const [loadingHistory, setLoadingHistory] = useState(true);
  const [previewing, setPreviewing] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const previewDetails = getPreviewDetails(previewData);
  const previewErrorDetails = getErrorDetails(previewDetails);
  const previewImportId = getImportId(previewData);
  const hasPreviewErrors = Number(getErrorRows(previewData)) > 0;

  const importedCount = imports.filter((item) =>
    String(getImportStatus(item)).toLowerCase().includes("importado")
  ).length;

  const errorCount = imports.filter((item) =>
    String(getImportStatus(item)).toLowerCase().includes("error")
  ).length;

  function handleFileChange(event) {
    const file = event.target.files?.[0];

    setError("");
    setSuccessMessage("");
    setPreviewData(null);

    if (!file) {
      setSelectedFile(null);
      return;
    }

    const validExtensions = [".xlsx", ".xls"];
    const fileName = file.name.toLowerCase();
    const isValidExcel = validExtensions.some((extension) =>
      fileName.endsWith(extension)
    );

    if (!isValidExcel) {
      setSelectedFile(null);
      setError("Selecciona un archivo Excel válido: .xlsx o .xls.");
      return;
    }

    setSelectedFile(file);
  }

  async function loadImports() {
    setLoadingHistory(true);
    setError("");

    try {
      const data = await getAdminImports();
      setImports(getResults(data));
    } catch {
      setError("No se pudo cargar el historial de importaciones.");
    } finally {
      setLoadingHistory(false);
    }
  }

  async function handlePreview(event) {
    event.preventDefault();

    if (!selectedFile) {
      setError("Primero selecciona un archivo Excel.");
      return;
    }

    if (!catalogYear) {
      setError("Ingresa el año de catálogo antes de continuar.");
      return;
    }

    setPreviewing(true);
    setError("");
    setSuccessMessage("");
    setPreviewData(null);

    try {
      const data = await previewProductImport(selectedFile, catalogYear);
      setPreviewData(data);
      setSuccessMessage("Vista previa generada correctamente.");
      await loadImports();
    } catch (err) {
      setError(getFriendlyError(err));
    } finally {
      setPreviewing(false);
    }
  }

  async function handleConfirmImport() {
    if (!previewImportId) {
      setError("No se encontró la importación pendiente para confirmar.");
      return;
    }

    if (hasPreviewErrors) {
      setError(
        "La vista previa tiene errores. Corrige el Excel antes de confirmar."
      );
      return;
    }

    setConfirming(true);
    setError("");
    setSuccessMessage("");

    try {
      await confirmProductImport(previewImportId);
      setSuccessMessage("Importación confirmada correctamente.");

      setSelectedFile(null);
      setPreviewData(null);

      const fileInput = document.getElementById("excel-file-input");

      if (fileInput) {
        fileInput.value = "";
      }

      await loadImports();
    } catch (err) {
      setError(getFriendlyError(err));
    } finally {
      setConfirming(false);
    }
  }

  function clearSelectedFile() {
    setSelectedFile(null);
    setPreviewData(null);
    setError("");
    setSuccessMessage("");

    const fileInput = document.getElementById("excel-file-input");

    if (fileInput) {
      fileInput.value = "";
    }
  }

  useEffect(() => {
    let ignore = false;

    async function fetchImports() {
      try {
        const data = await getAdminImports();

        if (!ignore) {
          setImports(getResults(data));
        }
      } catch {
        if (!ignore) {
          setError("No se pudo cargar el historial de importaciones.");
        }
      } finally {
        if (!ignore) {
          setLoadingHistory(false);
        }
      }
    }

    fetchImports();

    return () => {
      ignore = true;
    };
  }, []);

  return (
    <div>
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="rounded-3xl bg-gray-950 p-6 text-white shadow-xl shadow-gray-950/10"
      >
        <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
          <div>
            <p className="text-sm font-black uppercase tracking-wide text-red-400">
              Catálogo administrativo
            </p>

            <h1 className="mt-2 text-3xl font-black">Importaciones Excel</h1>

            <p className="mt-3 max-w-3xl text-sm leading-6 text-gray-300">
              Valida e importa productos, editoriales, clasificaciones y precios
              por campaña antes de actualizar el catálogo.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              to="/admin/dashboard"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/10 px-4 py-2.5 text-sm font-bold text-white transition hover:-translate-y-0.5 hover:bg-white/15"
            >
              <FaArrowLeft className="text-xs" />
              Volver al Dashboard
            </Link>

            <button
              type="button"
              onClick={loadImports}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/10 px-4 py-2.5 text-sm font-bold text-white transition hover:-translate-y-0.5 hover:bg-white/15"
            >
              <FaSyncAlt className={loadingHistory ? "animate-spin" : ""} />
              Actualizar historial
            </button>
          </div>
        </div>
      </motion.section>

      <section className="mt-6 grid gap-4 md:grid-cols-3">
        <SummaryCard
          icon={FaHistory}
          label="Importaciones registradas"
          value={imports.length}
          description="Historial disponible en el sistema"
          tone="dark"
        />

        <SummaryCard
          icon={FaCheckCircle}
          label="Confirmadas"
          value={importedCount}
          description="Cargas finalizadas correctamente"
          tone="green"
        />

        <SummaryCard
          icon={FaExclamationTriangle}
          label="Con errores"
          value={errorCount}
          description="Cargas que requieren revisión"
          tone="yellow"
        />
      </section>

      <section className="mt-6 rounded-3xl border border-yellow-200 bg-yellow-50 p-5 text-yellow-800 shadow-sm">
        <div className="flex gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white text-yellow-700 ring-1 ring-yellow-100">
            <FaInfoCircle />
          </div>

          <div>
            <p className="text-sm font-black uppercase tracking-wide">
              Antes de importar
            </p>

            <h2 className="mt-1 text-xl font-black text-gray-950">
              Revisa la vista previa antes de confirmar
            </h2>

            <p className="mt-1 text-sm leading-6">
              Antes de actualizar el catálogo, verifica el resumen de la carga:
              productos nuevos, productos actualizados y posibles errores. Confirma
              la importación solo cuando la vista previa esté correcta.
            </p>
          </div>
        </div>
      </section>

      {error && (
        <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
          {error}
        </div>
      )}

      {successMessage && (
        <div className="mt-6 rounded-2xl border border-green-200 bg-green-50 p-4 text-sm font-semibold text-green-700">
          {successMessage}
        </div>
      )}

      <form
        onSubmit={handlePreview}
        className="mt-6 rounded-3xl border border-gray-200 bg-white p-6 shadow-sm"
      >
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-red-50 px-3 py-1 text-xs font-black uppercase tracking-wide text-red-700">
              <FaFileExcel />
              Nueva carga
            </div>

            <h2 className="mt-2 text-xl font-black text-gray-950">
              Validar archivo antes de importar
            </h2>

            <p className="mt-1 text-sm leading-6 text-gray-600">
              Primero genera una vista previa. La importación real solo se
              ejecuta cuando confirmes.
            </p>
          </div>

          {selectedFile && (
            <button
              type="button"
              onClick={clearSelectedFile}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-bold text-gray-700 transition hover:bg-gray-100"
            >
              <FaTimes className="text-xs" />
              Quitar archivo
            </button>
          )}
        </div>

        <div className="mt-5 grid gap-5 lg:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-semibold text-gray-800">
              Archivo Excel *
            </label>

            <label
              htmlFor="excel-file-input"
              className="flex min-h-44 cursor-pointer flex-col items-center justify-center rounded-3xl border border-dashed border-gray-300 bg-gray-50 px-5 py-6 text-center transition hover:border-red-200 hover:bg-red-50"
            >
              <FaCloudUploadAlt className="text-4xl text-red-700" />

              <p className="mt-3 text-sm font-black text-gray-950">
                Seleccionar archivo Excel
              </p>

              <p className="mt-1 text-xs leading-5 text-gray-500">
                Formatos permitidos: .xlsx o .xls
              </p>

              <input
                id="excel-file-input"
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileChange}
                className="hidden"
              />
            </label>
          </div>

          <div>
            <label className="mb-1 block text-sm font-semibold text-gray-800">
              Año de catálogo *
            </label>

            <input
              type="number"
              value={catalogYear}
              onChange={(event) => setCatalogYear(event.target.value)}
              className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm font-medium outline-none transition focus:border-red-700 focus:ring-2 focus:ring-red-100"
              placeholder="2026"
              min="2020"
              max="2100"
            />

            <div className="mt-4 rounded-3xl border border-gray-200 bg-gray-50 p-4">
              <p className="text-sm font-black text-gray-950">
                Archivo seleccionado
              </p>

              <p className="mt-2 break-all text-sm text-gray-600">
                {selectedFile ? selectedFile.name : "Ningún archivo seleccionado"}
              </p>

              {selectedFile && (
                <p className="mt-1 text-xs text-gray-500">
                  Tamaño: {formatFileSize(selectedFile)}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={previewing || !selectedFile}
              className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gray-950 px-5 py-3 text-sm font-black text-white transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-70"
            >
              <FaSearch className="text-xs" />
              {previewing ? "Validando archivo..." : "Generar vista previa"}
            </button>
          </div>
        </div>
      </form>

      {previewData && (
        <PreviewResult
          previewData={previewData}
          previewErrorDetails={previewErrorDetails}
          hasPreviewErrors={hasPreviewErrors}
          confirming={confirming}
          onConfirm={handleConfirmImport}
        />
      )}

      <section className="mt-6 overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm">
        <div className="flex flex-col justify-between gap-3 border-b border-gray-200 bg-gray-50 px-5 py-4 md:flex-row md:items-center">
          <div>
            <h2 className="font-black text-gray-950">
              Historial de importaciones
            </h2>

            <p className="mt-1 text-sm text-gray-600">
              Consulta las últimas cargas Excel realizadas en el sistema.
            </p>
          </div>

          <button
            type="button"
            onClick={loadImports}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-bold text-gray-700 transition hover:bg-gray-100"
          >
            <FaSyncAlt className={loadingHistory ? "animate-spin" : ""} />
            Actualizar
          </button>
        </div>

        {loadingHistory && (
          <div className="p-8 text-center text-gray-600">
            Cargando historial...
          </div>
        )}

        {!loadingHistory && imports.length === 0 && (
          <div className="p-10 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-red-700 ring-1 ring-red-100">
              <FaFileExcel />
            </div>

            <p className="mt-4 font-black text-gray-950">
              No hay importaciones registradas.
            </p>

            <p className="mt-2 text-sm text-gray-600">
              Cuando generes una vista previa o confirmes una carga, aparecerá
              aquí.
            </p>
          </div>
        )}

        {!loadingHistory && imports.length > 0 && (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-white">
                <tr>
                  <TableHead>Archivo</TableHead>
                  <TableHead>Año</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Filas</TableHead>
                  <TableHead>Nuevos</TableHead>
                  <TableHead>Actualizados</TableHead>
                  <TableHead>Errores</TableHead>
                  <TableHead>Fecha</TableHead>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100 bg-white">
                {imports.map((item) => (
                  <tr key={item.id} className="transition hover:bg-gray-50">
                    <td className="px-5 py-4">
                      <p className="font-black text-gray-950">
                        {getImportFileName(item)}
                      </p>

                      <p className="mt-1 text-xs text-gray-500">
                        Importación #{item.id || "-"}
                      </p>
                    </td>

                    <td className="px-5 py-4">
                      <span className="inline-flex rounded-full bg-gray-100 px-3 py-1 text-xs font-black text-gray-700 ring-1 ring-gray-200">
                        {getImportYear(item)}
                      </span>
                    </td>

                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ring-1 ${getStatusClass(
                          getImportStatus(item)
                        )}`}
                      >
                        {getImportStatus(item)}
                      </span>
                    </td>

                    <td className="px-5 py-4 font-bold text-gray-900">
                      {item.total_filas || item.total_rows || 0}
                    </td>

                    <td className="px-5 py-4 font-bold text-green-700">
                      {item.total_nuevos || item.total_new || 0}
                    </td>

                    <td className="px-5 py-4 font-bold text-blue-700">
                      {item.total_actualizados || item.total_updated || 0}
                    </td>

                    <td className="px-5 py-4 font-bold text-red-700">
                      {item.total_errores || item.total_errors || 0}
                    </td>

                    <td className="px-5 py-4 text-gray-600">
                      {formatDate(getImportDateValue(item))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function PreviewResult({
  previewData,
  previewErrorDetails,
  hasPreviewErrors,
  confirming,
  onConfirm,
}) {
  return (
    <section className="mt-6 rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-black uppercase tracking-wide text-blue-700">
            Vista previa
          </div>

          <h2 className="mt-2 text-xl font-black text-gray-950">
            Resultado de validación
          </h2>

          <p className="mt-1 text-sm text-gray-600">
            Revisa el resumen antes de confirmar la importación.
          </p>
        </div>

        <button
          type="button"
          onClick={onConfirm}
          disabled={confirming || hasPreviewErrors}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-700 px-5 py-3 text-sm font-black text-white transition hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-70"
        >
          <FaCheckCircle />
          {confirming ? "Importando..." : "Confirmar importación"}
        </button>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-4">
        <PreviewSummaryCard label="Total filas" value={getTotalRows(previewData)} />
        <PreviewSummaryCard label="Nuevos" value={getNewRows(previewData)} tone="green" />
        <PreviewSummaryCard
          label="Actualizados"
          value={getUpdatedRows(previewData)}
          tone="blue"
        />
        <PreviewSummaryCard label="Errores" value={getErrorRows(previewData)} tone="red" />
      </div>

      {!hasPreviewErrors && (
        <div className="mt-5 rounded-2xl border border-green-200 bg-green-50 p-4 text-sm font-semibold text-green-700">
          La vista previa no encontró errores. Puedes confirmar la importación.
        </div>
      )}

      {hasPreviewErrors && (
        <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
          El archivo tiene errores. Corrige el Excel y vuelve a generar la vista
          previa antes de confirmar.
        </div>
      )}

      {hasPreviewErrors && previewErrorDetails.length > 0 && (
        <div className="mt-6 overflow-hidden rounded-2xl border border-gray-200">
          <div className="border-b border-gray-200 bg-gray-50 px-5 py-4">
            <p className="font-black text-gray-950">Errores encontrados</p>
            <p className="mt-1 text-xs text-gray-500">
              Se muestran como máximo las primeras 100 filas con observaciones.
            </p>
          </div>

          <div className="max-h-96 overflow-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="sticky top-0 bg-white">
                <tr>
                  <TableHead>Fila</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Mensaje</TableHead>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100 bg-white">
                {previewErrorDetails.slice(0, 100).map((detail, index) => (
                  <tr
                    key={`${detail.id || getDetailRow(detail) || index}`}
                    className="bg-red-50"
                  >
                    <td className="px-5 py-4 font-bold text-gray-900">
                      {getDetailRow(detail)}
                    </td>

                    <td className="px-5 py-4">
                      <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-bold text-red-700">
                        {getDetailStatus(detail)}
                      </span>
                    </td>

                    <td className="px-5 py-4 text-gray-700">
                      {getDetailMessage(detail) || "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}

function SummaryCard({ icon: Icon, label, value, description, tone }) {
  const styles = {
    dark: "border-gray-800 bg-gray-950 text-white",
    green: "border-green-100 bg-green-50 text-green-700",
    yellow: "border-yellow-100 bg-yellow-50 text-yellow-700",
  };

  return (
    <div
      className={`rounded-3xl border p-5 shadow-sm ${
        styles[tone] || styles.dark
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-bold opacity-80">{label}</p>
          <p className="mt-2 text-3xl font-black">{value}</p>
          <p className="mt-2 text-xs leading-5 opacity-80">{description}</p>
        </div>

        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/70 text-gray-950 ring-1 ring-white/60">
          <Icon />
        </div>
      </div>
    </div>
  );
}

function PreviewSummaryCard({ label, value, tone = "dark" }) {
  const styles = {
    dark: "bg-gray-50 text-gray-950 ring-gray-100",
    green: "bg-green-50 text-green-700 ring-green-100",
    blue: "bg-blue-50 text-blue-700 ring-blue-100",
    red: "bg-red-50 text-red-700 ring-red-100",
  };

  return (
    <div
      className={`rounded-2xl p-4 ring-1 ${
        styles[tone] || styles.dark
      }`}
    >
      <p className="text-xs font-black uppercase tracking-wide opacity-70">
        {label}
      </p>

      <p className="mt-2 text-2xl font-black">{value}</p>
    </div>
  );
}

function TableHead({ children }) {
  return (
    <th className="px-5 py-3 text-left text-xs font-black uppercase tracking-wide text-gray-500">
      {children}
    </th>
  );
}