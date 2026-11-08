import { Link } from "react-router";
import { FiArrowLeft, FiTruck } from "react-icons/fi";
import InventoryTransfersPanel from "../../../components/admin/InventoryTransfersPanel";
import WarehouseMovementTabs from "../../../components/admin/WarehouseMovementTabs";
import { useAuth } from "../../../hooks/useAuth";
import { userHasPermission } from "../../../utils/adminAccess";

export default function ERPTrasladosPage() {
  const { user } = useAuth();
  const canManage = userHasPermission(user, ["warehouse.manage_stock_transfers"]);

  return (
    <main className="mx-auto w-full min-w-0 max-w-6xl space-y-4">
      <header className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-6">
        <p className="text-xs font-bold uppercase tracking-wide text-red-700">ERP / Almacén / Movimientos</p>
        <div className="mt-3 flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
          <div className="flex min-w-0 gap-3">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-gray-950 text-white">
              <FiTruck aria-hidden="true" size={20} />
            </span>
            <div className="min-w-0">
              <h1 className="text-2xl font-black tracking-tight text-gray-950">Traslados de mercadería</h1>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-gray-600">
                Registra cambios de ubicación cuando los libros ya hayan sido recibidos en el destino.
              </p>
            </div>
          </div>
          <Link to="/admin/erp/almacen/inventario"
            className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white px-4 text-sm font-bold text-gray-800 transition hover:border-red-300 hover:text-red-700 sm:w-auto">
            <FiArrowLeft aria-hidden="true" /> Volver a inventario
          </Link>
        </div>
      </header>
      <WarehouseMovementTabs />
      <section className="min-w-0 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <InventoryTransfersPanel canManage={canManage} />
      </section>
    </main>
  );
}
