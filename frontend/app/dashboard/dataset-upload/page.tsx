"use client";

import React from "react";
import { useDashboard } from "@/lib/context/dashboard-context";
import { FileSpreadsheet, Upload, CheckCircle2, AlertCircle, Database, ChevronRight, Loader2 } from "lucide-react";
import Link from "next/link";

export default function DatasetUploadPage() {
  const { datasetState, handleDatasetChange } = useDashboard();
  const { file: datasetFile, columns: datasetColumns, rows: datasetRows, msg: datasetMsg, loading, error } = datasetState;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
          <span>Dashboard</span>
          <ChevronRight className="w-3 h-3" />
          <span className="text-cyan-400">Dataset Validation</span>
        </div>
        <h1 className="text-2xl font-bold text-white">Dataset Validation</h1>
        <p className="text-sm text-gray-500 mt-1">Step 02 — Ingest enterprise dataset for compliance analysis</p>
      </div>

      {/* Top Action Bar */}
      <div className="flex flex-wrap items-center gap-3">
        <label className="cursor-pointer">
          <span className="flex items-center gap-2 px-4 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold rounded-lg transition-all hover:scale-[1.02] active:scale-95">
            <Upload className="w-3.5 h-3.5" />
            {datasetFile ? "Change Dataset" : "Upload Dataset"}
          </span>
          <input type="file" accept=".csv" className="hidden" onChange={handleDatasetChange} />
        </label>

        <Link
          href="/dashboard/schema-mapping"
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-lg transition-all
            ${datasetColumns.length > 0
              ? "bg-white/10 hover:bg-white/15 text-white hover:scale-[1.02] active:scale-95"
              : "bg-white/5 text-gray-600 cursor-not-allowed pointer-events-none"}`}
        >
          Run Compliance Check <ChevronRight className="w-3.5 h-3.5" />
        </Link>

        {datasetFile && (
          <div className="flex items-center gap-2 px-3 py-2 bg-cyan-500/10 border border-cyan-500/20 rounded-lg ml-auto">
            <Database className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-xs text-cyan-300 font-medium truncate max-w-[180px]">{datasetFile.name}</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
          </div>
        )}
      </div>

      {/* Status messages */}
      {loading && (
        <div className="flex items-center gap-3 p-4 bg-cyan-500/10 border border-cyan-500/20 rounded-xl">
          <Loader2 className="w-4 h-4 text-cyan-400 animate-spin" />
          <span className="text-xs text-cyan-400 font-medium">Uploading dataset...</span>
        </div>
      )}
      {datasetMsg && !loading && (
        <div className="flex items-center gap-2 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          <span className="text-xs text-emerald-400 font-medium">{datasetMsg}</span>
        </div>
      )}
      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
          <AlertCircle className="w-3.5 h-3.5 text-red-400" />
          <span className="text-xs text-red-400">{error}</span>
        </div>
      )}

      {/* Empty state */}
      {!datasetFile && !loading && (
        <div className="bg-[#111827] border border-white/5 rounded-xl p-16 text-center">
          <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center mx-auto mb-4">
            <FileSpreadsheet className="w-7 h-7 text-gray-600" />
          </div>
          <p className="text-sm font-medium text-gray-400">No dataset uploaded</p>
          <p className="text-xs text-gray-600 mt-1">Supports CSV, XLSX, and SQL exports</p>
        </div>
      )}

      {/* Dataset Preview Table */}
      {datasetColumns.length > 0 && (
        <div className="bg-[#111827] border border-white/5 rounded-xl overflow-hidden animate-in fade-in duration-500">
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
            <div>
              <h2 className="text-sm font-semibold text-white">Dataset Preview</h2>
              <p className="text-xs text-gray-500 mt-0.5">{datasetColumns.length} columns · {datasetRows.length} rows</p>
            </div>
            <div className="flex items-center gap-2 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
              <span className="text-[10px] font-semibold text-emerald-400">Validation Passed</span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-white/[0.03] border-b border-white/5">
                <tr>
                  {datasetColumns.map((col) => (
                    <th key={col} className="px-4 py-3 text-[10px] font-semibold uppercase tracking-widest text-gray-500 whitespace-nowrap">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.03]">
                {datasetRows.slice(0, 8).map((row, i) => (
                  <tr key={i} className="hover:bg-white/[0.03] transition-colors">
                    {datasetColumns.map((col) => (
                      <td key={col} className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">
                        {String(row[col] ?? "—")}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between px-6 py-4 border-t border-white/5">
            <div className="flex items-center gap-4">
              <div>
                <p className="text-[10px] text-gray-600 uppercase tracking-widest">Sample Count</p>
                <p className="text-sm font-bold text-white">{datasetRows.length} Records</p>
              </div>
              <div>
                <p className="text-[10px] text-gray-600 uppercase tracking-widest">File Size</p>
                <p className="text-sm font-bold text-white">~{((datasetFile?.size || 0) / 1024).toFixed(1)} KB</p>
              </div>
            </div>
            <Link
              href="/dashboard/schema-mapping"
              className="flex items-center gap-2 px-5 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold rounded-lg transition-all hover:scale-[1.02] active:scale-95"
            >
              Continue to Mapping <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
