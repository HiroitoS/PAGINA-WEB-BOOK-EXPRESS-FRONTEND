import { useState } from "react";
import { FiArrowLeft, FiCheckCircle, FiFileText, FiPrinter } from "react-icons/fi";
import printInternalReturn from "./printInternalReturn";
import { prepararRetornoDestino, registrarRetornoDestino } from "../../api/warehouseApi";

const field = "mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-950 focus:border-red-700 focus:outline-none";
const label = "block text-xs font-semibold text-gray-900";
const grePattern = /^EG[A-Z0-9]{2}-[0-9]{1,8}$/;

function readError(error) {
  if (!error?.response) return "No se pudo conectar con el servidor.";
  const value = error.response.data?.detail ?? Object.values(error.response.data ?? {})[0];
  return Array.isArray(value) ? value[0] : typeof value === "string"
    ? value : "No fue posible registrar la devolución. Revisa los datos.";
}

export default function FairReturnPanel({ dispatch, operationId, mode, canPrepare, canConfirm, onSaved }) {
  const [expanded, setExpanded] = useState(false);
  const destinationLabel = mode === "consignment" ? "consignación" : "feria";
  const [quantities, setQuantities] = useState({});
  const [receiver, setReceiver] = useState("");
  const [reference, setReference] = useState("");
  const [documentationStatus, setDocumentationStatus] = useState(mode === "fair" ? "internal_control" : "gre");
  const [documentationNote, setDocumentationNote] = useState("");
  const [reason, setReason] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [key, setKey] = useState(() => crypto.randomUUID());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [recentPlanId, setRecentPlanId] = useState(null);

  const plans = dispatch.internal_return_plans ?? [];
  const recentPlan = plans.find((plan) => plan.id === recentPlanId)
    ?? plans.at(-1) ?? null;
  const returned = new Map();
  for (const entry of dispatch.destination_returns ?? dispatch.fair_returns ?? []) {
    for (const item of entry.details ?? []) {
      returned.set(item.line_id, (returned.get(item.line_id) ?? 0) + item.quantity);
    }
  }
  const requested = dispatch.lines.flatMap((line) => {
    const quantity = Number(quantities[line.id] ?? 0);
    return quantity > 0 && Number.isSafeInteger(quantity)
      ? [{ line_id: line.id, quantity }]
      : [];
  });
  const validQuantities = dispatch.lines.every((line) => {
    const raw = quantities[line.id] ?? "";
    const number = Number(raw || 0);
    return Number.isSafeInteger(number) && number >= 0
      && number <= line.quantity - (returned.get(line.id) ?? 0);
  });
  const allowPreparation = canPrepare && !busy && validQuantities && requested.length > 0
    && reason.trim().length >= 15;
  const receiveNameValid = receiver.trim().split(/\s+/).length >= 2;
  const reasonValid = reason.trim().length >= 15;
  const missing = [
    ...(requested.length === 0 ? ["Indica la cantidad de libros que realmente regresaron."] : []),
    ...(!validQuantities ? ["Revisa las cantidades: no pueden superar lo pendiente."] : []),
    ...(!receiveNameValid ? ["Escribe nombres y apellidos de quien recibe."] : []),
    ...(!reasonValid ? ["Describe el motivo con al menos 15 caracteres."] : []),
    ...(!confirmed ? ["Marca la confirmación de recepción física."] : []),
    ...(!canConfirm ? ["La confirmación requiere autorización de Jefatura de Almacén."] : []),
  ];
  const canSubmit = canConfirm && !busy && validQuantities && requested.length > 0
    && receiveNameValid
    && (mode === "fair" || (documentationStatus === "gre"
      ? grePattern.test(reference.trim().toUpperCase())
        && Number(reference.trim().split("-")[1]) > 0
      : documentationNote.trim().length >= 40))
    && reasonValid && confirmed;

  async function prepare(event) {
    event.preventDefault();
    if (!allowPreparation) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const result = await prepararRetornoDestino(operationId, {
        idempotency_key: key,
        reason: reason.trim(),
        lines: requested,
      });
      setKey(crypto.randomUUID());
      const plan = (result.internal_return_plans ?? []).find(
        (item) => item.reference === result.internal_return_number,
      );
      setRecentPlanId(plan?.id ?? null);
      setNotice(`Documento ${result.internal_return_number} generado. Puedes abrirlo e imprimirlo aquí mismo; no se movió inventario.`);
      onSaved?.(result);
    } catch (err) {
      setError(readError(err));
    } finally {
      setBusy(false);
    }
  }

  async function submit(event) {
    event.preventDefault();
    if (!canSubmit) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const result = await registrarRetornoDestino(operationId, {
        idempotency_key: key,
        receiver_name: receiver.trim(),
        transport_reference: mode !== "fair" && documentationStatus === "gre" ? reference.trim().toUpperCase() : "",
        documentation_status: mode === "fair" ? "internal_control" : documentationStatus,
        documentation_note: mode !== "fair" && documentationStatus === "pending_review" ? documentationNote.trim() : "",
        reason: reason.trim(),
        received_confirmed: true,
        lines: requested,
      });
      setKey(crypto.randomUUID());
      setQuantities({});
      setConfirmed(false);
      setDocumentationNote("");
      setReference("");
      setExpanded(false);
      setNotice("Retorno físico registrado en el inventario.");
      onSaved?.(result);
    } catch (err) {
      setError(readError(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="space-y-3 rounded-xl border border-gray-200 bg-white p-3"
      aria-label={`Retorno de libros desde ${destinationLabel}`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h5 className="flex items-center gap-2 text-sm font-bold text-gray-950">
            <FiArrowLeft aria-hidden="true" /> Retornos de {destinationLabel}
          </h5>
          <p className="mt-1 text-xs leading-5 text-gray-600">
            Registra únicamente los libros que ya regresaron físicamente al almacén de origen.
          </p>
        </div>
        {(canPrepare || canConfirm) && (
          <button type="button" onClick={() => setExpanded((value) => !value)}
            className="min-h-10 rounded-lg border border-gray-300 px-3 text-xs font-bold text-gray-950 hover:border-red-600">
            {expanded ? "Cerrar" : "Registrar retorno"}
          </button>
        )}
      </div>
      {(dispatch.destination_returns ?? dispatch.fair_returns ?? []).length > 0 && (
        <details className="rounded-lg border border-gray-200 bg-gray-50 p-3">
          <summary className="cursor-pointer text-xs font-bold text-gray-950">
            Historial de retornos ({(dispatch.destination_returns ?? dispatch.fair_returns ?? []).length})
          </summary>
          <div className="mt-3 space-y-2 text-xs text-gray-700">
            {(dispatch.destination_returns ?? dispatch.fair_returns ?? []).map((item) => (
              <div key={item.id} className="rounded-lg bg-white p-3">
                <p className="font-bold text-gray-950">
                  {item.details.reduce((total, line) => total + line.quantity, 0)} libros retornados
                </p>
                <p className="mt-1">Recibió: {item.received_by}</p>
                <p className="mt-1">Documentación: {item.documentation_status === "internal_control"
                  ? "Control interno de feria · revisión documental pendiente"
                  : item.documentation_followup_required
                    ? "Pendiente de revisión por Jefatura" : "GRE declarada externamente"}</p>
                {item.reference && <p className="mt-1">Referencia: {item.reference}</p>}
                {item.documentation_note && <p className="mt-1">Observación: {item.documentation_note}</p>}
              </div>
            ))}
          </div>
        </details>
      )}
      {plans.length > 0 && (
        <details className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-xs">
          <summary className="cursor-pointer font-bold text-gray-900">
            Historial de documentos internos ({plans.length})
          </summary>
          <div className="mt-2 space-y-2">
            {plans.map((plan) => (
              <div key={plan.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-white p-3">
                <p className="min-w-0 flex-1 text-gray-700">
                  <strong className="text-gray-950">{plan.reference}</strong> · {plan.reason}
                  <span className="block text-gray-500">Solo preparación; sin traslado confirmado.</span>
                </p>
                <button type="button" onClick={() => {
                  if (!printInternalReturn(plan, dispatch)) {
                    setError("Permite ventanas emergentes para imprimir la constancia.");
                  }
                }} className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 font-semibold text-gray-900 hover:border-red-600">
                  <FiPrinter aria-hidden="true" /> Ver / imprimir
                </button>
              </div>
            ))}
          </div>
        </details>
      )}
      {recentPlan && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-300 bg-gray-50 p-4">
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-2 text-xs font-black text-gray-950">
              <FiFileText aria-hidden="true" /> Documento interno generado automáticamente
            </p>
            <p className="mt-1 text-lg font-black tracking-wide text-red-700">{recentPlan.reference}</p>
            <p className="mt-1 text-xs leading-5 text-gray-600">
              Puedes volver a imprimirlo cuando lo necesites. No certifica salida física ni GRE.
            </p>
          </div>
          <button type="button" onClick={() => {
            if (!printInternalReturn(recentPlan, dispatch)) {
              setError("Permite ventanas emergentes para abrir el documento.");
            }
          }} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-red-700 px-4 text-sm font-bold text-white hover:bg-red-800">
            <FiPrinter aria-hidden="true" /> Ver / imprimir documento
          </button>
        </div>
      )}
      {notice && <p role="status" className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-xs font-bold text-gray-900">{notice}</p>}
      {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-xs text-red-800">{error}</p>}
      {expanded && (canPrepare || canConfirm) && (
        <form onSubmit={submit} className="space-y-3 rounded-xl bg-gray-50 p-3">
          <div className="rounded-lg border border-gray-200 bg-white p-3 text-xs leading-5 text-gray-700">
            <p><strong>Documento de entrega original: {dispatch.document_number}</strong></p>
            <p className="mt-1">Primero puedes generar una constancia interna automática BE-RI
              para contar y preparar el retorno. Esto no mueve existencias ni acredita
              transporte. La guía de tu editorial corresponde a la compra, no a este retorno.</p>
            {mode !== "fair" && (
              <p className="mt-1">
                Para el transporte físico, verifica la documentación que corresponda.
                La constancia interna no la sustituye.
              </p>
            )}
          </div>
          <div className="space-y-2">
            {dispatch.lines.map((line) => {
              const available = Math.max(0, line.quantity - (returned.get(line.id) ?? 0));
              return (
                <label key={line.id} className="grid items-center gap-2 rounded-lg border border-gray-200 bg-white p-2 sm:grid-cols-[minmax(0,1fr)_6rem]">
                  <span className="text-xs leading-5 text-gray-900">
                    <strong>{line.product}</strong>
                    <span className="block text-gray-600">
                      De esta entrega, aún no retornadas: {available}
                    </span>
                  </span>
                  <input type="number" min="0" max={available} step="1" inputMode="numeric"
                    aria-label={`Retornar unidades de ${line.product}`}
                    className={field} value={quantities[line.id] ?? ""}
                    onChange={(event) => setQuantities((previous) => ({
                      ...previous, [line.id]: event.target.value,
                    }))} />
                </label>
              );
            })}
          </div>
          <label className={label}>Nombres y apellidos de quien recibe
            <input className={field} maxLength={180} value={receiver}
              onChange={(event) => setReceiver(event.target.value)} />
          </label>
          <label className={label}>Motivo del retorno
            <textarea rows={2} maxLength={500} className={field} value={reason}
              onChange={(event) => setReason(event.target.value)} />
          </label>
          {requested.length === 0 && (
            <p role="status" className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-xs leading-5 text-blue-900">
              Para preparar el BE-RI y registrar la devolución, escribe primero
              la cantidad de libros que deseas devolver (por ejemplo, 10).
              El campo vacío no representa una devolución.
            </p>
          )}
          {!validQuantities && (
            <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-800">
              Una cantidad ingresada es inválida o supera el saldo pendiente del lote.
            </p>
          )}
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" disabled={!allowPreparation} onClick={prepare}
              className="min-h-10 rounded-lg border border-gray-300 bg-white px-3 text-xs font-bold text-gray-900 hover:border-red-600 disabled:cursor-not-allowed disabled:opacity-50">
              {busy ? "Generando documento…" : "Generar / recuperar documento BE-RI"}
            </button>
            <p className="text-xs text-gray-600">La serie y numeración BE-RI se asignan automáticamente, sin mover existencias.</p>
          </div>
          {mode === "fair" ? (
            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <p className="text-sm font-black text-gray-950">Devolución interna de feria</p>
              <p className="mt-1 text-xs leading-5 text-gray-700">
                Cuenta los libros sobrantes y registra la recepción en el almacén.
                No ingreses una serie ni una guía manual. BE-RI se numera automáticamente.
              </p>
              <p className="mt-2 text-xs leading-5 text-gray-700">
                Los libros que no regresan <strong>no se consideran vendidos automáticamente</strong>.
                El cierre deberá conciliar ventas registradas, sobrantes y diferencias.
              </p>
              <p className="mt-2 text-xs text-gray-600">
                La documentación de transporte, cuando sea exigible, se revisa por separado.
              </p>
            </div>
          ) : (
            <>
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-950">
                La constancia interna BE-RI no sustituye una GRE aplicable al traslado de consignaciones.
              </div>
              <fieldset className="space-y-2 rounded-xl border border-gray-200 bg-white p-3">
            <legend className="px-1 text-sm font-bold text-gray-950">Estado documental de la recepción física</legend>
            <label className="flex items-center gap-2 text-sm text-gray-800">
              <input type="radio" name={`documentation-${operationId}`}
                checked={documentationStatus === "gre"}
                onChange={() => setDocumentationStatus("gre")} />
              Dispongo de GRE real emitida para este traslado
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-800">
              <input type="radio" name={`documentation-${operationId}`}
                checked={documentationStatus === "pending_review"}
                onChange={() => setDocumentationStatus("pending_review")} />
              Los libros ya regresaron, pero la documentación está pendiente de revisión
            </label>
            {documentationStatus === "gre" ? (
              <label className={label}>Número de la GRE emitida
                <input className={field} maxLength={120} value={reference}
                  onChange={(event) => setReference(event.target.value.toUpperCase())}
                  placeholder="Número real de la GRE, no de BE-RI" />
              </label>
            ) : (
              <div className="rounded-lg border border-amber-300 bg-amber-50 p-3">
                <p className="text-xs leading-5 text-amber-950">
                  Este registro documenta una recepción física que YA ocurrió. No autoriza
                  realizar un traslado sin GRE ni regulariza una infracción. Requiere
                  Jefatura y deja seguimiento documental auditable.
                </p>
                <label className={label}>Observación para Jefatura (mínimo 40 caracteres)
                  <textarea rows={3} maxLength={500} value={documentationNote}
                    onChange={(event) => setDocumentationNote(event.target.value)}
                    className={field} placeholder="Describir cuándo y cómo llegaron los libros y qué documentación debe revisarse" />
                </label>
              </div>
            )}
              </fieldset>
            </>
          )}
          <label className="flex items-start gap-2 text-xs leading-5 text-gray-800">
            <input type="checkbox" checked={confirmed} className="mt-1"
              onChange={(event) => setConfirmed(event.target.checked)} />
            {mode === "fair"
              ? "Confirmo que los libros sobrantes ya regresaron físicamente al almacén y fueron contados. El control documental queda pendiente de revisión."
              : documentationStatus === "pending_review"
              ? "Confirmo que los libros ya regresaron físicamente, fueron contados y la falta de documentación quedó registrada para revisión de Jefatura."
              : "Confirmo que los libros retornaron físicamente, fueron contados y se verificó el documento de transporte declarado."}
          </label>
          {!canSubmit && !busy && (
            <div role="status" className="rounded-xl border border-gray-200 bg-white p-3 text-xs text-gray-800">
              <p className="font-bold text-gray-950">Para habilitar la confirmación:</p>
              <ul className="mt-2 list-inside list-disc space-y-1">
                {missing.map((item) => <li key={item}>{item}</li>)}
                {mode !== "fair" && documentationStatus === "gre"
                  && !grePattern.test(reference.trim().toUpperCase()) && (
                    <li>Registra el número válido de la GRE emitida.</li>
                  )}
                {mode !== "fair" && documentationStatus === "pending_review"
                  && documentationNote.trim().length < 40 && (
                    <li>Completa la observación documental (mínimo 40 caracteres).</li>
                  )}
              </ul>
            </div>
          )}
          {!canConfirm && (
            <p className="rounded-lg border border-gray-200 bg-white p-3 text-xs leading-5 text-gray-700">
              Puedes preparar e imprimir el BE-RI. La confirmación física
              y actualización de existencias corresponde al Jefe de Almacén
              o usuario expresamente autorizado.
            </p>
          )}
          <button type="submit" disabled={!canSubmit}
            className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-red-700 px-4 text-sm font-bold text-white hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-50">
            <FiCheckCircle aria-hidden="true" /> {busy ? "Registrando…" : mode === "fair" ? "Confirmar devolución interna de feria" : documentationStatus === "pending_review" ? "Registrar recepción física observada" : "Confirmar retorno físico"}
          </button>
        </form>
      )}
    </section>
  );
}
