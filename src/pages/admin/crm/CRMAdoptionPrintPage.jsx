import { useEffect, useMemo, useState } from "react";
import { FaPrint, FaTimes } from "react-icons/fa";
import { useNavigate, useParams } from "react-router";

import {
  getCRMOpportunity,
  getCRMOpportunityAdoptions,
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

    .adoption-print-shell {
      width: auto !important;
      min-height: 0 !important;
      padding: 0 !important;
      background: white !important;
    }

    .adoption-print-page {
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

    .adoption-print-header {
      gap: 20px !important;
      padding-bottom: 10px !important;
    }

    .adoption-print-logo-wrap {
      width: 120px !important;
      height: 72px !important;
    }

    .adoption-print-logo {
      width: 112px !important;
      max-height: 68px !important;
      object-fit: contain !important;
    }

    .adoption-print-company {
      font-size: 21px !important;
      line-height: 1.15 !important;
    }

    .adoption-print-company-meta {
      margin-top: 5px !important;
      font-size: 11px !important;
    }

    .adoption-print-title-block {
      min-width: 220px !important;
    }

    .adoption-print-title {
      font-size: 15px !important;
    }

    .adoption-print-section-grid {
      grid-template-columns: 1.15fr 1.15fr 0.7fr !important;
      gap: 10px !important;
      margin-top: 12px !important;
    }

    .adoption-print-card {
      padding: 12px !important;
      border-radius: 10px !important;
    }

    .adoption-print-card-title {
      font-size: 10.5px !important;
    }

    .adoption-print-card-name {
      margin-top: 4px !important;
      font-size: 14px !important;
      line-height: 1.15 !important;
    }

    .adoption-print-school-info {
      grid-template-columns: 1fr !important;
      gap: 5px !important;
      margin-top: 6px !important;
      font-size: 10.5px !important;
      line-height: 1.3 !important;
    }

    .adoption-print-contact-info {
      grid-template-columns: 1fr 1fr !important;
      gap: 4px 12px !important;
      margin-top: 6px !important;
      font-size: 10.5px !important;
      line-height: 1.3 !important;
    }

    .adoption-print-advisor-info {
      margin-top: 6px !important;
      font-size: 10.5px !important;
      line-height: 1.35 !important;
    }

    .adoption-print-signatures {
      grid-template-columns: 1fr 1fr !important;
      gap: 28px !important;
      break-inside: avoid !important;
      page-break-inside: avoid !important;
    }

    .adoption-print-table-section {
      margin-top: 12px !important;
    }

    .adoption-print-table {
      width: 100% !important;
      table-layout: fixed !important;
      font-size: 11px !important;
    }

    .adoption-print-table th {
      padding: 8px 5px !important;
      line-height: 1.2 !important;
    }

    .adoption-print-table td {
      padding: 7px 5px !important;
      line-height: 1.28 !important;
      overflow-wrap: anywhere;
    }

    .adoption-print-table thead {
      display: table-header-group;
    }

    .adoption-print-table tr {
      break-inside: avoid;
      page-break-inside: avoid;
    }

    .adoption-print-footer {
      margin-top: auto !important;
      padding-top: 9px !important;
      font-size: 9.5px !important;
      line-height: 1.25 !important;
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

function formatDateTime(value) {
  if (!value) {
    return "Sin fecha";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Sin fecha";
  }

  return new Intl.DateTimeFormat("es-PE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
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
  if (!mode) {
    return "Fecha de atención";
  }

  if (mode === "fair") {
    return "Fecha de feria";
  }

  if (mode === "consignment") {
    return "Fecha de entrega en consignación";
  }

  return "Fecha de abastecimiento";
}

export default function CRMAdoptionPrintPage() {
  const { opportunityId, adoptionId } = useParams();
  const navigate = useNavigate();

  const [opportunity, setOpportunity] = useState(null);
  const [school, setSchool] = useState(null);
  const [adoption, setAdoption] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let ignore = false;

    async function loadAdoptionDocument() {
      try {
        const [opportunityData, adoptionsData] = await Promise.all([
          getCRMOpportunity(opportunityId),
          getCRMOpportunityAdoptions(opportunityId),
        ]);

        if (ignore) {
          return;
        }

        const adoptionData = normalizeList(adoptionsData).find(
          (item) => String(item.id) === String(adoptionId),
        );

        if (!adoptionData) {
          throw new Error("No se encontró la adopción solicitada.");
        }

        let schoolData = null;

        if (opportunityData.school?.id) {
          schoolData = await getCRMSchool(opportunityData.school.id);
        }

        if (ignore) {
          return;
        }

        setOpportunity(opportunityData);
        setAdoption(adoptionData);
        setSchool(schoolData);
        setErrorMessage("");
      } catch (error) {
        if (!ignore) {
          setErrorMessage(
            error?.response?.data?.detail
              || error?.message
              || "No se pudo preparar la adopción para impresión.",
          );
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    loadAdoptionDocument();

    return () => {
      ignore = true;
    };
  }, [adoptionId, opportunityId]);

  useEffect(() => {
    if (!adoption || !opportunity) {
      return undefined;
    }

    const previousTitle = document.title;
    const schoolName = opportunity.school?.name || "Colegio";

    document.title = `Adopcion_${schoolName}`;

    return () => {
      document.title = previousTitle;
    };
  }, [adoption, opportunity]);

  const documentRows = useMemo(
    () =>
      (adoption?.items || []).map((item) => ({
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
        quantity: item.quantity,
        pvp: item.pvp,
        schoolPrice: item.school_price,
      })),
    [adoption],
  );

  const showReadingMonth = documentRows.some(
    (item) => item.readingMonth !== "—",
  );

  const totals = useMemo(
    () =>
      documentRows.reduce(
        (result, item) => {
          const quantity = Number(item.quantity || 0);

          result.units += quantity;
          result.school += Number(item.schoolPrice || 0) * quantity;

          return result;
        },
        {
          units: 0,
          school: 0,
        },
      ),
    [documentRows],
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
          Preparando adopción...
        </div>
      </div>
    );
  }

  if (errorMessage || !adoption || !opportunity) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-100 p-6">
        <div className="w-full max-w-xl rounded-3xl border border-red-200 bg-white p-6 shadow-sm">
          <p className="font-black text-red-800">
            No se pudo abrir la adopción.
          </p>
          <p className="mt-2 text-sm leading-6 text-gray-600">
            {errorMessage || "La adopción no está disponible."}
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
  const contactName =
    adoption.authorized_contact_name_snapshot
    || adoption.authorized_contact?.full_name
    || "No registrado";
  const contactPosition =
    adoption.authorized_contact_position_snapshot
    || adoption.authorized_contact?.position
    || "No registrado";
  const contactPhone =
    adoption.authorized_contact_phone_snapshot
    || adoption.authorized_contact?.whatsapp
    || adoption.authorized_contact?.phone
    || "No registrado";
  const contactEmail =
    adoption.authorized_contact_email_snapshot
    || adoption.authorized_contact?.email
    || "No registrado";
  const advisorName =
    adoption.advisor_name_snapshot
    || adoption.advisor?.full_name
    || "Sin asesor asignado";
  const advisorPhone =
    adoption.advisor_whatsapp_snapshot
    || adoption.advisor_phone_snapshot
    || adoption.advisor?.whatsapp
    || adoption.advisor?.phone
    || "No registrado";
  const advisorWhatsapp =
    adoption.advisor_whatsapp_snapshot
    || adoption.advisor?.whatsapp
    || "";

  return (
    <div className="adoption-print-shell min-h-screen bg-gray-100 px-4 py-5 print:bg-white print:p-0">
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

      <main className="adoption-print-page mx-auto w-full max-w-7xl bg-white p-7 shadow-sm print:max-w-none print:p-0 print:shadow-none">
        <header className="adoption-print-header flex items-start justify-between gap-8 border-b-2 border-gray-950 pb-5">
          <div className="flex items-start gap-4">
            <div className="adoption-print-logo-wrap flex h-20 w-32 shrink-0 items-center justify-center bg-white">
              <img
                src={logoBookExpress}
                alt="Book Express"
                className="adoption-print-logo max-h-16 w-auto object-contain"
              />
            </div>
            <div className="pt-1">
              <p className="adoption-print-company text-xl font-black leading-tight text-gray-950">
                Distribuidora y Comercializadora Book Express SAC
              </p>
              <p className="adoption-print-company-meta mt-2 text-sm font-semibold text-gray-600">
                RUC 20601658811 · Huancayo, Junín, Perú
              </p>
            </div>
          </div>

          <div className="adoption-print-title-block min-w-56 text-right">
            <p className="adoption-print-title text-sm font-black uppercase tracking-widest text-red-700">
              Adopción comercial
            </p>
            <p className="mt-2 text-sm font-black text-gray-950">
              Adopción v{adoption.version}
            </p>
            <p className="mt-1 text-xs font-semibold text-gray-500">
              {adoption.campaign_name_snapshot
                || opportunity.campaign?.name
                || "Campaña comercial"}
            </p>
            <span className="mt-2 inline-flex rounded-full bg-emerald-100 px-3 py-1 text-xs font-black uppercase tracking-wide text-emerald-800 ring-1 ring-emerald-200">
              Confirmada
            </span>
          </div>
        </header>

        <section className="adoption-print-section-grid mt-5 grid gap-4 md:grid-cols-3">
          <div className="adoption-print-card rounded-2xl border border-gray-200 p-4">
            <p className="adoption-print-card-title text-xs font-black uppercase tracking-wide text-red-700">
              Institución educativa
            </p>
            <p className="adoption-print-card-name mt-1 text-lg font-black text-gray-950">
              {adoption.school_name_snapshot
                || opportunity.school?.name
                || "Institución educativa"}
            </p>

            <div className="adoption-print-school-info mt-3 grid gap-2 text-sm text-gray-700">
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

          <div className="adoption-print-card rounded-2xl border border-gray-200 p-4">
            <p className="adoption-print-card-title text-xs font-black uppercase tracking-wide text-red-700">
              Contacto que autoriza
            </p>
            <p className="adoption-print-card-name mt-1 text-lg font-black text-gray-950">
              {contactName}
            </p>

            <div className="adoption-print-contact-info mt-3 grid gap-2 text-sm text-gray-700 sm:grid-cols-2">
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
              <p>
                <span className="font-black text-gray-950">
                  Firma / aprobación:
                </span>{" "}
                {formatDateTime(adoption.signed_at)}
              </p>
              <p>
                <span className="font-black text-gray-950">
                  Confirmación:
                </span>{" "}
                {formatDateTime(adoption.confirmed_at)}
              </p>
            </div>
          </div>

          <div className="adoption-print-card rounded-2xl border border-gray-200 p-4">
            <p className="adoption-print-card-title text-xs font-black uppercase tracking-wide text-red-700">
              Asesor Book Express
            </p>
            <p className="adoption-print-card-name mt-1 text-base font-black text-gray-950">
              {advisorName}
            </p>

            <div className="adoption-print-advisor-info space-y-2 text-sm text-gray-700">
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
              <span className="font-black text-gray-950">Modalidad:</span>{" "}
              {adoption.sale_mode_display || "No registrada"}
            </p>
            <p>
              <span className="font-black text-gray-950">
                {scheduleDateLabel(adoption.sale_mode)}:
              </span>{" "}
              {formatScheduleDate(adoption.service_date)}
            </p>
            {adoption.sale_mode === "fair" ? (
              <>
                <p>
                  <span className="font-black text-gray-950">
                    Hora de inicio:
                  </span>{" "}
                  {formatScheduleTime(adoption.fair_start_time)}
                </p>
                <p>
                  <span className="font-black text-gray-950">
                    Hora de fin:
                  </span>{" "}
                  {formatScheduleTime(adoption.fair_end_time)}
                </p>
              </>
            ) : null}
          </div>
        </section>

        <section className="adoption-print-table-section mt-5">
          <div className="overflow-hidden rounded-2xl border border-gray-300">
            <table className="adoption-print-table w-full table-auto border-collapse text-xs">
              <colgroup>
                <col style={{ width: "8%" }} />
                <col style={{ width: "7%" }} />
                <col style={{ width: "8%" }} />
                <col style={{ width: "8%" }} />
                {showReadingMonth ? <col style={{ width: "8%" }} /> : null}
                <col style={{ width: "10%" }} />
                <col style={{ width: showReadingMonth ? "30%" : "38%" }} />
                <col style={{ width: "7%" }} />
                <col style={{ width: "7%" }} />
                <col style={{ width: "7%" }} />
              </colgroup>
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
                  <th className="px-2 py-3 text-center align-middle font-black">
                    Producto
                  </th>
                  <th className="px-2 py-3 text-center align-middle font-black">
                    Cant.
                  </th>
                  <th className="px-2 py-3 text-center align-middle font-black">
                    PVP
                  </th>
                  <th className="px-2 py-3 text-center align-middle font-black">
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
                    <td className="px-2 py-3 text-center font-black text-gray-950">
                      {item.quantity}
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

        <section className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
            <p className="text-xs font-bold uppercase tracking-wide text-gray-500">
              Productos
            </p>
            <p className="mt-1 text-lg font-black text-gray-950">
              {documentRows.length}
            </p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
            <p className="text-xs font-bold uppercase tracking-wide text-gray-500">
              Unidades adoptadas
            </p>
            <p className="mt-1 text-lg font-black text-gray-950">
              {totals.units}
            </p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
            <p className="text-xs font-bold uppercase tracking-wide text-gray-500">
              P.IE total
            </p>
            <p className="mt-1 text-lg font-black text-gray-950">
              {formatCurrency(totals.school)}
            </p>
          </div>
        </section>

        {adoption.notes ? (
          <section className="mt-4 rounded-xl border border-gray-200 bg-white p-3">
            <p className="text-xs font-black uppercase tracking-wide text-gray-500">
              Observaciones
            </p>
            <p className="mt-2 text-sm leading-6 text-gray-700">
              {adoption.notes}
            </p>
          </section>
        ) : null}

        <section className="adoption-print-signatures mt-10 grid gap-8 sm:grid-cols-2">
          <div className="px-6 text-center">
            <div className="h-12 border-b border-gray-700" />
            <p className="mt-2 text-sm font-black text-gray-950">
              Firma y sello de la institución educativa
            </p>
            <p className="mt-1 text-xs font-bold text-gray-700">
              {contactName}
            </p>
            <p className="mt-1 text-xs text-gray-500">
              {contactPosition}
            </p>
          </div>

          <div className="px-6 text-center">
            <div className="h-12 border-b border-gray-700" />
            <p className="mt-2 text-sm font-black text-gray-950">
              Asesor Book Express
            </p>
            <p className="mt-1 text-xs font-bold text-gray-700">
              {advisorName}
            </p>
            <p className="mt-1 text-xs text-gray-500">
              Asesor comercial
            </p>
          </div>
        </section>

        <footer className="adoption-print-footer mt-7 border-t border-gray-200 pt-4 text-xs leading-5 text-gray-500">
          <p>
            Registro de adopción comercial preparado por Book Express con base
            en la cotización aceptada por la institución educativa.
          </p>
        </footer>
      </main>
    </div>
  );
}
