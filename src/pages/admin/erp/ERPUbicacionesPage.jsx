import { useState } from "react";
import { Link, useSearchParams } from "react-router";
import { FiArrowLeft, FiBookOpen, FiBox, FiMapPin, FiPackage, FiTruck } from "react-icons/fi";
import { useAuth } from "../../../hooks/useAuth";
import { userHasPermission } from "../../../utils/adminAccess";
import WarehouseLocationsPanel from "../../../components/admin/WarehouseLocationsPanel";
import WarehouseFairsPanel from "../../../components/admin/WarehouseFairsPanel";

const SECCIONES = [
  { id: "ferias", nombre: "Ferias", icono: FiMapPin },
  { id: "lugares", nombre: "Almacenes y destinos", icono: FiBox },
  { id: "ayuda", nombre: "Guía del proceso", icono: FiBookOpen },
];

const RECORRIDO = [
  {
    numero: "01", titulo: "Pedidos a editoriales",
    texto: "Compras solicita los libros correspondientes a las adopciones.",
    to: "/admin/erp/compras/pedidos", permiso: "purchasing.view_purchasing",
  },
  {
    numero: "02", titulo: "Recepción",
    texto: "Almacén cuenta lo recibido, separa observados y valida las guías.",
    to: "/admin/erp/almacen/recepciones", permiso: "warehouse.view_receiving",
  },
  {
    numero: "03", titulo: "Inventario",
    texto: "Muestra existencias físicas conformes y observadas, por almacén y producto.",
    to: "/admin/erp/almacen/inventario", permiso: "warehouse.view_receiving",
  },
  {
    numero: "04", titulo: "Entregas: reservar y preparar",
    texto: "Se planifica el destino, se reservan libros por lote y se verifica el conteo.",
    to: "/admin/erp/almacen/distribuciones", permiso: "warehouse.view_distribution_operations",
  },
];

function GuiaOperativa({ user, puedeVerTraslados }) {
  return (
    <section aria-labelledby="guia-operativa-titulo"
      className="space-y-4 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
      <div>
        <h2 id="guia-operativa-titulo" className="text-base font-black text-gray-950">
          ¿Qué hace cada módulo?
        </h2>
        <p className="mt-1 text-sm leading-6 text-gray-700">
          Pedir libros, recibirlos, reservarlos y trasladarlos son acciones distintas.
          Un libro preparado todavía se encuentra físicamente en el almacén de origen.
        </p>
      </div>
      <ol className="grid gap-3 sm:grid-cols-2">
        {RECORRIDO.map((etapa) => (
          <li key={etapa.numero} className="flex min-w-0 gap-3 rounded-xl border border-gray-200 bg-gray-50 p-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-gray-950 text-xs font-bold text-white">
              {etapa.numero}
            </span>
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-gray-950">{etapa.titulo}</h3>
              <p className="mt-1 text-xs leading-5 text-gray-700">{etapa.texto}</p>
              {userHasPermission(user, [etapa.permiso]) && (
                <Link to={etapa.to} className="mt-2 inline-flex min-h-9 items-center text-xs font-bold text-red-700 underline underline-offset-2">
                  Abrir módulo
                </Link>
              )}
            </div>
          </li>
        ))}
      </ol>
      <div className="grid gap-3 md:grid-cols-2">
        <div className="rounded-xl border border-gray-300 bg-gray-50 p-4">
          <h3 className="flex items-center gap-2 text-sm font-bold text-gray-950">
            <FiPackage aria-hidden="true" /> Disponible en el sistema
          </h3>
          <p className="mt-2 text-sm leading-6 text-gray-700">
            Planificar, reservar existencias conformes y confirmar el conteo físico.
            También puedes registrar una feria concreta con su ubicación independiente.
          </p>
        </div>
        <div className="rounded-xl border border-gray-300 bg-gray-50 p-4">
          <h3 className="flex items-center gap-2 text-sm font-bold text-gray-950">
            <FiTruck aria-hidden="true" /> Próxima etapa de desarrollo
          </h3>
          <p className="mt-2 text-sm leading-6 text-gray-700">
            Documento interno de salida, despacho, confirmación en destino y retornos.
            Consignación requerirá además rendición, ventas y devoluciones.
          </p>
        </div>
      </div>
      {puedeVerTraslados && (
        <p className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm leading-6 text-amber-950">
          <strong>Traslados:</strong> la función directa existente registra movimientos
          físicos ya realizados. No la uses para simular el despacho de una entrega
          reservada o preparada: ese procedimiento controlado sigue pendiente.
        </p>
      )}
    </section>
  );
}

export default function ERPUbicacionesPage() {
  const { user } = useAuth();
  const [revisionUbicaciones, setRevisionUbicaciones] = useState(0);
  const [searchParams, setSearchParams] = useSearchParams();
  const seleccion = searchParams.get("seccion");
  const actual = SECCIONES.some((seccion) => seccion.id === seleccion) ? seleccion : "ferias";
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
    <main className="mx-auto w-full min-w-0 max-w-6xl space-y-3">
      <header className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-red-700">ERP · Almacén</p>
            <h1 className="mt-1 text-xl font-black text-gray-950">Ubicaciones y ferias</h1>
            <p className="mt-1 text-sm text-gray-600">
              Registra destinos de mercadería sin afectar existencias.
            </p>
          </div>
          <Link to="/admin/erp/almacen/inventario"
            className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-gray-300 px-3 text-xs font-semibold text-gray-800 hover:text-red-700">
            <FiArrowLeft aria-hidden="true" /> Inventario
          </Link>
        </div>
        <nav aria-label="Secciones de ubicaciones"
          className="mt-4 grid grid-cols-3 gap-1 rounded-xl bg-gray-100 p-1">
          {SECCIONES.map(({ id, nombre, icono: Icono }) => (
            <button key={id} type="button" aria-pressed={actual === id}
              onClick={() => cambiarSeccion(id)}
              className={
                "flex min-h-12 min-w-0 items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-center text-xs transition sm:text-sm " +
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
          onCreated={() => setRevisionUbicaciones((n) => n + 1)}
        />
      )}

      {actual === "lugares" && (
        <section className="min-w-0 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <WarehouseLocationsPanel key={revisionUbicaciones}
            puedeGestionar={puedeGestionar}
            puedeConciliar={puedeConciliar}
            puedeVerInventario={puedeVerTraslados}
          />
        </section>
      )}

      {actual === "ayuda" && (
        <GuiaOperativa user={user} puedeVerTraslados={puedeVerTraslados} />
      )}
    </main>
  );
}
