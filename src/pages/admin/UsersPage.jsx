import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import { motion } from "motion/react";
import {
  FaArrowLeft,
  FaCheckCircle,
  FaEye,
  FaEyeSlash,
  FaExclamationTriangle,
  FaKey,
  FaPen,
  FaSave,
  FaSearch,
  FaShieldAlt,
  FaSyncAlt,
  FaTimes,
  FaUserCheck,
  FaUserPlus,
  FaUserSlash,
  FaUsers,
} from "react-icons/fa";
import {
  changeAdminUserPassword,
  createAdminUser,
  getAdminRoles,
  getAdminUsers,
  updateAdminUser,
} from "../../api/adminApi";

const AVAILABLE_ROLES = [
  "ADMINISTRADOR",
  "CATALOGO",
  "ATENCION",
  "ASESOR_COMERCIAL",
  "JEFE_COMERCIAL",
];

const EMPTY_FORM = {
  username: "",
  email: "",
  first_name: "",
  last_name: "",
  password: "",
  is_active: true,
  groups: [],
};

function getResults(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.results)) return data.results;

  return [];
}

function formatDate(value) {
  if (!value) return "Sin acceso";

  try {
    return new Intl.DateTimeFormat("es-PE", {
      dateStyle: "short",
      timeStyle: "short",
    }).format(new Date(value));
  } catch {
    return "Sin acceso";
  }
}

function getRoleBadgeClass(role) {
  if (role === "ADMINISTRADOR") {
    return "bg-red-50 text-red-700 ring-red-100";
  }

  if (role === "CATALOGO") {
    return "bg-blue-50 text-blue-700 ring-blue-100";
  }

  if (role === "ATENCION") {
    return "bg-green-50 text-green-700 ring-green-100";
  }

  if (role === "ASESOR_COMERCIAL") {
    return "bg-amber-50 text-amber-700 ring-amber-100";
  }

  if (role === "JEFE_COMERCIAL") {
    return "bg-purple-50 text-purple-700 ring-purple-100";
  }

  return "bg-gray-100 text-gray-700 ring-gray-200";
}

function getRoleDescription(role) {
  if (role === "ADMINISTRADOR") {
    return "Acceso total al panel administrativo.";
  }

  if (role === "CATALOGO") {
    return "Gestiona productos, precios, editoriales e importaciones.";
  }

  if (role === "ATENCION") {
    return "Gestiona solicitudes y seguimiento de clientes.";
  }

  if (role === "ASESOR_COMERCIAL") {
    return "Usa ToDo y consulta el catálogo para su trabajo comercial.";
  }

  if (role === "JEFE_COMERCIAL") {
    return "Coordina trabajo comercial, grupos y asignaciones del equipo.";
  }

  return "Rol interno del sistema.";
}

function getFriendlyError(error) {
  const backendData = error?.response?.data;

  if (!backendData) {
    return "No se pudo completar la acción. Revisa los datos e intenta nuevamente.";
  }

  if (backendData?.username) {
    return "El usuario ingresado no es válido o ya existe.";
  }

  if (backendData?.password) {
    return "La contraseña no cumple los requisitos mínimos.";
  }

  if (backendData?.groups) {
    return "Selecciona un rol válido para el usuario.";
  }

  if (backendData?.detail) {
    return String(backendData.detail);
  }

  return "No se pudo guardar la información. Revisa los campos ingresados.";
}

function getFullName(user) {
  return [user.first_name, user.last_name].filter(Boolean).join(" ");
}

function getActiveUsersCount(users) {
  return users.filter((user) => user.is_active).length;
}

function getInactiveUsersCount(users) {
  return users.filter((user) => !user.is_active).length;
}

function getUsersWithoutRoleCount(users) {
  return users.filter((user) => (user.group_names || []).length === 0).length;
}

