import { useId } from "react";

/**
 * Confirmación visual reutilizable del panel administrativo.
 * Mantiene la decisión dentro de React y evita diálogos nativos del navegador.
 */
export default function ConfirmActionDialog({
  open,
  eyebrow = "Confirmación",
  title,
  description,
  confirmLabel = "Confirmar",
  cancelLabel = "Revisar nuevamente",
  processing = false,
  onConfirm,
  onCancel,
  children,
}) {
  const titleId = useId();
  const descriptionId = useId();

  if (!open) return null;

  function controlarTeclado(event) {
    if (event.key === "Escape") {
      if (!processing) onCancel();
      return;
    }
    if (event.key !== "Tab") return;

    const controls = [...event.currentTarget.querySelectorAll(
      "button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled)",
    )];
    if (!controls.length) return;
    const first = controls[0];
    const last = controls[controls.length - 1];

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/60 px-4 py-6 backdrop-blur-sm">
      <div role="dialog" aria-modal="true" aria-labelledby={titleId}
        aria-describedby={descriptionId}
        onKeyDown={controlarTeclado}
        className="w-full max-w-xl rounded-2xl border border-gray-200 bg-white p-5 shadow-2xl sm:p-6">
        <p className="text-xs font-bold uppercase tracking-wide text-red-700">{eyebrow}</p>
        <h2 id={titleId} className="mt-1 text-xl font-black text-gray-950">{title}</h2>
        <p id={descriptionId} className="mt-2 text-sm text-gray-700">{description}</p>
        {children}
        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <button type="button" autoFocus disabled={processing} onClick={onCancel}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-bold text-gray-800 transition hover:bg-gray-50 disabled:opacity-50">
            {cancelLabel}
          </button>
          <button type="button" disabled={processing} onClick={onConfirm}
            className="rounded-lg bg-red-700 px-4 py-2 text-sm font-bold text-white transition hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-50">
            {processing ? "Procesando…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
