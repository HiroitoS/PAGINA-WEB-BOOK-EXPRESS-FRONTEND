import { useEffect, useMemo, useState } from "react";
import {
  FaTimes,
  FaUserTie,
  FaUsers,
} from "react-icons/fa";

import {
  assignCRMSchoolPortfolio,
  getCRMCommercialTeams,
} from "../../../api/crmApi";
import { useAuth } from "../../../hooks/useAuth";

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
  return user?.full_name || user?.username || "Asesor comercial";
}

export default function CRMSchoolAssignmentPanel({
  schools,
  onAssigned,
  buttonLabel = "Asignar cartera",
  buttonClassName = "",
  selectionMode = "ids",
  selectionFilters = {},
  selectionCount = 0,
}) {
  const { hasPermission } = useAuth();
  const canAssign = hasPermission(["crm.assign_schools"]);

  const selectedSchools = useMemo(
    () => (Array.isArray(schools) ? schools.filter(Boolean) : []),
    [schools],
  );
  const isFilteredSelection = selectionMode === "filters";
  const effectiveSelectionCount = isFilteredSelection
    ? Number(selectionCount || 0)
    : selectedSchools.length;

  const [open, setOpen] = useState(false);
  const [teams, setTeams] = useState([]);
  const [teamId, setTeamId] = useState("");
  const [ownerId, setOwnerId] = useState("");
  const [loadingTeams, setLoadingTeams] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const selectedTeam = useMemo(
    () => teams.find((team) => String(team.id) === String(teamId)) || null,
    [teamId, teams],
  );

  const advisors = useMemo(
    () =>
      (selectedTeam?.memberships || [])
        .filter(
          (membership) =>
            membership.is_active !== false
            && membership.role === "advisor"
            && membership.user,
        )
        .map((membership) => membership.user)
        .sort((userA, userB) =>
          userLabel(userA).localeCompare(userLabel(userB), "es"),
        ),
    [selectedTeam],
  );

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    let ignore = false;

    async function loadTeams() {
      try {
        setLoadingTeams(true);
        setErrorMessage("");

        const data = await getCRMCommercialTeams();

        if (!ignore) {
          setTeams(Array.isArray(data) ? data : []);
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
          setLoadingTeams(false);
        }
      }
    }

    loadTeams();

    return () => {
      ignore = true;
    };
  }, [open]);

  function openPanel() {
    if (effectiveSelectionCount === 0) {
      return;
    }

    const singleSchool =
      !isFilteredSelection && selectedSchools.length === 1
        ? selectedSchools[0]
        : null;

    setTeamId(singleSchool?.team?.id ? String(singleSchool.team.id) : "");
    setOwnerId(singleSchool?.owner?.id ? String(singleSchool.owner.id) : "");
    setErrorMessage("");
    setOpen(true);
  }

  function closePanel() {
    if (saving) {
      return;
    }

    setOpen(false);
  }

  function handleTeamChange(event) {
    setTeamId(event.target.value);
    setOwnerId("");
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (effectiveSelectionCount === 0 || saving) {
      return;
    }

    try {
      setSaving(true);
      setErrorMessage("");

      const payload = {
        selection_mode: isFilteredSelection ? "filters" : "ids",
        team: teamId ? Number(teamId) : null,
        owner: ownerId ? Number(ownerId) : null,
      };

      if (isFilteredSelection) {
        payload.filters = selectionFilters;
      } else {
        payload.school_ids = selectedSchools.map((school) => school.id);
      }

      const result = await assignCRMSchoolPortfolio(payload);

      if (typeof onAssigned === "function") {
        onAssigned(result);
      }

      setOpen(false);
    } catch (error) {
      setErrorMessage(
        getErrorMessage(
          error,
          "No se pudo actualizar la asignación de la cartera.",
        ),
      );
    } finally {
      setSaving(false);
    }
  }

  if (!canAssign) {
    return null;
  }

  return (
    <>
      <button
        type="button"
        disabled={effectiveSelectionCount === 0}
        onClick={openPanel}
        className={
          buttonClassName
          || "inline-flex items-center justify-center gap-2 rounded-xl bg-red-700 px-4 py-2.5 text-sm font-black text-white transition hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-40"
        }
      >
        <FaUserTie />
        {buttonLabel}
      </button>

      {open ? (
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
            className="flex h-full w-full max-w-xl flex-col bg-white shadow-2xl"
            aria-label="Asignar cartera de colegios"
          >
            <div className="flex items-start justify-between gap-4 border-b border-gray-200 px-5 py-4 sm:px-6">
              <div>
                <p className="text-xs font-black uppercase tracking-wide text-red-700">
                  CRM Comercial
                </p>
                <h2 className="mt-1 text-xl font-black text-gray-950">
                  Asignar cartera
                </h2>
                <p className="mt-1 text-sm leading-6 text-gray-500">
                  Define el equipo y el asesor responsable de{" "}
                  {effectiveSelectionCount === 1
                    ? "este colegio"
                    : `${effectiveSelectionCount} colegios`}.
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
              <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6">
                <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-950 text-white">
                      <FaUsers />
                    </div>
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wide text-gray-500">
                        Colegios seleccionados
                      </p>
                      <p className="mt-1 text-lg font-black text-gray-950">
                        {effectiveSelectionCount}
                      </p>
                    </div>
                  </div>

                  {isFilteredSelection ? (
                    <div className="mt-3 rounded-xl border border-red-100 bg-red-50 px-3 py-3">
                      <p className="text-sm font-black text-red-900">
                        Todos los resultados filtrados
                      </p>
                      <p className="mt-1 text-xs leading-5 text-red-800">
                        La asignación se aplicará a los {effectiveSelectionCount} colegios que cumplen los filtros actuales, aunque no estén visibles en esta página.
                      </p>
                    </div>
                  ) : (
                    <div className="mt-3 max-h-40 space-y-1.5 overflow-y-auto">
                      {selectedSchools.slice(0, 12).map((school) => (
                        <p
                          key={school.id}
                          className="rounded-lg bg-white px-3 py-2 text-sm font-bold text-gray-800 ring-1 ring-gray-200"
                        >
                          {school.name}
                        </p>
                      ))}

                      {selectedSchools.length > 12 ? (
                        <p className="px-1 text-xs font-semibold text-gray-500">
                          Y {selectedSchools.length - 12} colegio(s) más.
                        </p>
                      ) : null}
                    </div>
                  )}
                </div>

                {errorMessage ? (
                  <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-800">
                    {errorMessage}
                  </div>
                ) : null}

                <div className="mt-5 space-y-4">
                  <label className="block">
                    <span className="text-sm font-black text-gray-800">
                      Equipo comercial
                    </span>
                    <select
                      value={teamId}
                      onChange={handleTeamChange}
                      disabled={loadingTeams || saving}
                      className="mt-1.5 w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm font-bold text-gray-950 outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-100 disabled:bg-gray-100"
                    >
                      <option value="">Sin equipo comercial</option>
                      {teams.map((team) => (
                        <option key={team.id} value={team.id}>
                          {team.name}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="block">
                    <span className="text-sm font-black text-gray-800">
                      Asesor responsable
                    </span>
                    <select
                      value={ownerId}
                      onChange={(event) => setOwnerId(event.target.value)}
                      disabled={!teamId || loadingTeams || saving}
                      className="mt-1.5 w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm font-bold text-gray-950 outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-100 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-400"
                    >
                      <option value="">Sin asesor asignado</option>
                      {advisors.map((advisor) => (
                        <option key={advisor.id} value={advisor.id}>
                          {userLabel(advisor)}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-900">
                  La asignación quedará registrada en la ficha del colegio y
                  será utilizada por las nuevas oportunidades comerciales.
                  Las oportunidades que ya están abiertas conservan su
                  responsable actual.
                </div>
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
                  disabled={saving || loadingTeams}
                  className="rounded-xl bg-red-700 px-4 py-2.5 text-sm font-black text-white transition hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving ? "Guardando..." : "Guardar asignación"}
                </button>
              </div>
            </form>
          </aside>
        </div>
      ) : null}
    </>
  );
}
