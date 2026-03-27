"use client";

import React from "react";
import { useDashboard } from "@/lib/context/dashboard-context";
import { 
  FileSpreadsheet, 
  Upload, 
  Table as TableIcon, 
  CheckCircle2, 
  AlertCircle,
  Database,
  Search,
  ChevronRight
} from "lucide-react";
import Link from "next/link";

export default function DatasetUploadPage() {
  const { 
    datasetState, 
    handleDatasetChange 
  } = useDashboard();
  const { file: datasetFile, columns: datasetColumns, rows: datasetRows, msg: datasetMsg } = datasetState;

  return (
    <div className="space-y-12 animate-in slide-in-from-bottom-5 duration-700">
      <div className="text-center space-y-4">
        <h1 className="text-5xl font-black uppercase tracking-tighter italic">Dataset <span className="text-cyan-600">Upload</span></h1>
        <p className="text-gray-400 max-w-lg mx-auto font-medium font-mono uppercase tracking-widest text-[10px]">Step 02: Ingest enterprise dataset for compliance analysis</p>
      </div>

      <div className="bg-white rounded-[40px] shadow-2xl shadow-cyan-100/30 p-16 border border-cyan-50 flex flex-col items-center text-center space-y-10 group">
         <div className={`p-8 rounded-[32px] transition-all transform group-hover:scale-110 duration-500 ${datasetFile ? 'bg-cyan-600 text-white' : 'bg-cyan-50 text-cyan-200'}`}>
            <FileSpreadsheet className="w-16 h-16" />
         </div>
         
         <div className="space-y-4 w-full max-w-md">
            <h2 className="text-3xl font-black uppercase tracking-tight italic">Select Data Source</h2>
            <p className="text-gray-400 font-medium font-mono uppercase tracking-[0.05em] text-[11px]">System currently supports CSV, XLSX, and SQL Exports</p>
         </div>

         <div className="flex flex-col items-center w-full space-y-6">
            <label className="cursor-pointer transform active:scale-95 transition-all w-full max-w-sm">
               <span className="block bg-black text-white px-8 py-6 rounded-3xl text-sm font-black uppercase tracking-[0.2em] shadow-2xl shadow-black/20 hover:scale-[1.02] transition-all"> 
                  {datasetFile ? 'Change Dataset' : 'Select Dataset'} 
               </span>
               <input type="file" accept=".csv" className="hidden" onChange={handleDatasetChange} />
            </label>
            
            {datasetFile && (
              <div className="flex items-center space-x-3 px-6 py-3 bg-cyan-50 rounded-2xl border border-cyan-100 animate-in fade-in duration-500">
                 <Database className="w-4 h-4 text-cyan-500" />
                 <span className="text-xs font-black text-cyan-600 uppercase tracking-tighter">{datasetFile.name}</span>
                 <CheckCircle2 className="w-4 h-4 text-cyan-400 ml-2" />
              </div>
            )}
            
            {datasetMsg && (
              <p className="text-[10px] font-black uppercase tracking-widest text-cyan-400/60 animate-in slide-in-from-top-2">
                 {datasetMsg}
              </p>
            )}
         </div>
         
         <div className="flex justify-center w-full max-w-sm">
            <Link 
              href="/dashboard/schema-mapping" 
              className={`w-full bg-cyan-600 text-white py-6 rounded-3xl font-black text-lg uppercase tracking-[0.3em] shadow-2xl shadow-cyan-200 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center italic hover-bounce ${!datasetFile && 'opacity-10 pointer-events-none'}`}
            >
              Continue to Mapping <ChevronRight className="w-6 h-6 ml-2" />
            </Link>
         </div>
      </div>

      {!datasetFile && (
        <div className="p-20 text-center space-y-4 opacity-50 empty-state-glow">
           <Database className="w-16 h-16 mx-auto text-gray-200" />
           <p className="text-xs font-black uppercase tracking-widest text-gray-400 font-mono italic">No dataset source detected. Waiting for ingestion.</p>
        </div>
      )}

      {datasetColumns.length > 0 && (
         <div className="bg-white rounded-[40px] shadow-2xl shadow-gray-100/50 overflow-hidden border border-gray-100 animate-in slide-in-from-bottom-10 duration-1000">
            <div className="p-12 border-b border-gray-50 flex items-center justify-between">
               <div>
                  <h2 className="text-3xl font-black uppercase tracking-tighter italic">Data <span className="text-gray-300 font-medium">Structure</span></h2>
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mt-1">{datasetColumns.length} Total Columns Identified</p>
               </div>
               <div className="success-badge scale-90">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Verified OK</span>
               </div>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-0 px-8 py-8 bg-gray-50/10">
               {datasetColumns.map((col, index) => (
                  <div key={index} className="p-8 border-[0.5px] border-gray-50 flex flex-col items-center justify-center text-center space-y-4 hover:bg-white hover:shadow-2xl hover:border-indigo-50 transition-all group cursor-default">
                     <div className="p-3 bg-white rounded-xl shadow-sm text-gray-200 group-hover:text-cyan-500 transition-colors">
                        <TableIcon className="w-5 h-5" />
                     </div>
                     <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 group-hover:text-black transition-colors">{col}</span>
                  </div>
               ))}
            </div>
            
            <div className="px-12 py-10 bg-gray-50 flex items-center justify-between">
               <div className="flex space-x-6">
                  <div className="flex flex-col">
                     <span className="text-[9px] font-black uppercase tracking-widest text-gray-400">Sample Count</span>
                     <span className="text-xl font-black text-black italic">{datasetRows.length} Records</span>
                  </div>
                  <div className="flex flex-col">
                     <span className="text-[9px] font-black uppercase tracking-widest text-gray-400">Total Size</span>
                     <span className="text-xl font-black text-black italic">~{(datasetFile?.size || 0 / 1024).toFixed(1)} KB</span>
                  </div>
               </div>
               <div className="flex items-center space-x-2 px-6 py-3 bg-white rounded-2xl border border-gray-100 shadow-sm text-[10px] font-black uppercase tracking-widest text-green-500">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Validation Passed</span>
               </div>
            </div>
         </div>
      )}
    </div>
  );
}
