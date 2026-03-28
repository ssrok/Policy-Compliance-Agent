"use client";

import React from "react";
import { useDashboard } from "@/lib/context/dashboard-context";
import { Layers, Database, Search, Loader2, ChevronRight, CheckCircle2, AlertCircle, Zap } from "lucide-react";
import Link from "next/link";

export default function SchemaMappingPage() {
  const { ruleFields, datasetState, mappingState, handleRunMapping } = useDashboard();
  const { columns: datasetColumns } = datasetState;
  const { mappings, loading: loadingMapping, error: mappingError } = mappingState;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
          <span>Dashboard</span>
          <ChevronRight className="w-3 h-3" />
          <span className="text-violet-400">Schema Mapping</span>
        </div>
        <h1 className="text-2xl font-bold text-white">Schema Mapping</h1>
        <p className="text-sm text-gray-500 mt-1">Step 03 — Automatic field alignment using NLP transformer logic</p>
      </div>

      {/* Fields overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-[#111827] border border-white/5 rounded-xl p-6 hover:border-white/10 transition-all">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-indigo-500/10 rounded-lg">
              <Layers className="w-4 h-4 text-indigo-400" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">Rule Fields</h3>
              <p className="text-[10px] text-gray-500">Found in policy clauses</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {ruleFields.length > 0 ? ruleFields.map(f => (
              <span key={f} className="px-2.5 py-1 bg-indigo-500/10 text-indigo-300 text-[10px] font-semibold uppercase tracking-wider rounded-md border border-indigo-500/20 hover:bg-indigo-500/20 transition-all">
                {f}
              </span>
            )) : (
              <p className="text-xs text-gray-600 italic">No rule fields extracted yet</p>
            )}
          </div>
        </div>

        <div className="bg-[#111827] border border-white/5 rounded-xl p-6 hover:border-white/10 transition-all">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-cyan-500/10 rounded-lg">
              <Database className="w-4 h-4 text-cyan-400" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">Dataset Columns</h3>
              <p className="text-[10px] text-gray-500">Parsed from CSV header</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {datasetColumns.length > 0 ? datasetColumns.map(c => (
              <span key={c} className="px-2.5 py-1 bg-cyan-500/10 text-cyan-300 text-[10px] font-semibold uppercase tracking-wider rounded-md border border-cyan-500/20 hover:bg-cyan-500/20 transition-all">
                {c}
              </span>
            )) : (
              <div className="flex items-center gap-2 text-gray-600">
                <Search className="w-3.5 h-3.5" />
                <span className="text-xs italic">Dataset required for mapping...</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Action */}
      <div className="flex flex-col items-center gap-4">
        <button
          onClick={handleRunMapping}
          disabled={loadingMapping || datasetColumns.length === 0}
          className="flex items-center gap-3 px-8 py-4 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-30 disabled:cursor-not-allowed text-white font-semibold text-sm rounded-xl transition-all hover:scale-[1.02] active:scale-95 shadow-lg shadow-indigo-600/20"
        >
          <Zap className={`w-4 h-4 text-yellow-300 ${loadingMapping ? "animate-pulse" : ""}`} />
          {loadingMapping ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Running Alignment Inference...</>
          ) : "Auto-Map Fields"}
        </button>

        {mappingError && (
          <div className="flex items-center gap-2 px-4 py-2.5 bg-red-500/10 border border-red-500/20 rounded-lg">
            <AlertCircle className="w-3.5 h-3.5 text-red-400" />
            <span className="text-xs text-red-400">{mappingError}</span>
          </div>
        )}

        {mappings.length === 0 && !loadingMapping && (
          <div className="text-center py-8">
            <Layers className="w-10 h-10 mx-auto text-gray-700 mb-3" />
            <p className="text-xs text-gray-500">Ready for alignment inference. Execute Auto-Map to proceed.</p>
          </div>
        )}
      </div>

      {/* Mapping Results */}
      {mappings.length > 0 && (
        <div className="bg-[#111827] border border-white/5 rounded-xl overflow-hidden animate-in fade-in duration-500">
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
            <div>
              <h2 className="text-sm font-semibold text-white">Mapping Inference</h2>
              <p className="text-xs text-gray-500 mt-0.5">{mappings.length} fields aligned</p>
            </div>
            <div className="flex items-center gap-2 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
              <span className="text-[10px] font-semibold text-emerald-400">Logic Aligned</span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-white/[0.03] border-b border-white/5">
                <tr>
                  <th className="px-6 py-3 text-[10px] font-semibold uppercase tracking-widest text-gray-500">Rule Field Target</th>
                  <th className="px-6 py-3 text-[10px] font-semibold uppercase tracking-widest text-gray-500">Dataset Candidate</th>
                  <th className="px-6 py-3 text-[10px] font-semibold uppercase tracking-widest text-gray-500">Confidence</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.03]">
                {mappings.map((m, i) => (
                  <tr key={i} className="hover:bg-white/[0.03] transition-colors">
                    <td className="px-6 py-4 text-xs font-semibold text-indigo-300">{m.rule_field}</td>
                    <td className="px-6 py-4 text-xs text-gray-400 font-mono">{m.mapped_column}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-md text-[10px] font-semibold border
                        ${m.confidence > 0.8
                          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                          : "bg-yellow-500/10 text-yellow-400 border-yellow-500/20"}`}>
                        {(m.confidence * 100).toFixed(0)}% match
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex justify-end px-6 py-4 border-t border-white/5">
            <Link
              href="/dashboard/compliance-report"
              className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg transition-all hover:scale-[1.02] active:scale-95"
            >
              Generate Report <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
