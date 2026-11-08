import { NavLink } from "react-router";
import { FiClock, FiGift, FiTruck } from "react-icons/fi";

const tabs = [
  { label: "Traslados", to: "/admin/erp/almacen/traslados", icon: FiTruck },
  { label: "Cortesías", to: "/admin/erp/almacen/cortesias", icon: FiGift },
  { label: "Historial", to: "/admin/erp/almacen/historial-traslados", icon: FiClock },
];

export default function WarehouseMovementTabs() {
  return (
    <nav aria-label="Opciones de movimientos" className="min-w-0 overflow-x-auto rounded-xl border border-gray-200 bg-white p-1.5 shadow-sm">
      <div className="flex w-max min-w-full gap-1 sm:w-full">
        {tabs.map(({ label, to, icon: Icon }) => (
          <NavLink key={to} to={to}
            className={({ isActive }) =>
              `inline-flex min-h-11 flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-lg px-4 text-sm font-bold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-700 ${
                isActive ? "bg-gray-950 text-white" : "text-gray-700 hover:bg-gray-100"
              }`
            }>
            <Icon aria-hidden="true" size={16} />
            {label}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
