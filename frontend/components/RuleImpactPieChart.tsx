import React from "react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend
} from "recharts";

export interface RuleImpactData {
  rule: string;
  impact_percent: number;
}

export interface RuleImpactPieChartProps {
  data: RuleImpactData[];
  colors?: string[];
}

const DEFAULT_COLORS = ["#6366f1", "#8b5cf6", "#ec4899", "#f43f5e", "#f59e0b", "#10b981", "#0ea5e9"];

export default function RuleImpactPieChart({
  data,
  colors = DEFAULT_COLORS,
}: RuleImpactPieChartProps) {
  
  // Sort to assure top rules are first
  const sortedData = [...data].sort((a, b) => b.impact_percent - a.impact_percent);

  if (sortedData.length === 0) {
    return (
      <div className="flex h-full w-full items-center justify-center text-slate-400 text-sm font-medium">
        No rule impact data available.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          data={sortedData}
          cx="50%"
          cy="50%"
          innerRadius={60}
          outerRadius={90}
          paddingAngle={5}
          dataKey="impact_percent"
          nameKey="rule"
          stroke="none"
        >
          {sortedData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
          ))}
        </Pie>
        <Tooltip 
          formatter={(value: any) => [`${value}%`, "Impact"]}
          contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', fontWeight: 500 }}
        />
        <Legend 
          layout="vertical" 
          verticalAlign="middle" 
          align="right"
          wrapperStyle={{ fontSize: "12px", color: "#475569", fontWeight: 600 }}
          iconType="circle"
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
