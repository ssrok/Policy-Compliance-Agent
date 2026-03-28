"use client";

import React from "react";
import Link from "next/link";
import { useDashboard } from "@/lib/context/dashboard-context";
import {
  ShieldCheck, ArrowRight, Database, FileText,
  AlertCircle, BarChart2, TrendingUp, TrendingDown, Activity
} from "lucide-react";

export default function OverviewPage() {
  const { policyState, datasetState, mappingState, reportState } = useDashboard();
  const { file: policyFile } = policyState;
  const { file: datasetFile } = datasetState;
  const { mappings } = mappingState;
  const { data: reportData } = reportState;

  const complianceRate = reportData?.summary?.compliance_rate ?? null;
  const violations     = reportData?.summary?.violations ?? null;
  const totalRows      = reportData?.summary?.total_rows ?? null;

  const riskLevel = complianceRate === null ? "—"
    : complianceRate >= 80 ? "Low"
    : complianceRate >= 60 ? "Medium"
    : "High";

  const riskColor = complianceRate === null ? "text-gray-400"
    : complianceRate >= 80 ? "text-emerald-400"
    : complianceRate >= 60 ? "text-yellow-400"
    : "text-red-400";

  // Mock trend data for chart (replace with real data when available)
  const trendPoints = reportData
    ? [65, 70, 68, 75, 72, 80, complianceRate ?? 80]
    : [40, 55, 50, 60, 58, 65, 70];

  const maxTrend = Math.max(...trendPoints);
  const chartH = 80;
  const pts = trendPoints.map((v, i) => {
    const x = (i / (trendPoints.length - 1)) * 280;
    const y = chartH - (v / maxTrend) * chartH;
    return `${x},${y}`;
  }).join(" ");

  const topRules = reportData?.violations
    ? Object.entries(
        reportData.violations.reduce((acc: Record<string, number>, v: any) => {
          acc[v.rule] = (acc[v.rule] || 0) + 1;
          return acc;
        }, {})
      ).sort((a, b) => b[1] - a[1]).slice(0, 4)
    : [];

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Compliance Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">Monitor your enterprise data policy compliance pipeline</p>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <MetricCard
          icon={ShieldCheck}
          label="Compliance Score"
          value={complianceRate !== null ? `${complianceRate}%` : "—"}
          sub={complianceRate !== null ? (complianceRate >= 80 ? "Healthy" : "Needs Attention") : "Run report to see"}
          borderColor="border-l-emerald-500"
          iconColor="text-emerald-400"
          iconBg="bg-emerald-500/10"
          trend={complianceRate !== null ? (complianceRate >= 80 ? "up" : "down") : null}
        />
        <MetricCard
          icon={AlertCircle}
          label="Total Violations"
          value={violations !== null ? String(violations) : "—"}
          sub={totalRows !== null ? `of ${totalRows} rows` : "Run report to see"}
          borderColor="border-l-red-500"
          iconColor="text-red-400"
          iconBg="bg-red-500/10"
          trend={violations !== null ? (violations === 0 ? "up" : "down") : null}
        />
        <MetricCard
          icon={Activity}
          label="Risk Level"
          value={riskLevel}
          sub={complianceRate !== null ? `${complianceRate}% compliance rate` : "Run report to see"}
          borderColor={`border-l-${complianceRate === null ? "gray" : complianceRate >= 80 ? "emerald" : complianceRate >= 60 ? "yellow" : "red"}-500`}
          iconColor={riskColor}
          iconBg="bg-white/5"
          trend={null}
        />
      </div>

      {/* Pipeline Status */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Policy",   done: !!policyFile,          href: "/dashboard/policy-upload",     color: "indigo" },
          { label: "Dataset",  done: !!datasetFile,         href: "/dashboard/dataset-upload",    color: "cyan"   },
          { label: "Mapping",  done: mappings.length > 0,   href: "/dashboard/schema-mapping",    color: "violet" },
          { label: "Report",   done: !!reportData,          href: "/dashboard/compliance-report", color: "emerald"},
        ].map((step, i) => (
          <Link key={step.label} href={step.href}>
            <div className={`bg-[#111827] border rounded-xl p-4 hover:border-white/20 transition-all cursor-pointer
              ${step.done ? "border-white/10" : "border-white/5"}`}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-semibold uppercase tracking-widest text-gray-500">Step {i + 1}</span>
                <span className={`w-2 h-2 rounded-full ${step.done ? "bg-emerald-400" : "bg-gray-700"}`} />
              </div>
              <p className="text-sm font-semibold text-white">{step.label}</p>
              <p className="text-xs text-gray-500 mt-0.5">{step.done ? "Complete" : "Pending"}</p>
            </div>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Trend Chart */}
        <div className="bg-[#111827] border border-white/5 rounded-xl p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-sm font-semibold text-white">Compliance Score Trend</h3>
              <p className="text-xs text-gray-500 mt-0.5">Last 7 checkpoints</p>
            </div>
            <BarChart2 className="w-4 h-4 text-gray-600" />
          </div>
          <div className="relative">
            <svg viewBox="0 0 280 80" className="w-full h-20" preserveAspectRatio="none">
              <defs>
                <linearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#6366f1" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
                </linearGradient>
              </defs>
              <polyline points={pts} fill="none" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <polygon points={`0,${chartH} ${pts} 280,${chartH}`} fill="url(#trendGrad)" />
            </svg>
            <div className="flex justify-between mt-2">
              {trendPoints.map((v, i) => (
                <span key={i} className="text-[9px] text-gray-600">{v}%</span>
              ))}
            </div>
          </div>
        </div>

        {/* Top Violated Rules */}
        <div className="bg-[#111827] border border-white/5 rounded-xl p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-sm font-semibold text-white">Top Violated Rules</h3>
              <p className="text-xs text-gray-500 mt-0.5">Most frequent violations</p>
            </div>
            <AlertCircle className="w-4 h-4 text-gray-600" />
          </div>
          {topRules.length > 0 ? (
            <div className="space-y-3">
              {topRules.map(([rule, count], i) => (
                <div key={i} className="flex items-center justify-between">
                  <span className="text-xs text-gray-400 truncate max-w-[200px]">{rule}</span>
                  <span className="text-[10px] font-semibold px-2 py-0.5 bg-red-500/10 text-red-400 rounded-full border border-red-500/20">
                    {count} hits
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-20 text-center">
              <p className="text-xs text-gray-600">No violations data yet</p>
              <Link href="/dashboard/policy-upload" className="mt-2 text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1">
                Start pipeline <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* CTA if not started */}
      {!policyFile && (
        <div className="bg-gradient-to-r from-indigo-600/20 to-violet-600/20 border border-indigo-500/20 rounded-xl p-6 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-white">Ready to get started?</h3>
            <p className="text-xs text-gray-400 mt-1">Upload a policy PDF to begin the compliance pipeline</p>
          </div>
          <Link
            href="/dashboard/policy-upload"
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg transition-all"
          >
            Begin Pipeline <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      )}
    </div>
  );
}

function MetricCard({ icon: Icon, label, value, sub, borderColor, iconColor, iconBg, trend }: {
  icon: any; label: string; value: string; sub: string;
  borderColor: string; iconColor: string; iconBg: string; trend: "up" | "down" | null;
}) {
  return (
    <div className={`bg-[#111827] border border-white/5 border-l-2 ${borderColor} rounded-xl p-5 hover:border-white/10 transition-all`}>
      <div className="flex items-start justify-between">
        <div className={`p-2 rounded-lg ${iconBg}`}>
          <Icon className={`w-4 h-4 ${iconColor}`} />
        </div>
        {trend === "up" && <TrendingUp className="w-4 h-4 text-emerald-400" />}
        {trend === "down" && <TrendingDown className="w-4 h-4 text-red-400" />}
      </div>
      <p className="text-2xl font-bold text-white mt-3">{value}</p>
      <p className="text-xs font-medium text-gray-500 mt-0.5">{label}</p>
      <p className="text-[10px] text-gray-600 mt-1">{sub}</p>
    </div>
  );
}
