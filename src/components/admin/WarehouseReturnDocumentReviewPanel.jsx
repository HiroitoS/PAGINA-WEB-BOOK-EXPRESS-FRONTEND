import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import { motion, useReducedMotion } from "motion/react";
import { FiAlertTriangle, FiFileText, FiRefreshCw } from "react-icons/fi";
import { consultarDocumentacionRetornosPendiente } from "../../api/warehouseApi";

function fechaPeru(value) {
  if (!value) return "Sin fecha";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Fecha no disponible";
  return new Intl.DateTimeFormat("es-PE", {
    timeZone: "America/Lima", dateStyle: "medium", timeStyle: "short",
  }).format(date);
}

export default function WarehouseReturnDocumentReviewPanel() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [revision, setRevision] = useState(0);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    let ignore = false;
    Promise.resolve().then(consultarDocumentacionRetornosPendiente)
      .then((result) => {
        if (ignore) return;
        setData(result);
        setError("");
      })
      .catch(() => {
        if (!ignore) setError("No se pudieron consultar las recepciones con documentación pendiente.");
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });
    return () => { ignore = true; };
  }, [revision]);

  const filtered = useMemo(() => {
    const term = query.trim().toLocaleLowerCase("es");
    return (data?.results ?? []).filter((row) =>
      !term || [row.school, row.from_location, row.to_location,
        row.received_by, row.registered_by].join(" ").toLocaleLowerCase("es").includes(term)
    );
  }, [data, query]);

  return (
    <section aria-labelledby="documentacion-retornos-titulo"
      className="space-y-4 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-900">
            <FiFileText size={20} aria-hidden="true" />
          </span>
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-red-700">Control de Jefatura</p>
            <h2 id="documentacion-retornos-titulo" className="mt-1 text-lg font-black text-gray-950">
              Documentación de retornos por revisar
            </h2>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-gray-600">
              Recepciones físicas registradas con una observación documental pendiente.
              Esta revisión no cambia los libros recibidos.
            </p>
          </div>
        </div>
        <button type="button" onClick={() => {
          setLoading(true);
          setRevision((value) => value + 1);
        }} disabled={loading}
          className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-gray-300 px-3 text-xs font-bold text-gray-800 hover:border-red-600 disabled:opacity-50">
          <FiRefreshCw aria-hidden="true" /> Actualizar
        </button>
      </div>

      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
        <p className="flex items-start gap-2 text-sm font-bold text-amber-950">
          <FiAlertTriangle aria-hidden="true" className="mt-0.5 shrink-0" />
          Recepción física no significa documentación tributaria conforme.
        </p>
        <p className="mt-1 text-xs leading-5 text-amber-900">
          Los registros de esta vista necesitan revisión documental. No se emiten GRE,
          no se declara cumplimiento ante SUNAT y no se cierran incidencias desde aquí.
        </p>
      </div>

      <div className="flex flex-wrap items-end justify-between gap-3">
        <label className="block min-w-0 flex-1 text-xs font-bold text-gray-800">
          Buscar por colegio, almacén o responsable
          <input type="search" maxLength={100} value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar recepción observada"
            className="mt-2 min-h-11 w-full rounded-xl border border-gray-300 bg-white px-3 text-sm font-normal text-gray-950 focus:border-red-600 focus:outline-none" />
        </label>
        <span className="rounded-full bg-gray-100 px-3 py-2 text-xs font-bold text-gray-800" aria-live="polite">
          {loading ? "Consultando…" : `${filtered.length} registros visibles`}
        </span>
      </div>

      {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</p>}
      {loading ? (
        <p role="status" className="rounded-xl bg-gray-50 p-4 text-sm text-gray-600">Cargando observaciones…</p>
      ) : !error && filtered.length === 0 ? (
        <p className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-4 text-sm text-gray-600">
          {query ? "No hay recepciones que coincidan con la búsqueda." :
            "No se encontraron recepciones físicas con documentación pendiente de revisión."}
        </p>
      ) : (
        <div className="space-y-3">
          {filtered.map((item) => (
            <motion.article key={item.event_id}
              initial={reduceMotion ? false : { opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.16 }}
              className="rounded-xl border border-gray-200 p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h3 className="text-sm font-black text-gray-950">{item.school}</h3>
                  <p className="mt-1 text-xs text-gray-600">
                    {item.from_location} → {item.to_location}
                  </p>
                </div>
                <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-950">
                  Documentación pendiente
                </span>
              </div>
              <div className="mt-3 grid gap-2 text-xs text-gray-700 sm:grid-cols-3">
                <p><strong className="block text-gray-950">{item.quantity} libros</strong> Recibidos</p>
                <p><strong className="block text-gray-950">{item.received_by || "Sin dato"}</strong> Recibió físicamente</p>
                <p><strong className="block text-gray-950">{fechaPeru(item.registered_at)}</strong> Registrado por {item.registered_by}</p>
              </div>
              <div className="mt-3 rounded-lg bg-gray-50 p-3 text-xs leading-5 text-gray-800">
                <strong className="block text-gray-950">Observación registrada</strong>
                <p className="mt-1 whitespace-pre-wrap break-words">{item.documentation_note}</p>
              </div>
            </motion.article>
          ))}
          {data?.more_records && (
            <p className="text-xs text-gray-600">
              Se muestran los últimos 100 registros. Consulta el historial de distribuciones
              para investigar movimientos anteriores.
            </p>
          )}
        </div>
      )}

      <Link to="/admin/erp/almacen/distribuciones"
        className="inline-flex min-h-11 items-center rounded-xl border border-gray-300 bg-white px-4 text-sm font-bold text-gray-800 hover:border-red-600">
        Consultar distribuciones
      </Link>
    </section>
  );
}
