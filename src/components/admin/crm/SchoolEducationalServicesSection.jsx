import { useEffect, useMemo, useState } from "react";
import {
  FaBookOpen,
  FaEdit,
  FaPlus,
  FaSave,
  FaTimes,
  FaUsers,
} from "react-icons/fa";

import {
  createCRMSchoolEducationalService,
  createCRMSchoolPopulation,
  getCRMSchool,
  getCRMReferenceLevels,
  updateCRMSchoolEducationalService,
} from "../../../api/crmApi";

const CURRENT_YEAR = new Date().getFullYear();

const LEVEL_ORDER = {
  inicial: 0,
  primaria: 1,
  secundaria: 2,
};

let temporaryRowCounter = 0;

function normalizeText(value) {
  return String(value || "")
    .trim()
    .toLocaleLowerCase("es");
}

function getErrorMessage(error, fallback) {
  const data = error?.response?.data;

  if (typeof data?.detail === "string" && data.detail.trim()) {
    return data.detail;
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

function createServiceRow(service) {
  const population = service.latest_population;

  return {
    clientId: `service-${service.id}`,
    id: service.id,
    levelId: String(service.level?.id || ""),
    levelName: service.level?.name || "Nivel no registrado",
    modularCode: service.modular_code || "",
    isActive: Boolean(service.is_active),
    populationYear: String(population?.year || CURRENT_YEAR),
    studentCount:
      population?.student_count != null
        ? String(population.student_count)
        : "",
    originalModularCode: service.modular_code || "",
    originalIsActive: Boolean(service.is_active),
    originalPopulationYear: population?.year ?? null,
    originalStudentCount: population?.student_count ?? null,
  };
}

function createEmptyRow() {
  temporaryRowCounter += 1;

  return {
    clientId: `new-${temporaryRowCounter}`,
    id: null,
    levelId: "",
    levelName: "",
    modularCode: "",
    isActive: true,
    populationYear: String(CURRENT_YEAR),
    studentCount: "",
    originalModularCode: "",
    originalIsActive: true,
    originalPopulationYear: null,
    originalStudentCount: null,
  };
}

function buildRows(school) {
  if (!Array.isArray(school?.educational_services)) {
    return [];
  }

  return school.educational_services.map(createServiceRow);
}

function formatSegment(segment) {
  if (!segment || segment === "OUT") {
    return "Fuera del objetivo base";
  }

  return `Segmento ${segment}`;
}

function hasPopulationByLevel(school) {
  return Boolean(
    school?.educational_services?.some(
      (service) =>
        service.is_active &&
        service.latest_population?.student_count != null,
    ),
  );
}

export default function SchoolEducationalServicesSection({
  school,
  onSchoolUpdated,
}) {
  const [levels, setLevels] = useState([]);
  const [rows, setRows] = useState(() => buildRows(school));
  const [editing, setEditing] = useState(false);
  const [loadingLevels, setLoadingLevels] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    let ignore = false;

    async function loadLevels() {
      try {
        const data = await getCRMReferenceLevels();

        if (!ignore) {
          setLevels(data);
        }
      } catch (error) {
        if (!ignore) {
          setErrorMessage(
            getErrorMessage(
              error,
              "No se pudieron cargar los niveles educativos.",
            ),
          );
        }
      } finally {
        if (!ignore) {
          setLoadingLevels(false);
        }
      }
    }

    loadLevels();

    return () => {
      ignore = true;
    };
  }, []);

  const availableLevels = useMemo(() => {
    return [...levels]
      .filter((level) => normalizeText(level.name) !== "sin nivel")
      .sort((a, b) => {
        const nameA = normalizeText(a.name);
        const nameB = normalizeText(b.name);
        const orderA = LEVEL_ORDER[nameA] ?? 99;
        const orderB = LEVEL_ORDER[nameB] ?? 99;

        if (orderA !== orderB) {
          return orderA - orderB;
        }

        return a.name.localeCompare(b.name, "es");
      });
  }, [levels]);

  const selectedLevelIds = useMemo(
    () =>
      new Set(
        rows
          .map((row) => Number(row.levelId))
          .filter((value) => Number.isInteger(value) && value > 0),
      ),
    [rows],
  );

  const displayRows = editing ? rows : buildRows(school);

  const canAddLevel = availableLevels.some(
    (level) => !selectedLevelIds.has(level.id),
  );

  const populationByLevel = hasPopulationByLevel(school);
  const populationLabel = populationByLevel
    ? "Población por niveles"
    : "Población estimada";

  function startEditing() {
    const currentRows = buildRows(school);

    setRows(
      currentRows.length > 0
        ? currentRows
        : [createEmptyRow()],
    );
    setErrorMessage("");
    setSuccessMessage("");
    setEditing(true);
  }

  function cancelEditing() {
    setRows(buildRows(school));
    setErrorMessage("");
    setSuccessMessage("");
    setEditing(false);
  }

  function updateRow(clientId, field, value) {
    setRows((currentRows) =>
      currentRows.map((row) =>
        row.clientId === clientId
          ? {
              ...row,
              [field]: value,
            }
          : row,
      ),
    );
  }

  function addLevelRow() {
    if (!canAddLevel) {
      return;
    }

    setRows((currentRows) => [
      ...currentRows,
      createEmptyRow(),
    ]);
  }

  function removeNewRow(clientId) {
    setRows((currentRows) =>
      currentRows.filter((row) => row.clientId !== clientId),
    );
  }

  function validateRows() {
    const levelIds = [];
    const modularCodes = [];

    for (const row of rows) {
      const levelId = Number(row.levelId);

      if (!Number.isInteger(levelId) || levelId <= 0) {
        return "Selecciona un nivel educativo en todos los registros.";
      }

      levelIds.push(levelId);

      const modularCode = row.modularCode.trim().toLocaleLowerCase("es");

      if (modularCode) {
        modularCodes.push(modularCode);
      }

      if (
        row.originalStudentCount != null &&
        String(row.studentCount).trim() === ""
      ) {
        return (
          "La población vigente no se elimina dejando el campo vacío. " +
          "Registra un nuevo dato cuando corresponda."
        );
      }

      if (String(row.studentCount).trim() !== "") {
        const year = Number(row.populationYear);
        const studentCount = Number(row.studentCount);

        if (!Number.isInteger(year) || year <= 0) {
          return "El año de población debe ser válido.";
        }

        if (
          !Number.isInteger(studentCount) ||
          studentCount < 0
        ) {
          return "La cantidad de alumnos debe ser un número válido.";
        }
      }
    }

    if (new Set(levelIds).size !== levelIds.length) {
      return "No puedes registrar dos veces el mismo nivel educativo.";
    }

    if (new Set(modularCodes).size !== modularCodes.length) {
      return "Cada nivel debe tener un código modular diferente.";
    }

    return "";
  }

  async function saveChanges() {
    const validationMessage = validateRows();

    if (validationMessage) {
      setErrorMessage(validationMessage);
      return;
    }

    try {
      setSaving(true);
      setErrorMessage("");
      setSuccessMessage("");

      for (const row of rows) {
        let serviceId = row.id;
        const modularCode = row.modularCode.trim();

        if (row.id) {
          const serviceChanged =
            modularCode !== row.originalModularCode ||
            row.isActive !== row.originalIsActive;

          if (serviceChanged) {
            await updateCRMSchoolEducationalService(
              school.id,
              row.id,
              {
                modular_code: modularCode || null,
                is_active: row.isActive,
              },
            );
          }
        } else {
          const service = await createCRMSchoolEducationalService(
            school.id,
            {
              level: Number(row.levelId),
              modular_code: modularCode || null,
              is_active: row.isActive,
            },
          );

          serviceId = service.id;
        }

        if (String(row.studentCount).trim() !== "") {
          const year = Number(row.populationYear);
          const studentCount = Number(row.studentCount);

          const populationChanged =
            row.originalPopulationYear !== year ||
            row.originalStudentCount !== studentCount;

          if (populationChanged) {
            await createCRMSchoolPopulation(
              school.id,
              serviceId,
              {
                year,
                student_count: studentCount,
                source: "manual",
                source_detail: "",
              },
            );
          }
        }
      }

      const updatedSchool = await getCRMSchool(school.id);

      setRows(buildRows(updatedSchool));
      setEditing(false);
      setSuccessMessage("Los niveles educativos fueron actualizados.");

      if (onSchoolUpdated) {
        onSchoolUpdated(updatedSchool);
      }
    } catch (error) {
      setErrorMessage(
        getErrorMessage(
          error,
          "No se pudieron guardar los niveles educativos.",
        ),
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-wide text-red-700">
            Cobertura educativa
          </p>

          <h2 className="mt-1 text-xl font-black text-gray-950">
            Niveles educativos
          </h2>

          <p className="mt-1 max-w-2xl text-sm leading-6 text-gray-500">
            Gestiona nivel, código modular y población en un solo lugar.
          </p>
        </div>

        {!editing ? (
          <button
            type="button"
            onClick={startEditing}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-gray-950 px-4 py-2.5 text-sm font-black text-white transition hover:bg-red-700"
          >
            <FaEdit />
            {displayRows.length > 0
              ? "Editar niveles"
              : "Configurar niveles"}
          </button>
        ) : null}
      </div>

      {errorMessage ? (
        <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800">
          {errorMessage}
        </div>
      ) : null}

      {successMessage ? (
        <div className="mt-4 rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-semibold text-gray-800">
          {successMessage}
        </div>
      ) : null}

      {!editing ? (
        <>
          {displayRows.length > 0 ? (
            <div className="mt-4 overflow-hidden rounded-2xl border border-gray-200">
              <div className="hidden grid-cols-4 gap-3 bg-gray-50 px-4 py-3 text-xs font-black uppercase tracking-wide text-gray-500 lg:grid">
                <span>Nivel</span>
                <span>Código modular</span>
                <span>Población</span>
                <span>Estado</span>
              </div>

              <div className="divide-y divide-gray-200">
                {displayRows.map((row) => (
                  <div
                    key={row.clientId}
                    className="grid gap-3 px-4 py-3 lg:grid-cols-4 lg:items-center"
                  >
                    <div>
                      <p className="text-xs font-bold uppercase text-gray-400 lg:hidden">
                        Nivel
                      </p>
                      <p className="font-black text-gray-950">
                        {row.levelName}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs font-bold uppercase text-gray-400 lg:hidden">
                        Código modular
                      </p>
                      <p className="text-sm font-semibold text-gray-700">
                        {row.modularCode || "No registrado"}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs font-bold uppercase text-gray-400 lg:hidden">
                        Población
                      </p>

                      {row.studentCount !== "" ? (
                        <p className="text-sm font-black text-gray-950">
                          {row.studentCount} alumnos
                          <span className="ml-1 font-semibold text-gray-500">
                            · {row.populationYear}
                          </span>
                        </p>
                      ) : (
                        <p className="text-sm text-gray-500">
                          Sin registrar
                        </p>
                      )}
                    </div>

                    <div>
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-black ${
                          row.isActive
                            ? "bg-gray-950 text-white"
                            : "bg-gray-100 text-gray-500"
                        }`}
                      >
                        {row.isActive ? "Activo" : "Inactivo"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="mt-4 rounded-2xl border border-dashed border-gray-300 bg-gray-50 px-5 py-6 text-center">
              <FaBookOpen className="mx-auto text-gray-400" />

              <p className="mt-2 font-black text-gray-950">
                Sin niveles educativos registrados
              </p>

              <p className="mt-1 text-sm text-gray-500">
                Configura los niveles que atiende el colegio.
              </p>
            </div>
          )}

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl bg-gray-950 px-4 py-3 text-white">
              <div className="flex items-center gap-3">
                <FaUsers />

                <div>
                  <p className="text-xs font-bold uppercase text-gray-400">
                    {populationLabel}
                  </p>

                  <p className="mt-1 text-xl font-black">
                    {school.current_population_total ?? 0}
                  </p>
                </div>
              </div>

              {!populationByLevel && school.estimated_students != null ? (
                <p className="mt-2 text-xs leading-5 text-gray-400">
                  Dato general del colegio hasta registrar población por nivel.
                </p>
              ) : null}
            </div>

            <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3">
              <p className="text-xs font-bold uppercase text-gray-500">
                Segmentación comercial
              </p>

              <p className="mt-1 text-xl font-black text-gray-950">
                {formatSegment(school.segment)}
              </p>
            </div>
          </div>
        </>
      ) : (
        <div className="mt-4 space-y-3">
          {rows.map((row) => (
            <div
              key={row.clientId}
              className="rounded-2xl border border-gray-200 bg-gray-50 p-4"
            >
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <label className="text-xs font-black uppercase tracking-wide text-gray-500">
                    Nivel educativo
                  </label>

                  {row.id ? (
                    <div className="mt-2 rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm font-black text-gray-900">
                      {row.levelName}
                    </div>
                  ) : (
                    <select
                      value={row.levelId}
                      onChange={(event) =>
                        updateRow(
                          row.clientId,
                          "levelId",
                          event.target.value,
                        )
                      }
                      disabled={loadingLevels}
                      className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm font-semibold text-gray-900 outline-none transition focus:border-red-500"
                    >
                      <option value="">
                        Seleccionar nivel
                      </option>

                      {availableLevels.map((level) => {
                        const usedByAnotherRow =
                          selectedLevelIds.has(level.id) &&
                          Number(row.levelId) !== level.id;

                        return (
                          <option
                            key={level.id}
                            value={level.id}
                            disabled={usedByAnotherRow}
                          >
                            {level.name}
                          </option>
                        );
                      })}
                    </select>
                  )}
                </div>

                <div>
                  <label className="text-xs font-black uppercase tracking-wide text-gray-500">
                    Código modular
                  </label>

                  <input
                    type="text"
                    value={row.modularCode}
                    onChange={(event) =>
                      updateRow(
                        row.clientId,
                        "modularCode",
                        event.target.value,
                      )
                    }
                    placeholder="Ej. 1234567"
                    className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm font-semibold text-gray-900 outline-none transition focus:border-red-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-black uppercase tracking-wide text-gray-500">
                    Alumnos
                  </label>

                  <input
                    type="number"
                    min="0"
                    value={row.studentCount}
                    onChange={(event) =>
                      updateRow(
                        row.clientId,
                        "studentCount",
                        event.target.value,
                      )
                    }
                    placeholder="Cantidad"
                    className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm font-semibold text-gray-900 outline-none transition focus:border-red-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-black uppercase tracking-wide text-gray-500">
                    Año de población
                  </label>

                  <input
                    type="number"
                    min="1"
                    value={row.populationYear}
                    onChange={(event) =>
                      updateRow(
                        row.clientId,
                        "populationYear",
                        event.target.value,
                      )
                    }
                    className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm font-semibold text-gray-900 outline-none transition focus:border-red-500"
                  />
                </div>
              </div>

              <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-gray-200 pt-3">
                <label className="inline-flex items-center gap-2 text-sm font-bold text-gray-700">
                  <input
                    type="checkbox"
                    checked={row.isActive}
                    onChange={(event) =>
                      updateRow(
                        row.clientId,
                        "isActive",
                        event.target.checked,
                      )
                    }
                    className="h-4 w-4 accent-red-700"
                  />
                  Nivel activo
                </label>

                {!row.id ? (
                  <button
                    type="button"
                    onClick={() => removeNewRow(row.clientId)}
                    className="inline-flex items-center gap-2 text-sm font-black text-red-700 hover:text-red-900"
                  >
                    <FaTimes />
                    Quitar nivel
                  </button>
                ) : null}
              </div>
            </div>
          ))}

          <div className="flex flex-col gap-3 border-t border-gray-200 pt-4 sm:flex-row sm:items-center sm:justify-between">
            <button
              type="button"
              onClick={addLevelRow}
              disabled={!canAddLevel || loadingLevels || saving}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-black text-gray-800 transition hover:border-red-300 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <FaPlus />
              Agregar nivel
            </button>

            <div className="flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                onClick={cancelEditing}
                disabled={saving}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-black text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
              >
                <FaTimes />
                Cancelar
              </button>

              <button
                type="button"
                onClick={saveChanges}
                disabled={saving}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-700 px-4 py-2.5 text-sm font-black text-white transition hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <FaSave />
                {saving ? "Guardando..." : "Guardar cambios"}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
