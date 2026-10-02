import { useEffect, useMemo, useState } from "react";
import { FaPrint, FaTimes } from "react-icons/fa";
import { useNavigate, useParams } from "react-router";

import {
  getCRMOpportunity,
  getCRMOpportunityQuotations,
  getCRMSchool,
} from "../../../api/crmApi";
import logoBookExpress from "../../../assets/brand/logo-book-express-negro-recortado.png";

const MONTH_LABELS = {
  1: "Enero",
  2: "Febrero",
  3: "Marzo",
  4: "Abril",
  5: "Mayo",
  6: "Junio",
  7: "Julio",
  8: "Agosto",
  9: "Septiembre",
  10: "Octubre",
  11: "Noviembre",
  12: "Diciembre",
};

const PRINT_STYLES = `
  @page {
    size: A4 landscape;
    margin: 10mm 6mm;
  }

  @media print {
    html,
    body,
    #root {
      width: auto !important;
      height: auto !important;
      min-height: 0 !important;
      margin: 0 !important;
      padding: 0 !important;
      background: white !important;
    }

    body {
      overflow: visible !important;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    .quotation-print-shell {
      width: auto !important;
      min-height: 0 !important;
      padding: 0 !important;
      background: white !important;
    }

    .quotation-print-page {
      width: 285mm !important;
      max-width: 285mm !important;
      min-height: 190mm !important;
      margin: 0 auto !important;
      padding: 0 !important;
      box-shadow: none !important;
      display: flex !important;
      flex-direction: column !important;
      break-after: avoid !important;
      page-break-after: avoid !important;
    }

    .quotation-print-header {
      gap: 20px !important;
      padding-bottom: 10px !important;
    }

    .quotation-print-logo-wrap {
      width: 120px !important;
      height: 72px !important;
    }

    .quotation-print-logo {
      width: 112px !important;
      max-height: 68px !important;
      object-fit: contain !important;
    }

    .quotation-print-company {
      font-size: 21px !important;
      line-height: 1.15 !important;
    }

    .quotation-print-company-meta {
      margin-top: 5px !important;
      font-size: 11px !important;
    }

    .quotation-print-title-block {
      min-width: 205px !important;
    }

    .quotation-print-title {
      font-size: 15px !important;
    }

    .quotation-print-section-grid {
      grid-template-columns: 1.15fr 1.15fr 0.7fr !important;
      gap: 10px !important;
      margin-top: 12px !important;
    }

    .quotation-print-card {
      padding: 12px !important;
      border-radius: 10px !important;
    }

    .quotation-print-card-title {
      font-size: 10.5px !important;
    }

    .quotation-print-card-name {
      margin-top: 4px !important;
      font-size: 14px !important;
      line-height: 1.15 !important;
    }

    .quotation-print-school-info {
      grid-template-columns: 1fr !important;
      gap: 5px !important;
      margin-top: 6px !important;
      font-size: 10.5px !important;
      line-height: 1.3 !important;
    }

    .quotation-print-contact-info {
      grid-template-columns: 1fr 1fr !important;
      gap: 4px 12px !important;
      margin-top: 6px !important;
      font-size: 10.5px !important;
      line-height: 1.3 !important;
    }

    .quotation-print-advisor-info {
      margin-top: 6px !important;
      font-size: 10.5px !important;
      line-height: 1.35 !important;
    }

    .quotation-print-table-section {
      margin-top: 12px !important;
    }

    .quotation-print-table {
      width: 100% !important;
      table-layout: fixed !important;
      font-size: 11.5px !important;
    }

    .quotation-print-table th {
      padding: 8px 5px !important;
      line-height: 1.2 !important;
    }

    .quotation-print-table td {
      padding: 7px 5px !important;
      line-height: 1.28 !important;
      overflow-wrap: anywhere;
    }

    .quotation-print-table th:nth-child(1),
    .quotation-print-table td:nth-child(1) {
      width: 8%;
    }

    .quotation-print-table th:nth-child(2),
    .quotation-print-table td:nth-child(2) {
      width: 7%;
    }

    .quotation-print-table th:nth-child(3),
    .quotation-print-table td:nth-child(3) {
      width: 8%;
    }

    .quotation-print-table th:nth-child(4),
    .quotation-print-table td:nth-child(4) {
      width: 8%;
    }

    .quotation-print-table th:nth-last-child(3),
    .quotation-print-table td:nth-last-child(3) {
      width: 42%;
    }

    .quotation-print-table th:nth-last-child(2),
    .quotation-print-table td:nth-last-child(2),
    .quotation-print-table th:last-child,
    .quotation-print-table td:last-child {
      width: 8%;
    }

    .quotation-print-footer {
      margin-top: auto !important;
      padding-top: 9px !important;
      font-size: 9.5px !important;
      line-height: 1.25 !important;
    }

    .quotation-print-draft-only {
      display: none !important;
    }

    .quotation-print-table thead {
      display: table-header-group;
    }

    .quotation-print-table tr {
      break-inside: avoid;
      page-break-inside: avoid;
    }
  }
`;

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

