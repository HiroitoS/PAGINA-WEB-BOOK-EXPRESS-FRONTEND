import { useEffect, useMemo, useState } from "react";
import {
  FaCheckCircle,
  FaChevronDown,
  FaEdit,
  FaFolderOpen,
  FaPlus,
  FaSave,
  FaSpinner,
  FaTimes,
  FaTrash,
  FaUserPlus,
  FaUsers,
} from "react-icons/fa";
import {
  createWorkspaceGroup,
  createWorkspaceMembership,
  deleteWorkspaceMembership,
  getWorkspaceAssignableUsers,
  getWorkspaceGroups,
  getWorkspaceMemberships,
  updateWorkspaceGroup,
  updateWorkspaceMembership,
} from "../../../api/adminApi";
import { useAuth } from "../../../hooks/useAuth";
import { userHasPermission } from "../../../utils/adminAccess";
import { getResults } from "../../../utils/formatters";

const INITIAL_GROUP_FORM = {
  name: "",
  description: "",
  color: "#dc2626",
  is_active: true,
};

const INITIAL_MEMBER_FORM = {
  user: "",
  role: "member",
  is_active: true,
};

const ROLE_OPTIONS = [
  { value: "owner", label: "Responsable" },
  { value: "coordinator", label: "Coordinador" },
  { value: "member", label: "Miembro" },
  { value: "viewer", label: "Observador" },
];

const ROLE_HELP_ITEMS = [
  {
    role: "Responsable",
    description:
      "Dirige el grupo y puede coordinar integrantes, tareas, eventos y recordatorios relacionados.",
  },
  {
    role: "Coordinador",
    description: "Apoya el seguimiento operativo del grupo y ayuda a ordenar el trabajo diario.",
  },
  {
    role: "Miembro",
    description: "Participa en el grupo y atiende las actividades que le correspondan.",
  },
  {
    role: "Observador",
    description: "Consulta información del grupo sin gestionar integrantes ni asignaciones.",
  },
];

function normalizeList(data) {
  if (Array.isArray(data)) return data;
  return getResults(data);
}


function getUserLabel(user) {
  return user.full_name || user.username || user.email || `Usuario ${user.id}`;
}

function getRoleLabel(role) {
  return ROLE_OPTIONS.find((option) => option.value === role)?.label || role || "Miembro";
}

function getFallbackCurrentUser(user) {
  if (!user) return [];

  return [
    {
      id: user.id,
      username: user.username,
      email: user.email || "",
      full_name: user.full_name || user.username || "Usuario actual",
    },
  ];
}

async function loadUsersForGroups(user, canManageGroups) {
  if (!canManageGroups) {
    return getFallbackCurrentUser(user);
  }

  try {
    const usersData = await getWorkspaceAssignableUsers();
    return normalizeList(usersData);
  } catch (requestError) {
    console.error("No se pudo cargar usuarios para grupos.", requestError);
    return getFallbackCurrentUser(user);
  }
}

function getGroupValidationMessage(form) {
  if (!form.name.trim()) return "Ingresa el nombre del grupo de trabajo.";

  if (form.name.trim().length < 3) {
    return "El nombre del grupo debe tener al menos 3 caracteres.";
  }

  return "";
}

function getMemberValidationMessage(form) {
  if (!form.user) return "Selecciona el usuario que deseas agregar al grupo.";

  return "";
}

function getApiErrorMessage(error, fallbackMessage) {
  const responseData = error.response?.data;

  if (!responseData) return fallbackMessage;
  if (typeof responseData === "string") return responseData;
  if (Array.isArray(responseData)) return responseData.join(" ");

  if (typeof responseData === "object") {
    const messages = Object.entries(responseData)
      .map(([field, value]) => {
        const message = Array.isArray(value) ? value.join(" ") : String(value);

        if (field === "non_field_errors" || field === "detail") return message;
        if (field === "name") return `Nombre: ${message}`;
        if (field === "description") return `Descripción: ${message}`;
        if (field === "color") return `Color: ${message}`;
        if (field === "user") return `Usuario: ${message}`;
        if (field === "role") return `Rol: ${message}`;
        if (field === "group") return `Grupo: ${message}`;

        return `${field}: ${message}`;
      })
      .filter(Boolean);

    return messages.join(" ") || fallbackMessage;
  }

  return fallbackMessage;
}

