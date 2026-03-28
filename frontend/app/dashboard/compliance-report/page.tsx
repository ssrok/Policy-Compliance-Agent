"use client";

import React, { useState } from "react";
import { useDashboard } from "@/lib/context/dashboard-context";
import {
  ShieldCheck, Loader2, Database, AlertCircle,
  TrendingUp, TrendingDown, BarChart2, CheckCircle2, Zap, ChevronRight, Download, Info, Search, Filter, ChevronDown, ChevronUp
} from "lucide-react";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, TooltipProps
} from 'recharts';

// --- Types & Interfaces ---
interface RiskData {
  row_index: number;
  risk_score: number;
  risk_level: "LOW" | "MEDIUM" | "HIGH";
  anomaly_score: number;
  is_anomaly: number;
}

interface ExplanationData {
  row_index: number;
  explanation: string;
}

interface Violation {
  violation_id: string;
  rule: string;
  row_index: number;
  column: string;
  value: any;
  severity: string;
  explanation: string; // rule-engine explanation
}

// --- Components ---

const RiskSummaryCard = ({ title, value, icon: Icon, colorClass, borderClass }: any) => (
  <div className={`bg-[#0B0F19] border border-white/5 ${borderClass} rounded-xl p-5 hover:border-white/10 transition-all`}>
    <div className="flex items-start justify-between">
      <div>
        <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-1">{title}</p>
        <p className={`text-2xl font-bold ${colorClass}`}>{value}</p>
      </div>
      <div className={`p-2 rounded-lg bg-white/5`}>
        <Icon className={`w-4 h-4 ${colorClass}`} />
      </div>
    </div>
  </div>
);

const RiskDistributionChart = ({ data }: { data: any[] }) => (
  <div className="h-[250px] w-full">
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
        <XAxis 
          dataKey="name" 
          stroke="#9ca3af" 
          fontSize={10} 
          tickLine={false} 
          axisLine={false} 
        />
        <YAxis 
          stroke="#9ca3af" 
          fontSize={10} 
          tickLine={false} 
          axisLine={false} 
        />
        <Tooltip 
          contentStyle={{ backgroundColor: '#111827', border: '1px solid #ffffff10', borderRadius: '8px', fontSize: '10px' }}
          cursor={{ fill: '#ffffff05' }}
        />
        <Bar dataKey="value" radius={[4, 4, 0, 0]}>
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  </div>
);

