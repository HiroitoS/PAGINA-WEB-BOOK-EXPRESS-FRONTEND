import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import { FiArrowLeft, FiCheck, FiLock, FiRefreshCw, FiSave, FiShield } from "react-icons/fi";
import {
  getAdminFunctionalPermissions,
  getAdminRolePermissionHistory,
  getAdminRoles,
  updateAdminRolePermissions,
} from "../../api/adminApi";

const ROLE_NAMES = new Set([
  "ADMINISTRADOR", "CATALOGO", "ATENCION",
  "ASESOR_COMERCIAL", "JEFE_COMERCIAL", "ALMACEN", "JEFE_ALMACEN",
]);

const descriptions = {
  ADMINISTRADOR: "Acceso total. Sus permisos base no se modifican aquí.",
  CATALOGO: "Productos, editoriales, precios y cargas masivas.",
  ATENCION: "Solicitudes y seguimiento de clientes.",
  ASESOR_COMERCIAL: "Trabajo comercial y seguimiento de sus colegios.",
  JEFE_COMERCIAL: "Supervisión del equipo comercial.",
  ALMACEN: "Registro físico y movimientos autorizados de mercadería.",
  JEFE_ALMACEN: "Supervisión, devoluciones y aprobación de recepciones.",
};

const labelClass = "flex cursor-pointer items-start gap-3 rounded-xl border border-gray-200 bg-white p-3 transition hover:border-red-200 hover:bg-red-50/30";
const formatTime = (value) => value
  ? new Date(value).toLocaleString("es-PE", { dateStyle: "short", timeStyle: "short" })
  : "Sin fecha";

function getResults(payload) {
  if (Array.isArray(payload)) return payload;
  return Array.isArray(payload?.results) ? payload.results : [];
}

function getError(error) {
  const data = error?.response?.data;
  const field = data?.functional_permission_ids;
  if (Array.isArray(field)) return field.join(" ");
  if (typeof data?.detail === "string") return data.detail;
  if (error?.response?.status === 403) return "No tienes autorización para gestionar los permisos.";
  return "No se pudieron guardar los cambios. Comprueba tu conexión e inténtalo nuevamente.";
}

