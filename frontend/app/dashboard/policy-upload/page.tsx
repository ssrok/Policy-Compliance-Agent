"use client";

import React, { useState } from "react";
import { useDashboard } from "@/lib/context/dashboard-context";
import { FileText, Upload, ChevronRight, CheckCircle2, AlertCircle, Loader2, GitMerge, Bell, RefreshCw } from "lucide-react";
import Link from "next/link";

export default function PolicyUploadPage() {
  const { policyState, handlePolicyChange, handleExtractPolicy, handleMergeNotifications } = useDashboard();
  const { file: policyFile, clauses, loading: loadingPolicy, error: policyError } = policyState;
  const [showAllClauses, setShowAllClauses] = useState(false);
  const [mergeResult, setMergeResult] = useState<{ original_count: number; new_from_notifications: number; total: number; message: string } | null>(null);
  const [merging, setMerging] = useState(false);

  const visibleClauses = showAllClauses ? clauses : clauses.slice(0, 10);

  const onMerge = async () => {
    setMerging(true);
    setMergeResult(null);
    const result = await handleMergeNotifications();
    if (result) setMergeResult(result);
    setMerging(false);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
          <span>Dashboard</span>
          <ChevronRight className="w-3 h-3" />
          <span className="text-indigo-400">Policy Analysis</span>
        </div>
        <h1 className="text-2xl font-bold text-white">Policy Analysis</h1>
        <p className="text-sm text-gray-500 mt-1">Step 01 — Extract compliance rules from PDF documents</p>
      </div>

      {/* Upload Card */}
      <div className="bg-[#111827] border border-white/5 rounded-xl p-8">
        <div className="flex flex-col items-center text-center space-y-6 max-w-md mx-auto">
          <div className={`p-5 rounded-2xl transition-all duration-300 ${policyFile ? "bg-indigo-600/20 border border-indigo-500/30" : "bg-white/5 border border-white/10"}`}>
            <Upload className={`w-10 h-10 ${policyFile ? "text-indigo-400" : "text-gray-600"}`} />
          </div>

          <div>
            <h2 className="text-base font-semibold text-white">Select Policy Document</h2>
            <p className="text-xs text-gray-500 mt-1">Upload a PDF containing your enterprise data policies</p>
          </div>

          <label className="cursor-pointer w-full max-w-xs">
            <span className="block bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-3 rounded-lg text-sm font-semibold transition-all hover:scale-[1.02] active:scale-95 text-center">
              {policyFile ? "Change PDF File" : "Select PDF File"}
            </span>
            <input type="file" accept=".pdf" className="hidden" onChange={handlePolicyChange} />
          </label>

          {policyFile && (
            <div className="flex items-center gap-2 px-4 py-2 bg-indigo-500/10 border border-indigo-500/20 rounded-lg animate-in fade-in duration-300">
              <FileText className="w-3.5 h-3.5 text-indigo-400" />
              <span className="text-xs font-medium text-indigo-300 truncate max-w-[200px]">{policyFile.name}</span>
              <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
            </div>
          )}

          <button
            onClick={handleExtractPolicy}
            disabled={!policyFile || loadingPolicy}
            className="w-full max-w-xs flex items-center justify-center gap-2 bg-white hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed text-black px-6 py-3 rounded-lg text-sm font-semibold transition-all hover:scale-[1.02] active:scale-95"
          >
            {loadingPolicy ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Analyzing Document...</>
            ) : (
              <><ChevronRight className="w-4 h-4" /> Extract Clauses</>
            )}
          </button>

          {policyError && (
            <div className="flex items-center gap-2 px-4 py-2 bg-red-500/10 border border-red-500/20 rounded-lg">
              <AlertCircle className="w-3.5 h-3.5 text-red-400" />
              <span className="text-xs text-red-400">{policyError}</span>
            </div>
          )}
        </div>
      </div>

      {/* Empty state */}
      {!loadingPolicy && clauses.length === 0 && policyFile && (
        <div className="bg-[#111827] border border-white/5 rounded-xl p-10 text-center">
          <FileText className="w-10 h-10 mx-auto text-gray-700 mb-3" />
          <p className="text-xs text-gray-500">Policy loaded. Click Extract Clauses to proceed.</p>
        </div>
      )}

      {/* Clauses + Merge Section */}
      {clauses.length > 0 && (
        <div className="space-y-4 animate-in fade-in duration-500">

          {/* Merge Regulatory Updates Banner */}
          <div className="bg-gradient-to-r from-amber-600/10 to-orange-600/10 border border-amber-500/20 rounded-xl p-5">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-amber-500/10 rounded-lg shrink-0">
                  <Bell className="w-4 h-4 text-amber-400" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white">Merge Regulatory Updates</h3>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Incorporate latest RBI / SEBI notifications into your policy clauses, then re-run the full compliance pipeline with the updated ruleset.
                  </p>
                  {mergeResult && (
                    <div className="flex flex-wrap gap-3 mt-2">
                      <span className="text-[10px] px-2 py-0.5 bg-white/5 border border-white/10 rounded-full text-gray-400">
                        Original: <span className="text-white font-semibold">{mergeResult.original_count}</span> clauses
                      </span>
                      <span className="text-[10px] px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-emerald-400">
                        + {mergeResult.new_from_notifications} new from notifications
                      </span>
                      <span className="text-[10px] px-2 py-0.5 bg-indigo-500/10 border border-indigo-500/20 rounded-full text-indigo-400">
                        Total: {mergeResult.total} clauses
                      </span>
                    </div>
                  )}
                </div>
              </div>
              <button
                onClick={onMerge}
                disabled={merging || loadingPolicy}
                className="shrink-0 flex items-center gap-2 px-4 py-2.5 bg-amber-600 hover:bg-amber-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-semibold rounded-lg transition-all hover:scale-[1.02] active:scale-95"
              >
                {merging ? (
                  <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Merging...</>
                ) : mergeResult ? (
                  <><RefreshCw className="w-3.5 h-3.5" /> Re-merge</>
                ) : (
                  <><GitMerge className="w-3.5 h-3.5" /> Merge & Update</>
                )}
              </button>
            </div>

            {mergeResult && (
              <div className="mt-3 pt-3 border-t border-amber-500/10">
                <p className="text-xs text-amber-300/70">{mergeResult.message}</p>
                <p className="text-xs text-gray-500 mt-1">
                  Schema mapping and compliance report have been reset. Continue below to re-run the full pipeline with the merged policy.
                </p>
              </div>
            )}
          </div>

          {/* Clauses List */}
          <div className="bg-[#111827] border border-white/5 rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
              <div>
                <h2 className="text-sm font-semibold text-white">
                  {mergeResult ? "Merged Policy Clauses" : "Extracted Clauses"}
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">Showing {visibleClauses.length} of {clauses.length} rules</p>
              </div>
              <div className="flex items-center gap-2">
                {mergeResult && (
                  <span className="flex items-center gap-1 px-2.5 py-1 bg-amber-500/10 border border-amber-500/20 rounded-full">
                    <GitMerge className="w-3 h-3 text-amber-400" />
                    <span className="text-[10px] font-semibold text-amber-400">Merged</span>
                  </span>
                )}
                <div className="flex items-center gap-2 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
                  <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                  <span className="text-[10px] font-semibold text-emerald-400">{clauses.length} clauses</span>
                </div>
              </div>
            </div>

            <div className="overflow-y-auto max-h-[400px] p-4 space-y-2">
              {visibleClauses.map((c, i) => (
                <div
                  key={i}
                  className={`flex items-start gap-3 p-4 border rounded-lg transition-all group
                    ${mergeResult && i >= mergeResult.original_count
                      ? "bg-amber-500/5 border-amber-500/20 hover:bg-amber-500/10"
                      : "bg-white/[0.03] hover:bg-white/[0.06] border-white/5"
                    }`}
                >
                  <span className={`shrink-0 w-6 h-6 flex items-center justify-center rounded-md text-[10px] font-bold transition-all
                    ${mergeResult && i >= mergeResult.original_count
                      ? "bg-amber-500/20 text-amber-400 group-hover:bg-amber-500 group-hover:text-white"
                      : "bg-indigo-600/20 text-indigo-400 group-hover:bg-indigo-600 group-hover:text-white"
                    }`}>
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-400 leading-relaxed group-hover:text-gray-200 transition-colors">"{c}"</p>
                    {mergeResult && i >= mergeResult.original_count && (
                      <span className="inline-flex items-center gap-1 mt-1.5 text-[9px] font-semibold text-amber-400 uppercase tracking-wider">
                        <Bell className="w-2.5 h-2.5" /> From regulatory update
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-6 py-4 border-t border-white/5">
              <div className="flex items-center gap-3">
                <span className="text-[10px] text-gray-500">Showing {visibleClauses.length} of {clauses.length} clauses</span>
                {clauses.length > 10 && (
                  <button
                    onClick={() => setShowAllClauses(prev => !prev)}
                    className="text-[10px] font-semibold text-indigo-400 hover:text-indigo-300 px-3 py-1.5 border border-indigo-500/20 hover:border-indigo-500/40 rounded-lg transition-all"
                  >
                    {showAllClauses ? "Show Less" : "View All Clauses"}
                  </button>
                )}
              </div>
              <Link
                href="/dashboard/dataset-upload"
                className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg transition-all hover:scale-[1.02] active:scale-95"
              >
                Continue to Dataset <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
