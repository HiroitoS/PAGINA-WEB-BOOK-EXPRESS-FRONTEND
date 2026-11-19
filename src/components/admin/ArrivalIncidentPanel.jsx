import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { FiAlertTriangle, FiClipboard, FiLock, FiShield } from "react-icons/fi";

const primaryButton = "inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-red-700 px-4 text-xs font-bold text-white transition-colors hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-50";
const textAreaClass = "mt-2 w-full rounded-xl border border-gray-300 bg-white p-3 text-sm text-gray-900 focus:border-red-700 focus:outline-none focus:ring-2 focus:ring-red-100";

function DifferenceRows({ rows, lines }) {
  return (
    <div className="divide-y divide-gray-200 rounded-lg border border-gray-200 bg-white">
      {rows.filter((item) => item.difference !== 0).map((item) => {
        const line = lines.find((candidate) => candidate.id === item.line_id);
        return (
          <div key={item.line_id}
            className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-3 py-2">
            <p className="min-w-0 text-xs font-semibold leading-5 text-gray-900">
              {line?.product ?? "Lote"}
            </p>
            <span className="text-right text-xs font-bold tabular-nums text-red-700">
              {item.counted} / {item.expected}
              <span className="ml-2 text-gray-500">
                ({item.difference > 0 ? "+" : ""}{item.difference})
              </span>
            </span>
          </div>
        );
      })}
    </div>
  );
}


export function ArrivalIncidentHistory({ incidents }) {
  return incidents.length > 0 ? (
  <details className="rounded-lg border border-gray-200 bg-white p-3 text-xs text-gray-700">
    <summary className="cursor-pointer font-semibold text-gray-900">
      Historial de incidencias ({incidents.length})
    </summary>
    <div className="mt-3 space-y-2">
      {incidents.map((item) => (
        <div key={item.id} className="rounded-lg border border-gray-200 bg-gray-50 p-3">
          <p className="font-bold text-gray-950">
            #{item.id} · {item.status === "open" ? "Pendiente" : "Recuento conforme"}
          </p>
          <p className="mt-1">{item.observations}</p>
          <p className="mt-1 text-gray-500">Registró: {item.reported_by}</p>
          {item.resolution_note && (
            <p className="mt-1 text-gray-800">Cierre: {item.resolution_note}</p>
          )}
        </div>
      ))}
    </div>
  </details>
  )}
  ) : null;
}