export default function RolePermissionsPage() {
  const [roles, setRoles] = useState([]);
  const [permisos, setPermisos] = useState([]);
  const [roleId, setRoleId] = useState("");
  const [selected, setSelected] = useState([]);
  const [saved, setSaved] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [version, setVersion] = useState(0);

  const role = roles.find((item) => String(item.id) === roleId);
  const isProtected = role?.name === "ADMINISTRADOR";
  const dirty = [...selected].sort((a, b) => a - b).join(",") !==
    [...saved].sort((a, b) => a - b).join(",");

  const byCode = useMemo(() => new Map(permisos.map((item) => [item.code, item])), [permisos]);
  const byId = useMemo(() => new Map(permisos.map((item) => [item.id, item])), [permisos]);
  const byCategory = useMemo(() => {
    const groups = new Map();
    for (const item of permisos) {
      const category = item.category || "Otros";
      if (!groups.has(category)) groups.set(category, []);
      groups.get(category).push(item);
    }
    return [...groups.entries()];
  }, [permisos]);

  useEffect(() => {
    let ignore = false;
    Promise.all([getAdminRoles(), getAdminFunctionalPermissions()]).then(([roleData, permissionData]) => {
      if (ignore) return;
      const result = getResults(roleData).filter((item) => ROLE_NAMES.has(item.name));
      const available = getResults(permissionData);
      setRoles(result);
      setPermisos(available);
      setRoleId((current) => (
        result.some((item) => String(item.id) === current)
          ? current
          : String(result.find((item) => item.name === "ALMACEN")?.id ?? result[0]?.id ?? "")
      ));
      setError("");
    }).catch((err) => {
      if (!ignore) setError(getError(err));
    }).finally(() => {
      if (!ignore) setLoading(false);
    });
    return () => { ignore = true; };
  }, [version]);

  useEffect(() => {
    const activeRole = roles.find((item) => String(item.id) === roleId);
    if (!activeRole) return;
    const codes = new Set(activeRole.functional_permissions || []);
    const currentIds = permisos.filter((item) => codes.has(item.code)).map((item) => item.id);
    // Las selecciones se rehidratan del rol confirmado, no de una lista de ejemplo.
    Promise.resolve().then(() => {
      setSelected(currentIds);
      setSaved(currentIds);
    });
  }, [roleId, roles, permisos]);

  useEffect(() => {
    if (!roleId) return;
    let ignore = false;
    getAdminRolePermissionHistory(roleId).then((data) => {
      if (!ignore) setHistory(getResults(data));
    }).catch(() => {
      if (!ignore) setHistory([]);
    });
    return () => { ignore = true; };
  }, [roleId, version]);

  function selectRole(next) {
    if (dirty && !window.confirm("Hay cambios sin guardar. ¿Cambiar de rol y descartarlos?")) return;
    setRoleId(next);
    setError("");
    setMessage("");
  }

  function toggle(code) {
    if (saving || isProtected) return;
    const item = byCode.get(code);
    if (!item) return;
    const ids = new Set(selected);
    if (ids.has(item.id)) {
      ids.delete(item.id);
      // Al quitar una capacidad, se retiran los permisos que dependan de ella.
      let updated = true;
      while (updated) {
        updated = false;
        for (const permissionId of [...ids]) {
          const permission = byId.get(permissionId);
          if ((permission?.requires || []).some((need) => !ids.has(byCode.get(need)?.id))) {
            ids.delete(permissionId);
            updated = true;
          }
        }
      }
    } else {
      const add = (permissionCode, seen = new Set()) => {
        if (seen.has(permissionCode)) return;
        seen.add(permissionCode);
        const dependency = byCode.get(permissionCode);
        if (!dependency) return;
        ids.add(dependency.id);
        (dependency.requires || []).forEach((need) => add(need, seen));
      };
      add(code);
    }
    setSelected([...ids]);
    setMessage("");
  }

  async function saveRole() {
    if (!role || !dirty || saving || isProtected) return;
    if (!window.confirm(
      `Guardar permisos del rol ${role.name}? El cambio afectará a todos sus usuarios.`
    )) return;
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const result = await updateAdminRolePermissions(role.id, selected);
      const list = result.functional_permissions || [];
      const ids = permisos.filter((item) => list.includes(item.code)).map((item) => item.id);
      setRoles((current) => current.map((item) => item.id === role.id ? result : item));
      setSaved(ids);
      setSelected(ids);
      setMessage("Permisos del rol guardados. Los usuarios deberán actualizar su sesión para ver los accesos.");
      const changes = await getAdminRolePermissionHistory(role.id);
      setHistory(getResults(changes));
    } catch (err) {
      setError(getError(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-6xl space-y-4 pb-10">
      <header className="rounded-2xl bg-gray-950 p-5 text-white shadow-sm sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-red-400">Seguridad y accesos</p>
            <h1 className="mt-1 text-2xl font-black tracking-tight sm:text-3xl">Roles y permisos</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-300">
              Configura qué puede hacer cada función. Los permisos del rol se aplican a todos los usuarios asignados.
            </p>
          </div>
          <Link to="/admin/usuarios" className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-gray-600 px-3 text-sm font-bold text-white hover:bg-gray-800">
            <FiArrowLeft aria-hidden="true" /> Volver a usuarios
          </Link>
        </div>
      </header>

      {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}
      {message && <p role="status" className="rounded-xl border border-green-200 bg-green-50 p-3 text-sm text-green-900">{message}</p>}
      {loading ? (
        <p role="status" className="rounded-xl border bg-white p-5 text-sm text-gray-700">Consultando permisos…</p>
      ) : (
        <div className="grid gap-4 lg:grid-cols-12">
          <aside className="min-w-0 space-y-3 lg:col-span-4">
            <section className="rounded-xl border border-gray-200 bg-white p-4">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-sm font-black text-gray-950">Rol principal</h2>
                <button type="button" title="Actualizar roles" onClick={() => { if (!dirty || window.confirm("¿Descartar cambios y actualizar?")) { setLoading(true); setVersion((v) => v + 1); } }}
                  className="rounded-lg border border-gray-200 p-2 text-gray-700 hover:text-red-700">
                  <FiRefreshCw aria-hidden="true" />
                </button>
              </div>
              <div className="mt-3 space-y-2" role="radiogroup" aria-label="Seleccionar rol">
                {roles.map((item) => (
                  <label key={item.id}
                    className={`flex cursor-pointer items-start gap-2 rounded-lg border p-3 text-sm ${roleId === String(item.id)
                      ? "border-red-400 bg-red-50" : "border-gray-200 hover:bg-gray-50"}`}>
                    <input type="radio" name="group-role" value={item.id} checked={roleId === String(item.id)}
                      onChange={() => selectRole(String(item.id))} className="mt-1 accent-red-700" />
                    <span className="min-w-0">
                      <strong className="block text-gray-950">{item.name.replaceAll("_", " ")}</strong>
                      <span className="mt-1 block text-xs leading-5 text-gray-600">{descriptions[item.name]}</span>
                    </span>
                  </label>
                ))}
              </div>
            </section>
            <section className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs leading-5 text-amber-950">
              <div className="flex items-center gap-2 font-black">
                <FiShield aria-hidden="true" /> Control de aprobación
              </div>
              <p className="mt-2">
                En Recepción, quien registra no puede aprobar su propio ingreso. Dar ambos permisos a un cargo
                no elimina esta restricción.
              </p>
            </section>
          </aside>

          <div className="min-w-0 space-y-4 lg:col-span-8">
            <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-gray-100 pb-4">
                <div>
                  <h2 className="text-lg font-black text-gray-950">
                    {role ? role.name.replaceAll("_", " ") : "Seleccionar rol"}
                  </h2>
                  <p className="mt-1 text-xs text-gray-600">
                    {isProtected
                      ? "El rol Administrador conserva su acceso total y no se edita."
                      : "Selecciona capacidades por área; los requisitos se agregan automáticamente."}
                  </p>
                </div>
                <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-black text-gray-800">
                  {selected.length} permisos
                </span>
              </div>
              <div className="mt-4 space-y-4">
                {byCategory.map(([category, items]) => (
                  <section key={category} className="space-y-2">
                    <h3 className="text-sm font-black text-gray-950">{category}</h3>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {items.map((item) => (
                        <label key={item.code} className={labelClass}>
                          <input type="checkbox" checked={selected.includes(item.id)}
                            onChange={() => toggle(item.code)} disabled={saving || isProtected}
                            className="mt-1 h-4 w-4 shrink-0 accent-red-700" />
                          <span className="min-w-0">
                            <strong className="block text-xs text-gray-950">{item.label}</strong>
                            <span className="mt-1 block text-xs leading-5 text-gray-600">{item.description}</span>
                          </span>
                        </label>
                      ))}
                    </div>
                  </section>
                ))}
              </div>
              <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-gray-200 pt-4">
                <p className="text-xs text-gray-600">
                  {dirty ? "Tienes cambios sin guardar." : "Permisos sincronizados con el servidor."}
                </p>
                <button type="button" onClick={saveRole} disabled={!dirty || saving || isProtected}
                  className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-red-700 px-4 text-sm font-bold text-white hover:bg-red-800 disabled:opacity-50">
                  {saving ? <FiRefreshCw className="animate-spin" aria-hidden="true" /> : <FiSave aria-hidden="true" />}
                  Guardar permisos
                </button>
              </div>
            </section>

            <details className="rounded-xl border border-gray-200 bg-white p-4">
              <summary className="flex cursor-pointer items-center gap-2 text-sm font-black text-gray-950">
                <FiLock aria-hidden="true" /> Historial de cambios ({history.length})
              </summary>
              {history.length === 0 ? (
                <p className="mt-3 text-xs text-gray-600">Todavía no hay modificaciones de permisos registradas para este rol.</p>
              ) : (
                <div className="mt-3 space-y-2">
                  {history.map((entry) => (
                    <div key={entry.id} className="rounded-lg bg-gray-50 p-3 text-xs text-gray-700">
                      <p className="flex items-center gap-2 font-bold text-gray-950">
                        <FiCheck aria-hidden="true" /> {entry.actor} · {formatTime(entry.changed_at)}
                      </p>
                      <p className="mt-1">{entry.previous_permissions.length} permisos antes → {entry.new_permissions.length} después.</p>
                    </div>
                  ))}
                </div>
              )}
            </details>
          </div>
        </div>
      )}
    </main>
  );
}