export default function UsersPage() {
  const location = useLocation();
  const navigate = useNavigate();

  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);

  const [form, setForm] = useState(EMPTY_FORM);
  const [editingUser, setEditingUser] = useState(null);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);

  const [passwordUser, setPasswordUser] = useState(null);
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showFormPassword, setShowFormPassword] = useState(false);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [roleFilter, setRoleFilter] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [message, setMessage] = useState(
    () => location.state?.successMessage || ""
  );
  const [error, setError] = useState("");

  const activeUsers = getActiveUsersCount(users);
  const inactiveUsers = getInactiveUsersCount(users);
  const usersWithoutRole = getUsersWithoutRoleCount(users);

  const filteredUsers = useMemo(() => {
    const term = search.trim().toLowerCase();

    return users.filter((user) => {
      const matchesSearch =
        !term ||
        [
          user.username,
          user.email,
          user.first_name,
          user.last_name,
          ...(user.group_names || []),
        ].some((value) => String(value || "").toLowerCase().includes(term));

      const matchesStatus =
        !statusFilter ||
        (statusFilter === "active" && user.is_active) ||
        (statusFilter === "inactive" && !user.is_active);

      const matchesRole =
        !roleFilter || (user.group_names || []).includes(roleFilter);

      return matchesSearch && matchesStatus && matchesRole;
    });
  }, [users, search, statusFilter, roleFilter]);

  async function loadData() {
    setLoading(true);
    setError("");

    try {
      const [usersData, rolesData] = await Promise.all([
        getAdminUsers(),
        getAdminRoles(),
      ]);

      setUsers(getResults(usersData));

      const availableRoles = getResults(rolesData).filter((role) =>
        AVAILABLE_ROLES.includes(role.name)
      );

      setRoles(availableRoles);
    } catch (err) {
      setError(getFriendlyError(err));
    } finally {
      setLoading(false);
    }
  }

  function updateField(field, value) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function toggleRole(roleId) {
    setForm((current) => ({
      ...current,
      groups: current.groups?.[0] === roleId ? [] : [roleId],
    }));
  }

  function openCreateModal() {
    setForm(EMPTY_FORM);
    setEditingUser(null);
    setShowFormPassword(false);
    setMessage("");
    setError("");
    setIsUserModalOpen(true);
  }

  function openEditModal(user) {
    setEditingUser(user);

    setForm({
      username: user.username || "",
      email: user.email || "",
      first_name: user.first_name || "",
      last_name: user.last_name || "",
      password: "",
      is_active: Boolean(user.is_active),
      groups: Array.isArray(user.groups) ? user.groups.slice(0, 1) : [],
    });

    setShowFormPassword(false);
    setMessage("");
    setError("");
    setIsUserModalOpen(true);
  }

  function closeUserModal() {
    setForm(EMPTY_FORM);
    setEditingUser(null);
    setShowFormPassword(false);
    setIsUserModalOpen(false);
  }

  async function submitForm(event) {
    event.preventDefault();

    if (!form.username.trim()) {
      setError("Ingresa el nombre de usuario.");
      return;
    }

    if (!editingUser && form.password.trim().length < 8) {
      setError("La contraseña debe tener mínimo 8 caracteres.");
      return;
    }

    if ((form.groups || []).length === 0) {
      setError("Selecciona al menos un rol para el usuario.");
      return;
    }

    setSaving(true);
    setMessage("");
    setError("");

    try {
      const payload = {
        username: form.username.trim(),
        email: form.email.trim(),
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        is_active: form.is_active,
        groups: form.groups,
      };

      if (!editingUser) {
        payload.password = form.password;
      }

      if (editingUser) {
        await updateAdminUser(editingUser.id, payload);
        setMessage("Usuario actualizado correctamente.");
      } else {
        await createAdminUser(payload);
        setMessage("Usuario creado correctamente.");
      }

      closeUserModal();
      await loadData();
    } catch (err) {
      setError(getFriendlyError(err));
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(user) {
    setMessage("");
    setError("");

    try {
      await updateAdminUser(user.id, {
        is_active: !user.is_active,
      });

      await loadData();

      setMessage(
        user.is_active
          ? "Usuario desactivado correctamente."
          : "Usuario activado correctamente."
      );
    } catch (err) {
      setError(getFriendlyError(err));
    }
  }

  async function submitPassword(event) {
    event.preventDefault();

    if (!passwordUser) return;

    if (newPassword.trim().length < 8) {
      setError("La nueva contraseña debe tener mínimo 8 caracteres.");
      return;
    }

    setSaving(true);
    setMessage("");
    setError("");

    try {
      await changeAdminUserPassword(passwordUser.id, {
        password: newPassword,
      });

      setPasswordUser(null);
      setNewPassword("");
      setShowPassword(false);
      setMessage("Contraseña actualizada correctamente.");
    } catch (err) {
      setError(getFriendlyError(err));
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    let ignore = false;

    async function fetchInitialData() {
      try {
        const [usersData, rolesData] = await Promise.all([
          getAdminUsers(),
          getAdminRoles(),
        ]);

        if (ignore) return;

        setUsers(getResults(usersData));

        const availableRoles = getResults(rolesData).filter((role) =>
          AVAILABLE_ROLES.includes(role.name)
        );

        setRoles(availableRoles);
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
  }, []);

  useEffect(() => {
    if (!location.state?.successMessage) return;

    navigate(location.pathname, {
      replace: true,
      state: null,
    });
  }, [location.pathname, location.state, navigate]);

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

            <h1 className="mt-2 text-3xl font-black">Usuarios y roles</h1>

            <p className="mt-3 max-w-3xl text-sm leading-6 text-gray-300">
              Administra los accesos del panel interno de Book Express y asigna
              permisos según la función de cada usuario.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              to="/admin/dashboard"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/10 px-4 py-2.5 text-sm font-bold text-white transition hover:-translate-y-0.5 hover:bg-white/15"
            >
              <FaArrowLeft className="text-xs" />
              Volver al Dashboard
            </Link>

            <button
              type="button"
              onClick={loadData}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/10 px-4 py-2.5 text-sm font-bold text-white transition hover:-translate-y-0.5 hover:bg-white/15"
            >
              <FaSyncAlt className={loading ? "animate-spin" : ""} />
              Actualizar
            </button>

            <button
              type="button"
              onClick={openCreateModal}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-700 px-4 py-2.5 text-sm font-black text-white transition hover:-translate-y-0.5 hover:bg-red-800"
            >
              <FaUserPlus />
              Nuevo usuario
            </button>
          </div>
        </div>
      </motion.section>

      <section className="mt-6 grid gap-4 md:grid-cols-4">
        <SummaryCard
          icon={FaUsers}
          label="Usuarios"
          value={users.length}
          description="Cuentas registradas en el panel"
          tone="dark"
        />

        <SummaryCard
          icon={FaUserCheck}
          label="Activos"
          value={activeUsers}
          description="Usuarios habilitados para ingresar"
          tone="green"
        />

        <SummaryCard
          icon={FaUserSlash}
          label="Inactivos"
          value={inactiveUsers}
          description="Usuarios deshabilitados temporalmente"
          tone="red"
        />

        <SummaryCard
          icon={FaShieldAlt}
          label="Sin rol"
          value={usersWithoutRole}
          description="Cuentas que requieren revisión"
          tone="yellow"
        />
      </section>

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

      <section className="mt-6 overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-200 bg-gray-50 px-5 py-4">
          <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
            <div>
              <h2 className="font-black text-gray-950">
                Usuarios registrados
              </h2>

              <p className="mt-1 text-sm text-gray-600">
                Mostrando {filteredUsers.length} de {users.length} usuario(s).
              </p>
            </div>
          </div>

          <div className="mt-4 grid gap-3 lg:grid-cols-5">
            <div className="relative lg:col-span-3">
              <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-gray-400" />

              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar por usuario, correo, nombre o rol..."
                className="w-full rounded-xl border border-gray-300 px-4 py-3 pl-11 text-sm font-medium outline-none transition focus:border-red-700 focus:ring-2 focus:ring-red-100"
              />
            </div>

            <select
              value={roleFilter}
              onChange={(event) => setRoleFilter(event.target.value)}
              className="rounded-xl border border-gray-300 px-4 py-3 text-sm font-medium outline-none transition focus:border-red-700 focus:ring-2 focus:ring-red-100"
            >
              <option value="">Todos los roles</option>
              {roles.map((role) => (
                <option key={role.id} value={role.name}>
                  {role.name}
                </option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="rounded-xl border border-gray-300 px-4 py-3 text-sm font-medium outline-none transition focus:border-red-700 focus:ring-2 focus:ring-red-100"
            >
              <option value="">Todos los estados</option>
              <option value="active">Activos</option>
              <option value="inactive">Inactivos</option>
            </select>
          </div>
        </div>

        {loading && (
          <div className="p-8 text-center text-gray-600">
            Cargando usuarios...
          </div>
        )}

        {!loading && filteredUsers.length === 0 && (
          <div className="p-10 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-red-700 ring-1 ring-red-100">
              <FaUsers />
            </div>

            <p className="mt-4 font-black text-gray-950">
              No se encontraron usuarios.
            </p>

            <p className="mt-2 text-sm text-gray-600">
              Ajusta la búsqueda o limpia los filtros.
            </p>
          </div>
        )}

        {!loading && filteredUsers.length > 0 && (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-white">
                <tr>
                  <TableHead>Usuario</TableHead>
                  <TableHead>Roles</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Último acceso</TableHead>
                  <TableHead>Acciones</TableHead>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100 bg-white">
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="align-top transition hover:bg-gray-50">
                    <td className="px-5 py-4">
                      <p className="font-black text-gray-950">
                        {user.username}
                      </p>

                      <p className="mt-1 text-xs text-gray-500">
                        {getFullName(user) || "Sin nombre registrado"}
                      </p>

                      <p className="mt-1 text-xs text-gray-500">
                        {user.email || "Sin correo"}
                      </p>
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex flex-wrap gap-2">
                        {(user.group_names || []).length === 0 ? (
                          <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-bold text-gray-600 ring-1 ring-gray-200">
                            Sin rol
                          </span>
                        ) : (
                          user.group_names.map((role) => (
                            <span
                              key={role}
                              className={`rounded-full px-3 py-1 text-xs font-bold ring-1 ${getRoleBadgeClass(
                                role
                              )}`}
                            >
                              {role}
                            </span>
                          ))
                        )}
                      </div>

                      {(user.direct_permission_codes || []).length > 0 && (
                        <p className="mt-2 text-xs font-semibold text-purple-700">
                          +{user.direct_permission_codes.length} permiso(s) adicional(es)
                        </p>
                      )}
                    </td>

                    <td className="px-5 py-4">
                      <span
                        className={
                          user.is_active
                            ? "inline-flex rounded-full bg-green-50 px-3 py-1 text-xs font-bold text-green-700 ring-1 ring-green-100"
                            : "inline-flex rounded-full bg-red-50 px-3 py-1 text-xs font-bold text-red-700 ring-1 ring-red-100"
                        }
                      >
                        {user.is_active ? "Activo" : "Inactivo"}
                      </span>
                    </td>

                    <td className="px-5 py-4 text-xs text-gray-500">
                      {formatDate(user.last_login)}
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex min-w-44 flex-col gap-2">
                        <button
                          type="button"
                          onClick={() => openEditModal(user)}
                          className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-300 px-3 py-2 text-xs font-bold text-gray-700 transition hover:bg-gray-100"
                        >
                          <FaPen className="text-xs" />
                          Editar usuario
                        </button>

                        <Link
                          to={`/admin/usuarios/${user.id}/permisos`}
                          className="inline-flex items-center justify-center gap-2 rounded-xl border border-purple-200 px-3 py-2 text-xs font-bold text-purple-700 transition hover:bg-purple-50"
                        >
                          <FaShieldAlt className="text-xs" />
                          Gestionar acceso
                        </Link>

                        <button
                          type="button"
                          onClick={() => {
                            setPasswordUser(user);
                            setNewPassword("");
                            setShowPassword(false);
                          }}
                          className="inline-flex items-center justify-center gap-2 rounded-xl border border-blue-200 px-3 py-2 text-xs font-bold text-blue-700 transition hover:bg-blue-50"
                        >
                          <FaKey className="text-xs" />
                          Cambiar contraseña
                        </button>

                        <button
                          type="button"
                          onClick={() => toggleActive(user)}
                          className={
                            user.is_active
                              ? "rounded-xl bg-red-50 px-3 py-2 text-xs font-bold text-red-700 transition hover:bg-red-100"
                              : "rounded-xl bg-green-50 px-3 py-2 text-xs font-bold text-green-700 transition hover:bg-green-100"
                          }
                        >
                          {user.is_active ? "Desactivar" : "Activar"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {isUserModalOpen && (
        <UserFormModal
          editingUser={editingUser}
          form={form}
          roles={roles}
          saving={saving}
          showFormPassword={showFormPassword}
          onClose={closeUserModal}
          onSubmit={submitForm}
          onUpdateField={updateField}
          onToggleRole={toggleRole}
          onToggleShowPassword={() =>
            setShowFormPassword((current) => !current)
          }
        />
      )}

      {passwordUser && (
        <PasswordModal
          passwordUser={passwordUser}
          newPassword={newPassword}
          saving={saving}
          showPassword={showPassword}
          onChangePassword={setNewPassword}
          onToggleShow={() => setShowPassword((current) => !current)}
          onClose={() => {
            setPasswordUser(null);
            setNewPassword("");
            setShowPassword(false);
          }}
          onSubmit={submitPassword}
        />
      )}
    </div>
  );
}

function UserFormModal({
  editingUser,
  form,
  roles,
  saving,
  showFormPassword,
  onClose,
  onSubmit,
  onUpdateField,
  onToggleRole,
  onToggleShowPassword,
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <form
        onSubmit={onSubmit}
        className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-red-50 px-3 py-1 text-xs font-black uppercase tracking-wide text-red-700">
              <FaShieldAlt />
              {editingUser ? "Editar acceso" : "Nuevo acceso"}
            </div>

            <h2 className="mt-2 text-2xl font-black text-gray-950">
              {editingUser ? "Editar usuario" : "Crear usuario"}
            </h2>

            <p className="mt-1 text-sm leading-6 text-gray-600">
              {editingUser
                ? "Actualiza los datos básicos de la cuenta. Los accesos se administran desde Gestión de acceso."
                : "Registra la cuenta y asigna su rol principal dentro del sistema."}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-gray-300 p-2 text-gray-600 transition hover:bg-gray-100"
          >
            <FaTimes />
          </button>
        </div>

        <div className="mt-6 grid gap-5 md:grid-cols-2">
          <div className="md:col-span-2">
            <TextField
              label="Usuario *"
              value={form.username}
              onChange={(event) =>
                onUpdateField("username", event.target.value)
              }
              disabled={Boolean(editingUser)}
              placeholder="Ejemplo: asesor01"
            />
          </div>

          {!editingUser && (
            <div className="md:col-span-2">
              <PasswordField
                label="Contraseña *"
                value={form.password}
                onChange={(event) =>
                  onUpdateField("password", event.target.value)
                }
                showPassword={showFormPassword}
                onToggleShow={onToggleShowPassword}
                placeholder="Mínimo 8 caracteres"
              />
            </div>
          )}

          <TextField
            label="Nombres"
            value={form.first_name}
            onChange={(event) =>
              onUpdateField("first_name", event.target.value)
            }
            placeholder="Nombres"
          />

          <TextField
            label="Apellidos"
            value={form.last_name}
            onChange={(event) =>
              onUpdateField("last_name", event.target.value)
            }
            placeholder="Apellidos"
          />

          <div className="md:col-span-2">
            <TextField
              label="Correo"
              type="email"
              value={form.email}
              onChange={(event) => onUpdateField("email", event.target.value)}
              placeholder="correo@book-express.com"
            />
          </div>
        </div>

        {!editingUser && (
          <div className="mt-6">
            <p className="mb-2 text-sm font-black text-gray-950">
              Rol principal *
            </p>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {roles.map((role) => (
                <RoleOption
                  key={role.id}
                  role={role}
                  checked={form.groups.includes(role.id)}
                  onChange={() => onToggleRole(role.id)}
                />
              ))}
            </div>

            <p className="mt-2 text-xs leading-5 text-gray-500">
              El rol define los permisos base. Después podrás asignar excepciones
              desde la opción Gestionar acceso.
            </p>
          </div>
        )}

        {editingUser && (
          <div className="mt-6 rounded-2xl border border-purple-100 bg-purple-50 p-4">
            <div className="flex gap-3">
              <FaShieldAlt className="mt-0.5 shrink-0 text-purple-700" />
              <div>
                <p className="text-sm font-black text-gray-950">
                  Rol y permisos
                </p>
                <p className="mt-1 text-xs leading-5 text-gray-600">
                  Para cambiar el rol principal o los permisos adicionales,
                  guarda primero estos datos y usa Gestionar acceso desde la
                  lista de usuarios.
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="mt-6">
          <label className="flex cursor-pointer gap-3 rounded-2xl border border-gray-200 bg-gray-50 p-4 transition hover:bg-gray-100">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(event) =>
                onUpdateField("is_active", event.target.checked)
              }
              className="mt-1 h-4 w-4"
            />

            <span>
              <span className="block text-sm font-black text-gray-950">
                Usuario activo
              </span>
              <span className="mt-1 block text-xs leading-5 text-gray-500">
                Si está activo, podrá ingresar al panel administrativo.
              </span>
            </span>
          </label>
        </div>

        <div className="mt-6 flex flex-col gap-3 border-t border-gray-200 pt-5 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-gray-300 px-5 py-3 text-sm font-bold text-gray-700 transition hover:bg-gray-100"
          >
            Cancelar
          </button>

          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-700 px-5 py-3 text-sm font-black text-white transition hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <FaSave />
            {saving
              ? "Guardando..."
              : editingUser
                ? "Guardar cambios"
                : "Crear usuario"}
          </button>
        </div>
      </form>
    </div>
  );
}

function PasswordModal({
  passwordUser,
  newPassword,
  saving,
  showPassword,
  onChangePassword,
  onToggleShow,
  onClose,
  onSubmit,
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-red-50 px-3 py-1 text-xs font-black uppercase tracking-wide text-red-700">
              <FaKey />
              Seguridad
            </div>

            <h2 className="mt-2 text-xl font-black text-gray-950">
              Cambiar contraseña
            </h2>

            <p className="mt-2 text-sm text-gray-600">
              Usuario:{" "}
              <span className="font-black text-gray-950">
                {passwordUser.username}
              </span>
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-gray-300 p-2 text-gray-600 transition hover:bg-gray-100"
          >
            <FaTimes />
          </button>
        </div>

        <div className="mt-5">
          <PasswordField
            label="Nueva contraseña"
            value={newPassword}
            onChange={(event) => onChangePassword(event.target.value)}
            showPassword={showPassword}
            onToggleShow={onToggleShow}
            placeholder="Mínimo 8 caracteres"
          />

          <p className="mt-2 text-xs leading-5 text-gray-500">
            La contraseña debe tener mínimo 8 caracteres.
          </p>
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-gray-300 px-4 py-3 text-sm font-bold text-gray-700 transition hover:bg-gray-100"
          >
            Cancelar
          </button>

          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-700 px-4 py-3 text-sm font-black text-white transition hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <FaSave />
            {saving ? "Guardando..." : "Guardar contraseña"}
          </button>
        </div>
      </form>
    </div>
  );
}

function SummaryCard({ icon: Icon, label, value, description, tone }) {
  const styles = {
    dark: "border-gray-800 bg-gray-950 text-white",
    green: "border-green-100 bg-green-50 text-green-700",
    red: "border-red-100 bg-red-50 text-red-700",
    yellow: "border-yellow-100 bg-yellow-50 text-yellow-700",
  };

  return (
    <div
      className={`rounded-3xl border p-5 shadow-sm ${
        styles[tone] || styles.dark
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-bold opacity-80">{label}</p>
          <p className="mt-2 text-3xl font-black">{value}</p>
          <p className="mt-2 text-xs leading-5 opacity-80">{description}</p>
        </div>

        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/70 text-gray-950 ring-1 ring-white/60">
          <Icon />
        </div>
      </div>
    </div>
  );
}

function TextField({
  label,
  type = "text",
  value,
  onChange,
  disabled,
  placeholder,
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-semibold text-gray-800">
        {label}
      </label>

      <input
        type={type}
        value={value}
        onChange={onChange}
        disabled={disabled}
        placeholder={placeholder}
        className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm font-medium outline-none transition focus:border-red-700 focus:ring-2 focus:ring-red-100 disabled:bg-gray-100"
      />
    </div>
  );
}

function PasswordField({
  label,
  value,
  onChange,
  showPassword,
  onToggleShow,
  placeholder,
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-semibold text-gray-800">
        {label}
      </label>

      <div className="relative">
        <input
          type={showPassword ? "text" : "password"}
          value={value}
          onChange={onChange}
          minLength={8}
          required
          placeholder={placeholder}
          className="w-full rounded-xl border border-gray-300 px-4 py-3 pr-12 text-sm font-medium outline-none transition focus:border-red-700 focus:ring-2 focus:ring-red-100"
        />

        <button
          type="button"
          onClick={onToggleShow}
          className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 transition hover:text-gray-900"
        >
          {showPassword ? <FaEyeSlash /> : <FaEye />}
        </button>
      </div>
    </div>
  );
}

function RoleOption({ role, checked, onChange }) {
  return (
    <label className="flex cursor-pointer gap-3 rounded-2xl border border-gray-200 bg-gray-50 p-4 transition hover:bg-gray-100">
      <input
        type="radio"
        name="bookexpress-primary-role"
        checked={checked}
        onChange={onChange}
        className="mt-1 h-4 w-4"
      />

      <span>
        <span
          className={`inline-flex rounded-full px-3 py-1 text-xs font-black ring-1 ${getRoleBadgeClass(
            role.name
          )}`}
        >
          {role.name}
        </span>

        <span className="mt-2 block text-xs leading-5 text-gray-500">
          {getRoleDescription(role.name)}
        </span>
      </span>
    </label>
  );
}

function TableHead({ children }) {
  return (
    <th className="px-5 py-3 text-left text-xs font-black uppercase tracking-wide text-gray-500">
      {children}
    </th>
  );
}