export default function ArrivalIncidentPanel({
  dispatch, counts, receiverName, busy, canReport, canResolve, onReport, onResolve,
}) {
  const reducedMotion = useReducedMotion();
  const [observations, setObservations] = useState("");
  const [resolutionNote, setResolutionNote] = useState("");
  const incidents = dispatch.arrival_incidents ?? [];
  const open = incidents.find((item) => item.status === "open");
  const complete = dispatch.lines.length > 0 && dispatch.lines.every((line) => {
    const value = counts[line.id];
    return value !== undefined && String(value).trim() !== ""
      && Number.isSafeInteger(Number(value)) && Number(value) >= 0;
  });
  const snapshots = complete ? dispatch.lines.map((line) => ({
    line_id: line.id,
    expected: line.quantity,
    counted: Number(counts[line.id]),
    difference: Number(counts[line.id]) - line.quantity,
  })) : [];
  const mismatched = snapshots.some((item) => item.difference !== 0);
  const animation = reducedMotion
    ? { initial: false, animate: {}, exit: {}, transition: { duration: 0 } }
    : {
        initial: { opacity: 0, y: 6 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: -4 },
        transition: { duration: 0.18, ease: "easeOut" },
      };

  return (
    <div className="space-y-3">
      <AnimatePresence initial={false} mode="wait">
        {!open && mismatched && (
          <motion.section key="report" {...animation}
            className="space-y-3 rounded-xl border border-red-200 bg-red-50 p-3 sm:p-4">
            <div className="flex items-start gap-3">
              <FiAlertTriangle aria-hidden="true" className="mt-0.5 shrink-0 text-lg text-red-700" />
              <div>
                <h6 className="text-sm font-bold text-gray-950">Diferencia en el conteo</h6>
                <p className="mt-1 text-xs leading-5 text-gray-700">
                  Registra el faltante o sobrante para revisión. Esto no ingresa libros
                  al destino ni cierra la entrega.
                </p>
              </div>
            </div>
            <DifferenceRows rows={snapshots} lines={dispatch.lines} />
            <label className="block text-xs font-bold text-gray-900">
              ¿Qué ocurrió? (mínimo 10 caracteres)
              <textarea rows={2} className={textAreaClass} maxLength={1000}
                placeholder="Ej. Al verificar el lote se encontró un ejemplar faltante."
                value={observations}
                onChange={(event) => setObservations(event.target.value)} />
            </label>
            {canReport ? (
              <button type="button" className={primaryButton}
                disabled={busy || !receiverName.trim() || observations.trim().length < 10}
                onClick={() => onReport(observations.trim())}>
                <FiClipboard aria-hidden="true" /> Registrar incidencia
              </button>
            ) : (
              <p className="text-xs text-gray-600">Se requiere autorización para registrar la incidencia.</p>
            )}
          </motion.section>
        )}
        {open && (
          <motion.section key={open.id} {...animation}
            className="space-y-3 rounded-xl border border-red-200 bg-red-50 p-3 sm:p-4">
            <div className="flex items-start gap-3">
              <FiLock aria-hidden="true" className="mt-0.5 shrink-0 text-lg text-red-700" />
              <div className="min-w-0">
                <h6 className="text-sm font-bold text-gray-950">Incidencia #{open.id} pendiente de revisión</h6>
                <p className="mt-1 text-xs leading-5 text-gray-700">
                  El destino no recibirá estas existencias como conformes hasta que
                  Jefatura revise el recuento. Si persiste la diferencia, permanecerán
                  en tránsito hasta tramitar su resolución.
                </p>
                <p className="mt-2 text-xs font-semibold text-gray-900">{open.observations}</p>
              </div>
            </div>
            <DifferenceRows rows={open.counts} lines={dispatch.lines} />
            {canResolve ? (
              <div className="space-y-3 rounded-lg border border-gray-200 bg-white p-3">
                <h6 className="flex items-center gap-2 text-xs font-bold text-gray-950">
                  <FiShield aria-hidden="true" /> Recuento conforme supervisado
                </h6>
                <p className="text-xs leading-5 text-gray-700">
                  Si todos los libros fueron encontrados físicamente, vuelve a contar los
                  lotes arriba y documenta la verificación. Cerrar la incidencia no
                  confirma todavía la llegada. Un faltante real no puede cerrarse así.
                </p>
                <label className="block text-xs font-bold text-gray-900">
                  Resultado de la verificación (mínimo 15 caracteres)
                  <textarea rows={2} maxLength={1000} className={textAreaClass}
                    value={resolutionNote}
                    onChange={(event) => setResolutionNote(event.target.value)}
                    placeholder="Indicar quién realizó el recuento y qué se comprobó." />
                </label>
                <button type="button" className={primaryButton}
                  disabled={busy || !complete || mismatched || resolutionNote.trim().length < 15}
                  onClick={() => onResolve(open.id, resolutionNote.trim())}>
                  <FiShield aria-hidden="true" /> Cerrar por recuento conforme
                </button>
              </div>
            ) : (
              <p className="rounded-lg bg-white p-3 text-xs leading-5 text-gray-700">
                Jefatura debe revisar esta incidencia. No está permitido
                confirmar la recepción mientras permanezca abierta.
              </p>
            )}
          </motion.section>
        )}
      </AnimatePresence>
      <ArrivalIncidentHistory incidents={incidents} />
    </div>
  );
}
