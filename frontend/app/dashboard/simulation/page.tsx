"use client";

import React, { useState, useEffect } from "react";
import { FlaskConical, ChevronRight, Loader2, TrendingUp, TrendingDown, Minus, AlertCircle, Zap } from "lucide-react";

const BASE_URL = "http://localhost:8000/api/v1";

interface SimResult {
  original_rules: string[];
  new_rule: string;
  before: { violations: number; compliance_rate: number; total_rows: number };
  after:  { violations: number; compliance_rate: number; total_rows: number };
  delta:  {
    violation_change: number;
    percent_change: number;
    newly_flagged_rows: number;
    newly_cleared_rows: number;
    direction: "stricter" | "relaxed" | "no_change";
  };
  severity_breakdown: { high: number; medium: number; low: number };
}

export default function SimulationPage() {
  const [ruleInput, setRuleInput]   = useState("");
  const [stats, setStats]           = useState<any>(null);
  const [loading, setLoading]       = useState(false);
  const [result, setResult]         = useState<SimResult | null>(null);
  const [error, setError]           = useState<string | null>(null);

  useEffect(() => {
    fetch(`${BASE_URL}/simulation/stats`)
      .then(r => r.json())
      .then(setStats)
      .catch(() => {});
  }, []);

  const runSimulation = async () => {
    const rule = ruleInput.trim();
    if (!rule) { setError("Please enter a rule to simulate."); return; }
    setLoading(true);
    setResult(null);
    setError(null);
    try {
      const res = await fetch(`${BASE_URL}/simulation/freeform`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: "demo_session", rule }),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.detail || `Server error ${res.status}`);
      }
      setResult(await res.json());
    } catch (e: any) {
      setError(e.message || "Simulation failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") runSimulation();
  };

  const DeltaIcon = result
    ? result.delta.direction === "stricter" ? TrendingUp
    : result.delta.direction === "relaxed"  ? TrendingDown
    : Minus : Minus;

  const deltaColor = result
    ? result.delta.direction === "stricter" ? "text-red-400"
    : result.delta.direction === "relaxed"  ? "text-emerald-400"
    : "text-gray-400" : "text-gray-400";

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
          <span>Dashboard</span>
          <ChevronRight className="w-3 h-3" />
          <span className="text-indigo-400">Policy Simulation</span>
        </div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Policy Time Machine</h1>
        <p className="text-sm text-gray-500 mt-1">Enter any compliance rule and instantly see its impact on the dataset</p>
      </div>

      {/* Stats bar */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Total Transactions", value: stats.total_rows },
            { label: "Avg Amount",         value: `Rs.${Number(stats.avg_amount).toLocaleString("en-IN", { maximumFractionDigits: 0 })}` },
            { label: "High KYC Risk",      value: `${stats.high_risk_percent}%` },
            { label: "International",      value: `${stats.international_percent}%` },
          ].map(s => (
            <div key={s.label} className="bg-[#111827] border border-white/5 rounded-xl px-4 py-3">
              <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-1">{s.label}</p>
              <p className="text-lg font-bold text-white">{s.value}</p>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left — Input */}
        <div className="space-y-4">
          <div className="bg-[#111827] border border-white/5 rounded-2xl p-6">
            <h2 className="text-sm font-bold text-white mb-1 flex items-center gap-2">
              <FlaskConical className="w-4 h-4 text-indigo-400" />
              Enter Your Rule
            </h2>
            <p className="text-xs text-gray-500 mb-5">
              Use format: <code className="text-indigo-400 bg-indigo-500/10 px-1.5 py-0.5 rounded">field operator value</code>
              &nbsp;— e.g. <code className="text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">transaction_amount &gt; 500000</code>
            </p>

            <div className="space-y-3">
              <input
                type="text"
                value={ruleInput}
                onChange={e => { setRuleInput(e.target.value); setResult(null); setError(null); }}
                onKeyDown={handleKeyDown}
                placeholder="e.g. transaction_amount > 500000"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 transition-all font-mono"
              />

              <button
                onClick={runSimulation}
                disabled={loading || !ruleInput.trim()}
                className="w-full flex items-center justify-center gap-2 px-5 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-30 disabled:cursor-not-allowed text-white text-sm font-bold rounded-xl transition-all hover:scale-[1.01] active:scale-95"
              >
                {loading
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Running Simulation...</>
                  : <><Zap className="w-4 h-4 text-yellow-300 fill-yellow-300/20" /> Run Simulation</>
                }
              </button>
            </div>



            {error && (
              <div className="mt-4 flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                <p className="text-xs text-red-400">{error}</p>
              </div>
            )}
          </div>
        </div>

        {/* Right — Results */}
        <div className="space-y-4">
          {!result && !loading && (
            <div className="bg-[#111827] border border-white/5 rounded-2xl p-12 flex flex-col items-center justify-center text-center h-full min-h-[300px]">
              <FlaskConical className="w-10 h-10 text-gray-700 mb-3" />
              <p className="text-sm text-gray-500 font-medium">Enter a rule and click Run Simulation</p>
              <p className="text-xs text-gray-600 mt-1">Results will appear here</p>
            </div>
          )}

          {loading && (
            <div className="bg-[#111827] border border-white/5 rounded-2xl p-12 flex flex-col items-center justify-center min-h-[300px]">
              <Loader2 className="w-8 h-8 text-indigo-400 animate-spin mb-3" />
              <p className="text-sm text-gray-400">Running compliance simulation...</p>
            </div>
          )}

          {result && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
              {/* Rule applied */}
              <div className="bg-[#111827] border border-white/5 rounded-2xl p-5">
                <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-2">Rule Simulated</p>
                <code className="px-3 py-2 bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-sm font-mono rounded-lg block">
                  {result.new_rule}
                </code>
              </div>

              {/* Before / After */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-[#111827] border border-white/5 rounded-2xl p-5">
                  <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-3">Without Rule</p>
                  <p className="text-3xl font-bold text-white">{result.before.violations}</p>
                  <p className="text-xs text-gray-500 mt-1">violations</p>
                  <p className="text-sm font-bold text-emerald-400 mt-2">{result.before.compliance_rate}% compliant</p>
                </div>
                <div className="bg-[#111827] border border-white/5 rounded-2xl p-5">
                  <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-3">With Rule</p>
                  <p className={`text-3xl font-bold ${result.delta.direction === "stricter" ? "text-red-400" : "text-emerald-400"}`}>
                    {result.after.violations}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">violations</p>
                  <p className="text-sm font-bold text-emerald-400 mt-2">{result.after.compliance_rate}% compliant</p>
                </div>
              </div>

              {/* Delta */}
              <div className="bg-[#111827] border border-white/5 rounded-2xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-[10px] text-gray-500 uppercase tracking-widest">Impact Summary</p>
                  <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-bold ${
                    result.delta.direction === "stricter" ? "bg-red-500/10 border-red-500/20 text-red-400" :
                    result.delta.direction === "relaxed"  ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" :
                    "bg-gray-500/10 border-gray-500/20 text-gray-400"
                  }`}>
                    <DeltaIcon className="w-3 h-3" />
                    {result.delta.direction === "stricter" ? "More Restrictive" : result.delta.direction === "relaxed" ? "More Lenient" : "No Change"}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: "Violation Change",   value: `${result.delta.violation_change > 0 ? "+" : ""}${result.delta.violation_change}`, color: deltaColor },
                    { label: "% Change",           value: `${result.delta.percent_change > 0 ? "+" : ""}${result.delta.percent_change}%`,    color: deltaColor },
                    { label: "Newly Flagged",      value: result.delta.newly_flagged_rows,  color: "text-red-400"     },
                    { label: "Newly Cleared",      value: result.delta.newly_cleared_rows,  color: "text-emerald-400" },
                  ].map(item => (
                    <div key={item.label} className="bg-white/[0.02] border border-white/5 rounded-xl p-3">
                      <p className="text-[10px] text-gray-600 uppercase tracking-widest mb-1">{item.label}</p>
                      <p className={`text-xl font-bold ${item.color}`}>{item.value}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Severity */}
              <div className="bg-[#111827] border border-white/5 rounded-2xl p-5">
                <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-4">Severity Breakdown (With Rule)</p>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: "High",   value: result.severity_breakdown.high,   color: "text-red-400",     bg: "bg-red-500/10 border-red-500/20"        },
                    { label: "Medium", value: result.severity_breakdown.medium, color: "text-yellow-400",  bg: "bg-yellow-500/10 border-yellow-500/20"  },
                    { label: "Low",    value: result.severity_breakdown.low,    color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20" },
                  ].map(s => (
                    <div key={s.label} className={`border rounded-xl p-3 text-center ${s.bg}`}>
                      <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                      <p className="text-[10px] text-gray-500 uppercase tracking-widest mt-1">{s.label}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
