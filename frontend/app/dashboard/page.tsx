"use client";

export const dynamic = "force-dynamic";

import React, { useState } from "react";
import { 
  Upload, 
  FileText, 
  Loader2, 
  AlertCircle, 
  CheckCircle2, 
  Layers, 
  Table as TableIcon, 
  ChevronRight,
  Database,
  FileSpreadsheet,
  PieChart,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
  BarChart3
} from "lucide-react";

interface MappingResponse {
  rule_field: string;
  mapped_column: string;
  confidence: number;
  match_type: string;
}

interface Violation {
  violation_id: string;
  rule: string;
  row_index: number;
  column: string;
  value: any;
  expected: string;
  message: string;
  severity: string;
  explanation: string;
}

interface ReportData {
  summary: {
    total_rows: number;
    violations: number;
    compliance_rate: number;
  };
  violations: Violation[];
  metrics: {
    high: number;
    medium: number;
    low: number;
  };
  chart_data: {
    labels: string[];
    values: number[];
  };
}

export default function DashboardPage() {
  // --- STATE ---
  const [policyFile, setPolicyFile] = useState<File | null>(null);
  const [clauses, setClauses] = useState<string[]>([]);
  const [loadingPolicy, setLoadingPolicy] = useState(false);
  const [policyError, setPolicyError] = useState<string | null>(null);

  const [datasetFile, setDatasetFile] = useState<File | null>(null);
  const [datasetColumns, setDatasetColumns] = useState<string[]>([]);
  const [datasetRows, setDatasetRows] = useState<any[]>([]);
  const [datasetMsg, setDatasetMsg] = useState<string | null>(null);

  const [mappings, setMappings] = useState<MappingResponse[]>([]);
  const [loadingMapping, setLoadingMapping] = useState(false);
  const [mappingError, setMappingError] = useState<string | null>(null);

  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [loadingReport, setLoadingReport] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);

  // In a real app, these rule fields would be dynamically derived from the clauses.
  const ruleFields = ["amount", "transaction_date", "status"];

  // --- HANDLERS ---

  const handlePolicyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setPolicyFile(e.target.files[0]);
      setClauses([]);
      setMappings([]);
      setReportData(null);
      setPolicyError(null);
    }
  };

  const handleDatasetChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setDatasetFile(file);
      setMappings([]);
      setReportData(null);
      
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        if (text) {
          const lines = text.split("\n").map(l => l.trim()).filter(l => l.length > 0);
          if (lines.length > 0) {
            const cols = lines[0].split(",").map(c => c.trim().replace(/['"]+/g, ''));
            setDatasetColumns(cols);
            
            // Basic CSV parsing for rows
            const rows = lines.slice(1).map(line => {
              const values = line.split(",").map(v => v.trim().replace(/['"]+/g, ''));
              let obj: any = {};
              cols.forEach((col, i) => {
                 const rawVal = values[i];
                 // Basic type casting
                 if (!isNaN(Number(rawVal)) && rawVal !== "") {
                   obj[col] = Number(rawVal);
                 } else if (rawVal === "true" || rawVal === "false") {
                   obj[col] = rawVal === "true";
                 } else {
                   obj[col] = rawVal;
                 }
              });
              return obj;
            });
            setDatasetRows(rows);
            setDatasetMsg(`${cols.length} columns & ${rows.length} rows detected`);
          }
        }
      };
      reader.readAsText(file);
    }
  };

  const handleExtractPolicy = async () => {
    if (!policyFile) return;
    
    console.log("Sending file:", policyFile);
    
    setLoadingPolicy(true);
    setPolicyError(null);
    setClauses([]);

    try {
      const formData = new FormData();
      formData.append("file", policyFile);
      
      const res = await fetch("http://localhost:8000/api/v1/policy/extract", { 
        method: "POST", 
        body: formData 
      });
      
      if (!res.ok) throw new Error("Policy extraction failed");
      
      const data = await res.json();
      console.log("API RESPONSE:", data);
      
      setClauses(data.clauses || []);
    } catch (err: any) {
      console.error("Extraction error:", err);
      setPolicyError(err.message);
    } finally {
      setLoadingPolicy(false);
    }
  };

  const handleRunMapping = async () => {
    if (!datasetFile || datasetColumns.length === 0) return;
    setLoadingMapping(true);
    setMappingError(null);
    try {
      const body = {
        dataset: { dataset_id: datasetFile.name, columns: datasetColumns },
        rules: ruleFields.map(field => ({ field }))
      };
      const res = await fetch("http://localhost:8000/api/v1/schema/map", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      if (!res.ok) throw new Error("Mapping failed");
      const data = await res.json();
      setMappings(data);
    } catch (err: any) {
      setMappingError(err.message);
    } finally {
      setLoadingMapping(false);
    }
  };

  const handleGenerateReport = async () => {
    if (mappings.length === 0 || datasetRows.length === 0) return;
    setLoadingReport(true);
    setReportError(null);

    try {
      // 1. Run Compliance Check
      const checkRes = await fetch("http://localhost:8000/api/v1/compliance/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dataset: { dataset_id: datasetFile?.name || "demo", columns: datasetColumns, rows: datasetRows },
          rules: ["amount > 1000", "status == ACTIVE"], // Example rules
          mappings: mappings
        })
      });
      if (!checkRes.ok) throw new Error("Compliance check failed");
      const executionOutput = await checkRes.json();

      // 2. Generate Enriched Report
      const reportRes = await fetch("http://localhost:8000/api/v1/report/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(executionOutput)
      });
      if (!reportRes.ok) throw new Error("Report generation failed");
      const finalReport = await reportRes.json();
      setReportData(finalReport);
    } catch (err: any) {
      setReportError(err.message);
    } finally {
      setLoadingReport(false);
    }
  };

  // --- HELPERS ---
  const getSeverityColor = (sev: string) => {
    switch(sev.toLowerCase()){
      case 'high': return 'text-red-600 bg-red-50 border-red-100';
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-100';
      case 'low': return 'text-green-600 bg-green-50 border-green-100';
      default: return 'text-gray-600 bg-gray-50 border-gray-100';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center py-16 px-6">
      <div className="max-w-4xl w-full space-y-12">
        
        {/* -- STEP 1: INGESTION -- */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Policy */}
          <div className="bg-white rounded-3xl shadow-xl p-8 border border-gray-100 h-full flex flex-col">
            <h3 className="text-xl font-bold mb-6 flex items-center justify-center"><FileText className="w-5 h-5 mr-2 text-indigo-500"/> Policy Ingestion</h3>
            <div className="flex-1 border-2 border-dashed border-gray-100 rounded-2xl p-8 flex flex-col items-center justify-center hover:bg-gray-50 transition-all">
               <Upload className={`w-10 h-10 ${policyFile ? 'text-indigo-600' : 'text-gray-200'}`} />
               <label className="mt-4 cursor-pointer transform active:scale-95 transition-transform">
                  <span className="bg-black text-white px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest shadow-xl shadow-black/10"> {policyFile ? 'Change PDF' : 'Select PDF'} </span>
                  <input type="file" accept=".pdf" className="hidden" onChange={handlePolicyChange} />
               </label>
               {policyFile && <p className="mt-4 text-[10px] font-black text-gray-400 bg-gray-50 px-3 py-1 rounded truncate max-w-[150px] uppercase tracking-tighter"> {policyFile.name} </p>}
            </div>
            <button onClick={handleExtractPolicy} disabled={!policyFile || loadingPolicy} className="w-full mt-6 bg-black text-white py-4 rounded-2xl font-black text-sm uppercase tracking-widest disabled:opacity-20 transition-all">
              {loadingPolicy ? 'Extracting...' : 'Extract Clauses'}
            </button>
          </div>
          {/* Dataset */}
          <div className="bg-white rounded-3xl shadow-xl p-8 border border-gray-100 h-full flex flex-col">
            <h3 className="text-xl font-bold mb-6 flex items-center justify-center"><FileSpreadsheet className="w-5 h-5 mr-2 text-cyan-500"/> Dataset Upload</h3>
            <div className="flex-1 border-2 border-dashed border-gray-100 rounded-2xl p-8 flex flex-col items-center justify-center hover:bg-cyan-50/20 transition-all">
               <Upload className={`w-10 h-10 ${datasetFile ? 'text-cyan-600' : 'text-gray-200'}`} />
               <label className="mt-4 cursor-pointer transform active:scale-95 transition-transform">
                  <span className="bg-cyan-600 text-white px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest shadow-xl shadow-cyan-600/10"> {datasetFile ? 'Change CSV' : 'Select CSV'} </span>
                  <input type="file" accept=".csv" className="hidden" onChange={handleDatasetChange} />
               </label>
               {datasetFile && <p className="mt-4 text-[10px] font-black text-cyan-600 bg-cyan-50 px-3 py-1 rounded truncate max-w-[150px] uppercase tracking-tighter border border-cyan-100"> {datasetFile.name} </p>}
               {datasetMsg && <span className="mt-2 text-[10px] font-black text-cyan-600/40 uppercase tracking-widest"> {datasetMsg} </span>}
            </div>
          </div>
        </div>

        {/* -- STEP 1.5: EXTRACTED CLAUSES -- */}
        {clauses.length > 0 && (
          <div className="mt-6 animate-in fade-in duration-500">
            <h2 className="text-xl font-semibold mb-3">Extracted Clauses</h2>
            <ul className="space-y-4">
              {clauses.map((c, i) => (
                <li key={i} className="bg-gray-100 p-4 rounded-xl text-gray-700 border border-gray-200">
                  {c}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* -- STEP 2: SCHEMA MAPPING -- */}
        {(clauses.length > 0 || datasetColumns.length > 0) && (
          <div className="bg-white rounded-3xl shadow-xl p-8 border border-gray-100 animate-in slide-in-from-bottom-5 duration-700">
             <div className="text-center mb-10">
                <h2 className="text-3xl font-black uppercase tracking-tighter italic">Schema Mapping</h2>
                <p className="text-gray-400 text-sm font-medium">Automatic Field Alignment</p>
             </div>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div className="p-6 bg-indigo-50/30 rounded-2xl border border-indigo-50">
                   <h4 className="text-[10px] uppercase font-black text-indigo-400 mb-4 tracking-[0.2em] flex items-center"><Layers className="w-3 h-3 mr-2"/> Rule Fields</h4>
                   <div className="flex flex-wrap gap-2"> {ruleFields.map(f => <span key={f} className="px-3 py-1.5 bg-white text-indigo-700 text-xs font-bold rounded-lg border border-indigo-100 shadow-sm">{f}</span>)} </div>
                </div>
                <div className="p-6 bg-cyan-50/30 rounded-2xl border border-cyan-50">
                   <h4 className="text-[10px] uppercase font-black text-cyan-400 mb-4 tracking-[0.2em] flex items-center"><Database className="w-3 h-3 mr-2"/> Detected Columns</h4>
                   <div className="flex flex-wrap gap-2"> {datasetColumns.length > 0 ? datasetColumns.map(c => <span key={c} className="px-2.5 py-1.5 bg-white text-cyan-700 text-xs font-bold rounded-lg border border-cyan-100 shadow-sm">{c}</span>) : <span className="text-xs text-gray-300 italic">Dataset required</span>} </div>
                </div>
             </div>
             <button onClick={handleRunMapping} disabled={loadingMapping || datasetColumns.length === 0} className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-indigo-700 transition shadow-xl shadow-indigo-100 disabled:opacity-10 active:scale-95">
                {loadingMapping ? 'Mapping fields...' : 'Run AI Mapping'}
             </button>
             {mappings.length > 0 && (
               <div className="mt-10 overflow-hidden border border-gray-50 rounded-2xl shadow-inner bg-gray-50/10">
                  <table className="w-full text-left">
                     <thead className="bg-gray-50/50 border-b border-gray-50 text-[10px] font-black uppercase tracking-widest text-gray-400">
                        <tr><th className="px-6 py-4">Rule Field</th><th className="px-6 py-4">Dataset Column</th><th className="px-6 py-4">Confidence</th></tr>
                     </thead>
                     <tbody className="divide-y divide-gray-50 font-bold text-xs uppercase tracking-tight">
                        {mappings.map((m, i) => <tr key={i} className="hover:bg-indigo-50/20 transition-colors"><td className="px-6 py-4">{m.rule_field}</td><td className="px-6 py-4 text-gray-500 font-mono">{m.mapped_column}</td><td className="px-6 py-4"><span className={`px-2 py-0.5 rounded ${m.confidence > 0.8 ? 'bg-green-50 text-green-600' : 'bg-yellow-50 text-yellow-600'}`}>{(m.confidence*100).toFixed(0)}%</span></td></tr>)}
                     </tbody>
                  </table>
               </div>
             )}
          </div>
        )}

        {/* -- STEP 3: COMPLIANCE REPORT -- */}
        {mappings.length > 0 && (
          <div className="space-y-8 animate-in slide-in-from-bottom-10 duration-1000">
            <div className="flex flex-col items-center text-center space-y-4">
               <ShieldCheck className="w-12 h-12 text-black animate-pulse" />
               <h1 className="text-4xl font-black uppercase tracking-tighter">Compliance Report</h1>
               <p className="text-gray-400 max-w-sm">Final violation analysis and AI-generated insights across your enterprise dataset.</p>
               <button onClick={handleGenerateReport} disabled={loadingReport} className="mt-4 px-10 py-5 bg-black text-white rounded-3xl font-black text-lg tracking-wide hover:scale-105 active:scale-95 transition-all shadow-2xl shadow-black/20 uppercase flex items-center">
                  {loadingReport ? <><Loader2 className="w-5 h-5 mr-3 animate-spin" /> Analyzing data...</> : "Generate Final Report →"}
               </button>
            </div>

            {reportData && (
              <div className="space-y-8">
                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                   <div className="p-8 bg-white rounded-3xl border border-gray-100 shadow-xl flex flex-col items-center text-center group hover:bg-gray-900 transition-colors">
                      <Database className="w-8 h-8 text-gray-300 group-hover:text-gray-500 mb-4" />
                      <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 group-hover:text-gray-600">Total Rows Processed</span>
                      <h4 className="text-4xl font-black tracking-tighter mt-1 group-hover:text-white transition-colors">{reportData.summary.total_rows}</h4>
                   </div>
                   <div className="p-8 bg-white border border-gray-100 shadow-xl rounded-3xl flex flex-col items-center text-center group hover:bg-red-600 transition-colors">
                      <AlertCircle className="w-8 h-8 text-red-100 group-hover:text-red-400 mb-4" />
                      <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 group-hover:text-red-200">Policy Violations Found</span>
                      <h4 className="text-4xl font-black tracking-tighter mt-1 text-red-600 group-hover:text-white transition-colors">{reportData.summary.violations}</h4>
                   </div>
                   <div className={`p-8 bg-white border border-gray-100 shadow-xl rounded-3xl flex flex-col items-center text-center group hover:bg-green-600 transition-colors`}>
                      {reportData.summary.compliance_rate > 80 ? <TrendingUp className="w-8 h-8 text-green-100 group-hover:text-green-400 mb-4" /> : <TrendingDown className="w-8 h-8 text-yellow-100 group-hover:text-yellow-400 mb-4" />}
                      <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 group-hover:text-green-100">Overall Compliance Rate</span>
                      <h4 className={`text-4xl font-black tracking-tighter mt-1 ${reportData.summary.compliance_rate > 80 ? 'text-green-600' : 'text-yellow-600'} group-hover:text-white transition-colors`}>{reportData.summary.compliance_rate}%</h4>
                   </div>
                </div>

                {/* Severity Chart (Inlined Div Bars) */}
                <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-xl">
                   <div className="flex items-center justify-between mb-8">
                       <h3 className="text-xl font-bold flex items-center uppercase tracking-tight"> <BarChart3 className="w-5 h-5 mr-3 text-indigo-500" /> Severity Metadata Breakdown</h3>
                       <span className="text-[10px] font-black bg-gray-50 px-3 py-1 rounded-full uppercase tracking-widest text-gray-400">Policy Violation Types</span>
                   </div>
                   <div className="space-y-6">
                      {['high', 'medium', 'low'].map((sev) => {
                         const count = reportData.metrics[sev as keyof typeof reportData.metrics] || 0;
                         const percentage = (count / (reportData.summary.violations || 1)) * 100;
                         const color = sev === 'high' ? 'bg-red-500' : sev === 'medium' ? 'bg-yellow-500' : 'bg-green-500';
                         return (
                           <div key={sev} className="space-y-2">
                              <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                                 <span>{sev} Priority</span>
                                 <span className="text-gray-400">{count} incidents</span>
                              </div>
                              <div className="h-3 w-full bg-gray-50 rounded-full overflow-hidden">
                                 <div className={`h-full ${color} transition-all duration-1000 ease-out`} style={{ width: `${percentage}%` }} />
                              </div>
                           </div>
                         );
                      })}
                   </div>
                </div>

                {/* Violations Table */}
                <div className="bg-white rounded-3xl border border-gray-100 shadow-xl overflow-hidden">
                   <div className="p-8 border-b border-gray-50 flex items-center space-x-3"> <PieChart className="w-5 h-5 text-red-500" /> <h3 className="text-xl font-bold tracking-tight uppercase">AI Reasoned Violations</h3></div>
                   <div className="overflow-x-auto">
                      <table className="w-full text-left">
                        <thead className="bg-gray-50/50 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 border-b border-gray-50">
                           <tr><th className="px-6 py-5">Row</th><th className="px-6 py-5">Value</th><th className="px-6 py-5">Rule</th><th className="px-6 py-5">Severity</th><th className="px-6 py-5">AI Explanation</th></tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50 font-bold text-xs">
                           {reportData.violations.map((v) => (
                             <tr key={v.violation_id} className="hover:bg-gray-50/50 transition-colors"><td className="px-6 py-6 font-mono text-[10px] text-gray-400">#{v.row_index}</td><td className="px-6 py-6 text-black uppercase tracking-tight">{v.value ?? 'null'} <span className="block text-[9px] text-gray-300 font-medium">in {v.column}</span></td><td className="px-6 py-6 font-mono text-gray-500 font-medium">{v.rule}</td><td className="px-6 py-6"><span className={`px-3 py-1 rounded-full uppercase text-[9px] tracking-widest border ${getSeverityColor(v.severity)}`}>{v.severity}</span></td><td className="px-6 py-6 text-gray-500 max-w-sm leading-relaxed font-medium italic">"{v.explanation}"</td></tr>
                           ))}
                        </tbody>
                      </table>
                   </div>
                </div>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
