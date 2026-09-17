import { motion } from "motion/react";
import { FaSyncAlt } from "react-icons/fa";

export default function WorkspaceHeader({
  actions,
  description,
  isRefreshing = false,
  onRefresh,
  title,
}) {
  return (
    <motion.section
      animate={{ opacity: 1, y: 0 }}
      className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm"
      initial={{ opacity: 0, y: 12 }}
      transition={{ duration: 0.25 }}
    >
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm font-bold uppercase tracking-wide text-red-700">ToDo</p>
          <h1 className="mt-2 text-3xl font-black text-gray-950">{title}</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-600">{description}</p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-bold text-gray-700 transition hover:border-red-200 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isRefreshing}
            type="button"
            onClick={onRefresh}
          >
            <FaSyncAlt className={isRefreshing ? "animate-spin" : ""} />
            Actualizar
          </button>

          {actions}
        </div>
      </div>
    </motion.section>
  );
}