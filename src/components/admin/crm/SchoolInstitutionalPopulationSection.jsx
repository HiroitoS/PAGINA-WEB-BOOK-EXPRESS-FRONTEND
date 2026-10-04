import { useEffect, useMemo, useState } from "react";
import {
  FaChartBar,
  FaEdit,
  FaPlus,
  FaSave,
  FaTimes,
} from "react-icons/fa";

import {
  getCRMSchool,
  getCRMReferenceGrades,
  getCRMReferenceLevels,
  updateCRMSchoolInstitutionalPopulation,
} from "../../../api/crmApi";

const CURRENT_YEAR = new Date().getFullYear();

const LEVEL_ORDER = {
  inicial: 0,
  primaria: 1,
  secundaria: 2,
};

const STATUS_OPTIONS = [
  { value: "known", label: "Con población registrada" },
  { value: "pending", label: "Dato pendiente" },
  { value: "not_applicable", label: "No aplica" },
];

let temporaryRowCounter = 0;
let temporaryDetailCounter = 0;

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
      .flatMap((value) =>
        value && typeof value === "object"
          ? Object.values(value)
          : [value],
      )
      .filter((value) => typeof value === "string" && value.trim());

    if (messages.length > 0) {
      return messages.join(" ");
    }
  }

  return fallback;
}

function createDetailRow(detail) {
  return {
    clientId: `detail-${detail.id}`,
    id: detail.id,
    gradeId: String(detail.grade?.id || ""),
    gradeName: detail.grade?.name || "Grado no registrado",
    sectionCount: String(detail.section_count ?? ""),
    studentsPerSection: String(detail.students_per_section ?? ""),
  };
}

function createEmptyDetail() {
  temporaryDetailCounter += 1;

  return {
    clientId: `new-detail-${temporaryDetailCounter}`,
    id: null,
    gradeId: "",
    gradeName: "",
    sectionCount: "",
    studentsPerSection: "",
  };
}

function createPopulationRow(item) {
  return {
    clientId: `level-${item.level?.id || item.service_id || "unknown"}`,
    serviceId: item.service_id ?? null,
    isExisting: true,
    levelId: String(item.level?.id || ""),
    levelName: item.level?.name || "Nivel no registrado",
    populationYear: String(item.year || CURRENT_YEAR),
    studentCount:
      item.student_count != null
        ? String(item.student_count)
        : "",
    status: item.status || "pending",
    hasPendingData: Boolean(item.has_pending_data),
    details: Array.isArray(item.details)
      ? item.details.map(createDetailRow)
      : [],
  };
}

function getDefaultPopulationYear(school) {
  const years = (Array.isArray(school?.institutional_population)
    ? school.institutional_population
    : []
  )
    .map((item) => Number(item.year))
    .filter(
      (year) =>
        Number.isInteger(year) &&
        year >= 2000 &&
        year <= 2100,
    );

  return years.length > 0 ? Math.max(...years) : CURRENT_YEAR;
}

function createEmptyRow(defaultYear = CURRENT_YEAR) {
  temporaryRowCounter += 1;

  return {
    clientId: `new-level-${temporaryRowCounter}`,
    serviceId: null,
    isExisting: false,
    levelId: "",
    levelName: "",
    populationYear: String(defaultYear),
    studentCount: "",
    status: "pending",
    hasPendingData: false,
    details: [],
  };
}

function buildRows(school) {
  if (!Array.isArray(school?.institutional_population)) {
    return [];
  }

  return school.institutional_population.map(createPopulationRow);
}

function calculateDetailTotal(detail) {
  const sections = Number(detail.sectionCount);
  const studentsPerSection = Number(detail.studentsPerSection);

  if (
    !Number.isInteger(sections) ||
    sections <= 0 ||
    !Number.isInteger(studentsPerSection) ||
    studentsPerSection <= 0
  ) {
    return 0;
  }

  return sections * studentsPerSection;
}

function calculateRowTotal(row) {
  if (row.status !== "known") {
    return null;
  }

  if (row.details.length > 0) {
    return row.details.reduce(
      (total, detail) => total + calculateDetailTotal(detail),
      0,
    );
  }

  if (row.studentCount === "") {
    return null;
  }

  const studentCount = Number(row.studentCount);

  return Number.isInteger(studentCount) && studentCount >= 0
    ? studentCount
    : null;
}

function formatPopulation(value) {
  return new Intl.NumberFormat("es-PE").format(value);
}

