"use client";

import React from "react";
import { useDashboard } from "@/lib/context/dashboard-context";
import { 
  ShieldCheck, 
  Loader2, 
  Database, 
  AlertCircle, 
  TrendingUp, 
  TrendingDown, 
  BarChart3, 
  PieChart, 
  CheckCircle2,
  Zap,
  ChevronRight
} from "lucide-react";

// Memoized Violation Row for performance
const ViolationRow = React.memo(({ v, getSeverityColor }: { v: any, getSeverityColor: Function }) => (
  <tr className="hover:bg-gray-50 group transition-all duration-300">
    <td className="px-10 py-12 font-mono text-xs text-gray-300 group-hover:text-black transition-colors">#{v.row_index}</td>
    <td className="px-10 py-12 text-black uppercase tracking-tight not-italic font-black text-xl">
      {v.value ?? 'null'} 
      <span className="block text-[10px] text-gray-300 font-mono tracking-tighter mt-1 group-hover:text-indigo-600 transition-colors uppercase font-medium not-italic italic">COLUMN_{v.column}</span>
    </td>
    <td className="px-10 py-12 font-mono text-gray-500 font-medium not-italic group-hover:text-black transition-colors">
      <span className="bg-gray-50 px-4 py-2 rounded-xl border border-gray-50 group-hover:border-indigo-100 transition-all font-bold">
          {v.rule}
      </span>
    </td>
    <td className="px-10 py-12">
      <span className={`px-6 py-2.5 rounded-[16px] uppercase text-[10px] font-black tracking-[0.2em] border shadow-sm ${getSeverityColor(v.severity)}`}>
          {v.severity}
      </span>
    </td>
    <td className="px-10 py-12 text-gray-500 max-w-sm leading-relaxed font-medium group-hover:text-black transition-colors italic shadow-inner">
      "{v.explanation}"
    </td>
  </tr>
));

ViolationRow.displayName = "ViolationRow";

