import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import {
  FaArrowLeft,
  FaCheckCircle,
  FaCloudUploadAlt,
  FaExclamationTriangle,
  FaFileExcel,
  FaSchool,
  FaSyncAlt,
} from "react-icons/fa";

import {
  confirmCRMSchoolImport,
  getCRMSchoolImports,
  previewCRMSchoolImport,
} from "../../../api/crmApi";

function getErrorMessage(error, fallback) {
  const data = error?.response?.data;

  if (typeof data?.detail === "string" && data.detail.trim()) {
    return data.detail;
  }

  if (data && typeof data === "object") {
    const messages = Object.values(data)
      .flatMap((value) => (Array.isArray(value) ? value : [value]))
      .filter((value) => typeof value === "string" && value.trim());

    if (messages.length > 0) {
      return messages.join(" ");
    }
  }

  return fallback;
}

function statusClass(status) {
  if (status === "imported") {
    return "bg-emerald-50 text-emerald-700 ring-emerald-200";
  }

  if (status === "validated") {
    return "bg-blue-50 text-blue-700 ring-blue-200";
  }

  if (status === "error") {
    return "bg-red-50 text-red-700 ring-red-200";
  }

  return "bg-amber-50 text-amber-700 ring-amber-200";
}

function formatDate(value) {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleString("es-PE", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

export default function CRMSchoolImportsPage() {
  const [file, setFile] = useState(null);
  const [populationYear, setPopulationYear] = useState(
    String(new Date().getFullYear() + 1),
  );
  const [preview, setPreview] = useState(null);
  const [imports, setImports] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [previewing, setPreviewing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const warningRows = useMemo(
    () =>
      (preview?.rows || []).filter(
        (row) => Array.isArray(row.warnings) && row.warnings.length > 0,
      ),
    [preview],
  );

  const errorRows = useMemo(
    () =>
      (preview?.rows || []).filter(
        (row) => row.action === "error",
      ),
    [preview],
  );

  useEffect(() => {
    let ignore = false;

    async function loadHistory() {
      try {
        const data = await getCRMSchoolImports();

        if (!ignore) {
          setImports(Array.isArray(data) ? data : []);
        }
      } catch {
        if (!ignore) {
          setErrorMessage(
            "No se pudo cargar el historial de importaciones.",
          );
        }
      } finally {
        if (!ignore) {
          setLoadingHistory(false);
        }
      }
    }

    loadHistory();

    return () => {
      ignore = true;
    };
  }, []);

  async function reloadHistory() {
    try {
      setLoadingHistory(true);
      const data = await getCRMSchoolImports();
      setImports(Array.isArray(data) ? data : []);
    } catch {
      setErrorMessage(
        "No se pudo actualizar el historial de importaciones.",
      );
    } finally {
      setLoadingHistory(false);
    }
  }

  function handleFileChange(event) {
    const selected = event.target.files?.[0] || null;

    setPreview(null);
    setSuccessMessage("");
    setErrorMessage("");

    if (!selected) {
      setFile(null);
      return;
    }

    if (!selected.name.toLowerCase().endsWith(".xlsx")) {
      setFile(null);
      setErrorMessage(
        "Selecciona el archivo de colegios en formato .xlsx.",
      );
      event.target.value = "";
      return;
    }

    setFile(selected);
  }

  async function handlePreview(event) {
    event.preventDefault();

    if (!file) {
      setErrorMessage("Selecciona primero el archivo Excel.");
      return;
    }

    try {
      setPreviewing(true);
      setPreview(null);
      setErrorMessage("");
      setSuccessMessage("");

      const data = await previewCRMSchoolImport(
        file,
        populationYear,
      );

      setPreview(data);

      if (Number(data?.total_errors || 0) > 0) {
        setErrorMessage(
          "Hay registros que requieren revisión antes de confirmar la importación.",
        );
      } else if (Number(data?.total_warnings || 0) > 0) {
        setSuccessMessage(
          "Vista previa lista. Hay advertencias que no bloquean la importación; revísalas antes de confirmar.",
        );
      } else {
        setSuccessMessage(
          "Vista previa lista. Revisa el resumen antes de confirmar.",
        );
      }

      await reloadHistory();
    } catch (error) {
      setErrorMessage(
        getErrorMessage(
          error,
          "No se pudo validar el archivo de colegios.",
        ),
      );
    } finally {
      setPreviewing(false);
    }
  }

  async function handleConfirm() {
    if (!preview?.id || Number(preview.total_errors || 0) > 0) {
      return;
    }

    try {
      setConfirming(true);
      setErrorMessage("");
      setSuccessMessage("");

      const data = await confirmCRMSchoolImport(preview.id);
      setPreview(data);
      setSuccessMessage(
        "Los colegios fueron importados correctamente. Ya puedes distribuir la cartera entre los asesores.",
      );
      await reloadHistory();
    } catch (error) {
      setErrorMessage(
        getErrorMessage(
          error,
          "No se pudo confirmar la importación de colegios.",
        ),
      );
    } finally {
      setConfirming(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-7xl space-y-5">
      <section className="rounded-3xl bg-gray-950 px-5 py-5 text-white shadow-sm sm:px-7">
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
          <div>
            <p className="text-xs font-black uppercase tracking-wide text-red-300">
              CRM Comercial
            </p>
            <h1 className="mt-1 text-2xl font-black sm:text-3xl">
              Importar colegios
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-300">
              Valida el padrón institucional antes de incorporarlo a la
              cartera comercial de Book Express.
            </p>
          </div>

          <Link
            to="/admin/crm/colegios"
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/10 px-4 py-2.5 text-sm font-black text-white transition hover:bg-white/15"
          >
            <FaArrowLeft />
            Volver a colegios
          </Link>
        </div>
      </section>

      <section className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-red-50 text-red-700">
            <FaSchool />
          </div>
          <div>
            <h2 className="text-lg font-black text-gray-950">
              Estructura esperada
            </h2>
            <p className="mt-1 text-sm leading-6 text-gray-600">
              Puedes usar el padrón trabajado por Book Express con las
              columnas Código modular, Código de institución, Nombre de
              IE, Nivel/Modalidad, Dependencia, Dirección de IE,
              Departamento / Provincia / Distrito y Alumnos.
            </p>
            <p className="mt-2 text-sm leading-6 text-gray-600">
              Un mismo colegio puede tener varios niveles y varias sedes.
              Los códigos oficiales pueden completarse después; cuando
              falten, el colegio conservará un código interno Book Express.
              Si una misma información aparece de forma contradictoria,
              la vista previa pedirá revisarla antes de confirmar.
            </p>
          </div>
        </div>
      </section>

      {errorMessage ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800">
          {errorMessage}
        </div>
      ) : null}

      {successMessage ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
          {successMessage}
        </div>
      ) : null}

      <form
        onSubmit={handlePreview}
        className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm"
      >
        <div className="grid gap-5 lg:grid-cols-2">
          <label className="flex min-h-44 cursor-pointer flex-col items-center justify-center rounded-3xl border border-dashed border-gray-300 bg-gray-50 px-5 py-6 text-center transition hover:border-red-200 hover:bg-red-50">
            <FaCloudUploadAlt className="text-4xl text-red-700" />
            <p className="mt-3 text-sm font-black text-gray-950">
              Seleccionar padrón de colegios
            </p>
            <p className="mt-1 text-xs text-gray-500">
              Archivo permitido: .xlsx
            </p>
            <input
              type="file"
              accept=".xlsx"
              onChange={handleFileChange}
              className="hidden"
            />
          </label>

          <div>
            <label className="block">
              <span className="text-sm font-black text-gray-800">
                Año de población
              </span>
              <input
                type="number"
                min="2020"
                max="2100"
                value={populationYear}
                onChange={(event) =>
                  setPopulationYear(event.target.value)
                }
                className="mt-1.5 w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm font-bold outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-100"
              />
            </label>

            <div className="mt-4 rounded-2xl border border-gray-200 bg-gray-50 p-4">
              <p className="text-xs font-black uppercase tracking-wide text-gray-500">
                Archivo seleccionado
              </p>
              <p className="mt-2 break-all text-sm font-bold text-gray-900">
                {file?.name || "Ningún archivo seleccionado"}
              </p>
            </div>

            <button
              type="submit"
              disabled={!file || previewing}
              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gray-950 px-4 py-3 text-sm font-black text-white transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-50"
            >
              <FaFileExcel />
              {previewing
                ? "Validando archivo..."
                : "Generar vista previa"}
            </button>
          </div>
        </div>
      </form>

      {preview ? (
        <section className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-100 px-5 py-4">
            <h2 className="text-lg font-black text-gray-950">
              Resultado de la validación
            </h2>
            <p className="mt-1 text-xs text-gray-500">
              Revisa el consolidado antes de incorporar los colegios a la
              cartera.
            </p>
          </div>

          <div className="grid gap-3 p-5 sm:grid-cols-2 xl:grid-cols-3">
            {[
              ["Filas del Excel", preview.total_rows],
              ["Colegios detectados", preview.total_schools],
              ["Nuevos", preview.total_new],
              ["Por actualizar", preview.total_updated],
              ["Advertencias", preview.total_warnings],
              ["Requieren revisión", preview.total_errors],
            ].map(([label, value]) => (
              <div
                key={label}
                className="rounded-2xl border border-gray-200 bg-gray-50 p-4"
              >
                <p className="text-xs font-black uppercase tracking-wide text-gray-500">
                  {label}
                </p>
                <p className="mt-2 text-2xl font-black text-gray-950">
                  {value ?? 0}
                </p>
              </div>
            ))}
          </div>

          {warningRows.length > 0 ? (
            <div className="border-t border-gray-100 bg-amber-50/40 p-5">
              <div className="flex items-center gap-2 text-amber-800">
                <FaExclamationTriangle />
                <h3 className="font-black">
                  Advertencias que no bloquean la importación
                </h3>
              </div>

              <p className="mt-1 text-sm text-amber-800">
                Puedes confirmar la carga, pero conviene completar estos
                datos cuando estén disponibles.
              </p>

              <div className="mt-3 overflow-x-auto rounded-2xl border border-amber-200 bg-white">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <thead className="bg-amber-50">
                    <tr className="text-left text-xs font-black uppercase tracking-wide text-amber-900">
                      <th className="px-3 py-3">Fila</th>
                      <th className="px-3 py-3">Institución</th>
                      <th className="px-3 py-3">Nivel</th>
                      <th className="px-3 py-3">Advertencia</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white">
                    {warningRows.map((row) => (
                      <tr key={`warning-${row.id}`}>
                        <td className="px-3 py-3 font-black">
                          {row.row_number}
                        </td>
                        <td className="px-3 py-3">
                          <p className="font-bold text-gray-900">
                            {row.school_name || "Sin nombre"}
                          </p>
                          <p className="text-xs text-gray-500">
                            {row.institution_code || "Código oficial pendiente"}
                          </p>
                        </td>
                        <td className="px-3 py-3">
                          {row.level_name || "—"}
                        </td>
                        <td className="px-3 py-3 text-amber-800">
                          {(row.warnings || []).join(" ")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}

          {errorRows.length > 0 ? (
            <div className="border-t border-gray-100 p-5">
              <div className="flex items-center gap-2 text-red-700">
                <FaExclamationTriangle />
                <h3 className="font-black">
                  Registros que requieren revisión
                </h3>
              </div>

              <div className="mt-3 overflow-x-auto rounded-2xl border border-gray-200">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <thead className="bg-gray-50">
                    <tr className="text-left text-xs font-black uppercase tracking-wide text-gray-500">
                      <th className="px-3 py-3">Fila</th>
                      <th className="px-3 py-3">Institución</th>
                      <th className="px-3 py-3">Nivel</th>
                      <th className="px-3 py-3">Observación</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white">
                    {errorRows.map((row) => (
                      <tr key={row.id}>
                        <td className="px-3 py-3 font-black">
                          {row.row_number}
                        </td>
                        <td className="px-3 py-3">
                          <p className="font-bold text-gray-900">
                            {row.school_name || "Sin nombre"}
                          </p>
                          <p className="text-xs text-gray-500">
                            {row.institution_code || "Sin código"}
                          </p>
                        </td>
                        <td className="px-3 py-3">
                          {row.level_name || "—"}
                        </td>
                        <td className="px-3 py-3 text-red-700">
                          {(row.errors || []).join(" ")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}

          <div className="flex flex-col justify-between gap-3 border-t border-gray-100 bg-gray-50 px-5 py-4 sm:flex-row sm:items-center">
            <p className="text-sm text-gray-600">
              {preview.status === "imported"
                ? "La importación ya fue confirmada."
                : "La importación solo modificará la cartera cuando confirmes."}
            </p>

            {preview.status === "validated" ? (
              <button
                type="button"
                onClick={handleConfirm}
                disabled={confirming}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-700 px-4 py-2.5 text-sm font-black text-white transition hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <FaCheckCircle />
                {confirming
                  ? "Importando colegios..."
                  : Number(preview.total_warnings || 0) > 0
                    ? "Confirmar con advertencias"
                    : "Confirmar importación"}
              </button>
            ) : preview.status === "imported" ? (
              <Link
                to="/admin/crm/colegios"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-gray-950 px-4 py-2.5 text-sm font-black text-white transition hover:bg-black"
              >
                Ir a la cartera
              </Link>
            ) : null}
          </div>
        </section>
      ) : null}

      <section className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm">
        <div className="flex items-center justify-between gap-3 border-b border-gray-100 px-5 py-4">
          <div>
            <h2 className="text-lg font-black text-gray-950">
              Historial de cargas
            </h2>
            <p className="mt-1 text-xs text-gray-500">
              Control de los padrones revisados e importados.
            </p>
          </div>

          <button
            type="button"
            onClick={reloadHistory}
            className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-3 py-2 text-xs font-black text-gray-700 transition hover:bg-gray-50"
          >
            <FaSyncAlt
              className={loadingHistory ? "animate-spin" : ""}
            />
            Actualizar
          </button>
        </div>

        {loadingHistory ? (
          <div className="p-8 text-center text-sm font-bold text-gray-500">
            Cargando historial...
          </div>
        ) : imports.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-500">
            Aún no hay padrones de colegios registrados.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr className="text-left text-xs font-black uppercase tracking-wide text-gray-500">
                  <th className="px-4 py-3">Archivo</th>
                  <th className="px-4 py-3">Año</th>
                  <th className="px-4 py-3">Colegios</th>
                  <th className="px-4 py-3">Nuevos</th>
                  <th className="px-4 py-3">Actualizados</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3">Fecha</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {imports.map((item) => (
                  <tr key={item.id}>
                    <td className="px-4 py-3 font-bold text-gray-900">
                      {item.file_name}
                    </td>
                    <td className="px-4 py-3">
                      {item.population_year}
                    </td>
                    <td className="px-4 py-3 font-black">
                      {item.total_schools}
                    </td>
                    <td className="px-4 py-3">
                      {item.total_new}
                    </td>
                    <td className="px-4 py-3">
                      {item.total_updated}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-black ring-1 ${statusClass(item.status)}`}
                      >
                        {item.status_display}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {formatDate(item.created_at)}
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
