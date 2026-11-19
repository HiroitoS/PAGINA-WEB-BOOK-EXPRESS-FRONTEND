import { NavLink } from "react-router";
import { FiClock, FiGift, FiTruck, FiPackage } from "react-icons/fi";

const tabs = [
  { label: "Distribuciones", to: "/admin/erp/almacen/distribuciones", icon: FiPackage, detalle: "Planificar entregas, reservar, preparar, despachar y confirmar recepción" },
  { label: "Traslados directos", to: "/admin/erp/almacen/traslados", icon: FiTruck, detalle: "Movimiento físico directo ya realizado, independiente de las entregas planificadas" },
  { label: "Cortesías", to: "/admin/erp/almacen/cortesias", icon: FiGift, detalle: "Registrar entregas sin venta" },
  { label: "Historial", to: "/admin/erp/almacen/historial-traslados", icon: FiClock, detalle: "Consultar movimientos registrados" },
];

export default function WarehouseMovementTabs() {
  return (
    <nav aria-label="Opciones de movimientos"
      className="grid min-w-0 grid-cols-4 gap-1 rounded-xl bg-gray-100 p-1">
      {tabs.map(({ label, to, icon: Icon, detalle }) => (
        <NavLink key={to} to={to} title={detalle}
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
