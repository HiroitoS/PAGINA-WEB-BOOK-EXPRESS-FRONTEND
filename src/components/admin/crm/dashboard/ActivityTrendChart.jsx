import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

function parseLocalDate(value) {
  if (!value) {
    return null;
  }

  const date = new Date(value + "T00:00:00");

  return Number.isNaN(date.getTime()) ? null : date;
}

function formatWeekday(value) {
  const date = parseLocalDate(value);

  if (!date) {
    return "—";
  }

  return new Intl.DateTimeFormat("es-PE", {
    weekday: "short",
  })
    .format(date)
    .replace(".", "");
}

function formatDate(value) {
  const date = parseLocalDate(value);

  if (!date) {
    return "—";
  }

  return new Intl.DateTimeFormat("es-PE", {
    day: "2-digit",
    month: "short",
  }).format(date);
}

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) {
    return null;
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white px-3 py-2 shadow-lg">
      <p className="text-xs font-black text-gray-950">
        {formatDate(label)}
      </p>
      <p className="mt-1 text-xs text-gray-600">
        {payload[0].value} actividad(es)
      </p>
    </div>
  );
}

export default function ActivityTrendChart({ trend }) {
  const rows = Array.isArray(trend) ? trend : [];

  return (
    <div className="mt-5 h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={rows}
          margin={{
            top: 12,
            right: 8,
            left: -18,
            bottom: 0,
          }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            vertical={false}
            stroke="#e5e7eb"
          />
          <XAxis
            dataKey="date"
            tickFormatter={formatWeekday}
            tickLine={false}
            axisLine={false}
            tick={{
              fill: "#6b7280",
              fontSize: 12,
              fontWeight: 700,
            }}
          />
          <YAxis
            allowDecimals={false}
            tickLine={false}
            axisLine={false}
            tick={{
              fill: "#9ca3af",
              fontSize: 11,
            }}
          />
          <Tooltip
            content={<ChartTooltip />}
            cursor={{ fill: "#f3f4f6" }}
          />
          <Bar
            dataKey="total"
            fill="#111827"
            radius={[8, 8, 0, 0]}
            maxBarSize={52}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