function buildGroupPayload(form) {
  return {
    name: form.name.trim(),
    description: form.description.trim(),
    color: form.color || "#dc2626",
    is_active: Boolean(form.is_active),
  };
}

function buildMemberPayload(form, groupId) {
  return {
    group: Number(groupId),
    user: Number(form.user),
    role: form.role,
    is_active: Boolean(form.is_active),
  };
}

export default function WorkspaceGroupsPage() {
  const { user } = useAuth();
  const canManageGroups = userHasPermission(
    user,
    ["workspaces.create_workspace_group"]
  );

  const [groups, setGroups] = useState([]);
  const [memberships, setMemberships] = useState([]);
  const [users, setUsers] = useState([]);

  const [groupForm, setGroupForm] = useState(INITIAL_GROUP_FORM);
  const [editGroupForm, setEditGroupForm] = useState(INITIAL_GROUP_FORM);
  const [memberForm, setMemberForm] = useState(INITIAL_MEMBER_FORM);

  const [selectedGroup, setSelectedGroup] = useState(null);
  const [openGroupId, setOpenGroupId] = useState(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingGroupId, setEditingGroupId] = useState(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isSavingGroup, setIsSavingGroup] = useState(false);
  const [isSavingMember, setIsSavingMember] = useState(false);
  const [isUpdatingMemberId, setIsUpdatingMemberId] = useState(null);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const activeGroups = useMemo(
    () => groups.filter((group) => group.is_active !== false),
    [groups]
  );

  const inactiveGroups = useMemo(
    () => groups.filter((group) => group.is_active === false),
    [groups]
  );

  const selectedGroupMembers = useMemo(() => {
    if (!selectedGroup) return [];

    return memberships.filter(
      (membership) => Number(membership.group) === Number(selectedGroup.id)
    );
  }, [memberships, selectedGroup]);

  const availableUsersForSelectedGroup = useMemo(() => {
    if (!selectedGroup) return users;

    const memberUserIds = new Set(
      selectedGroupMembers.map((membership) => Number(membership.user))
    );

    return users.filter((userItem) => !memberUserIds.has(Number(userItem.id)));
  }, [selectedGroup, selectedGroupMembers, users]);

  async function loadGroupsData() {
    setError("");
    setIsLoading(true);

    try {
      const [groupsData, membershipsData, usersData] = await Promise.all([
        getWorkspaceGroups(),
        getWorkspaceMemberships(),
        loadUsersForGroups(user, canManageGroups),
      ]);

      const normalizedGroups = normalizeList(groupsData);
      const normalizedMemberships = normalizeList(membershipsData);

      setGroups(normalizedGroups);
      setMemberships(normalizedMemberships);
      setUsers(usersData);

      if (selectedGroup) {
        const refreshedSelectedGroup = normalizedGroups.find(
          (group) => Number(group.id) === Number(selectedGroup.id)
        );

        setSelectedGroup(refreshedSelectedGroup || null);
      }
    } catch (requestError) {
      setError("No se pudo cargar grupos de trabajo. Revisa el backend o la sesión.");
      console.error(requestError);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    let ignore = false;

    async function loadInitialData() {
      setError("");
      setIsLoading(true);

      try {
        const [groupsData, membershipsData, usersData] = await Promise.all([
          getWorkspaceGroups(),
          getWorkspaceMemberships(),
          loadUsersForGroups(user, canManageGroups),
        ]);

        if (!ignore) {
          setGroups(normalizeList(groupsData));
          setMemberships(normalizeList(membershipsData));
          setUsers(usersData);
        }
      } catch (requestError) {
        if (!ignore) {
          setError("No se pudo cargar grupos de trabajo. Revisa el backend o la sesión.");
        }

        console.error(requestError);
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    }

    loadInitialData();

    return () => {
      ignore = true;
    };
  }, [canManageGroups, user]);

  function handleGroupChange(event) {
    const { name, value, type, checked } = event.target;

    setGroupForm((currentForm) => ({
      ...currentForm,
      [name]: type === "checkbox" ? checked : value,
    }));

    setError("");
    setSuccess("");
  }

  function handleEditGroupChange(event) {
    const { name, value, type, checked } = event.target;

    setEditGroupForm((currentForm) => ({
      ...currentForm,
      [name]: type === "checkbox" ? checked : value,
    }));

    setError("");
    setSuccess("");
  }

  function handleMemberChange(event) {
    const { name, value } = event.target;

    setMemberForm((currentForm) => ({
      ...currentForm,
      [name]: value,
    }));

    setError("");
    setSuccess("");
  }

  function toggleGroup(group) {
    const isAlreadyOpen = Number(openGroupId) === Number(group.id);

    setOpenGroupId(isAlreadyOpen ? null : group.id);
    setSelectedGroup(isAlreadyOpen ? null : group);
    setEditingGroupId(null);
    setMemberForm(INITIAL_MEMBER_FORM);
    setError("");
    setSuccess("");
  }

  function startEditingGroup(group) {
    setSelectedGroup(group);
    setOpenGroupId(group.id);
    setEditingGroupId(group.id);
    setEditGroupForm({
      name: group.name || "",
      description: group.description || "",
      color: group.color || "#dc2626",
      is_active: group.is_active !== false,
    });
    setError("");
    setSuccess("");
  }

  function cancelEditingGroup() {
    setEditingGroupId(null);
    setEditGroupForm(INITIAL_GROUP_FORM);
    setError("");
  }

  async function handleCreateGroup(event) {
    event.preventDefault();

    const validationMessage = getGroupValidationMessage(groupForm);

    if (validationMessage) {
      setError(validationMessage);
      return;
    }

    setError("");
    setSuccess("");
    setIsSavingGroup(true);

    try {
      await createWorkspaceGroup(buildGroupPayload(groupForm));
      setGroupForm(INITIAL_GROUP_FORM);
      setShowCreateForm(false);
      setSuccess("Grupo de trabajo creado correctamente.");
      await loadGroupsData();
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "No se pudo crear el grupo de trabajo."));
      console.error(requestError);
    } finally {
      setIsSavingGroup(false);
    }
  }

  async function handleUpdateGroup(event) {
    event.preventDefault();

    if (!selectedGroup) return;

    const validationMessage = getGroupValidationMessage(editGroupForm);

    if (validationMessage) {
      setError(validationMessage);
      return;
    }

    setError("");
    setSuccess("");
    setIsSavingGroup(true);

    try {
      await updateWorkspaceGroup(selectedGroup.id, buildGroupPayload(editGroupForm));
      setEditingGroupId(null);
      setSuccess("Grupo de trabajo actualizado correctamente.");
      await loadGroupsData();
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "No se pudo actualizar el grupo de trabajo."));
      console.error(requestError);
    } finally {
      setIsSavingGroup(false);
    }
  }

  async function handleCreateMembership(event) {
    event.preventDefault();

    if (!selectedGroup) return;

    const validationMessage = getMemberValidationMessage(memberForm);

    if (validationMessage) {
      setError(validationMessage);
      return;
    }

    setError("");
    setSuccess("");
    setIsSavingMember(true);

    try {
      await createWorkspaceMembership(buildMemberPayload(memberForm, selectedGroup.id));
      setMemberForm(INITIAL_MEMBER_FORM);
      setSuccess("Miembro agregado correctamente.");
      await loadGroupsData();
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "No se pudo agregar el miembro al grupo."));
      console.error(requestError);
    } finally {
      setIsSavingMember(false);
    }
  }

  async function handleUpdateMembership(membership, payload) {
    setError("");
    setSuccess("");
    setIsUpdatingMemberId(membership.id);

    try {
      await updateWorkspaceMembership(membership.id, payload);
      setSuccess("Miembro actualizado correctamente.");
      await loadGroupsData();
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "No se pudo actualizar el miembro."));
      console.error(requestError);
    } finally {
      setIsUpdatingMemberId(null);
    }
  }

  async function handleDeleteMembership(membership) {
    const confirmed = window.confirm("¿Deseas retirar a este usuario del grupo?");

    if (!confirmed) return;

    setError("");
    setSuccess("");
    setIsUpdatingMemberId(membership.id);

    try {
      await deleteWorkspaceMembership(membership.id);
      setSuccess("Miembro retirado correctamente.");
      await loadGroupsData();
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "No se pudo retirar el miembro."));
      console.error(requestError);
    } finally {
      setIsUpdatingMemberId(null);
    }
  }

  return (
    <div className="space-y-3 sm:space-y-4">
      <section className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm">
        <div className="bg-gray-950 px-4 py-4 text-white sm:px-6 sm:py-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <p className="text-xs font-black uppercase tracking-wide text-red-300">ToDo</p>
              <h1 className="mt-1 text-2xl font-black leading-tight sm:text-3xl">
                Grupos de trabajo
              </h1>
              <p className="mt-2 max-w-3xl text-sm leading-5 text-gray-300 sm:leading-6">
                Organiza tareas, eventos y recordatorios por campaña, área o proyecto interno.
              </p>
            </div>

            <div className="grid gap-2 sm:flex sm:flex-wrap">
              <button
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white px-4 py-2.5 text-sm font-black text-gray-950 transition hover:bg-gray-100 sm:py-3"
                type="button"
                onClick={loadGroupsData}
              >
                {isLoading ? <FaSpinner className="animate-spin" /> : <FaFolderOpen />}
                Actualizar
              </button>

              {canManageGroups ? (
                <button
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-700 px-4 py-2.5 text-sm font-black text-white transition hover:bg-red-800 sm:py-3"
                  type="button"
                  onClick={() => setShowCreateForm((currentValue) => !currentValue)}
                >
                  {showCreateForm ? <FaTimes /> : <FaPlus />}
                  {showCreateForm ? "Cerrar" : "Nuevo grupo"}
                </button>
              ) : null}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-0 xl:grid-cols-4">
          <GroupMetricCard label="Activos" value={activeGroups.length} />
          <GroupMetricCard label="Inactivos" value={inactiveGroups.length} />
          <GroupMetricCard label="Miembros" value={memberships.length} />
          <GroupMetricCard label="Rol" value={canManageGroups ? "Gestor" : "Usuario"} text />
        </div>
      </section>

      {error ? (
        <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 sm:px-5 sm:py-4">
          {error}
        </div>
      ) : null}

      {success ? (
        <div className="rounded-2xl border border-green-100 bg-green-50 px-4 py-3 text-sm font-semibold text-green-700 sm:px-5 sm:py-4">
          {success}
        </div>
      ) : null}

      <RoleHelpPanel canManageGroups={canManageGroups} />

      {showCreateForm && canManageGroups ? (
        <GroupForm
          form={groupForm}
          isSaving={isSavingGroup}
          submitLabel="Crear grupo"
          title="Nuevo grupo de trabajo"
          onCancel={() => {
            setShowCreateForm(false);
            setGroupForm(INITIAL_GROUP_FORM);
            setError("");
          }}
          onChange={handleGroupChange}
          onSubmit={handleCreateGroup}
        />
      ) : null}

      {isLoading ? (
        <div className="flex min-h-52 items-center justify-center rounded-3xl border border-gray-200 bg-white p-6 text-sm font-bold text-gray-500 shadow-sm sm:p-10">
          <FaSpinner className="mr-3 animate-spin" />
          Cargando grupos de trabajo...
        </div>
      ) : (
        <section className="rounded-3xl border border-gray-200 bg-white p-3 shadow-sm sm:p-5">
          <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <p className="text-xs font-black uppercase tracking-wide text-red-700">
                Espacios colaborativos
              </p>
              <h2 className="mt-1 text-xl font-black text-gray-950 sm:text-2xl">
                {canManageGroups ? "Gestión de grupos" : "Mis grupos"}
              </h2>
              <p className="mt-1 text-sm leading-5 text-gray-500">
                {canManageGroups
                  ? "Crea grupos, revisa miembros y organiza el trabajo interno."
                  : "Consulta los grupos donde participas y las actividades asociadas."}
              </p>
            </div>

            {!canManageGroups ? (
              <div className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3">
                <p className="text-xs font-black uppercase tracking-wide text-blue-700">
                  Vista de usuario
                </p>
                <p className="mt-1 text-sm font-black text-blue-700">
                  Solo ves los grupos donde participas.
                </p>
              </div>
            ) : null}
          </div>

          {groups.length === 0 ? (
            <EmptyState text="No hay grupos visibles para este usuario." />
          ) : (
            <div className="grid items-start gap-3 xl:grid-cols-2">
              {groups.map((group) => {
                const groupMembers = memberships.filter(
                  (membership) => Number(membership.group) === Number(group.id)
                );
                const isOpen = Number(openGroupId) === Number(group.id);
                const isEditing = Number(editingGroupId) === Number(group.id);

                return (
                  <GroupCard
                    key={group.id}
                    availableUsers={availableUsersForSelectedGroup}
                    canManageGroups={canManageGroups}
                    editForm={editGroupForm}
                    group={group}
                    groupMembers={groupMembers}
                    isEditing={isEditing}
                    isOpen={isOpen}
                    isSavingGroup={isSavingGroup}
                    isSavingMember={isSavingMember}
                    isUpdatingMemberId={isUpdatingMemberId}
                    memberForm={memberForm}
                    onCancelEdit={cancelEditingGroup}
                    onChangeEdit={handleEditGroupChange}
                    onCreateMembership={handleCreateMembership}
                    onDeleteMembership={handleDeleteMembership}
                    onEditGroup={() => startEditingGroup(group)}
                    onMemberChange={handleMemberChange}
                    onToggle={() => toggleGroup(group)}
                    onUpdateGroup={handleUpdateGroup}
                    onUpdateMembership={handleUpdateMembership}
                  />
                );
              })}
            </div>
          )}
        </section>
      )}
    </div>
  );
}

