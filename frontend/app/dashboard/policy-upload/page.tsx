"use client";

import React, { useState } from "react";
import { useDashboard } from "@/lib/context/dashboard-context";
import { FileText, Upload, ChevronRight, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import Link from "next/link";

export default function PolicyUploadPage() {
  const { policyState, handlePolicyChange, handleExtractPolicy } = useDashboard();
  const { file: policyFile, clauses, loading: loadingPolicy, error: policyError } = policyState;
  const [showAllClauses, setShowAllClauses] = useState(false);
  const visibleClauses = showAllClauses ? clauses : clauses.slice(0, 10);

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

      {/* Clauses */}
      {clauses.length > 0 && (
        <div className="bg-[#111827] border border-white/5 rounded-xl overflow-hidden animate-in fade-in duration-500">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
            <div>
              <h2 className="text-sm font-semibold text-white">Extracted Clauses</h2>
              <p className="text-xs text-gray-500 mt-0.5">Showing {visibleClauses.length} of {clauses.length} rules</p>
            </div>
            <div className="flex items-center gap-2 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
              <span className="text-[10px] font-semibold text-emerald-400">{clauses.length} extracted</span>
            </div>
          </div>

          {/* Clause list */}
          <div className="overflow-y-auto max-h-[400px] p-4 space-y-2">
            {visibleClauses.map((c, i) => (
              <div key={i} className="flex items-start gap-3 p-4 bg-white/[0.03] hover:bg-white/[0.06] border border-white/5 rounded-lg transition-all group">
                <span className="shrink-0 w-6 h-6 flex items-center justify-center rounded-md bg-indigo-600/20 text-indigo-400 text-[10px] font-bold group-hover:bg-indigo-600 group-hover:text-white transition-all">
                  {i + 1}
                </span>
                <p className="text-xs text-gray-400 leading-relaxed group-hover:text-gray-200 transition-colors">"{c}"</p>
              </div>
            ))}
          </div>

          {/* Footer */}
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
      )}
    </div>
  );
}
