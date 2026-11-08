import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router";
import { FiGift, FiArrowLeft } from "react-icons/fi";
import InventoryCourtesyPanel from "../../../components/admin/InventoryCourtesyPanel";
import { listarSalidasInventario } from "../../../api/warehouseApi";
import { useAuth } from "../../../hooks/useAuth";
import { userHasPermission } from "../../../utils/adminAccess";

export default function ERPCortesiasPage() {
  const { user } = useAuth();
  const canManage = userHasPermission(user, ["warehouse.manage_stock_courtesies"]);
  const [outflows, setOutflows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const refreshOutflows = useCallback(async () => {
    const data = await listarSalidasInventario();
    setOutflows(Array.isArray(data) ? data : data?.results ?? []);
  }, []);

  useEffect(() => {
    let ignore = false;
    listarSalidasInventario().then((data) => {
      if (!ignore) setOutflows(Array.isArray(data) ? data : data?.results ?? []);
    }).catch(() => {
      if (!ignore) setError("No pudimos cargar las salidas registradas. Actualiza la página para intentarlo nuevamente.");
    }).finally(() => {
      if (!ignore) setLoading(false);
    });
    return () => { ignore = true; };
  }, []);

  return (
    <main className="mx-auto w-full min-w-0 max-w-6xl space-y-4">
      <header className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-6">
        <p className="text-xs font-bold uppercase tracking-wide text-red-700">ERP / Almacén / Movimientos</p>
        <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 gap-3">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-gray-950 text-white">
              <FiGift aria-hidden="true" size={20} />
            </span>
            <div className="min-w-0">
              <h1 className="text-2xl font-black tracking-tight text-gray-950">Cortesías y muestras entregadas</h1>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-gray-600">
                Registra las entregas sin costo a colegios y conserva el responsable,
                la guía y la cantidad entregada.
              </p>
            </div>
          </div>
          <Link to="/admin/erp/almacen/inventario"
            className="inline-flex min-h-11 w-full shrink-0 items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white px-4 text-sm font-bold text-gray-800 transition hover:border-red-300 hover:text-red-700 sm:w-auto">
            <FiArrowLeft aria-hidden="true" /> Volver a inventario
          </Link>
        </div>
      </header>
      {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</p>}
      <section className="min-w-0 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        {loading ? (
          <p role="status" className="p-6 text-sm text-gray-600">Consultando salidas registradas…</p>
        ) : (
          <InventoryCourtesyPanel outflows={outflows} canManage={canManage} onRefresh={refreshOutflows} />
        )}
      </section>
    </main>
  );
}