export default function ComplianceReportPage() {
  const { datasetState, mappingState, reportState, handleGenerateReport } = useDashboard();
  const { mappings } = mappingState;
  const { data: reportData, loading: loadingReport, error: reportError } = reportState;
  
  const [expandedRow, setExpandedRow] = useState<number | null>(null);

  const getSeverityStyle = React.useCallback((sev: string) => {
    switch (sev.toLowerCase()) {
      case "high":   return "bg-red-500/10 text-red-500 border-red-500/20";
      case "medium": return "bg-yellow-500/10 text-yellow-500 border-yellow-500/20";
      case "low":    return "bg-emerald-500/10 text-emerald-500 border-emerald-500/20";
      default:       return "bg-gray-500/10 text-gray-400 border-gray-500/20";
    }
  }, []);

  const getRiskLevelColor = (level: string) => {
    switch (level) {
      case "HIGH":   return "text-red-500";
      case "MEDIUM": return "text-yellow-500";
      case "LOW":    return "text-emerald-500";
      default:       return "text-gray-400";
    }
  };

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
          ["Average Risk Score", `${reportData.risk_summary?.average_risk_score.toFixed(1) || 0}/100`],
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
      doc.text("Detailed Risk & Violation Log", 14, 22);
      
      const riskMap = Object.fromEntries((reportData.risk_data || []).map((rd: any) => [rd.row_index, rd]));
      
      autoTable(doc, {
        startY: 28,
        head: [["ID", "Risk", "Level", "Field", "Violation", "Sev"]],
        body: reportData.violations.map((v: any) => {
          const risk = getRowRisk(v.row_index);
          return [
            `#${v.row_index}`, 
            `${risk.risk_score.toFixed(0)}`, 
            risk.risk_level,
            v.column, 
            v.rule, 
            v.severity.toUpperCase(),
          ];
        }),
        styles: { fontSize: 8, cellPadding: 3 },
        headStyles: { fillColor: [0, 0, 0], textColor: [255, 255, 255] },
        alternateRowStyles: { fillColor: [245, 245, 245] },
      });

      doc.save(`Compliance_Report_${Date.now()}.pdf`);
    } catch (err) {
      console.error("PDF Export failed:", err);
      alert("Failed to generate PDF. Check console for details.");
    }
  };

  // --- Data Preparation ---
  const chartData = reportData ? [
    { name: 'HIGH', value: reportData.risk_summary?.high_risk_count || 0, color: '#ef4444' },
    { name: 'MEDIUM', value: reportData.risk_summary?.medium_risk_count || 0, color: '#f59e0b' },
    { name: 'LOW', value: reportData.risk_summary?.low_risk_count || 0, color: '#10b981' },
  ] : [];

  const riskMap = reportData ? Object.fromEntries((reportData.risk_data || []).map((rd: any) => [rd.row_index, rd])) : {};
  const getRowRisk = (rowIndex: number) => riskMap[rowIndex] ?? { risk_score: 0, risk_level: "LOW", anomaly_score: 0, is_anomaly: 0 };
  const explanationMap = reportData ? Object.fromEntries((reportData.explanations || []).map((e: any) => [e.row_index, e.explanation])) : {};

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
            <span>Dashboard</span>
            <ChevronRight className="w-3 h-3" />
            <span className="text-emerald-400">Risk Intelligence</span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Compliance Intelligence Report</h1>
          <p className="text-sm text-gray-500 mt-1">Step 04 — Hybrid Rule-Based & AI Risk Assessment</p>
        </div>
        
        <div className="flex items-center gap-2">
          {reportData && (
             <div className="flex items-center gap-2">
                <button
                  onClick={handleDownloadJSON}
                  className="flex items-center gap-1.5 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 text-xs font-semibold rounded-lg transition-all"
                >
                  <Download className="w-3.5 h-3.5" /> JSON
                </button>
                <button
                  onClick={handleDownloadPDF}
                  className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg transition-all hover:scale-[1.02] active:scale-95 shadow-lg shadow-indigo-600/20"
                >
                  <Download className="w-3.5 h-3.5" /> PDF
                </button>
             </div>
          )}
        </div>
      </div>

      {/* Main Action Bar */}
      <div className="bg-[#0B0F19] border border-white/5 rounded-2xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className={`p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/20 ${loadingReport ? "animate-pulse" : ""}`}>
            <ShieldCheck className="w-6 h-6 text-indigo-400" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white tracking-wide">Orchestration Engine</h2>
            <p className="text-xs text-gray-500 mt-1 font-medium">Executing multi-layer AI compliance verification</p>
          </div>
        </div>
        <button
          onClick={handleGenerateReport}
          disabled={loadingReport || mappings.length === 0}
          className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-3.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-30 disabled:cursor-not-allowed text-white text-sm font-bold rounded-xl transition-all hover:scale-[1.02] active:scale-95 shadow-xl shadow-indigo-600/25"
        >
          {loadingReport ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Analyzing Intelligence...</>
          ) : (
            <><Zap className="w-4 h-4 text-yellow-300 fill-yellow-300" /> Run Risk Audit</>
          )}
        </button>
      </div>

      {reportError && (
        <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
          <div className="p-1.5 bg-red-500/10 rounded-lg">
            <AlertCircle className="w-4 h-4 text-red-400" />
          </div>
          <span className="text-xs text-red-500 font-medium">{reportError}</span>
        </div>
      )}

      {reportData && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
          
          {/* Risk Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <RiskSummaryCard 
              title="Average Risk Score" 
              value={`${reportData.risk_summary?.average_risk_score.toFixed(1) || 0}`}
              icon={TrendingUp}
              colorClass="text-indigo-400"
              borderClass="border-l-4 border-l-indigo-500"
            />
            <RiskSummaryCard 
              title="High Risk Incidents" 
              value={reportData.risk_summary?.high_risk_count || 0}
              icon={AlertCircle}
              colorClass="text-red-500"
              borderClass="border-l-4 border-l-red-500"
            />
            <RiskSummaryCard 
              title="Medium Risk Incidents" 
              value={reportData.risk_summary?.medium_risk_count || 0}
              icon={BarChart2}
              colorClass="text-yellow-500"
              borderClass="border-l-4 border-l-yellow-500"
            />
            <RiskSummaryCard 
              title="Low Risk Incidents" 
              value={reportData.risk_summary?.low_risk_count || 0}
              icon={CheckCircle2}
              colorClass="text-emerald-500"
              borderClass="border-l-4 border-l-emerald-500"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Risk Distribution Chart */}
            <div className="lg:col-span-2 bg-[#0B0F19] border border-white/5 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-2">
                  <BarChart2 className="w-4 h-4 text-emerald-400" />
                  <h3 className="text-sm font-bold text-white tracking-wide">Risk Spread Analysis</h3>
                </div>
                <div className="flex gap-4">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-red-500" />
                    <span className="text-[10px] text-gray-500 font-bold uppercase">High</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-yellow-500" />
                    <span className="text-[10px] text-gray-500 font-bold uppercase">Med</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span className="text-[10px] text-gray-500 font-bold uppercase">Low</span>
                  </div>
                </div>
              </div>
              <RiskDistributionChart data={chartData} />
            </div>

            {/* Global Compliance Summary */}
            <div className="bg-[#0B0F19] border border-white/5 rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-8">
                <ShieldCheck className="w-4 h-4 text-indigo-400" />
                <h3 className="text-sm font-bold text-white tracking-wide">Global Compliance</h3>
              </div>
              <div className="space-y-4">
                <div className="bg-white/[0.02] border border-white/5 rounded-xl p-4 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-1">Pass Rate</p>
                    <p className="text-2xl font-bold text-emerald-400">{reportData.summary.compliance_rate}%</p>
                  </div>
                  <div className="p-2 bg-emerald-500/10 rounded-lg">
                    <TrendingUp className="w-4 h-4 text-emerald-400" />
                  </div>
                </div>
                <div className="bg-white/[0.02] border border-white/5 rounded-xl p-4 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-1">Total Incidents</p>
                    <p className="text-2xl font-bold text-red-400">{reportData.summary.violations}</p>
                  </div>
                  <div className="p-2 bg-red-500/10 rounded-lg">
                    <AlertCircle className="w-4 h-4 text-red-400" />
                  </div>
                </div>
                <div className="bg-white/[0.02] border border-white/5 rounded-xl p-4 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-1">Audited Data</p>
                    <p className="text-lg font-bold text-white uppercase">{reportData.summary.total_rows} Rows</p>
                  </div>
                  <div className="p-2 bg-indigo-500/10 rounded-lg">
                    <Database className="w-4 h-4 text-indigo-400" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Incident Log Table */}
          <div className="bg-[#0B0F19] border border-white/5 rounded-2xl overflow-hidden">
            <div className="px-6 py-5 border-b border-white/5 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white tracking-wide">In-Depth Incident Logic</h3>
                <p className="text-xs text-gray-500 mt-1 uppercase tracking-wider font-semibold">Row-level explainability audit</p>
              </div>
              <div className="flex items-center gap-3">
                 <div className="relative group">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-indigo-400" />
                    <input 
                      type="text" 
                      placeholder="Filter records..." 
                      className="bg-white/5 border border-white/5 rounded-lg py-1.5 pl-9 pr-4 text-xs text-white focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 transition-all"
                    />
                 </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-white/[0.01]">
                    <th className="px-6 py-4 text-[10px] text-gray-600 uppercase tracking-widest font-bold border-b border-white/5">Row</th>
                    <th className="px-6 py-4 text-[10px] text-gray-600 uppercase tracking-widest font-bold border-b border-white/5">Risk Score</th>
                    <th className="px-6 py-4 text-[10px] text-gray-600 uppercase tracking-widest font-bold border-b border-white/5">Risk Level</th>
                    <th className="px-6 py-4 text-[10px] text-gray-600 uppercase tracking-widest font-bold border-b border-white/5">Field Mapping</th>
                    <th className="px-6 py-4 text-[10px] text-gray-600 uppercase tracking-widest font-bold border-b border-white/5">Policy Violation</th>
                    <th className="px-6 py-4 text-[10px] text-gray-600 uppercase tracking-widest font-bold border-b border-white/5">Severity</th>
                    <th className="px-6 py-4 text-[10px] text-gray-600 uppercase tracking-widest font-bold border-b border-white/5"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {reportData.violations.map((v: any) => {
                    const rowRisk = getRowRisk(v.row_index);
                    const isExpanded = expandedRow === v.row_index;
                    const isHighRisk = rowRisk.risk_level === "HIGH";

                    return (
                      <React.Fragment key={v.violation_id}>
                        <tr 
                          className={`group hover:bg-white/[0.03] transition-all cursor-pointer ${isHighRisk ? "bg-red-500/[0.02]" : ""}`}
                          onClick={() => setExpandedRow(isExpanded ? null : v.row_index)}
                        >
                          <td className="px-6 py-4">
                            <span className="text-xs font-mono text-gray-500">#{v.row_index}</span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <span className={`text-xs font-bold ${getRiskLevelColor(rowRisk.risk_level)}`}>
                                {rowRisk.risk_score.toFixed(1)}
                              </span>
                              <div className="w-16 h-1 bg-white/5 rounded-full overflow-hidden hidden sm:block">
                                <div 
                                  className={`h-full opacity-70 ${rowRisk.risk_score > 70 ? "bg-red-500" : rowRisk.risk_score > 30 ? "bg-yellow-500" : "bg-emerald-500"}`}
                                  style={{ width: `${rowRisk.risk_score}%` }}
                                />
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border ${rowRisk.risk_level === "HIGH" ? "bg-red-500/10 text-red-500 border-red-500/20" : rowRisk.risk_level === "MEDIUM" ? "bg-yellow-500/10 text-yellow-500 border-yellow-500/20" : "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"}`}>
                              {rowRisk.risk_level}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-xs text-indigo-300 font-mono italic">{v.column}</span>
                          </td>
                          <td className="px-6 py-4 max-w-[200px]">
                            <p className="text-xs text-gray-400 truncate font-medium group-hover:text-gray-200 transition-colors">{v.rule}</p>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${getSeverityStyle(v.severity)}`}>
                              {v.severity}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-600" /> : <ChevronDown className="w-4 h-4 text-gray-600" />}
                          </td>
                        </tr>
                        
                        {/* Expanded Explanation Section */}
                        {isExpanded && (
                          <tr className="bg-white/[0.01] animate-in slide-in-from-top-2 duration-300 border-l-2 border-l-indigo-500">
                            <td colSpan={7} className="px-8 py-6">
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                <div className="md:col-span-2 space-y-4">
                                   <div className="flex items-center gap-2">
                                      <Zap className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400/20" />
                                      <h4 className="text-xs font-bold text-white uppercase tracking-widest">AI Intelligence Summary</h4>
                                   </div>
                                   <p className="text-sm text-gray-300 leading-relaxed font-medium bg-white/5 border border-white/5 p-4 rounded-xl italic">
                                      "{explanationMap[v.row_index] || "Processing detailed incident explainability..."}"
                                   </p>
                                   <div className="grid grid-cols-2 gap-4">
                                      <div className="bg-white/[0.03] p-3 rounded-xl border border-white/5">
                                         <p className="text-[10px] text-gray-600 uppercase font-bold tracking-widest mb-1">Violation Value</p>
                                         <p className="text-xs text-yellow-300 font-mono font-bold tracking-wide">{v.value?.toString() || "NULL"}</p>
                                      </div>
                                      <div className="bg-white/[0.03] p-3 rounded-xl border border-white/5">
                                         <p className="text-[10px] text-gray-600 uppercase font-bold tracking-widest mb-1">Anomaly Indicator</p>
                                         <p className="text-xs text-indigo-400 font-mono font-bold tracking-wide">{rowRisk.anomaly_score.toFixed(4)}</p>
                                      </div>
                                   </div>
                                </div>
                                <div className="space-y-4">
                                   <div className="flex items-center gap-2">
                                      <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
                                      <h4 className="text-xs font-bold text-white uppercase tracking-widest">Metadata Audit</h4>
                                   </div>
                                   <div className="space-y-2.5">
                                      <div className="flex justify-between text-xs">
                                         <span className="text-gray-500">Incident ID</span>
                                         <span className="text-gray-300 font-mono">{v.violation_id.slice(0, 8)}...</span>
                                      </div>
                                      <div className="flex justify-between text-xs">
                                         <span className="text-gray-500">Schema Anchor</span>
                                         <span className="text-gray-300 font-mono">{v.column}</span>
                                      </div>
                                      <div className="flex justify-between text-xs">
                                         <span className="text-gray-500">Machine Outlier</span>
                                         <span className={`font-mono ${rowRisk.is_anomaly === 1 ? "text-red-500" : "text-emerald-500"}`}>
                                            {rowRisk.is_anomaly === 1 ? "[DETECTED]" : "[NEGATIVE]"}
                                         </span>
                                      </div>
                                   </div>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="bg-[#0B0F19] px-6 py-4 flex items-center justify-between border-t border-white/5">
               <div className="flex items-center gap-2 text-[10px] text-gray-600 font-bold uppercase tracking-widest">
                  <Database className="w-3 h-3" />
                  Processed {reportData.summary.total_rows} row signatures
               </div>
               <div className="text-[10px] text-gray-600 font-bold uppercase tracking-widest">
                  AI Explainability Engine v2.4 (Templated)
               </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
