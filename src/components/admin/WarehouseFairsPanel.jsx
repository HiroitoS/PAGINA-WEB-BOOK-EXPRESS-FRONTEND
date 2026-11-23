import { useEffect, useMemo, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { Link } from "react-router";
import { FiAlertTriangle, FiCalendar, FiMapPin, FiPlus, FiSearch, FiX } from "react-icons/fi";
import { listarFeriasAlmacen, listarUbicacionesAlmacen, registrarFeriaAlmacen } from "../../api/warehouseApi";

const inputClass = "mt-1 min-h-11 w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-950 focus:border-red-700 focus:outline-none focus:ring-2 focus:ring-red-100";

function nuevoFormulario() {
  return {
    idempotency_key: crypto.randomUUID(),
    name: "", venue_name: "", venue_address: "",
    starts_on: "", ends_on: "", responsible_name: "", notes: "",
  };
}

function leerError(error) {
  if (!error?.response) return "No pudimos conectar con el servidor. Vuelve a intentarlo.";
  if (error.response.status === 403) return "No tienes autorización para registrar ferias.";
  const fields = error.response.data ?? {};
  const first = Object.values(fields).find((item) => typeof item === "string" || Array.isArray(item));
  return (Array.isArray(first) ? first[0] : first) || "Revisa los datos de la feria.";
}

export default function WarehouseFairsPanel({ puedeGestionar, onCreated }) {
  const [ferias, setFerias] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [heredadas, setHeredadas] = useState([]);
  const [guardando, setGuardando] = useState(false);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [formulario, setFormulario] = useState(nuevoFormulario);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [buscar, setBuscar] = useState("");
  const reducirMovimiento = useReducedMotion();
  const agrupadas = useMemo(() => {
    const groups = new Map();
    const term = buscar.trim().toLocaleLowerCase("es");
    for (const feria of ferias) {
      const schools = feria.schools?.length ? feria.schools : ["Sin colegio asociado todavía"];
      if (term && ![feria.name, feria.venue_name, ...schools].join(" ").toLocaleLowerCase("es").includes(term)) continue;
      // Mostrar un evento mixto una sola vez para no aparentar dos custodias.
      const groupName = schools.length > 1 ? "Ferias que requieren revisión" : schools[0];
      if (!groups.has(groupName)) groups.set(groupName, []);
      groups.get(groupName).push(feria);
    }
    return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b, "es"));
  }, [ferias, buscar]);

  useEffect(() => {
    let ignore = false;
    Promise.all([listarFeriasAlmacen(), listarUbicacionesAlmacen()]).then(([data, locations]) => {
      if (ignore) return;
      setFerias(Array.isArray(data) ? data : []);
      const all = Array.isArray(locations) ? locations : locations?.results ?? [];
      setHeredadas(all.filter((item) => item.kind === "fair" && !item.fair_event_id));
    }).catch((err) => {
      if (!ignore) setError(leerError(err));
    }).finally(() => {
      if (!ignore) setCargando(false);
    });
    return () => { ignore = true; };
  }, []);

  function abrirFormulario() {
    setFormulario(nuevoFormulario());
    setError("");
    setMensaje("");
    setMostrarFormulario(true);
  }

  function cambiar(campo, value) {
    setFormulario((previous) => ({ ...previous, [campo]: value }));
  }

  async function registrar(event) {
    event.preventDefault();
    if (!puedeGestionar || guardando) return;
    if (formulario.ends_on < formulario.starts_on) {
      setError("La fecha final no puede ser anterior a la inicial.");
      return;
    }
    setGuardando(true);
    setError("");
    setMensaje("");
    try {
      const saved = await registrarFeriaAlmacen({
        ...formulario,
        name: formulario.name.trim(),
        venue_name: formulario.venue_name.trim(),
        venue_address: formulario.venue_address.trim(),
        responsible_name: formulario.responsible_name.trim(),
        notes: formulario.notes.trim(),
      });
      setFerias((previous) => [
        saved, ...previous.filter((item) => item.id !== saved.id),
      ].sort((a, b) => b.starts_on.localeCompare(a.starts_on)));
      setMostrarFormulario(false);
      setFormulario(nuevoFormulario());
      setMensaje("Feria registrada con ubicación propia. Aún no se han movido libros.");
      onCreated?.();
    } catch (err) {
      setError(leerError(err));
    } finally {
      setGuardando(false);
    }
  }

  return (
    <section aria-labelledby="ferias-titulo" className="space-y-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 id="ferias-titulo" className="text-base font-black text-gray-950">
            Ferias registradas {!cargando && <span className="text-sm font-semibold text-gray-500">({ferias.length})</span>}
          </h2>
          <p className="mt-1 text-xs leading-5 text-gray-600">
            Las ferias se agrupan por colegio cuando ya tienen una distribución vinculada.
            Cada evento conserva su registro y existencias; agrupar no traslada libros.
          </p>
        </div>
        {puedeGestionar && !mostrarFormulario && (
          <button type="button" onClick={abrirFormulario}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-red-700 px-4 text-sm font-bold text-white hover:bg-red-800">
            <FiPlus aria-hidden="true" /> Nueva feria
          </button>
        )}
      </div>

      {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}
      {mensaje && <p role="status" className="rounded-xl border border-gray-200 bg-gray-50 p-3 text-sm font-semibold text-gray-800">{mensaje}</p>}

      {mostrarFormulario && puedeGestionar && (
        <form onSubmit={registrar} className="space-y-4 rounded-xl border border-gray-200 bg-gray-50 p-4">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-bold text-gray-950">Datos de la feria específica</h3>
            <button type="button" onClick={() => setMostrarFormulario(false)}
              className="inline-flex min-h-10 items-center gap-1 rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-800">
              <FiX aria-hidden="true" /> Cancelar
            </button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              ["name", "Nombre de la feria", "Identifica un evento concreto", 150],
              ["venue_name", "Recinto o local", "Nombre real del recinto", 180],
              ["venue_address", "Dirección del recinto", "Dirección real de la feria", 255],
              ["responsible_name", "Responsable de la mercadería", "Persona a cargo de la custodia", 180],
            ].map(([key, label, placeholder, maxLength]) => (
              <label key={key} className="block min-w-0 text-sm font-semibold text-gray-900">
                {label}
                <input required className={inputClass} maxLength={maxLength}
                  placeholder={placeholder} value={formulario[key]}
                  onChange={(event) => cambiar(key, event.target.value)} />
              </label>
            ))}
            <label className="block min-w-0 text-sm font-semibold text-gray-900">
              Fecha de inicio
              <input required type="date" className={inputClass} value={formulario.starts_on}
                onChange={(event) => cambiar("starts_on", event.target.value)} />
            </label>
            <label className="block min-w-0 text-sm font-semibold text-gray-900">
              Fecha de finalización
              <input required type="date" min={formulario.starts_on || undefined}
                className={inputClass} value={formulario.ends_on}
                onChange={(event) => cambiar("ends_on", event.target.value)} />
            </label>
          </div>
          <details className="rounded-lg border border-gray-200 bg-white p-3">
            <summary className="cursor-pointer text-sm font-semibold text-gray-900">
              Observaciones (opcional)
            </summary>
            <textarea aria-label="Observaciones de la feria" rows={2} maxLength={500}
              className={inputClass} value={formulario.notes}
              onChange={(event) => cambiar("notes", event.target.value)} />
          </details>
          <p className="text-xs leading-5 text-gray-700">
            Se creará una ubicación interna exclusiva de esta feria. No se le asignará
            mercadería automáticamente ni se emitirá documentación SUNAT.
          </p>
          <button type="submit" disabled={guardando}
            className="min-h-11 rounded-xl bg-red-700 px-5 text-sm font-bold text-white hover:bg-red-800 disabled:opacity-50">
            {guardando ? "Registrando…" : "Registrar feria y su ubicación"}
          </button>
        </form>
      )}

      {cargando && <p role="status" className="text-sm text-gray-600">Consultando ferias…</p>}
      {!cargando && ferias.length === 0 && !error && (
        <p className="rounded-xl border border-dashed border-gray-300 p-4 text-sm text-gray-600">
          Aún no existen ferias identificadas por evento. Las ubicaciones genéricas
          antiguas se mantienen hasta que se concilien sus existencias.
        </p>
      )}
      {ferias.length > 0 && (
        <div className="space-y-4">
          <label className="relative block text-sm font-bold text-gray-800">
            <span className="mb-2 block">Buscar por colegio o feria</span>
            <FiSearch aria-hidden="true" className="pointer-events-none absolute bottom-3.5 left-3 text-gray-500" />
            <input type="search" value={buscar}
              onChange={(event) => setBuscar(event.target.value)}
              maxLength={100} placeholder="Colegio, feria o recinto"
              className={inputClass + " pl-10"} />
          </label>
          {agrupadas.length === 0 && (
            <p className="rounded-xl bg-gray-50 p-4 text-sm text-gray-600">
              No hay ferias que coincidan con la búsqueda.
            </p>
          )}
          {agrupadas.map(([colegio, eventos]) => (
            <motion.section key={colegio} aria-label={`Ferias de ${colegio}`}
              initial={reducirMovimiento ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.18 }}
              className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-200 bg-gray-50 px-4 py-3">
                <div>
                  <h3 className="text-sm font-black text-gray-950">{colegio}</h3>
                  <p className="mt-0.5 text-xs text-gray-600">
                    {eventos.length} {eventos.length === 1 ? "feria registrada" : "ferias registradas"}
                  </p>
                </div>
                <span className="rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-semibold text-gray-700">
                  Agrupación por colegio
                </span>
              </div>
              <div className="divide-y divide-gray-100">
                {eventos.map((feria) => (
                  <article key={feria.id} className="grid gap-3 p-4 sm:grid-cols-2">
                    <div className="min-w-0">
                      <h4 className="text-sm font-bold text-gray-950">{feria.name}</h4>
                      <p className="mt-1 flex items-start gap-2 text-xs leading-5 text-gray-700">
                        <FiMapPin aria-hidden="true" className="mt-0.5 shrink-0" />
                        <span>{feria.venue_name} · {feria.venue_address}</span>
                      </p>
                      {feria.school_conflict && (
                        <p role="alert" className="mt-2 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-2 text-xs text-red-800">
                          <FiAlertTriangle aria-hidden="true" className="mt-0.5 shrink-0" />
                          Entregas de colegios distintos: {feria.schools.join(", ")}.
                          Conciliar antes de nuevos movimientos.
                        </p>
                      )}
                    </div>
                    <div className="min-w-0 space-y-1 text-xs text-gray-700 sm:text-right">
                      <p className="inline-flex items-center gap-1.5 sm:justify-end">
                        <FiCalendar aria-hidden="true" />
                        {feria.starts_on.split("-").reverse().join("/")} – {feria.ends_on.split("-").reverse().join("/")}
                      </p>
                      <p>Responsable: <strong>{feria.responsible_name}</strong></p>
                      <p className="text-gray-500">Custodia registrada: {feria.location_name}</p>
                    </div>
                  </article>
                ))}
              </div>
            </motion.section>
          ))}
        </div>
      )}

      {heredadas.length > 0 && (
        <details className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <summary className="cursor-pointer text-sm font-black text-amber-950">
            Ubicaciones de feria anteriores por revisar ({heredadas.length})
          </summary>
          <p className="mt-2 text-xs leading-5 text-amber-900">
            Estas ubicaciones figuran como ferias, pero no tienen un evento asociado.
            Pueden conservar libros reales: no se fusionan ni se les asigna un colegio
            automáticamente. Jefatura debe comprobar su custodia antes de reorganizarlas.
          </p>
          <div className="mt-3 space-y-2">
            {heredadas.map((item) => (
              <div key={item.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-white px-3 py-2">
                <p className="text-xs font-bold text-gray-900">{item.name}</p>
                <span className="text-xs text-gray-600">{item.is_active ? "Activa" : "Inactiva"}</span>
              </div>
            ))}
          </div>
          <Link to="/admin/erp/almacen/stock-por-almacen"
            className="mt-3 inline-flex min-h-10 items-center rounded-lg border border-amber-300 bg-white px-3 text-xs font-bold text-amber-950 hover:border-amber-500">
            Ver existencias por ubicación
          </Link>
        </details>
      )}
      <p className="rounded-xl bg-gray-50 p-3 text-xs leading-5 text-gray-700">
        Siguiente paso: elegir la feria como destino en
        {" "}<Link to="/admin/erp/almacen/distribuciones" className="font-bold text-red-700 underline underline-offset-2">
          Distribuciones
        </Link>. El almacén principal prepara y despacha; el responsable de la feria
        confirma el conteo al recibir. La guía tributaria exigible se gestiona aparte.
      </p>
    </section>
  );
}
