import { useEffect, useMemo, useRef, useState } from "react";
import {
  FaArrowLeft,
  FaCheckCircle,
  FaEdit,
  FaExclamationTriangle,
  FaFileInvoiceDollar,
  FaPaperPlane,
  FaPlus,
  FaPrint,
  FaShieldAlt,
  FaTimes,
  FaUndoAlt,
} from "react-icons/fa";

import { useAuth } from "../../../hooks/useAuth";

import {
  acceptCRMOpportunityQuotation,
  approveCRMOpportunityQuotationDiscount,
  createCRMOpportunityQuotationFromProjection,
  getCRMOpportunityProjection,
  getCRMOpportunityQuotations,
  previewCRMOpportunityQuotationFinancials,
  reopenCRMOpportunityQuotationNegotiation,
  sendCRMOpportunityQuotation,
  updateCRMOpportunityQuotationDraft,
} from "../../../api/crmApi";

const STANDARD_DISCOUNT = 20;

function commercialLineLabel(value) {
  if (value === "school_text") {
    return "Texto escolar";
  }

  if (value === "reading_plan") {
    return "Plan lector";
  }

  return "Sin clasificar";
}

const READING_MONTHS = [
  { value: "1", label: "Enero" },
  { value: "2", label: "Febrero" },
  { value: "3", label: "Marzo" },
  { value: "4", label: "Abril" },
  { value: "5", label: "Mayo" },
  { value: "6", label: "Junio" },
  { value: "7", label: "Julio" },
  { value: "8", label: "Agosto" },
  { value: "9", label: "Septiembre" },
  { value: "10", label: "Octubre" },
  { value: "11", label: "Noviembre" },
  { value: "12", label: "Diciembre" },
];

const SALE_MODES = [
  {
    value: "point_of_sale",
    label: "Punto de venta / librería",
  },
  {
    value: "fair",
    label: "Feria",
  },
  {
    value: "consignment",
    label: "Consignación",
  },
];

function saleModeLabel(value) {
  return (
    SALE_MODES.find((mode) => mode.value === value)?.label
    || "No registrada"
  );
}

function scheduleDateLabel(value) {
  if (!value) {
    return "Fecha de atención";
  }

  if (value === "fair") {
    return "Fecha de feria";
  }

  if (value === "consignment") {
    return "Fecha de entrega en consignación";
  }

  return "Fecha de abastecimiento";
}

function formatScheduleDate(value) {
  if (!value) {
    return "Fecha por definir";
  }

  const [year, month, day] = String(value).split("-").map(Number);
  const date = new Date(year, month - 1, day);

  if (Number.isNaN(date.getTime())) {
    return "Fecha por definir";
  }

  return new Intl.DateTimeFormat("es-PE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function formatScheduleTime(value) {
  if (!value) {
    return "";
  }

  const [hours, minutes] = String(value).slice(0, 5).split(":").map(Number);
  const date = new Date(2000, 0, 1, hours, minutes);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat("es-PE", {
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function saleScheduleSummary(quotation) {
  if (!quotation?.sale_mode) {
    return "Modalidad de venta por definir";
  }

  const parts = [
    saleModeLabel(quotation.sale_mode),
    formatScheduleDate(quotation.service_date),
  ];

  if (quotation.sale_mode === "fair") {
    const start = formatScheduleTime(quotation.fair_start_time);
    const end = formatScheduleTime(quotation.fair_end_time);

    if (start && end) {
      parts.push(`${start} a ${end}`);
    } else {
      parts.push("Horario por definir");
    }
  }

  return parts.join(" · ");
}

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

function formatPercent(value) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return "0.00 %";
  }

  return `${number.toFixed(2)} %`;
}

function formatSignedCurrency(value) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return "—";
  }

  const prefix = number > 0 ? "+" : "";
  return `${prefix}${formatCurrency(number)}`;
}

function negotiationStatus(item) {
  const available = Number(item.additional_discount_available_points);
  const recovery = Number(item.discount_recovery_required_points);
  const surplus = Number(item.green_margin_surplus_unit);

  if (Number.isFinite(available) && available > 0) {
    return {
      label: `Margen disponible: +${available.toFixed(2)} pt`,
      detail: `Equivale a ${formatCurrency(Math.max(surplus, 0))} por unidad antes de salir de verde`,
      className: "text-emerald-700",
    };
  }

  if (Number.isFinite(recovery) && recovery > 0) {
    return {
      label: `Recuperar: ${recovery.toFixed(2)} pt`,
      detail: `Faltan ${formatCurrency(Math.abs(Math.min(surplus, 0)))} por unidad para volver a verde`,
      className: "text-amber-800",
    };
  }

  return {
    label: "Sin margen adicional",
    detail: "La cotización está justo en el límite calculado.",
    className: "text-gray-600",
  };
}

function profitabilityBadgeClass(status) {
  if (status === "green") {
    return "bg-emerald-50 text-emerald-700 ring-emerald-200";
  }

  if (status === "amber") {
    return "bg-amber-50 text-amber-800 ring-amber-200";
  }

  if (status === "red" || status === "loss") {
    return "bg-red-50 text-red-700 ring-red-200";
  }

  return "bg-gray-100 text-gray-600 ring-gray-200";
}

function profitabilitySurfaceClass(status) {
  if (status === "green") {
    return "border-emerald-300 bg-emerald-50";
  }

  if (status === "amber") {
    return "border-amber-300 bg-amber-50";
  }

  if (status === "red" || status === "loss") {
    return "border-red-300 bg-red-50";
  }

  return "border-gray-200 bg-gray-50";
}

function profitabilityHeaderClass(status) {
  if (status === "green") {
    return "bg-emerald-50";
  }

  if (status === "amber") {
    return "bg-amber-50";
  }

  if (status === "red" || status === "loss") {
    return "bg-red-50";
  }

  return "bg-white";
}

function profitabilityRowClass(status) {
  if (status === "green") {
    return "bg-emerald-50";
  }

  if (status === "amber") {
    return "bg-amber-50";
  }

  if (status === "red" || status === "loss") {
    return "bg-red-50";
  }

  return "bg-white";
}

function greenDiscountGuidance(item) {
  const limit = Number(item.max_green_discount_percent);
  const available = Number(item.additional_discount_available_points);
  const recovery = Number(item.discount_recovery_required_points);

  if (!Number.isFinite(limit)) {
    return {
      limit: "Sin cálculo",
      detail: "No hay límite verde disponible.",
      className: "text-gray-500",
    };
  }

  if (Number.isFinite(available) && available > 0) {
    return {
      limit: `< ${limit.toFixed(2)} %`,
      detail: `+${available.toFixed(2)} pt disponibles`,
      className: "text-emerald-700",
    };
  }

  if (Number.isFinite(recovery) && recovery > 0) {
    return {
      limit: `< ${limit.toFixed(2)} %`,
      detail: `Recuperar ${recovery.toFixed(2)} pt`,
      className: "text-amber-800",
    };
  }

  return {
    limit: `< ${limit.toFixed(2)} %`,
    detail: "En el límite calculado.",
    className: "text-gray-600",
  };
}

