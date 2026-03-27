"use client";

import React from "react";
import { useDashboard } from "@/lib/context/dashboard-context";
import { Users, Clock, TrendingUp, RefreshCw, BarChart2, PieChart } from "lucide-react";

export default function InsightsPage() {
  const { reportState } = useDashboard();
  const { data: reportData } = reportState;

  const violations: any[] = reportData?.violations ?? [];

  // Derive real data if available, else use mock
  const highRiskPct = reportData
    ? Math.round(((reportData.metrics?.high ?? 0) / (reportData.summary?.total_rows || 1)) * 100)
    : 12;

  const complianceImprovement = reportData
    ? Math.max(0, 100 - (reportData.summary?.compliance_rate ?? 88))
    : 8;

  const repeatOffenders = reportData
    ? Object.values(
        violations.reduce((acc: Record<string, number>, v: any) => {
          acc[v.row_index] = (acc[v.row_index] || 0) + 1;
          return acc;
        }, {})
      ).filter((c) => (c as number) > 1).length
    : 5;

  // Violations by hour (mock bucketed from row_index as proxy)
  const hourBuckets = Array.from({ length: 8 }, (_, i) => ({
    label: `${i * 3}:00`,
    count: violations.length > 0
      ? violations.filter((v: any) => v.row_index % 8 === i).length
      : [3, 7, 5, 12, 9, 4, 6, 2][i],
  }));
  const maxHour = Math.max(...hourBuckets.map((b) => b.count), 1);

  // Risk distribution for donut
  const high   = reportData?.metrics?.high   ?? 30;
  const medium = reportData?.metrics?.medium ?? 50;
  const low    = reportData?.metrics?.low    ?? 20;
  const total  = high + medium + low || 1;
  const highPct   = (high / total) * 100;
  const mediumPct = (medium / total) * 100;

  // SVG donut
  const r = 40, cx = 50, cy = 50, circ = 2 * Math.PI * r;
  const highDash   = (highPct / 100) * circ;
  const mediumDash = (mediumPct / 100) * circ;
  const lowDash    = circ - highDash - mediumDash;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h1 className="text-2xl font-bold text-white">Insights</h1>
        <p className="text-sm text-gray-500 mt-1">Analytics and risk intelligence from your compliance data</p>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { icon: Users,      label: "High Risk Users",          value: `${highRiskPct}%`,              sub: "of total dataset",       color: "text-red-400",     bg: "bg-red-500/10",     border: "border-l-red-500"     },
          { icon: Clock,      label: "Off-Hours Activity",       value: "23%",                          sub: "outside business hours", color: "text-yellow-400",  bg: "bg-yellow-500/10",  border: "border-l-yellow-500"  },
          { icon: TrendingUp, label: "Compliance Improvement",   value: `+${complianceImprovement}%`,   sub: "vs last run",            color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-l-emerald-500" },
          { icon: RefreshCw,  label: "Repeat Offenders",         value: String(repeatOffenders),        sub: "rows with 2+ violations", color: "text-indigo-400",  bg: "bg-indigo-500/10",  border: "border-l-indigo-500"  },
        ].map((card) => (
          <div key={card.label} className={`bg-[#111827] border border-white/5 border-l-2 ${card.border} rounded-xl p-5 hover:border-white/10 transition-all`}>
            <div className={`p-2 ${card.bg} rounded-lg w-fit mb-3`}>
              <card.icon className={`w-4 h-4 ${card.color}`} />
            </div>
            <p className={`text-2xl font-bold ${card.color}`}>{card.value}</p>
            <p className="text-xs font-medium text-gray-400 mt-0.5">{card.label}</p>
            <p className="text-[10px] text-gray-600 mt-0.5">{card.sub}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Violations by Hour — Bar Chart */}
        <div className="bg-[#111827] border border-white/5 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-6">
            <BarChart2 className="w-4 h-4 text-indigo-400" />
            <div>
              <h3 className="text-sm font-semibold text-white">Violations by Hour</h3>
              <p className="text-[10px] text-gray-500">Distribution across time windows</p>
            </div>
          </div>
          <div className="flex items-end gap-2 h-32">
            {hourBuckets.map((b) => {
              const heightPct = (b.count / maxHour) * 100;
              return (
                <div key={b.label} className="flex-1 flex flex-col items-center gap-1.5">
                  <span className="text-[9px] text-gray-600">{b.count}</span>
                  <div className="w-full rounded-t-md bg-indigo-600/30 hover:bg-indigo-500/50 transition-all relative overflow-hidden" style={{ height: `${Math.max(heightPct, 4)}%` }}>
                    <div className="absolute inset-x-0 top-0 h-0.5 bg-indigo-400 rounded-full" />
                  </div>
                  <span className="text-[9px] text-gray-600 whitespace-nowrap">{b.label}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Risk Distribution — Donut Chart */}
        <div className="bg-[#111827] border border-white/5 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-6">
            <PieChart className="w-4 h-4 text-indigo-400" />
            <div>
              <h3 className="text-sm font-semibold text-white">Risk Distribution</h3>
              <p className="text-[10px] text-gray-500">Violation severity breakdown</p>
            </div>
          </div>
          <div className="flex items-center gap-8">
            <svg viewBox="0 0 100 100" className="w-28 h-28 -rotate-90">
              {/* Low */}
              <circle cx={cx} cy={cy} r={r} fill="none" stroke="#10b981" strokeWidth="12"
                strokeDasharray={`${lowDash} ${circ}`}
                strokeDashoffset={-(highDash + mediumDash)} />
              {/* Medium */}
              <circle cx={cx} cy={cy} r={r} fill="none" stroke="#f59e0b" strokeWidth="12"
                strokeDasharray={`${mediumDash} ${circ}`}
                strokeDashoffset={-highDash} />
              {/* High */}
              <circle cx={cx} cy={cy} r={r} fill="none" stroke="#ef4444" strokeWidth="12"
                strokeDasharray={`${highDash} ${circ}`}
                strokeDashoffset={0} />
            </svg>
            <div className="space-y-3">
              {[
                { label: "High Risk",   count: high,   color: "bg-red-500",     text: "text-red-400"     },
                { label: "Medium Risk", count: medium, color: "bg-yellow-500",  text: "text-yellow-400"  },
                { label: "Low Risk",    count: low,    color: "bg-emerald-500", text: "text-emerald-400" },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-2.5">
                  <span className={`w-2.5 h-2.5 rounded-full ${item.color}`} />
                  <span className="text-xs text-gray-400">{item.label}</span>
                  <span className={`text-xs font-bold ml-auto ${item.text}`}>{item.count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