export default function ComplianceReportPage() {
  const { 
    datasetState,
    mappingState,
    reportState, 
    handleGenerateReport 
  } = useDashboard();
  const { mappings } = mappingState;
  const { data: reportData, loading: loadingReport, error: reportError } = reportState;

  const getSeverityColor = React.useCallback((sev: string) => {
    switch(sev.toLowerCase()){
      case 'high': return 'text-red-600 bg-red-50 border-red-100 italic';
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-100 italic font-medium';
      case 'low': return 'text-green-600 bg-green-50 border-green-100 italic font-medium';
      default: return 'text-gray-600 bg-gray-50 border-gray-100 italic';
    }
  }, []);

  return (
    <div className="space-y-12 animate-in slide-in-from-bottom-5 duration-700">
      <div className="text-center space-y-4">
        <h1 className="text-5xl font-black uppercase tracking-tighter italic">Compliance <span className="text-red-600">Report</span></h1>
        <p className="text-gray-400 max-w-lg mx-auto font-medium font-mono uppercase tracking-widest text-[10px]">Step 04: Violation identification and AI-generated insights</p>
      </div>

      <div className="flex flex-col items-center space-y-12 mb-16">
        <div className="relative p-12 bg-white rounded-[48px] shadow-2xl shadow-indigo-100/50 border border-indigo-50 flex flex-col items-center text-center space-y-8 group transition-all duration-500 hover:scale-[1.02]">
           <div className={`p-8 bg-black rounded-full transition-all group-hover:scale-110 duration-500 shadow-2xl shadow-black/20 ${loadingReport && 'animate-pulse'}`}>
              <ShieldCheck className="w-16 h-16 text-white" />
           </div>
           
           <div className="space-y-4 w-full max-w-sm">
              <h2 className="text-3xl font-black uppercase tracking-tight italic">Audit Logic Engine</h2>
              <p className="text-gray-400 font-medium font-mono uppercase tracking-[0.05em] text-[11px]">System ready for multi-layered violation assessment</p>
           </div>

           <button 
             onClick={handleGenerateReport} 
             disabled={loadingReport || mappings.length === 0} 
             className="px-16 py-8 bg-black text-white rounded-[32px] font-black text-xl uppercase tracking-[0.4em] shadow-2xl shadow-black/20 hover:scale-105 active:scale-95 transition-all flex items-center group relative overflow-hidden italic"
           >
             {loadingReport ? (
               <span className="flex items-center"><Loader2 className="w-8 h-8 mr-6 animate-spin" /> RUNNING AUDIT...</span>
             ) : (
               <span className="flex items-center">Generate Final Report <Zap className="w-6 h-6 ml-4 text-yellow-400" /></span>
             )}
           </button>
        </div>
      </div>

      {reportData && (
        <div className="space-y-12 animate-scale-in">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
             <div className="p-10 bg-white rounded-[40px] border border-gray-100 shadow-xl shadow-gray-100/50 flex flex-col items-center text-center group hover:bg-gray-950 transition-all duration-500 transform hover:scale-[1.05]">
                <Database className="w-10 h-10 text-gray-200 group-hover:text-indigo-500 mb-6 transition-colors duration-500" />
                <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 group-hover:text-indigo-200">Total Rows Processed</span>
                <h4 className="text-5xl font-black tracking-tighter mt-2 group-hover:text-white transition-colors uppercase italic">{reportData.summary.total_rows}</h4>
                <div className="mt-4 opacity-0 group-hover:opacity-100 transition-opacity">
                   <div className="success-badge scale-75">Verified</div>
                </div>
             </div>
             
             <div className="p-10 bg-white border border-gray-100 shadow-xl shadow-gray-100/50 rounded-[40px] flex flex-col items-center text-center group hover:bg-red-600 transition-all duration-500 transform hover:scale-[1.05]">
                <AlertCircle className="w-10 h-10 text-red-100 group-hover:text-red-400 mb-6 transition-colors duration-500" />
                <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 group-hover:text-red-100">Policy Violations Found</span>
                <h4 className="text-5xl font-black tracking-tighter mt-2 text-red-600 group-hover:text-white transition-colors uppercase italic">{reportData.summary.violations}</h4>
             </div>
             
             <div className={`p-10 bg-white border border-gray-100 shadow-xl shadow-gray-100/50 rounded-[40px] flex flex-col items-center text-center group hover:bg-green-600 transition-all duration-500 transform hover:scale-[1.05]`}>
                {reportData.summary.compliance_rate > 80 ? (
                  <TrendingUp className="w-10 h-10 text-green-100 group-hover:text-green-400 mb-6 transition-colors duration-500" />
                ) : (
                  <TrendingDown className="w-10 h-10 text-yellow-100 group-hover:text-yellow-400 mb-6 transition-colors duration-500" />
                )}
                <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 group-hover:text-green-100">Overall Compliance Rate</span>
                <h4 className={`text-5xl font-black tracking-tighter mt-2 ${reportData.summary.compliance_rate > 80 ? 'text-green-600' : 'text-yellow-600'} group-hover:text-white transition-colors uppercase italic`}>
                   {reportData.summary.compliance_rate}%
                </h4>
             </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
             {/* Severity Chart */}
             <div className="bg-white p-12 rounded-[48px] border border-gray-100 shadow-xl shadow-gray-100/50 group transition-all duration-500 hover:shadow-2xl">
                <div className="flex items-center justify-between mb-12">
                    <h3 className="text-2xl font-black flex items-center uppercase tracking-tighter italic"> <BarChart3 className="w-6 h-6 mr-4 text-indigo-500" /> Severity Breakdown</h3>
                    <div className="p-3 bg-indigo-50 rounded-2xl">
                       <PieChart className="w-5 h-5 text-indigo-500" />
                    </div>
                </div>
                <div className="space-y-10 px-4">
                   {['high', 'medium', 'low'].map((sev) => {
                      const count = reportData.metrics[sev as keyof typeof reportData.metrics] || 0;
                      const percentage = (count / (reportData.summary.violations || 1)) * 100;
                      const color = sev === 'high' ? 'bg-red-500' : sev === 'medium' ? 'bg-yellow-500' : 'bg-green-500';
                      return (
                        <div key={sev} className="space-y-4">
                           <div className="flex justify-between items-end">
                              <span className="text-[11px] font-black uppercase tracking-[0.3em] text-gray-400 italic">#{sev} Incidents</span>
                              <span className="text-xl font-black italic">{count} Samples</span>
                           </div>
                           <div className="h-4 w-full bg-gray-50 rounded-full overflow-hidden border border-gray-50 p-1">
                              <div className={`h-full ${color} rounded-full transition-all duration-[2000ms] ease-out shadow-inner animate-in slide-in-from-left-full`} style={{ width: `${percentage}%` }} />
                           </div>
                        </div>
                      );
                   })}
                </div>
             </div>

             {/* Logic Summary */}
             <div className="bg-gray-900 p-12 rounded-[48px] shadow-2xl shadow-indigo-100/20 border border-gray-800 space-y-12 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-16 opacity-5 pointer-events-none">
                   <ShieldCheck className="w-64 h-64 text-white" />
                </div>
                <div className="space-y-4 relative z-10">
                   <h3 className="text-2xl font-black text-white uppercase tracking-tighter italic">AI Compliance Logic</h3>
                   <div className="h-1 w-20 bg-indigo-500 rounded-full" />
                </div>
                <div className="space-y-6 relative z-10">
                   <div className="flex items-center space-x-6 bg-white/5 p-8 rounded-[32px] border border-white/10 hover:bg-white/10 transition-colors">
                      <div className="p-4 bg-indigo-500/20 rounded-2xl">
                         <Zap className="w-6 h-6 text-indigo-400" />
                      </div>
                      <div className="space-y-1">
                         <span className="text-[10px] font-black uppercase tracking-widest text-indigo-400">Model Used</span>
                         <p className="text-lg font-black text-white italic">GPT-4-Vision Auditing Agent</p>
                      </div>
                   </div>
                   <div className="flex items-center space-x-6 bg-white/5 p-8 rounded-[32px] border border-white/10 hover:bg-white/10 transition-colors">
                      <div className="p-4 bg-green-500/20 rounded-2xl">
                         <CheckCircle2 className="w-6 h-6 text-green-400" />
                      </div>
                      <div className="space-y-1">
                         <span className="text-[10px] font-black uppercase tracking-widest text-green-400">Validation Mode</span>
                         <p className="text-lg font-black text-white italic">Strict Policy Adherence [Level 5]</p>
                      </div>
                   </div>
                </div>
             </div>
          </div>

          {/* Violations Table */}
          <div className="bg-white rounded-[56px] border border-gray-100 shadow-2xl shadow-gray-100/50 overflow-hidden animate-in slide-in-from-bottom-12 duration-[1500ms]">
             <div className="p-16 border-b border-gray-50 flex items-center justify-between bg-white relative overflow-hidden group">
                <div className="absolute top-0 left-0 w-80 h-80 bg-red-50/20 rounded-full -translate-x-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
                <div className="flex items-center space-x-6 relative z-10"> 
                   <div className="p-5 bg-red-50 rounded-3xl group-hover:bg-red-600 transition-colors duration-500">
                      <PieChart className="w-8 h-8 text-red-500 group-hover:text-white" /> 
                   </div>
                   <h3 className="text-4xl font-black tracking-tighter uppercase italic">Reasoned <span className="text-red-600">Violations</span></h3>
                </div>
                <span className="px-8 py-3 bg-red-50 text-red-600 font-black text-[10px] uppercase tracking-[0.2em] rounded-2xl border border-red-100 relative z-10">INCIDENT DATA LOADED</span>
             </div>
             
             <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-gray-50/50 text-[11px] font-black uppercase tracking-[0.3em] text-gray-400 border-b border-gray-50 italic">
                     <tr>
                        <th className="px-10 py-10">Record ID</th>
                        <th className="px-10 py-10">Detected Value</th>
                        <th className="px-10 py-10">Matched Rule</th>
                        <th className="px-10 py-10">Priority</th>
                        <th className="px-10 py-10">AI Critical Analysis</th>
                     </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 font-bold text-sm italic">
                     {reportData.violations.map((v: any) => (
                       <ViolationRow key={v.violation_id} v={v} getSeverityColor={getSeverityColor} />
                     ))}
                  </tbody>
                </table>
             </div>
             
             <div className="p-16 bg-gray-50/50 border-t border-gray-100 text-center relative group">
                <p className="text-[11px] font-black uppercase tracking-[0.4em] text-gray-400 mb-8 font-mono">End of Compliance Audit Report</p>
                <div className="flex justify-center space-x-6">
                   <button 
                     onClick={() => {
                        const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `compliance_report_${new Date().getTime()}.json`;
                        a.click();
                     }}
                     className="px-10 py-4 bg-white border border-gray-200 rounded-2xl font-black text-xs uppercase tracking-widest hover:border-black transition-all"
                   >
                     Download JSON
                   </button>
                   <button 
                     onClick={async () => {
                        try {
                           const jsPDF = (await import('jspdf')).default;
                           const autoTable = (await import('jspdf-autotable')).default;
                           
                           const doc = new jsPDF();
                           const timestamp = new Date().toLocaleString();
                           
                           // Title
                           doc.setFontSize(20);
                           doc.setFont("helvetica", "bold");
                           doc.text("AI Data Policy Compliance Report", 14, 22);
                           
                           // Metadata
                           doc.setFontSize(10);
                           doc.setFont("helvetica", "normal");
                           doc.setTextColor(100);
                           doc.text(`Generated on: ${timestamp}`, 14, 30);
                           doc.text(`Dataset: ${datasetState.fileName || 'Active Session'}`, 14, 35);
                           
                           // Summary Section
                           doc.setFontSize(14);
                           doc.setFont("helvetica", "bold");
                           doc.setTextColor(0);
                           doc.text("Compliance Summary", 14, 50);
                           
                           autoTable(doc, {
                              startY: 55,
                              head: [['Metric', 'Value']],
                              body: [
                                 ['Total Rows Processed', reportData.summary.total_rows.toString()],
                                 ['Total Violations Found', reportData.summary.violations.toString()],
                                 ['Overall Compliance Rate', `${reportData.summary.compliance_rate}%`]
                              ],
                              theme: 'grid',
                              headStyles: { fillGray: 200, textColor: 0, fontStyle: 'bold' }
                           });

                           // Severity Breakdown
                           const finalY = (doc as any).lastAutoTable.finalY + 15;
                           doc.text("Severity Breakdown", 14, finalY);
                           autoTable(doc, {
                              startY: finalY + 5,
                              head: [['Severity', 'Incident Count']],
                              body: [
                                 ['High', reportData.metrics.high.toString()],
                                 ['Medium', reportData.metrics.medium.toString()],
                                 ['Low', reportData.metrics.low.toString()]
                              ],
                              theme: 'grid',
                              headStyles: { fillGray: 200, textColor: 0, fontStyle: 'bold' }
                           });

                           // Violations Table
                           doc.addPage();
                           doc.setFontSize(14);
                           doc.text("Detailed Violation Log", 14, 22);
                           
                           autoTable(doc, {
                              startY: 28,
                              head: [['ID', 'Field', 'Value', 'Rule', 'Sev', 'AI Analysis']],
                              body: reportData.violations.map((v: any) => [
                                 `#${v.row_index}`,
                                 v.column,
                                 v.value?.toString() || 'null',
                                 v.rule,
                                 v.severity.toUpperCase(),
                                 v.explanation
                              ]),
                              styles: { fontSize: 8, cellPadding: 3 },
                              columnStyles: {
                                 5: { cellWidth: 60 } // Analysis column gets more space
                              },
                              headStyles: { fillColor: [0, 0, 0], textColor: [255, 255, 255] },
                              alternateRowStyles: { fillColor: [245, 245, 245] }
                           });

                           doc.save(`Compliance_Report_${new Date().getTime()}.pdf`);
                        } catch (err) {
                           console.error("PDF Export failed:", err);
                           alert("Failed to generate PDF. check console for details.");
                        }
                     }}
                     className="px-10 py-4 bg-black text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:scale-105 transition-all hover-bounce"
                   >
                     Download PDF Report
                   </button>
                </div>
             </div>
          </div>
        </div>
      )}
    </div>
  );
}

