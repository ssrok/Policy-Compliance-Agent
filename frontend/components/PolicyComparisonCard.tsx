import React from "react";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface PolicyComparisonCardProps {
  policy: any;
  isSelected: boolean;
  onClick: () => void;
  isCombined?: boolean;
}

export default function PolicyComparisonCard({
  policy,
  isSelected,
  onClick,
  isCombined,
}: PolicyComparisonCardProps) {
  const { delta, percent_change } = policy.comparison;
  
  // Logic for color and risk level:
  // "small change -> yellow"
  const isSmallChange = Math.abs(percent_change) <= 5;
  const isIncrease = delta > 0 && !isSmallChange;
  const isDecrease = delta < 0 && !isSmallChange;

  let colorClasses = "text-amber-600 bg-amber-50 ring-amber-500/30 ring-1";
  let icon = <Minus className="w-4 h-4" />;
  let riskLevel = "Medium Risk";
  let riskColor = "bg-amber-100 text-amber-700";

  if (isIncrease) {
    colorClasses = "text-red-600 bg-red-50 ring-red-500/30 ring-1";
    icon = <TrendingUp className="w-4 h-4" />;
    riskLevel = "High Risk";
    riskColor = "bg-red-100 text-red-700";
  } else if (isDecrease) {
    colorClasses = "text-emerald-600 bg-emerald-50 ring-emerald-500/30 ring-1";
    icon = <TrendingDown className="w-4 h-4" />;
    riskLevel = "Low Risk";
    riskColor = "bg-emerald-100 text-emerald-700";
  }

  return (
    <div
      onClick={onClick}
      className={cn(
        "cursor-pointer rounded-2xl p-5 border transition-all duration-300 relative min-w-[280px] max-w-[320px] shrink-0 bg-white",
        isSelected 
          ? "bg-indigo-50/50 border-indigo-500 shadow-lg shadow-indigo-100 ring-1 ring-indigo-500" 
          : "shadow-sm hover:shadow-md hover:border-slate-300 hover:-translate-y-1",
        !isSelected && isCombined ? "border-slate-300 border-dashed border-2" : 
        !isSelected ? "border-slate-200" : ""
      )}
    >
      <div className="flex justify-between items-start mb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded tracking-widest uppercase">{policy.policy_id}</span>
            {isCombined && (
              <span className="text-[10px] font-bold text-indigo-500 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100 uppercase tracking-widest">Combined</span>
            )}
          </div>
          <h4 className="font-bold text-slate-900 mt-2 text-base truncate" title={policy.name}>{policy.name}</h4>
        </div>
        <div className={cn("px-2.5 py-1 text-[10px] font-bold rounded-full uppercase tracking-wider shrink-0 ml-2", riskColor)}>
          {riskLevel}
        </div>
      </div>
      
      <div className="flex items-end gap-3 mt-6">
        <div className="flex-1">
          <div className="text-3xl font-black text-slate-800 tracking-tight leading-none mb-1">
            {policy.comparison.new_total.toLocaleString()}
          </div>
          <div className="text-xs text-slate-500 font-medium whitespace-nowrap">
            Projected Violations
          </div>
        </div>
        <div className="flex-col flex items-end">
           <div className={cn("flex flex-col items-end justify-center rounded-xl p-2", colorClasses)}>
             <div className="flex items-center gap-1 font-black text-sm">
               {icon}
               {delta > 0 ? "+" : ""}{delta}
             </div>
             <span className="text-[10px] font-bold uppercase tracking-widest opacity-80 mt-0.5 whitespace-nowrap">
               {percent_change > 0 ? "+" : ""}{percent_change}% Change
             </span>
           </div>
        </div>
      </div>
    </div>
  );
}
