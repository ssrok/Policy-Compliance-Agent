"use client";

import React from "react";
import { useDashboard } from "@/lib/context/dashboard-context";
import {
  ShieldCheck, Loader2, Database, AlertCircle,
  TrendingUp, TrendingDown, BarChart2, CheckCircle2, Zap, ChevronRight, Download
} from "lucide-react";

const ViolationCard = React.memo(({ v, getSeverityStyle }: { v: any; getSeverityStyle: (s: string) => string }) => (
  <div className="bg-[#0B0F19] border border-white/5 rounded-xl p-5 hover:border-white/10 transition-all">
    <div className="flex items-center justify-between mb-4">
      <span className="text-xs font-mono text-gray-500">Transaction #{v.row_index}</span>
      <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border ${getSeverityStyle(v.severity)}`}>
        {v.severity} violation
      </span>
    </div>
    <div className="grid grid-cols-2 gap-3">
      <div className="bg-white/[0.03] rounded-lg p-3">
        <p className="text-[10px] text-gray-600 uppercase tracking-widest mb-1">Policy Clause</p>
        <p className="text-xs text-gray-300 leading-relaxed">{v.rule}</p>
      </div>
      <div className="bg-white/[0.03] rounded-lg p-3">
        <p className="text-[10px] text-gray-600 uppercase tracking-widest mb-1">Extracted Rule</p>
        <p className="text-xs text-indigo-300 font-mono">{v.column}</p>
      </div>
      <div className="bg-white/[0.03] rounded-lg p-3">
        <p className="text-[10px] text-gray-600 uppercase tracking-widest mb-1">Dataset Value</p>
        <p className="text-xs text-yellow-300 font-mono">{v.value ?? "null"}</p>
      </div>
      <div className="bg-white/[0.03] rounded-lg p-3">
        <p className="text-[10px] text-gray-600 uppercase tracking-widest mb-1">AI Reasoning</p>
        <p className="text-xs text-gray-400 leading-relaxed italic">"{v.explanation}"</p>
      </div>
    </div>
  </div>
));
ViolationCard.displayName = "ViolationCard";

export default function ComplianceReportPage() {
  const { datasetState, mappingState, reportState, handleGenerateReport } = useDashboard();
  const { mappings } = mappingState;
  const { data: reportData, loading: loadingReport, error: reportError } = reportState;

  const getSeverityStyle = React.useCallback((sev: string) => {
    switch (sev.toLowerCase()) {
      case "high":   return "bg-red-500/10 text-red-400 border-red-500/20";
      case "medium": return "bg-yellow-500/10 text-yellow-400 border-yellow-500/20";
      case "low":    return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
      default:       return "bg-gray-500/10 text-gray-400 border-gray-500/20";
    }
  }, []);

  const handleDownloadJSON = () => {
    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `compliance_report_${Date.now()}.json`;
    a.click();
  };

  const handleDownloadPDF = async () => {
    try {
      const jsPDF = (await import("jspdf")).default;
      const autoTable = (await import("jspdf-autotable")).default;
      const doc = new jsPDF();
      const timestamp = new Date().toLocaleString();

      doc.setFontSize(20);
      doc.setFont("helvetica", "bold");
      doc.text("AI Data Policy Compliance Report", 14, 22);

      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(100);
      doc.text(`Generated on: ${timestamp}`, 14, 30);
      doc.text(`Dataset: ${datasetState.fileName || "Active Session"}`, 14, 35);

      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(0);
      doc.text("Compliance Summary", 14, 50);

      autoTable(doc, {
        startY: 55,
        head: [["Metric", "Value"]],
        body: [
          ["Total Rows Processed", reportData.summary.total_rows.toString()],
          ["Total Violations Found", reportData.summary.violations.toString()],
          ["Overall Compliance Rate", `${reportData.summary.compliance_rate}%`],
        ],
        theme: "grid",
        headStyles: { fillColor: [0, 0, 0], textColor: [255, 255, 255], fontStyle: "bold" },
      });

      const finalY = (doc as any).lastAutoTable.finalY + 15;
      doc.text("Severity Breakdown", 14, finalY);
      autoTable(doc, {
        startY: finalY + 5,
        head: [["Severity", "Incident Count"]],
        body: [
          ["High", reportData.metrics.high.toString()],
          ["Medium", reportData.metrics.medium.toString()],
          ["Low", reportData.metrics.low.toString()],
        ],
        theme: "grid",
        headStyles: { fillColor: [0, 0, 0], textColor: [255, 255, 255], fontStyle: "bold" },
      });

      doc.addPage();
      doc.setFontSize(14);
      doc.text("Detailed Violation Log", 14, 22);
      autoTable(doc, {
        startY: 28,
        head: [["ID", "Field", "Value", "Rule", "Sev", "AI Analysis"]],
        body: reportData.violations.map((v: any) => [
          `#${v.row_index}`, v.column, v.value?.toString() || "null",
          v.rule, v.severity.toUpperCase(), v.explanation,
        ]),
        styles: { fontSize: 8, cellPadding: 3 },
        columnStyles: { 5: { cellWidth: 60 } },
        headStyles: { fillColor: [0, 0, 0], textColor: [255, 255, 255] },
        alternateRowStyles: { fillColor: [245, 245, 245] },
      });

      doc.save(`Compliance_Report_${Date.now()}.pdf`);
    } catch (err) {
      console.error("PDF Export failed:", err);
      alert("Failed to generate PDF. Check console for details.");
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
          <span>Dashboard</span>
          <ChevronRight className="w-3 h-3" />
          <span className="text-emerald-400">Explainability</span>
        </div>
        <h1 className="text-2xl font-bold text-white">Compliance Report</h1>
        <p className="text-sm text-gray-500 mt-1">Step 04 — Violation identification and AI-generated insights</p>
      </div>

      {/* Generate button */}
      <div className="bg-[#111827] border border-white/5 rounded-xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className={`p-3 rounded-xl bg-white/5 ${loadingReport ? "animate-pulse" : ""}`}>
            <ShieldCheck className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-white">Audit Logic Engine</h2>
            <p className="text-xs text-gray-500 mt-0.5">Multi-layered violation assessment system</p>
          </div>
        </div>
        <button
          onClick={handleGenerateReport}
          disabled={loadingReport || mappings.length === 0}
          className="flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-30 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-xl transition-all hover:scale-[1.02] active:scale-95 shadow-lg shadow-indigo-600/20"
        >
          {loadingReport ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Running Audit...</>
          ) : (
            <><Zap className="w-4 h-4 text-yellow-300" /> Generate Final Report</>
          )}
        </button>
      </div>

      {reportError && (
        <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
          <AlertCircle className="w-3.5 h-3.5 text-red-400" />
          <span className="text-xs text-red-400">{reportError}</span>
        </div>
      )}

      {reportData && (
        <div className="space-y-6 animate-in fade-in duration-500">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-[#111827] border border-white/5 border-l-2 border-l-indigo-500 rounded-xl p-5">
              <div className="p-2 bg-indigo-500/10 rounded-lg w-fit mb-3">
                <Database className="w-4 h-4 text-indigo-400" />
              </div>
              <p className="text-2xl font-bold text-white">{reportData.summary.total_rows}</p>
              <p className="text-xs text-gray-500 mt-0.5">Total Rows Processed</p>
            </div>

            <div className="bg-[#111827] border border-white/5 border-l-2 border-l-red-500 rounded-xl p-5">
              <div className="p-2 bg-red-500/10 rounded-lg w-fit mb-3">
                <AlertCircle className="w-4 h-4 text-red-400" />
              </div>
              <p className="text-2xl font-bold text-red-400">{reportData.summary.violations}</p>
              <p className="text-xs text-gray-500 mt-0.5">Policy Violations Found</p>
            </div>

            <div className={`bg-[#111827] border border-white/5 border-l-2 rounded-xl p-5
              ${reportData.summary.compliance_rate > 80 ? "border-l-emerald-500" : "border-l-yellow-500"}`}>
              <div className={`p-2 rounded-lg w-fit mb-3 ${reportData.summary.compliance_rate > 80 ? "bg-emerald-500/10" : "bg-yellow-500/10"}`}>
                {reportData.summary.compliance_rate > 80
                  ? <TrendingUp className="w-4 h-4 text-emerald-400" />
                  : <TrendingDown className="w-4 h-4 text-yellow-400" />}
              </div>
              <p className={`text-2xl font-bold ${reportData.summary.compliance_rate > 80 ? "text-emerald-400" : "text-yellow-400"}`}>
                {reportData.summary.compliance_rate}%
              </p>
              <p className="text-xs text-gray-500 mt-0.5">Overall Compliance Rate</p>
            </div>
          </div>

          {/* Charts row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Severity Breakdown */}
            <div className="bg-[#111827] border border-white/5 rounded-xl p-6">
              <div className="flex items-center gap-2 mb-6">
                <BarChart2 className="w-4 h-4 text-indigo-400" />
                <h3 className="text-sm font-semibold text-white">Severity Breakdown</h3>
              </div>
              <div className="space-y-4">
                {(["high", "medium", "low"] as const).map((sev) => {
                  const count = reportData.metrics[sev] || 0;
                  const pct = (count / (reportData.summary.violations || 1)) * 100;
                  const color = sev === "high" ? "bg-red-500" : sev === "medium" ? "bg-yellow-500" : "bg-emerald-500";
                  const textColor = sev === "high" ? "text-red-400" : sev === "medium" ? "text-yellow-400" : "text-emerald-400";
                  return (
                    <div key={sev}>
                      <div className="flex justify-between items-center mb-1.5">
                        <span className="text-xs font-medium text-gray-400 capitalize">{sev} severity</span>
                        <span className={`text-xs font-bold ${textColor}`}>{count}</span>
                      </div>
                      <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                        <div className={`h-full ${color} rounded-full transition-all duration-1000`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* AI Logic Summary */}
            <div className="bg-[#111827] border border-white/5 rounded-xl p-6">
              <div className="flex items-center gap-2 mb-6">
                <ShieldCheck className="w-4 h-4 text-indigo-400" />
                <h3 className="text-sm font-semibold text-white">AI Compliance Logic</h3>
              </div>
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 bg-white/[0.03] border border-white/5 rounded-lg">
                  <div className="p-2 bg-indigo-500/10 rounded-lg">
                    <Zap className="w-3.5 h-3.5 text-indigo-400" />
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-600 uppercase tracking-widest">Model Used</p>
                    <p className="text-xs font-semibold text-white">GPT-4-Vision Auditing Agent</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-white/[0.03] border border-white/5 rounded-lg">
                  <div className="p-2 bg-emerald-500/10 rounded-lg">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-600 uppercase tracking-widest">Validation Mode</p>
                    <p className="text-xs font-semibold text-white">Strict Policy Adherence [Level 5]</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Violations as Cards */}
          <div className="bg-[#111827] border border-white/5 rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
              <div>
                <h3 className="text-sm font-semibold text-white">Reasoned Violations</h3>
                <p className="text-xs text-gray-500 mt-0.5">{reportData.violations.length} incidents detected</p>
              </div>
              <span className="px-3 py-1 bg-red-500/10 text-red-400 text-[10px] font-semibold rounded-full border border-red-500/20">
                Incident Data Loaded
              </span>
            </div>

            <div className="p-4 space-y-3 max-h-[600px] overflow-y-auto">
              {reportData.violations.map((v: any) => (
                <ViolationCard key={v.violation_id} v={v} getSeverityStyle={getSeverityStyle} />
              ))}
            </div>

            <div className="flex items-center justify-between px-6 py-4 border-t border-white/5">
              <p className="text-[10px] text-gray-600 uppercase tracking-widest">End of Compliance Audit Report</p>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleDownloadJSON}
                  className="flex items-center gap-1.5 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 text-xs font-semibold rounded-lg transition-all"
                >
                  <Download className="w-3.5 h-3.5" /> JSON
                </button>
                <button
                  onClick={handleDownloadPDF}
                  className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg transition-all hover:scale-[1.02]"
                >
                  <Download className="w-3.5 h-3.5" /> PDF Report
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
