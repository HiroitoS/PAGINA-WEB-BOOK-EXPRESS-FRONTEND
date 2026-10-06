import { useEffect, useState } from "react";
import { FaPrint, FaTimes } from "react-icons/fa";
import { useNavigate, useParams } from "react-router";

import {
  getCRMOpportunity,
  getCRMOpportunityCommercialHistory,
} from "../../../api/crmApi";
import logoBookExpress from "../../../assets/brand/logo-book-express-negro-recortado.png";

const PRINT_STYLES = `
  @page {
    size: A4 portrait;
    margin: 12mm;
  }

  @media print {
    html,
    body,
    #root {
      margin: 0 !important;
      padding: 0 !important;
      background: white !important;
    }

    body {
      overflow: visible !important;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    .history-print-shell {
      min-height: 0 !important;
      padding: 0 !important;
      background: white !important;
    }

    .history-print-page {
      width: 100% !important;
      max-width: none !important;
      margin: 0 !important;
      padding: 0 !important;
      box-shadow: none !important;
    }

    .history-print-table thead {
      display: table-header-group;
    }

    .history-print-table tr {
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
    month: "2-digit",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function formatActor(actor) {
  return actor?.full_name || actor?.username || "Sistema";
}

export default function CRMOpportunityHistoryPrintPage() {
  const { opportunityId } = useParams();
  const navigate = useNavigate();

  const [opportunity, setOpportunity] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let ignore = false;

    async function loadHistory() {
      try {
        const [opportunityData, historyData] = await Promise.all([
          getCRMOpportunity(opportunityId),
          getCRMOpportunityCommercialHistory(opportunityId),
        ]);

        if (ignore) {
          return;
        }

        setOpportunity(opportunityData);
        setHistory(normalizeList(historyData));
        setErrorMessage("");
      } catch (error) {
        if (!ignore) {
          setErrorMessage(
            error?.response?.data?.detail
              || "No se pudo preparar el historial comercial.",
          );
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    loadHistory();

    return () => {
      ignore = true;
    };
  }, [opportunityId]);

  useEffect(() => {
    if (!opportunity) {
      return undefined;
    }

    const previousTitle = document.title;
    const schoolName = opportunity.school?.name || "Colegio";

    document.title = `Historial_Comercial_${schoolName}`;

    return () => {
      document.title = previousTitle;
    };
  }, [opportunity]);

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
          Preparando historial...
        </div>
      </div>
    );
  }

  if (errorMessage || !opportunity) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-100 p-6">
        <div className="w-full max-w-xl rounded-3xl border border-red-200 bg-white p-6 shadow-sm">
          <p className="font-black text-red-800">
            No se pudo abrir el historial comercial.
          </p>
          <p className="mt-2 text-sm leading-6 text-gray-600">
            {errorMessage || "La oportunidad no está disponible."}
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

  return (
    <div className="history-print-shell min-h-screen bg-gray-100 px-4 py-5 print:bg-white print:p-0">
      <style>{PRINT_STYLES}</style>

      <div className="mx-auto mb-4 flex w-full max-w-5xl items-center justify-between gap-3 print:hidden">
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

      <main className="history-print-page mx-auto w-full max-w-5xl bg-white p-6 shadow-sm print:p-0 print:shadow-none">
        <header className="flex items-start justify-between gap-8 border-b-2 border-gray-950 pb-5">
          <div className="flex items-start gap-4">
            <div className="flex h-16 w-24 shrink-0 items-center justify-center bg-white">
              <img
                src={logoBookExpress}
                alt="Book Express"
                className="max-h-14 w-auto object-contain"
              />
            </div>
            <div className="pt-1">
              <p className="text-lg font-black leading-tight text-gray-950">
                Distribuidora y Comercializadora Book Express SAC
              </p>
              <p className="mt-2 text-sm font-semibold text-gray-600">
                RUC 20601658811 · Huancayo, Junín, Perú
              </p>
            </div>
          </div>

          <div className="min-w-64 text-right">
            <p className="text-sm font-black uppercase tracking-widest text-red-700">
              Historial comercial
            </p>
            <p className="mt-1 text-sm font-black text-gray-950">
              {opportunity.school?.name || "Institución educativa"}
            </p>
            <p className="mt-1 text-xs font-semibold text-gray-500">
              {opportunity.campaign?.name || opportunity.title}
            </p>
          </div>
        </header>

        <section className="mt-5 rounded-2xl border border-gray-200 p-4">
          <div className="grid gap-3 md:grid-cols-3">
            <div>
              <p className="text-xs font-black uppercase tracking-wide text-gray-500">
                Oportunidad
              </p>
              <p className="mt-1 font-black text-gray-950">
                {opportunity.title}
              </p>
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-wide text-gray-500">
                Etapa actual
              </p>
              <p className="mt-1 font-black text-gray-950">
                {opportunity.stage?.name || "Sin etapa"}
              </p>
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-wide text-gray-500">
                Eventos registrados
              </p>
              <p className="mt-1 font-black text-gray-950">
                {history.length}
              </p>
            </div>
          </div>
        </section>

        <section className="mt-5 overflow-hidden rounded-2xl border border-gray-300">
          <table className="history-print-table w-full table-fixed border-collapse text-xs">
            <colgroup>
              <col style={{ width: "20%" }} />
              <col style={{ width: "15%" }} />
              <col style={{ width: "20%" }} />
              <col style={{ width: "45%" }} />
            </colgroup>
            <thead className="bg-gray-950 text-white">
              <tr>
                <th className="px-3 py-3 text-left font-black">
                  Fecha y hora
                </th>
                <th className="px-3 py-3 text-left font-black">
                  Plataforma
                </th>
                <th className="px-3 py-3 text-left font-black">
                  Usuario
                </th>
                <th className="px-3 py-3 text-left font-black">
                  Descripción
                </th>
              </tr>
            </thead>
            <tbody>
              {history.map((item) => (
                <tr
                  key={item.id}
                  className="border-t border-gray-200 align-top"
                >
                  <td className="px-3 py-3 font-semibold text-gray-700">
                    {formatDateTime(item.occurred_at)}
                  </td>
                  <td className="px-3 py-3 text-gray-700">
                    {item.platform || "Página Web"}
                  </td>
                  <td className="px-3 py-3 font-black text-gray-950">
                    {formatActor(item.actor)}
                  </td>
                  <td className="px-3 py-3 leading-5 text-gray-700">
                    <span className="font-black text-gray-950">
                      {item.event_type_display || "Evento CRM"}:
                    </span>{" "}
                    {item.title}
                    {item.description ? ` — ${item.description}` : ""}
                  </td>
                </tr>
              ))}
              {history.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="px-4 py-10 text-center font-semibold text-gray-500"
                  >
                    No existen eventos comerciales registrados.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </section>

        <footer className="mt-6 border-t border-gray-200 pt-3 text-xs leading-5 text-gray-500">
          Historial generado a partir de los registros comerciales de la oportunidad.
        </footer>
      </main>
    </div>
  );
}
