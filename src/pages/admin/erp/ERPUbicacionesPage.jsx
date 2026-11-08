import { Link } from "react-router";
import { FiArrowLeft, FiMapPin, FiTruck } from "react-icons/fi";
import { useAuth } from "../../../hooks/useAuth";
import { userHasPermission } from "../../../utils/adminAccess";
import WarehouseLocationsPanel from "../../../components/admin/WarehouseLocationsPanel";

export default function ERPUbicacionesPage() {
  const { user } = useAuth();
  const puedeGestionar = userHasPermission(user, ["warehouse.manage_warehouse_locations"]);
  const puedeVerTraslados = userHasPermission(user, ["warehouse.view_receiving"]);
  const puedeConciliar = puedeGestionar
    && userHasPermission(user, ["warehouse.validate_receiving"])
    && puedeVerTraslados;

  return (
    <main className="mx-auto w-full min-w-0 max-w-6xl space-y-4">
      <header className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-6">
        <p className="text-xs font-bold uppercase tracking-wide text-red-700">ERP / Almacén / Organización</p>
        <div className="mt-3 flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
          <div className="flex min-w-0 gap-3">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-gray-950 text-white">
              <FiMapPin aria-hidden="true" size={20} />
            </span>
            <div className="min-w-0">
              <h1 className="text-2xl font-black tracking-tight text-gray-950">Ubicaciones de almacén</h1>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-gray-600">
                Identifica dónde se guardan los libros. Registra primero el almacén principal y después
                los destinos físicos que Book Express realmente utiliza.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {puedeVerTraslados && (
              <Link to="/admin/erp/almacen/stock-por-almacen" className="inline-flex min-h-11 flex-1 items-center justify-center rounded-xl border border-gray-300 px-3 text-sm font-bold text-gray-800 transition hover:border-red-300 hover:text-red-700 sm:flex-none">
                <FiMapPin aria-hidden="true" /> Ver stock por almacén
              </Link>
            )}
            <Link to="/admin/erp/almacen/inventario"
              className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-gray-300 px-3 text-sm font-bold text-gray-800 transition hover:border-red-300 hover:text-red-700 sm:flex-none">
              <FiArrowLeft aria-hidden="true" /> Inventario
            </Link>
            {puedeVerTraslados && (
              <Link to="/admin/erp/almacen/traslados"
                className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-gray-300 px-3 text-sm font-bold text-gray-800 transition hover:border-red-300 hover:text-red-700 sm:flex-none">
                <FiTruck aria-hidden="true" /> Traslados
              </Link>
            )}
          </div>
        </div>
      </header>
      <section className="min-w-0 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <WarehouseLocationsPanel puedeGestionar={puedeGestionar} puedeConciliar={puedeConciliar} puedeVerInventario={puedeVerTraslados} />
      </section>
      <p className="rounded-xl bg-gray-50 p-3 text-xs leading-5 text-gray-600 sm:px-4">
        Registrar una ubicación no mueve libros ni modifica el stock global. Las recepciones nuevas
        se asignan al almacén principal activo. Para existencias anteriores, confirma físicamente su
        ubicación desde la conciliación, si tienes autorización.
      </p>
    </main>
  );
}
