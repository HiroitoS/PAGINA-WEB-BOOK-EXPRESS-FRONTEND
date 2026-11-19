import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { FiAlertCircle, FiArrowRight, FiEdit2, FiMapPin } from "react-icons/fi";
import { Link } from "react-router";
import {
  corregirDestinoFeriaPreparada, opcionesDistribucion,
} from "../../api/warehouseApi";

const secondaryButton = "inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-3 text-xs font-bold text-gray-900 transition-colors hover:border-red-500 hover:text-red-700 disabled:opacity-50";
const primaryButton = "inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-red-700 px-4 text-xs font-bold text-white transition-colors hover:bg-red-800 disabled:opacity-50";

function messageFromError(error) {
  const data = error?.response?.data;
  const message = data?.detail || data?.destination_id || data?.reason;
  if (Array.isArray(message)) return message.join(" ");
  return typeof message === "string"
    ? message : "No se pudo actualizar la feria. Revisa los datos y vuelve a intentar.";
}

/**
 * Única rectificación después del conteo permitido en B4:
 * destino feria genérico → feria específica, con autorización y auditoría.
 * No permite alterar origen, cantidades, modalidad, lotes ni un documento emitido.
 */
export default function PreparedFairDestinationCorrection({
  operation, canCorrect, onCorrected,
}) {
  const reducedMotion = useReducedMotion();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [choices, setChoices] = useState([]);
  const [destinationId, setDestinationId] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const canSave = !saving && !loading && Boolean(destinationId)
    && reason.trim().length >= 12;

  async function toggle() {
    if (open) {
      setOpen(false);
      setError("");
      return;
    }
    setOpen(true);
    setError("");
    setLoading(true);
    try {
      const data = await opcionesDistribucion({});
      setChoices((data.locations || []).filter(
        (loc) => loc.kind === "fair" && Boolean(loc.fair_event_id),
      ));
    } catch (err) {
      setError(messageFromError(err));
    } finally {
      setLoading(false);
    }
  }

  async function save(event) {
    event.preventDefault();
    if (!canSave) return;
    setSaving(true);
    setError("");
    try {
      const updated = await corregirDestinoFeriaPreparada(
        operation.id, Number(destinationId), reason.trim(),
      );
      setOpen(false);
      onCorrected?.(updated);
    } catch (err) {
      setError(messageFromError(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="rounded-xl border border-amber-300 bg-amber-50 p-3 sm:p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 flex-1 gap-3">
          <FiAlertCircle aria-hidden="true" className="mt-0.5 shrink-0 text-lg text-amber-800" />
          <div className="min-w-0">
            <h5 className="text-sm font-bold text-gray-950">
              Esta preparación necesita una feria específica
            </h5>
            <p className="mt-1 text-xs leading-5 text-gray-700">
              Su destino actual es <strong>{operation.destination}</strong>, un almacén
              genérico usado anteriormente. Antes de crear la orden interna debemos
              identificar el evento donde se recibirán estos libros.
            </p>
            <p className="mt-2 text-xs text-gray-700">
              La corrección conserva los libros preparados, la guía, los lotes y las
              cantidades. No registra ningún traslado ni modifica el stock.
            </p>
          </div>
        </div>
        {canCorrect ? (
          <button type="button" className={secondaryButton} onClick={toggle}
            aria-expanded={open} aria-controls={`fair-fix-${operation.id}`}>
            <FiEdit2 aria-hidden="true" />
            {open ? "Cerrar" : "Asignar feria real"}
          </button>
        ) : (
          <p className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-800">
            Solicita la corrección a Jefatura
          </p>
        )}
      </div>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div id={`fair-fix-${operation.id}`}
            initial={reducedMotion ? false : { opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={reducedMotion ? undefined : { opacity: 0, height: 0 }}
            transition={{ duration: reducedMotion ? 0 : 0.18 }}
            className="overflow-hidden">
            <form onSubmit={save} className="mt-4 space-y-3 rounded-xl border border-gray-200 bg-white p-3 sm:p-4">
              <div className="flex items-center gap-2 text-xs font-bold text-gray-900">
                <FiMapPin aria-hidden="true" /> Feria que recibirá la mercadería
              </div>
              {loading ? (
                <p role="status" className="text-xs text-gray-600">Consultando ferias registradas…</p>
              ) : choices.length ? (
                <label className="block text-xs font-semibold text-gray-800">
                  Destino físico
                  <select className="mt-1 min-h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 focus:border-red-700 focus:outline-none focus:ring-2 focus:ring-red-100"
                    value={destinationId} required
                    onChange={(event) => setDestinationId(event.target.value)}>
                    <option value="">Selecciona una feria específica</option>
                    {choices.map((loc) => (
                      <option key={loc.id} value={loc.id}>{loc.name}</option>
                    ))}
                  </select>
                </label>
              ) : (
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-xs leading-5 text-gray-700">
                  No hay ferias específicas disponibles.
                  <Link className="ml-1 inline-flex items-center gap-1 font-bold text-red-700 underline"
                    to="/admin/erp/almacen/ubicaciones?seccion=ferias">
                    Registrar una feria <FiArrowRight aria-hidden="true" />
                  </Link>
                </div>
              )}
              <label className="block text-xs font-semibold text-gray-800">
                Motivo de la corrección (mínimo 12 caracteres)
                <textarea rows={2} maxLength={500}
                  className="mt-1 w-full rounded-lg border border-gray-300 bg-white p-3 text-sm text-gray-900 focus:border-red-700 focus:outline-none focus:ring-2 focus:ring-red-100"
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  placeholder="Ej. Se asigna la feria registrada para esta entrega." />
              </label>
              <p className="text-xs leading-5 text-gray-600">
                Solo se corrige el destino de una preparación aún sin orden interna.
                Quedará registrado quién autorizó el cambio y su motivo.
              </p>
              {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-800">{error}</p>}
              <button type="submit" className={primaryButton} disabled={!canSave}>
                {saving ? "Guardando corrección…" : "Confirmar destino de feria"}
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
