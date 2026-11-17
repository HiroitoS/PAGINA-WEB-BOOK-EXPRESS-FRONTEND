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
  const [lineId, setLineId] = useState("");
  const [kind, setKind] = useState("damaged");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState(null);
  const [version, setVersion] = useState(0);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [recipient, setRecipient] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [dispatchKey, setDispatchKey] = useState(() => crypto.randomUUID());

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
      await subirEvidenciaRecepcion(receipt.id, {
        lineId, kind, description, file,
      });
      setDescription("");
      setFile(null);
      setNotice("Evidencia guardada y vinculada al libro. No se modificó el inventario.");
      setVersion((v) => v + 1);
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
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
    <details className="rounded-xl border border-gray-200 bg-white p-3">
      <summary className="cursor-pointer text-sm font-black text-gray-950">
        Incidencias, evidencias y comunicación a la editorial
        <span className="ml-2 text-xs font-normal text-gray-500">
          ({items.length} adjunto{items.length === 1 ? "" : "s"})
        </span>
      </summary>
      <div className="mt-3 space-y-3">
        {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-xs text-red-800">{error}</p>}
        {notice && <p role="status" className="rounded-lg bg-green-50 p-3 text-xs text-green-900">{notice}</p>}
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
              <input required type="file" accept=".jpg,.jpeg,.png,.webp,.pdf" className={field}
                onChange={(event) => setFile(event.target.files?.[0] ?? null)} />
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
                </div>
                <button type="button" className={button} onClick={() => download(item)}>
                  Descargar archivo
                </button>
              </div>
            ))}
          </div>
        ) : !loading && <p className="text-xs text-gray-600">Aún no se adjuntaron evidencias.</p>}
        {report && (
          <section className="space-y-3 rounded-lg border border-gray-200 bg-gray-50 p-3">
            <h4 className="text-xs font-black text-gray-950">Reporte para la editorial</h4>
            <p className="text-xs leading-5 text-gray-600">
              El reporte se genera con los datos del documento, diferencias físicas y evidencias guardadas.
              Una entrega parcial del pedido no se reporta automáticamente como faltante de la guía.
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
                  ? "Reporte disponible para revisión. Para enviar correos desde la plataforma debe configurarse el correo corporativo y habilitarse el envío por el administrador."
                  : "Se trata de un borrador. El correo formal podrá enviarse después de la aprobación de jefatura."}
              </p>
            )}
          </section>
        )}
      </div>
    </details>
  );
}
