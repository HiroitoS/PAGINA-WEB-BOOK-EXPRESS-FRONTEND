import { useEffect, useRef } from "react";
import { FaCalendarAlt, FaTimes } from "react-icons/fa";

export function CalendarMetricCard({ className = "", label, value, variant = "default" }) {
  const variantClass = {
    default: "bg-gray-100 text-gray-700",
    task: "bg-red-50 text-red-700",
    event: "bg-blue-50 text-blue-700",
    reminder: "bg-yellow-50 text-yellow-800",
  };

  return (
    <div className={`border-b border-gray-100 p-3 sm:p-4 xl:border-b-0 xl:border-r ${className}`}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-black text-gray-700 sm:text-sm">{label}</p>
          <p className="mt-1 text-2xl font-black text-gray-950 sm:mt-2 sm:text-3xl">{value}</p>
        </div>

        <div
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl sm:h-10 sm:w-10 ${
            variantClass[variant] || variantClass.default
          }`}
        >
          <FaCalendarAlt />
        </div>
      </div>
    </div>
  );
}

export function CalendarViewButton({ active, label, onClick }) {
  return (
    <button
      className={`shrink-0 rounded-xl px-4 py-2 text-xs font-black transition ${
        active ? "bg-red-700 text-white shadow-sm" : "bg-gray-950 text-white hover:bg-black"
      }`}
      type="button"
      onClick={onClick}
    >
      {label}
    </button>
  );
}

export function MobileModeButton({ active, label, onClick }) {
  return (
    <button
      className={`rounded-xl px-2 py-2.5 text-xs font-black transition ${
        active ? "bg-red-700 text-white shadow-sm" : "bg-gray-100 text-gray-700"
      }`}
      type="button"
      onClick={onClick}
    >
      {label}
    </button>
  );
}

export function CalendarDrawer({ children, subtitle, title, onClose }) {
  const drawerRef = useRef(null);

  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === "Escape") onClose();
    }

    function handlePointerDown(event) {
      if (drawerRef.current && !drawerRef.current.contains(event.target)) {
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    document.addEventListener("pointerdown", handlePointerDown, true);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("pointerdown", handlePointerDown, true);
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/50"
      role="presentation"
    >
      <aside
        ref={drawerRef}
        aria-modal="true"
        className="flex h-screen w-full flex-col overflow-hidden bg-white shadow-2xl sm:max-w-xl"
        role="dialog"
      >
        <header className="border-b border-gray-200 bg-gray-950 px-4 py-4 text-white sm:px-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-wide text-red-300">Calendario</p>
              <h2 className="mt-1 text-xl font-black sm:text-2xl">{title}</h2>
              {subtitle ? <p className="mt-1 text-sm leading-5 text-gray-300">{subtitle}</p> : null}
            </div>

            <button
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10 text-white transition hover:bg-white/20"
              type="button"
              onClick={onClose}
            >
              <FaTimes />
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto bg-gray-50 p-4 sm:p-5">{children}</div>
      </aside>
    </div>
  );
}

export function LegendItem({ className, dotClassName, label }) {
  return (
    <div
      className={`flex items-center justify-center gap-2 rounded-full border px-2 py-2 text-center text-xs font-black ${className}`}
    >
      <span
        className={`h-2 w-2 shrink-0 rounded-full ${dotClassName}`}
        aria-hidden="true"
      />
      {label}
    </div>
  );
}

export function EmptyState({ text }) {
  return (
    <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-4 text-sm font-semibold text-gray-500 sm:p-5">
      {text}
    </div>
  );
}
