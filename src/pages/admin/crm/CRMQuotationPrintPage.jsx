import { useEffect, useMemo, useState } from "react";
import { FaArrowLeft, FaPrint } from "react-icons/fa";
import { useNavigate, useParams } from "react-router";

import {
  getCRMOpportunity,
  getCRMOpportunityQuotations,
  getCRMSchool,
} from "../../../api/crmApi";
import logoBookExpress from "../../../assets/brand/logo-book-express-transparente.png";

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

    document.title = `Cotizacion_v${quotation.version}_${schoolName}`;

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
            onClick={() => navigate(-1)}
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-gray-950 px-4 py-2.5 text-sm font-black text-white"
          >
            <FaArrowLeft />
            Volver
          </button>
        </div>
      </div>
    );
  }

  const location = formatLocation(school);
  const isDraft = quotation.status === "draft";

  return (
    <div className="min-h-screen bg-gray-100 px-4 py-5 print:bg-white print:p-0">
      <style>
        {"@page { size: A4 landscape; margin: 10mm; } @media print { body { background: white !important; } }"}
      </style>

      <div className="mx-auto mb-4 flex w-full max-w-7xl items-center justify-between gap-3 print:hidden">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-black text-gray-700 shadow-sm transition hover:bg-gray-50"
        >
          <FaArrowLeft />
          Volver a la oportunidad
        </button>

        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex items-center gap-2 rounded-xl bg-red-700 px-4 py-2.5 text-sm font-black text-white shadow-sm transition hover:bg-red-800"
        >
          <FaPrint />
          Imprimir / Guardar PDF
        </button>
      </div>

      <main className="mx-auto w-full max-w-7xl bg-white p-7 shadow-sm print:max-w-none print:p-0 print:shadow-none">
        <header className="flex items-start justify-between gap-8 border-b-2 border-gray-950 pb-5">
          <div className="flex items-start gap-4">
            <img
              src={logoBookExpress}
              alt="Book Express"
              className="h-16 w-auto object-contain"
            />
            <div>
              <p className="text-lg font-black text-gray-950">
                Distribuidora y Comercializadora Book Express SAC
              </p>
              <p className="mt-1 text-xs font-semibold text-gray-600">
                RUC 20601658811 · Huancayo, Junín, Perú
              </p>
            </div>
          </div>

          <div className="text-right">
            <p className="text-xs font-black uppercase tracking-widest text-red-700">
              Cotización comercial
            </p>
            <h1 className="mt-1 text-2xl font-black text-gray-950">
              Cotización v{quotation.version}
            </h1>
            <p className="mt-1 text-xs font-semibold text-gray-500">
              {formatDate(quotation.created_at)}
            </p>
            {isDraft ? (
              <span className="mt-2 inline-flex rounded-full bg-amber-100 px-3 py-1 text-xs font-black uppercase tracking-wide text-amber-800 ring-1 ring-amber-200">
                Borrador
              </span>
            ) : null}
          </div>
        </header>

        <section className="mt-5 grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-gray-200 p-4">
            <p className="text-xs font-black uppercase tracking-wide text-red-700">
              Institución educativa
            </p>
            <p className="mt-1 text-lg font-black text-gray-950">
              {opportunity.school?.name || quotation.school_name_snapshot}
            </p>

            <div className="mt-3 grid gap-2 text-sm text-gray-700 sm:grid-cols-2">
              <p>
                <span className="font-black text-gray-950">RUC:</span>{" "}
                {school?.ruc || "No registrado"}
              </p>
              <p>
                <span className="font-black text-gray-950">Ubicación:</span>{" "}
                {location || "No registrada"}
              </p>
              <p className="sm:col-span-2">
                <span className="font-black text-gray-950">Dirección:</span>{" "}
                {school?.address || "No registrada"}
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 p-4">
            <p className="text-xs font-black uppercase tracking-wide text-red-700">
              Atención comercial
            </p>

            <div className="mt-2 grid gap-2 text-sm text-gray-700">
              <p>
                <span className="font-black text-gray-950">Contacto:</span>{" "}
                {formatContact(opportunity.primary_contact)}
              </p>
              <p>
                <span className="font-black text-gray-950">Cargo:</span>{" "}
                {opportunity.primary_contact?.position || "No registrado"}
              </p>
              <p>
                <span className="font-black text-gray-950">Teléfono:</span>{" "}
                {opportunity.primary_contact?.whatsapp
                  || opportunity.primary_contact?.phone
                  || "No registrado"}
              </p>
              <p>
                <span className="font-black text-gray-950">Correo:</span>{" "}
                {opportunity.primary_contact?.email || "No registrado"}
              </p>
              <p>
                <span className="font-black text-gray-950">Asesor:</span>{" "}
                {formatOwner(opportunity.owner)}
              </p>
              <p>
                <span className="font-black text-gray-950">Campaña:</span>{" "}
                {opportunity.campaign?.name
                  || quotation.campaign_name_snapshot
                  || "Sin campaña"}
              </p>
            </div>
          </div>
        </section>

        <section className="mt-5">
          <div className="overflow-hidden rounded-2xl border border-gray-300">
            <table className="w-full table-fixed border-collapse text-xs">
              <thead className="bg-gray-950 text-white">
                <tr>
                  <th className="w-[11%] px-2 py-3 text-left font-black">
                    Editorial
                  </th>
                  <th className="w-[8%] px-2 py-3 text-left font-black">
                    Nivel
                  </th>
                  <th className="w-[9%] px-2 py-3 text-left font-black">
                    Área
                  </th>
                  <th className="w-[9%] px-2 py-3 text-left font-black">
                    Grado
                  </th>
                  <th className="w-[9%] px-2 py-3 text-left font-black">
                    Mes lectura
                  </th>
                  <th className="w-[10%] px-2 py-3 text-left font-black">
                    Código
                  </th>
                  <th className="w-[24%] px-2 py-3 text-left font-black">
                    Producto
                  </th>
                  <th className="w-[10%] px-2 py-3 text-right font-black">
                    PVP
                  </th>
                  <th className="w-[10%] px-2 py-3 text-right font-black">
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
                    <td className="px-2 py-3 font-bold text-gray-900">
                      {item.editorial}
                    </td>
                    <td className="px-2 py-3 text-gray-700">{item.level}</td>
                    <td className="px-2 py-3 text-gray-700">{item.area}</td>
                    <td className="px-2 py-3 text-gray-700">{item.grade}</td>
                    <td className="px-2 py-3 text-gray-700">
                      {item.readingMonth}
                    </td>
                    <td className="px-2 py-3 text-gray-700">{item.code}</td>
                    <td className="px-2 py-3 font-bold text-gray-950">
                      {item.product}
                    </td>
                    <td className="px-2 py-3 text-right font-bold text-gray-900">
                      {formatCurrency(item.pvp)}
                    </td>
                    <td className="px-2 py-3 text-right font-black text-gray-950">
                      {formatCurrency(item.schoolPrice)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <footer className="mt-7 border-t border-gray-200 pt-4 text-xs leading-5 text-gray-500">
          <p>
            Documento generado desde la versión v{quotation.version} de la
            cotización comercial registrada en Book Express.
          </p>
          {isDraft ? (
            <p className="mt-1 font-bold text-amber-800">
              Vista previa de borrador. Verifique la información antes de
              enviarla al colegio.
            </p>
          ) : null}
        </footer>
      </main>
    </div>
  );
}
