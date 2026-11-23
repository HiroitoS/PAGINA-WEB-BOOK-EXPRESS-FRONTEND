import { useState } from "react";
import { Link, useSearchParams } from "react-router";
import { FiArrowLeft, FiBox, FiMapPin } from "react-icons/fi";
import { useAuth } from "../../../hooks/useAuth";
import { userHasPermission } from "../../../utils/adminAccess";
import WarehouseLocationsPanel from "../../../components/admin/WarehouseLocationsPanel";
import WarehouseFairsPanel from "../../../components/admin/WarehouseFairsPanel";
import WarehouseConsignmentsPanel from "../../../components/admin/WarehouseConsignmentsPanel";

const SECCIONES = [
  { id: "ferias", nombre: "Ferias · ubicaciones temporales", icono: FiMapPin },
  { id: "consignaciones", nombre: "Consignaciones", icono: FiBox },
  { id: "lugares", nombre: "Almacenes y tiendas", icono: FiBox },
];

export default function ERPUbicacionesPage() {
  const { user } = useAuth();
  const [revisionUbicaciones, setRevisionUbicaciones] = useState(0);
  const [searchParams, setSearchParams] = useSearchParams();
  const selected = searchParams.get("seccion");
  const actual = ["lugares", "consignaciones"].includes(selected) ? selected : "ferias";
  const puedeGestionar = userHasPermission(user, ["warehouse.manage_warehouse_locations"]);
  const puedeVerTraslados = userHasPermission(user, ["warehouse.view_receiving"]);
  const puedeConciliar = puedeGestionar
    && userHasPermission(user, ["warehouse.validate_receiving"])
    && puedeVerTraslados;

  function cambiarSeccion(id) {
    setSearchParams((previous) => {
      const next = new URLSearchParams(previous);
      if (id === "ferias") next.delete("seccion");
      else next.set("seccion", id);
      return next;
    });
  }

  return (
    <main className="mx-auto w-full min-w-0 max-w-5xl space-y-3">
      <header className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-red-700">ERP · Almacén</p>
            <h1 className="mt-1 text-xl font-black text-gray-950">Ubicaciones</h1>
            <p className="mt-1 text-sm text-gray-600">
              Consulta las ferias agrupadas por colegio, las consignaciones y los lugares
              de custodia sin mezclar físicamente sus existencias.
            </p>
          </div>
          <Link to="/admin/erp/almacen/inventario"
            className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-gray-300 px-3 text-xs font-semibold text-gray-800 hover:text-red-700">
            <FiArrowLeft aria-hidden="true" /> Inventario
          </Link>
        </div>
        <nav aria-label="Tipo de ubicación"
          className="mt-4 grid gap-1 rounded-xl bg-gray-100 p-1 sm:grid-cols-3">
          {SECCIONES.map(({ id, nombre, icono: Icono }) => (
            <button key={id} type="button" aria-pressed={actual === id}
              onClick={() => cambiarSeccion(id)}
              className={
                "flex min-h-11 min-w-0 items-center justify-center gap-2 rounded-lg px-3 text-center text-xs transition sm:text-sm " +
                (actual === id
                  ? "bg-white font-bold text-gray-950 shadow-sm ring-1 ring-gray-200"
                  : "font-semibold text-gray-600 hover:bg-white/75 hover:text-gray-950")
              }>
              <Icono aria-hidden="true" className="hidden shrink-0 sm:block" />
              <span className="leading-4">{nombre}</span>
            </button>
          ))}
        </nav>
      </header>

      {actual === "ferias" && (
        <WarehouseFairsPanel
          puedeGestionar={puedeGestionar}
          onCreated={() => setRevisionUbicaciones((value) => value + 1)}
        />
      )}

      {actual === "consignaciones" && <WarehouseConsignmentsPanel />}

      {actual === "lugares" && (
        <section className="min-w-0 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <WarehouseLocationsPanel key={revisionUbicaciones}
            puedeGestionar={puedeGestionar}
            puedeConciliar={puedeConciliar}
            puedeVerInventario={puedeVerTraslados}
          />
        </section>
      )}
    </main>
  );
}
