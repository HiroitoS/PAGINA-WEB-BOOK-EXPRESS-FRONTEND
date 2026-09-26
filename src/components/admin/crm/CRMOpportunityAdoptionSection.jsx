import { useEffect, useMemo, useState } from "react";
import {
  FaCheckCircle,
  FaFileSignature,
  FaTimes,
} from "react-icons/fa";

import {
  confirmCRMOpportunityAdoption,
  getCRMOpportunityQuotations,
  getCRMSchoolContacts,
} from "../../../api/crmApi";

function normalizeList(data) {
  if (Array.isArray(data)) {
    return data;
  }

  if (Array.isArray(data?.results)) {
    return data.results;
  }

  return [];
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

function formatMoney(value) {
  const amount = Number(value || 0);

  return new Intl.NumberFormat("es-PE", {
    style: "currency",
    currency: "PEN",
    minimumFractionDigits: 2,
  }).format(Number.isFinite(amount) ? amount : 0);
}

function toLocalDateTimeInputValue(date = new Date()) {
  const pad = (value) => String(value).padStart(2, "0");

  return [
    date.getFullYear(),
    "-",
    pad(date.getMonth() + 1),
    "-",
    pad(date.getDate()),
    "T",
    pad(date.getHours()),
    ":",
    pad(date.getMinutes()),
  ].join("");
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

export default function CRMOpportunityAdoptionSection({
  opportunity,
  adoptions,
  onAdoptionConfirmed,
}) {
  const [quotations, setQuotations] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [quotationId, setQuotationId] = useState("");
  const [contactId, setContactId] = useState("");
  const [signedAt, setSignedAt] = useState("");
  const [notes, setNotes] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const acceptedQuotations = useMemo(
    () => quotations.filter((quotation) => quotation.status === "accepted"),
    [quotations],
  );

  const currentAdoption = useMemo(
    () => adoptions.find((adoption) => adoption.is_current) || null,
    [adoptions],
  );

  const latestAcceptedQuotation = useMemo(
    () => acceptedQuotations[0] || null,
    [acceptedQuotations],
  );

  useEffect(() => {
    if (!opportunity?.id || !opportunity?.school?.id) {
      return undefined;
    }

    let ignore = false;

    async function loadAdoptionContext() {
      try {
        const [quotationData, contactData] = await Promise.all([
          getCRMOpportunityQuotations(opportunity.id),
          getCRMSchoolContacts(opportunity.school.id),
        ]);

        if (ignore) {
          return;
        }

        setQuotations(normalizeList(quotationData));
        setContacts(
          normalizeList(contactData).filter((contact) => contact.is_active),
        );
        setErrorMessage("");
      } catch (error) {
        if (!ignore) {
          setErrorMessage(
            getErrorMessage(
              error,
              "No se pudo cargar la información necesaria para la adopción.",
            ),
          );
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    loadAdoptionContext();

    return () => {
      ignore = true;
    };
  }, [opportunity?.id, opportunity?.school?.id]);

  useEffect(() => {
    if (!drawerOpen) {
      return undefined;
    }

    function handleKeyDown(event) {
      if (event.key === "Escape" && !saving) {
        setDrawerOpen(false);
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

  function openDrawer() {
    const latestAccepted = acceptedQuotations[0] || null;
    const preferredContact =
      contacts.find(
        (contact) => contact.id === opportunity?.primary_contact?.id,
      )
      || contacts.find((contact) => contact.is_primary)
      || contacts[0]
      || null;

    setQuotationId(latestAccepted ? String(latestAccepted.id) : "");
    setContactId(preferredContact ? String(preferredContact.id) : "");
    setSignedAt(toLocalDateTimeInputValue());
    setNotes("");
    setErrorMessage("");
    setDrawerOpen(true);
  }

  function closeDrawer() {
    if (saving) {
      return;
    }

    setDrawerOpen(false);
  }

  async function handleConfirmAdoption() {
    if (!quotationId) {
      setErrorMessage("Selecciona la cotización aceptada.");
      return;
    }

    if (!contactId) {
      setErrorMessage("Selecciona el directivo o contacto que autorizó la adopción.");
      return;
    }

    if (!signedAt) {
      setErrorMessage("Registra la fecha de firma o aprobación.");
      return;
    }

    const signedDate = new Date(signedAt);

    if (
      Number.isNaN(signedDate.getTime())
      || signedDate.getTime() > Date.now()
    ) {
      setErrorMessage(
        "La fecha de firma o aprobación no puede estar en el futuro.",
      );
      return;
    }

    try {
      setSaving(true);
      setErrorMessage("");

      await confirmCRMOpportunityAdoption(opportunity.id, {
        quotation: Number(quotationId),
        authorized_contact: Number(contactId),
        signed_at: signedDate.toISOString(),
        notes: notes.trim(),
      });

      setDrawerOpen(false);

      if (onAdoptionConfirmed) {
        onAdoptionConfirmed();
      }
    } catch (error) {
      setErrorMessage(
        getErrorMessage(
          error,
          "No se pudo confirmar la adopción.",
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
          Cargando adopción...
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
              Cierre comercial
            </p>
            <h2 className="mt-1 text-xl font-black text-gray-950">
              Adopción
            </h2>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-gray-500">
              Confirma la adopción únicamente cuando el colegio haya aceptado
              formalmente la propuesta comercial.
            </p>
          </div>

          {!currentAdoption && acceptedQuotations.length > 0 ? (
            <button
              type="button"
              onClick={openDrawer}
              disabled={contacts.length === 0}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-gray-950 px-4 py-2.5 text-sm font-black text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:bg-gray-300"
            >
              <FaFileSignature />
              Confirmar adopción
            </button>
          ) : null}
        </div>

        {errorMessage ? (
          <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-800">
            {errorMessage}
          </div>
        ) : null}

        {!currentAdoption && acceptedQuotations.length === 0 ? (
          <div className="mt-4 rounded-2xl border border-dashed border-gray-300 bg-gray-50 px-5 py-8 text-center">
            <p className="font-black text-gray-950">
              Aún no hay una cotización aceptada
            </p>
            <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-gray-500">
              Primero marca la cotización como enviada y luego como aceptada.
              La adopción se confirma después de ese paso.
            </p>
          </div>
        ) : null}

        {!currentAdoption && latestAcceptedQuotation ? (
          <div className="mt-4 overflow-hidden rounded-2xl border border-emerald-200 bg-emerald-50/40">
            <div className="flex flex-col justify-between gap-2 border-b border-emerald-200 px-4 py-3 sm:flex-row sm:items-center">
              <div>
                <p className="text-xs font-black uppercase tracking-wide text-emerald-700">
                  Cotización aceptada
                </p>
                <p className="mt-1 font-black text-gray-950">
                  Cotización v{latestAcceptedQuotation.version}
                </p>
              </div>
              <p className="text-xs font-bold text-gray-500">
                {latestAcceptedQuotation.items?.length || 0} producto(s)
              </p>
            </div>

            <div className="divide-y divide-emerald-100">
              {(latestAcceptedQuotation.items || []).map((item) => (
                <div
                  key={item.id}
                  className="grid gap-3 px-4 py-3 text-sm sm:grid-cols-[minmax(0,1fr)_90px_120px]"
                >
                  <div className="min-w-0">
                    <p className="font-black text-gray-950">
                      {item.product_name_snapshot}
                    </p>
                    <p className="mt-1 text-xs text-gray-500">
                      {item.provider_name_snapshot || "Editorial"}
                      {item.level_name_snapshot
                        ? ` · ${item.level_name_snapshot}`
                        : ""}
                      {item.grade_name_snapshot
                        ? ` · ${item.grade_name_snapshot}`
                        : ""}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-bold uppercase text-gray-400">
                      Cantidad
                    </p>
                    <p className="mt-1 font-black text-gray-950">
                      {item.quantity}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-bold uppercase text-gray-400">
                      Precio colegio
                    </p>
                    <p className="mt-1 font-black text-gray-950">
                      {formatMoney(item.school_price)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {!currentAdoption
        && acceptedQuotations.length > 0
        && contacts.length === 0 ? (
          <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            <p className="font-black">
              Falta registrar un contacto del colegio
            </p>
            <p className="mt-1 leading-6">
              La adopción necesita identificar al directivo o contacto que
              autorizó la propuesta.
            </p>
          </div>
        ) : null}

        {adoptions.length > 0 ? (
          <div className="mt-4 space-y-3">
            {adoptions.map((adoption) => (
              <article
                key={adoption.id}
                className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4"
              >
                <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                  <div>
                    <div className="flex items-center gap-2 text-emerald-700">
                      <FaCheckCircle />
                      <p className="font-black">
                        Adopción v{adoption.version}
                      </p>
                    </div>
                    <p className="mt-2 text-sm font-black text-gray-950">
                      {adoption.authorized_contact_name_snapshot
                        || adoption.authorized_contact?.full_name
                        || "Contacto autorizado"}
                    </p>
                    <p className="mt-1 text-xs text-gray-600">
                      {adoption.items?.length || 0} producto(s) adoptado(s)
                    </p>

                    {adoption.items?.length ? (
                      <div className="mt-3 space-y-2">
                        {adoption.items.map((item) => (
                          <div
                            key={item.id}
                            className="rounded-xl bg-white/80 px-3 py-2 text-xs text-gray-700 ring-1 ring-emerald-100"
                          >
                            <p className="font-black text-gray-950">
                              {item.product_name_snapshot}
                            </p>
                            <p className="mt-1">
                              {item.provider_name_snapshot || "Editorial"}
                              {" · "}
                              {item.quantity} unidad(es)
                              {" · "}
                              {formatMoney(item.school_price)}
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>

                  <div className="text-left text-xs text-gray-600 sm:text-right">
                    <p>
                      Firma: {formatDateTime(adoption.signed_at)}
                    </p>
                    <p className="mt-1">
                      Confirmación: {formatDateTime(adoption.confirmed_at)}
                    </p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : null}
      </section>

      {drawerOpen ? (
        <div className="fixed inset-0 z-50 flex justify-end bg-gray-950/60 backdrop-blur-sm">
          <button
            type="button"
            aria-label="Cerrar adopción"
            className="absolute inset-0 cursor-default"
            onClick={closeDrawer}
          />

          <section className="relative z-10 flex h-full w-full max-w-2xl flex-col bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-gray-200 px-5 py-4 sm:px-6">
              <div>
                <p className="text-xs font-black uppercase tracking-wide text-red-700">
                  CRM comercial
                </p>
                <h3 className="mt-1 text-2xl font-black text-gray-950">
                  Confirmar adopción
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  {opportunity.school?.name || "Colegio"} ·{" "}
                  {opportunity.campaign?.name || "Campaña"}
                </p>
              </div>

              <button
                type="button"
                onClick={closeDrawer}
                disabled={saving}
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200 text-gray-500 transition hover:bg-gray-50 disabled:opacity-50"
                aria-label="Cerrar"
              >
                <FaTimes />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-5 sm:px-6">
              {errorMessage ? (
                <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-800">
                  {errorMessage}
                </div>
              ) : null}

              <div className="grid gap-4">
                <label>
                  <span className="text-xs font-black uppercase tracking-wide text-gray-600">
                    Cotización aceptada
                  </span>
                  <select
                    value={quotationId}
                    onChange={(event) => setQuotationId(event.target.value)}
                    disabled={saving}
                    className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-100"
                  >
                    {acceptedQuotations.map((quotation) => (
                      <option key={quotation.id} value={quotation.id}>
                        Cotización v{quotation.version}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  <span className="text-xs font-black uppercase tracking-wide text-gray-600">
                    Directivo o contacto autorizado
                  </span>
                  <select
                    value={contactId}
                    onChange={(event) => setContactId(event.target.value)}
                    disabled={saving}
                    className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-100"
                  >
                    {contacts.map((contact) => (
                      <option key={contact.id} value={contact.id}>
                        {contact.full_name}
                        {contact.position ? ` · ${contact.position}` : ""}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  <span className="text-xs font-black uppercase tracking-wide text-gray-600">
                    Fecha de firma o aprobación
                  </span>
                  <input
                    type="datetime-local"
                    value={signedAt}
                    max={toLocalDateTimeInputValue()}
                    onChange={(event) => setSignedAt(event.target.value)}
                    disabled={saving}
                    className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-100"
                  />
                </label>

                <label>
                  <span className="text-xs font-black uppercase tracking-wide text-gray-600">
                    Observaciones
                  </span>
                  <textarea
                    value={notes}
                    onChange={(event) => setNotes(event.target.value)}
                    disabled={saving}
                    rows={4}
                    placeholder="Acuerdo, documento recibido o condición relevante de la adopción..."
                    className="mt-2 w-full resize-none rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-100"
                  />
                </label>
              </div>

              <div className="mt-5 rounded-2xl bg-gray-50 px-4 py-3 text-xs leading-5 text-gray-600 ring-1 ring-gray-200">
                Al confirmar, los productos, cantidades y condiciones de la
                cotización aceptada quedarán registrados como evidencia de la
                adopción y la oportunidad pasará a cierre ganado.
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t border-gray-200 bg-white px-5 py-4 sm:px-6">
              <button
                type="button"
                onClick={closeDrawer}
                disabled={saving}
                className="rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-black text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmAdoption}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-xl bg-red-700 px-4 py-2.5 text-sm font-black text-white transition hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <FaCheckCircle />
                {saving ? "Confirmando..." : "Confirmar adopción"}
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}
