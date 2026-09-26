import { useEffect, useMemo, useState } from "react";
import {
  FaCheckCircle,
  FaEdit,
  FaExclamationTriangle,
  FaFileInvoiceDollar,
  FaPaperPlane,
  FaPlus,
  FaShieldAlt,
  FaTimes,
} from "react-icons/fa";

import { useAuth } from "../../../hooks/useAuth";

import {
  acceptCRMOpportunityQuotation,
  approveCRMOpportunityQuotationDiscount,
  createCRMOpportunityQuotationFromProjection,
  getCRMOpportunityProjection,
  getCRMOpportunityQuotations,
  sendCRMOpportunityQuotation,
  updateCRMOpportunityQuotationDraft,
} from "../../../api/crmApi";

const STANDARD_DISCOUNT = 20;

function normalizeList(data) {
  if (Array.isArray(data)) {
    return data;
  }

  if (Array.isArray(data?.results)) {
    return data.results;
  }

  return [];
}

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

function formatDateTime(value, fallback = "Sin fecha") {
  if (!value) {
    return fallback;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return fallback;
  }

  return new Intl.DateTimeFormat("es-PE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function getErrorMessage(error, fallback) {
  const data = error?.response?.data;

  if (typeof data?.detail === "string") {
    return data.detail;
  }

  if (Array.isArray(data?.non_field_errors) && data.non_field_errors[0]) {
    return data.non_field_errors[0];
  }

  if (data && typeof data === "object") {
    const firstValue = Object.values(data)[0];

    if (typeof firstValue === "string") {
      return firstValue;
    }

    if (Array.isArray(firstValue) && firstValue[0]) {
      return String(firstValue[0]);
    }
  }

  return fallback;
}

function statusBadgeClass(status) {
  if (status === "accepted") {
    return "bg-emerald-50 text-emerald-700 ring-emerald-200";
  }

  if (status === "sent") {
    return "bg-blue-50 text-blue-700 ring-blue-200";
  }

  if (status === "rejected") {
    return "bg-red-50 text-red-700 ring-red-200";
  }

  if (status === "superseded") {
    return "bg-amber-50 text-amber-800 ring-amber-200";
  }

  return "bg-gray-100 text-gray-700 ring-gray-200";
}

function quotationTotals(quotation) {
  return (quotation.items || []).reduce(
    (totals, item) => {
      const quantity = Number(item.quantity || 0);

      totals.pvp += Number(item.pvp || 0) * quantity;
      totals.school += Number(item.school_price || 0) * quantity;
      totals.parents += Number(item.parent_price || 0) * quantity;
      totals.cost += Number(item.supplier_cost || 0) * quantity;
      totals.units += quantity;

      return totals;
    },
    {
      pvp: 0,
      school: 0,
      parents: 0,
      cost: 0,
      units: 0,
    },
  );
}

function hasReferencePrice(quotation) {
  return (quotation.items || []).some((item) => item.uses_reference_price);
}

export default function CRMOpportunityQuotationSection({
  opportunityId,
  onOpportunityChanged,
  onGoToAdoption,
}) {
  const { hasPermission, hasRole } = useAuth();
  const canApproveDiscount =
    hasRole(["ADMINISTRADOR"]) || hasPermission(["crm.supervise_crm"]);

  const [quotations, setQuotations] = useState([]);
  const [projection, setProjection] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingQuotationId, setEditingQuotationId] = useState(null);
  const [draftItems, setDraftItems] = useState([]);
  const [draftNotes, setDraftNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [actionId, setActionId] = useState(null);
  const [approvalQuotationId, setApprovalQuotationId] = useState(null);
  const [approvalNote, setApprovalNote] = useState("");

  useEffect(() => {
    let ignore = false;

    async function loadQuotationWorkspace() {
      setLoading(true);

      try {
        const quotationsData = await getCRMOpportunityQuotations(opportunityId);

        let projectionData = null;

        try {
          projectionData = await getCRMOpportunityProjection(opportunityId);
        } catch (projectionError) {
          if (projectionError?.response?.status !== 404) {
            throw projectionError;
          }
        }

        if (ignore) {
          return;
        }

        setQuotations(normalizeList(quotationsData));
        setProjection(projectionData);
        setErrorMessage("");
      } catch (error) {
        if (!ignore) {
          setErrorMessage(
            getErrorMessage(
              error,
              "No se pudo cargar el espacio de cotizaciones.",
            ),
          );
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    loadQuotationWorkspace();

    return () => {
      ignore = true;
    };
  }, [opportunityId, refreshKey]);

  useEffect(() => {
    if (!drawerOpen) {
      return undefined;
    }

    function handleKeyDown(event) {
      if (event.key === "Escape" && !saving) {
        setDrawerOpen(false);
        setEditingQuotationId(null);
      }
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [drawerOpen, saving]);

  const editableDraft = useMemo(
    () =>
      quotations.find(
        (quotation) =>
          quotation.status === "draft"
          && (
            !quotation.source_projection?.id
            || quotation.source_projection.id === projection?.id
          ),
      ) || null,
    [projection?.id, quotations],
  );

  const draftTotals = useMemo(
    () =>
      draftItems.reduce(
        (totals, item) => {
          const quantity = Number(item.quantity || 0);
          const pvp = Number(item.pvp || 0);
          const discount = Number(item.school_discount_percent || 0);
          const schoolPrice = pvp * (1 - discount / 100);

          totals.units += quantity;
          totals.pvp += pvp * quantity;
          totals.school += schoolPrice * quantity;

          if (discount > STANDARD_DISCOUNT) {
            totals.requiresApproval = true;
          }

          return totals;
        },
        {
          units: 0,
          pvp: 0,
          school: 0,
          requiresApproval: false,
        },
      ),
    [draftItems],
  );

  function refreshWorkspace() {
    setRefreshKey((current) => current + 1);

    if (onOpportunityChanged) {
      onOpportunityChanged();
    }
  }

  function openQuotationDrawer(quotation = null) {
    if (!projection?.items?.length) {
      setErrorMessage(
        "La proyección vigente debe tener productos antes de trabajar una cotización.",
      );
      return;
    }

    if (
      quotation
      && quotation.source_projection?.id
      && quotation.source_projection.id !== projection.id
    ) {
      setErrorMessage(
        "Esta cotización nació de una proyección anterior. Conserva esa versión y crea una nueva cotización desde la proyección vigente.",
      );
      return;
    }

    const quotationItems = quotation?.items || [];

    const nextItems = projection.items.map((item) => {
      const quotationItem = quotationItems.find(
        (candidate) => candidate.product?.id === item.product?.id,
      );

      return {
        projection_item: item.id,
        product_name:
          item.product_name_snapshot || item.product?.name || "Producto",
        provider_name:
          item.provider_name_snapshot
          || item.product?.provider?.name
          || "Editorial",
        grade_name: item.grade_name_snapshot || "Sin grado",
        quantity: String(
          quotationItem?.quantity ?? item.quantity ?? 1,
        ),
        pvp: String(quotationItem?.pvp ?? item.unit_price ?? "0.00"),
        school_discount_percent: String(
          quotationItem?.school_discount_percent ?? STANDARD_DISCOUNT,
        ),
        parent_price: String(
          quotationItem?.parent_price ?? item.unit_price ?? "0.00",
        ),
        school_commission: String(
          quotationItem?.school_commission ?? "0.00",
        ),
        price_year_snapshot:
          quotationItem?.price_year_snapshot ?? item.price_year_snapshot,
        price_campaign_snapshot:
          quotationItem?.price_campaign_snapshot
          ?? item.price_campaign_snapshot,
      };
    });

    setEditingQuotationId(quotation?.id || null);
    setDraftItems(nextItems);
    setDraftNotes(quotation?.notes || "");
    setErrorMessage("");
    setSuccessMessage("");
    setDrawerOpen(true);
  }

  function closeQuotationDrawer() {
    if (saving) {
      return;
    }

    setDrawerOpen(false);
    setEditingQuotationId(null);
  }

  function updateDraftItem(index, field, value) {
    setDraftItems((current) =>
      current.map((item, itemIndex) =>
        itemIndex === index
          ? {
              ...item,
              [field]: value,
            }
          : item,
      ),
    );
  }

  async function handleSaveQuotation() {
    const invalidItem = draftItems.find((item) => {
      const quantity = Number(item.quantity);
      const discount = Number(item.school_discount_percent);
      const parentPrice = Number(item.parent_price);
      const commission = Number(item.school_commission);

      return (
        !Number.isInteger(quantity)
        || quantity < 1
        || !Number.isFinite(discount)
        || discount < 0
        || discount > 100
        || !Number.isFinite(parentPrice)
        || parentPrice < 0
        || !Number.isFinite(commission)
        || commission < 0
      );
    });

    if (invalidItem) {
      setErrorMessage(
        "Revisa cantidades, descuentos, precio PPFF y comisión antes de guardar.",
      );
      return;
    }

    setSaving(true);
    setErrorMessage("");

    try {
      const payload = {
        items: draftItems.map((item) => ({
          projection_item: item.projection_item,
          quantity: Number(item.quantity),
          school_discount_percent: item.school_discount_percent,
          parent_price: item.parent_price,
          school_commission: item.school_commission,
        })),
        notes: draftNotes.trim(),
      };

      const quotation = editingQuotationId
        ? await updateCRMOpportunityQuotationDraft(
            opportunityId,
            editingQuotationId,
            payload,
          )
        : await createCRMOpportunityQuotationFromProjection(
            opportunityId,
            payload,
          );

      setDrawerOpen(false);
      setEditingQuotationId(null);
      setSuccessMessage(
        editingQuotationId
          ? `Cotización v${quotation.version} actualizada correctamente.`
          : `Cotización v${quotation.version} creada como borrador.`,
      );
      refreshWorkspace();
    } catch (error) {
      setErrorMessage(
        getErrorMessage(
          error,
          editingQuotationId
            ? "No se pudo actualizar el borrador de la cotización."
            : "No se pudo crear la cotización desde la proyección.",
        ),
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleApproveDiscount(quotationId) {
    setActionId(quotationId);
    setErrorMessage("");

    try {
      await approveCRMOpportunityQuotationDiscount(
        opportunityId,
        quotationId,
        {
          note: approvalNote.trim(),
        },
      );

      setApprovalQuotationId(null);
      setApprovalNote("");
      setSuccessMessage("Descuento aprobado correctamente.");
      refreshWorkspace();
    } catch (error) {
      setErrorMessage(
        getErrorMessage(
          error,
          "No se pudo aprobar el descuento de la cotización.",
        ),
      );
    } finally {
      setActionId(null);
    }
  }

  async function handleSendQuotation(quotation) {
    setActionId(quotation.id);
    setErrorMessage("");

    try {
      await sendCRMOpportunityQuotation(opportunityId, quotation.id);
      setSuccessMessage(
        `Cotización v${quotation.version} marcada como enviada.`,
      );
      refreshWorkspace();
    } catch (error) {
      setErrorMessage(
        getErrorMessage(
          error,
          "No se pudo marcar la cotización como enviada.",
        ),
      );
    } finally {
      setActionId(null);
    }
  }

  async function handleAcceptQuotation(quotation) {
    setActionId(quotation.id);
    setErrorMessage("");

    try {
      await acceptCRMOpportunityQuotation(opportunityId, quotation.id);
      setSuccessMessage(
        `Cotización v${quotation.version} marcada como aceptada.`,
      );
      refreshWorkspace();
    } catch (error) {
      setErrorMessage(
        getErrorMessage(
          error,
          "No se pudo marcar la cotización como aceptada.",
        ),
      );
    } finally {
      setActionId(null);
    }
  }

  if (loading) {
    return (
      <section className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
        <p className="text-sm font-bold text-gray-500">
          Cargando cotizaciones...
        </p>
      </section>
    );
  }

  return (
    <>
      <section className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
          <div>
            <p className="text-xs font-black uppercase tracking-wide text-red-700">
              Propuesta comercial
            </p>
            <h2 className="mt-1 text-xl font-black text-gray-950">
              Cotizaciones
            </h2>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-gray-500">
              La cotización toma la proyección vigente como base y conserva
              precios, cantidades y condiciones comerciales por versión.
            </p>
          </div>

          {!editableDraft ? (
            <button
              type="button"
              onClick={() => openQuotationDrawer()}
              disabled={!projection?.items?.length}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-gray-950 px-4 py-2.5 text-sm font-black text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:bg-gray-300"
            >
              <FaPlus />
              Nueva cotización
            </button>
          ) : null}
        </div>

        {successMessage ? (
          <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-800">
            {successMessage}
          </div>
        ) : null}

        {errorMessage ? (
          <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-800">
            {errorMessage}
          </div>
        ) : null}

        {!projection?.items?.length ? (
          <div className="mt-4 rounded-2xl border border-dashed border-gray-300 bg-gray-50 px-5 py-8 text-center">
            <p className="font-black text-gray-950">
              Primero completa la proyección comercial
            </p>
            <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-gray-500">
              La cotización debe nacer de una proyección vigente con productos,
              para conservar la trazabilidad de cantidades y precios.
            </p>
          </div>
        ) : null}

        {quotations.length > 0 ? (
          <div className="mt-5 space-y-4">
            {quotations.map((quotation) => {
              const totals = quotationTotals(quotation);
              const referencePrice = hasReferencePrice(quotation);
              const approvalPending =
                quotation.requires_discount_approval
                && quotation.discount_approval_status !== "approved";
              const busy = actionId === quotation.id;

              return (
                <article
                  key={quotation.id}
                  className="overflow-hidden rounded-2xl border border-gray-200 bg-gray-50"
                >
                  <div className="flex flex-col justify-between gap-3 border-b border-gray-200 bg-white p-4 lg:flex-row lg:items-center">
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gray-950 text-white">
                        <FaFileInvoiceDollar />
                      </div>
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-black text-gray-950">
                            Cotización v{quotation.version}
                          </p>
                          <span
                            className={`rounded-full px-2.5 py-1 text-xs font-black ring-1 ${statusBadgeClass(
                              quotation.status,
                            )}`}
                          >
                            {quotation.status_display || quotation.status}
                          </span>
                          {quotation.source_projection?.version ? (
                            <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-black text-gray-600">
                              Proyección v{quotation.source_projection.version}
                            </span>
                          ) : null}
                        </div>
                        <p className="mt-1 text-xs font-bold text-gray-500">
                          Creada {formatDateTime(quotation.created_at)}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {quotation.status === "draft" ? (
                        <button
                          type="button"
                          onClick={() => openQuotationDrawer(quotation)}
                          disabled={busy}
                          className="inline-flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs font-black text-gray-800 transition hover:bg-gray-50 disabled:opacity-50"
                        >
                          <FaEdit />
                          Editar borrador
                        </button>
                      ) : null}

                      {quotation.status === "draft"
                      && quotation.requires_discount_approval
                      && quotation.discount_approval_status === "approved" ? (
                        <span className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-black text-emerald-800">
                          <FaShieldAlt />
                          Descuento aprobado
                        </span>
                      ) : null}

                      {quotation.status === "draft"
                      && quotation.requires_discount_approval
                      && quotation.discount_approval_status !== "approved"
                      && canApproveDiscount ? (
                        <button
                          type="button"
                          onClick={() => {
                            setApprovalQuotationId(
                              approvalQuotationId === quotation.id
                                ? null
                                : quotation.id,
                            );
                            setApprovalNote("");
                          }}
                          disabled={busy}
                          className="inline-flex items-center gap-2 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-black text-amber-900 disabled:opacity-50"
                        >
                          <FaShieldAlt />
                          Aprobar descuento
                        </button>
                      ) : null}

                      {quotation.status === "draft"
                      && quotation.requires_discount_approval
                      && quotation.discount_approval_status !== "approved"
                      && !canApproveDiscount ? (
                        <span className="inline-flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-black text-amber-800">
                          <FaShieldAlt />
                          Pendiente de aprobación comercial
                        </span>
                      ) : null}

                      {quotation.status === "draft" ? (
                        <button
                          type="button"
                          onClick={() => handleSendQuotation(quotation)}
                          disabled={busy || referencePrice || approvalPending}
                          className="inline-flex items-center gap-2 rounded-xl bg-gray-950 px-3 py-2 text-xs font-black text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:bg-gray-300"
                        >
                          <FaPaperPlane />
                          Marcar enviada
                        </button>
                      ) : null}

                      {quotation.status === "sent" ? (
                        <button
                          type="button"
                          onClick={() => handleAcceptQuotation(quotation)}
                          disabled={busy}
                          className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-3 py-2 text-xs font-black text-white transition hover:bg-red-700 disabled:opacity-50"
                        >
                          <FaCheckCircle />
                          Marcar aceptada
                        </button>
                      ) : null}

                      {quotation.status === "accepted" && onGoToAdoption ? (
                        <button
                          type="button"
                          onClick={onGoToAdoption}
                          className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-3 py-2 text-xs font-black text-white transition hover:bg-red-700"
                        >
                          <FaCheckCircle />
                          Ir a adopción
                        </button>
                      ) : null}
                    </div>
                  </div>

                  <div className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-4">
                    <div className="rounded-xl bg-white p-3 ring-1 ring-gray-200">
                      <p className="text-xs font-bold uppercase tracking-wide text-gray-500">
                        Unidades
                      </p>
                      <p className="mt-1 text-lg font-black text-gray-950">
                        {totals.units}
                      </p>
                    </div>
                    <div className="rounded-xl bg-white p-3 ring-1 ring-gray-200">
                      <p className="text-xs font-bold uppercase tracking-wide text-gray-500">
                        PVP total
                      </p>
                      <p className="mt-1 text-lg font-black text-gray-950">
                        {formatCurrency(totals.pvp)}
                      </p>
                    </div>
                    <div className="rounded-xl bg-white p-3 ring-1 ring-gray-200">
                      <p className="text-xs font-bold uppercase tracking-wide text-gray-500">
                        Precio colegio
                      </p>
                      <p className="mt-1 text-lg font-black text-gray-950">
                        {formatCurrency(totals.school)}
                      </p>
                    </div>
                    <div className="rounded-xl bg-white p-3 ring-1 ring-gray-200">
                      <p className="text-xs font-bold uppercase tracking-wide text-gray-500">
                        Costo editorial
                      </p>
                      <p className="mt-1 text-lg font-black text-gray-950">
                        {formatCurrency(totals.cost)}
                      </p>
                    </div>
                  </div>

                  {referencePrice ? (
                    <div className="mx-4 mb-4 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                      <FaExclamationTriangle className="mt-0.5 shrink-0" />
                      <div>
                        <p className="font-black">
                          Usa precios referenciales de una campaña anterior
                        </p>
                        <p className="mt-1 leading-5">
                          Puedes conservar el borrador para planificación, pero
                          el backend no permitirá enviarlo hasta cargar los
                          precios vigentes de la campaña.
                        </p>
                      </div>
                    </div>
                  ) : null}

                  {approvalPending ? (
                    <div className="mx-4 mb-4 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                      <FaShieldAlt className="mt-0.5 shrink-0" />
                      <div>
                        <p className="font-black">
                          Descuento superior al 20 %
                        </p>
                        <p className="mt-1 leading-5">
                          Esta versión necesita aprobación comercial antes de
                          poder marcarse como enviada.
                        </p>
                      </div>
                    </div>
                  ) : null}

                  {approvalQuotationId === quotation.id
                  && quotation.discount_approval_status !== "approved" ? (
                    <div className="mx-4 mb-4 rounded-xl border border-gray-200 bg-white p-4">
                      <label
                        htmlFor={`approval-note-${quotation.id}`}
                        className="text-xs font-black uppercase tracking-wide text-gray-600"
                      >
                        Observación de aprobación
                      </label>
                      <textarea
                        id={`approval-note-${quotation.id}`}
                        value={approvalNote}
                        onChange={(event) => setApprovalNote(event.target.value)}
                        rows={2}
                        placeholder="Motivo o condición autorizada por el supervisor..."
                        className="mt-2 w-full rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-100"
                      />
                      <div className="mt-3 flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setApprovalQuotationId(null);
                            setApprovalNote("");
                          }}
                          className="rounded-xl border border-gray-300 px-3 py-2 text-xs font-black text-gray-700"
                        >
                          Cancelar
                        </button>
                        <button
                          type="button"
                          onClick={() => handleApproveDiscount(quotation.id)}
                          disabled={busy}
                          className="rounded-xl bg-gray-950 px-3 py-2 text-xs font-black text-white disabled:opacity-50"
                        >
                          Confirmar aprobación
                        </button>
                      </div>
                    </div>
                  ) : null}

                  <div className="border-t border-gray-200 bg-white px-4 py-3">
                    <div className="grid gap-2 text-xs text-gray-600 lg:grid-cols-3">
                      <p>
                        <span className="font-black text-gray-800">
                          Productos:
                        </span>{" "}
                        {quotation.items?.length || 0}
                      </p>
                      <p>
                        <span className="font-black text-gray-800">
                          PPFF total:
                        </span>{" "}
                        {formatCurrency(totals.parents)}
                      </p>
                      <p>
                        <span className="font-black text-gray-800">
                          Aprobación:
                        </span>{" "}
                        {quotation.discount_approval_status_display
                          || "No requerida"}
                      </p>
                    </div>

                    {quotation.notes ? (
                      <p className="mt-3 text-sm leading-6 text-gray-600">
                        {quotation.notes}
                      </p>
                    ) : null}
                  </div>
                </article>
              );
            })}
          </div>
        ) : projection?.items?.length ? (
          <div className="mt-5 rounded-2xl border border-dashed border-gray-300 bg-gray-50 px-5 py-8 text-center">
            <p className="font-black text-gray-950">
              Aún no hay cotizaciones
            </p>
            <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-gray-500">
              Crea la primera versión desde la proyección vigente. Los
              productos y cantidades se cargarán automáticamente.
            </p>
          </div>
        ) : null}
      </section>

      {drawerOpen ? (
        <div className="fixed inset-0 z-50 flex justify-end bg-gray-950/60 backdrop-blur-sm">
          <button
            type="button"
            aria-label="Cerrar cotización"
            className="absolute inset-0 cursor-default"
            onClick={closeQuotationDrawer}
          />

          <div className="relative z-10 flex h-full w-full max-w-5xl flex-col bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-gray-200 px-5 py-4 sm:px-6">
              <div>
                <p className="text-xs font-black uppercase tracking-wide text-red-700">
                  CRM comercial
                </p>
                <h3 className="mt-1 text-2xl font-black text-gray-950">
                  {editingQuotationId
                    ? `Editar cotización v${quotations.find(
                        (quotation) => quotation.id === editingQuotationId,
                      )?.version || ""}`
                    : "Nueva cotización"}
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  Base: proyección v{projection?.version || "—"} ·{" "}
                  {projection?.campaign_name_snapshot || "Campaña"}
                </p>
              </div>

              <button
                type="button"
                onClick={closeQuotationDrawer}
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200 text-gray-500 transition hover:bg-gray-50"
                aria-label="Cerrar cotización"
              >
                <FaTimes />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-5 sm:px-6">
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl bg-gray-50 p-4 ring-1 ring-gray-200">
                  <p className="text-xs font-bold uppercase tracking-wide text-gray-500">
                    Unidades
                  </p>
                  <p className="mt-1 text-xl font-black text-gray-950">
                    {draftTotals.units}
                  </p>
                </div>
                <div className="rounded-2xl bg-gray-50 p-4 ring-1 ring-gray-200">
                  <p className="text-xs font-bold uppercase tracking-wide text-gray-500">
                    PVP proyectado
                  </p>
                  <p className="mt-1 text-xl font-black text-gray-950">
                    {formatCurrency(draftTotals.pvp)}
                  </p>
                </div>
                <div className="rounded-2xl bg-gray-50 p-4 ring-1 ring-gray-200">
                  <p className="text-xs font-bold uppercase tracking-wide text-gray-500">
                    Precio colegio
                  </p>
                  <p className="mt-1 text-xl font-black text-gray-950">
                    {formatCurrency(draftTotals.school)}
                  </p>
                </div>
              </div>

              {draftTotals.requiresApproval ? (
                <div className="mt-4 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                  <FaShieldAlt className="mt-0.5 shrink-0" />
                  <div>
                    <p className="font-black">
                      Esta cotización requerirá aprobación comercial
                    </p>
                    <p className="mt-1 leading-5">
                      Hay al menos un descuento superior al estándar del 20 %.
                    </p>
                  </div>
                </div>
              ) : null}

              <div className="mt-5 space-y-3">
                {draftItems.map((item, index) => {
                  const priceYear = Number(item.price_year_snapshot);
                  const campaignYear = Number(projection?.campaign_year_snapshot);
                  const referencePrice =
                    Number.isFinite(priceYear)
                    && Number.isFinite(campaignYear)
                    && priceYear > 0
                    && priceYear < campaignYear;

                  return (
                    <article
                      key={item.projection_item}
                      className="rounded-2xl border border-gray-200 bg-white p-4"
                    >
                      <div className="flex flex-col justify-between gap-2 lg:flex-row lg:items-start">
                        <div>
                          <p className="font-black text-gray-950">
                            {item.product_name}
                          </p>
                          <p className="mt-1 text-xs font-bold text-gray-500">
                            {item.provider_name} · {item.grade_name} · PVP{" "}
                            {formatCurrency(item.pvp)}
                          </p>
                          {referencePrice ? (
                            <p className="mt-1 text-xs font-black text-amber-700">
                              Precio referencial {item.price_year_snapshot}
                            </p>
                          ) : null}
                        </div>
                      </div>

                      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                        <label className="text-xs font-bold text-gray-600">
                          Cantidad
                          <input
                            type="number"
                            min="1"
                            step="1"
                            value={item.quantity}
                            onChange={(event) =>
                              updateDraftItem(
                                index,
                                "quantity",
                                event.target.value,
                              )
                            }
                            className="mt-1.5 w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm font-bold text-gray-950 outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-100"
                          />
                        </label>

                        <label className="text-xs font-bold text-gray-600">
                          Descuento colegio %
                          <input
                            type="number"
                            min="0"
                            max="100"
                            step="0.01"
                            value={item.school_discount_percent}
                            onChange={(event) =>
                              updateDraftItem(
                                index,
                                "school_discount_percent",
                                event.target.value,
                              )
                            }
                            className="mt-1.5 w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm font-bold text-gray-950 outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-100"
                          />
                        </label>

                        <label className="text-xs font-bold text-gray-600">
                          Precio PPFF
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.parent_price}
                            onChange={(event) =>
                              updateDraftItem(
                                index,
                                "parent_price",
                                event.target.value,
                              )
                            }
                            className="mt-1.5 w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm font-bold text-gray-950 outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-100"
                          />
                        </label>

                        <label className="text-xs font-bold text-gray-600">
                          Comisión colegio
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.school_commission}
                            onChange={(event) =>
                              updateDraftItem(
                                index,
                                "school_commission",
                                event.target.value,
                              )
                            }
                            className="mt-1.5 w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm font-bold text-gray-950 outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-100"
                          />
                        </label>
                      </div>
                    </article>
                  );
                })}
              </div>

              <label
                htmlFor="quotation-notes"
                className="mt-5 block text-xs font-black uppercase tracking-wide text-gray-600"
              >
                Observaciones
              </label>
              <textarea
                id="quotation-notes"
                value={draftNotes}
                onChange={(event) => setDraftNotes(event.target.value)}
                rows={3}
                placeholder="Acuerdos, condiciones o consideraciones de esta versión..."
                className="mt-2 w-full rounded-2xl border border-gray-300 px-4 py-3 text-sm outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-100"
              />

              {errorMessage ? (
                <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-800">
                  {errorMessage}
                </div>
              ) : null}
            </div>

            <div className="flex flex-col-reverse gap-2 border-t border-gray-200 bg-white px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
              <button
                type="button"
                onClick={closeQuotationDrawer}
                disabled={saving}
                className="rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-black text-gray-700 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveQuotation}
                disabled={saving}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-black text-white transition hover:bg-red-700 disabled:opacity-50"
              >
                <FaCheckCircle />
                {saving
                  ? "Guardando..."
                  : editingQuotationId
                    ? "Guardar cambios"
                    : "Guardar borrador"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