function overallProfitabilityStatus(analysis) {
  const bands = analysis?.products_by_band || {};
  const unclassified = Number(bands.unclassified || 0);

  if (unclassified > 0) {
    return {
      status: "unclassified",
      label: "Pendiente",
      count: unclassified,
    };
  }

  const rankedBands = [
    {
      status: "loss",
      label: "Pérdida",
      count: Number(bands.loss || 0),
    },
    {
      status: "red",
      label: "Rojo",
      count: Number(bands.red || 0),
    },
    {
      status: "amber",
      label: "Ámbar",
      count: Number(bands.amber || 0),
    },
    {
      status: "green",
      label: "Verde",
      count: Number(bands.green || 0),
    },
  ];

  return (
    rankedBands.find((band) => band.count > 0)
    || {
      status: "unclassified",
      label: "Sin clasificar",
      count: 0,
    }
  );
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
      totals.units += quantity;

      if (item.supplier_discount_percent == null) {
        totals.costPending = true;
      } else {
        totals.cost += Number(item.supplier_cost || 0) * quantity;
      }

      return totals;
    },
    {
      pvp: 0,
      school: 0,
      parents: 0,
      cost: 0,
      units: 0,
      costPending: false,
    },
  );
}

function hasReferencePrice(quotation) {
  return (quotation.items || []).some((item) => item.uses_reference_price);
}

function isFinancialPreviewItemValid(item) {
  const supplierDiscount = Number(item.supplier_discount_percent);
  const schoolDiscount = Number(item.school_discount_percent);
  const commission = Number(item.commission_amount || 0);

  return (
    item.supplier_discount_percent !== ""
    && Number.isFinite(supplierDiscount)
    && supplierDiscount >= 0
    && supplierDiscount <= 100
    && Number.isFinite(schoolDiscount)
    && schoolDiscount >= 0
    && schoolDiscount <= 100
    && Number.isFinite(commission)
    && commission >= 0
  );
}

