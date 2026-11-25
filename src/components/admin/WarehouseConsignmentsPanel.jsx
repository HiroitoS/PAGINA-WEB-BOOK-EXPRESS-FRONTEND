import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import { motion, useReducedMotion } from "motion/react";
import { FiArrowRight, FiClipboard, FiFileText, FiRefreshCw } from "react-icons/fi";
import { consultarSeguimientoConsignaciones } from "../../api/warehouseApi";

const estados = {
  planned: "Por preparar",
  reserved: "Reservada",
  prepared: "Preparada",
  in_transit: "En tránsito",
  delivered: "Recibida por el destinatario",
};

export default function WarehouseConsignmentsPanel() {
  const [datos, setDatos] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [filtro, setFiltro] = useState("");
  const [revision, setRevision] = useState(0);
  const reducirMovimiento = useReducedMotion();

  useEffect(() => {
    let ignore = false;
    Promise.resolve().then(consultarSeguimientoConsignaciones)
      .then((result) => {
        if (!ignore) { setDatos(result); setError(""); }
      })
      .catch(() => {
        if (!ignore) setError("No pudimos cargar las consignaciones. Comprueba la conexión.");
      })
      .finally(() => { if (!ignore) setCargando(false); });
    return () => { ignore = true; };
  }, [revision]);

  const operaciones = useMemo(() => {
    const q = filtro.toLocaleLowerCase("es").trim();
    return (datos?.results ?? []).filter((item) =>
      !q || [item.name, item.school, item.destination]
        .join(" ").toLocaleLowerCase("es").includes(q)
    );
  }, [datos, filtro]);
  const recibidas = (datos?.results ?? []).filter((item) => item.status === "delivered").length;

  function recargar() {
    setCargando(true);
    setRevision((actual) => actual + 1);
  }

  return (
    <section aria-labelledby="consignaciones-titulo"
      className="space-y-4 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-red-700">Seguimiento logístico</p>
          <h2 id="consignaciones-titulo" className="mt-1 text-lg font-black text-gray-950">
            Consignaciones
          </h2>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-gray-600">
            Libros entregados a clientes con devolución posterior de sobrantes.
            Los pagos parciales y la facturación final se conciliarán en los módulos comerciales.
          </p>
        </div>
        <button type="button" disabled={cargando} onClick={recargar}
          className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-gray-300 px-3 text-xs font-bold text-gray-800 hover:border-red-600 disabled:opacity-50">
          <FiRefreshCw aria-hidden="true" /> Actualizar
        </button>
      </header>
      <div className="grid gap-3 sm:grid-cols-3">
        {[
          ["Consignaciones registradas", datos?.count ?? "—"],
          ["Entregadas en destino", recibidas],
          ["Abonos y liquidaciones", "No integrados"],
        ].map(([title, value]) => (
          <div key={title} className="rounded-xl border border-gray-200 bg-gray-50 p-3">
            <p className="text-xs font-semibold text-gray-600">{title}</p>
            <p className="mt-1 text-lg font-black text-gray-950">{value}</p>
          </div>
        ))}
      </div>
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs leading-5 text-amber-950">
        <strong>Control comercial pendiente:</strong> recibir un pago no significa que ya se haya
        registrado la venta de los libros. La liquidación final deberá conciliar unidades
        vendidas, documentos emitidos, abonos recibidos y devoluciones reales, sin descontar
        inventario dos veces. Esta pantalla todavía no cobra ni factura.
      </div>
      {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}
      <label className="block text-xs font-bold text-gray-700">
        Buscar consignación
        <input type="search" value={filtro} onChange={(event) => setFiltro(event.target.value)}
          maxLength={100} placeholder="Nombre, colegio o destino"
          className="mt-2 min-h-11 w-full rounded-xl border border-gray-300 bg-white px-3 text-sm text-gray-900 focus:border-red-600 focus:outline-none" />
      </label>
      {cargando ? (
        <p role="status" className="rounded-xl bg-gray-50 p-4 text-sm text-gray-600">Consultando consignaciones…</p>
      ) : operaciones.length === 0 && !error ? (
        <p className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-5 text-sm text-gray-600">
          {filtro ? "No se encontraron consignaciones con ese criterio." :
            "No hay consignaciones registradas. Se crearán desde Distribuciones al seleccionar esa modalidad."}
        </p>
      ) : (
        <div className="space-y-3">
          {operaciones.map((item) => (
            <motion.article key={item.operation_id}
              initial={reducirMovimiento ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.18 }}
              className="rounded-xl border border-gray-200 p-4 transition-colors hover:border-gray-300">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="break-words text-sm font-black text-gray-950">{item.name}</h3>
                  <p className="mt-1 text-xs text-gray-600">{item.school} · {item.destination}</p>
                </div>
                <span className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs font-bold text-gray-700">
                  {estados[item.status] ?? item.status}
                </span>
              </div>
              <div className="mt-3 grid gap-2 sm:grid-cols-3">
                <p className="rounded-lg bg-gray-50 p-2 text-xs text-gray-700">
                  Planificadas <strong className="block text-base text-gray-950">{item.planned_units}</strong>
                </p>
                <p className="rounded-lg bg-gray-50 p-2 text-xs text-gray-700">
                  Entregadas confirmadas <strong className="block text-base text-gray-950">{item.delivered_units ?? "Pendiente"}</strong>
                </p>
                <p className="rounded-lg bg-gray-50 p-2 text-xs text-gray-700">
                  Devoluciones registradas <strong className="block text-base text-gray-950">{item.returned_units}</strong>
                </p>
              </div>
              <p className="mt-2 text-xs text-gray-600">No se deducen ventas ni saldos por cobrar desde este registro.</p>
            </motion.article>
          ))}
          {datos?.limited && <p className="text-xs text-gray-600">
            Se muestran las 60 operaciones más recientes. El historial completo seguirá disponible en Distribuciones.
          </p>}
        </div>
      )}
      <div className="flex flex-wrap gap-2 border-t border-gray-200 pt-4">
        <Link to="/admin/erp/almacen/distribuciones"
          className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-red-700 px-4 text-sm font-bold text-white hover:bg-red-800">
          <FiClipboard aria-hidden="true" /> Abrir distribuciones <FiArrowRight aria-hidden="true" />
        </Link>
        <Link to="/admin/erp/compras/pedidos"
          className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-gray-300 px-4 text-sm font-bold text-gray-800 hover:border-red-600">
          <FiFileText aria-hidden="true" /> Revisar pedidos
        </Link>
      </div>
    </section>
  );
}
