import { useEffect, useMemo, useState } from "react";
import {
  FaCheck,
  FaEdit,
  FaSchool,
  FaTimes,
  FaUserTie,
  FaUsers,
} from "react-icons/fa";

import {
  createCRMCommercialTeam,
  getCRMCommercialTeamEligibleMembers,
  getCRMCommercialTeams,
  updateCRMCommercialTeam,
} from "../../../api/crmApi";

function getErrorMessage(error, fallback) {
  const data = error?.response?.data;

  if (typeof data?.detail === "string" && data.detail.trim()) {
    return data.detail;
  }

  if (Array.isArray(data?.detail) && data.detail.length > 0) {
    return data.detail.join(" ");
  }

  if (data && typeof data === "object") {
    const messages = Object.values(data)
      .flatMap((value) => (Array.isArray(value) ? value : [value]))
      .filter((value) => typeof value === "string" && value.trim());

    if (messages.length > 0) {
      return messages.join(" ");
    }
  }

  return fallback;
}

function userLabel(user) {
  return user?.full_name || user?.username || "Usuario";
}

function membershipIds(team, role) {
  return (team?.memberships || [])
    .filter((membership) => membership.role === role)
    .map((membership) => membership.user?.id)
    .filter(Boolean);
}

function EmptyState() {
  return (
    <div className="rounded-3xl border border-dashed border-gray-300 bg-white px-6 py-14 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-gray-950 text-white">
        <FaUsers />
      </div>
      <h2 className="mt-4 text-lg font-black text-gray-950">
        Aún no hay equipos comerciales
      </h2>
      <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-gray-500">
        Crea el primer equipo para organizar asesores, responsables y cartera
        de colegios.
      </p>
    </div>
  );
}

