import { NavLink } from "react-router";
import { FiClock, FiGift, FiTruck, FiPackage } from "react-icons/fi";

const tabs = [
  { label: "Entregas", to: "/admin/erp/almacen/distribuciones", icon: FiPackage },
  { label: "Traslados", to: "/admin/erp/almacen/traslados", icon: FiTruck },
  { label: "Cortesías", to: "/admin/erp/almacen/cortesias", icon: FiGift },
  { label: "Historial", to: "/admin/erp/almacen/historial-traslados", icon: FiClock },
];

export default function WarehouseMovementTabs() {
  return (
    <nav aria-label="Opciones de movimientos"
      className="grid min-w-0 grid-cols-4 gap-1 rounded-xl bg-gray-100 p-1">
      {tabs.map(({ label, to, icon: Icon }) => (
        <NavLink key={to} to={to} title={label}
          className={({ isActive }) =>
            `inline-flex min-h-11 min-w-0 items-center justify-center gap-1.5 rounded-lg px-2 text-xs font-bold transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-700 sm:px-4 sm:text-sm ${
              isActive
                ? "bg-white text-red-700 shadow-sm ring-1 ring-gray-200"
                : "text-gray-700 hover:bg-white/70 hover:text-gray-950"
            }`
          }>
          <Icon className="hidden shrink-0 sm:block" aria-hidden="true" size={16} />
          <span className="truncate">{label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
