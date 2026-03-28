import React, { useState, useMemo } from "react";
import { ArrowUpDown, ArrowDown, ArrowUp, Search, AlertTriangle, CheckCircle } from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export interface UnifiedRule {
  rule: string;
  new_violations: number;
  resolved_violations: number;
  impact_percent: number;
  net_impact: number;
}

interface RuleImpactTableProps {
  rules: UnifiedRule[];
}

type SortField = "rule" | "new_violations" | "impact_percent" | "net_impact";
type SortDirection = "asc" | "desc";

export default function RuleImpactTable({ rules }: RuleImpactTableProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortField, setSortField] = useState<SortField>("net_impact");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("desc"); // default desc for new fields
    }
  };

  const filteredAndSortedRules = useMemo(() => {
    return rules
      .filter((r) => r.rule.toLowerCase().includes(searchTerm.toLowerCase()))
      .sort((a, b) => {
        let aVal = a[sortField];
        let bVal = b[sortField];
        
        if (typeof aVal === "string" && typeof bVal === "string") {
          return sortDirection === "asc" 
            ? aVal.localeCompare(bVal) 
            : bVal.localeCompare(aVal);
        } else {
          return sortDirection === "asc" 
            ? (aVal as number) - (bVal as number) 
            : (bVal as number) - (aVal as number);
        }
      });
  }, [rules, searchTerm, sortField, sortDirection]);

  // Determine top rule to highlight
  const topRule = useMemo(() => {
    const rulesWithPositiveImpact = rules.filter(r => r.net_impact > 0);
    if (rulesWithPositiveImpact.length === 0) return null;
    return [...rulesWithPositiveImpact].sort((a, b) => b.net_impact - a.net_impact)[0];
  }, [rules]);

  // Helper for Sorting Headers
  const SortHeader = ({ field, label, align = "left" }: { field: SortField, label: string, align?: "left" | "right" }) => (
    <th 
      className={cn("px-4 py-3 cursor-pointer hover:bg-slate-100 transition-colors select-none", align === "right" && "text-right")}
      onClick={() => handleSort(field)}
    >
      <div className={cn("flex items-center gap-1", align === "right" && "justify-end")}>
        {label}
        {sortField === field ? (
          sortDirection === "asc" ? <ArrowUp className="w-3.5 h-3.5 text-indigo-500" /> : <ArrowDown className="w-3.5 h-3.5 text-indigo-500" />
        ) : (
          <ArrowUpDown className="w-3.5 h-3.5 text-slate-300" />
        )}
      </div>
    </th>
  );

  return (
    <div className="flex flex-col h-full w-full">
      {/* Search Input */}
      <div className="mb-4 relative w-full md:w-64">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="w-4 h-4 text-slate-400" />
        </div>
        <input
          type="text"
          placeholder="Search rules..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all font-medium text-slate-700 placeholder:text-slate-400"
        />
      </div>

      {/* Table Container with Sticky Header */}
      <div className="flex-1 overflow-auto rounded-xl border border-slate-200 custom-scrollbar relative">
        <table className="w-full text-left text-sm whitespace-nowrap">
          <thead className="bg-slate-50 text-slate-500 sticky top-0 font-semibold border-b border-slate-200 shadow-sm z-10">
            <tr>
              <SortHeader field="rule" label="Rule" />
              <SortHeader field="new_violations" label="New Violations" align="right" />
              <SortHeader field="impact_percent" label="Impact %" align="right" />
              <SortHeader field="net_impact" label="Net Impact" align="right" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rules.length === 0 ? (
               // Loading Skeleton mapped if entirely empty
               [1, 2, 3, 4].map((row) => (
                 <tr key={row}>
                    <td className="px-4 py-4"><div className="h-4 bg-slate-200 rounded w-2/3 animate-pulse"></div></td>
                    <td className="px-4 py-4"><div className="h-4 bg-slate-200 rounded w-1/2 ml-auto animate-pulse"></div></td>
                    <td className="px-4 py-4"><div className="h-4 bg-slate-200 rounded w-1/2 ml-auto animate-pulse"></div></td>
                    <td className="px-4 py-4"><div className="h-4 bg-slate-200 rounded w-1/3 ml-auto animate-pulse"></div></td>
                 </tr>
               ))
            ) : filteredAndSortedRules.length > 0 ? (
              filteredAndSortedRules.map((r, i) => {
                const isHighlight = topRule && r.rule === topRule.rule && r.net_impact > 0;
                
                return (
                  <tr 
                    key={i} 
                    className={cn(
                      "transition group relative",
                      isHighlight ? "bg-red-50/50 hover:bg-red-50" : "bg-white hover:bg-slate-50"
                    )}
                  >
                    <td className="px-4 py-3 flex items-center gap-2">
                       {isHighlight && <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-red-500"></div>}
                       {r.net_impact > 0 ? (
                         <AlertTriangle className={cn("w-4 h-4 shrink-0", isHighlight ? "text-red-500" : "text-amber-500")} />
                       ) : r.net_impact < 0 ? (
                         <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                       ) : (
                         <div className="w-4 h-4 rounded-full bg-slate-200 flex items-center justify-center text-[8px] text-slate-400 font-bold shrink-0">-</div>
                       )}
                       <span className={cn("font-bold", isHighlight ? "text-red-700" : "text-slate-700")}>
                         {r.rule}
                       </span>
                       {isHighlight && <span className="text-[9px] uppercase tracking-widest bg-red-100 text-red-600 px-1.5 py-0.5 rounded font-bold ml-2 shrink-0">Top Driver</span>}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-slate-600">
                      {r.new_violations > 0 ? `+${r.new_violations}` : "0"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                         <span className={cn("font-medium", r.impact_percent > 30 ? "text-red-600" : "text-slate-500")}>
                           {r.impact_percent > 0 ? `${r.impact_percent.toFixed(1)}%` : "-"}
                         </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right font-bold">
                       <span className={cn(
                         r.net_impact > 0 ? "text-red-600" : r.net_impact < 0 ? "text-emerald-600" : "text-slate-500"
                       )}>
                         {r.net_impact > 0 ? `+${r.net_impact}` : r.net_impact}
                       </span>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={4} className="px-4 py-10 text-center text-slate-400 font-medium">
                  {searchTerm ? "No rules match your search limit." : "No rule impacts detected."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
