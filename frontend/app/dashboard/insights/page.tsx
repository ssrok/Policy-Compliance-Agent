"use client";

import React from "react";
import { useDashboard } from "@/lib/context/dashboard-context";
import { useRouter } from "next/navigation";
import {
  BarChart2, PieChart, ShieldCheck, AlertCircle,
  TrendingUp, RefreshCw, Zap, ChevronRight, ArrowRight
} from "lucide-react";

export default function InsightsPage() {
  const { reportState } = useDashboard();
  const { data: reportData } = reportState;
  const router = useRouter();

  // ── No data state ──────────────────────────────────────────────────────────
  if (!reportData) {
    return (
      <div className="space-y-6 animate-in fade-in duration-500">
        <div>
          <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
            <span>Dashboard</span>
            <ChevronRight className="w-3 h-3" />
            <span className="text-indigo-400">Insights</span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Compliance Insights</h1>
          <p className="text-sm text-gray-500 mt-1">Real-time analytics derived from your compliance audit</p>
        </div>
        <div className="bg-[#111827] border border-white/5 rounded-2xl p-16 flex flex-col items-center justify-center text-center">
          <BarChart2 className="w-10 h-10 text-gray-700 mb-4" />
          <p className="text-sm font-medium text-gray-400">No compliance data yet</p>
          <p className="text-xs text-gray-600 mt-1 mb-6">Run a compliance audit first to see real insights</p>
          <button
            onClick={() => router.push("/dashboard/compliance-report")}
            className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl transition-all"
          >
            Go to Compliance Report <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    );
  }

  // ── Derived metrics ────────────────────────────────────────────────────────
  const violations   = reportData.violations ?? [];
  const riskData     = (reportData as any).risk_data ?? [];
  const explanations = (reportData as any).explanations ?? [];
  const summary      = reportData.summary;
  const metrics      = reportData.metrics;
  const riskSummary  = (reportData as any).risk_summary ?? {};

  const totalRows      = summary.total_rows || 1;
  const totalViolations = summary.violations || 0;
  const complianceRate  = summary.compliance_rate ?? 0;

  // Repeat offenders — rows with 2+ violations
  const rowViolationCount = violations.reduce((acc: Record<number, number>, v: any) => {
    acc[v.row_index] = (acc[v.row_index] || 0) + 1;
    return acc;
  }, {});
  const repeatOffenders = Object.values(rowViolationCount).filter((c: any) => c > 1).length;

  // Anomaly stats from risk_data
  const anomalyCount   = riskData.filter((r: any) => r.is_anomaly === 1).length;
  const avgRiskScore   = riskSummary.average_risk_score ?? 0;
  const highRiskCount  = riskSummary.high_risk_count ?? metrics.high;
  const mediumRiskCount = riskSummary.medium_risk_count ?? metrics.medium;
  const lowRiskCount   = riskSummary.low_risk_count ?? metrics.low;

  // Top violated rules — count per rule
  const ruleViolationCount = violations.reduce((acc: Record<string, number>, v: any) => {
    const rule = v.rule || "Unknown";
    acc[rule] = (acc[rule] || 0) + 1;
    return acc;
  }, {});
  const topRules = Object.entries(ruleViolationCount)
    .sort((a, b) => (b[1] as number) - (a[1] as number))
    .slice(0, 5);
  const maxRuleCount = topRules[0]?.[1] as number || 1;

  // Severity distribution
  const high   = metrics.high   || 0;
  const medium = metrics.medium || 0;
  const low    = metrics.low    || 0;
  const totalSev = high + medium + low || 1;

  // SVG donut
  const r = 40, cx = 50, cy = 50, circ = 2 * Math.PI * r;
  const highPct   = (high / totalSev) * 100;
  const mediumPct = (medium / totalSev) * 100;
  const highDash   = (highPct / 100) * circ;
  const mediumDash = (mediumPct / 100) * circ;
  const lowDash    = circ - highDash - mediumDash;

  // Risk score distribution buckets (0-20, 20-40, 40-60, 60-80, 80-100)
  const riskBuckets = [
    { label: "0-20",  count: riskData.filter((r: any) => r.risk_score < 20).length,                          color: "bg-emerald-500" },
    { label: "20-40", count: riskData.filter((r: any) => r.risk_score >= 20 && r.risk_score < 40).length,    color: "bg-emerald-400" },
    { label: "40-60", count: riskData.filter((r: any) => r.risk_score >= 40 && r.risk_score < 60).length,    color: "bg-yellow-400"  },
    { label: "60-80", count: riskData.filter((r: any) => r.risk_score >= 60 && r.risk_score < 80).length,    color: "bg-orange-400"  },
    { label: "80-100",count: riskData.filter((r: any) => r.risk_score >= 80).length,                         color: "bg-red-500"     },
  ];
  const maxBucket = Math.max(...riskBuckets.map(b => b.count), 1);

  // Top 5 highest risk rows
  const topRiskRows = [...riskData]
    .sort((a: any, b: any) => b.risk_score - a.risk_score)
    .slice(0, 5);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
          <span>Dashboard</span>
          <ChevronRight className="w-3 h-3" />
          <span className="text-indigo-400">Insights</span>
        </div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Compliance Insights</h1>
        <p className="text-sm text-gray-500 mt-1">Real-time analytics derived from your compliance audit — {totalRows} rows analyzed</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            icon: AlertCircle,
            label: "Total Violations",
            value: totalViolations,
            sub: `${((totalViolations / totalRows) * 100).toFixed(1)}% of dataset`,
            color: "text-red-400", bg: "bg-red-500/10", border: "border-l-red-500",
          },
          {
            icon: ShieldCheck,
            label: "Compliance Rate",
            value: `${complianceRate}%`,
            sub: `${totalRows - totalViolations} rows passed`,
            color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-l-emerald-500",
          },
          {
            icon: Zap,
            label: "Avg Risk Score",
            value: avgRiskScore.toFixed(1),
            sub: `${highRiskCount} high risk rows`,
            color: "text-indigo-400", bg: "bg-indigo-500/10", border: "border-l-indigo-500",
          },
          {
            icon: RefreshCw,
            label: "Repeat Offenders",
            value: repeatOffenders,
            sub: "rows with 2+ violations",
            color: "text-yellow-400", bg: "bg-yellow-500/10", border: "border-l-yellow-500",
          },
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
        {/* Risk Score Distribution */}
        <div className="bg-[#111827] border border-white/5 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-6">
            <BarChart2 className="w-4 h-4 text-indigo-400" />
            <div>
              <h3 className="text-sm font-semibold text-white">Risk Score Distribution</h3>
              <p className="text-[10px] text-gray-500">How risk scores are spread across {riskData.length} rows</p>
            </div>
          </div>
          <div className="flex items-end gap-2 h-36">
            {riskBuckets.map((b) => {
              const heightPct = (b.count / maxBucket) * 100;
              return (
                <div key={b.label} className="flex-1 flex flex-col items-center gap-1.5">
                  <span className="text-[9px] text-gray-500 font-bold">{b.count}</span>
                  <div
                    className={`w-full rounded-t-md ${b.color} opacity-70 hover:opacity-100 transition-all`}
                    style={{ height: `${Math.max(heightPct, 3)}%` }}
                  />
                  <span className="text-[9px] text-gray-600 whitespace-nowrap">{b.label}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Severity Donut */}
        <div className="bg-[#111827] border border-white/5 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-6">
            <PieChart className="w-4 h-4 text-indigo-400" />
            <div>
              <h3 className="text-sm font-semibold text-white">Severity Breakdown</h3>
              <p className="text-[10px] text-gray-500">Violation severity from explainability engine</p>
            </div>
          </div>
          <div className="flex items-center gap-8">
            <svg viewBox="0 0 100 100" className="w-28 h-28 -rotate-90 shrink-0">
              <circle cx={cx} cy={cy} r={r} fill="none" stroke="#10b981" strokeWidth="12"
                strokeDasharray={`${lowDash} ${circ}`}
                strokeDashoffset={-(highDash + mediumDash)} />
              <circle cx={cx} cy={cy} r={r} fill="none" stroke="#f59e0b" strokeWidth="12"
                strokeDasharray={`${mediumDash} ${circ}`}
                strokeDashoffset={-highDash} />
              <circle cx={cx} cy={cy} r={r} fill="none" stroke="#ef4444" strokeWidth="12"
                strokeDasharray={`${highDash} ${circ}`}
                strokeDashoffset={0} />
            </svg>
            <div className="space-y-3 flex-1">
              {[
                { label: "High",   count: high,   pct: ((high / totalSev) * 100).toFixed(1),   dot: "bg-red-500",     text: "text-red-400"     },
                { label: "Medium", count: medium, pct: ((medium / totalSev) * 100).toFixed(1), dot: "bg-yellow-500",  text: "text-yellow-400"  },
                { label: "Low",    count: low,    pct: ((low / totalSev) * 100).toFixed(1),    dot: "bg-emerald-500", text: "text-emerald-400" },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-2.5">
                  <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${item.dot}`} />
                  <span className="text-xs text-gray-400 flex-1">{item.label}</span>
                  <span className={`text-xs font-bold ${item.text}`}>{item.count}</span>
                  <span className="text-[10px] text-gray-600 w-10 text-right">{item.pct}%</span>
                </div>
              ))}
              <div className="pt-2 border-t border-white/5">
                <div className="flex items-center gap-2.5">
                  <Zap className="w-2.5 h-2.5 text-indigo-400 shrink-0" />
                  <span className="text-xs text-gray-400 flex-1">Anomalies</span>
                  <span className="text-xs font-bold text-indigo-400">{anomalyCount}</span>
                  <span className="text-[10px] text-gray-600 w-10 text-right">
                    {riskData.length > 0 ? ((anomalyCount / riskData.length) * 100).toFixed(1) : 0}%
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Top Violated Rules */}
        <div className="bg-[#111827] border border-white/5 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-6">
            <ShieldCheck className="w-4 h-4 text-red-400" />
            <div>
              <h3 className="text-sm font-semibold text-white">Most Violated Rules</h3>
              <p className="text-[10px] text-gray-500">Rules triggering the most violations</p>
            </div>
          </div>
          {topRules.length === 0 ? (
            <p className="text-xs text-gray-600 italic">No violations found</p>
          ) : (
            <div className="space-y-3">
              {topRules.map(([rule, count], i) => {
                const pct = ((count as number) / (maxRuleCount as number)) * 100;
                return (
                  <div key={i} className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <code className="text-[10px] text-indigo-300 font-mono truncate max-w-[70%]">{rule}</code>
                      <span className="text-xs font-bold text-white shrink-0">{count as number}</span>
                    </div>
                    <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-indigo-500 rounded-full transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Top 5 Highest Risk Rows */}
        <div className="bg-[#111827] border border-white/5 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-6">
            <TrendingUp className="w-4 h-4 text-red-400" />
            <div>
              <h3 className="text-sm font-semibold text-white">Highest Risk Rows</h3>
              <p className="text-[10px] text-gray-500">Top 5 rows by combined risk score</p>
            </div>
          </div>
          {topRiskRows.length === 0 ? (
            <p className="text-xs text-gray-600 italic">No risk data available</p>
          ) : (
            <div className="space-y-2">
              {topRiskRows.map((row: any, i: number) => {
                const explanation = explanations.find((e: any) => e.row_index === row.row_index);
                return (
                  <div key={i} className="flex items-start gap-3 p-3 bg-white/[0.02] border border-white/5 rounded-xl hover:border-white/10 transition-all">
                    <div className={`shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${
                      row.risk_level === "HIGH"   ? "bg-red-500/20 text-red-400" :
                      row.risk_level === "MEDIUM" ? "bg-yellow-500/20 text-yellow-400" :
                                                    "bg-emerald-500/20 text-emerald-400"
                    }`}>
                      #{row.row_index}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className={`text-xs font-bold ${
                          row.risk_level === "HIGH" ? "text-red-400" : row.risk_level === "MEDIUM" ? "text-yellow-400" : "text-emerald-400"
                        }`}>
                          Score: {row.risk_score.toFixed(1)}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${
                            row.risk_level === "HIGH"   ? "bg-red-500/10 text-red-400 border-red-500/20" :
                            row.risk_level === "MEDIUM" ? "bg-yellow-500/10 text-yellow-400 border-yellow-500/20" :
                                                          "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                          }`}>{row.risk_level}</span>
                          {row.is_anomaly === 1 && (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded border bg-indigo-500/10 text-indigo-400 border-indigo-500/20">ANOMALY</span>
                          )}
                        </div>
                      </div>
                      {explanation && (
                        <p className="text-[10px] text-gray-500 leading-relaxed truncate">{explanation.explanation}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Risk Summary Footer */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "High Risk Rows",   value: highRiskCount,   color: "text-red-400",     bg: "bg-red-500/10 border-red-500/20"        },
          { label: "Medium Risk Rows", value: mediumRiskCount, color: "text-yellow-400",  bg: "bg-yellow-500/10 border-yellow-500/20"  },
          { label: "Low Risk Rows",    value: lowRiskCount,    color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20" },
        ].map(s => (
          <div key={s.label} className={`border rounded-xl p-4 text-center ${s.bg}`}>
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-[10px] text-gray-500 uppercase tracking-widest mt-1">{s.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