function formatDate(value) {
  if (!value) {
    return "Sin fecha";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Sin fecha";
  }

  return new Intl.DateTimeFormat("es-PE", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(date);
}

function formatOwner(owner) {
  if (!owner) {
    return "Sin asesor asignado";
  }

  return owner.full_name || owner.username || "Asesor asignado";
}

function formatContact(contact) {
  if (!contact) {
    return "Sin contacto principal";
  }

  return contact.full_name || "Contacto principal";
}

function formatLocation(school) {
  return [school?.district, school?.province, school?.department]
    .filter(Boolean)
    .join(", ");
}

function formatScheduleDate(value) {
  if (!value) {
    return "No registrada";
  }

  const [year, month, day] = String(value).split("-").map(Number);
  const date = new Date(year, month - 1, day);

  if (Number.isNaN(date.getTime())) {
    return "No registrada";
  }

  return new Intl.DateTimeFormat("es-PE", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(date);
}

function formatScheduleTime(value) {
  if (!value) {
    return "No registrada";
  }

  const [hours, minutes] = String(value).slice(0, 5).split(":").map(Number);
  const date = new Date(2000, 0, 1, hours, minutes);

  if (Number.isNaN(date.getTime())) {
    return "No registrada";
  }

  return new Intl.DateTimeFormat("es-PE", {
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function scheduleDateLabel(mode) {
  if (mode === "fair") {
    return "Fecha de feria";
  }

  if (mode === "consignment") {
    return "Fecha de entrega en consignación";
  }

  return "Fecha de abastecimiento";
}

export default function CRMQuotationPrintPage() {
  const { opportunityId, quotationId } = useParams();
  const navigate = useNavigate();

  const [opportunity, setOpportunity] = useState(null);
  const [school, setSchool] = useState(null);
  const [quotation, setQuotation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let ignore = false;

    async function loadQuotationDocument() {
      try {
        const [opportunityData, quotationsData] = await Promise.all([
          getCRMOpportunity(opportunityId),
          getCRMOpportunityQuotations(opportunityId),
        ]);

        if (ignore) {
          return;
        }

        const quotationData = normalizeList(quotationsData).find(
          (item) => String(item.id) === String(quotationId),
        );

        if (!quotationData) {
          throw new Error("No se encontró la versión de cotización solicitada.");
        }

        let schoolData = null;

        if (opportunityData.school?.id) {
          schoolData = await getCRMSchool(opportunityData.school.id);
        }

        if (ignore) {
          return;
        }

        setOpportunity(opportunityData);
        setQuotation(quotationData);
        setSchool(schoolData);
        setErrorMessage("");
      } catch (error) {
        if (!ignore) {
          setErrorMessage(
            error?.response?.data?.detail
              || error?.message
              || "No se pudo preparar la cotización para impresión.",
          );
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    loadQuotationDocument();

    return () => {
      ignore = true;
    };
  }, [opportunityId, quotationId]);

  useEffect(() => {
    if (!quotation || !opportunity) {
      return undefined;
    }

    const previousTitle = document.title;
    const schoolName = opportunity.school?.name || "Colegio";

    document.title = `Cotizacion_${schoolName}`;

    return () => {
      document.title = previousTitle;
    };
  }, [opportunity, quotation]);

  const documentRows = useMemo(
    () =>
      (quotation?.items || []).map((item) => ({
        id: item.id,
        editorial: item.provider_name_snapshot || "—",
        level: item.level_name_snapshot || "—",
        area: item.area_name_snapshot || "—",
        grade: item.grade_name_snapshot || "—",
        readingMonth: item.reading_month
          ? MONTH_LABELS[item.reading_month] || String(item.reading_month)
          : "—",
        code: item.product_code_snapshot || "—",
        product: item.product_name_snapshot || item.product?.name || "Producto",
        pvp: item.pvp,
        schoolPrice: item.school_price,
      })),
    [quotation],
  );

  const showReadingMonth =
    quotation?.commercial_line === "reading_plan"
    || (
      !quotation?.commercial_line
      && documentRows.some((item) => item.readingMonth !== "—")
    );

  function closePreview() {
    window.close();

    window.setTimeout(() => {
      if (!window.closed) {
        navigate(
          `/admin/crm/oportunidades/${opportunityId}`,
          { replace: true },
        );
      }
    }, 120);
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-100 p-6">
        <div className="rounded-2xl border border-gray-200 bg-white px-5 py-4 text-sm font-bold text-gray-600 shadow-sm">
          Preparando cotización...
        </div>
      </div>
    );
  }

  if (errorMessage || !quotation || !opportunity) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-100 p-6">
        <div className="w-full max-w-xl rounded-3xl border border-red-200 bg-white p-6 shadow-sm">
          <p className="font-black text-red-800">
            No se pudo abrir la cotización.
          </p>
          <p className="mt-2 text-sm leading-6 text-gray-600">
            {errorMessage || "La cotización no está disponible."}
          </p>
          <button
            type="button"
            onClick={closePreview}
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-gray-950 px-4 py-2.5 text-sm font-black text-white"
          >
            <FaTimes />
            Cerrar vista previa
          </button>
        </div>
      </div>
    );
  }

  const location = formatLocation(school);
  const isDraft = quotation.status === "draft";
  const contactName =
    quotation.primary_contact_name_snapshot
    || formatContact(opportunity.primary_contact);
  const contactPosition =
    quotation.primary_contact_position_snapshot
    || opportunity.primary_contact?.position
    || "No registrado";
  const contactPhone =
    quotation.primary_contact_phone_snapshot
    || opportunity.primary_contact?.whatsapp
    || opportunity.primary_contact?.phone
    || "No registrado";
  const contactEmail =
    quotation.primary_contact_email_snapshot
    || opportunity.primary_contact?.email
    || "No registrado";
  const advisorName =
    quotation.advisor_name_snapshot
    || formatOwner(opportunity.owner);
  const advisorPhone =
    quotation.advisor_whatsapp_snapshot
    || quotation.advisor_phone_snapshot
    || opportunity.owner?.whatsapp
    || opportunity.owner?.phone
    || "No registrado";
  const advisorWhatsapp =
    quotation.advisor_whatsapp_snapshot
    || opportunity.owner?.whatsapp
    || "";

  return (
    <div className="quotation-print-shell min-h-screen bg-gray-100 px-4 py-5 print:bg-white print:p-0">
      <style>{PRINT_STYLES}</style>

      <div className="mx-auto mb-4 flex w-full max-w-7xl items-center justify-between gap-3 print:hidden">
        <button
          type="button"
          onClick={closePreview}
          className="inline-flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-black text-gray-700 shadow-sm transition hover:bg-gray-50"
        >
          <FaTimes />
          Cerrar vista previa
        </button>

        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex items-center gap-2 rounded-xl bg-red-700 px-4 py-2.5 text-sm font-black text-white shadow-sm transition hover:bg-red-800"
        >
          <FaPrint />
          Imprimir
        </button>
      </div>

      <main className="quotation-print-page mx-auto w-full max-w-7xl bg-white p-7 shadow-sm print:max-w-none print:p-0 print:shadow-none">
        <header className="quotation-print-header flex items-start justify-between gap-8 border-b-2 border-gray-950 pb-5">
          <div className="flex items-start gap-4">
            <div className="quotation-print-logo-wrap flex h-20 w-32 shrink-0 items-center justify-center bg-white">
              <img
                src={logoBookExpress}
                alt="Book Express"
                className="quotation-print-logo max-h-16 w-auto object-contain"
              />
            </div>
            <div className="pt-1">
              <p className="quotation-print-company text-xl font-black leading-tight text-gray-950">
                Distribuidora y Comercializadora Book Express SAC
              </p>
              <p className="quotation-print-company-meta mt-2 text-sm font-semibold text-gray-600">
                RUC 20601658811 · Huancayo, Junín, Perú
              </p>
            </div>
          </div>

          <div className="quotation-print-title-block min-w-52 text-right">
            <p className="quotation-print-title text-sm font-black uppercase tracking-widest text-red-700">
              Cotización comercial
            </p>
            <p className="mt-2 text-sm font-bold text-gray-700">
              {formatDate(quotation.created_at)}
            </p>
            <p className="mt-1 text-xs font-semibold text-gray-500">
              {opportunity.campaign?.name
                || quotation.campaign_name_snapshot
                || "Campaña comercial"}
            </p>
            {isDraft ? (
              <span className="quotation-print-draft-only mt-2 inline-flex rounded-full bg-amber-100 px-3 py-1 text-xs font-black uppercase tracking-wide text-amber-800 ring-1 ring-amber-200">
                Borrador
              </span>
            ) : null}
          </div>
        </header>

        <section className="quotation-print-section-grid mt-5 grid gap-4 md:grid-cols-[1.15fr_1.15fr_0.7fr]">
          <div className="quotation-print-card rounded-2xl border border-gray-200 p-4">
            <p className="quotation-print-card-title text-xs font-black uppercase tracking-wide text-red-700">
              Institución educativa
            </p>
            <p className="quotation-print-card-name mt-1 text-lg font-black text-gray-950">
              {quotation.school_name_snapshot || opportunity.school?.name}
            </p>

            <div className="quotation-print-school-info mt-3 grid gap-2 text-sm text-gray-700">
              <p>
                <span className="font-black text-gray-950">RUC:</span>{" "}
                {school?.ruc || "No registrado"}
              </p>
              <p>
                <span className="font-black text-gray-950">Ubicación:</span>{" "}
                {location || "No registrada"}
              </p>
              <p>
                <span className="font-black text-gray-950">Dirección:</span>{" "}
                {school?.address || "No registrada"}
              </p>
            </div>
          </div>

          <div className="quotation-print-card rounded-2xl border border-gray-200 p-4">
            <p className="quotation-print-card-title text-xs font-black uppercase tracking-wide text-red-700">
              Contacto del colegio
            </p>
            <p className="quotation-print-card-name mt-1 text-lg font-black text-gray-950">
              {contactName}
            </p>

            <div className="quotation-print-contact-info mt-3 grid gap-2 text-sm text-gray-700 sm:grid-cols-2">
              <p>
                <span className="font-black text-gray-950">Cargo:</span>{" "}
                {contactPosition}
              </p>
              <p>
                <span className="font-black text-gray-950">Teléfono:</span>{" "}
                {contactPhone}
              </p>
              <p className="sm:col-span-2">
                <span className="font-black text-gray-950">Correo:</span>{" "}
                {contactEmail}
              </p>
            </div>
          </div>

          <div className="quotation-print-card rounded-2xl border border-gray-200 p-4">
            <p className="quotation-print-card-title text-xs font-black uppercase tracking-wide text-red-700">
              Asesor Book Express
            </p>
            <p className="quotation-print-card-name mt-1 text-base font-black text-gray-950">
              {advisorName}
            </p>

            <div className="quotation-print-advisor-info space-y-2 text-sm text-gray-700">
              <p>
                <span className="font-black text-gray-950">Celular:</span>{" "}
                {advisorPhone}
              </p>
              {advisorWhatsapp
              && advisorWhatsapp !== advisorPhone ? (
                <p>
                  <span className="font-black text-gray-950">WhatsApp:</span>{" "}
                  {advisorWhatsapp}
                </p>
              ) : null}
            </div>
          </div>
        </section>

        <section className="mt-4 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
          <p className="text-xs font-black uppercase tracking-wide text-red-700">
            Condiciones de atención
          </p>
          <div className="mt-2 flex flex-wrap gap-x-6 gap-y-2 text-sm text-gray-700">
            <p>
              <span className="font-black text-gray-950">
                Modalidad:
              </span>{" "}
              {quotation.sale_mode_display || "No registrada"}
            </p>
            <p>
              <span className="font-black text-gray-950">
                {scheduleDateLabel(quotation.sale_mode)}:
              </span>{" "}
              {formatScheduleDate(quotation.service_date)}
            </p>
            {quotation.sale_mode === "fair" ? (
              <>
                <p>
                  <span className="font-black text-gray-950">
                    Hora de inicio:
                  </span>{" "}
                  {formatScheduleTime(quotation.fair_start_time)}
                </p>
                <p>
                  <span className="font-black text-gray-950">
                    Hora de fin:
                  </span>{" "}
                  {formatScheduleTime(quotation.fair_end_time)}
                </p>
              </>
            ) : null}
          </div>
        </section>

        <section className="quotation-print-table-section mt-5">
          <div className="overflow-hidden rounded-2xl border border-gray-300">
            <table className="quotation-print-table w-full table-auto border-collapse text-xs">
              <thead className="bg-gray-950 text-white">
                <tr>
                  <th className="px-2 py-3 text-center align-middle font-black">
                    Editorial
                  </th>
                  <th className="px-2 py-3 text-center align-middle font-black">
                    Nivel
                  </th>
                  <th className="px-2 py-3 text-center align-middle font-black">
                    Área
                  </th>
                  <th className="px-2 py-3 text-center align-middle font-black">
                    Grado
                  </th>
                  {showReadingMonth ? (
                    <th className="px-2 py-3 text-center align-middle font-black">
                      Mes lectura
                    </th>
                  ) : null}
                  <th className="px-2 py-3 text-center align-middle font-black">
                    Código
                  </th>
                  <th className="min-w-72 px-2 py-3 text-center align-middle font-black">
                    Producto
                  </th>
                  <th className="whitespace-nowrap px-2 py-3 text-center align-middle font-black">
                    PVP
                  </th>
                  <th className="whitespace-nowrap px-2 py-3 text-center align-middle font-black">
                    P.IE
                  </th>
                </tr>
              </thead>
              <tbody>
                {documentRows.map((item) => (
                  <tr
                    key={item.id}
                    className="border-t border-gray-200 align-top"
                  >
                    <td className="px-2 py-3 text-center font-bold text-gray-900">
                      {item.editorial}
                    </td>
                    <td className="px-2 py-3 text-center text-gray-700">
                      {item.level}
                    </td>
                    <td className="px-2 py-3 text-center text-gray-700">
                      {item.area}
                    </td>
                    <td className="px-2 py-3 text-center text-gray-700">
                      {item.grade}
                    </td>
                    {showReadingMonth ? (
                      <td className="px-2 py-3 text-center text-gray-700">
                        {item.readingMonth}
                      </td>
                    ) : null}
                    <td className="px-2 py-3 text-center text-gray-700">
                      {item.code}
                    </td>
                    <td className="px-3 py-3 text-left font-bold leading-5 text-gray-950">
                      {item.product}
                    </td>
                    <td className="whitespace-nowrap px-2 py-3 text-center font-bold text-gray-900">
                      {formatCurrency(item.pvp)}
                    </td>
                    <td className="whitespace-nowrap px-2 py-3 text-center font-black text-gray-950">
                      {formatCurrency(item.schoolPrice)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <footer className="quotation-print-footer mt-7 border-t border-gray-200 pt-4 text-xs leading-5 text-gray-500">
          <p>
            Cotización comercial preparada por Book Express para la institución educativa indicada.
          </p>
          {isDraft ? (
            <p className="quotation-print-draft-only mt-1 font-bold text-amber-800">
              Vista previa de borrador. Verifique la información antes de
              enviarla al colegio.
            </p>
          ) : null}
        </footer>
      </main>
    </div>
  );
}
