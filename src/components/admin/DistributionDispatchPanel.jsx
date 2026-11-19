import { useEffect, useState } from "react";
import { FiCheckCircle, FiClipboard, FiFileText, FiPrinter, FiTruck } from "react-icons/fi";
import {
  consultarDocumentoInterno, crearDocumentoInterno,
  confirmarSalidaInterna, confirmarLlegadaInterna,
} from "../../api/warehouseApi";

const buttonPrimary = "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-red-700 px-4 text-sm font-bold text-white transition hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-50";
const fieldClass = "mt-1 min-h-11 w-full rounded-xl border border-gray-300 bg-white px-3 text-sm text-gray-950 focus:border-red-700 focus:outline-none focus:ring-2 focus:ring-red-100";
const blankCount = {};

function readError(err) {
  if (!err?.response) return "No se pudo conectar. Comprueba el servidor.";
  const fields = err.response.data || {};
  const message = fields.detail ?? Object.values(fields)[0];
  return Array.isArray(message) ? message[0] : typeof message === "string"
    ? message : "No se pudo completar la operación. Revisa la información.";
}

function cleanHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[character]);
}

function printInternalDocument(data) {
  const page = window.open("", "_blank");
  if (!page) return false;
  const rows = (data.lines || []).map((line) => `
    <tr>
      <td>${cleanHtml(line.product)}</td>
      <td>${cleanHtml(line.receipt_number)}</td>
      <td style="text-align:right">${cleanHtml(line.quantity)}</td>
    </tr>`).join("");
  const html = `<!doctype html>
<html lang="es"><head><meta charset="UTF-8">
<title>${cleanHtml(data.document_number)} · Book Express</title>
<style>
@page{size:A4;margin:15mm}body{font:13px Arial,sans-serif;color:#151515;margin:0}
header{display:flex;justify-content:space-between;align-items:start;border-bottom:3px solid #bc0000;padding-bottom:12px}
h1{font-size:20px;margin:0}h2{font-size:14px;margin:18px 0 8px}
small,.muted{color:#555}.tag{border:1px solid #555;padding:5px 8px;font-weight:bold}
p{margin:6px 0;line-height:1.55}.grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}
table{width:100%;border-collapse:collapse;margin-top:9px}th,td{border:1px solid #bbb;padding:9px 8px;text-align:left;vertical-align:top}
th{background:#f1f1f1}.signatures{display:grid;grid-template-columns:1fr 1fr;gap:40px;margin-top:68px}
.signatures div{border-top:1px solid #444;padding-top:8px;text-align:center}
.footer{margin-top:26px;padding:10px;background:#f6f6f6;font-size:11px;border:1px solid #ccc}
@media print{button{display:none}}
</style></head>
<body>
<header>
  <div><h1>BOOK EXPRESS</h1><p>Orden interna de salida / entrega</p>
  <small>Documento de control logístico</small></div>
  <span class="tag">${cleanHtml(data.document_number)}</span>
</header>
<h2>Identificación de la operación</h2>
<div class="grid">
  <div><p><strong>Colegio:</strong> ${cleanHtml(data.school)}</p>
  <p><strong>Entrega:</strong> ${cleanHtml(data.operation_name)}</p>
  <p><strong>Modalidad:</strong> ${cleanHtml({fair:"Feria",consignment:"Consignación",point_of_sale:"Punto de venta"}[data.mode] ?? data.mode)}</p></div>
  <div><p><strong>Origen:</strong> ${cleanHtml(data.source)}</p>
  <p><strong>Destino:</strong> ${cleanHtml(data.destination)}</p>
  <p><strong>Responsable previsto:</strong> ${cleanHtml(data.responsible_name)}</p></div>
</div>
<h2>Mercadería identificada por lote</h2>
<table><thead><tr><th>Producto</th><th>Guía de recepción</th><th>Cantidad</th></tr></thead>
<tbody>${rows}</tbody><tfoot><tr><th colspan="2">TOTAL</th>
<th style="text-align:right">${cleanHtml(data.total)}</th></tr></tfoot></table>
<p><strong>Estado:</strong> ${cleanHtml({
 documented:"Orden interna emitida, salida NO confirmada",
 in_transit:"Salida física confirmada, pendiente recepción",
 received:"Recepción de destino confirmada",
}[data.status] ?? data.status)}</p>
${data.external_guide_reference ? `<p><strong>Referencia GRE externa declarada:</strong> ${cleanHtml(data.external_guide_reference)}</p>` : ""}
${data.recipient_name ? `<p><strong>Recibido por:</strong> ${cleanHtml(data.recipient_name)}</p>` : ""}
<div class="signatures"><div>Responsable que entrega / fecha</div><div>Responsable que recibe / fecha</div></div>
<p class="footer"><strong>Control interno:</strong> no es guía de remisión electrónica, no acredita emisión
ni aceptación de SUNAT y no reemplaza los documentos legalmente exigibles. Las firmas no
alteran el inventario digital: el registro de salida y el de recepción se confirman por separado.</p>
</body></html>`;
  page.document.open();
  page.document.write(html);
  page.document.close();
  page.focus();
  return true;
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
          <Icon aria-hidden="true" className={index < stageIndex ? "text-green-700" : ""} />
          <span className="leading-4">{title}</span>
        </li>
      ))}
    </ol>
  );
}

