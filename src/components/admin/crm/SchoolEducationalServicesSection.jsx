import { useEffect, useMemo, useState } from "react";
import {
  FaBookOpen,
  FaEdit,
  FaPlus,
  FaSave,
  FaTimes,
} from "react-icons/fa";

import {
  createCRMSchoolEducationalService,
  createCRMSchoolPopulation,
  getCRMSchool,
  getCRMReferenceGrades,
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

function getDetailsSignature(details) {
  return JSON.stringify(
    details
      .map((detail) => ({
        gradeId: Number(detail.gradeId),
        sectionCount: Number(detail.sectionCount),
        studentsPerSection: Number(detail.studentsPerSection),
      }))
      .sort((a, b) => a.gradeId - b.gradeId),
  );
}

function createServiceRow(service) {
  const population = service.latest_population;
  const details = Array.isArray(population?.details)
    ? population.details.map(createDetailRow)
    : [];

  return {
    clientId: `service-${service.id}`,
    id: service.id,
    campusId: String(service.campus?.id || ""),
    campusName: service.campus?.name || "Sede no registrada",
    campusCode: service.campus?.book_express_code || "",
    campusAddress: service.campus?.address || "",
    levelId: String(service.level?.id || ""),
    levelName: service.level?.name || "Nivel no registrado",
    isActive: Boolean(service.is_active),
    populationYear: String(population?.year || CURRENT_YEAR),
    studentCount:
      population?.student_count != null
        ? String(population.student_count)
        : "",
    details,
    originalCampusId: String(service.campus?.id || ""),
    originalIsActive: Boolean(service.is_active),
    originalPopulationYear: population?.year ?? null,
    originalStudentCount: population?.student_count ?? null,
    originalDetailsSignature: getDetailsSignature(details),
  };
}

function createEmptyRow(defaultCampusId = "") {
  temporaryRowCounter += 1;

  return {
    clientId: `new-${temporaryRowCounter}`,
    id: null,
    campusId: String(defaultCampusId || ""),
    campusName: "",
    campusCode: "",
    campusAddress: "",
    levelId: "",
    levelName: "",
    isActive: true,
    populationYear: String(CURRENT_YEAR),
    studentCount: "",
    details: [],
    originalIsActive: true,
    originalPopulationYear: null,
    originalStudentCount: null,
    originalDetailsSignature: "[]",
  };
}

function buildRows(school) {
  if (!Array.isArray(school?.educational_services)) {
    return [];
  }

  return school.educational_services.map(createServiceRow);
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
  if (row.details.length > 0) {
    return row.details.reduce(
      (total, detail) => total + calculateDetailTotal(detail),
      0,
    );
  }

  const studentCount = Number(row.studentCount);

  return Number.isFinite(studentCount) ? studentCount : 0;
}

export default function SchoolEducationalServicesSection({
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

  const campuses = useMemo(
    () =>
      (Array.isArray(school?.campuses) ? school.campuses : [])
        .filter((campus) => campus.is_active)
        .sort((a, b) => {
          const sequenceDifference =
            Number(a.sequence || 0) - Number(b.sequence || 0);

          if (sequenceDifference !== 0) {
            return sequenceDifference;
          }

          return Number(a.id || 0) - Number(b.id || 0);
        }),
    [school],
  );

  const selectedCampusLevelKeys = useMemo(
    () =>
      new Set(
        rows
          .filter(
            (row) =>
              Number(row.campusId) > 0 &&
              Number(row.levelId) > 0,
          )
          .map(
            (row) =>
              `${Number(row.campusId)}:${Number(row.levelId)}`,
          ),
      ),
    [rows],
  );

  const displayRows = editing ? rows : buildRows(school);

  const activePopulationRows = displayRows.filter(
    (row) =>
      row.isActive &&
      (row.studentCount !== "" || row.details.length > 0),
  );

  const currentPopulationTotal = activePopulationRows.reduce(
    (total, row) => total + calculateRowTotal(row),
    0,
  );

  const populationYears = [
    ...new Set(
      activePopulationRows
        .map((row) => Number(row.populationYear))
        .filter((year) => Number.isInteger(year) && year > 0),
    ),
  ];

  const campaignLabel =
    populationYears.length === 1
      ? `Campaña ${populationYears[0]}`
      : populationYears.length > 1
        ? "Vigencia por nivel"
        : `Campaña ${CURRENT_YEAR}`;

  const campusTotals = useMemo(() => {
    const totals = new Map();

    for (const row of activePopulationRows) {
      const key = row.campusId || "sin-sede";
      const campus = campuses.find(
        (item) => String(item.id) === String(row.campusId),
      );

      if (!totals.has(key)) {
        totals.set(key, {
          id: key,
          name:
            campus?.name ||
            row.campusName ||
            "Sede no registrada",
          code: campus?.book_express_code || row.campusCode || "",
          address:
            campus?.address ||
            row.campusAddress ||
            "Dirección pendiente",
          total: 0,
        });
      }

      totals.get(key).total += calculateRowTotal(row);
    }

    return [...totals.values()];
  }, [activePopulationRows, campuses]);

  const canAddLevel =
    campuses.length > 0 &&
    campuses.some((campus) =>
      availableLevels.some(
        (level) =>
          !selectedCampusLevelKeys.has(
            `${campus.id}:${level.id}`,
          ),
      ),
    );

  function startEditing() {
    const currentRows = buildRows(school);
    const defaultCampusId = campuses[0]?.id || "";

    setRows(
      currentRows.length > 0
        ? currentRows
        : [createEmptyRow(defaultCampusId)],
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

    const defaultCampus = campuses.find((campus) =>
      availableLevels.some(
        (level) =>
          !selectedCampusLevelKeys.has(
            `${campus.id}:${level.id}`,
          ),
      ),
    );

    setRows((currentRows) => [
      ...currentRows,
      createEmptyRow(defaultCampus?.id || campuses[0]?.id || ""),
    ]);
  }

  function removeNewRow(clientId) {
    setRows((currentRows) =>
      currentRows.filter((row) => row.clientId !== clientId),
    );
  }

  function addDetailRow(serviceClientId) {
    setRows((currentRows) =>
      currentRows.map((row) =>
        row.clientId === serviceClientId
          ? {
              ...row,
              details: [...row.details, createEmptyDetail()],
            }
          : row,
      ),
    );
  }

  function updateDetail(
    serviceClientId,
    detailClientId,
    field,
    value,
  ) {
    setRows((currentRows) =>
      currentRows.map((row) =>
        row.clientId === serviceClientId
          ? {
              ...row,
              details: row.details.map((detail) =>
                detail.clientId === detailClientId
                  ? {
                      ...detail,
                      [field]: value,
                    }
                  : detail,
              ),
            }
          : row,
      ),
    );
  }

  function removeDetailRow(serviceClientId, detailClientId) {
    setRows((currentRows) =>
      currentRows.map((row) =>
        row.clientId === serviceClientId
          ? {
              ...row,
              details: row.details.filter(
                (detail) => detail.clientId !== detailClientId,
              ),
            }
          : row,
      ),
    );
  }

  function validateRows() {
    const campusLevelKeys = [];

    for (const row of rows) {
      const campusId = Number(row.campusId);
      const levelId = Number(row.levelId);

      if (!Number.isInteger(campusId) || campusId <= 0) {
        return "Selecciona una sede en todos los registros.";
      }

      if (!Number.isInteger(levelId) || levelId <= 0) {
        return "Selecciona un nivel educativo en todos los registros.";
      }

      campusLevelKeys.push(`${campusId}:${levelId}`);

      const hasPopulation =
        row.details.length > 0 ||
        String(row.studentCount).trim() !== "";

      if (hasPopulation) {
        const year = Number(row.populationYear);

        if (!Number.isInteger(year) || year <= 0) {
          return "El año de población debe ser válido.";
        }
      }

      if (row.details.length > 0) {
        const gradeIds = [];

        for (const detail of row.details) {
          const gradeId = Number(detail.gradeId);
          const sectionCount = Number(detail.sectionCount);
          const studentsPerSection = Number(
            detail.studentsPerSection,
          );

          if (!Number.isInteger(gradeId) || gradeId <= 0) {
            return "Selecciona el grado en todas las filas de población.";
          }

          if (
            !Number.isInteger(sectionCount) ||
            sectionCount <= 0
          ) {
            return "La cantidad de secciones debe ser mayor que cero.";
          }

          if (
            !Number.isInteger(studentsPerSection) ||
            studentsPerSection <= 0
          ) {
            return "Los alumnos por sección deben ser mayores que cero.";
          }

          gradeIds.push(gradeId);
        }

        if (new Set(gradeIds).size !== gradeIds.length) {
          return "No puedes registrar dos veces el mismo grado en un nivel.";
        }
      } else if (
        row.originalStudentCount != null &&
        String(row.studentCount).trim() === ""
      ) {
        return (
          "La población vigente no se elimina dejando el campo vacío. " +
          "Registra un nuevo dato cuando corresponda."
        );
      } else if (String(row.studentCount).trim() !== "") {
        const studentCount = Number(row.studentCount);

        if (!Number.isInteger(studentCount) || studentCount < 0) {
          return "La cantidad de alumnos debe ser un número válido.";
        }
      }
    }

    if (
      new Set(campusLevelKeys).size !== campusLevelKeys.length
    ) {
      return "No puedes registrar dos veces el mismo nivel en una misma sede.";
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

        if (row.id) {
          const serviceChanges = {};

          if (row.isActive !== row.originalIsActive) {
            serviceChanges.is_active = row.isActive;
          }

          if (row.campusId !== row.originalCampusId) {
            serviceChanges.campus = Number(row.campusId);
          }

          if (Object.keys(serviceChanges).length > 0) {
            await updateCRMSchoolEducationalService(
              school.id,
              row.id,
              serviceChanges,
            );
          }
        } else {
          const service = await createCRMSchoolEducationalService(
            school.id,
            {
              campus: Number(row.campusId),
              level: Number(row.levelId),
              is_active: row.isActive,
            },
          );

          serviceId = service.id;
        }

        const hasPopulation =
          row.details.length > 0 ||
          String(row.studentCount).trim() !== "";

        if (!hasPopulation) {
          continue;
        }

        const year = Number(row.populationYear);
        const detailsSignature = getDetailsSignature(row.details);
        const studentCount =
          row.details.length > 0
            ? calculateRowTotal(row)
            : Number(row.studentCount);

        const populationChanged =
          row.originalPopulationYear !== year ||
          row.originalStudentCount !== studentCount ||
          row.originalDetailsSignature !== detailsSignature;

        if (!populationChanged) {
          continue;
        }

        const payload = {
          year,
          source: "manual",
          source_detail: "",
        };

        if (row.details.length > 0) {
          payload.details = row.details.map((detail) => ({
            grade: Number(detail.gradeId),
            section_count: Number(detail.sectionCount),
            students_per_section: Number(
              detail.studentsPerSection,
            ),
          }));
        } else {
          payload.student_count = studentCount;
        }

        await createCRMSchoolPopulation(
          school.id,
          serviceId,
          payload,
        );
      }

      const updatedSchool = await getCRMSchool(school.id);

      setRows(buildRows(updatedSchool));
      setEditing(false);
      setSuccessMessage("La población escolar fue actualizada.");

      if (onSchoolUpdated) {
        onSchoolUpdated(updatedSchool);
      }
    } catch (error) {
      setErrorMessage(
        getErrorMessage(
          error,
          "No se pudo actualizar la población escolar.",
        ),
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <section
      className={
        embedded
          ? "p-5"
          : "rounded-3xl border border-gray-200 bg-white p-5 shadow-sm"
      }
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <p className="text-xs font-black uppercase tracking-wide text-red-700">
              Población escolar
            </p>
            <span className="text-xs font-bold text-gray-500">
              {campaignLabel}
            </span>
          </div>

          <h2 className="mt-1 text-xl font-black text-gray-950">
            Información vigente del colegio
          </h2>

          <p className="mt-1 max-w-3xl text-sm leading-6 text-gray-500">
            Registra la población por sede, nivel, grado y secciones.
            El sistema conserva los subtotales de cada sede y calcula
            la población total del colegio.
          </p>
        </div>

        {!editing ? (
          <button
            type="button"
            onClick={startEditing}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-gray-950 px-4 py-2.5 text-sm font-black text-white transition hover:bg-red-700"
          >
            <FaEdit />
            Gestionar
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
        displayRows.length > 0 ? (
          <>
            <div className="mt-4 overflow-x-auto rounded-2xl border border-gray-200">
              <table className="min-w-full divide-y divide-gray-200 text-left text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-xs font-black uppercase tracking-wide text-gray-500">
                      Sede
                    </th>
                    <th className="px-4 py-3 text-xs font-black uppercase tracking-wide text-gray-500">
                      Nivel
                    </th>
                    <th className="px-4 py-3 text-xs font-black uppercase tracking-wide text-gray-500">
                      Grado
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-black uppercase tracking-wide text-gray-500">
                      Secciones
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-black uppercase tracking-wide text-gray-500">
                      Alumnos / sección
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-black uppercase tracking-wide text-gray-500">
                      Total
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-100 bg-white">
                  {displayRows.flatMap((row) => {
                    if (row.details.length > 0) {
                      return row.details.map((detail, index) => (
                        <tr key={detail.clientId}>
                          <td className="px-4 py-3">
                            {index === 0 ? (
                              <>
                                <p className="font-black text-gray-950">
                                  {row.campusName}
                                </p>
                                <p className="mt-1 text-xs text-gray-500">
                                  {row.campusAddress || row.campusCode || "Sin dirección registrada"}
                                </p>
                              </>
                            ) : null}
                          </td>
                          <td className="px-4 py-3 font-black text-gray-950">
                            {index === 0 ? row.levelName : ""}
                            {index === 0 && !row.isActive ? (
                              <span className="ml-2 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-black text-gray-500">
                                Inactivo
                              </span>
                            ) : null}
                          </td>
                          <td className="px-4 py-3 font-semibold text-gray-700">
                            {detail.gradeName}
                          </td>
                          <td className="px-4 py-3 text-center font-semibold text-gray-700">
                            {detail.sectionCount}
                          </td>
                          <td className="px-4 py-3 text-center font-semibold text-gray-700">
                            {detail.studentsPerSection}
                          </td>
                          <td className="px-4 py-3 text-right font-black text-gray-950">
                            {calculateDetailTotal(detail)}
                          </td>
                        </tr>
                      ));
                    }

                    return [
                      <tr key={row.clientId}>
                        <td className="px-4 py-3">
                          <p className="font-black text-gray-950">
                            {row.campusName}
                          </p>
                          <p className="mt-1 text-xs text-gray-500">
                            {row.campusAddress || row.campusCode || "Sin dirección registrada"}
                          </p>
                        </td>
                        <td className="px-4 py-3 font-black text-gray-950">
                          {row.levelName}
                          {!row.isActive ? (
                            <span className="ml-2 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-black text-gray-500">
                              Inactivo
                            </span>
                          ) : null}
                        </td>
                        <td className="px-4 py-3 text-gray-500">
                          Sin desglose
                        </td>
                        <td className="px-4 py-3 text-center text-gray-400">
                          —
                        </td>
                        <td className="px-4 py-3 text-center text-gray-400">
                          —
                        </td>
                        <td className="px-4 py-3 text-right font-black text-gray-950">
                          {row.studentCount !== ""
                            ? row.studentCount
                            : "—"}
                        </td>
                      </tr>,
                    ];
                  })}
                </tbody>
              </table>
            </div>

            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {campusTotals.map((campus) => (
                <div
                  key={campus.id}
                  className="rounded-xl bg-gray-50 px-4 py-3 ring-1 ring-gray-200"
                >
                  <p className="text-xs font-black uppercase tracking-wide text-gray-500">
                    {campus.name}
                  </p>
                  <p className="mt-1 text-xs font-semibold text-gray-500">
                    {campus.address}
                  </p>
                  <p className="mt-2 text-lg font-black leading-none text-gray-950">
                    {campus.total}
                  </p>
                  <p className="mt-1 text-xs font-bold text-gray-500">
                    alumnos registrados en la sede
                  </p>
                </div>
              ))}

              <div className="flex min-h-24 flex-col items-center justify-center rounded-xl bg-gray-950 px-3 py-3 text-center text-white">
                <span className="text-xs font-black uppercase tracking-wide text-gray-300">
                  Población total
                </span>
                <span className="mt-1 text-lg font-black leading-none">
                  {activePopulationRows.length > 0
                    ? currentPopulationTotal
                    : "—"}
                </span>
                <span className="mt-1 text-xs font-bold text-gray-300">
                  {activePopulationRows.length > 0
                    ? "alumnos"
                    : "Sin registrar"}
                </span>
              </div>
            </div>
          </>
        ) : (
          <div className="mt-4 rounded-2xl border border-dashed border-gray-300 bg-gray-50 px-5 py-6 text-center">
            <FaBookOpen className="mx-auto text-gray-400" />

            <p className="mt-2 font-black text-gray-950">
              Sin población registrada
            </p>

            <p className="mt-1 text-sm text-gray-500">
              Configura los niveles y registra su población escolar.
            </p>
          </div>
        )
      ) : (
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
                  Registra la sede, los niveles, grados, secciones y alumnos.
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
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  <div>
                    <label className="text-xs font-black uppercase tracking-wide text-gray-500">
                      Sede
                    </label>

                    {row.id ? (
                      <div className="mt-2 rounded-xl border border-gray-200 bg-white px-3 py-2.5">
                        <p className="text-sm font-black text-gray-900">
                          {row.campusName}
                        </p>
                        <p className="mt-1 text-xs text-gray-500">
                          {row.campusAddress || row.campusCode || "Sin dirección registrada"}
                        </p>
                      </div>
                    ) : (
                      <select
                        value={row.campusId}
                        onChange={(event) =>
                          updateRow(
                            row.clientId,
                            "campusId",
                            event.target.value,
                          )
                        }
                        className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm font-semibold text-gray-900 outline-none transition focus:border-red-500"
                      >
                        <option value="">Seleccionar sede</option>
                        {campuses.map((campus) => (
                          <option key={campus.id} value={campus.id}>
                            {campus.name} · {campus.address || campus.book_express_code}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>

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
                        disabled={loadingReferences}
                        className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm font-semibold text-gray-900 outline-none transition focus:border-red-500"
                      >
                        <option value="">
                          Seleccionar nivel
                        </option>

                        {availableLevels.map((level) => {
                          const candidateKey =
                            `${Number(row.campusId)}:${level.id}`;
                          const currentKey =
                            `${Number(row.campusId)}:${Number(row.levelId)}`;
                          const usedByAnotherRow =
                            selectedCampusLevelKeys.has(candidateKey) &&
                            candidateKey !== currentKey;

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
                      Año / campaña
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

                  <div className="flex items-end">
                    <label className="flex w-full items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm font-bold text-gray-700">
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
                  </div>
                </div>

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
                                    selectedGradeIds.has(
                                      grade.id,
                                    ) &&
                                    Number(detail.gradeId) !==
                                      grade.id;

                                  return (
                                    <option
                                      key={grade.id}
                                      value={grade.id}
                                      disabled={
                                        usedByAnotherDetail
                                      }
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
                            {calculateRowTotal(row)}
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
                          Puedes conservar el total actual o
                          desglosarlo por grado y secciones.
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

                {!row.id ? (
                  <div className="mt-3 border-t border-gray-200 pt-3 text-right">
                    <button
                      type="button"
                      onClick={() =>
                        removeNewRow(row.clientId)
                      }
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
                !canAddLevel ||
                loadingReferences ||
                saving
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
      )}
    </section>
  );
}
