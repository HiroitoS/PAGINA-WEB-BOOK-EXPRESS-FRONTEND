import { motion } from "motion/react";

const TONES = {
  default: {
    card: "border-gray-200 bg-white",
    icon: "bg-gray-950 text-white",
    value: "text-gray-950",
  },
  red: {
    card: "border-red-100 bg-red-50",
    icon: "bg-red-700 text-white",
    value: "text-red-800",
  },
  warning: {
    card: "border-amber-200 bg-amber-50",
    icon: "bg-amber-100 text-amber-800",
    value: "text-amber-900",
  },
};

export default function DashboardMetricCard({
  icon: Icon,
  label,
  value,
  description,
  tone = "default",
}) {
  const currentTone = TONES[tone] || TONES.default;

  return (
    <motion.article
      variants={{
        hidden: { opacity: 0, y: 8 },
        visible: { opacity: 1, y: 0 },
      }}
      className={
        "rounded-3xl border p-4 shadow-sm sm:p-5 "
        + currentTone.card
      }
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-black uppercase tracking-wide text-gray-500">
            {label}
          </p>
          <p
            className={
              "mt-2 text-3xl font-black "
              + currentTone.value
            }
          >
            {value}
          </p>
        </div>

        <div
          className={
            "flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl "
            + currentTone.icon
          }
        >
          <Icon />
        </div>
      </div>

      <p className="mt-3 text-xs leading-5 text-gray-600">
        {description}
      </p>
    </motion.article>
  );
}
