import { Link } from "react-router";
import { FiArrowLeft, FiMapPin } from "react-icons/fi";
import { useAuth } from "../../../hooks/useAuth";
import { userHasPermission } from "../../../utils/adminAccess";
import WarehouseLocationsPanel from "../../../components/admin/WarehouseLocationsPanel";

export default function ERPUbicacionesPage() {
  const { user } = useAuth();
  const puedeGestionar = userHasPermission(user, ["warehouse.manage_warehouse_locations"]);
  const puedeConciliar = puedeGestionar
    && userHasPermission(user, ["warehouse.validate_receiving"])
    && userHasPermission(user, ["warehouse.view_receiving"]);

  return (
    <div className="mx-auto w-full min-w-0 max-w-6xl space-y-4">
      <header className="space-y-3">
        <Link
          to="/admin/erp/almacen/inventario"
          className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-800 transition hover:border-red-200 hover:text-red-700"
        >
          <FiArrowLeft aria-hidden="true" /> Volver a Inventario
        </Link>
        <div className="flex min-w-0 items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gray-950 text-white">
            <FiMapPin aria-hidden="true" size={20} />
          </span>
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-wide text-red-700">ERP · Almacén · Administración</p>
            <h1 className="mt-1 text-2xl font-black text-gray-950">Ubicaciones</h1>
            <p className="mt-1 text-sm leading-5 text-gray-600">
              Registra el almacén principal y los destinos para futuros traslados: tiendas, ferias y consignaciones.
            </p>
          </div>
        </div>
      </header>
      <section className="min-w-0 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <WarehouseLocationsPanel puedeGestionar={puedeGestionar} puedeConciliar={puedeConciliar} />
      </section>
      <p className="px-1 text-xs leading-5 text-gray-600">
        Registrar una ubicación no mueve libros. Las nuevas recepciones se asignan al principal activo;
        las existencias anteriores requieren conciliación física por lote. El total global no cambia.
      </p>
    </div>
  );
}
