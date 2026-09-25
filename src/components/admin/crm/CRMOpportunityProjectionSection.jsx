import { useEffect, useMemo, useState } from "react";
import {
  FaBook,
  FaEdit,
  FaLayerGroup,
  FaPlus,
  FaSave,
  FaSearch,
  FaTimes,
  FaTrashAlt,
  FaUsers,
} from "react-icons/fa";

import {
  getCRMOpportunityProjection,
  getCRMOpportunityProjectionBase,
  getCRMOpportunityProjectionProducts,
  saveCRMOpportunityProjection,
} from "../../../api/crmApi";

function formatCurrency(value) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return "S/ 0.00";
  }

  return new Intl.NumberFormat("es-PE", {
    style: "currency",
    currency: "PEN",
    minimumFractionDigits: 2,
  }).format(number);
}

function resolveErrorMessage(error, fallback) {
  const data = error?.response?.data;

  if (typeof data?.detail === "string") {
    return data.detail;
  }

  if (Array.isArray(data?.detail) && data.detail.length > 0) {
    return String(data.detail[0]);
  }

  if (data && typeof data === "object") {
    const firstValue = Object.values(data)[0];

    if (typeof firstValue === "string") {
      return firstValue;
    }

    if (Array.isArray(firstValue) && firstValue.length > 0) {
      return String(firstValue[0]);
    }
  }

  return fallback;
}

function buildDrafts(base, projection) {
  const currentGrades = new Map();
  const itemsByGradeLine = new Map();

  for (const gradeLine of projection?.grades || []) {
    currentGrades.set(
      `${gradeLine.service?.id}:${gradeLine.grade?.id}`,
      gradeLine,
    );
  }

  for (const item of projection?.items || []) {
    const key = String(item.grade_line_id);

    if (!itemsByGradeLine.has(key)) {
      itemsByGradeLine.set(key, []);
    }

    itemsByGradeLine.get(key).push({
      id: item.product?.id,
      name: item.product_name_snapshot || item.product?.name,
      editorial:
        item.provider_name_snapshot
        || item.product?.provider?.name
        || "Editorial",
      unitPrice: item.unit_price,
      quantity: item.quantity,
    });
  }

  const drafts = [];

  for (const service of base?.services || []) {
    const details = service.latest_population?.details || [];

    for (const detail of details) {
      const key = `${service.id}:${detail.grade.id}`;
      const current = currentGrades.get(key);

      drafts.push({
        key,
        serviceId: service.id,
        levelId: service.level?.id,
        levelName: service.level?.name || "Nivel",
        gradeId: detail.grade.id,
        gradeName: detail.grade.name,
        selected: Boolean(current),
        sectionCount:
          current?.section_count ?? detail.section_count ?? "",
        studentCount:
          current?.student_count ?? detail.student_count ?? "",
        products: current
          ? itemsByGradeLine.get(String(current.id)) || []
          : [],
      });
    }
  }

  for (const current of projection?.grades || []) {
    const key = `${current.service?.id}:${current.grade?.id}`;

    if (drafts.some((draft) => draft.key === key)) {
      continue;
    }

    drafts.push({
      key,
      serviceId: current.service?.id,
      levelId: current.service?.level?.id,
      levelName: current.service?.level?.name || current.level_name_snapshot,
      gradeId: current.grade?.id,
      gradeName: current.grade?.name || current.grade_name_snapshot,
      selected: true,
      sectionCount: current.section_count ?? "",
      studentCount: current.student_count ?? "",
      products: itemsByGradeLine.get(String(current.id)) || [],
    });
  }

  return drafts;
}

function getProjectionGroups(projection) {
  const groups = new Map();

  for (const gradeLine of projection?.grades || []) {
    const levelName =
      gradeLine.service?.level?.name
      || gradeLine.level_name_snapshot
      || "Nivel";

    if (!groups.has(levelName)) {
      groups.set(levelName, []);
    }

    const items = (projection?.items || []).filter(
      (item) => item.grade_line_id === gradeLine.id,
    );

    const subtotal = items.reduce(
      (sum, item) => sum + Number(item.subtotal || 0),
      0,
    );

    groups.get(levelName).push({
      ...gradeLine,
      items,
      subtotal,
    });
  }

  return Array.from(groups.entries());
}

