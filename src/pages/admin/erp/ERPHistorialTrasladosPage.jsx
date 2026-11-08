import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { FiArrowLeft, FiArrowRight, FiClock, FiSearch } from "react-icons/fi";
import { listarTrasladosAlmacen, listarUbicacionesAlmacen } from "../../../api/warehouseApi";
import WarehouseMovementTabs from "../../../components/admin/WarehouseMovementTabs";

const campo = "min-h-11 w-full min-w-0 rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-red-600 focus:outline-none";

function fechaLegible(value) {
  const date = new Date(value);
  return !value || Number.isNaN(date.getTime())
    ? "Fecha no disponible"
    : date.toLocaleString("es-PE", { dateStyle: "medium", timeStyle: "short" });
}

function errorLegible(error) {
  const status = error?.response?.status;
  if (!error?.response) return "No pudimos conectarnos. Revisa tu conexión y vuelve a intentarlo.";
  if (status === 403) return "No tienes autorización para consultar los traslados.";
  const detail = error.response.data?.detail;
  return typeof detail === "string"
    ? detail
    : "No pudimos cargar el historial. Comprueba los filtros e inténtalo nuevamente.";
}

function labelAlmacen(list, id) {
  return list.find((loc) => String(loc.id) === String(id))?.name ?? "";
}

export default function ERPHistorialTrasladosPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const batchId = searchParams.get("batch_id") ?? "";
  const [filters, setFilters] = useState({
    q: "", sourceId: "", destinationId: "", dateFrom: "", dateTo: "",
  });
  const [page, setPage] = useState(1);
  const [locations, setLocations] = useState([]);
  const [loadingLocations, setLoadingLocations] = useState(true);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [data, setData] = useState({ results: [], count: 0, pages: 1 });
  const [error, setError] = useState("");

  useEffect(() => {
    let ignore = false;
    listarUbicacionesAlmacen()
      .then((response) => {
        if (!ignore) setLocations(Array.isArray(response) ? response : response?.results ?? []);
      })
      .catch(() => {
        if (!ignore) setError("No pudimos consultar las ubicaciones. Actualiza la página para intentarlo nuevamente.");
      })
      .finally(() => { if (!ignore) setLoadingLocations(false); });
    return () => { ignore = true; };
  }, []);

  useEffect(() => {
    let ignore = false;
    const timer = setTimeout(() => {
      setLoadingHistory(true);
      listarTrasladosAlmacen(page, {
        q: filters.q.trim(),
        source_id: filters.sourceId,
        destination_id: filters.destinationId,
        date_from: filters.dateFrom,
        date_to: filters.dateTo,
        batch_id: batchId,
      })
        .then((response) => {
          if (ignore) return;
          setData({
            results: response?.results ?? [],
            count: response?.count ?? 0,
            pages: response?.pages ?? 1,
          });
          setError("");
        })
        .catch((err) => {
          if (!ignore) {
            setError(errorLegible(err));
            setData({ results: [], count: 0, pages: 1 });
          }
        })
        .finally(() => { if (!ignore) setLoadingHistory(false); });
    }, filters.q.trim() ? 250 : 0);
    return () => { ignore = true; clearTimeout(timer); };
  }, [filters, page, batchId]);

  function cambiarFiltro(key, value) {
    setFilters((current) => ({ ...current, [key]: value }));
    setPage(1);
  }

  function quitarFiltroGuia() {
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      next.delete("batch_id");
      return next;
    });
    setPage(1);
  }

  return (
    <main className="mx-auto w-full min-w-0 max-w-6xl space-y-4">
      <header className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-6">
        <p className="text-xs font-bold uppercase tracking-wide text-red-700">ERP / Almacén / Movimientos</p>
        <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 gap-3">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-gray-950 text-white">
              <FiClock aria-hidden="true" size={20} />
            </span>
            <div className="min-w-0">
              <h1 className="text-2xl font-black tracking-tight text-gray-950">Historial de traslados</h1>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-gray-600">
                Revisa cada movimiento confirmado: fecha, responsable, libros, cantidades y destino.
              </p>
            </div>
          </div>
          <Link to="/admin/erp/almacen/traslados"
            className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl border border-gray-300 px-4 text-sm font-bold text-gray-800 hover:border-red-300 hover:text-red-700">
            <FiArrowLeft aria-hidden="true" /> Volver a traslados
          </Link>
        </div>
      </header>

      <WarehouseMovementTabs />
      <section className="min-w-0 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex items-center gap-2">
          <FiSearch aria-hidden="true" className="text-gray-600" />
          <h2 className="text-base font-black text-gray-950">Buscar movimientos</h2>
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <label className="text-xs font-bold text-gray-700">
            Libro, código, editorial, colegio o guía
            <input className={campo} type="search" maxLength={100}
              value={filters.q} onChange={(e) => cambiarFiltro("q", e.target.value)}
              placeholder="Buscar movimientos…" />
          </label>
          <label className="text-xs font-bold text-gray-700">
            Almacén de origen
            <select className={campo} value={filters.sourceId}
              disabled={loadingLocations} onChange={(e) => cambiarFiltro("sourceId", e.target.value)}>
              <option value="">Todos los orígenes</option>
              {locations.map((loc) => <option key={loc.id} value={loc.id}>{loc.name}</option>)}
            </select>
          </label>
          <label className="text-xs font-bold text-gray-700">
            Almacén de destino
            <select className={campo} value={filters.destinationId}
              disabled={loadingLocations} onChange={(e) => cambiarFiltro("destinationId", e.target.value)}>
              <option value="">Todos los destinos</option>
              {locations.map((loc) => <option key={loc.id} value={loc.id}>{loc.name}</option>)}
            </select>
          </label>
          <label className="text-xs font-bold text-gray-700">
            Desde
            <input className={campo} type="date" value={filters.dateFrom}
              max={filters.dateTo || undefined}
              onChange={(e) => cambiarFiltro("dateFrom", e.target.value)} />
          </label>
          <label className="text-xs font-bold text-gray-700">
            Hasta
            <input className={campo} type="date" value={filters.dateTo}
              min={filters.dateFrom || undefined}
              onChange={(e) => cambiarFiltro("dateTo", e.target.value)} />
          </label>
          <div className="flex items-end">
            <button type="button" className="min-h-11 w-full rounded-xl border border-gray-300 px-4 text-sm font-bold text-gray-700 hover:bg-gray-50"
              onClick={() => { setFilters({ q: "", sourceId: "", destinationId: "", dateFrom: "", dateTo: "" }); setPage(1); quitarFiltroGuia(); }}>
              Limpiar filtros
            </button>
          </div>
        </div>
        {batchId && (
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-red-200 bg-red-50 p-3">
            <p className="text-sm font-bold text-red-800">Mostrando solo la operación BE-TG-{String(batchId).padStart(6, "0")}</p>
            <button type="button" onClick={quitarFiltroGuia}
              className="min-h-11 rounded-lg border border-red-300 bg-white px-3 text-sm font-bold text-red-800">
              Ver todos los traslados
            </button>
          </div>
        )}
        {error && <p role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}
        <div className="mt-5 flex flex-wrap items-center justify-between gap-2 border-b border-gray-200 pb-3">
          <h2 className="text-base font-black text-gray-950">Movimientos confirmados</h2>
          <span className="text-xs font-semibold text-gray-600">{data.count} {data.count === 1 ? "movimiento" : "movimientos"}</span>
        </div>
        {loadingHistory ? (
          <p role="status" className="py-8 text-center text-sm text-gray-600">Consultando historial…</p>
        ) : data.results.length === 0 ? (
          <p className="my-4 rounded-xl border border-dashed border-gray-300 bg-gray-50 p-6 text-center text-sm text-gray-600">
            {error ? "No fue posible mostrar los registros." : "No hay traslados para estos filtros. Cuando confirmes una entrega, aparecerá aquí."}
          </p>
        ) : (
          <div className="mt-3 space-y-2">
            {data.results.map((item) => (
              <article key={item.id} className="min-w-0 rounded-xl border border-gray-200 p-3 sm:p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-black text-gray-950">
                      {item.operation_reference || `Traslado N.º ${item.id}`}
                    </p>
                    <p className="mt-1 text-xs text-gray-600">
                      {item.operation_type === "guia" ? "Por guía" : "Individual"} · {fechaLegible(item.created_at)}
                    </p>
                  </div>
                  <span className="rounded-lg bg-gray-100 px-3 py-1 text-xs font-bold text-gray-800">
                    {item.quantity} {item.quantity === 1 ? "unidad" : "unidades"}
                  </span>
                </div>
                <p className="mt-3 break-words text-sm font-bold text-gray-950">{item.product}</p>
                <p className="mt-1 break-words text-xs text-gray-600">{item.editorial} · {item.product_code || "Sin código"} · Guía {item.guide}</p>
                <p className="mt-2 break-words text-sm text-gray-800">
                  <span className="font-semibold">{item.source}</span>
                  <FiArrowRight aria-hidden="true" className="mx-2 inline" />
                  <span className="font-semibold">{item.destination}</span>
                </p>
                <p className="mt-2 text-xs text-gray-600">Colegio: {item.school || "Pedido independiente"} · Registrado por: {item.created_by_name || "Usuario del sistema"}</p>
                {item.notes && <p className="mt-2 break-words rounded-lg bg-gray-50 p-2 text-xs text-gray-700">Observación: {item.notes}</p>}
                {item.batch_id && (
                  <Link to={`/admin/erp/almacen/historial-traslados?batch_id=${item.batch_id}`}
                    className="mt-3 inline-flex min-h-11 items-center text-xs font-bold text-red-700 hover:underline">
                    Ver todos los libros de esta operación <FiArrowRight aria-hidden="true" className="ml-2" />
                  </Link>
                )}
              </article>
            ))}
          </div>
        )}
        <div className="mt-5 flex items-center justify-between gap-3">
          <p className="text-xs text-gray-600">Página {page} de {data.pages}</p>
          <div className="flex gap-2">
            <button type="button" disabled={page <= 1 || loadingHistory}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              className="min-h-11 rounded-lg border border-gray-300 px-3 text-sm font-bold text-gray-700 disabled:opacity-40">
              Anterior
            </button>
            <button type="button" disabled={page >= data.pages || loadingHistory}
              onClick={() => setPage((current) => current + 1)}
              className="min-h-11 rounded-lg border border-gray-300 px-3 text-sm font-bold text-gray-700 disabled:opacity-40">
              Siguiente
            </button>
          </div>
        </div>
        <p className="mt-4 text-xs leading-5 text-gray-600">
          Este historial corresponde a traslados de mercadería ya recibida físicamente.
          Los despachos en tránsito y sus entregas tendrán un seguimiento independiente cuando se implemente ese proceso.
          {filters.sourceId ? ` Origen seleccionado: ${labelAlmacen(locations, filters.sourceId)}.` : ""}
        </p>
      </section>
    </main>
  );
}
