import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import { FiArrowLeft, FiCheck, FiLock, FiRefreshCw, FiSave, FiShield, FiSearch } from "react-icons/fi";
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

const labelClass = "flex min-h-16 cursor-pointer items-start gap-3 rounded-lg border border-gray-200 bg-white px-3 py-3 transition hover:border-red-300 hover:bg-red-50/40 focus-within:ring-2 focus-within:ring-red-100";
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
  const [category, setCategory] = useState("Almacén");
  const [permissionSearch, setPermissionSearch] = useState("");
  const [onlySelected, setOnlySelected] = useState(false);

  const role = roles.find((item) => String(item.id) === roleId);
  const isProtected = role?.name === "ADMINISTRADOR";
  const dirty = [...selected].sort((a, b) => a - b).join(",") !==
    [...saved].sort((a, b) => a - b).join(",");

  const byCode = useMemo(() => new Map(permisos.map((item) => [item.code, item])), [permisos]);
  const byId = useMemo(() => new Map(permisos.map((item) => [item.id, item])), [permisos]);
  const categories = useMemo(() => [...new Set(permisos.map((item) => item.category || "Otros"))], [permisos]);
  const visiblePermissions = useMemo(() => permisos.filter((item) => {
    const inCategory = category === "Todos" || (item.category || "Otros") === category;
    const inSelection = !onlySelected || selected.includes(item.id);
    const term = permissionSearch.trim().toLocaleLowerCase("es");
    const inSearch = !term || [item.label, item.description, item.category]
      .some((value) => String(value || "").toLocaleLowerCase("es").includes(term));
    return inCategory && inSelection && inSearch;
  }), [permisos, selected, category, permissionSearch, onlySelected]);

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
    setCategory(next === String(roles.find((item) => item.name === "ALMACEN")?.id) ||
      next === String(roles.find((item) => item.name === "JEFE_ALMACEN")?.id) ? "Almacén" : "Todos");
    setPermissionSearch("");
    setOnlySelected(false);
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
    <main className="mx-auto w-full max-w-6xl space-y-3 pb-8">
      <header className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-gray-950 px-4 py-4 text-white shadow-sm sm:px-5">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-red-400">Seguridad y accesos</p>
          <h1 className="mt-0.5 text-xl font-black tracking-tight sm:text-2xl">Roles y permisos</h1>
          <p className="mt-1 text-xs text-gray-300 sm:text-sm">
            Define las capacidades de cada equipo. Los cambios se aplican a todos los usuarios del rol.
          </p>
        </div>
        <Link to="/admin/usuarios"
          className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-gray-600 px-3 text-xs font-bold text-white hover:bg-gray-800 focus-visible:outline-2 focus-visible:outline-white">
          <FiArrowLeft aria-hidden="true" /> Usuarios
        </Link>
      </header>

      {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>}
      {message && <p role="status" className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-900">{message}</p>}
      {loading ? (
        <p role="status" className="rounded-xl border border-gray-200 bg-white p-4 text-sm text-gray-700">Consultando roles y permisos…</p>
      ) : roles.length === 0 ? (
        <p role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          No encontramos roles configurados. Consulta al administrador del sistema.
        </p>
      ) : (
        <>
          <section aria-labelledby="roles-title" className="rounded-xl border border-gray-200 bg-white p-3 sm:p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 id="roles-title" className="text-sm font-black text-gray-950">Selecciona el rol</h2>
                <p className="mt-0.5 text-xs text-gray-600">Elige un cargo para consultar o modificar sus permisos.</p>
              </div>
              <button type="button" onClick={() => {
                if (!dirty || window.confirm("¿Descartar cambios sin guardar y actualizar los roles?")) {
                  setLoading(true);
                  setVersion((v) => v + 1);
                }
              }} className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-gray-200 px-3 text-xs font-bold text-gray-800 hover:border-red-300">
                <FiRefreshCw aria-hidden="true" /> Actualizar
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-4" role="radiogroup" aria-label="Rol para administrar">
              {roles.map((item) => {
                const active = roleId === String(item.id);
                const count = item.functional_permissions?.length || 0;
                return (
                  <label key={item.id}
                    className={`flex min-h-12 cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 transition focus-within:ring-2 focus-within:ring-red-100 ${active
                      ? "border-red-600 bg-red-50 text-red-900"
                      : "border-gray-200 bg-white text-gray-800 hover:border-gray-400"}`}>
                    <input type="radio" className="h-4 w-4 shrink-0 accent-red-700" name="role-choice"
                      checked={active} onChange={() => selectRole(String(item.id))} />
                    <span className="min-w-0 flex-1">
                      <span className="block text-xs font-black leading-5">{item.name.replaceAll("_", " ")}</span>
                      <span className="block text-xs text-gray-600">{count} permisos</span>
                    </span>
                  </label>
                );
              })}
            </div>
          </section>

          <section aria-labelledby="permissions-title" className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 px-3 py-3 sm:px-4">
              <div className="min-w-0">
                <h2 id="permissions-title" className="text-base font-black text-gray-950">
                  {role?.name.replaceAll("_", " ") || "Permisos"}
                </h2>
                <p className="mt-0.5 text-xs text-gray-600">{descriptions[role?.name] || "Permisos asignados al rol."}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="rounded-lg bg-gray-100 px-2.5 py-1.5 text-xs font-bold text-gray-800">
                  {selected.length} activos
                </span>
                <button type="button" onClick={saveRole} disabled={!dirty || saving || isProtected}
                  className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-red-700 px-3 text-xs font-bold text-white transition hover:bg-red-800 disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-500">
                  {saving ? <FiRefreshCw aria-hidden="true" className="animate-spin" /> : <FiSave aria-hidden="true" />}
                  Guardar cambios
                </button>
              </div>
            </div>

            <div className="space-y-3 px-3 py-3 sm:px-4">
              {isProtected ? (
                <p className="flex items-start gap-2 rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm text-gray-700">
                  <FiLock aria-hidden="true" className="mt-0.5 shrink-0" />
                  El rol Administrador mantiene acceso total y no se modifica desde esta pantalla.
                </p>
              ) : (
                <p className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-950">
                  <FiShield aria-hidden="true" className="mt-0.5 shrink-0" />
                  En Recepción, quien registra no puede aprobar su propia recepción, aunque tenga ambos permisos.
                </p>
              )}

              <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filtrar por área">
                {["Todos", ...categories].map((item) => {
                  const count = permisos.filter((permission) => (
                    item === "Todos" || (permission.category || "Otros") === item
                  ) && selected.includes(permission.id)).length;
                  return (
                    <button key={item} type="button" aria-pressed={category === item}
                      onClick={() => { setCategory(item); setPermissionSearch(""); }}
                      className={`min-h-9 rounded-lg border px-3 text-xs font-bold transition ${category === item
                        ? "border-gray-950 bg-gray-950 text-white"
                        : "border-gray-200 bg-gray-50 text-gray-700 hover:border-red-300"}`}>
                      {item} <span className="opacity-75">({count})</span>
                    </button>
                  );
                })}
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <label className="relative min-w-0 flex-1 basis-56">
                  <span className="sr-only">Buscar permisos por nombre o descripción</span>
                  <FiSearch aria-hidden="true" className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                  <input type="search" value={permissionSearch} onChange={(event) => setPermissionSearch(event.target.value)}
                    placeholder="Buscar permiso o función…"
                    className="min-h-10 w-full rounded-lg border border-gray-300 bg-white pl-9 pr-3 text-sm text-gray-900 focus:border-red-700 focus:outline-none focus:ring-2 focus:ring-red-100" />
                </label>
                <label className="flex min-h-10 cursor-pointer items-center gap-2 rounded-lg border border-gray-200 px-3 text-xs font-bold text-gray-700">
                  <input type="checkbox" checked={onlySelected} onChange={(event) => setOnlySelected(event.target.checked)}
                    className="h-4 w-4 accent-red-700" />
                  Solo activos
                </label>
              </div>

              <p className="text-xs text-gray-500">
                {visiblePermissions.length} permiso(s) mostrados · Al marcar una capacidad se incluyen sus requisitos.
              </p>
              {visiblePermissions.length > 0 ? (
                <div className="grid gap-2 sm:grid-cols-2">
                  {visiblePermissions.map((item) => {
                    const enabled = selected.includes(item.id);
                    return (
                      <label key={item.code} className={`${labelClass} ${enabled ? "border-red-200 bg-red-50/30" : ""}`}>
                        <input type="checkbox" checked={enabled} disabled={saving || isProtected}
                          onChange={() => toggle(item.code)}
                          className="mt-1 h-4 w-4 shrink-0 accent-red-700" />
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-bold leading-5 text-gray-950">{item.label}</span>
                          <span className="mt-1 block text-xs leading-5 text-gray-600">{item.description}</span>
                        </span>
                      </label>
                    );
                  })}
                </div>
              ) : (
                <p role="status" className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-5 text-center text-sm text-gray-600">
                  No hay permisos con los filtros seleccionados.
                </p>
              )}

              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-gray-200 pt-3">
                <p role="status" className={`text-xs font-semibold ${dirty ? "text-amber-800" : "text-gray-600"}`}>
                  {dirty ? "Cambios pendientes de guardar" : "Sin modificaciones pendientes"}
                </p>
                <button type="button" onClick={saveRole} disabled={!dirty || saving || isProtected}
                  className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-red-700 px-4 text-xs font-bold text-white hover:bg-red-800 disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-500">
                  <FiSave aria-hidden="true" /> Guardar permisos del rol
                </button>
              </div>
            </div>
          </section>

          <details className="rounded-xl border border-gray-200 bg-white p-3 sm:p-4">
            <summary className="flex cursor-pointer items-center gap-2 text-sm font-black text-gray-950">
              <FiLock aria-hidden="true" /> Historial de cambios ({history.length})
            </summary>
            {history.length === 0 ? (
              <p className="mt-3 text-sm text-gray-600">Todavía no hay cambios registrados para este rol.</p>
            ) : (
              <ol className="mt-3 space-y-2">
                {history.map((entry) => (
                  <li key={entry.id} className="rounded-lg bg-gray-50 p-3 text-sm text-gray-700">
                    <p className="flex items-center gap-2 font-bold text-gray-950">
                      <FiCheck aria-hidden="true" /> {entry.actor} · {formatTime(entry.changed_at)}
                    </p>
                    <p className="mt-1 text-xs">
                      Antes: {entry.previous_permissions.length} permisos · Ahora: {entry.new_permissions.length}.
                    </p>
                  </li>
                ))}
              </ol>
            )}
          </details>
        </>
      )}
    </main>
  );
}
