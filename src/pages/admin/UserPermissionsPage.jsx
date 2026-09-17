import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { motion } from "motion/react";
import {
  FaArrowLeft,
  FaCheckCircle,
  FaExclamationTriangle,
  FaSave,
  FaShieldAlt,
  FaSyncAlt,
  FaUser,
} from "react-icons/fa";
import {
  getAdminFunctionalPermissions,
  getAdminRoles,
  getAdminUserById,
  updateAdminUser,
} from "../../api/adminApi";

const AVAILABLE_ROLES = [
  "ADMINISTRADOR",
  "CATALOGO",
  "ATENCION",
  "ASESOR_COMERCIAL",
  "JEFE_COMERCIAL",
];

function getResults(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.results)) return data.results;
  return [];
}

function getRoleDescription(role) {
  const descriptions = {
    ADMINISTRADOR: "Acceso total a la plataforma administrativa.",
    CATALOGO: "Gestiona catálogo, precios, editoriales e importaciones.",
    ATENCION: "Gestiona solicitudes y seguimiento de clientes.",
    ASESOR_COMERCIAL: "Usa ToDo y consulta el catálogo para su trabajo comercial.",
    JEFE_COMERCIAL: "Coordina trabajo comercial, grupos y asignaciones del equipo.",
  };

  return descriptions[role] || "Rol interno del sistema.";
}

function getRoleBadgeClass(role) {
  const styles = {
    ADMINISTRADOR: "bg-red-50 text-red-700 ring-red-100",
    CATALOGO: "bg-blue-50 text-blue-700 ring-blue-100",
    ATENCION: "bg-green-50 text-green-700 ring-green-100",
    ASESOR_COMERCIAL: "bg-amber-50 text-amber-700 ring-amber-100",
    JEFE_COMERCIAL: "bg-purple-50 text-purple-700 ring-purple-100",
  };

  return styles[role] || "bg-gray-100 text-gray-700 ring-gray-200";
}

function getFriendlyError(error) {
  const backendData = error?.response?.data;

  if (backendData?.functional_permission_ids) {
    const value = backendData.functional_permission_ids;

    return Array.isArray(value)
      ? value.join(" ")
      : String(value);
  }

  if (backendData?.groups) {
    return "Selecciona un rol principal válido.";
  }

  if (backendData?.detail) {
    return String(backendData.detail);
  }

  return "No se pudo completar la acción. Revisa los datos e intenta nuevamente.";
}

function getInheritedPermissionCodes(roleId, roles) {
  const role = roles.find((item) => item.id === roleId);

  return new Set(role?.functional_permissions || []);
}

function getPermissionMap(permissions) {
  return new Map(
    permissions.map((permission) => [permission.code, permission])
  );
}

function collectRequiredPermissionIds(
  permission,
  permissionsByCode,
  inheritedCodes,
  collectedIds = new Set()
) {
  (permission.requires || []).forEach((requiredCode) => {
    if (inheritedCodes.has(requiredCode)) return;

    const requiredPermission = permissionsByCode.get(requiredCode);

    if (!requiredPermission || collectedIds.has(requiredPermission.id)) {
      return;
    }

    collectedIds.add(requiredPermission.id);

    collectRequiredPermissionIds(
      requiredPermission,
      permissionsByCode,
      inheritedCodes,
      collectedIds
    );
  });

  return collectedIds;
}

function getDependentPermissionIds(
  permissionCode,
  permissions,
  selectedDirectIds,
  inheritedCodes
) {
  const selectedIds = new Set(selectedDirectIds);
  const dependentIds = new Set();
  let changed = true;

  while (changed) {
    changed = false;

    permissions.forEach((permission) => {
      if (!selectedIds.has(permission.id)) return;
      if (dependentIds.has(permission.id)) return;

      const dependsOnRemovedPermission = (permission.requires || []).some(
        (requiredCode) => {
          if (inheritedCodes.has(requiredCode)) return false;

          const requiredPermission = permissions.find(
            (item) => item.code === requiredCode
          );

          if (!requiredPermission) return false;

          return (
            requiredPermission.code === permissionCode ||
            dependentIds.has(requiredPermission.id)
          );
        }
      );

      if (dependsOnRemovedPermission) {
        dependentIds.add(permission.id);
        changed = true;
      }
    });
  }

  return dependentIds;
}

