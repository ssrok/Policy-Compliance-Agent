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
  Cell
} from "recharts";

export interface ViolationsBarChartProps {
  data: any[];
  activePolicyId?: string;
  viewMode?: "absolute" | "percentage";
  baselineColor?: string;
  scenarioColor?: string;
  activeScenarioColor?: string;
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

export default function ViolationsBarChart({
  data,
  activePolicyId,
  viewMode = "absolute",
  baselineColor = "#94a3b8", // slate-400
  scenarioColor = "#818cf8", // indigo-400
  activeScenarioColor = "#4f46e5" // indigo-600
}: ViolationsBarChartProps) {
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
        <Bar dataKey="baseline" name="Baseline" fill={baselineColor} radius={[4, 4, 0, 0]} />
        <Bar dataKey="scenario" name="Projected Violations" radius={[4, 4, 0, 0]}>
          {data.map((entry, index) => (
            <Cell 
              key={`cell-${index}`} 
              fill={entry.policy_id === activePolicyId ? activeScenarioColor : scenarioColor} 
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