function statusLabel(status) {
  return (
    STATUS_OPTIONS.find((option) => option.value === status)?.label ||
    "Dato pendiente"
  );
}

export default function SchoolInstitutionalPopulationSection({
  school,
  onSchoolUpdated,
  embedded = false,
}) {
  const [levels, setLevels] = useState([]);
  const [grades, setGrades] = useState([]);
  const [rows, setRows] = useState(() => buildRows(school));
  const [editing, setEditing] = useState(false);
  const [loadingReferences, setLoadingReferences] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    let ignore = false;

    async function loadReferences() {
      try {
        const [levelData, gradeData] = await Promise.all([
          getCRMReferenceLevels(),
          getCRMReferenceGrades(),
        ]);

        if (!ignore) {
          setLevels(levelData);
          setGrades(gradeData);
        }
      } catch (error) {
        if (!ignore) {
          setErrorMessage(
            getErrorMessage(
              error,
              "No se pudieron cargar los niveles y grados educativos.",
            ),
          );
        }
      } finally {
        if (!ignore) {
          setLoadingReferences(false);
        }
      }
    }

    loadReferences();

    return () => {
      ignore = true;
    };
  }, []);

  const availableLevels = useMemo(() => {
    return [...levels]
      .filter((level) => normalizeText(level.name) !== "sin nivel")
      .sort((a, b) => {
        const orderA = LEVEL_ORDER[normalizeText(a.name)] ?? 99;
        const orderB = LEVEL_ORDER[normalizeText(b.name)] ?? 99;

        if (orderA !== orderB) {
          return orderA - orderB;
        }

        return a.name.localeCompare(b.name, "es");
      });
  }, [levels]);

  const availableGrades = useMemo(() => {
    return [...grades].sort((a, b) => {
      const orderA = Number(a.order) || 0;
      const orderB = Number(b.order) || 0;

      if (orderA !== orderB) {
        return orderA - orderB;
      }

      return a.name.localeCompare(b.name, "es");
    });
  }, [grades]);

  const usedLevelIds = useMemo(
    () =>
      new Set(
        rows
          .map((row) => Number(row.levelId))
          .filter((levelId) => Number.isInteger(levelId) && levelId > 0),
      ),
    [rows],
  );

  const visibleRows = useMemo(() => {
    const sourceRows = editing ? rows : buildRows(school);

    return [...sourceRows].sort((a, b) => {
      const orderA = LEVEL_ORDER[normalizeText(a.levelName)] ?? 99;
      const orderB = LEVEL_ORDER[normalizeText(b.levelName)] ?? 99;

      if (orderA !== orderB) {
        return orderA - orderB;
      }

      return a.levelName.localeCompare(b.levelName, "es");
    });
  }, [editing, rows, school]);

  const knownRows = visibleRows.filter(
    (row) =>
      row.status === "known" &&
      calculateRowTotal(row) !== null,
  );

  const totalPopulation = knownRows.reduce(
    (total, row) => total + calculateRowTotal(row),
    0,
  );

  const pendingCount = visibleRows.filter(
    (row) =>
      row.status === "pending" ||
      row.hasPendingData,
  ).length;

  function startEditing() {
    setRows(buildRows(school));
    setErrorMessage("");
    setSuccessMessage("");
    setEditing(true);
  }

  function cancelEditing() {
    setRows(buildRows(school));
    setErrorMessage("");
    setEditing(false);
  }

  function updateRow(clientId, field, value) {
    setRows((currentRows) =>
      currentRows.map((row) => {
        if (row.clientId !== clientId) {
          return row;
        }

        const nextRow = {
          ...row,
          [field]: value,
        };

        if (field === "levelId") {
          const level = availableLevels.find(
            (item) => item.id === Number(value),
          );

          nextRow.levelName = level?.name || "";
        }

        if (field === "status") {
          nextRow.details =
            value === "known" ? row.details : [];

          if (value !== "known") {
            nextRow.studentCount = "";
          }
        }

        return nextRow;
      }),
    );
  }

  function updateDetail(rowClientId, detailClientId, field, value) {
    setRows((currentRows) =>
      currentRows.map((row) => {
        if (row.clientId !== rowClientId) {
          return row;
        }

        return {
          ...row,
          details: row.details.map((detail) =>
            detail.clientId === detailClientId
              ? { ...detail, [field]: value }
              : detail,
          ),
        };
      }),
    );
  }

  function addLevelRow() {
    setRows((currentRows) => [
      ...currentRows,
      createEmptyRow(getDefaultPopulationYear(school)),
    ]);
  }

  function removeNewRow(clientId) {
    setRows((currentRows) =>
      currentRows.filter((row) => row.clientId !== clientId),
    );
  }

  function addDetailRow(clientId) {
    setRows((currentRows) =>
      currentRows.map((row) =>
        row.clientId === clientId
          ? {
              ...row,
              status: "known",
              details: [...row.details, createEmptyDetail()],
            }
          : row,
      ),
    );
  }

  function removeDetailRow(rowClientId, detailClientId) {
    setRows((currentRows) =>
      currentRows.map((row) => {
        if (row.clientId !== rowClientId) {
          return row;
        }

        return {
          ...row,
          details: row.details.filter(
            (detail) => detail.clientId !== detailClientId,
          ),
        };
      }),
    );
  }

  function validateRows() {
    if (rows.length === 0) {
      return "Registra al menos un nivel educativo.";
    }

    const levelIds = rows.map((row) => Number(row.levelId));

    if (
      levelIds.some(
        (levelId) => !Number.isInteger(levelId) || levelId <= 0,
      )
    ) {
      return "Selecciona el nivel educativo de cada registro.";
    }

    if (new Set(levelIds).size !== levelIds.length) {
      return "No puedes registrar dos veces el mismo nivel educativo.";
    }

    for (const row of rows) {
      const year = Number(row.populationYear);

      if (!Number.isInteger(year) || year < 2000 || year > 2100) {
        return `Revisa el año de ${row.levelName || "uno de los niveles"}.`;
      }

      if (row.status !== "known") {
        continue;
      }

      if (row.details.length === 0) {
        const studentCount = Number(row.studentCount);

        if (
          row.studentCount === "" ||
          !Number.isInteger(studentCount) ||
          studentCount < 0
        ) {
          return `Registra la población de ${row.levelName} o márcala como pendiente.`;
        }

        continue;
      }

      const gradeIds = new Set();

      for (const detail of row.details) {
        const gradeId = Number(detail.gradeId);
        const sectionCount = Number(detail.sectionCount);
        const studentsPerSection = Number(
          detail.studentsPerSection,
        );

        if (
          !Number.isInteger(gradeId) ||
          gradeId <= 0 ||
          !Number.isInteger(sectionCount) ||
          sectionCount <= 0 ||
          !Number.isInteger(studentsPerSection) ||
          studentsPerSection <= 0
        ) {
          return `Completa correctamente el desglose por grado de ${row.levelName}.`;
        }

        if (gradeIds.has(gradeId)) {
          return `No repitas el mismo grado dentro de ${row.levelName}.`;
        }

        gradeIds.add(gradeId);
      }
    }

    return "";
  }

  async function saveChanges() {
    const validationError = validateRows();

    if (validationError) {
      setErrorMessage(validationError);
      return;
    }

    setSaving(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const payload = {
        levels: rows.map((row) => ({
          level: Number(row.levelId),
          year: Number(row.populationYear),
          is_active: row.status !== "not_applicable",
          student_count:
            row.status === "known"
              ? calculateRowTotal(row)
              : null,
          details:
            row.status === "known"
              ? row.details.map((detail) => ({
                  grade: Number(detail.gradeId),
                  section_count: Number(detail.sectionCount),
                  students_per_section: Number(
                    detail.studentsPerSection,
                  ),
                }))
              : [],
        })),
      };

      await updateCRMSchoolInstitutionalPopulation(
        school.id,
        payload,
      );

      const refreshedSchool = await getCRMSchool(school.id);

      onSchoolUpdated?.(refreshedSchool);
      setRows(buildRows(refreshedSchool));
      setSuccessMessage(
        "La población del colegio se actualizó correctamente.",
      );
      setEditing(false);
    } catch (error) {
      setErrorMessage(
        getErrorMessage(
          error,
          "No se pudo actualizar la población del colegio.",
        ),
      );
    } finally {
      setSaving(false);
    }
  }

  const wrapperClass = embedded
    ? "min-w-0"
    : "rounded-3xl border border-gray-200 bg-white p-5 shadow-sm";

  return (
    <section className={wrapperClass}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-black uppercase tracking-wide text-red-700">
            Población escolar
          </p>

          <h3 className="mt-1 text-xl font-black text-gray-950">
            Información vigente del colegio
          </h3>

          <p className="mt-1 max-w-2xl text-sm leading-6 text-gray-500">
            Consulta la población institucional por nivel. Las direcciones del
            colegio se gestionan por separado y no duplican este total.
          </p>
        </div>

        <button
          type="button"
          onClick={startEditing}
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-gray-950 px-4 py-2.5 text-sm font-black text-white transition hover:bg-gray-800"
        >
          <FaEdit />
          Gestionar
        </button>
      </div>

      {errorMessage && !editing ? (
        <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-3 text-sm leading-6 text-red-800">
          {errorMessage}
        </div>
      ) : null}

      {successMessage ? (
        <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-sm leading-6 text-emerald-800">
          {successMessage}
        </div>
      ) : null}

      {visibleRows.length > 0 ? (
        <>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {visibleRows.map((row) => {
              const population = calculateRowTotal(row);

              return (
                <article
                  key={row.clientId}
                  className="rounded-2xl border border-gray-200 bg-white p-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-black text-gray-950">
                      {row.levelName}
                    </p>
                    <FaChartBar className="text-gray-400" />
                  </div>

                  <p className="mt-3 text-2xl font-black text-gray-950">
                    {population === null
                      ? row.status === "not_applicable"
                        ? "No aplica"
                        : "Pendiente"
                      : formatPopulation(population)}
                  </p>

                  <p className="mt-1 text-xs font-semibold text-gray-500">
                    {population === null
                      ? statusLabel(row.status)
                      : "alumnos registrados"}
                  </p>

                  {row.hasPendingData ? (
                    <p className="mt-2 text-xs font-bold text-amber-700">
                      Hay información por completar.
                    </p>
                  ) : null}
                </article>
              );
            })}

            <article className="rounded-2xl bg-gray-950 p-4 text-white">
              <p className="text-xs font-bold uppercase tracking-wide text-gray-300">
                Población registrada
              </p>
              <p className="mt-3 text-2xl font-black">
                {formatPopulation(totalPopulation)}
              </p>
              <p className="mt-1 text-xs font-semibold text-gray-300">
                alumnos considerados
              </p>
            </article>
          </div>

          {pendingCount > 0 ? (
            <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-800">
              Hay {pendingCount} nivel(es) con información pendiente o parcial.
              Esos datos no se suman como cero y pueden completarse después.
            </div>
          ) : null}
        </>
      ) : (
        <div className="mt-5 rounded-2xl border border-dashed border-gray-300 bg-gray-50 px-5 py-10 text-center">
          <p className="font-black text-gray-950">
            Aún no hay población registrada
          </p>
          <p className="mt-1 text-sm leading-6 text-gray-500">
            Puedes registrar Inicial, Primaria o Secundaria cuando cuentes con
            la información del colegio.
          </p>
        </div>
      )}

      {editing ? (
        <div className="fixed inset-0 z-50">
          <button
            type="button"
            aria-label="Cerrar gestión de población"
            onClick={cancelEditing}
            className="absolute inset-0 bg-gray-950/25 backdrop-blur-sm"
          />

          <aside className="absolute inset-y-0 right-0 w-full max-w-4xl overflow-y-auto border-l border-gray-200 bg-white shadow-2xl">
            <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-gray-200 bg-white px-5 py-4">
              <div>
                <p className="text-xs font-black uppercase tracking-wide text-red-700">
                  Población escolar
                </p>
                <h3 className="mt-1 text-xl font-black text-gray-950">
                  Gestionar población
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  Registra la población institucional por nivel y campaña.
                </p>
              </div>

              <button
                type="button"
                onClick={cancelEditing}
                disabled={saving}
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-600 transition hover:bg-gray-100 hover:text-gray-950 disabled:cursor-not-allowed disabled:opacity-50"
                aria-label="Cerrar"
              >
                <FaTimes />
              </button>
            </div>

            <div className="space-y-4 p-5">
              {errorMessage ? (
                <div className="rounded-2xl border border-red-200 bg-red-50 p-3 text-sm leading-6 text-red-800">
                  {errorMessage}
                </div>
              ) : null}

              {rows.map((row) => {
                const selectedGradeIds = new Set(
                  row.details
                    .map((detail) => Number(detail.gradeId))
                    .filter(
                      (gradeId) =>
                        Number.isInteger(gradeId) && gradeId > 0,
                    ),
                );

                return (
                  <article
                    key={row.clientId}
                    className="rounded-2xl border border-gray-200 bg-gray-50 p-4"
                  >
                    <div className="grid gap-3 md:grid-cols-3">
                      <div>
                        <label className="text-xs font-black uppercase tracking-wide text-gray-500">
                          Nivel educativo
                        </label>

                        {row.isExisting ? (
                          <div className="mt-2 rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm font-black text-gray-900">
                            {row.levelName || "Nivel por definir"}
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
                            disabled={loadingReferences}
                            className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm font-semibold text-gray-900 outline-none transition focus:border-red-500"
                          >
                            <option value="">Seleccionar nivel</option>
                            {availableLevels.map((level) => (
                              <option
                                key={level.id}
                                value={level.id}
                                disabled={
                                  usedLevelIds.has(level.id) &&
                                  Number(row.levelId) !== level.id
                                }
                              >
                                {level.name}
                              </option>
                            ))}
                          </select>
                        )}
                      </div>

                      <div>
                        <label className="text-xs font-black uppercase tracking-wide text-gray-500">
                          Año / campaña
                        </label>
                        <input
                          type="number"
                          min="2000"
                          max="2100"
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

                      <div>
                        <label className="text-xs font-black uppercase tracking-wide text-gray-500">
                          Estado del dato
                        </label>
                        <select
                          value={row.status}
                          onChange={(event) =>
                            updateRow(
                              row.clientId,
                              "status",
                              event.target.value,
                            )
                          }
                          className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm font-semibold text-gray-900 outline-none transition focus:border-red-500"
                        >
                          {STATUS_OPTIONS.map((option) => (
                            <option
                              key={option.value}
                              value={option.value}
                            >
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {row.status === "known" ? (
                      <>
                        {row.details.length > 0 ? (
                          <div className="mt-4 overflow-x-auto rounded-2xl border border-gray-200 bg-white">
                            <table className="min-w-full divide-y divide-gray-200 text-sm">
                              <thead className="bg-gray-50">
                                <tr>
                                  <th className="px-3 py-2 text-left text-xs font-black uppercase tracking-wide text-gray-500">
                                    Grado
                                  </th>
                                  <th className="px-3 py-2 text-center text-xs font-black uppercase tracking-wide text-gray-500">
                                    Secciones
                                  </th>
                                  <th className="px-3 py-2 text-center text-xs font-black uppercase tracking-wide text-gray-500">
                                    Alumnos / sección
                                  </th>
                                  <th className="px-3 py-2 text-right text-xs font-black uppercase tracking-wide text-gray-500">
                                    Total
                                  </th>
                                  <th className="px-3 py-2 text-right text-xs font-black uppercase tracking-wide text-gray-500">
                                    Acción
                                  </th>
                                </tr>
                              </thead>

                              <tbody className="divide-y divide-gray-100">
                                {row.details.map((detail) => (
                                  <tr key={detail.clientId}>
                                    <td className="min-w-52 px-3 py-2">
                                      <select
                                        value={detail.gradeId}
                                        onChange={(event) =>
                                          updateDetail(
                                            row.clientId,
                                            detail.clientId,
                                            "gradeId",
                                            event.target.value,
                                          )
                                        }
                                        disabled={loadingReferences}
                                        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 font-semibold text-gray-900 outline-none transition focus:border-red-500"
                                      >
                                        <option value="">
                                          Seleccionar grado
                                        </option>
                                        {availableGrades.map((grade) => {
                                          const usedByAnotherDetail =
                                            selectedGradeIds.has(grade.id) &&
                                            Number(detail.gradeId) !==
                                              grade.id;

                                          return (
                                            <option
                                              key={grade.id}
                                              value={grade.id}
                                              disabled={usedByAnotherDetail}
                                            >
                                              {grade.name}
                                            </option>
                                          );
                                        })}
                                      </select>
                                    </td>

                                    <td className="px-3 py-2">
                                      <input
                                        type="number"
                                        min="1"
                                        value={detail.sectionCount}
                                        onChange={(event) =>
                                          updateDetail(
                                            row.clientId,
                                            detail.clientId,
                                            "sectionCount",
                                            event.target.value,
                                          )
                                        }
                                        className="w-28 rounded-lg border border-gray-300 bg-white px-3 py-2 text-center font-semibold text-gray-900 outline-none transition focus:border-red-500"
                                      />
                                    </td>

                                    <td className="px-3 py-2">
                                      <input
                                        type="number"
                                        min="1"
                                        value={detail.studentsPerSection}
                                        onChange={(event) =>
                                          updateDetail(
                                            row.clientId,
                                            detail.clientId,
                                            "studentsPerSection",
                                            event.target.value,
                                          )
                                        }
                                        className="w-36 rounded-lg border border-gray-300 bg-white px-3 py-2 text-center font-semibold text-gray-900 outline-none transition focus:border-red-500"
                                      />
                                    </td>

                                    <td className="px-3 py-2 text-right font-black text-gray-950">
                                      {calculateDetailTotal(detail)}
                                    </td>

                                    <td className="px-3 py-2 text-right">
                                      <button
                                        type="button"
                                        onClick={() =>
                                          removeDetailRow(
                                            row.clientId,
                                            detail.clientId,
                                          )
                                        }
                                        className="inline-flex items-center gap-2 rounded-lg px-2 py-2 text-xs font-black text-red-700 transition hover:bg-red-50"
                                      >
                                        <FaTimes />
                                        Quitar
                                      </button>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>

                              <tfoot className="bg-gray-50">
                                <tr>
                                  <td
                                    colSpan="3"
                                    className="px-3 py-2 text-right text-sm font-black text-gray-600"
                                  >
                                    Total del nivel
                                  </td>
                                  <td className="px-3 py-2 text-right font-black text-gray-950">
                                    {formatPopulation(
                                      calculateRowTotal(row) || 0,
                                    )}
                                  </td>
                                  <td />
                                </tr>
                              </tfoot>
                            </table>
                          </div>
                        ) : (
                          <div className="mt-4 rounded-2xl border border-gray-200 bg-white p-4">
                            <div className="grid gap-3 sm:grid-cols-2 sm:items-end">
                              <div>
                                <label className="text-xs font-black uppercase tracking-wide text-gray-500">
                                  Población total del nivel
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
                                  placeholder="Cantidad de alumnos"
                                  className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm font-semibold text-gray-900 outline-none transition focus:border-red-500"
                                />
                                <p className="mt-2 text-xs leading-5 text-gray-500">
                                  El cero significa que el dato fue validado y
                                  no hay alumnos en ese nivel.
                                </p>
                              </div>

                              <button
                                type="button"
                                onClick={() =>
                                  addDetailRow(row.clientId)
                                }
                                className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-black text-gray-800 transition hover:border-red-300 hover:text-red-700"
                              >
                                <FaPlus />
                                Desglosar por grado
                              </button>
                            </div>
                          </div>
                        )}

                        {row.details.length > 0 ? (
                          <div className="mt-3 flex justify-end">
                            <button
                              type="button"
                              onClick={() => addDetailRow(row.clientId)}
                              className="inline-flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm font-black text-gray-700 transition hover:border-red-300 hover:text-red-700"
                            >
                              <FaPlus />
                              Agregar grado
                            </button>
                          </div>
                        ) : null}
                      </>
                    ) : (
                      <div className="mt-4 rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm leading-6 text-gray-600">
                        {row.status === "pending"
                          ? "El dato podrá completarse después. Mientras esté pendiente no se sumará como cero ni afectará negativamente la priorización."
                          : "Este nivel queda fuera de la población vigente del colegio para esta campaña."}
                      </div>
                    )}

                    {!row.isExisting ? (
                      <div className="mt-3 border-t border-gray-200 pt-3 text-right">
                        <button
                          type="button"
                          onClick={() => removeNewRow(row.clientId)}
                          className="inline-flex items-center gap-2 text-sm font-black text-red-700 hover:text-red-900"
                        >
                          <FaTimes />
                          Quitar nivel
                        </button>
                      </div>
                    ) : null}
                  </article>
                );
              })}

              <div className="flex flex-col gap-3 border-t border-gray-200 pt-4 sm:flex-row sm:items-center sm:justify-between">
                <button
                  type="button"
                  onClick={addLevelRow}
                  disabled={
                    loadingReferences ||
                    saving ||
                    usedLevelIds.size >= availableLevels.length
                  }
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
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-black text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <FaTimes />
                    Cancelar
                  </button>

                  <button
                    type="button"
                    onClick={saveChanges}
                    disabled={saving}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-700 px-4 py-2.5 text-sm font-black text-white transition hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <FaSave />
                    {saving ? "Guardando..." : "Guardar cambios"}
                  </button>
                </div>
              </div>
            </div>
          </aside>
        </div>
      ) : null}
    </section>
  );
}
