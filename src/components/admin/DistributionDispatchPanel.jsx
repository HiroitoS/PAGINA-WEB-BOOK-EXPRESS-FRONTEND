import { useEffect, useState } from "react";
import { FiCheckCircle, FiClipboard, FiFileText, FiPrinter, FiTruck } from "react-icons/fi";
import {
  consultarDocumentoInterno, crearDocumentoInterno,
  confirmarSalidaInterna, confirmarLlegadaInterna,
  registrarDiferenciaLlegada, resolverDiferenciaLlegada,
} from "../../api/warehouseApi";
import ArrivalIncidentPanel, { ArrivalIncidentHistory } from "./ArrivalIncidentPanel";
import printInternalDispatch from "./printInternalDispatch";
import PreparedFairDestinationCorrection from "./PreparedFairDestinationCorrection";

const buttonPrimary = "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-red-700 px-4 text-sm font-bold text-white transition hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-50";
const fieldClass = "mt-1 min-h-11 w-full rounded-xl border border-gray-300 bg-white px-3 text-sm text-gray-950 focus:border-red-700 focus:outline-none focus:ring-2 focus:ring-red-100";
const blankCount = {};
const grePattern = /^EG[A-Z0-9]{2}-[0-9]{1,8}$/;
const recipientPattern = /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+(?:[ '-][A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+)+$/;

function validRecipient(value) {
  const cleaned = value.trim().replace(/\s+/g, " ");
  return cleaned.length >= 6 && recipientPattern.test(cleaned);
}

function readError(err) {
  if (!err?.response) return "No se pudo conectar. Comprueba el servidor.";
  const fields = err.response.data || {};
  const message = fields.detail ?? Object.values(fields)[0];
  return Array.isArray(message) ? message[0] : typeof message === "string"
    ? message : "No se pudo completar la operación. Revisa la información.";
}

const stages = [
  { id: "prepared", title: "Preparada", icon: FiClipboard },
  { id: "documented", title: "Orden interna", icon: FiFileText },
  { id: "in_transit", title: "En tránsito", icon: FiTruck },
  { id: "received", title: "Recibida", icon: FiCheckCircle },
];

function Progress({ state }) {
  const stageIndex = state === "received" ? 3 : state === "in_transit" ? 2
    : state === "documented" ? 1 : 0;
  return (
    <ol className="grid grid-cols-4 gap-1 rounded-xl bg-gray-100 p-1">
      {stages.map(({ id, title, icon: Icon }, index) => (
        <li key={id} aria-current={index === stageIndex ? "step" : undefined}
          className={
            "flex min-w-0 flex-col items-center gap-1 rounded-lg px-1 py-2 text-center text-xs sm:flex-row sm:justify-center sm:gap-2 " +
            (index <= stageIndex
              ? "bg-white font-bold text-gray-950 shadow-sm"
              : "text-gray-500")
          }>
          <Icon aria-hidden="true" className={index < stageIndex ? "text-gray-900" : ""} />
          <span className="leading-4">{title}</span>
        </li>
      ))}
    </ol>
  );
}

export default function DistributionDispatchPanel({
  operation, canManage, canMoveStock, canResolveIncidents, onChanged,
}) {
  const [dispatch, setDispatch] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [revision, setRevision] = useState(0);
  const [documentKey, setDocumentKey] = useState(() => crypto.randomUUID());
  const [basis, setBasis] = useState("");
  const [guideRef, setGuideRef] = useState("");
  const [exemption, setExemption] = useState("");
  const [dispatchChecked, setDispatchChecked] = useState(false);
  const [arrivalChecked, setArrivalChecked] = useState(false);
  const [receiverName, setReceiverName] = useState("");
  const [counts, setCounts] = useState(blankCount);

  useEffect(() => {
    let ignore = false;
    consultarDocumentoInterno(operation.id)
      .then((data) => { if (!ignore) setDispatch(data); })
      .catch((err) => { if (!ignore) setError(readError(err)); })
      .finally(() => { if (!ignore) setLoading(false); });
    return () => { ignore = true; };
  }, [operation.id, revision]);

  async function run(action, extra = {}) {
    if (busy) return;
    setError("");
    setNotice("");
    setBusy(true);
    try {
      let next;
      if (action === "document") {
        next = await crearDocumentoInterno(operation.id, documentKey);
        setDocumentKey(crypto.randomUUID());
        setNotice("Orden interna generada. Todavía no se ha despachado mercadería.");
      } else if (action === "dispatch") {
        next = await confirmarSalidaInterna(operation.id, {
          evidence_kind: basis,
          external_guide_reference: guideRef.trim().toUpperCase(),
          exception_justification: exemption.trim(),
          physical_dispatch_confirmed: dispatchChecked,
        });
        setNotice("Salida registrada. Los libros están en tránsito, sin ingresar al destino.");
      } else if (action === "report_incident") {
        next = await registrarDiferenciaLlegada(operation.id, {
          receiver_name: receiverName.trim(),
          observations: extra.observations,
          counts: dispatch.lines.map((line) => ({
            line_id: line.id, counted: Number(counts[line.id]),
          })),
        });
        setNotice("Incidencia registrada. La entrega continúa en tránsito; no se ingresaron libros al destino.");
      } else if (action === "resolve_incident") {
        next = await resolverDiferenciaLlegada(operation.id, {
          incident_id: extra.incidentId,
          resolution_note: extra.resolutionNote,
          counts: dispatch.lines.map((line) => ({
            line_id: line.id, counted: Number(counts[line.id]),
          })),
        });
        setNotice("Recuento conforme registrado por Jefatura. Ya puedes confirmar la recepción física.");
      } else {
        next = await confirmarLlegadaInterna(operation.id, {
          receiver_name: receiverName.trim(),
          arrival_confirmed: arrivalChecked,
          counts: dispatch.lines.map((line) => ({
            line_id: line.id, counted: Number(counts[line.id]),
          })),
        });
        setNotice("Llegada confirmada. Los libros se contabilizaron una sola vez en destino.");
      }
      setDispatch(next);
      setRevision((v) => v + 1);
      onChanged?.(next.operation_status);
    } catch (err) {
      setError(readError(err));
    } finally {
      setBusy(false);
    }
  }

  const state = dispatch?.exists ? dispatch.status : "prepared";
  const needsSpecificFair = operation.mode === "fair"
    && operation.destination_kind === "fair"
    && operation.destination_fair_event_id === null;
  const receiverValid = validRecipient(receiverName);
  const greValid = grePattern.test(guideRef.trim().toUpperCase())
    && Number(guideRef.trim().split("-")[1]) > 0;
  const exceptionValid = canResolveIncidents && exemption.trim().length >= 60
    && exemption.trim().split(/\s+/).length >= 9;
  const receptionValid = dispatch?.lines?.length > 0 && dispatch.lines.every(
    (line) => counts[line.id] !== undefined && String(counts[line.id]).trim() !== ""
      && Number.isSafeInteger(Number(counts[line.id])) && Number(counts[line.id]) >= 0,
  );

  return (
    <section className="space-y-3 rounded-xl border border-gray-200 bg-white p-3 shadow-sm sm:p-4"
      aria-label="Documento interno, salida y recepción">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-red-700">
            Despacho de mercadería
          </p>
          <h4 className="mt-1 text-base font-black text-gray-950">Salida y recepción</h4>
          <p className="mt-1 text-xs leading-5 text-gray-600">
            La salida y la recepción se confirman en momentos distintos.
            Preparar o imprimir un documento no mueve libros.
          </p>
        </div>
        {dispatch?.exists && (
          <span className="rounded-lg border border-gray-300 px-3 py-2 text-xs font-bold text-gray-900">
            {dispatch.document_number}
          </span>
        )}
      </div>
      <Progress state={state} />
      {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}
      {notice && <p role="status" className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm font-semibold text-gray-900">{notice}</p>}
      {loading && <p role="status" className="text-sm text-gray-600">Consultando documento interno…</p>}

      {!loading && dispatch && !dispatch.exists && needsSpecificFair && (
        <PreparedFairDestinationCorrection
          operation={operation}
          canCorrect={canManage && canResolveIncidents}
          onCorrected={() => {
            setNotice("Feria específica asignada con historial. Ya puedes crear la orden interna.");
            onChanged?.("prepared");
          }}
        />
      )}

      {!loading && dispatch && !dispatch.exists && !needsSpecificFair && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-200 bg-gray-50 p-3">
          <p className="max-w-xl text-sm leading-6 text-gray-700">
            La preparación está verificada. Genera una orden interna numerada con los
            productos y sus guías reales, sin descontar ni trasladar libros.
          </p>
          {canManage && (
            <button type="button" className={buttonPrimary} disabled={busy || !dispatch.can_create}
              onClick={() => run("document")}>
              <FiFileText aria-hidden="true" /> Crear orden interna
            </button>
          )}
        </div>
      )}

      {!loading && dispatch?.exists && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-200 bg-gray-50 p-3">
            <div>
              <p className="text-sm font-bold text-gray-950">
                {dispatch.total} libros · {dispatch.lines.length} lotes
              </p>
              <p className="mt-1 text-xs text-gray-600">
                {dispatch.source} → {dispatch.destination}
              </p>
            </div>
            <button type="button" onClick={() => {
              if (!printInternalDispatch(dispatch)) {
                setError("El navegador bloqueó la ventana de impresión. Permite ventanas emergentes para imprimir.");
              }
            }} className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 text-xs font-bold text-gray-950 hover:border-red-600">
              <FiPrinter aria-hidden="true" /> Ver / imprimir documento interno
            </button>
          </div>

          {dispatch.status === "documented" && (
            <div className="space-y-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
              <h5 className="text-sm font-bold text-amber-950">
                Confirmar una salida real (no es obligatorio durante la preparación)
              </h5>
              <p className="text-xs leading-5 text-amber-900">
                Antes del movimiento, verifica el documento legal aplicable fuera
                del ERP. Una orden interna NO reemplaza la GRE exigible.
                El sistema registra lo declarado por el responsable, pero no consulta SUNAT.
                No uses referencias ficticias ni confirmes la salida sin movimiento real.
              </p>
              <fieldset className="space-y-2 rounded-xl border border-amber-200 bg-white p-3">
                <legend className="text-xs font-bold text-amber-950">Sustento comprobado por el responsable</legend>
                <label className="flex items-start gap-2 text-xs text-gray-900">
                  <input type="radio" name={`basis-${operation.id}`} className="mt-0.5"
                    checked={basis === "external_guide"} onChange={() => setBasis("external_guide")} />
                  GRE verificada externamente, anotar referencia
                </label>
                {canResolveIncidents && (
                  <label className="flex items-start gap-2 text-xs text-gray-900">
                    <input type="radio" name={`basis-${operation.id}`} className="mt-0.5"
                      checked={basis === "exception"} onChange={() => setBasis("exception")} />
                    Otra excepción legal, autorizada por Jefatura
                  </label>
                )}
              </fieldset>
              {basis === "external_guide" && (
                <label className="block text-xs font-bold text-gray-900">
                  Referencia de la GRE (sistema externo)
                  <input className={fieldClass} maxLength={120} value={guideRef}
                    onChange={(event) => setGuideRef(event.target.value.toUpperCase())}
                    placeholder="EG01-00000001" />
                  <span className="mt-1 block text-xs font-normal leading-5 text-gray-700">
                    Formato: serie EG de 4 caracteres, guion y número. Se verifica
                    manualmente fuera del ERP; el formato no acredita aceptación SUNAT.
                  </span>
                  {guideRef && !greValid && (
                    <span role="status" className="mt-1 block text-xs font-semibold text-red-700">
                      Revisa la serie y el correlativo de la GRE.
                    </span>
                  )}
                </label>
              )}
              {basis === "exception" && (
                <div className="space-y-2 rounded-xl border border-amber-300 bg-white p-3">
                  <label className="block text-xs font-bold text-gray-900">
                    Sustento legal supervisado (mínimo 60 caracteres y 9 palabras)
                    <textarea rows={3}
                      className="mt-2 w-full rounded-xl border border-gray-300 bg-white p-3 text-sm font-normal text-gray-950 focus:border-red-700 focus:outline-none focus:ring-2 focus:ring-red-100"
                      maxLength={500} value={exemption}
                      onChange={(event) => setExemption(event.target.value)}
                      placeholder="Indicar el supuesto legal aplicable y su sustento previamente revisado" />
                  </label>
                  <p className="text-xs leading-5 text-gray-700">
                    {exemption.trim().length} caracteres · {exemption.trim().split(/\s+/).filter(Boolean).length} palabras.
                    {!exceptionValid
                      ? " Jefatura debe explicar el supuesto legal y las pruebas revisadas."
                      : " Extensión suficiente; la validez legal debe comprobarse fuera del ERP."}
                  </p>
                </div>
              )}
              <label className="flex items-start gap-2 text-xs leading-5 text-gray-900">
                <input type="checkbox" checked={dispatchChecked} className="mt-0.5"
                  onChange={(event) => setDispatchChecked(event.target.checked)} />
                Confirmo que la mercadería saldrá realmente del almacén y he
                comprobado su documentación correspondiente.
              </label>
              {canManage && canMoveStock && (
                <button type="button" disabled={
                  busy || !dispatchChecked
                  || (basis === "external_guide" && !greValid)
                  || (basis === "exception" && !exceptionValid)
                  || !basis
                } className={buttonPrimary} onClick={() => run("dispatch")}>
                  <FiTruck aria-hidden="true" /> Confirmar salida física
                </button>
              )}
            </div>
          )}

          {dispatch.status === "in_transit" && (
            <div className="space-y-3 rounded-xl border border-gray-200 bg-gray-50 p-3">
              <h5 className="text-sm font-bold text-gray-950">Recepción en el destino</h5>
              <p className="text-xs leading-5 text-gray-700">
                Los libros están en tránsito; no están aún disponibles en destino.
                El responsable cuenta cada lote recibido.
              </p>
              <div className="space-y-2">
                {dispatch.lines.map((line) => (
                  <label key={line.id}
                    className="grid gap-3 rounded-xl border border-gray-200 bg-white p-3 sm:grid-cols-[minmax(0,1fr)_7rem] sm:items-center">
                    <span className="min-w-0 text-xs leading-5 text-gray-900">
                      <strong>{line.product}</strong>
                      <span className="block text-gray-600">
                        Guía {line.receipt_number} · Despachadas {line.quantity}
                      </span>
                    </span>
                    <span className="text-xs font-semibold text-gray-700">
                      Contadas
                      <input type="number" min="0" step="1" inputMode="numeric"
                        aria-label={`Unidades recibidas de ${line.product}`}
                        value={counts[line.id] ?? ""}
                        onChange={(event) => setCounts((previous) => ({
                          ...previous, [line.id]: event.target.value,
                        }))}
                        className="mt-1 h-10 w-28 rounded-lg border border-gray-300 bg-white px-3 text-right text-sm font-bold tabular-nums text-gray-950 focus:border-red-700 focus:outline-none focus:ring-2 focus:ring-red-100" />
                    </span>
                  </label>
                ))}
              </div>
              <label className="block text-xs font-bold text-gray-900">
                Nombres y apellidos de quien recibe
                <input className={fieldClass} maxLength={180} value={receiverName}
                  onChange={(event) => setReceiverName(event.target.value)}
                  placeholder="Ej. Rosa Quispe" />
                {receiverName && !receiverValid && (
                  <span role="status" className="mt-1 block text-xs font-normal text-red-700">
                    Indica al menos dos palabras, sin números ni símbolos.
                  </span>
                )}
              </label>
              <ArrivalIncidentPanel
                dispatch={dispatch}
                counts={counts}
                receiverName={receiverName}
                busy={busy}
                canReport={canManage && canMoveStock}
                canResolve={canResolveIncidents}
                onReport={(observations) => run("report_incident", { observations })}
                onResolve={(incidentId, resolutionNote) => run("resolve_incident", {
                  incidentId, resolutionNote,
                })}
              />
              <label className="flex items-start gap-2 text-xs leading-5 text-gray-900">
                <input type="checkbox" checked={arrivalChecked}
                  onChange={(event) => setArrivalChecked(event.target.checked)} className="mt-0.5" />
                Confirmo que la persona indicada recibió y contó físicamente los libros.
              </label>
              {canManage && canMoveStock && (
                <button type="button" className={buttonPrimary}
                  disabled={busy || !receptionValid || !arrivalChecked
                    || dispatch.open_incident || !receiverValid
                    || dispatch.lines.some((line) => Number(counts[line.id]) !== line.quantity)}
                  onClick={() => run("arrival")}>
                  <FiCheckCircle aria-hidden="true" /> Cerrar entrega y confirmar recepción
                </button>
              )}
            </div>
          )}

          {dispatch.status === "received" && (
            <div className="flex items-start gap-3 rounded-xl border border-gray-300 bg-gray-50 p-4">
              <FiCheckCircle aria-hidden="true" className="mt-0.5 shrink-0 text-lg text-gray-900" />
              <div className="text-sm text-gray-950">
                <strong>Recepción confirmada en {dispatch.destination}.</strong>
                <p className="mt-1 text-xs text-gray-700">
                  Recibió: {dispatch.recipient_name} · {dispatch.total} libros.
                  El movimiento interno quedó registrado una sola vez.
                </p>
              </div>
            </div>
          )}
          {dispatch.status === "received" && (
            <ArrivalIncidentHistory incidents={dispatch.arrival_incidents ?? []} />
          )}
        </>
      )}
    </section>
  );
}
