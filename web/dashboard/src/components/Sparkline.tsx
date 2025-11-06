import { useId, useMemo } from "react";
import { Area, AreaChart, ResponsiveContainer } from "recharts";

interface SparklineProps<TItem> {
  data: TItem[];
  valueAccessor: (item: TItem) => number;
  color?: string;
}

const Sparkline = <TItem,>({ data, valueAccessor, color = "#a855f7" }: SparklineProps<TItem>) => {
  const gradientId = useId();
  const chartData = useMemo(() => data.map((item, index) => ({ index, value: valueAccessor(item) })), [data, valueAccessor]);

  return (
    <ResponsiveContainer width="100%" height={64}>
      <AreaChart data={chartData} margin={{ top: 0, bottom: 0, left: 0, right: 0 }}>
        <defs>
          <linearGradient id={`spark-${gradientId}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={color} stopOpacity={0.8} />
            <stop offset="95%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area type="monotone" dataKey="value" stroke={color} fill={`url(#spark-${gradientId})`} strokeWidth={2} />
      </AreaChart>
    </ResponsiveContainer>
  );
};

export default Sparkline;