function RoleHelpPanel({ canManageGroups }) {
  return (
    <section className="rounded-3xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="mb-4 flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-wide text-red-700">
            Organización interna
          </p>
          <h2 className="mt-1 text-xl font-black text-gray-950">Roles dentro del grupo</h2>
          <p className="mt-1 text-sm leading-5 text-gray-500">
            Estos roles ordenan la participación dentro de cada grupo de trabajo. No reemplazan los
            roles generales del sistema.
          </p>
        </div>

        {canManageGroups ? (
          <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3">
            <p className="text-xs font-black uppercase tracking-wide text-red-700">
              Administración
            </p>
            <p className="mt-1 text-sm font-black text-red-700">
              Puedes editar grupos e integrantes.
            </p>
          </div>
        ) : (
          <div className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3">
            <p className="text-xs font-black uppercase tracking-wide text-blue-700">
              Vista de usuario
            </p>
            <p className="mt-1 text-sm font-black text-blue-700">
              Solo ves grupos donde participas.
            </p>
          </div>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {ROLE_HELP_ITEMS.map((item) => (
          <div key={item.role} className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
            <p className="text-sm font-black text-gray-950">{item.role}</p>
            <p className="mt-1 text-xs leading-5 text-gray-500">{item.description}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function GroupCard({
  availableUsers,
  canManageGroups,
  editForm,
  group,
  groupMembers,
  isEditing,
  isOpen,
  isSavingGroup,
  isSavingMember,
  isUpdatingMemberId,
  memberForm,
  onCancelEdit,
  onChangeEdit,
  onCreateMembership,
  onDeleteMembership,
  onEditGroup,
  onMemberChange,
  onToggle,
  onUpdateGroup,
  onUpdateMembership,
}) {
  return (
    <article className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <button className="w-full px-4 py-4 text-left sm:px-5" type="button" onClick={onToggle}>
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className="h-3 w-3 shrink-0 rounded-full"
                style={{ backgroundColor: group.color || "#dc2626" }}
              />

              <span
                className={`rounded-full border px-2.5 py-1 text-xs font-black ${
                  group.is_active === false
                    ? "border-gray-200 bg-gray-100 text-gray-600"
                    : "border-green-100 bg-green-50 text-green-700"
                }`}
              >
                {group.is_active === false ? "Inactivo" : "Activo"}
              </span>

              <span className="rounded-full border border-gray-100 bg-gray-50 px-2.5 py-1 text-xs font-black text-gray-600">
                {groupMembers.length} miembro(s)
              </span>
            </div>

            <h3 className="mt-3 line-clamp-2 text-lg font-black text-gray-950">{group.name}</h3>

            <p className="mt-1 line-clamp-2 text-sm leading-5 text-gray-500">
              {group.description || "Grupo de trabajo sin descripción."}
            </p>
          </div>

          <span
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition ${
              isOpen ? "bg-red-50 text-red-700" : "bg-gray-50 text-gray-500"
            }`}
          >
            <FaChevronDown className={`text-xs transition ${isOpen ? "rotate-180" : "rotate-0"}`} />
          </span>
        </div>
      </button>

      {isOpen ? (
        <div className="border-t border-gray-100 bg-gray-50 p-4 sm:p-5">
          {isEditing ? (
            <GroupForm
              compact
              form={editForm}
              isSaving={isSavingGroup}
              submitLabel="Guardar cambios"
              title="Editar grupo"
              onCancel={onCancelEdit}
              onChange={onChangeEdit}
              onSubmit={onUpdateGroup}
            />
          ) : (
            <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-wide text-red-700">
                  Detalle del grupo
                </p>
                <p className="mt-1 text-sm font-semibold text-gray-600">
                  Revisa integrantes y configuración del espacio.
                </p>
              </div>

              {canManageGroups ? (
                <button
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-xs font-black text-gray-700 transition hover:border-red-200 hover:text-red-700"
                  type="button"
                  onClick={onEditGroup}
                >
                  <FaEdit />
                  Editar grupo
                </button>
              ) : null}
            </div>
          )}

          <div className="rounded-3xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-wide text-red-700">
                  Integrantes
                </p>
                <h4 className="mt-1 text-base font-black text-gray-950">Miembros del grupo</h4>
              </div>

              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gray-100 text-gray-700">
                <FaUsers />
              </div>
            </div>

            {groupMembers.length === 0 ? (
              <EmptyState text="Este grupo todavía no tiene miembros visibles." />
            ) : (
              <div className="space-y-2">
                {groupMembers.map((membership) => (
                  <MemberRow
                    key={membership.id}
                    canManageGroups={canManageGroups}
                    isUpdating={Number(isUpdatingMemberId) === Number(membership.id)}
                    membership={membership}
                    onDelete={() => onDeleteMembership(membership)}
                    onRoleChange={(role) =>
                      onUpdateMembership(membership, {
                        role,
                        is_active: membership.is_active !== false,
                      })
                    }
                    onStatusChange={() =>
                      onUpdateMembership(membership, {
                        role: membership.role,
                        is_active: membership.is_active === false,
                      })
                    }
                  />
                ))}
              </div>
            )}
          </div>

          {canManageGroups ? (
            <form
              className="mt-4 rounded-3xl border border-gray-200 bg-white p-4 shadow-sm"
              onSubmit={onCreateMembership}
            >
              <div className="mb-4">
                <p className="text-xs font-black uppercase tracking-wide text-red-700">
                  Nuevo integrante
                </p>
                <h4 className="mt-1 text-base font-black text-gray-950">
                  Agregar miembro al grupo
                </h4>
              </div>

              <div className="grid gap-3 xl:grid-cols-12">
                <div className="xl:col-span-6">
                  <SelectField
                    id={`member_user_${group.id}`}
                    label="Usuario"
                    name="user"
                    options={availableUsers.map((userItem) => ({
                      value: String(userItem.id),
                      label: getUserLabel(userItem),
                    }))}
                    placeholder="Seleccionar usuario"
                    value={memberForm.user}
                    onChange={onMemberChange}
                  />
                </div>

                <div className="xl:col-span-4">
                  <SelectField
                    id={`member_role_${group.id}`}
                    label="Rol en el grupo"
                    name="role"
                    options={ROLE_OPTIONS}
                    value={memberForm.role}
                    onChange={onMemberChange}
                  />
                </div>

                <div className="xl:col-span-2 xl:flex xl:items-end">
                  <button
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-red-700 px-4 py-3 text-sm font-black text-white transition hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={isSavingMember || availableUsers.length === 0}
                    type="submit"
                  >
                    {isSavingMember ? <FaSpinner className="animate-spin" /> : <FaUserPlus />}
                    Agregar
                  </button>
                </div>
              </div>
            </form>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}

function GroupForm({
  compact = false,
  form,
  isSaving,
  submitLabel,
  title,
  onCancel,
  onChange,
  onSubmit,
}) {
  return (
    <section
      className={
        compact
          ? "mb-4 rounded-3xl border border-gray-200 bg-white p-4 shadow-sm"
          : "overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm"
      }
    >
      {!compact ? (
        <div className="border-b border-gray-100 bg-gray-50 px-4 py-4 sm:px-5">
          <p className="text-xs font-black uppercase tracking-wide text-red-700">Grupo</p>
          <h2 className="mt-1 text-xl font-black text-gray-950">{title}</h2>
          <p className="mt-1 text-sm leading-5 text-gray-500">
            Crea un espacio para organizar tareas, eventos y recordatorios por equipo o campaña.
          </p>
        </div>
      ) : null}

      <form className="space-y-4 p-4 sm:p-5" onSubmit={onSubmit}>
        {compact ? (
          <div>
            <p className="text-xs font-black uppercase tracking-wide text-red-700">Grupo</p>
            <h3 className="mt-1 text-lg font-black text-gray-950">{title}</h3>
          </div>
        ) : null}

        <div className="grid gap-3 lg:grid-cols-12">
          <div className="lg:col-span-6">
            <label
              className="mb-1.5 block text-xs font-black uppercase tracking-wide text-gray-500"
              htmlFor={compact ? "edit_group_name" : "group_name"}
            >
              Nombre del grupo
            </label>

            <input
              className="input-admin"
              id={compact ? "edit_group_name" : "group_name"}
              name="name"
              placeholder="Ejemplo: Campaña Escolar 2026"
              type="text"
              value={form.name}
              onChange={onChange}
            />
          </div>

          <div className="lg:col-span-3">
            <label
              className="mb-1.5 block text-xs font-black uppercase tracking-wide text-gray-500"
              htmlFor={compact ? "edit_group_color" : "group_color"}
            >
              Color
            </label>

            <input
              className="input-admin h-12"
              id={compact ? "edit_group_color" : "group_color"}
              name="color"
              type="color"
              value={form.color}
              onChange={onChange}
            />
          </div>

          <label className="flex items-center gap-3 rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3 text-sm font-black text-gray-700 lg:col-span-3 lg:mt-5">
            <input
              checked={form.is_active}
              className="h-4 w-4 rounded border-gray-300 text-red-700 focus:ring-red-600"
              name="is_active"
              type="checkbox"
              onChange={onChange}
            />
            Grupo activo
          </label>

          <div className="lg:col-span-12">
            <label
              className="mb-1.5 block text-xs font-black uppercase tracking-wide text-gray-500"
              htmlFor={compact ? "edit_group_description" : "group_description"}
            >
              Descripción
            </label>

            <textarea
              className="input-admin min-h-20 resize-none"
              id={compact ? "edit_group_description" : "group_description"}
              name="description"
              placeholder="Ejemplo: Seguimiento de colegios, asesoría comercial o campaña escolar."
              value={form.description}
              onChange={onChange}
            />
          </div>
        </div>

        <div className="grid gap-2 sm:flex sm:justify-end">
          <button
            className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-black text-gray-700 transition hover:bg-gray-50"
            type="button"
            onClick={onCancel}
          >
            Cancelar
          </button>

          <button
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-700 px-5 py-3 text-sm font-black text-white transition hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isSaving}
            type="submit"
          >
            {isSaving ? <FaSpinner className="animate-spin" /> : <FaSave />}
            {isSaving ? "Guardando..." : submitLabel}
          </button>
        </div>
      </form>
    </section>
  );
}

function MemberRow({
  canManageGroups,
  isUpdating,
  membership,
  onDelete,
  onRoleChange,
  onStatusChange,
}) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-gray-50 p-3">
      <div className="grid gap-3 xl:grid-cols-12 xl:items-center">
        <div className="min-w-0 xl:col-span-5">
          <p className="line-clamp-1 text-sm font-black text-gray-950">
            {membership.user_name || membership.user_display || `Usuario ${membership.user}`}
          </p>

          <div className="mt-2 flex flex-wrap gap-2">
            <span
              className={`rounded-full border px-2.5 py-1 text-xs font-black ${
                membership.is_active === false
                  ? "border-gray-200 bg-white text-gray-500"
                  : "border-green-100 bg-green-50 text-green-700"
              }`}
            >
              {membership.is_active === false ? "Inactivo" : "Activo"}
            </span>

            <span className="rounded-full border border-gray-200 bg-white px-2.5 py-1 text-xs font-black text-gray-600">
              {getRoleLabel(membership.role)}
            </span>
          </div>
        </div>

        {canManageGroups ? (
          <>
            <div className="xl:col-span-3">
              <label className="mb-1.5 block text-xs font-black uppercase tracking-wide text-gray-500 xl:hidden">
                Rol
              </label>

              <select
                className="input-admin"
                disabled={isUpdating}
                value={membership.role}
                onChange={(event) => onRoleChange(event.target.value)}
              >
                {ROLE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2 xl:col-span-4">
              <button
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-xs font-black text-gray-700 transition hover:border-red-200 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={isUpdating}
                type="button"
                onClick={onStatusChange}
              >
                {isUpdating ? <FaSpinner className="animate-spin" /> : <FaCheckCircle />}
                {membership.is_active === false ? "Activar" : "Desactivar"}
              </button>

              <button
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-100 bg-red-50 px-3 py-2.5 text-xs font-black text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={isUpdating}
                type="button"
                onClick={onDelete}
              >
                <FaTrash />
                Retirar
              </button>
            </div>
          </>
        ) : (
          <div className="xl:col-span-7">
            <p className="rounded-2xl border border-gray-100 bg-white px-4 py-3 text-xs font-semibold leading-5 text-gray-500">
              Participas en este grupo. Las tareas, eventos o recordatorios asociados aparecerán en
              tus módulos de ToDo.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function GroupMetricCard({ label, text = false, value }) {
  return (
    <div className="border-b border-gray-100 p-3 sm:p-4 xl:border-b-0 xl:border-r">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-black text-gray-700 sm:text-sm">{label}</p>
          <p
            className={
              text
                ? "mt-1 text-base font-black text-gray-950 sm:text-lg"
                : "mt-1 text-2xl font-black text-gray-950 sm:text-3xl"
            }
          >
            {value}
          </p>
        </div>

        <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-gray-100 text-gray-700">
          <FaUsers />
        </div>
      </div>
    </div>
  );
}

function SelectField({ id, label, name, options, placeholder, value, onChange }) {
  return (
    <div>
      <label
        className="mb-1.5 block text-xs font-black uppercase tracking-wide text-gray-500"
        htmlFor={id}
      >
        {label}
      </label>

      <select className="input-admin" id={id} name={name} value={value} onChange={onChange}>
        {placeholder ? <option value="">{placeholder}</option> : null}

        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function EmptyState({ text }) {
  return (
    <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-4 text-sm font-semibold text-gray-500 sm:p-5">
      {text}
    </div>
  );
}