export default function DistributionDispatchPanel({ operation, canManage, canMoveStock, onChanged }) {
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

  async function run(action) {
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
          external_guide_reference: guideRef.trim(),
          exception_justification: exemption.trim(),
          physical_dispatch_confirmed: dispatchChecked,
        });
        setNotice("Salida registrada. Los libros están en tránsito, sin ingresar al destino.");
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

      {!loading && dispatch && !dispatch.exists && (
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
              if (!printInternalDocument(dispatch)) {
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
                Antes del movimiento verifica el sustento tributario aplicable fuera de
                este sistema. Una orden interna NO reemplaza la GRE exigida.
                Solo confirma aquí cuando la mercadería vaya a salir físicamente.
              </p>
              <fieldset className="space-y-2">
                <legend className="text-xs font-bold text-amber-950">Sustento comprobado por el responsable</legend>
                <label className="flex items-start gap-2 text-xs text-gray-900">
                  <input type="radio" name={`basis-${operation.id}`} className="mt-0.5"
                    checked={basis === "external_guide"} onChange={() => setBasis("external_guide")} />
                  GRE verificada externamente, anotar referencia
                </label>
                <label className="flex items-start gap-2 text-xs text-gray-900">
                  <input type="radio" name={`basis-${operation.id}`} className="mt-0.5"
                    checked={basis === "exception"} onChange={() => setBasis("exception")} />
                  Excepción legal revisada y documentada
                </label>
              </fieldset>
              {basis === "external_guide" && (
                <label className="block text-xs font-bold text-gray-900">
                  Referencia de la GRE (sistema externo)
                  <input className={fieldClass} maxLength={120} value={guideRef}
                    onChange={(event) => setGuideRef(event.target.value)}
                    placeholder="Número o referencia verificada" />
                </label>
              )}
              {basis === "exception" && (
                <label className="block text-xs font-bold text-gray-900">
                  Sustento de la excepción (mín. 20 caracteres)
                  <textarea rows={3} className={fieldClass} maxLength={500}
                    value={exemption} onChange={(event) => setExemption(event.target.value)}
                    placeholder="Explicar la norma y el caso concreto revisado" />
                </label>
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
                  || (basis === "external_guide" && guideRef.trim().length < 5)
                  || (basis === "exception" && exemption.trim().length < 20)
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
                    className="grid gap-2 rounded-lg border border-gray-200 bg-white p-3 sm:grid-cols-4 sm:items-center">
                    <span className="text-xs leading-5 text-gray-900 sm:col-span-3">
                      <strong>{line.product}</strong>
                      <span className="block text-gray-600">
                        Guía {line.receipt_number} · Despachadas {line.quantity}
                      </span>
                    </span>
                    <span className="text-xs font-semibold text-gray-700">
                      Contadas
                      <input type="number" min="0" step="1" inputMode="numeric"
                        value={counts[line.id] ?? ""}
                        onChange={(event) => setCounts((previous) => ({
                          ...previous, [line.id]: event.target.value,
                        }))}
                        className={fieldClass} />
                    </span>
                  </label>
                ))}
              </div>
              <label className="block text-xs font-bold text-gray-900">
                Nombre de quien recibe
                <input className={fieldClass} maxLength={180} value={receiverName}
                  onChange={(event) => setReceiverName(event.target.value)}
                  placeholder="Responsable que cuenta los libros" />
              </label>
              {receptionValid && dispatch.lines.some((line) => Number(counts[line.id]) !== line.quantity) && (
                <p role="status" className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900">
                  Existe una diferencia. No registres entrada conforme hasta documentar
                  y resolver la incidencia con Jefatura.
                </p>
              )}
              <label className="flex items-start gap-2 text-xs leading-5 text-gray-900">
                <input type="checkbox" checked={arrivalChecked}
                  onChange={(event) => setArrivalChecked(event.target.checked)} className="mt-0.5" />
                Confirmo que la persona indicada recibió y contó físicamente los libros.
              </label>
              {canManage && canMoveStock && (
                <button type="button" className={buttonPrimary}
                  disabled={busy || !receptionValid || !arrivalChecked
                    || receiverName.trim().length === 0
                    || dispatch.lines.some((line) => Number(counts[line.id]) !== line.quantity)}
                  onClick={() => run("arrival")}>
                  <FiCheckCircle aria-hidden="true" /> Confirmar recepción física
                </button>
              )}
            </div>
          )}

          {dispatch.status === "received" && (
            <div className="flex items-start gap-3 rounded-xl border border-green-200 bg-green-50 p-4">
              <FiCheckCircle aria-hidden="true" className="mt-0.5 shrink-0 text-lg text-green-700" />
              <div className="text-sm text-gray-950">
                <strong>Recepción confirmada en {dispatch.destination}.</strong>
                <p className="mt-1 text-xs text-gray-700">
                  Recibió: {dispatch.recipient_name} · {dispatch.total} libros.
                  El movimiento interno quedó registrado una sola vez.
                </p>
              </div>
            </div>
          )}
        </>
      )}
    </section>
  );
}
