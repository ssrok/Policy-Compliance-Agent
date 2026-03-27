"use client";

import React from "react";
import { useDashboard } from "@/lib/context/dashboard-context";
import { 
  Layers, 
  Database, 
  Search, 
  Loader2, 
  ChevronRight, 
  ShieldCheck,
  Zap,
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import Link from "next/link";

export default function SchemaMappingPage() {
  const { 
    ruleFields, 
    datasetState, 
    mappingState, 
    handleRunMapping 
  } = useDashboard();
  const { columns: datasetColumns } = datasetState;
  const { mappings, loading: loadingMapping, error: mappingError } = mappingState;

  return (
    <div className="space-y-12 animate-in slide-in-from-bottom-5 duration-700">
      <div className="text-center space-y-4">
        <h1 className="text-5xl font-black uppercase tracking-tighter italic">Schema <span className="text-indigo-600">Mapping</span></h1>
        <p className="text-gray-400 max-w-lg mx-auto font-medium font-mono uppercase tracking-widest text-[10px]">Step 03: Automatic field alignment using NLP transformer logic</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
         <div className="bg-white p-12 rounded-[40px] shadow-2xl shadow-indigo-100/30 border border-indigo-50 space-y-8 flex flex-col group transition-all duration-500 hover:scale-[1.02]">
            <div className="p-5 bg-indigo-50 rounded-2xl w-fit group-hover:bg-indigo-600 transition-colors duration-500">
               <Layers className="w-8 h-8 text-indigo-500 group-hover:text-white" />
            </div>
            <div className="space-y-4 flex-1">
               <h3 className="text-2xl font-black uppercase tracking-tight italic">Rule Fields <span className="text-gray-300 font-medium font-mono not-italic uppercase text-xs tracking-widest block mt-1">Found in Policy clauses</span></h3>
               <div className="flex flex-wrap gap-2">
                  {ruleFields.map(f => (
                    <span key={f} className="px-4 py-2 bg-indigo-50/50 text-indigo-700 text-[10px] font-black uppercase tracking-tighter rounded-xl border border-indigo-100 shadow-sm shadow-indigo-50 hover:bg-white hover:shadow-xl transition-all duration-300 cursor-default">
                       {f}
                    </span>
                  ))}
               </div>
            </div>
         </div>

         <div className="bg-white p-12 rounded-[40px] shadow-2xl shadow-cyan-100/30 border border-cyan-50 space-y-8 flex flex-col group transition-all duration-500 hover:scale-[1.02]">
            <div className="p-5 bg-cyan-50 rounded-2xl w-fit group-hover:bg-cyan-600 transition-colors duration-500">
               <Database className="w-8 h-8 text-cyan-500 group-hover:text-white" />
            </div>
            <div className="space-y-4 flex-1">
               <h3 className="text-2xl font-black uppercase tracking-tight italic">Dataset Columns <span className="text-gray-300 font-medium font-mono not-italic uppercase text-xs tracking-widest block mt-1">Parsed from CSV Header</span></h3>
               <div className="flex flex-wrap gap-2">
                  {datasetColumns.length > 0 ? datasetColumns.map(c => (
                    <span key={c} className="px-4 py-2 bg-cyan-50/50 text-cyan-700 text-[10px] font-black uppercase tracking-tighter rounded-xl border border-cyan-100 shadow-sm shadow-cyan-50 hover:bg-white hover:shadow-xl transition-all duration-300 cursor-default">
                       {c}
                    </span>
                  )) : (
                    <div className="flex items-center space-x-2 text-gray-300 italic py-4 animate-in fade-in duration-500">
                       <Search className="w-4 h-4" />
                       <span className="text-xs font-medium">Dataset required for mapping...</span>
                    </div>
                  )}
               </div>
            </div>
         </div>
      </div>

      <div className="flex flex-col items-center space-y-12">
         <button 
           onClick={handleRunMapping} 
           disabled={loadingMapping || datasetColumns.length === 0} 
           className="px-20 py-8 bg-black text-white rounded-[32px] font-black text-xl uppercase tracking-[0.5em] shadow-2xl shadow-black/20 hover:scale-105 active:scale-95 transition-all flex items-center group relative overflow-hidden hover-bounce"
         >
           <div className="absolute inset-x-0 bottom-0 top-0 w-0 bg-indigo-600 transition-all duration-[2000ms] group-disabled:w-full group-disabled:bg-gray-100/5 pointer-events-none" />
           <Zap className={`w-8 h-8 mr-6 text-yellow-400 ${loadingMapping && 'animate-pulse'}`} />
           {loadingMapping ? <span className="shimmer-bg px-4 py-1 rounded-lg">Running Alignment Inference...</span> : 'Auto-Map Fields'}
           {loadingMapping && <Loader2 className="w-6 h-6 ml-6 animate-spin" />}
         </button>

         {mappingError && (
            <div className="flex items-center space-x-3 text-red-500 bg-red-50 px-10 py-5 rounded-[24px] border border-red-100 animate-in shake-in">
               <AlertCircle className="w-5 h-5" />
               <span className="text-sm font-black uppercase tracking-widest italic">{mappingError}</span>
            </div>
         )}

         {mappings.length === 0 && !loadingMapping && (
            <div className="p-20 text-center space-y-4 opacity-50 empty-state-glow">
               <Layers className="w-16 h-16 mx-auto text-gray-200" />
               <p className="text-xs font-black uppercase tracking-widest text-gray-400 font-mono italic">Ready for alignment inference. Execute Auto-Map to proceed.</p>
            </div>
         )}

         {mappings.length > 0 && (
            <div className="w-full bg-white rounded-[48px] shadow-2xl shadow-gray-100 p-12 border border-blue-50 space-y-12 animate-scale-in">
               <div className="flex items-center justify-between border-b border-gray-50 pb-10">
                  <h2 className="text-4xl font-black uppercase tracking-tighter italic">Mapping <span className="text-indigo-600">Inference</span></h2>
                  <div className="success-badge">
                     <CheckCircle2 className="w-4 h-4" />
                     <span className="text-[10px] font-black text-green-600 uppercase tracking-widest">Logic Aligned</span>
                  </div>
               </div>

               <div className="overflow-hidden border border-gray-50 rounded-[32px] shadow-inner bg-gray-50/10">
                  <table className="w-full text-left">
                     <thead className="bg-gray-900 border-b border-gray-50 text-[11px] font-black uppercase tracking-[0.3em] text-gray-400">
                        <tr>
                           <th className="px-10 py-8">Rule Field Target</th>
                           <th className="px-10 py-8">Dataset Candidate</th>
                           <th className="px-10 py-8">Confidence %</th>
                        </tr>
                     </thead>
                     <tbody className="divide-y divide-gray-50 font-bold text-xs uppercase tracking-tight italic">
                        {mappings.map((m, i) => (
                          <tr key={i} className="hover:bg-indigo-50 transition-colors duration-300">
                             <td className="px-10 py-10 text-indigo-600 font-black">{m.rule_field}</td>
                             <td className="px-10 py-10 text-gray-500 font-mono tracking-tighter font-medium not-italic">{m.mapped_column}</td>
                             <td className="px-10 py-10">
                                <span className={`px-4 py-2 rounded-xl border font-black not-italic ${m.confidence > 0.8 ? 'bg-green-50 text-green-600 border-green-100' : 'bg-yellow-50 text-yellow-600 border-yellow-100'}`}>
                                   {(m.confidence*100).toFixed(0)}% Match
                                </span>
                             </td>
                          </tr>
                        ))}
                     </tbody>
                  </table>
               </div>

               <div className="flex justify-center pt-8">
                  <Link 
                    href="/dashboard/compliance-report" 
                    className="bg-black text-white px-12 py-6 rounded-3xl font-black text-xl uppercase tracking-widest hover:scale-105 active:scale-95 transition-all flex items-center shadow-2xl shadow-black/20"
                  >
                    Generate Report <ChevronRight className="w-6 h-6 ml-3 text-indigo-400" />
                  </Link>
               </div>
            </div>
         )}
      </div>
    </div>
  );
}
