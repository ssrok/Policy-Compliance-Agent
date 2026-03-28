import React, { useState, useMemo } from "react";
import { FileSearch, ChevronDown, ChevronRight, Info, AlertTriangle, CheckCircle } from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export interface Explanation {
  row_id: string; 
  change_type: "new" | "resolved";
  rule: string;   
  details: string; 
}

interface ExplainabilityPanelProps {
  explanations: Explanation[] | null;
  filterType?: "all" | "new" | "resolved";
  onFilterChange?: (type: "all" | "new" | "resolved") => void;
}

export default function ExplainabilityPanel({ 
  explanations, 
  filterType: externalFilterType,
  onFilterChange 
}: ExplainabilityPanelProps) {
  const [internalFilterType, setInternalFilterType] = useState<"all" | "new" | "resolved">("all");
  
  const filterType = externalFilterType || internalFilterType;
  const setFilterType = onFilterChange || setInternalFilterType;

  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
  const [visibleCount, setVisibleCount] = useState(50);

  const toggleRow = (index: number) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedRows(newExpanded);
  };

  const filteredExplanations = useMemo(() => {
    if (!explanations) return [];
    return explanations.filter(exp => {
      if (filterType === "all") return true;
      return exp.change_type === filterType;
    });
  }, [explanations, filterType]);

  const visibleExplanations = filteredExplanations.slice(0, visibleCount);
  const hasMore = visibleExplanations.length < filteredExplanations.length;

  const handleLoadMore = () => {
    setVisibleCount(prev => prev + 50);
  };

  return (
    <div className="bg-slate-900 rounded-2xl border border-slate-800 shadow-xl p-6 min-h-[450px] flex flex-col relative overflow-hidden h-full">
      {/* Dark gradient accent */}
      <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"></div>
      
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
         <div className="flex items-center gap-2 text-white text-lg font-bold">
           <FileSearch className="w-5 h-5 text-indigo-400" />
           <h3>Row-level Explainability</h3>
         </div>
         
         <div className="flex bg-white/5 border border-white/10 p-1 rounded-lg">
           <button 
             onClick={() => setFilterType("all")}
             className={cn("px-2.5 py-1 text-xs font-bold rounded-md transition", filterType === "all" ? "bg-white/10 text-white" : "text-slate-400 hover:text-white")}
           >All</button>
           <button 
             onClick={() => setFilterType("new")}
             className={cn("px-2.5 py-1 text-xs font-bold rounded-md transition", filterType === "new" ? "bg-red-500/20 text-red-400" : "text-slate-400 hover:text-white")}
           >New</button>
           <button 
             onClick={() => setFilterType("resolved")}
             className={cn("px-2.5 py-1 text-xs font-bold rounded-md transition", filterType === "resolved" ? "bg-emerald-500/20 text-emerald-400" : "text-slate-400 hover:text-white")}
           >Resolved</button>
         </div>
      </div>
      
      <div className="flex-1 rounded-xl border border-white/10 bg-black/40 overflow-y-auto custom-scrollbar p-1">
        {!explanations ? (
           // Loading Skeleton
           <div className="p-3 space-y-3">
             {[1, 2, 3, 4].map((row) => (
               <div key={row} className="p-4 rounded-lg bg-white/5 border border-white/5 animate-pulse">
                 <div className="flex justify-between items-center mb-3">
                   <div className="h-3 w-24 bg-white/20 rounded"></div>
                   <div className="h-4 w-16 bg-indigo-500/40 rounded-full"></div>
                 </div>
                 <div className="space-y-2">
                   <div className="h-2 w-full bg-white/10 rounded"></div>
                   <div className="h-2 w-4/5 bg-white/10 rounded"></div>
                 </div>
               </div>
             ))}
           </div>
        ) : visibleExplanations.length > 0 ? (
           <div className="flex flex-col gap-1.5 p-2">
             {visibleExplanations.map((exp, i) => {
               const isExpanded = expandedRows.has(i);
               const isNew = exp.change_type === "new";

               return (
                 <div 
                   key={i} 
                   className={cn(
                     "rounded-lg border transition-all duration-200 overflow-hidden", 
                     isExpanded ? "bg-white/10 border-white/20" : "bg-white/5 border-white/5 hover:bg-white/10"
                   )}
                 >
                   {/* Collapsible Header */}
                   <div 
                     className="px-4 py-3 flex items-center justify-between cursor-pointer select-none"
                     onClick={() => toggleRow(i)}
                   >
                     <div className="flex items-center gap-3 overflow-hidden">
                       {isExpanded ? (
                         <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
                       ) : (
                         <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                       )}
                       
                       <div className="font-mono text-xs text-indigo-300 bg-indigo-500/10 px-2 py-0.5 rounded shrink-0">
                         Row #{exp.row_id}
                       </div>
                       
                       <span className="text-sm font-semibold text-slate-200 truncate">
                         {exp.rule}
                       </span>
                     </div>
                     
                     <div className="flex items-center gap-3 shrink-0 ml-4">
                       {isNew ? (
                          <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-red-400 bg-red-400/10 px-2.5 py-0.5 rounded-full border border-red-500/20">
                            <AlertTriangle className="w-3 h-3" />
                            New Violation
                          </div>
                       ) : (
                          <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-400/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
                            <CheckCircle className="w-3 h-3" />
                            Resolved
                          </div>
                       )}
                     </div>
                   </div>

                   {/* Expanded Details */}
                   {isExpanded && (
                     <div className="px-4 pb-4 pt-1 border-t border-white/5 bg-black/20">
                       <div className="mt-3">
                         <h5 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Offending Values / Details</h5>
                         <div className="font-mono text-xs text-slate-300 bg-black/40 border border-white/5 p-3 rounded-lg leading-relaxed break-words">
                           {exp.details || "No further details available for this row violation."}
                         </div>
                       </div>
                     </div>
                   )}
                 </div>
               );
             })}

             {hasMore && (
               <button 
                 onClick={handleLoadMore}
                 className="mt-4 w-full py-2.5 rounded-lg border border-dashed border-white/20 text-sm font-semibold text-slate-400 hover:text-white hover:border-white/40 hover:bg-white/5 transition-all"
               >
                 Load More Rows ({filteredExplanations.length - visibleCount} remaining)
               </button>
             )}
           </div>
        ) : (
           <div className="h-full flex flex-col items-center justify-center text-slate-500 py-20">
              <Info className="w-8 h-8 mb-3 opacity-20" />
              <p className="font-medium text-sm text-slate-400">No explanations matching filter criteria.</p>
           </div>
        )}
      </div>
    </div>
  );
}
