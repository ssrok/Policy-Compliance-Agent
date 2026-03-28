import React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

export interface ViolationsStackedChartProps {
  data: any[];
  viewMode?: "absolute" | "percentage";
  newViolationColor?: string;
  resolvedViolationColor?: string;
}

const CustomTooltip = ({ active, payload, label, viewMode }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-white p-3 border border-slate-200 shadow-xl rounded-xl z-50">
        <p className="font-bold text-slate-800 mb-2 border-b border-slate-100 pb-2">{label}</p>
        <div className="space-y-1.5">
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm font-bold flex justify-between gap-4" style={{ color: entry.color }}>
              <span>{entry.name}:</span> 
              <span>{entry.value}{viewMode === "percentage" ? "%" : ""}</span>
            </p>
          ))}
        </div>
        {data.topRules && data.topRules.length > 0 && (
          <div className="mt-3 pt-2 border-t border-slate-100">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">Top Rules Triggered</p>
            <ul className="text-xs space-y-1 font-medium text-slate-600">
              {data.topRules.map((rule: string, i: number) => (
                <li key={i}>• {rule}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  }
  return null;
};

export default function ViolationsStackedChart({
  data,
  viewMode = "absolute",
  newViolationColor = "#ef4444", // red-500
  resolvedViolationColor = "#10b981", // emerald-500
}: ViolationsStackedChartProps) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart
        data={data}
        margin={{
          top: 20,
          right: 30,
          left: 0,
          bottom: 5,
        }}
      >
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
        <XAxis 
          dataKey="policy_id" 
          tick={{ fill: "#64748b", fontSize: 12, fontWeight: 600 }}
          axisLine={false}
          tickLine={false}
          dy={10}
        />
        <YAxis 
          tick={{ fill: "#64748b", fontSize: 12 }}
          axisLine={false}
          tickLine={false}
          dx={-10}
          tickFormatter={(value) => viewMode === "percentage" ? `${value}%` : value}
        />
        <Tooltip 
          cursor={{ fill: "#f1f5f9" }}
          content={<CustomTooltip viewMode={viewMode} />}
          isAnimationActive={false}
        />
        <Legend iconType="circle" wrapperStyle={{ paddingTop: "20px", fontSize: "12px", color: "#64748b", fontWeight: 500 }} />
        <Bar dataKey="new_violations" name="New Violations" stackId="a" fill={newViolationColor} radius={[0, 0, 4, 4]} />
        <Bar dataKey="resolved_violations" name="Resolved Violations" stackId="a" fill={resolvedViolationColor} radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