export default function CRMOpportunityProjectionSection({
  opportunityId,
}) {
  const [projectionBase, setProjectionBase] = useState(null);
  const [projection, setProjection] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [panelOpen, setPanelOpen] = useState(false);
  const [drafts, setDrafts] = useState([]);
  const [activeServiceId, setActiveServiceId] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [panelError, setPanelError] = useState("");

  const [productTargetKey, setProductTargetKey] = useState("");
  const [productSearch, setProductSearch] = useState("");
  const [productChoices, setProductChoices] = useState([]);
  const [productLoading, setProductLoading] = useState(false);
  const [productError, setProductError] = useState("");

  useEffect(() => {
    let ignore = false;

    async function loadProjectionWorkspace() {
      try {
        const [baseData, projectionData] = await Promise.all([
          getCRMOpportunityProjectionBase(opportunityId),
          getCRMOpportunityProjection(opportunityId),
        ]);

        if (ignore) {
          return;
        }

        setProjectionBase(baseData);
        setProjection(projectionData);
        setLoadError("");
      } catch (error) {
        if (!ignore) {
          setLoadError(
            resolveErrorMessage(
              error,
              "No se pudo cargar la proyección comercial.",
            ),
          );
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    loadProjectionWorkspace();

    return () => {
      ignore = true;
    };
  }, [opportunityId]);

  const levelOptions = useMemo(() => {
    const seen = new Set();
    const options = [];

    for (const draft of drafts) {
      const key = String(draft.serviceId);

      if (seen.has(key)) {
        continue;
      }

      seen.add(key);
      options.push({
        serviceId: key,
        levelName: draft.levelName,
      });
    }

    return options;
  }, [drafts]);

  const activeDrafts = useMemo(
    () =>
      drafts.filter(
        (draft) => String(draft.serviceId) === activeServiceId,
      ),
    [activeServiceId, drafts],
  );

  const projectionGroups = useMemo(
    () => getProjectionGroups(projection),
    [projection],
  );

  const availablePopulationCount = useMemo(
    () =>
      (projectionBase?.services || []).reduce(
        (total, service) =>
          total + (service.latest_population?.details?.length || 0),
        0,
      ),
    [projectionBase],
  );

  function openEditor() {
    const nextDrafts = buildDrafts(projectionBase, projection);
    const firstServiceId = nextDrafts[0]?.serviceId;

    setDrafts(nextDrafts);
    setActiveServiceId(firstServiceId ? String(firstServiceId) : "");
    setNotes(projection?.notes || "");
    setPanelError("");
    setProductTargetKey("");
    setProductChoices([]);
    setProductSearch("");
    setProductError("");
    setSuccessMessage("");
    setPanelOpen(true);
  }

  function closeEditor() {
    if (saving) {
      return;
    }

    setPanelOpen(false);
  }

  function updateDraft(key, changes) {
    setDrafts((current) =>
      current.map((draft) =>
        draft.key === key
          ? {
              ...draft,
              ...changes,
            }
          : draft,
      ),
    );
  }

  function toggleAllVisibleGrades() {
    const allSelected =
      activeDrafts.length > 0
      && activeDrafts.every((draft) => draft.selected);

    setDrafts((current) =>
      current.map((draft) =>
        String(draft.serviceId) === activeServiceId
          ? {
              ...draft,
              selected: !allSelected,
            }
          : draft,
      ),
    );
  }

  async function loadProductsForDraft(draft, searchValue = "") {
    setProductLoading(true);
    setProductError("");

    try {
      const data = await getCRMOpportunityProjectionProducts(
        opportunityId,
        {
          service: draft.serviceId,
          grade: draft.gradeId,
          search: searchValue || undefined,
        },
      );

      setProductChoices(data?.results || []);
    } catch (error) {
      setProductChoices([]);
      setProductError(
        resolveErrorMessage(
          error,
          "No se pudieron cargar los productos disponibles.",
        ),
      );
    } finally {
      setProductLoading(false);
    }
  }

  async function openProductPicker(draft) {
    setProductTargetKey(draft.key);
    setProductSearch("");
    setProductChoices([]);
    setProductError("");
    await loadProductsForDraft(draft);
  }

  async function handleProductSearch(event) {
    event.preventDefault();

    const draft = drafts.find(
      (item) => item.key === productTargetKey,
    );

    if (!draft) {
      return;
    }

    await loadProductsForDraft(draft, productSearch.trim());
  }

  function addProduct(choice) {
    const draft = drafts.find(
      (item) => item.key === productTargetKey,
    );

    if (!draft) {
      return;
    }

    if (draft.products.some((product) => product.id === choice.id)) {
      return;
    }

    updateDraft(draft.key, {
      selected: true,
      products: [
        ...draft.products,
        {
          id: choice.id,
          name: choice.name,
          editorial: choice.editorial?.name || "Editorial",
          unitPrice: choice.unit_price,
          quantity: Number(draft.studentCount) || 1,
        },
      ],
    });
  }

  function removeProduct(draftKey, productId) {
    const draft = drafts.find((item) => item.key === draftKey);

    if (!draft) {
      return;
    }

    updateDraft(draftKey, {
      products: draft.products.filter(
        (product) => product.id !== productId,
      ),
    });
  }

  function updateProductQuantity(draftKey, productId, value) {
    const draft = drafts.find((item) => item.key === draftKey);

    if (!draft) {
      return;
    }

    updateDraft(draftKey, {
      products: draft.products.map((product) =>
        product.id === productId
          ? {
              ...product,
              quantity: value,
            }
          : product,
      ),
    });
  }

  async function saveProjection(event) {
    event.preventDefault();

    const selectedDrafts = drafts.filter((draft) => draft.selected);

    if (selectedDrafts.length === 0) {
      setPanelError(
        "Selecciona al menos un grado para registrar la proyección.",
      );
      return;
    }

    const invalidPopulation = selectedDrafts.find(
      (draft) => Number(draft.studentCount) < 1,
    );

    if (invalidPopulation) {
      setPanelError(
        `Revisa los alumnos proyectados de ${invalidPopulation.gradeName}.`,
      );
      return;
    }

    const invalidQuantity = selectedDrafts
      .flatMap((draft) => draft.products)
      .find((product) => Number(product.quantity) < 1);

    if (invalidQuantity) {
      setPanelError(
        "Todas las cantidades de productos deben ser mayores a cero.",
      );
      return;
    }

    const payload = {
      grades: selectedDrafts.map((draft) => ({
        service: draft.serviceId,
        grade: draft.gradeId,
        section_count: draft.sectionCount
          ? Number(draft.sectionCount)
          : null,
        student_count: Number(draft.studentCount),
      })),
      items: selectedDrafts.flatMap((draft) =>
        draft.products.map((product) => ({
          service: draft.serviceId,
          grade: draft.gradeId,
          product: product.id,
          quantity: Number(product.quantity),
        })),
      ),
      notes: notes.trim(),
    };

    setSaving(true);
    setPanelError("");

    try {
      const saved = await saveCRMOpportunityProjection(
        opportunityId,
        payload,
      );

      setProjection(saved);
      setPanelOpen(false);
      setSuccessMessage(
        `Proyección v${saved.version} guardada correctamente.`,
      );
    } catch (error) {
      setPanelError(
        resolveErrorMessage(
          error,
          "No se pudo guardar la proyección comercial.",
        ),
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <section className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
        <p className="text-sm font-bold text-gray-500">
          Cargando proyección comercial...
        </p>
      </section>
    );
  }

  if (loadError) {
    return (
      <section className="rounded-3xl border border-red-200 bg-red-50 p-5 text-red-800">
        <p className="font-black">No se pudo abrir Proyección.</p>
        <p className="mt-2 text-sm leading-6">{loadError}</p>
      </section>
    );
  }

  return (
    <>
      <section className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
          <div>
            <p className="text-xs font-black uppercase tracking-wide text-red-700">
              Planificación comercial
            </p>
            <h2 className="mt-1 text-xl font-black text-gray-950">
              Proyección de ventas
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-500">
              Trabaja por nivel y grado con la población del colegio y
              productos reales del catálogo de la campaña.
            </p>
          </div>

          {availablePopulationCount > 0 ? (
            <button
              type="button"
              onClick={openEditor}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-gray-950 px-4 py-2.5 text-sm font-black text-white transition hover:bg-gray-800"
            >
              <FaEdit />
              {projection ? "Editar proyección" : "Crear proyección"}
            </button>
          ) : null}
        </div>

        {successMessage ? (
          <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-800">
            {successMessage}
          </div>
        ) : null}

        {availablePopulationCount === 0 ? (
          <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-5">
            <p className="font-black text-amber-900">
              Falta población por grado
            </p>
            <p className="mt-2 text-sm leading-6 text-amber-800">
              Primero registra la población vigente del colegio por
              nivel y grado. La proyección reutilizará esa información
              y evitará volver a escribirla.
            </p>
          </div>
        ) : null}

        {!projection && availablePopulationCount > 0 ? (
          <div className="mt-5 rounded-2xl border border-dashed border-gray-300 bg-gray-50 px-5 py-10 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-red-700 ring-1 ring-gray-200">
              <FaLayerGroup />
            </div>
            <p className="mt-4 font-black text-gray-950">
              Aún no hay una proyección comercial
            </p>
            <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-gray-500">
              Selecciona los grados que participarán en la campaña y
              agrega los productos que se proyecta trabajar.
            </p>
          </div>
        ) : null}

        {projection ? (
          <>
            <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-2xl bg-gray-50 p-4 ring-1 ring-gray-200">
                <p className="text-xs font-bold uppercase tracking-wide text-gray-500">
                  Venta proyectada
                </p>
                <p className="mt-1 text-xl font-black text-gray-950">
                  {formatCurrency(projection.total_amount)}
                </p>
              </div>
              <div className="rounded-2xl bg-gray-50 p-4 ring-1 ring-gray-200">
                <p className="text-xs font-bold uppercase tracking-wide text-gray-500">
                  Alumnos proyectados
                </p>
                <p className="mt-1 text-xl font-black text-gray-950">
                  {projection.total_students || 0}
                </p>
              </div>
              <div className="rounded-2xl bg-gray-50 p-4 ring-1 ring-gray-200">
                <p className="text-xs font-bold uppercase tracking-wide text-gray-500">
                  Editoriales
                </p>
                <p className="mt-1 text-xl font-black text-gray-950">
                  {projection.editorial_totals?.length || 0}
                </p>
              </div>
              <div className="rounded-2xl bg-gray-50 p-4 ring-1 ring-gray-200">
                <p className="text-xs font-bold uppercase tracking-wide text-gray-500">
                  Versión vigente
                </p>
                <p className="mt-1 text-xl font-black text-gray-950">
                  v{projection.version}
                </p>
              </div>
            </div>

            {projection.editorial_totals?.length > 0 ? (
              <div className="mt-4 flex flex-wrap gap-2">
                {projection.editorial_totals.map((item) => (
                  <div
                    key={item.editorial}
                    className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm"
                  >
                    <span className="font-bold text-gray-500">
                      {item.editorial}
                    </span>
                    <span className="ml-2 font-black text-gray-950">
                      {formatCurrency(item.amount)}
                    </span>
                  </div>
                ))}
              </div>
            ) : null}

            <div className="mt-5 space-y-4">
              {projectionGroups.map(([levelName, gradeLines]) => (
                <div
                  key={levelName}
                  className="overflow-hidden rounded-2xl border border-gray-200"
                >
                  <div className="flex items-center gap-2 bg-gray-950 px-4 py-3 text-white">
                    <FaLayerGroup className="text-red-300" />
                    <h3 className="font-black">{levelName}</h3>
                  </div>

                  <div className="divide-y divide-gray-200">
                    {gradeLines.map((gradeLine) => (
                      <div
                        key={gradeLine.id}
                        className="grid gap-3 px-4 py-4 md:grid-cols-4 md:items-center"
                      >
                        <div>
                          <p className="font-black text-gray-950">
                            {gradeLine.grade?.name
                              || gradeLine.grade_name_snapshot}
                          </p>
                          <p className="mt-1 text-xs text-gray-500">
                            {gradeLine.section_count
                              ? `${gradeLine.section_count} sección(es)`
                              : "Secciones no indicadas"}
                          </p>
                        </div>

                        <div className="text-sm">
                          <p className="font-bold text-gray-500">Alumnos</p>
                          <p className="mt-1 font-black text-gray-950">
                            {gradeLine.student_count}
                          </p>
                        </div>

                        <div className="text-sm">
                          <p className="font-bold text-gray-500">Productos</p>
                          <p className="mt-1 font-black text-gray-950">
                            {gradeLine.items.length}
                          </p>
                        </div>

                        <div className="text-sm md:text-right">
                          <p className="font-bold text-gray-500">
                            Proyección
                          </p>
                          <p className="mt-1 font-black text-gray-950">
                            {formatCurrency(gradeLine.subtotal)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {projection.notes ? (
              <div className="mt-4 rounded-2xl bg-gray-50 p-4 text-sm leading-6 text-gray-600 ring-1 ring-gray-200">
                <strong className="text-gray-950">Observaciones: </strong>
                {projection.notes}
              </div>
            ) : null}
          </>
        ) : null}
      </section>

      {panelOpen ? (
        <div className="fixed inset-0 z-50 flex justify-end bg-gray-950/55">
          <div className="flex h-full w-full max-w-4xl flex-col bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-gray-200 px-5 py-4 sm:px-6">
              <div>
                <p className="text-xs font-black uppercase tracking-wide text-red-700">
                  CRM comercial
                </p>
                <h2 className="mt-1 text-2xl font-black text-gray-950">
                  {projection ? "Editar proyección" : "Nueva proyección"}
                </h2>
                <p className="mt-1 text-sm text-gray-500">
                  {projectionBase?.campaign?.name || "Campaña comercial"}
                </p>
              </div>

              <button
                type="button"
                onClick={closeEditor}
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200 text-gray-500 transition hover:bg-gray-50 hover:text-gray-950"
                aria-label="Cerrar"
              >
                <FaTimes />
              </button>
            </div>

            <form
              onSubmit={saveProjection}
              className="flex min-h-0 flex-1 flex-col"
            >
              <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6">
                {panelError ? (
                  <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-800">
                    {panelError}
                  </div>
                ) : null}

                <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-red-700 ring-1 ring-gray-200">
                      <FaUsers />
                    </div>
                    <div>
                      <p className="font-black text-gray-950">
                        Población como punto de partida
                      </p>
                      <p className="mt-1 text-sm leading-6 text-gray-500">
                        Los alumnos y secciones vienen de la ficha del
                        colegio. Aquí puedes ajustar solo la proyección
                        comercial sin modificar la población histórica.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-5 flex gap-2 overflow-x-auto pb-1">
                  {levelOptions.map((option) => (
                    <button
                      key={option.serviceId}
                      type="button"
                      onClick={() =>
                        setActiveServiceId(option.serviceId)
                      }
                      className={`shrink-0 rounded-xl px-4 py-2.5 text-sm font-black transition ${
                        activeServiceId === option.serviceId
                          ? "bg-gray-950 text-white"
                          : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                      }`}
                    >
                      {option.levelName}
                    </button>
                  ))}
                </div>

                <div className="mt-4 flex items-center justify-between gap-3">
                  <div>
                    <p className="font-black text-gray-950">
                      Grados del nivel
                    </p>
                    <p className="mt-1 text-xs text-gray-500">
                      Selecciona solo los grados que formarán parte de
                      esta oportunidad.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={toggleAllVisibleGrades}
                    className="shrink-0 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-black text-gray-700 transition hover:bg-gray-50"
                  >
                    {activeDrafts.length > 0
                      && activeDrafts.every((draft) => draft.selected)
                      ? "Quitar todos"
                      : "Seleccionar todos"}
                  </button>
                </div>

                <div className="mt-3 space-y-3">
                  {activeDrafts.map((draft) => (
                    <div
                      key={draft.key}
                      className={`rounded-2xl border p-4 ${
                        draft.selected
                          ? "border-red-200 bg-red-50/30"
                          : "border-gray-200 bg-white"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          checked={draft.selected}
                          onChange={(event) =>
                            updateDraft(draft.key, {
                              selected: event.target.checked,
                            })
                          }
                          className="mt-1 h-4 w-4 accent-red-700"
                        />

                        <div className="min-w-0 flex-1">
                          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                            <div>
                              <p className="font-black text-gray-950">
                                {draft.gradeName}
                              </p>
                              <p className="mt-1 text-xs text-gray-500">
                                {draft.levelName}
                              </p>
                            </div>

                            {draft.selected ? (
                              <button
                                type="button"
                                onClick={() => openProductPicker(draft)}
                                className="inline-flex items-center justify-center gap-2 rounded-xl bg-gray-950 px-3 py-2 text-xs font-black text-white transition hover:bg-gray-800"
                              >
                                <FaPlus />
                                Agregar producto
                              </button>
                            ) : null}
                          </div>

                          {draft.selected ? (
                            <>
                              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                                <label className="text-sm font-bold text-gray-700">
                                  Alumnos proyectados
                                  <input
                                    type="number"
                                    min="1"
                                    value={draft.studentCount}
                                    onChange={(event) =>
                                      updateDraft(draft.key, {
                                        studentCount: event.target.value,
                                      })
                                    }
                                    className="mt-1.5 w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 font-semibold text-gray-950 outline-none transition focus:border-red-400 focus:ring-2 focus:ring-red-100"
                                  />
                                </label>

                                <label className="text-sm font-bold text-gray-700">
                                  Secciones
                                  <input
                                    type="number"
                                    min="1"
                                    value={draft.sectionCount}
                                    onChange={(event) =>
                                      updateDraft(draft.key, {
                                        sectionCount: event.target.value,
                                      })
                                    }
                                    className="mt-1.5 w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 font-semibold text-gray-950 outline-none transition focus:border-red-400 focus:ring-2 focus:ring-red-100"
                                  />
                                </label>
                              </div>

                              {draft.products.length > 0 ? (
                                <div className="mt-4 space-y-2">
                                  {draft.products.map((product) => (
                                    <div
                                      key={product.id}
                                      className="grid gap-3 rounded-xl border border-gray-200 bg-white p-3 sm:grid-cols-[minmax(0,1fr)_120px_40px] sm:items-center"
                                    >
                                      <div className="min-w-0">
                                        <p className="truncate text-sm font-black text-gray-950">
                                          {product.name}
                                        </p>
                                        <p className="mt-1 text-xs text-gray-500">
                                          {product.editorial}
                                          {" · "}
                                          {formatCurrency(product.unitPrice)}
                                        </p>
                                      </div>

                                      <label className="text-xs font-bold text-gray-500">
                                        Cantidad
                                        <input
                                          type="number"
                                          min="1"
                                          value={product.quantity}
                                          onChange={(event) =>
                                            updateProductQuantity(
                                              draft.key,
                                              product.id,
                                              event.target.value,
                                            )
                                          }
                                          className="mt-1 w-full rounded-lg border border-gray-200 px-2.5 py-2 font-bold text-gray-950 outline-none focus:border-red-400"
                                        />
                                      </label>

                                      <button
                                        type="button"
                                        onClick={() =>
                                          removeProduct(
                                            draft.key,
                                            product.id,
                                          )
                                        }
                                        className="flex h-10 w-10 items-center justify-center rounded-lg text-gray-400 transition hover:bg-red-50 hover:text-red-700"
                                        aria-label="Quitar producto"
                                      >
                                        <FaTrashAlt />
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <div className="mt-4 rounded-xl border border-dashed border-gray-300 bg-gray-50 px-4 py-3 text-sm text-gray-500">
                                  Aún no agregaste productos a este grado.
                                </div>
                              )}
                            </>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {productTargetKey ? (
                  <div className="mt-5 rounded-2xl border border-gray-200 bg-gray-50 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-black uppercase tracking-wide text-red-700">
                          Catálogo disponible
                        </p>
                        <h3 className="mt-1 font-black text-gray-950">
                          Agregar productos
                        </h3>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setProductTargetKey("");
                          setProductChoices([]);
                          setProductSearch("");
                          setProductError("");
                        }}
                        className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-black text-gray-600"
                      >
                        Cerrar
                      </button>
                    </div>

                    <form
                      onSubmit={handleProductSearch}
                      className="mt-3 flex gap-2"
                    >
                      <input
                        type="search"
                        value={productSearch}
                        onChange={(event) =>
                          setProductSearch(event.target.value)
                        }
                        placeholder="Buscar libro, editorial, área o serie..."
                        className="min-w-0 flex-1 rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm font-semibold text-gray-950 outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100"
                      />
                      <button
                        type="submit"
                        className="inline-flex items-center gap-2 rounded-xl bg-gray-950 px-4 py-2.5 text-sm font-black text-white"
                      >
                        <FaSearch />
                        Buscar
                      </button>
                    </form>

                    {productError ? (
                      <p className="mt-3 text-sm font-bold text-red-700">
                        {productError}
                      </p>
                    ) : null}

                    {productLoading ? (
                      <p className="mt-4 text-sm font-bold text-gray-500">
                        Cargando productos...
                      </p>
                    ) : (
                      <div className="mt-4 max-h-72 space-y-2 overflow-y-auto">
                        {productChoices.map((choice) => {
                          const targetDraft = drafts.find(
                            (draft) => draft.key === productTargetKey,
                          );
                          const alreadyAdded = targetDraft?.products.some(
                            (product) => product.id === choice.id,
                          );

                          return (
                            <div
                              key={choice.id}
                              className="flex flex-col justify-between gap-3 rounded-xl border border-gray-200 bg-white p-3 sm:flex-row sm:items-center"
                            >
                              <div className="min-w-0">
                                <div className="flex items-start gap-2">
                                  <FaBook className="mt-1 shrink-0 text-red-700" />
                                  <div className="min-w-0">
                                    <p className="font-black text-gray-950">
                                      {choice.name}
                                    </p>
                                    <p className="mt-1 text-xs text-gray-500">
                                      {choice.editorial?.name || "Editorial"}
                                      {choice.area?.name
                                        ? ` · ${choice.area.name}`
                                        : ""}
                                      {" · "}
                                      {formatCurrency(choice.unit_price)}
                                    </p>
                                  </div>
                                </div>
                              </div>

                              <button
                                type="button"
                                disabled={alreadyAdded}
                                onClick={() => addProduct(choice)}
                                className={`shrink-0 rounded-xl px-3 py-2 text-xs font-black transition ${
                                  alreadyAdded
                                    ? "cursor-not-allowed bg-gray-100 text-gray-400"
                                    : "bg-red-700 text-white hover:bg-red-800"
                                }`}
                              >
                                {alreadyAdded ? "Agregado" : "Agregar"}
                              </button>
                            </div>
                          );
                        })}

                        {!productLoading
                          && productChoices.length === 0
                          && !productError ? (
                            <div className="rounded-xl border border-dashed border-gray-300 bg-white px-4 py-6 text-center text-sm text-gray-500">
                              No hay productos con precio válido para este
                              nivel, grado y campaña.
                            </div>
                          ) : null}
                      </div>
                    )}
                  </div>
                ) : null}

                <label className="mt-5 block text-sm font-bold text-gray-700">
                  Observaciones
                  <textarea
                    rows="3"
                    value={notes}
                    onChange={(event) => setNotes(event.target.value)}
                    placeholder="Acuerdos o criterios usados para esta proyección..."
                    className="mt-1.5 w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 font-normal text-gray-950 outline-none transition focus:border-red-400 focus:ring-2 focus:ring-red-100"
                  />
                </label>
              </div>

              <div className="flex flex-col-reverse gap-2 border-t border-gray-200 bg-white px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
                <button
                  type="button"
                  onClick={closeEditor}
                  disabled={saving}
                  className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-black text-gray-700 transition hover:bg-gray-50 disabled:opacity-60"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-700 px-4 py-2.5 text-sm font-black text-white transition hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <FaSave />
                  {saving ? "Guardando..." : "Guardar proyección"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
