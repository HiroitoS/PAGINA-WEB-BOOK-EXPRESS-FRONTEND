import {
  Area,
  AreaChart,
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
    year: "numeric",
  }).format(date);
}

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) {
    return null;
  }

  return (
    <div className="rounded-2xl border border-gray-200 bg-white px-4 py-3 shadow-xl">
      <p className="text-xs font-black uppercase tracking-wide text-red-700">
        {formatDate(label)}
      </p>
      <p className="mt-1 text-sm font-black text-gray-950">
        {payload[0].value} actividad(es)
      </p>
      <p className="mt-1 text-xs text-gray-500">
        Gestión comercial registrada
      </p>
    </div>
  );
}

export default function ActivityTrendChart({ trend }) {
  const rows = Array.isArray(trend) ? trend : [];

  return (
    <div className="mt-5 h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={rows}
          margin={{
            top: 12,
            right: 8,
            left: -18,
            bottom: 0,
          }}
        >
          <defs>
            <linearGradient
              id="crmActivityArea"
              x1="0"
              y1="0"
              x2="0"
              y2="1"
            >
              <stop
                offset="5%"
                stopColor="#b91c1c"
                stopOpacity={0.28}
              />
              <stop
                offset="95%"
                stopColor="#b91c1c"
                stopOpacity={0.02}
              />
            </linearGradient>
          </defs>

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
            cursor={{
              stroke: "#d1d5db",
              strokeDasharray: "4 4",
            }}
          />

          <Area
            type="monotone"
            dataKey="total"
            stroke="#111827"
            strokeWidth={3}
            fill="url(#crmActivityArea)"
            activeDot={{
              r: 6,
              fill: "#b91c1c",
              stroke: "#ffffff",
              strokeWidth: 3,
            }}
            dot={{
              r: 4,
              fill: "#111827",
              stroke: "#ffffff",
              strokeWidth: 2,
            }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