export default function UserPermissionsPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [roles, setRoles] = useState([]);
  const [permissions, setPermissions] = useState([]);

  const [roleId, setRoleId] = useState(null);
  const [directPermissionIds, setDirectPermissionIds] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const inheritedCodes = useMemo(
    () => getInheritedPermissionCodes(roleId, roles),
    [roleId, roles]
  );

  const permissionsByCategory = useMemo(() => {
    return permissions.reduce((groups, permission) => {
      const category = permission.category || "Otros";

      if (!groups[category]) {
        groups[category] = [];
      }

      groups[category].push(permission);
      return groups;
    }, {});
  }, [permissions]);

  const selectedRole = roles.find((role) => role.id === roleId);

  async function loadData() {
    setLoading(true);
    setError("");

    try {
      const [userData, rolesData, permissionsData] = await Promise.all([
        getAdminUserById(id),
        getAdminRoles(),
        getAdminFunctionalPermissions(),
      ]);

      const availableRoles = getResults(rolesData).filter((role) =>
        AVAILABLE_ROLES.includes(role.name)
      );

      setUser(userData);
      setRoles(availableRoles);
      setPermissions(getResults(permissionsData));

      const currentRoleId = Array.isArray(userData.groups)
        ? userData.groups[0] || null
        : null;

      setRoleId(currentRoleId);
      setDirectPermissionIds(
        Array.isArray(userData.direct_permission_ids)
          ? userData.direct_permission_ids
          : []
      );
    } catch (err) {
      setError(getFriendlyError(err));
    } finally {
      setLoading(false);
    }
  }

  function changeRole(nextRoleId) {
    const nextInheritedCodes = getInheritedPermissionCodes(
      nextRoleId,
      roles
    );

    setRoleId(nextRoleId);

    setDirectPermissionIds((current) =>
      current.filter((permissionId) => {
        const permission = permissions.find(
          (item) => item.id === permissionId
        );

        return (
          permission &&
          !nextInheritedCodes.has(permission.code)
        );
      })
    );
  }

  function togglePermission(permission) {
    if (inheritedCodes.has(permission.code)) return;

    const permissionsByCode = getPermissionMap(permissions);
    const currentIds = new Set(directPermissionIds);
    const selected = currentIds.has(permission.id);

    if (selected) {
      currentIds.delete(permission.id);

      const dependentIds = getDependentPermissionIds(
        permission.code,
        permissions,
        currentIds,
        inheritedCodes
      );

      dependentIds.forEach((permissionId) => {
        currentIds.delete(permissionId);
      });
    } else {
      currentIds.add(permission.id);

      const requiredIds = collectRequiredPermissionIds(
        permission,
        permissionsByCode,
        inheritedCodes
      );

      requiredIds.forEach((permissionId) => {
        currentIds.add(permissionId);
      });
    }

    setDirectPermissionIds([...currentIds]);
  }

  async function saveAccess() {
    if (!roleId) {
      setError("Selecciona un rol principal.");
      return;
    }

    setSaving(true);
    setMessage("");
    setError("");

    try {
      const cleanPermissionIds = directPermissionIds.filter(
        (permissionId) => {
          const permission = permissions.find(
            (item) => item.id === permissionId
          );

          return (
            permission &&
            !inheritedCodes.has(permission.code)
          );
        }
      );

      const updatedUser = await updateAdminUser(id, {
        groups: [roleId],
        functional_permission_ids: cleanPermissionIds,
      });

      setUser(updatedUser);
      setDirectPermissionIds(
        Array.isArray(updatedUser.direct_permission_ids)
          ? updatedUser.direct_permission_ids
          : cleanPermissionIds
      );

      navigate("/admin/usuarios", {
        replace: true,
        state: {
          successMessage: "Accesos actualizados correctamente.",
        },
      });
    } catch (err) {
      setError(getFriendlyError(err));
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    let ignore = false;

    async function fetchInitialData() {
      setLoading(true);

      try {
        const [userData, rolesData, permissionsData] = await Promise.all([
          getAdminUserById(id),
          getAdminRoles(),
          getAdminFunctionalPermissions(),
        ]);

        if (ignore) return;

        const availableRoles = getResults(rolesData).filter((role) =>
          AVAILABLE_ROLES.includes(role.name)
        );

        setUser(userData);
        setRoles(availableRoles);
        setPermissions(getResults(permissionsData));

        setRoleId(
          Array.isArray(userData.groups)
            ? userData.groups[0] || null
            : null
        );

        setDirectPermissionIds(
          Array.isArray(userData.direct_permission_ids)
            ? userData.direct_permission_ids
            : []
        );
      } catch (err) {
        if (!ignore) {
          setError(getFriendlyError(err));
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    fetchInitialData();

    return () => {
      ignore = true;
    };
  }, [id]);

  if (loading) {
    return (
      <div className="rounded-3xl border border-gray-200 bg-white p-10 text-center text-gray-600 shadow-sm">
        Cargando accesos del usuario...
      </div>
    );
  }

  return (
    <div>
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="rounded-3xl bg-gray-950 p-6 text-white shadow-xl shadow-gray-950/10"
      >
        <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
          <div>
            <p className="text-sm font-black uppercase tracking-wide text-red-400">
              Seguridad y accesos
            </p>

            <h1 className="mt-2 text-3xl font-black">
              Gestión de acceso
            </h1>

            <p className="mt-3 max-w-3xl text-sm leading-6 text-gray-300">
              Define el rol principal y las excepciones de acceso del usuario.
              Los permisos del rol se heredan automáticamente.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              to="/admin/usuarios"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/10 px-4 py-2.5 text-sm font-bold text-white transition hover:-translate-y-0.5 hover:bg-white/15"
            >
              <FaArrowLeft className="text-xs" />
              Volver a Usuarios
            </Link>

            <button
              type="button"
              onClick={loadData}
              disabled={loading || saving}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/10 px-4 py-2.5 text-sm font-bold text-white transition hover:-translate-y-0.5 hover:bg-white/15 disabled:opacity-60"
            >
              <FaSyncAlt className={loading ? "animate-spin" : ""} />
              Actualizar
            </button>
          </div>
        </div>
      </motion.section>

      {message && (
        <div className="mt-6 flex gap-3 rounded-2xl border border-green-200 bg-green-50 p-4 text-sm font-semibold text-green-700">
          <FaCheckCircle className="mt-0.5 shrink-0" />
          <span>{message}</span>
        </div>
      )}

      {error && (
        <div className="mt-6 flex gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
          <FaExclamationTriangle className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {user && (
        <section className="mt-6 rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-red-50 text-red-700 ring-1 ring-red-100">
                <FaUser />
              </div>

              <div>
                <p className="text-xs font-black uppercase tracking-wide text-gray-400">
                  Usuario
                </p>
                <h2 className="mt-1 text-xl font-black text-gray-950">
                  {user.username}
                </h2>
                <p className="mt-1 text-sm text-gray-500">
                  {[user.first_name, user.last_name]
                    .filter(Boolean)
                    .join(" ") || "Sin nombre registrado"}
                </p>
              </div>
            </div>

            <span
              className={
                user.is_active
                  ? "inline-flex self-start rounded-full bg-green-50 px-3 py-1 text-xs font-bold text-green-700 ring-1 ring-green-100 md:self-auto"
                  : "inline-flex self-start rounded-full bg-red-50 px-3 py-1 text-xs font-bold text-red-700 ring-1 ring-red-100 md:self-auto"
              }
            >
              {user.is_active ? "Usuario activo" : "Usuario inactivo"}
            </span>
          </div>
        </section>
      )}

      <section className="mt-6 rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <FaShieldAlt className="mt-1 shrink-0 text-red-700" />
          <div>
            <h2 className="text-xl font-black text-gray-950">
              Rol principal
            </h2>
            <p className="mt-1 text-sm leading-6 text-gray-600">
              El rol representa la función principal de la persona dentro de
              Book Express y define sus permisos base.
            </p>
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {roles.map((role) => (
            <label
              key={role.id}
              className={`cursor-pointer rounded-2xl border p-4 transition ${
                roleId === role.id
                  ? "border-red-200 bg-red-50 ring-2 ring-red-100"
                  : "border-gray-200 bg-gray-50 hover:bg-gray-100"
              }`}
            >
              <div className="flex gap-3">
                <input
                  type="radio"
                  name="primary-role"
                  checked={roleId === role.id}
                  onChange={() => changeRole(role.id)}
                  className="mt-1 h-4 w-4"
                />

                <div>
                  <span
                    className={`inline-flex rounded-full px-3 py-1 text-xs font-black ring-1 ${getRoleBadgeClass(
                      role.name
                    )}`}
                  >
                    {role.name}
                  </span>

                  <p className="mt-2 text-xs leading-5 text-gray-500">
                    {getRoleDescription(role.name)}
                  </p>
                </div>
              </div>
            </label>
          ))}
        </div>
      </section>

      <section className="mt-6 rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
        <div>
          <h2 className="text-xl font-black text-gray-950">
            Permisos incluidos por el rol
          </h2>
          <p className="mt-1 text-sm leading-6 text-gray-600">
            Estos permisos se asignan automáticamente al rol seleccionado.
          </p>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {inheritedCodes.size === 0 ? (
            <span className="text-sm text-gray-500">
              Selecciona un rol para consultar sus permisos.
            </span>
          ) : (
            permissions
              .filter((permission) =>
                inheritedCodes.has(permission.code)
              )
              .map((permission) => (
                <span
                  key={permission.code}
                  className="inline-flex items-center gap-2 rounded-full bg-green-50 px-3 py-2 text-xs font-bold text-green-700 ring-1 ring-green-100"
                >
                  <FaCheckCircle />
                  {permission.label}
                  <span className="text-green-500">Heredado</span>
                </span>
              ))
          )}
        </div>
      </section>

      <section className="mt-6 rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
        <div>
          <h2 className="text-xl font-black text-gray-950">
            Permisos adicionales
          </h2>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-gray-600">
            Asigna únicamente excepciones necesarias para el trabajo de esta
            persona. Evita ampliar accesos sin una necesidad funcional.
          </p>
        </div>

        <div className="mt-5 space-y-5">
          {Object.entries(permissionsByCategory).map(
            ([category, categoryPermissions]) => (
              <div
                key={category}
                className="rounded-2xl border border-gray-200 bg-gray-50 p-4"
              >
                <h3 className="font-black text-gray-950">
                  {category}
                </h3>

                <div className="mt-3 grid gap-3 lg:grid-cols-2">
                  {categoryPermissions.map((permission) => {
                    const inherited = inheritedCodes.has(
                      permission.code
                    );
                    const checked =
                      inherited ||
                      directPermissionIds.includes(permission.id);

                    return (
                      <label
                        key={permission.code}
                        className={`flex gap-3 rounded-2xl border p-4 transition ${
                          inherited
                            ? "cursor-default border-green-100 bg-green-50"
                            : "cursor-pointer border-gray-200 bg-white hover:bg-gray-50"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          disabled={inherited}
                          onChange={() => togglePermission(permission)}
                          className="mt-1 h-4 w-4"
                        />

                        <span className="min-w-0">
                          <span className="flex flex-wrap items-center gap-2">
                            <span className="text-sm font-black text-gray-950">
                              {permission.label}
                            </span>

                            {inherited && (
                              <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-black text-green-700 ring-1 ring-green-100">
                                Heredado
                              </span>
                            )}
                          </span>

                          <span className="mt-1 block text-xs leading-5 text-gray-500">
                            {permission.description}
                          </span>
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )
          )}
        </div>

        <div className="mt-6 flex flex-col gap-3 border-t border-gray-200 pt-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs leading-5 text-gray-500">
            Rol actual:{" "}
            <span className="font-black text-gray-700">
              {selectedRole?.name || "Sin rol"}
            </span>
            {" · "}
            Permisos adicionales:{" "}
            <span className="font-black text-gray-700">
              {directPermissionIds.length}
            </span>
          </p>

          <button
            type="button"
            onClick={saveAccess}
            disabled={saving || !roleId}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-700 px-5 py-3 text-sm font-black text-white transition hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <FaSave />
            {saving ? "Guardando..." : "Guardar accesos"}
          </button>
        </div>
      </section>
    </div>
  );
}
