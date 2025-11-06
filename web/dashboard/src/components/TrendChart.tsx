import { useMemo } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { TelemetryRecord } from "../types";
import { formatPercent, formatRate, formatShortTime } from "../utils/format";

interface TrendChartProps {
  data: TelemetryRecord[];
}

const TrendChart = ({ data }: TrendChartProps) => {
  const chartData = useMemo(
    () =>
      data.map((item) => ({
        time: formatShortTime(item.collectedAt),
        cpu: Number(item.cpuUsage.toFixed(2)),
        tx: Number(item.networkTxRate.toFixed(2)),
        rx: Number(item.networkRxRate.toFixed(2))
      })),
    [data]
  );

  return (
    <ResponsiveContainer width="100%" height={320}>
      <AreaChart data={chartData} margin={{ top: 16, right: 24, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="cpuGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#a855f7" stopOpacity={0.9} />
            <stop offset="95%" stopColor="#581c87" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="txGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.9} />
            <stop offset="95%" stopColor="#0f172a" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="rxGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#14b8a6" stopOpacity={0.9} />
            <stop offset="95%" stopColor="#0f172a" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.16)" vertical={false} />
        <XAxis dataKey="time" stroke="rgba(226,232,240,0.4)" tickLine={false} minTickGap={32} />
        <YAxis
          yAxisId="cpu"
          orientation="left"
          stroke="rgba(226,232,240,0.4)"
          tickFormatter={(value: number) => formatPercent(value)}
          tickLine={false}
        />
        <YAxis
          yAxisId="network"
          orientation="right"
          stroke="rgba(226,232,240,0.4)"
          tickFormatter={(value: number) => formatRate(value)}
          tickLine={false}
        />
        <Tooltip
          contentStyle={{ background: "rgba(15,23,42,0.95)", borderRadius: 16, border: "1px solid rgba(148,163,184,0.18)" }}
          labelStyle={{ color: "rgba(226,232,240,0.9)" }}
          formatter={(value: number, name: string) => {
            if (name === "cpu") {
              return [formatPercent(Number(value)), "CPU Utilisation"];
            }
            if (name === "tx") {
              return [formatRate(Number(value)), "Network TX"];
            }
            return [formatRate(Number(value)), "Network RX"];
          }}
        />
        <Area type="monotone" dataKey="cpu" stroke="#a855f7" fill="url(#cpuGradient)" yAxisId="cpu" strokeWidth={2.4} />
        <Area type="monotone" dataKey="tx" stroke="#38bdf8" fill="url(#txGradient)" yAxisId="network" strokeWidth={2.1} />
        <Area type="monotone" dataKey="rx" stroke="#14b8a6" fill="url(#rxGradient)" yAxisId="network" strokeWidth={2.1} />
      </AreaChart>
    </ResponsiveContainer>
  );
};

export default TrendChart;