export default function CRMCommercialTeamsPage() {
  const [teams, setTeams] = useState([]);
  const [eligibleMembers, setEligibleMembers] = useState({
    supervisors: [],
    advisors: [],
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [panelOpen, setPanelOpen] = useState(false);
  const [editingTeam, setEditingTeam] = useState(null);
  const [form, setForm] = useState({
    name: "",
    description: "",
    is_active: true,
    supervisor_ids: [],
    advisor_ids: [],
  });

  const summary = useMemo(
    () =>
      teams.reduce(
        (result, team) => {
          if (team.is_active) {
            result.activeTeams += 1;
          }
          result.advisors += Number(team.advisor_count || 0);
          result.schools += Number(team.school_count || 0);
          return result;
        },
        {
          activeTeams: 0,
          advisors: 0,
          schools: 0,
        },
      ),
    [teams],
  );

  useEffect(() => {
    let ignore = false;

    async function loadData() {
      try {
        setLoading(true);
        setErrorMessage("");

        const [teamData, memberData] = await Promise.all([
          getCRMCommercialTeams({ include_inactive: "true" }),
          getCRMCommercialTeamEligibleMembers(),
        ]);

        if (!ignore) {
          setTeams(Array.isArray(teamData) ? teamData : []);
          setEligibleMembers({
            supervisors: Array.isArray(memberData?.supervisors)
              ? memberData.supervisors
              : [],
            advisors: Array.isArray(memberData?.advisors)
              ? memberData.advisors
              : [],
          });
        }
      } catch (error) {
        if (!ignore) {
          setErrorMessage(
            getErrorMessage(
              error,
              "No se pudieron cargar los equipos comerciales.",
            ),
          );
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    loadData();

    return () => {
      ignore = true;
    };
  }, []);

  function openCreatePanel() {
    setEditingTeam(null);
    setForm({
      name: "",
      description: "",
      is_active: true,
      supervisor_ids: [],
      advisor_ids: [],
    });
    setErrorMessage("");
    setPanelOpen(true);
  }

  function openEditPanel(team) {
    setEditingTeam(team);
    setForm({
      name: team.name || "",
      description: team.description || "",
      is_active: team.is_active !== false,
      supervisor_ids: membershipIds(team, "supervisor"),
      advisor_ids: membershipIds(team, "advisor"),
    });
    setErrorMessage("");
    setPanelOpen(true);
  }

  function closePanel() {
    if (!saving) {
      setPanelOpen(false);
    }
  }

  function toggleMember(field, userId) {
    setForm((current) => {
      const selected = current[field].includes(userId);

      return {
        ...current,
        [field]: selected
          ? current[field].filter((id) => id !== userId)
          : [...current[field], userId],
      };
    });
  }

  async function reloadTeams() {
    const teamData = await getCRMCommercialTeams({
      include_inactive: "true",
    });
    setTeams(Array.isArray(teamData) ? teamData : []);
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (!form.name.trim() || saving) {
      return;
    }

    try {
      setSaving(true);
      setErrorMessage("");

      const payload = {
        name: form.name.trim(),
        description: form.description.trim(),
        is_active: form.is_active,
        supervisor_ids: form.supervisor_ids,
        advisor_ids: form.advisor_ids,
      };

      if (editingTeam) {
        await updateCRMCommercialTeam(editingTeam.id, payload);
      } else {
        await createCRMCommercialTeam(payload);
      }

      await reloadTeams();
      setPanelOpen(false);
    } catch (error) {
      setErrorMessage(
        getErrorMessage(
          error,
          "No se pudo guardar el equipo comercial.",
        ),
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      <section className="rounded-3xl bg-gray-950 px-5 py-5 text-white shadow-sm sm:px-7">
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
          <div>
            <p className="text-xs font-black uppercase tracking-wide text-red-300">
              CRM Comercial
            </p>
            <h1 className="mt-2 text-2xl font-black sm:text-3xl">
              Equipos comerciales
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-300">
              Organiza jefes, asesores y cartera de colegios para trabajar la
              campaña con responsables claros.
            </p>
          </div>

          <button
            type="button"
            onClick={openCreatePanel}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-700 px-4 py-2.5 text-sm font-black text-white transition hover:bg-red-800"
          >
            <FaUsers />
            Crear equipo
          </button>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-black uppercase tracking-wide text-gray-500">
            Equipos activos
          </p>
          <p className="mt-2 text-2xl font-black text-gray-950">
            {summary.activeTeams}
          </p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-black uppercase tracking-wide text-gray-500">
            Asesores asignados
          </p>
          <p className="mt-2 text-2xl font-black text-gray-950">
            {summary.advisors}
          </p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-black uppercase tracking-wide text-gray-500">
            Colegios en cartera
          </p>
          <p className="mt-2 text-2xl font-black text-gray-950">
            {summary.schools}
          </p>
        </div>
      </section>

      {errorMessage && !panelOpen ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-800">
          {errorMessage}
        </div>
      ) : null}

      {loading ? (
        <div className="rounded-3xl border border-gray-200 bg-white px-6 py-14 text-center text-sm font-bold text-gray-500">
          Cargando equipos comerciales...
        </div>
      ) : teams.length === 0 ? (
        <EmptyState />
      ) : (
        <section className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-100 px-5 py-4">
            <h2 className="text-lg font-black text-gray-950">
              Estructura comercial
            </h2>
            <p className="mt-1 text-xs text-gray-500">
              Revisa responsables, asesores y colegios asignados por equipo.
            </p>
          </div>

          <div className="divide-y divide-gray-100">
            {teams.map((team) => {
              const supervisors = (team.memberships || []).filter(
                (membership) => membership.role === "supervisor",
              );
              const advisors = (team.memberships || []).filter(
                (membership) => membership.role === "advisor",
              );

              return (
                <article
                  key={team.id}
                  className="px-5 py-5 transition hover:bg-gray-50"
                >
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-lg font-black text-gray-950">
                          {team.name}
                        </h3>
                        <span
                          className={
                            team.is_active
                              ? "rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-black text-emerald-700 ring-1 ring-emerald-200"
                              : "rounded-full bg-gray-100 px-2.5 py-1 text-xs font-black text-gray-600 ring-1 ring-gray-200"
                          }
                        >
                          {team.is_active ? "Activo" : "Inactivo"}
                        </span>
                      </div>

                      {team.description ? (
                        <p className="mt-1 max-w-3xl text-sm leading-6 text-gray-500">
                          {team.description}
                        </p>
                      ) : null}

                      <div className="mt-4 grid gap-3 sm:grid-cols-3">
                        <div className="rounded-xl border border-gray-200 bg-white px-3 py-3">
                          <div className="flex items-center gap-2 text-gray-500">
                            <FaUserTie />
                            <span className="text-xs font-black uppercase tracking-wide">
                              Jefe / supervisor
                            </span>
                          </div>
                          <p className="mt-2 text-sm font-black text-gray-950">
                            {supervisors.length
                              ? supervisors
                                  .map((membership) =>
                                    userLabel(membership.user),
                                  )
                                  .join(", ")
                              : "Sin supervisor asignado"}
                          </p>
                        </div>

                        <div className="rounded-xl border border-gray-200 bg-white px-3 py-3">
                          <div className="flex items-center gap-2 text-gray-500">
                            <FaUsers />
                            <span className="text-xs font-black uppercase tracking-wide">
                              Asesores
                            </span>
                          </div>
                          <p className="mt-2 text-sm font-black text-gray-950">
                            {advisors.length}
                          </p>
                        </div>

                        <div className="rounded-xl border border-gray-200 bg-white px-3 py-3">
                          <div className="flex items-center gap-2 text-gray-500">
                            <FaSchool />
                            <span className="text-xs font-black uppercase tracking-wide">
                              Colegios
                            </span>
                          </div>
                          <p className="mt-2 text-sm font-black text-gray-950">
                            {team.school_count || 0}
                          </p>
                        </div>
                      </div>

                      {advisors.length > 0 ? (
                        <div className="mt-4 flex flex-wrap gap-2">
                          {advisors.map((membership) => (
                            <span
                              key={membership.id}
                              className="rounded-full bg-gray-100 px-3 py-1.5 text-xs font-bold text-gray-700"
                            >
                              {userLabel(membership.user)}
                            </span>
                          ))}
                        </div>
                      ) : null}
                    </div>

                    <button
                      type="button"
                      onClick={() => openEditPanel(team)}
                      className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-black text-gray-800 transition hover:border-gray-400 hover:bg-gray-50"
                    >
                      <FaEdit />
                      Gestionar equipo
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      )}

      {panelOpen ? (
        <div
          className="fixed inset-0 z-50 flex justify-end bg-gray-950/55"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closePanel();
            }
          }}
        >
          <aside
            className="flex h-full w-full max-w-2xl flex-col bg-white shadow-2xl"
            aria-label="Gestionar equipo comercial"
          >
            <div className="flex items-start justify-between gap-4 border-b border-gray-200 px-5 py-4 sm:px-6">
              <div>
                <p className="text-xs font-black uppercase tracking-wide text-red-700">
                  CRM Comercial
                </p>
                <h2 className="mt-1 text-xl font-black text-gray-950">
                  {editingTeam ? "Gestionar equipo" : "Nuevo equipo comercial"}
                </h2>
                <p className="mt-1 text-sm leading-6 text-gray-500">
                  Define responsables e integrantes sin mezclar la gestión de
                  usuarios con la organización comercial.
                </p>
              </div>

              <button
                type="button"
                onClick={closePanel}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-gray-200 text-gray-500 transition hover:bg-gray-50 hover:text-gray-950"
                aria-label="Cerrar"
              >
                <FaTimes />
              </button>
            </div>

            <form
              className="flex min-h-0 flex-1 flex-col"
              onSubmit={handleSubmit}
            >
              <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-5 sm:px-6">
                {errorMessage ? (
                  <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-800">
                    {errorMessage}
                  </div>
                ) : null}

                <label className="block">
                  <span className="text-sm font-black text-gray-800">
                    Nombre del equipo
                  </span>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        name: event.target.value,
                      }))
                    }
                    placeholder="Ej. Equipo Centro"
                    className="mt-1.5 w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm font-bold text-gray-950 outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-100"
                  />
                </label>

                <label className="block">
                  <span className="text-sm font-black text-gray-800">
                    Descripción
                  </span>
                  <textarea
                    rows={3}
                    value={form.description}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        description: event.target.value,
                      }))
                    }
                    placeholder="Cobertura, zona o criterio del equipo..."
                    className="mt-1.5 w-full resize-none rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-950 outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-100"
                  />
                </label>

                <section className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                  <div>
                    <h3 className="text-sm font-black text-gray-950">
                      Jefe / supervisor
                    </h3>
                    <p className="mt-1 text-xs leading-5 text-gray-500">
                      Selecciona quién supervisará la cartera y los asesores del
                      equipo.
                    </p>
                  </div>

                  <div className="mt-3 space-y-2">
                    {eligibleMembers.supervisors.length === 0 ? (
                      <p className="rounded-xl bg-white px-3 py-3 text-sm text-gray-500 ring-1 ring-gray-200">
                        No hay usuarios habilitados para supervisión comercial.
                      </p>
                    ) : (
                      eligibleMembers.supervisors.map((user) => {
                        const checked = form.supervisor_ids.includes(user.id);

                        return (
                          <label
                            key={user.id}
                            className="flex cursor-pointer items-center justify-between gap-3 rounded-xl bg-white px-3 py-3 ring-1 ring-gray-200"
                          >
                            <div>
                              <p className="text-sm font-black text-gray-900">
                                {userLabel(user)}
                              </p>
                              <p className="text-xs text-gray-500">
                                {user.whatsapp || user.phone || "Sin celular registrado"}
                              </p>
                            </div>

                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() =>
                                toggleMember("supervisor_ids", user.id)
                              }
                              className="h-4 w-4 accent-red-700"
                            />
                          </label>
                        );
                      })
                    )}
                  </div>
                </section>

                <section className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                  <div>
                    <h3 className="text-sm font-black text-gray-950">
                      Asesores comerciales
                    </h3>
                    <p className="mt-1 text-xs leading-5 text-gray-500">
                      Estos asesores podrán recibir colegios de la cartera del
                      equipo.
                    </p>
                  </div>

                  <div className="mt-3 space-y-2">
                    {eligibleMembers.advisors.length === 0 ? (
                      <p className="rounded-xl bg-white px-3 py-3 text-sm text-gray-500 ring-1 ring-gray-200">
                        No hay asesores comerciales habilitados.
                      </p>
                    ) : (
                      eligibleMembers.advisors.map((user) => {
                        const checked = form.advisor_ids.includes(user.id);

                        return (
                          <label
                            key={user.id}
                            className="flex cursor-pointer items-center justify-between gap-3 rounded-xl bg-white px-3 py-3 ring-1 ring-gray-200"
                          >
                            <div>
                              <p className="text-sm font-black text-gray-900">
                                {userLabel(user)}
                              </p>
                              <p className="text-xs text-gray-500">
                                {user.whatsapp || user.phone || "Sin celular registrado"}
                              </p>
                            </div>

                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() =>
                                toggleMember("advisor_ids", user.id)
                              }
                              className="h-4 w-4 accent-red-700"
                            />
                          </label>
                        );
                      })
                    )}
                  </div>
                </section>

                <label className="flex items-start gap-3 rounded-2xl border border-gray-200 bg-white px-4 py-4">
                  <input
                    type="checkbox"
                    checked={form.is_active}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        is_active: event.target.checked,
                      }))
                    }
                    className="mt-1 h-4 w-4 accent-red-700"
                  />
                  <span>
                    <span className="block text-sm font-black text-gray-900">
                      Equipo activo
                    </span>
                    <span className="mt-1 block text-xs leading-5 text-gray-500">
                      Los equipos inactivos se conservan en el historial, pero
                      ya no se usan para nuevas asignaciones.
                    </span>
                  </span>
                </label>
              </div>

              <div className="flex justify-end gap-2 border-t border-gray-200 bg-white px-5 py-4 sm:px-6">
                <button
                  type="button"
                  onClick={closePanel}
                  disabled={saving}
                  className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-black text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={saving || !form.name.trim()}
                  className="inline-flex items-center gap-2 rounded-xl bg-red-700 px-4 py-2.5 text-sm font-black text-white transition hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <FaCheck />
                  {saving ? "Guardando..." : "Guardar equipo"}
                </button>
              </div>
            </form>
          </aside>
        </div>
      ) : null}
    </div>
  );
}
