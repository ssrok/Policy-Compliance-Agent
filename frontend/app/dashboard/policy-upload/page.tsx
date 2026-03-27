"use client";

import React from "react";
import { useDashboard } from "@/lib/context/dashboard-context";
import { 
  FileText, 
  Upload, 
  ChevronRight, 
  CheckCircle2, 
  AlertCircle 
} from "lucide-react";
import Link from "next/link";

export default function PolicyUploadPage() {
  const { 
    policyState,
    handlePolicyChange, 
    handleExtractPolicy 
  } = useDashboard();
  const { file: policyFile, clauses, loading: loadingPolicy, error: policyError } = policyState;

  return (
    <div className="space-y-12 animate-in slide-in-from-bottom-5 duration-700">
      <div className="text-center space-y-4">
        <h1 className="text-5xl font-black uppercase tracking-tighter italic">Policy <span className="text-indigo-600">Ingestion</span></h1>
        <p className="text-gray-400 max-w-lg mx-auto font-medium font-mono uppercase tracking-widest text-[10px]">Step 01: Extract compliance rules from PDF documents</p>
      </div>

      <div className="bg-white rounded-[40px] shadow-2xl shadow-indigo-100/50 p-16 border border-indigo-50 flex flex-col items-center text-center space-y-10 group">
         <div className={`p-8 rounded-[32px] transition-all transform group-hover:scale-110 duration-500 ${policyFile ? 'bg-indigo-600 text-white' : 'bg-indigo-50 text-indigo-200'}`}>
            <Upload className="w-16 h-16" />
         </div>
         
         <div className="space-y-4 w-full max-w-md">
            <h2 className="text-3xl font-black uppercase tracking-tight italic">Select Policy Document</h2>
            <p className="text-gray-400 font-medium">Upload a PDF file containing your enterprise data policies (e.g., retention, audit, security).</p>
         </div>

         <div className="flex flex-col items-center w-full space-y-6">
            <label className="cursor-pointer transform active:scale-95 transition-all w-full max-w-sm">
               <span className="block bg-black text-white px-8 py-6 rounded-3xl text-sm font-black uppercase tracking-[0.2em] shadow-2xl shadow-black/20 hover:scale-[1.02] transition-all"> 
                  {policyFile ? 'Change PDF File' : 'Select PDF File'} 
               </span>
               <input type="file" accept=".pdf" className="hidden" onChange={handlePolicyChange} />
            </label>
            
            {policyFile && (
              <div className="flex items-center space-x-3 px-6 py-3 bg-indigo-50 rounded-2xl border border-indigo-100 animate-in fade-in duration-500">
                 <FileText className="w-4 h-4 text-indigo-500" />
                 <span className="text-xs font-black text-indigo-600 uppercase tracking-tighter">{policyFile.name}</span>
                 <CheckCircle2 className="w-4 h-4 text-indigo-400 ml-2" />
              </div>
            )}
         </div>

         <button 
           onClick={handleExtractPolicy} 
           disabled={!policyFile || loadingPolicy} 
           className="w-full max-w-sm bg-indigo-600 text-white py-6 rounded-3xl font-black text-lg uppercase tracking-[0.3em] disabled:opacity-5 shadow-2xl shadow-indigo-200 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center italic hover-bounce"
         >
           {loadingPolicy ? (
             <span className="flex items-center shimmer-bg px-8 py-2 rounded-xl">Analyzing Document...</span>
           ) : (
             <span className="flex items-center uppercase font-black not-italic tracking-widest">Extract Clauses <ChevronRight className="w-6 h-6 ml-2" /></span>
           )}
         </button>

         {policyError && (
           <div className="flex items-center space-x-2 text-red-500 bg-red-50 px-6 py-3 rounded-2xl border border-red-100 animate-in shake-in">
              <AlertCircle className="w-4 h-4" />
              <span className="text-xs font-black uppercase tracking-widest">{policyError}</span>
           </div>
         )}
      </div>

      {!loadingPolicy && clauses.length === 0 && policyFile && (
        <div className="p-20 text-center space-y-4 opacity-50 empty-state-glow">
           <FileText className="w-16 h-16 mx-auto text-gray-200" />
           <p className="text-xs font-black uppercase tracking-widest text-gray-400 font-mono italic">Policy loaded. Extraction required to proceed.</p>
        </div>
      )}

      {clauses.length > 0 && (
        <div className="bg-white rounded-[40px] shadow-2xl shadow-gray-100/50 p-12 border border-blue-50 space-y-10 animate-scale-in">
           <div className="flex items-center justify-between border-b border-gray-50 pb-8">
              <h2 className="text-3xl font-black uppercase tracking-tighter italic">Extracted <span className="text-indigo-600">Clauses</span></h2>
              <div className="success-badge">
                 <CheckCircle2 className="w-4 h-4" />
                 <span>{clauses.length} Rules extracted</span>
              </div>
           </div>
           
           <div className="grid grid-cols-1 gap-4">
              {clauses.map((c, i) => (
                <div key={i} className="group p-8 bg-gray-50 rounded-3xl border border-gray-100 hover:bg-white hover:border-indigo-100 hover:shadow-xl transition-all duration-300">
                   <div className="flex items-start space-x-4">
                      <div className="mt-1 flex items-center justify-center w-8 h-8 rounded-xl bg-white text-[10px] font-black text-indigo-500 border border-indigo-50 shadow-sm group-hover:bg-indigo-600 group-hover:text-white transition-colors">{i+1}</div>
                      <p className="text-gray-600 leading-relaxed font-medium italic group-hover:text-black transition-colors">"{c}"</p>
                   </div>
                </div>
              ))}
           </div>

           <div className="flex justify-center pt-8">
              <Link 
                href="/dashboard/dataset-upload" 
                className="bg-black text-white px-10 py-5 rounded-2xl font-black text-lg uppercase tracking-widest hover:scale-105 active:scale-95 transition-all flex items-center shadow-xl shadow-black/10"
              >
                Continue to Dataset <ChevronRight className="w-6 h-6 ml-3" />
              </Link>
           </div>
        </div>
      )}
    </div>
  );
}
