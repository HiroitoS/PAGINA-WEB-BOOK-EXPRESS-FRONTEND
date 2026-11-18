import { useEffect, useState } from "react";
import {
  descargarEvidenciaRecepcion,
  enviarReporteEditorial,
  listarEvidenciasRecepcion,
  prepararReporteEditorial,
  subirEvidenciaRecepcion,
} from "../../api/warehouseApi";

const field = "mt-1 min-h-10 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-950 focus:border-red-700 focus:outline-none";
const button = "min-h-10 rounded-lg border border-gray-300 bg-white px-3 text-xs font-bold text-gray-900 hover:border-red-300 disabled:opacity-50";
const MAX_EVIDENCE_BYTES = 8 * 1024 * 1024;

function errorText(err) {
  const detail = err?.response?.data?.detail;
  if (Array.isArray(detail)) return detail[0];
  if (typeof detail === "string") return detail;
  if (err?.response?.status === 403) return "No tienes permiso para realizar esta acción.";
  return "No pudimos completar la operación. Revisa los datos y vuelve a intentarlo.";
}

export default function ReceivingEvidencePanel({ receipt, canUpload, canSend }) {
  const [items, setItems] = useState([]);
  const [report, setReport] = useState(null);
  const [lineId, setLineId] = useState(() => String(receipt.lines.find((line) => Number(line.quantity_observed) > 0 || (line.quantity_documented !== null && Number(line.quantity_documented) > Number(line.quantity_arrived)))?.id ?? ""));
  const [expanded, setExpanded] = useState(false);
  const [kind, setKind] = useState("damaged");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState(null);
  const [version, setVersion] = useState(0);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [copyFeedback, setCopyFeedback] = useState(false);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [recipient, setRecipient] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [dispatchKey, setDispatchKey] = useState(() => crypto.randomUUID());
  const observados = receipt.lines.reduce((sum, line) => sum + Number(line.quantity_observed || 0), 0);
  const faltantesGuia = receipt.lines.reduce((sum, line) =>
    sum + Math.max(0, Number(line.quantity_documented ?? 0) - Number(line.quantity_arrived || 0)), 0);
  const lineasConIncidencia = receipt.lines.filter((line) =>
    Number(line.quantity_observed) > 0 ||
    (line.quantity_documented != null && Number(line.quantity_documented) > Number(line.quantity_arrived)));
  const archivosPorLinea = new Set(items.map((item) => Number(item.receipt_line_id)));
  const sinEvidencia = lineasConIncidencia.filter((line) => !archivosPorLinea.has(Number(line.id)));

  useEffect(() => {
    let ignore = false;
    Promise.all([
      listarEvidenciasRecepcion(receipt.id),
      prepararReporteEditorial(receipt.id),
    ]).then(([rows, preview]) => {
      if (!ignore) {
        setItems(rows);
        setReport(preview);
        setError("");
      }
    }).catch((err) => {
      if (!ignore) setError(errorText(err));
    }).finally(() => {
      if (!ignore) setLoading(false);
    });
    return () => { ignore = true; };
  }, [receipt.id, version]);

  async function uploadEvidence(event) {
    event.preventDefault();
    if (!canUpload || !file || !lineId || busy) return;
    setBusy(true);
    setError("");
    try {
      setCopyFeedback(false);
      await subirEvidenciaRecepcion(receipt.id, {
        lineId, kind, description, file,
      });
      setDescription("");
      setFile(null);
      setNotice("Archivo registrado para el producto. Esta acción no modifica el inventario.");
      setVersion((v) => v + 1);
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  }

  async function copyReport() {
    if (!canSend || !report?.validated || !report?.requires_attention) return;
    setCopyFeedback(false);
    try {
      if (!navigator.clipboard?.writeText) {
        setError("No es posible copiar desde este navegador. Selecciona el texto del reporte para copiarlo.");
        return;
      }
      await navigator.clipboard.writeText(`Asunto: ${report.subject}\n\n${report.body}`);
      setCopyFeedback(true);
      setError("");
    } catch {
      setCopyFeedback(false);
      setError("No se pudo copiar el reporte. Selecciona el texto y cópialo manualmente.");
    }
  }

  function chooseFile(event) {
    const candidate = event.target.files?.[0] ?? null;
    if (candidate && candidate.size > MAX_EVIDENCE_BYTES) {
      setFile(null);
      setError("El archivo supera el máximo de 8 MB.");
      event.target.value = "";
      return;
    }
    setFile(candidate);
    setError("");
  }

  async function download(item) {
    try {
      setError("");
      const blob = await descargarEvidenciaRecepcion(receipt.id, item.id);
      const address = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = address;
      link.download = item.original_name;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(address), 1000);
    } catch (err) {
      setError(errorText(err));
    }
  }

  async function send(event) {
    event.preventDefault();
    if (!confirmed || !recipient.trim() || !canSend || !report?.sending_enabled || busy) return;
    setBusy(true);
    setError("");
    try {
      const result = await enviarReporteEditorial(receipt.id, recipient.trim(), dispatchKey);
      if (result.sent) {
        setNotice("Reporte enviado a la editorial con sus evidencias. Se registró la constancia de envío.");
        setConfirmed(false);
        setDispatchKey(crypto.randomUUID());
      }
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section aria-label="Incidencias de recepción" className="space-y-2">
      {lineasConIncidencia.length > 0 && !loading && (
        <div role="status" className={`flex flex-wrap items-center justify-between gap-3 rounded-xl border px-3 py-3 ${sinEvidencia.length
          ? "border-amber-300 bg-amber-50 text-amber-950"
          : "border-gray-200 bg-gray-50 text-gray-800"}`}>
          <div className="min-w-0">
            <p className="text-sm font-bold">
              {sinEvidencia.length > 0
                ? `Falta documentar ${sinEvidencia.length} producto(s) con incidencias`
                : "Productos con incidencias documentadas"}
            </p>
            <p className="mt-1 text-xs leading-5">
              {observados} unidad(es) observada(s)
              {faltantesGuia > 0 ? ` · ${faltantesGuia} faltante(s) frente al documento` : ""}.
              {" "}Una evidencia puede sustentar varias unidades del mismo producto; no necesitas una foto por libro.
            </p>
          </div>
          {sinEvidencia.length > 0 && (
            <button type="button" className="min-h-10 rounded-lg border border-amber-400 bg-white px-3 text-xs font-bold text-amber-950 hover:border-red-400"
              onClick={() => {
                setExpanded(true);
                setLineId(String(sinEvidencia[0].id));
              }}>
              {canUpload ? "Adjuntar evidencia" : "Consultar incidencias"}
            </button>
          )}
        </div>
      )}
      <details open={expanded} onToggle={(event) => setExpanded(event.currentTarget.open)}
        className="rounded-xl border border-gray-200 bg-white p-3">
      <summary className="cursor-pointer text-sm font-black text-gray-950">
        Incidencias, evidencias y comunicación a la editorial
        <span className="ml-2 text-xs font-normal text-gray-500">
          ({items.length} adjunto{items.length === 1 ? "" : "s"})
        </span>
      </summary>
      <div className="mt-3 space-y-3">
        {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-xs text-red-800">{error}</p>}
        {notice && <p role="status" className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-xs text-gray-900">{notice}</p>}
        {loading && <p role="status" className="text-xs text-gray-600">Consultando evidencias…</p>}
        {canUpload && receipt.status !== "cancelled" && (
          <form onSubmit={uploadEvidence} className="space-y-3 rounded-lg border border-gray-200 bg-gray-50 p-3">
            <div>
              <h4 className="text-xs font-black text-gray-950">Registrar evidencia del libro observado</h4>
              <p className="mt-1 text-xs text-gray-600">
                Los deteriorados o libros incorrectos deben quedar primero en la cantidad «Observados».
              </p>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <label className="text-xs font-bold text-gray-700">
                Libro recibido
                <select required className={field} value={lineId}
                  onChange={(event) => setLineId(event.target.value)}>
                  <option value="">Seleccionar producto</option>
                  {receipt.lines.map((line) => (
                    <option key={line.id} value={line.id}>{line.product_name}</option>
                  ))}
                </select>
              </label>
              <label className="text-xs font-bold text-gray-700">
                Tipo de observación
                <select className={field} value={kind} onChange={(event) => setKind(event.target.value)}>
                  <option value="damaged">Dañado o deteriorado</option>
                  <option value="incorrect">Libro incorrecto</option>
                  <option value="shortage">Faltante frente a la guía</option>
                  <option value="other">Otra observación</option>
                </select>
              </label>
            </div>
            <label className="block text-xs font-bold text-gray-700">
              Descripción del problema
              <textarea required minLength={8} maxLength={500} rows={2}
                value={description} onChange={(event) => setDescription(event.target.value)}
                className={field} placeholder="Ej. Dos portadas dañadas durante el transporte." />
            </label>
            <label className="block text-xs font-bold text-gray-700">
              Fotografía o PDF (máximo 8 MB)
              <input key={version} required type="file" accept=".jpg,.jpeg,.png,.webp,.pdf" className={field}
                onChange={chooseFile} />
            </label>
            <button type="submit" disabled={busy || !file || !lineId || description.trim().length < 8}
              className="min-h-10 rounded-lg bg-red-700 px-4 text-xs font-bold text-white disabled:opacity-50">
              Guardar evidencia
            </button>
          </form>
        )}
        {items.length ? (
          <div className="space-y-2">
            {items.map((item) => (
              <div key={item.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-gray-200 p-3">
                <div className="min-w-0">
                  <p className="text-xs font-bold text-gray-950">{item.product} · {item.kind_label}</p>
                  <p className="mt-1 text-xs text-gray-700">{item.description}</p>
                  <p className="mt-1 text-xs text-gray-500">{item.original_name}</p>
                  <p className="mt-1 text-xs text-gray-500">
                    Registrado por: {item.created_by}
                    {item.created_at ? ` · ${new Date(item.created_at).toLocaleString("es-PE")}` : ""}
                  </p>
                </div>
                <button type="button" className={button} onClick={() => download(item)}>
                  Descargar archivo
                </button>
              </div>
            ))}
          </div>
        ) : !loading && <p className="text-xs text-gray-600">Aún no se adjuntaron evidencias.</p>}
        {items.length > 0 && (
          <p className="text-xs leading-5 text-gray-600">
            Estos archivos quedan vinculados a la recepción. Jefatura puede
            revisarlos y descargarlos desde esta misma pantalla con sus permisos.
          </p>
        )}
        {report && (
          <details className="rounded-lg border border-gray-200 bg-gray-50 p-3">
            <summary className="cursor-pointer text-sm font-black text-gray-950">
              Preparar reporte para la editorial
              <span className="ml-2 font-normal text-gray-600">· Revisión y envío opcional</span>
            </summary>
            <div className="mt-3 space-y-3">
              {report.validated && report.requires_attention && canSend && (
                <div className="flex flex-wrap items-center gap-3">
                  <button type="button" onClick={copyReport} className={button}>
                    {copyFeedback ? "Copiar nuevamente" : "Copiar texto del correo"}
                  </button>
                  {copyFeedback && (
                    <p role="status" className="rounded-lg border border-gray-300 bg-gray-100 px-3 py-2 text-xs font-bold text-gray-900">
                      ✓ Correo copiado (asunto y mensaje). Descarga y adjunta los archivos
                      en tu correo antes de enviarlo. No se ha enviado nada.
                    </p>
                  )}
                </div>
              )}
              {report.validated && report.requires_attention && !canSend && (
                <p className="text-xs text-gray-700">
                  El reporte formal será gestionado por Jefatura de Almacén.
                </p>
              )}
            <p className="text-xs leading-5 text-gray-600">
              El correo incluye únicamente las incidencias registradas: faltantes frente
              a la guía y libros observados, con sus evidencias. Los libros pendientes
              de otro envío del proveedor no se presentan como faltantes de esta guía.
            </p>
            <label className="block text-xs font-bold text-gray-700">
              Asunto
              <input value={report.subject} readOnly className={field} />
            </label>
            <label className="block text-xs font-bold text-gray-700">
              Texto preparado
              <textarea value={report.body} rows={9} readOnly className={field} />
            </label>
            {report.sending_enabled && report.validated && report.requires_attention && canSend ? (
              <form onSubmit={send} className="space-y-2">
                <label className="block text-xs font-bold text-gray-700">
                  Correo verificado de la editorial
                  <input type="email" required className={field} value={recipient}
                    onChange={(event) => { setConfirmed(false); setRecipient(event.target.value); }}
                    placeholder="Ingresar correo confirmado" />
                </label>
                <label className="flex items-start gap-2 text-xs leading-5 text-gray-800">
                  <input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} />
                  Confirmo que verifiqué el destinatario, las diferencias y los archivos adjuntos.
                </label>
                <button type="submit" disabled={!confirmed || busy}
                  className="min-h-10 rounded-lg bg-red-700 px-4 text-xs font-bold text-white disabled:opacity-50">
                  Enviar reporte con evidencias
                </button>
              </form>
            ) : (
              <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-950">
                {report.validated
                  ? "Puedes copiar el reporte y revisarlo en tu correo habitual. El envío directo desde Book Express requiere configuración corporativa y autorización. Copiarlo no significa que se haya enviado."
                  : "Se trata de un borrador. El correo formal podrá enviarse después de la aprobación de jefatura."}
              </p>
            )}
            </div>
          </details>
        )}
      </div>
      </details>
    </section>
  );
}
