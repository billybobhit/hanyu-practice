"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import type { SessionSummary } from "@/lib/types";

interface ProgressChartProps {
  summaries: SessionSummary[];
}

function formatDate(ts: number) {
  return new Date(ts).toLocaleDateString("zh-CN", { month: "short", day: "numeric" });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-ink-700 border border-ink-500 rounded-xl px-4 py-3 text-sm shadow-xl">
      <p className="text-cream-300 mb-2 text-xs">{label}</p>
      {payload.map((entry: { name: string; value: number; color: string }, i: number) => (
        <p key={i} style={{ color: entry.color }} className="text-xs">
          {entry.name}: <strong>{entry.value}</strong>
        </p>
      ))}
    </div>
  );
}

export default function ProgressChart({ summaries }: ProgressChartProps) {
  if (summaries.length < 2) {
    return (
      <div className="flex items-center justify-center h-40 text-cream-500 text-sm">
        完成更多练习以查看进度趋势
      </div>
    );
  }

  const data = [...summaries]
    .reverse()
    .map((s) => ({
      date: formatDate(s.startTime),
      总分: s.overallScore,
      grade: s.overallGrade,
    }));

  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1E2A40" />
        <XAxis
          dataKey="date"
          tick={{ fill: "#806858", fontSize: 11 }}
          axisLine={{ stroke: "#1E2A40" }}
          tickLine={false}
        />
        <YAxis
          domain={[0, 100]}
          tick={{ fill: "#806858", fontSize: 11 }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend
          wrapperStyle={{ fontSize: 11, color: "#A09080" }}
        />
        <Line
          type="monotone"
          dataKey="总分"
          stroke="#BA8820"
          strokeWidth={2}
          dot={{ fill: "#BA8820", r: 4, strokeWidth: 0 }}
          activeDot={{ r: 6, fill: "#EEC050" }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
