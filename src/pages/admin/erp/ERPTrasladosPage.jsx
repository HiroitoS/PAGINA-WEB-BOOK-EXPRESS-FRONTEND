import { Link } from "react-router";
import { FiArrowLeft } from "react-icons/fi";
import InventoryTransfersPanel from "../../../components/admin/InventoryTransfersPanel";
import WarehouseMovementTabs from "../../../components/admin/WarehouseMovementTabs";
import { useAuth } from "../../../hooks/useAuth";
import { userHasPermission } from "../../../utils/adminAccess";

export default function ERPTrasladosPage() {
  const { user } = useAuth();
  const canManage = userHasPermission(user, ["warehouse.manage_stock_transfers"]);
  const canViewLocations = userHasPermission(user, ["warehouse.view_warehouse_locations"]);

  return (
    <main className="mx-auto w-full min-w-0 max-w-6xl space-y-3">
      <header className="space-y-3 rounded-2xl border border-gray-200 bg-white p-3 shadow-sm sm:p-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-wide text-red-700">ERP · Almacén</p>
            <h1 className="mt-1 text-xl font-black tracking-tight text-gray-950 sm:text-2xl">Movimientos</h1>
            <p className="mt-1 text-sm leading-5 text-gray-600">
              Traslada libros entre almacenes y consulta las entregas registradas.
            </p>
          </div>
          <Link to="/admin/erp/almacen/inventario"
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-3 text-xs font-bold text-gray-800 transition-colors hover:border-red-300 hover:text-red-700">
            <FiArrowLeft aria-hidden="true" size={15} /> Inventario
          </Link>
        </div>
        <WarehouseMovementTabs />
      </header>

      <section className="min-w-0 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <InventoryTransfersPanel canManage={canManage} canViewLocations={canViewLocations} />
      </section>
    </main>
  );
}