export default function CRMOpportunityQuotationSection({
  opportunityId,
  onOpportunityChanged,
  onGoToAdoption,
  onGoToProjection,
  hasCurrentAdoption = false,
}) {
  const { hasPermission, hasRole } = useAuth();
  const canApproveDiscount =
    hasRole(["ADMINISTRADOR"]) || hasPermission(["crm.supervise_crm"]);
  const canViewFinancials = canApproveDiscount;

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
  const [draftSaleMode, setDraftSaleMode] = useState("");
  const [draftServiceDate, setDraftServiceDate] = useState("");
  const [draftFairStartTime, setDraftFairStartTime] = useState("");
  const [draftFairEndTime, setDraftFairEndTime] = useState("");
  const [saving, setSaving] = useState(false);
  const [actionId, setActionId] = useState(null);
  const [approvalQuotationId, setApprovalQuotationId] = useState(null);
  const [approvalNote, setApprovalNote] = useState("");
  const [acceptanceQuotationId, setAcceptanceQuotationId] = useState(null);
  const [reopenQuotationId, setReopenQuotationId] = useState(null);
  const [reopenReason, setReopenReason] = useState("");
  const [analysisQuotationId, setAnalysisQuotationId] = useState(null);
  const [financialPreviewByItem, setFinancialPreviewByItem] = useState({});
  const [financialPreviewLoading, setFinancialPreviewLoading] = useState(false);
  const [financialPreviewError, setFinancialPreviewError] = useState("");
  const approvalPanelRef = useRef(null);
  const approvalNoteRef = useRef(null);

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
    if (!approvalQuotationId) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      approvalPanelRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
      approvalNoteRef.current?.focus({ preventScroll: true });
    }, 80);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [approvalQuotationId]);

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

  useEffect(() => {
    if (!drawerOpen || !canViewFinancials || draftItems.length === 0) {
      return undefined;
    }

    const previewableItems = draftItems.filter(isFinancialPreviewItemValid);

    if (previewableItems.length === 0) {
      return undefined;
    }

    let ignore = false;

    const timeoutId = window.setTimeout(async () => {
      setFinancialPreviewLoading(true);
      setFinancialPreviewError("");

      try {
        const response = await previewCRMOpportunityQuotationFinancials(
          opportunityId,
          {
            items: previewableItems.map((item) => ({
              projection_item: item.projection_item,
              school_discount_percent: item.school_discount_percent,
              supplier_discount_percent: item.supplier_discount_percent,
              commission_mode: item.commission_mode,
              commission_amount: item.commission_amount || "0.00",
            })),
          },
        );

        if (ignore) {
          return;
        }

        const nextPreview = {};
        (response?.items || []).forEach((item) => {
          nextPreview[item.projection_item] = item;
        });

        setFinancialPreviewByItem(nextPreview);
      } catch (error) {
        if (!ignore) {
          setFinancialPreviewError(
            getErrorMessage(
              error,
              "No se pudo actualizar el análisis comercial.",
            ),
          );
        }
      } finally {
        if (!ignore) {
          setFinancialPreviewLoading(false);
        }
      }
    }, 300);

    return () => {
      ignore = true;
      window.clearTimeout(timeoutId);
    };
  }, [canViewFinancials, draftItems, drawerOpen, opportunityId]);

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

  const acceptedQuotation = useMemo(
    () =>
      quotations.find(
        (quotation) => quotation.status === "accepted",
      ) || null,
    [quotations],
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
        product_code:
          quotationItem?.product_code_snapshot
          ?? item.product?.code
          ?? "",
        provider_name:
          item.provider_name_snapshot
          || item.product?.provider?.name
          || "Editorial",
        level_name:
          quotationItem?.level_name_snapshot
          ?? item.level_name_snapshot
          ?? "Sin nivel",
        area_name:
          quotationItem?.area_name_snapshot
          ?? item.area_name_snapshot
          ?? "Sin área",
        grade_name:
          quotationItem?.grade_name_snapshot
          ?? item.grade_name_snapshot
          ?? "Sin grado",
        commercial_line:
          quotationItem?.commercial_line
          ?? projection?.commercial_line
          ?? item.commercial_line
          ?? "other",
        reading_month: String(quotationItem?.reading_month ?? ""),
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
        supplier_cost: String(quotationItem?.supplier_cost ?? ""),
        supplier_discount_percent: String(
          quotationItem?.supplier_discount_percent ?? "",
        ),
        commission_mode:
          quotationItem?.commission_mode ?? "per_unit",
        commission_amount: String(
          quotationItem?.commission_input_amount ?? "0.00",
        ),
        commercial_margin_unit: String(
          quotationItem?.commercial_margin_unit ?? "",
        ),
        commercial_margin_total: String(
          quotationItem?.commercial_margin_total ?? "",
        ),
        commercial_margin_percent: String(
          quotationItem?.commercial_margin_percent ?? "",
        ),
        profitability_band:
          quotationItem?.profitability_band ?? "unclassified",
        profitability_band_display:
          quotationItem?.profitability_band_display ?? "Sin clasificar",
        max_green_discount_percent: String(
          quotationItem?.max_green_discount_percent ?? "",
        ),
        green_discount_headroom_points: String(
          quotationItem?.green_discount_headroom_points ?? "",
        ),
        green_margin_threshold_unit: String(
          quotationItem?.green_margin_threshold_unit ?? "",
        ),
        green_margin_surplus_unit: String(
          quotationItem?.green_margin_surplus_unit ?? "",
        ),
        green_margin_surplus_total: String(
          quotationItem?.green_margin_surplus_total ?? "",
        ),
        additional_discount_available_points: String(
          quotationItem?.additional_discount_available_points ?? "",
        ),
        discount_recovery_required_points: String(
          quotationItem?.discount_recovery_required_points ?? "",
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
    setDraftSaleMode(quotation?.sale_mode || "");
    setDraftServiceDate(quotation?.service_date || "");
    setDraftFairStartTime(
      quotation?.sale_mode === "fair"
        ? String(quotation?.fair_start_time || "").slice(0, 5)
        : "",
    );
    setDraftFairEndTime(
      quotation?.sale_mode === "fair"
        ? String(quotation?.fair_end_time || "").slice(0, 5)
        : "",
    );
    setFinancialPreviewByItem({});
    setFinancialPreviewError("");
    setFinancialPreviewLoading(false);
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
    setDraftSaleMode("");
    setDraftServiceDate("");
    setDraftFairStartTime("");
    setDraftFairEndTime("");
    setFinancialPreviewByItem({});
    setFinancialPreviewError("");
    setFinancialPreviewLoading(false);
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
      const discount = Number(item.school_discount_percent);
      const parentPrice = Number(item.parent_price);
      const readingMonth =
        item.reading_month === "" ? null : Number(item.reading_month);
      const commission = Number(item.commission_amount || 0);
      const supplierDiscount =
        item.supplier_discount_percent === ""
          ? null
          : Number(item.supplier_discount_percent);

      return (
        !Number.isFinite(discount)
        || discount < 0
        || discount > 100
        || !Number.isFinite(parentPrice)
        || parentPrice < 0
        || (
          item.commercial_line === "reading_plan"
          && readingMonth === null
        )
        || (
          readingMonth !== null
          && (
            !Number.isInteger(readingMonth)
            || readingMonth < 1
            || readingMonth > 12
          )
        )
        || (
          canViewFinancials
          && (!Number.isFinite(commission) || commission < 0)
        )
        || (
          canViewFinancials
          && (
            supplierDiscount === null
            || !Number.isFinite(supplierDiscount)
            || supplierDiscount < 0
            || supplierDiscount > 100
          )
        )
      );
    });

    if (invalidItem) {
      setErrorMessage(
        "Revisa descuento I.E., descuento editorial e incentivo. En Plan lector, cada producto debe tener mes de lectura.",
      );
      return;
    }

    if (
      draftSaleMode === "fair"
      && draftFairStartTime
      && draftFairEndTime
      && draftFairEndTime <= draftFairStartTime
    ) {
      setErrorMessage(
        "La hora de fin de la feria debe ser posterior a la hora de inicio.",
      );
      return;
    }

    setSaving(true);
    setErrorMessage("");

    try {
      const payload = {
        items: draftItems.map((item) => {
          const quotationItem = {
            projection_item: item.projection_item,
            school_discount_percent: item.school_discount_percent,
            parent_price: item.parent_price,
            reading_month:
              item.commercial_line === "reading_plan"
                ? (
                    item.reading_month === ""
                      ? null
                      : Number(item.reading_month)
                  )
                : null,
          };

          if (canViewFinancials) {
            quotationItem.supplier_discount_percent =
              item.supplier_discount_percent;
            quotationItem.commission_mode = item.commission_mode;
            quotationItem.commission_amount =
              item.commission_amount || "0.00";
          }

          return quotationItem;
        }),
        sale_mode: draftSaleMode,
        service_date: draftServiceDate || null,
        fair_start_time:
          draftSaleMode === "fair" && draftFairStartTime
            ? draftFairStartTime
            : null,
        fair_end_time:
          draftSaleMode === "fair" && draftFairEndTime
            ? draftFairEndTime
            : null,
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
      setFinancialPreviewLoading(false);
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
        `Cotización v${quotation.version} marcada como enviada correctamente.`,
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
      setAcceptanceQuotationId(null);
      setSuccessMessage(
        `Aceptación del colegio registrada para la cotización v${quotation.version}.`,
      );
      refreshWorkspace();
    } catch (error) {
      setErrorMessage(
        getErrorMessage(
          error,
          "No se pudo registrar la aceptación del colegio.",
        ),
      );
    } finally {
      setActionId(null);
    }
  }

  async function handleReopenNegotiation(quotation) {
    const reason = reopenReason.trim();

    if (!reason) {
      setErrorMessage(
        "Registra el motivo por el que se reabre la negociación.",
      );
      return;
    }

    setActionId(quotation.id);
    setErrorMessage("");

    try {
      await reopenCRMOpportunityQuotationNegotiation(
        opportunityId,
        quotation.id,
        { reason },
      );
      setReopenQuotationId(null);
      setReopenReason("");
      setSuccessMessage(
        `Negociación reabierta desde la cotización v${quotation.version}. Ya puedes actualizar la Proyección o crear una nueva cotización.`,
      );
      refreshWorkspace();
    } catch (error) {
      setErrorMessage(
        getErrorMessage(
          error,
          "No se pudo reabrir la negociación.",
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

          {!editableDraft && !acceptedQuotation ? (
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

        {acceptedQuotation && !hasCurrentAdoption ? (
          <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
            <p className="font-black">
              Hay una cotización aceptada
            </p>
            <p className="mt-1 leading-6">
              Si el colegio mantiene el acuerdo, continúa a Adopción. Si pidió
              cambios antes de formalizarla, reabre la negociación y conserva
              esta versión como historial.
            </p>
          </div>
        ) : null}

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
              const statusLabel = quotation.reopened_at
                ? "Aceptación reabierta"
                : quotation.status_display || quotation.status;
              const overallProfitability = overallProfitabilityStatus(
                quotation.commercial_analysis,
              );

              return (
                <article
                  key={quotation.id}
                  className={`overflow-hidden rounded-2xl border ${profitabilitySurfaceClass(
                    canViewFinancials && quotation.commercial_analysis
                      ? overallProfitability.status
                      : "unclassified",
                  )}`}
                >
                  <div
                    className={`flex flex-col justify-between gap-3 border-b border-gray-200 p-4 lg:flex-row lg:items-center ${profitabilityHeaderClass(
                      canViewFinancials && quotation.commercial_analysis
                        ? overallProfitability.status
                        : "unclassified",
                    )}`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gray-950 text-white">
                        <FaFileInvoiceDollar />
                      </div>
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-black text-gray-950">
                            Cotización v{quotation.version}
                          </p>
                          <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-black text-gray-600">
                            {quotation.commercial_line_display
                              || commercialLineLabel(quotation.commercial_line)}
                          </span>
                          <span
                            className={`rounded-full px-2.5 py-1 text-xs font-black ring-1 ${statusBadgeClass(
                              quotation.status,
                            )}`}
                          >
                            {statusLabel}
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
                        {quotation.internal_code ? (
                          <p className="mt-1 text-xs font-bold text-gray-500">
                            Código interno: {quotation.internal_code}
                          </p>
                        ) : null}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                      {quotation.status === "accepted" && onGoToAdoption ? (
                        <button
                          type="button"
                          onClick={onGoToAdoption}
                          className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-3 py-2 text-xs font-black text-white transition hover:bg-red-700"
                        >
                          <FaCheckCircle />
                          {hasCurrentAdoption ? "Ver adopción" : "Ir a adopción"}
                        </button>
                      ) : null}
                      <button
                        type="button"
                        onClick={() =>
                          window.open(
                            `/admin/crm/oportunidades/${opportunityId}/cotizaciones/${quotation.id}/imprimir`,
                            "_blank",
                            "noopener,noreferrer",
                          )
                        }
                        className="inline-flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs font-black text-gray-800 transition hover:bg-gray-50"
                      >
                        <FaPrint />
                        Imprimir
                      </button>

                      {canViewFinancials && quotation.commercial_analysis ? (
                        <button
                          type="button"
                          onClick={() =>
                            setAnalysisQuotationId(
                              analysisQuotationId === quotation.id
                                ? null
                                : quotation.id,
                            )
                          }
                          className="inline-flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs font-black text-gray-800 transition hover:bg-gray-50"
                        >
                          <FaFileInvoiceDollar />
                          {analysisQuotationId === quotation.id
                            ? "Ocultar análisis"
                            : "Análisis interno"}
                        </button>
                      ) : null}

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
                            const isClosing =
                              approvalQuotationId === quotation.id;

                            setApprovalQuotationId(
                              isClosing ? null : quotation.id,
                            );
                            setApprovalNote("");
                          }}
                          disabled={busy}
                          aria-expanded={
                            approvalQuotationId === quotation.id
                          }
                          className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-black transition disabled:opacity-50 ${
                            approvalQuotationId === quotation.id
                              ? "border-amber-500 bg-amber-100 text-amber-950 ring-2 ring-amber-200"
                              : "border-amber-300 bg-amber-50 text-amber-900 hover:border-amber-400 hover:bg-amber-100"
                          }`}
                        >
                          <FaShieldAlt />
                          {approvalQuotationId === quotation.id
                            ? "Completar aprobación"
                            : "Aprobar descuento"}
                        </button>
                      ) : null}

                      {quotation.status === "draft"
                      && quotation.requires_discount_approval
                      && quotation.discount_approval_status !== "approved"
                      && !canApproveDiscount ? (
                        <span className="inline-flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-black text-amber-800">
                          <FaShieldAlt />
                          Pendiente de aprobación de descuento
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
                          onClick={() =>
                            setAcceptanceQuotationId(
                              acceptanceQuotationId === quotation.id
                                ? null
                                : quotation.id,
                            )
                          }
                          disabled={busy}
                          className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-3 py-2 text-xs font-black text-white transition hover:bg-red-700 disabled:opacity-50"
                        >
                          <FaCheckCircle />
                          Registrar aceptación
                        </button>
                      ) : null}

                      {quotation.status === "accepted"
                      && !hasCurrentAdoption ? (
                        <button
                          type="button"
                          onClick={() => {
                            const isClosing =
                              reopenQuotationId === quotation.id;
                            setReopenQuotationId(
                              isClosing ? null : quotation.id,
                            );
                            setReopenReason("");
                          }}
                          disabled={busy}
                          className="inline-flex items-center gap-2 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-black text-amber-900 transition hover:bg-amber-100 disabled:opacity-50"
                        >
                          <FaUndoAlt />
                          Reabrir
                        </button>
                      ) : null}

                    </div>
                  </div>

                  <div
                    className={`grid gap-3 p-4 sm:grid-cols-2 ${
                      canViewFinancials
                        ? "xl:grid-cols-4"
                        : "xl:grid-cols-3"
                    }`}
                  >
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
                        P.IE total
                      </p>
                      <p className="mt-1 text-lg font-black text-gray-950">
                        {formatCurrency(totals.school)}
                      </p>
                    </div>
                    {canViewFinancials ? (
                      <div className="rounded-xl bg-white p-3 ring-1 ring-gray-200">
                        <p className="text-xs font-bold uppercase tracking-wide text-gray-500">
                          Costo editorial
                        </p>
                        <p className="mt-1 text-lg font-black text-gray-950">
                          {totals.costPending
                            ? "Pendiente"
                            : formatCurrency(totals.cost)}
                        </p>
                      </div>
                    ) : null}
                  </div>

                  {canViewFinancials
                  && analysisQuotationId === quotation.id
                  && quotation.commercial_analysis ? (
                    <div
                      className={`mx-4 mb-4 rounded-2xl border p-4 ${profitabilitySurfaceClass(
                        overallProfitability.status,
                      )}`}
                    >
                      <div className="flex flex-col justify-between gap-3 border-b border-gray-200 pb-4 lg:flex-row lg:items-start">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-xs font-black uppercase tracking-wide text-red-700">
                              Análisis comercial · Interno
                            </p>
                            <span className="rounded-full bg-gray-950 px-2.5 py-1 text-xs font-black text-white">
                              {quotation.commercial_analysis.commercial_line_display
                                || quotation.commercial_line_display
                                || commercialLineLabel(quotation.commercial_line)}
                            </span>
                          </div>
                          <p className="mt-2 max-w-2xl text-xs leading-5 text-gray-500">
                            Uso exclusivo de supervisión comercial. Resume la
                            rentabilidad real después del costo editorial y los
                            incentivos autorizados.
                          </p>
                        </div>

                        <div className="rounded-xl bg-gray-950 px-4 py-3 text-white">
                          <p className="text-xs font-bold uppercase text-gray-300">
                            Rentabilidad sobre venta (P.IE)
                          </p>
                          <p className="mt-1 text-lg font-black">
                            {quotation.commercial_analysis
                              .has_pending_supplier_conditions
                              ? "Pendiente"
                              : formatPercent(
                                  quotation.commercial_analysis.margin_percent,
                                )}
                          </p>
                          <p className="mt-1 text-xs text-gray-300">
                            Ganancia neta estimada ÷ Venta P.IE
                          </p>
                        </div>
                      </div>

                      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                        <div className="rounded-xl bg-gray-50 p-3 ring-1 ring-gray-200">
                          <p className="text-xs font-bold uppercase text-gray-500">
                            Venta P.IE
                          </p>
                          <p className="mt-1 text-lg font-black text-gray-950">
                            {formatCurrency(
                              quotation.commercial_analysis.sales_total,
                            )}
                          </p>
                        </div>
                        <div className="rounded-xl bg-gray-50 p-3 ring-1 ring-gray-200">
                          <p className="text-xs font-bold uppercase text-gray-500">
                            Costo editorial
                          </p>
                          <p className="mt-1 text-lg font-black text-gray-950">
                            {quotation.commercial_analysis
                              .has_pending_supplier_conditions
                              ? "Pendiente"
                              : formatCurrency(
                                  quotation.commercial_analysis.cost_total,
                                )}
                          </p>
                        </div>
                        <div className="rounded-xl bg-gray-50 p-3 ring-1 ring-gray-200">
                          <p className="text-xs font-bold uppercase text-gray-500">
                            Incentivos
                          </p>
                          <p className="mt-1 text-lg font-black text-gray-950">
                            {formatCurrency(
                              quotation.commercial_analysis.commission_total,
                            )}
                          </p>
                        </div>
                        <div className="rounded-xl bg-gray-50 p-3 ring-1 ring-gray-200">
                          <p className="text-xs font-bold uppercase text-gray-500">
                            Ganancia neta estimada
                          </p>
                          <p className="mt-1 text-lg font-black text-gray-950">
                            {quotation.commercial_analysis
                              .has_pending_supplier_conditions
                              ? "Pendiente"
                              : formatCurrency(
                                  quotation.commercial_analysis.margin_total,
                                )}
                          </p>
                        </div>
                        <div className="rounded-xl bg-gray-50 p-3 ring-1 ring-gray-200">
                          <p className="text-xs font-bold uppercase text-gray-500">
                            Estado general
                          </p>
                          <span
                            className={`mt-1 inline-flex rounded-full px-2.5 py-1 text-xs font-black ring-1 ${profitabilityBadgeClass(
                              overallProfitability.status,
                            )}`}
                          >
                            {overallProfitability.label}
                          </span>
                          <p className="mt-2 text-xs leading-4 text-gray-500">
                            Según el producto con el estado más crítico.
                          </p>
                        </div>
                      </div>

                      <div className="mt-3 grid gap-3 sm:grid-cols-2">
                        <div className="rounded-xl border border-gray-200 bg-white p-3">
                          <p className="text-xs font-bold uppercase text-gray-500">
                            Mínimo para estar en verde
                          </p>
                          <p className="mt-1 text-base font-black text-gray-950">
                            {quotation.commercial_analysis.green_margin_threshold_unit == null
                              ? "—"
                              : `${formatCurrency(
                                  quotation.commercial_analysis.green_margin_threshold_unit,
                                )} / unidad`}
                          </p>
                          <p className="mt-1 text-xs text-gray-500">
                            Texto escolar: más de S/ 20 · Plan lector: más de S/ 5.
                          </p>
                        </div>
                        <div className="rounded-xl border border-gray-200 bg-white p-3">
                          <p className="text-xs font-bold uppercase text-gray-500">
                            Colchón total frente al mínimo verde
                          </p>
                          <p className="mt-1 text-base font-black text-gray-950">
                            {quotation.commercial_analysis
                              .has_pending_supplier_conditions
                              ? "Pendiente"
                              : formatSignedCurrency(
                                  quotation.commercial_analysis
                                    .green_margin_surplus_total,
                                )}
                          </p>
                          <p className="mt-1 text-xs text-gray-500">
                            Importe total que todavía sobra para mantener verde,
                            o que falta recuperar si la cotización cae por debajo.
                          </p>
                        </div>
                      </div>

                      {quotation.commercial_analysis
                        .has_pending_supplier_conditions ? (
                        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3">
                          <p className="text-xs font-black uppercase tracking-wide text-amber-900">
                            Condición editorial pendiente
                          </p>
                          <p className="mt-1 text-xs leading-5 text-amber-800">
                            Registra el descuento editorial de todos los
                            productos para calcular costo, ganancia, margen y
                            semáforo de forma oficial.
                          </p>
                        </div>
                      ) : null}

                      <div className="mt-4 rounded-xl border border-gray-200 bg-gray-50 p-3">
                        <p className="text-xs font-black uppercase tracking-wide text-gray-600">
                          Distribución del semáforo por producto
                        </p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {Object.entries(
                            quotation.commercial_analysis.products_by_band || {},
                          ).map(([band, total]) => (
                            <span
                              key={band}
                              className={`rounded-full px-3 py-1 text-xs font-black ring-1 ${profitabilityBadgeClass(
                                band,
                              )}`}
                            >
                              {band === "green"
                                ? "Verde"
                                : band === "amber"
                                  ? "Ámbar"
                                  : band === "red"
                                    ? "Rojo"
                                    : band === "loss"
                                      ? "Pérdida"
                                      : "Sin clasificar"}: {total}
                            </span>
                          ))}
                        </div>
                      </div>

                      {!quotation.commercial_analysis
                        .has_pending_supplier_conditions
                      && quotation.commercial_analysis.margin_by_editorial?.length ? (
                        <div className="mt-4">
                          <p className="text-xs font-black uppercase tracking-wide text-gray-500">
                            Margen proyectado por editorial
                          </p>
                          <div className="mt-2 flex flex-wrap gap-2">
                            {quotation.commercial_analysis.margin_by_editorial.map(
                              (editorial) => (
                                <span
                                  key={editorial.editorial}
                                  className="rounded-xl bg-gray-100 px-3 py-2 text-xs font-bold text-gray-700"
                                >
                                  {editorial.editorial}:{" "}
                                  <strong>
                                    {formatCurrency(editorial.margin_total)}
                                  </strong>
                                </span>
                              ),
                            )}
                          </div>
                        </div>
                      ) : null}

                      <details className="mt-4 border-t border-gray-200 pt-3">
                        <summary className="cursor-pointer list-none rounded-xl bg-white px-4 py-3 text-xs font-black uppercase tracking-wide text-gray-700 ring-1 ring-gray-200 transition hover:bg-gray-50">
                          Detalle de rentabilidad por producto ({quotation.items?.length || 0})
                        </summary>

                        <div className="mt-3 overflow-x-auto rounded-xl border border-gray-200">
                          <table className="min-w-max border-collapse text-xs">
                            <thead className="bg-gray-950 text-white">
                              <tr>
                                <th className="min-w-64 px-3 py-3 text-left font-black">
                                  Producto
                                </th>
                                <th className="min-w-20 px-2 py-3 text-center font-black">
                                  Cant.
                                </th>
                                <th className="min-w-24 px-2 py-3 text-right font-black">
                                  PVP
                                </th>
                                <th className="min-w-28 px-3 py-3 text-center font-black">
                                  Dscto. I.E.
                                </th>
                                <th className="min-w-28 px-3 py-3 text-right font-black">
                                  P.IE
                                </th>
                                <th className="min-w-32 px-3 py-3 text-center font-black">
                                  Dscto. editorial
                                </th>
                                <th className="min-w-32 px-3 py-3 text-right font-black">
                                  Costo editorial
                                </th>
                                <th className="min-w-28 px-3 py-3 text-right font-black">
                                  Incentivo
                                </th>
                                <th className="min-w-28 px-3 py-3 text-right font-black">
                                  Ganancia/u
                                </th>
                                <th className="min-w-32 px-3 py-3 text-right font-black">
                                  Ganancia total
                                </th>
                                <th className="min-w-40 px-3 py-3 text-center font-black">
                                  Máx. Dscto. I.E. verde
                                </th>
                                <th className="min-w-40 px-3 py-3 text-center font-black">
                                  Estado
                                </th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 bg-white">
                              {(quotation.items || []).map((item) => {
                                const supplierConditionPending =
                                  item.supplier_discount_percent == null;
                                const itemNegotiation = negotiationStatus(item);
                                const greenGuidance = greenDiscountGuidance(item);

                                return (
                                  <tr
                                    key={item.id}
                                    className={`align-middle ${profitabilityRowClass(
                                      supplierConditionPending
                                        ? "unclassified"
                                        : item.profitability_band,
                                    )}`}
                                  >
                                    <td className="px-3 py-3">
                                      <p className="wrap-break-word font-black text-gray-950">
                                        {item.product_name_snapshot}
                                      </p>
                                      <p className="mt-1 text-xs font-semibold text-gray-500">
                                        {item.provider_name_snapshot}
                                      </p>
                                    </td>
                                    <td className="px-2 py-3 text-center font-black text-gray-950">
                                      {item.quantity}
                                    </td>
                                    <td className="whitespace-nowrap px-2 py-3 text-right font-black text-gray-950">
                                      {formatCurrency(item.pvp)}
                                    </td>
                                    <td className="whitespace-nowrap px-3 py-3 text-center font-black text-gray-950">
                                      {formatPercent(item.school_discount_percent)}
                                    </td>
                                    <td className="whitespace-nowrap px-3 py-3 text-right font-black text-gray-950">
                                      {formatCurrency(item.school_price)}
                                    </td>
                                    <td className="whitespace-nowrap px-3 py-3 text-center font-black text-gray-950">
                                      {item.supplier_discount_percent == null
                                        ? "Pendiente"
                                        : formatPercent(
                                            item.supplier_discount_percent,
                                          )}
                                    </td>
                                    <td className="whitespace-nowrap px-3 py-3 text-right font-black text-gray-950">
                                      {supplierConditionPending
                                        ? "Pendiente"
                                        : formatCurrency(item.supplier_cost)}
                                    </td>
                                    <td className="whitespace-nowrap px-3 py-3 text-right font-black text-gray-950">
                                      {formatCurrency(item.school_commission)}
                                    </td>
                                    <td className="whitespace-nowrap px-3 py-3 text-right font-black text-gray-950">
                                      {supplierConditionPending
                                        ? "Pendiente"
                                        : formatCurrency(
                                            item.commercial_margin_unit,
                                          )}
                                    </td>
                                    <td className="whitespace-nowrap px-3 py-3 text-right font-black text-gray-950">
                                      {supplierConditionPending
                                        ? "Pendiente"
                                        : formatCurrency(
                                            item.commercial_margin_total,
                                          )}
                                    </td>
                                    <td className="px-3 py-3 text-center">
                                      <p className="font-black text-gray-950">
                                        {supplierConditionPending
                                          ? "Pendiente"
                                          : greenGuidance.limit}
                                      </p>
                                      <p className={`mt-1 text-xs font-bold ${greenGuidance.className}`}>
                                        {supplierConditionPending
                                          ? "Registra el descuento editorial"
                                          : greenGuidance.detail}
                                      </p>
                                    </td>
                                    <td className="px-3 py-3 text-center">
                                      <span
                                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-black ring-1 ${profitabilityBadgeClass(
                                          supplierConditionPending
                                            ? "unclassified"
                                            : item.profitability_band,
                                        )}`}
                                      >
                                        {supplierConditionPending
                                          ? "Pendiente"
                                          : item.profitability_band_display
                                            || "Sin clasificar"}
                                      </span>
                                      <p className={`mt-2 text-xs font-bold ${itemNegotiation.className}`}>
                                        {supplierConditionPending
                                          ? "Sin cálculo de rentabilidad"
                                          : itemNegotiation.detail}
                                      </p>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>

                        <p className="mt-2 text-xs leading-5 text-gray-500">
                          Ganancia/u = P.IE - costo editorial - incentivo.
                          “Máx. Dscto. I.E. verde” muestra el límite comercial
                          calculado para conservar el producto en verde; el
                          porcentaje debe mantenerse por debajo de ese valor.
                        </p>
                      </details>
                    </div>
                  ) : null}

                  {reopenQuotationId === quotation.id
                  && quotation.status === "accepted"
                  && !hasCurrentAdoption ? (
                    <div className="mx-4 mb-4 rounded-2xl border border-amber-300 bg-amber-50 p-4">
                      <div className="flex items-start gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-900">
                          <FaUndoAlt />
                        </div>
                        <div>
                          <p className="font-black text-gray-950">
                            Reabrir negociación
                          </p>
                          <p className="mt-1 text-xs leading-5 text-gray-600">
                            La cotización v{quotation.version} conservará su
                            aceptación como historial, pero dejará de ser la
                            versión vigente. Luego podrás modificar la
                            Proyección si cambió población/productos o crear
                            una nueva cotización si solo cambian condiciones.
                          </p>
                        </div>
                      </div>

                      <label
                        htmlFor={`reopen-reason-${quotation.id}`}
                        className="mt-4 block text-xs font-black uppercase tracking-wide text-gray-600"
                      >
                        Motivo de reapertura
                      </label>
                      <textarea
                        id={`reopen-reason-${quotation.id}`}
                        value={reopenReason}
                        onChange={(event) => setReopenReason(event.target.value)}
                        rows={3}
                        disabled={busy}
                        placeholder="Ej. El colegio modificó la población o solicita nuevas condiciones..."
                        className="mt-2 w-full rounded-xl border border-amber-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-100 disabled:opacity-50"
                      />

                      <div className="mt-3 flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setReopenQuotationId(null);
                            setReopenReason("");
                          }}
                          disabled={busy}
                          className="rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs font-black text-gray-700 disabled:opacity-50"
                        >
                          Cancelar
                        </button>
                        <button
                          type="button"
                          onClick={() => handleReopenNegotiation(quotation)}
                          disabled={busy || !reopenReason.trim()}
                          className="rounded-xl bg-gray-950 px-3 py-2 text-xs font-black text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {busy ? "Reabriendo..." : "Confirmar reapertura"}
                        </button>
                      </div>
                    </div>
                  ) : null}

                  {quotation.reopened_at ? (
                    <div className="mx-4 mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-900">
                      <p className="font-black">
                        Aceptación reabierta {formatDateTime(quotation.reopened_at)}
                      </p>
                      <p className="mt-1">
                        {quotation.reopen_reason || "Sin motivo registrado."}
                      </p>
                    </div>
                  ) : null}

                  {quotation.status === "draft" ? (
                    <div className="mx-4 mb-4 rounded-xl border border-gray-200 bg-white px-4 py-3 text-xs leading-5 text-gray-600">
                      <span className="font-black text-gray-800">
                        Marcar como enviada
                      </span>{" "}
                      solo registra que esta versión ya fue enviada al colegio.
                      No envía correo ni WhatsApp automáticamente.
                    </div>
                  ) : null}

                  {acceptanceQuotationId === quotation.id
                  && quotation.status === "sent" ? (
                    <div className="mx-4 mb-4 rounded-2xl border border-red-200 bg-red-50 p-4">
                      <div className="flex items-start gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-red-100 text-red-700">
                          <FaCheckCircle />
                        </div>
                        <div>
                          <p className="font-black text-gray-950">
                            ¿Registrar aceptación de la cotización v{quotation.version}?
                          </p>
                          <p className="mt-1 text-xs leading-5 text-gray-600">
                            Se registrará que el colegio aceptó esta versión.
                            Las demás cotizaciones abiertas de la oportunidad
                            pasarán a estado Reemplazada.
                          </p>
                        </div>
                      </div>

                      <div className="mt-3 flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setAcceptanceQuotationId(null)}
                          disabled={busy}
                          className="rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs font-black text-gray-700 disabled:opacity-50"
                        >
                          Cancelar
                        </button>
                        <button
                          type="button"
                          onClick={() => handleAcceptQuotation(quotation)}
                          disabled={busy}
                          className="rounded-xl bg-red-600 px-3 py-2 text-xs font-black text-white transition hover:bg-red-700 disabled:opacity-50"
                        >
                          {busy ? "Registrando..." : "Confirmar aceptación"}
                        </button>
                      </div>
                    </div>
                  ) : null}

                  {referencePrice ? (
                    <div className="mx-4 mb-4 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                      <FaExclamationTriangle className="mt-0.5 shrink-0" />
                      <div>
                        <p className="font-black">
                          Usa precios referenciales de una campaña anterior
                        </p>
                        <p className="mt-1 leading-5">
                          Puedes conservar el borrador para planificación, pero
                          no podrá marcarse como enviado hasta cargar los
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
                          Esta versión necesita aprobación del descuento antes de
                          poder marcarse como enviada.
                        </p>
                      </div>
                    </div>
                  ) : null}

                  {approvalQuotationId === quotation.id
                  && quotation.discount_approval_status !== "approved" ? (
                    <div
                      ref={approvalPanelRef}
                      className="mx-4 mb-4 rounded-2xl border border-amber-300 bg-amber-50 p-4 shadow-sm ring-1 ring-amber-100"
                    >
                      <div className="mb-3 flex items-start gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-900">
                          <FaShieldAlt />
                        </div>
                        <div>
                          <p className="font-black text-gray-950">
                            Sustento de aprobación de descuento
                          </p>
                          <p className="mt-1 text-xs leading-5 text-gray-600">
                            Registra el motivo o condición que autoriza este
                            descuento antes de confirmarlo.
                          </p>
                        </div>
                      </div>

                      <label
                        htmlFor={`approval-note-${quotation.id}`}
                        className="text-xs font-black uppercase tracking-wide text-gray-600"
                      >
                        Observación de aprobación
                      </label>
                      <textarea
                        ref={approvalNoteRef}
                        id={`approval-note-${quotation.id}`}
                        value={approvalNote}
                        onChange={(event) => setApprovalNote(event.target.value)}
                        rows={3}
                        placeholder="Motivo o condición autorizada por el supervisor..."
                        className="mt-2 w-full rounded-xl border border-amber-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-100"
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
                          Aprobación de descuento:
                        </span>{" "}
                        {quotation.discount_approval_status_display
                          || "No requerida"}
                      </p>
                    </div>

                    <div className="mt-3 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-xs text-gray-600">
                      <span className="font-black text-gray-900">
                        Modalidad y atención:
                      </span>{" "}
                      {saleScheduleSummary(quotation)}
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
              <div className="mb-4 flex flex-col gap-3 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-950 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-black">
                    Productos y cantidades bloqueados desde Proyección
                  </p>
                  <p className="mt-1 leading-5 text-blue-800">
                    Si cambia la población, grado, producto o cantidad,
                    actualiza primero la Proyección y luego genera una nueva
                    cotización.
                  </p>
                </div>

                {onGoToProjection ? (
                  <button
                    type="button"
                    onClick={() => {
                      closeQuotationDrawer();
                      onGoToProjection();
                    }}
                    disabled={saving}
                    className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-blue-300 bg-white px-3 py-2 text-xs font-black text-blue-900 transition hover:bg-blue-100 disabled:opacity-50"
                  >
                    <FaArrowLeft />
                    Volver a Proyección
                  </button>
                ) : null}
              </div>

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

              {canViewFinancials ? (
                <div className="mt-4 rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700">
                  <p className="font-black text-gray-950">
                    Análisis comercial interno
                  </p>
                  <p className="mt-1 leading-5">
                    Costos, incentivos, margen y semáforo son información
                    reservada para supervisión comercial. Los cálculos se
                    actualizan automáticamente al guardar los cambios.
                  </p>
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
                  const pvp = Number(item.pvp || 0);
                  const discount = Number(item.school_discount_percent || 0);
                  const schoolPrice =
                    Number.isFinite(pvp) && Number.isFinite(discount)
                      ? pvp * (1 - discount / 100)
                      : 0;
                  const savedFinancial =
                    canViewFinancials
                    && item.supplier_discount_percent !== ""
                    && item.commercial_margin_unit !== ""
                      ? item
                      : null;
                  const liveFinancial =
                    canViewFinancials && isFinancialPreviewItemValid(item)
                      ? financialPreviewByItem[item.projection_item] || null
                      : null;
                  const financial = liveFinancial || savedFinancial;
                  const hasFinancialAnalysis = Boolean(financial);
                  const negotiation = financial
                    ? negotiationStatus(financial)
                    : null;

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
                            {item.provider_name} · {item.level_name} ·{" "}
                            {item.area_name} · {item.grade_name}
                          </p>
                          <p className="mt-1 text-xs text-gray-500">
                            Código: {item.product_code || "Sin código"}
                          </p>
                          {referencePrice ? (
                            <p className="mt-1 text-xs font-black text-amber-700">
                              Precio referencial {item.price_year_snapshot}
                            </p>
                          ) : null}
                        </div>

                        {hasFinancialAnalysis ? (
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-black ring-1 ${profitabilityBadgeClass(
                              financial.profitability_band,
                            )}`}
                          >
                            {financial.profitability_band_display}
                          </span>
                        ) : null}
                      </div>

                      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                        <div className="text-xs font-bold text-gray-600">
                          Cantidad
                          <div className="mt-1.5 rounded-xl border border-gray-200 bg-gray-100 px-3 py-2.5 text-sm font-black text-gray-950">
                            {item.quantity}
                            <span className="ml-2 text-xs font-bold text-gray-500">
                              Desde Proyección
                            </span>
                          </div>
                        </div>

                        <div className="text-xs font-bold text-gray-600">
                          PVP
                          <div className="mt-1.5 rounded-xl border border-gray-200 bg-gray-100 px-3 py-2.5 text-sm font-black text-gray-950">
                            {formatCurrency(item.pvp)}
                          </div>
                        </div>

                        <label className="text-xs font-bold text-gray-600">
                          Descuento I.E. %
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

                        <div className="text-xs font-bold text-gray-600">
                          P.IE
                          <div className="mt-1.5 rounded-xl border border-gray-200 bg-gray-100 px-3 py-2.5 text-sm font-black text-gray-950">
                            {formatCurrency(schoolPrice)}
                          </div>
                        </div>
                      </div>

                      {item.commercial_line === "reading_plan" ? (
                        <div className="mt-3 grid gap-3 sm:grid-cols-2">
                          <label className="text-xs font-bold text-gray-600">
                            Mes de lectura
                            <select
                              value={item.reading_month}
                              onChange={(event) =>
                                updateDraftItem(
                                  index,
                                  "reading_month",
                                  event.target.value,
                                )
                              }
                              className="mt-1.5 w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm font-bold text-gray-950 outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-100"
                            >
                              <option value="">Por definir</option>
                              {READING_MONTHS.map((month) => (
                                <option
                                  key={month.value}
                                  value={month.value}
                                >
                                  {month.label}
                                </option>
                              ))}
                            </select>
                          </label>
                        </div>
                      ) : null}

                      {canViewFinancials ? (
                        <div className="mt-4 rounded-2xl border border-gray-200 bg-gray-50 p-4">
                          <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-start">
                            <div>
                              <p className="text-xs font-black uppercase tracking-wide text-red-700">
                                Condición comercial interna
                              </p>
                              <p className="mt-1 text-xs leading-5 text-gray-500">
                                Registra el descuento que la editorial concede a
                                Book Express. El sistema calcula automáticamente
                                el costo editorial, la ganancia y el semáforo.
                              </p>
                            </div>
                            {financialPreviewLoading
                            && draftItems.some(isFinancialPreviewItemValid) ? (
                              <span className="text-xs font-bold text-gray-500">
                                Recalculando...
                              </span>
                            ) : null}
                          </div>

                          <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                            <label className="text-xs font-bold text-gray-600">
                              Descuento editorial %
                              <input
                                type="number"
                                min="0"
                                max="100"
                                step="0.01"
                                value={item.supplier_discount_percent}
                                onChange={(event) =>
                                  updateDraftItem(
                                    index,
                                    "supplier_discount_percent",
                                    event.target.value,
                                  )
                                }
                                placeholder="Ej. 40"
                                className="mt-1.5 w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm font-bold text-gray-950 outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-100"
                              />
                              <span className="mt-1 block text-xs font-medium leading-4 text-gray-500">
                                Ejemplo: 40 % sobre PVP S/ 49.00 = costo
                                editorial S/ 29.40.
                              </span>
                            </label>

                            <div className="text-xs font-bold text-gray-600">
                              Costo editorial calculado
                              <div className="mt-1.5 rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm font-black text-gray-950">
                                {financial
                                  ? formatCurrency(financial.supplier_cost)
                                  : "Por calcular"}
                              </div>
                              <span className="mt-1 block text-xs font-medium leading-4 text-gray-500">
                                PVP menos descuento editorial.
                              </span>
                            </div>

                            <label className="text-xs font-bold text-gray-600">
                              Modalidad del incentivo
                              <select
                                value={item.commission_mode}
                                onChange={(event) =>
                                  updateDraftItem(
                                    index,
                                    "commission_mode",
                                    event.target.value,
                                  )
                                }
                                className="mt-1.5 w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm font-bold text-gray-950 outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-100"
                              >
                                <option value="per_unit">Por unidad</option>
                                <option value="total">Monto total</option>
                              </select>
                            </label>

                            <label className="text-xs font-bold text-gray-600">
                              Incentivo / comisión
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={item.commission_amount}
                                onChange={(event) =>
                                  updateDraftItem(
                                    index,
                                    "commission_amount",
                                    event.target.value,
                                  )
                                }
                                className="mt-1.5 w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm font-bold text-gray-950 outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-100"
                              />
                            </label>
                          </div>

                          {financialPreviewError
                          && draftItems.some(isFinancialPreviewItemValid) ? (
                            <p className="mt-3 text-xs font-bold text-red-700">
                              {financialPreviewError}
                            </p>
                          ) : null}

                          {hasFinancialAnalysis ? (
                            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
                              <div className="rounded-xl bg-white p-3 ring-1 ring-gray-200">
                                <p className="text-xs font-bold uppercase text-gray-500">
                                  Descuento editorial
                                </p>
                                <p className="mt-1 font-black text-gray-950">
                                  {formatPercent(
                                    financial.supplier_discount_percent,
                                  )}
                                </p>
                                <p className="mt-1 text-xs text-gray-500">
                                  {formatCurrency(
                                    financial.supplier_discount_amount,
                                  )} del PVP
                                </p>
                              </div>

                              <div className="rounded-xl bg-white p-3 ring-1 ring-gray-200">
                                <p className="text-xs font-bold uppercase text-gray-500">
                                  Margen antes de incentivo
                                </p>
                                <p className="mt-1 font-black text-gray-950">
                                  {formatCurrency(
                                    financial.margin_before_commission_unit,
                                  )}
                                </p>
                                <p className="mt-1 text-xs text-gray-500">
                                  P.IE - costo editorial
                                </p>
                              </div>

                              <div className="rounded-xl bg-white p-3 ring-1 ring-gray-200">
                                <p className="text-xs font-bold uppercase text-gray-500">
                                  Ganancia neta / unidad
                                </p>
                                <p className="mt-1 font-black text-gray-950">
                                  {formatCurrency(
                                    financial.commercial_margin_unit,
                                  )}
                                </p>
                                <p className="mt-1 text-xs text-gray-500">
                                  P.IE - costo - incentivo
                                </p>
                              </div>

                              <div className="rounded-xl bg-white p-3 ring-1 ring-gray-200">
                                <p className="text-xs font-bold uppercase text-gray-500">
                                  Ganancia total
                                </p>
                                <p className="mt-1 font-black text-gray-950">
                                  {formatCurrency(
                                    financial.commercial_margin_total,
                                  )}
                                </p>
                                <p className="mt-1 text-xs text-gray-500">
                                  Según cantidad proyectada
                                </p>
                              </div>

                              <div className="rounded-xl bg-white p-3 ring-1 ring-gray-200">
                                <p className="text-xs font-bold uppercase text-gray-500">
                                  Máx. Dscto. I.E. verde
                                </p>
                                <p className="mt-1 font-black text-gray-950">
                                  {financial.max_green_discount_percent == null
                                    ? "—"
                                    : formatPercent(
                                        financial.max_green_discount_percent,
                                      )}
                                </p>
                                <p className="mt-1 text-xs text-gray-500">
                                  Límite calculado para conservar margen verde.
                                </p>
                              </div>

                              <div className="rounded-xl bg-white p-3 ring-1 ring-gray-200">
                                <p className="text-xs font-bold uppercase text-gray-500">
                                  Estado comercial
                                </p>
                                <span
                                  className={`mt-1 inline-flex rounded-full px-2.5 py-1 text-xs font-black ring-1 ${profitabilityBadgeClass(
                                    financial.profitability_band,
                                  )}`}
                                >
                                  {financial.profitability_band_display}
                                </span>
                                <p className={`mt-2 text-xs font-bold ${negotiation?.className || "text-gray-500"}`}>
                                  {negotiation?.detail || "Sin cálculo disponible"}
                                </p>
                              </div>
                            </div>
                          ) : (
                            <p className="mt-3 text-xs font-bold text-amber-700">
                              Ingresa el descuento editorial para calcular el
                              costo, la ganancia y el semáforo.
                            </p>
                          )}
                        </div>
                      ) : null}
                    </article>
                  );
                })}
              </div>
              <section className="mt-5 rounded-2xl border border-gray-200 bg-gray-50 p-4">
                <div>
                  <p className="text-xs font-black uppercase tracking-wide text-red-700">
                    Modalidad de venta y atención
                  </p>
                  <p className="mt-1 text-xs leading-5 text-gray-500">
                    Registra cómo se atenderá al colegio y cuándo deben estar
                    disponibles los libros.
                  </p>
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <label className="text-xs font-bold text-gray-600">
                    Modalidad de venta
                    <select
                      value={draftSaleMode}
                      onChange={(event) => {
                        const nextMode = event.target.value;
                        setDraftSaleMode(nextMode);

                        if (nextMode !== "fair") {
                          setDraftFairStartTime("");
                          setDraftFairEndTime("");
                        }
                      }}
                      className="mt-1.5 w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm font-bold text-gray-950 outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-100"
                    >
                      <option value="">Por definir</option>
                      {SALE_MODES.map((mode) => (
                        <option key={mode.value} value={mode.value}>
                          {mode.label}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="text-xs font-bold text-gray-600">
                    {scheduleDateLabel(draftSaleMode)}
                    <input
                      type="date"
                      value={draftServiceDate}
                      onChange={(event) =>
                        setDraftServiceDate(event.target.value)
                      }
                      className="mt-1.5 w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm font-bold text-gray-950 outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-100"
                    />
                  </label>

                  {draftSaleMode === "fair" ? (
                    <>
                      <label className="text-xs font-bold text-gray-600">
                        Hora de inicio
                        <input
                          type="time"
                          value={draftFairStartTime}
                          onChange={(event) =>
                            setDraftFairStartTime(event.target.value)
                          }
                          className="mt-1.5 w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm font-bold text-gray-950 outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-100"
                        />
                      </label>

                      <label className="text-xs font-bold text-gray-600">
                        Hora de fin
                        <input
                          type="time"
                          value={draftFairEndTime}
                          onChange={(event) =>
                            setDraftFairEndTime(event.target.value)
                          }
                          className="mt-1.5 w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm font-bold text-gray-950 outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-100"
                        />
                      </label>
                    </>
                  ) : null}
                </div>

                <p className="mt-3 text-xs leading-5 text-gray-500">
                  Puedes guardar el borrador mientras coordinas estos datos.
                  Para marcar la cotización como enviada, la modalidad y la
                  fecha deben estar completas; si es una feria, también se
                  requiere hora de inicio y hora de fin.
                </p>
              </section>

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
