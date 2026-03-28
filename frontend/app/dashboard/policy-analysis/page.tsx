"use client";

import React, { useState } from "react";
import { 
  ShieldAlert, 
  Play,
  BarChart3,
  ListOrdered,
  Table as TableIcon,
  FileSearch,
  Loader2,
  TrendingDown,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Info
} from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import PolicyComparisonCard from "@/components/PolicyComparisonCard";
import RankingPanel from "@/components/RankingPanel";
import ViolationsBarChart from "@/components/ViolationsBarChart";
import ViolationsStackedChart from "@/components/ViolationsStackedChart";
import RuleImpactPieChart from "@/components/RuleImpactPieChart";
import RuleImpactTable from "@/components/RuleImpactTable";
import ExplainabilityPanel from "@/components/ExplainabilityPanel";
import { motion, AnimatePresence } from "framer-motion";

/** Utility for Tailwind class merging */
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// -----------------------------------------------------------------
// MOCK DATA
// -----------------------------------------------------------------
const MOCK_DATA = {
  policies: [
    {
      policy_id: "P1",
      name: "Strict Data Masking",
      comparison: { baseline: 1240, new_total: 1450, delta: 210, percent_change: 16.9 },
      impact_analysis: {
        new_violations: [
          { rule: "PII_MASK_01", count: 180, impact_percent: 69.2 },
          { rule: "CREDIT_CARD_HASH", count: 80, impact_percent: 30.8 }
        ],
        resolved_violations: []
      },
      explanations: [
        { row_id: "1042", change_type: "new", rule: "PII_MASK_01", details: "email field not masked" },
        { row_id: "4401", change_type: "new", rule: "CREDIT_CARD_HASH", details: "cc_hash exposed" }
      ]
    },
    {
      policy_id: "P2",
      name: "Relaxed External Sharing",
      comparison: { baseline: 1240, new_total: 980, delta: -260, percent_change: -21.0 },
      impact_analysis: {
        new_violations: [
          { rule: "EXT_SHARE_05", count: 40, impact_percent: 100 }
        ],
        resolved_violations: [
          { rule: "EXT_SHARE_01", count: 300 }
        ]
      },
      explanations: [
        { row_id: "2055", change_type: "resolved", rule: "EXT_SHARE_01", details: "N/A" },
        { row_id: "8011", change_type: "resolved", rule: "EXT_SHARE_01", details: "N/A" },
        { row_id: "9000", change_type: "new", rule: "EXT_SHARE_05", details: "External email unverified" }
      ]
    },
    {
      policy_id: "P3",
      name: "EU-Only Localization",
      comparison: { baseline: 1240, new_total: 1300, delta: 60, percent_change: 4.8 },
      impact_analysis: {
        new_violations: [
          { rule: "GDPR_DATA_LOC_02", count: 90, impact_percent: 75.0 },
          { rule: "SHREMS_II", count: 30, impact_percent: 25.0 }
        ],
        resolved_violations: []
      },
      explanations: [
        { row_id: "3910", change_type: "new", rule: "GDPR_DATA_LOC_02", details: "country: US, origin: EU" },
        { row_id: "3911", change_type: "new", rule: "SHREMS_II", details: "Data exported outside adequate jurisdiction" }
      ]
    },
    {
      policy_id: "P1+P2",
      name: "Masking + Relaxed Sharing",
      isCombined: true,
      comparison: { baseline: 1240, new_total: 1190, delta: -50, percent_change: -4.0 },
      impact_analysis: {
        new_violations: [
          { rule: "PII_MASK_01", count: 180, impact_percent: 81.8 },
          { rule: "EXT_SHARE_05", count: 40, impact_percent: 18.2 }
        ],
        resolved_violations: [
          { rule: "EXT_SHARE_01", count: 300 }
        ]
      },
      explanations: [
        { row_id: "1042", change_type: "new", rule: "PII_MASK_01", details: "email field not masked" },
        { row_id: "9000", change_type: "new", rule: "EXT_SHARE_05", details: "External email unverified" }
      ]
    },
    {
      policy_id: "P2+P3",
      name: "Sharing + EU Localization",
      isCombined: true,
      comparison: { baseline: 1240, new_total: 1040, delta: -200, percent_change: -16.1 },
      impact_analysis: {
        new_violations: [
          { rule: "GDPR_DATA_LOC_02", count: 90, impact_percent: 56.3 },
          { rule: "EXT_SHARE_05", count: 40, impact_percent: 25.0 },
          { rule: "SHREMS_II", count: 30, impact_percent: 18.7 }
        ],
        resolved_violations: [
          { rule: "EXT_SHARE_01", count: 300 }
        ]
      },
      explanations: [
        { row_id: "3910", change_type: "new", rule: "GDPR_DATA_LOC_02", details: "country: US, origin: EU" },
        { row_id: "2055", change_type: "resolved", rule: "EXT_SHARE_01", details: "N/A" }
      ]
    },
    {
      policy_id: "P1+P2+P3",
      name: "All Policies Combined",
      isCombined: true,
      comparison: { baseline: 1240, new_total: 1250, delta: 10, percent_change: 0.8 },
      impact_analysis: {
        new_violations: [
          { rule: "PII_MASK_01", count: 180, impact_percent: 51.4 },
          { rule: "GDPR_DATA_LOC_02", count: 90, impact_percent: 25.7 },
          { rule: "EXT_SHARE_05", count: 40, impact_percent: 11.4 },
          { rule: "SHREMS_II", count: 30, impact_percent: 8.6 }
        ],
        resolved_violations: [
          { rule: "EXT_SHARE_01", count: 300 }
        ]
      },
      explanations: [
        { row_id: "1042", change_type: "new", rule: "PII_MASK_01", details: "email field not masked" },
        { row_id: "3910", change_type: "new", rule: "GDPR_DATA_LOC_02", details: "country: US, origin: EU" },
        { row_id: "9000", change_type: "new", rule: "EXT_SHARE_05", details: "External email unverified" }
      ]
    }
  ],
  ranking: {
    top_pick: "P2",
    details: [
      { rank: 1, policy_id: "P2", score: 98, reason: "Best reduction in violations (-21%)" },
      { rank: 2, policy_id: "P3", score: 85, reason: "Slight increase (+4.8%)" },
      { rank: 3, policy_id: "P1", score: 42, reason: "Significant increase in violations (+16.9%)" }
    ]
  }
};

export default function PolicyAnalysisPage() {
  const [policies, setPolicies] = useState<any[]>([]);
  const [selectedPolicyId, setSelectedPolicyId] = useState<string>("");
  const [ranking, setRanking] = useState<any>(null);
  
  const [viewMode, setViewMode] = useState<"absolute" | "percentage">("absolute");
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRunAnalysis = () => {
    setIsLoading(true);
    setError(null);
    // Simulate API call with 15% random failure logic
    setTimeout(() => {
      const shouldFail = Math.random() > 0.85;
      if (shouldFail) {
        setError("Analysis engine timed out. Verify baseline schema compatibility and try again.");
      } else {
        setPolicies(MOCK_DATA.policies);
        setRanking(MOCK_DATA.ranking);
        setSelectedPolicyId(MOCK_DATA.policies[0].policy_id);
      }
      setIsLoading(false);
    }, 1500);
  };

  const selectedPolicy = policies.find((p) => p.policy_id === selectedPolicyId);

  const barChartData = policies.map((p) => {
    const topRules = [...p.impact_analysis.new_violations, ...p.impact_analysis.resolved_violations]
       .sort((a: any, b: any) => b.count - a.count)
       .slice(0, 3)
       .map((r: any) => `${r.rule} (${r.count})`);

    return {
      policy_id: p.policy_id,
      baseline: viewMode === "percentage" ? 100 : p.comparison.baseline,
      scenario: viewMode === "percentage" ? Number((100 + p.comparison.percent_change).toFixed(1)) : p.comparison.new_total,
      topRules: topRules
    };
  });

  const stackedChartData = policies.map((p) => {
    const baseline = p.comparison.baseline || 1;
    const newCount = p.impact_analysis.new_violations.reduce((sum: number, r: any) => sum + r.count, 0) || 0;
    const resCount = p.impact_analysis.resolved_violations.reduce((sum: number, r: any) => sum + r.count, 0) || 0;

    const topRules = [...p.impact_analysis.new_violations, ...p.impact_analysis.resolved_violations]
       .sort((a: any, b: any) => b.count - a.count)
       .slice(0, 3)
       .map((r: any) => `${r.rule} (${r.count})`);

    return {
      policy_id: p.policy_id,
      new_violations: viewMode === "percentage" ? Number(((newCount / baseline) * 100).toFixed(1)) : newCount,
      resolved_violations: viewMode === "percentage" ? Number(((resCount / baseline) * 100).toFixed(1)) : resCount,
      topRules: topRules
    };
  });

  const pieChartData = selectedPolicy?.impact_analysis.new_violations.map((r: any) => ({
    rule: r.rule,
    impact_percent: r.impact_percent
  })) || [];

  // Map impact_analysis into unified rules
  const unifiedRulesMap = new Map<string, any>();
  if (selectedPolicy) {
    selectedPolicy.impact_analysis.new_violations.forEach((r: any) => {
      unifiedRulesMap.set(r.rule, {
        rule: r.rule,
        new_violations: r.count,
        resolved_violations: 0,
        impact_percent: r.impact_percent || 0,
        net_impact: r.count
      });
    });
    selectedPolicy.impact_analysis.resolved_violations.forEach((r: any) => {
      if (unifiedRulesMap.has(r.rule)) {
        const existing = unifiedRulesMap.get(r.rule);
        existing.resolved_violations = r.count;
        existing.net_impact = existing.new_violations - r.count;
      } else {
        unifiedRulesMap.set(r.rule, {
          rule: r.rule,
          new_violations: 0,
          resolved_violations: r.count,
          impact_percent: 0,
          net_impact: -r.count
        });
      }
    });
  }
  const tableRules = Array.from(unifiedRulesMap.values());

  return (
    <div className="min-h-screen bg-slate-50/50 p-6 font-sans text-slate-900 pb-20">
      <div className="max-w-[1400px] mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
        
        {/* 1. Header Section */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-6">
          <div>
            <h1 className="text-3xl font-black bg-clip-text text-transparent bg-gradient-to-r from-slate-900 via-slate-700 to-slate-800 tracking-tight flex items-center gap-3">
              <ShieldAlert className="w-8 h-8 text-indigo-600" />
              Policy Impact Simulator
            </h1>
            <p className="text-sm text-slate-500 mt-1 font-medium">
              Compare and analyze complex policy shifts on your dataset
            </p>
          </div>
        </header>

        {/* 2. Input Section */}
        <section className="bg-white rounded-2xl border border-slate-200/60 p-6 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.1)] flex flex-col gap-5 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-32 bg-indigo-50/50 blur-3xl -mr-10 -mt-20 z-0 rounded-full pointer-events-none"></div>
          
          <div className="flex items-center justify-between relative z-10">
            <h2 className="text-lg font-bold text-slate-800 tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-500">Analysis Configuration</h2>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-end">
            {/* Baseline Policy */}
            <div className="col-span-1">
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Baseline Policy
              </label>
              <div className="flex border border-slate-300 rounded-xl overflow-hidden bg-slate-50 p-1.5 focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-500 transition-all">
                 <input 
                   type="file" 
                   className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer" 
                 />
              </div>
            </div>

            {/* New Policies */}
            <div className="col-span-1 lg:col-span-2">
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                New Policies (Up to 3)
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="flex border border-slate-300 rounded-xl overflow-hidden bg-slate-50 p-1.5 focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-500 transition-all">
                   <input 
                     type="file" 
                     className="w-full text-sm text-slate-400 file:mr-2 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-slate-200 file:text-slate-700 hover:file:bg-slate-300 cursor-pointer" 
                   />
                </div>
                <div className="flex border border-slate-300 rounded-xl overflow-hidden bg-slate-50 p-1.5 focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-500 transition-all">
                   <input 
                     type="file" 
                     className="w-full text-sm text-slate-400 file:mr-2 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-slate-200 file:text-slate-700 hover:file:bg-slate-300 cursor-pointer" 
                   />
                </div>
                <div className="flex border border-slate-300 rounded-xl overflow-hidden bg-slate-50 p-1.5 focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-500 transition-all">
                   <input 
                     type="file" 
                     className="w-full text-sm text-slate-400 file:mr-2 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-slate-200 file:text-slate-700 hover:file:bg-slate-300 cursor-pointer opacity-50" 
                     disabled
                   />
                </div>
              </div>
            </div>

            {/* Action Button */}
            <div className="col-span-1 flex lg:justify-end relative z-10">
              <button 
                onClick={handleRunAnalysis}
                disabled={isLoading}
                className="group flex flex-col items-center justify-center gap-1 bg-gradient-to-b from-indigo-500 to-indigo-600 text-white px-8 py-3 rounded-xl hover:from-indigo-600 hover:to-indigo-700 transition-all shadow-[0_4px_14px_0_rgba(99,102,241,0.39)] w-full lg:w-auto disabled:opacity-70 disabled:cursor-not-allowed hover:-translate-y-0.5"
              >
                <div className="flex items-center gap-2">
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 fill-white" />}
                  <span className="text-sm font-bold tracking-wide uppercase">{isLoading ? "Simulating..." : "Run Analysis"}</span>
                </div>
              </button>
            </div>
          </div>
        </section>

        {/* 3. Main Grid Layout */}
        <section className="grid grid-cols-1 xl:grid-cols-12 gap-6">
          
          {/* Left (8 cols): Charts + Comparison */}
          <div className="xl:col-span-8 space-y-6">
            <div className="bg-white rounded-2xl border border-slate-200/60 p-6 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.1)] min-h-[400px] flex flex-col">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-indigo-500" />
                  <h3 className="font-bold text-lg text-slate-800 tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-500">Charts & Comparison</h3>
                </div>
                
                {policies.length > 0 && (
                  <div className="bg-slate-100 p-1 rounded-lg flex text-sm font-medium">
                    <button 
                      onClick={() => setViewMode("absolute")}
                      className={cn("px-3 py-1 rounded-md transition", viewMode === "absolute" ? "bg-white text-indigo-700 shadow-sm" : "text-slate-500 hover:text-slate-700")}
                    >
                      Absolute
                    </button>
                    <button 
                      onClick={() => setViewMode("percentage")}
                      className={cn("px-3 py-1 rounded-md transition", viewMode === "percentage" ? "bg-white text-indigo-700 shadow-sm" : "text-slate-500 hover:text-slate-700")}
                    >
                      Percentage
                    </button>
                  </div>
                )}
              </div>
              
              {isLoading ? (
                  <div className="flex-1 rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 flex flex-col items-center justify-center p-12">
                     <Loader2 className="w-8 h-8 text-indigo-500 animate-spin mb-4" />
                     <p className="text-sm font-bold text-slate-700 tracking-tight mb-1">Simulating policy runtimes</p>
                     <p className="text-xs text-slate-500 font-medium">Processing baseline comparisons...</p>
                     <div className="mt-8 grid grid-cols-3 gap-4 w-full max-w-lg opacity-40">
                       <div className="h-24 bg-slate-200 rounded-xl animate-pulse"></div>
                       <div className="h-32 bg-slate-200 rounded-xl animate-pulse delay-75"></div>
                       <div className="h-20 bg-slate-200 rounded-xl animate-pulse delay-150"></div>
                     </div>
                  </div>
              ) : error ? (
                  <div className="flex-1 rounded-2xl border border-red-200 bg-red-50 flex flex-col items-center justify-center p-12 text-center">
                     <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
                       <AlertTriangle className="w-6 h-6 text-red-500" />
                     </div>
                     <p className="text-base font-bold text-red-700 mb-2">Analysis Failed</p>
                     <p className="text-sm text-red-600/80 max-w-sm mx-auto font-medium leading-relaxed">{error}</p>
                     <button onClick={handleRunAnalysis} className="mt-6 px-4 py-2 bg-white text-red-600 border border-red-200 shadow-sm rounded-lg font-bold text-xs uppercase tracking-widest hover:bg-red-50 transition-colors">Retry Simulation</button>
                  </div>
              ) : policies.length > 0 ? (
                 <div className="flex-1 flex flex-col w-full overflow-hidden">
                    {/* Policy Selection Cards */}
                    <div className="space-y-4 mb-6">
                      <div className="flex gap-4 overflow-x-auto pb-2 custom-scrollbar snap-x w-full">
                         {policies.filter((p: any) => !p.isCombined).map(policy => (
                            <motion.div
                               key={policy.policy_id} 
                               className="snap-start flex-shrink-0"
                               whileHover={{ scale: 1.02 }}
                               whileTap={{ scale: 0.98 }}
                               transition={{ type: "spring", stiffness: 300 }}
                            >
                               <PolicyComparisonCard 
                                 policy={policy}
                                 isSelected={selectedPolicyId === policy.policy_id}
                                 onClick={() => setSelectedPolicyId(policy.policy_id)}
                                 isCombined={false}
                               />
                            </motion.div>
                         ))}
                      </div>
                      
                      {policies.some((p: any) => p.isCombined) && (
                        <div className="pt-2 border-t border-slate-100">
                          <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Combined Policy Analysis</h4>
                          <div className="flex gap-4 overflow-x-auto pb-4 custom-scrollbar snap-x w-full">
                             {policies.filter((p: any) => p.isCombined).map(policy => (
                                <motion.div
                                   key={policy.policy_id} 
                                   className="snap-start flex-shrink-0"
                                   whileHover={{ scale: 1.02 }}
                                   whileTap={{ scale: 0.98 }}
                                   transition={{ type: "spring", stiffness: 300 }}
                                >
                                   <PolicyComparisonCard 
                                     policy={policy}
                                     isSelected={selectedPolicyId === policy.policy_id}
                                     onClick={() => setSelectedPolicyId(policy.policy_id)}
                                     isCombined={true}
                                   />
                                </motion.div>
                             ))}
                          </div>
                        </div>
                      )}
                    </div>
                    
                    {/* Dynamic Chart Visualizations */}
                    <AnimatePresence mode="wait">
                      <motion.div
                         key={`charts-${selectedPolicyId}-${viewMode}`}
                         initial={{ opacity: 0, scale: 0.98, y: 10 }}
                         animate={{ opacity: 1, scale: 1, y: 0 }}
                         exit={{ opacity: 0, scale: 0.98, y: -10 }}
                         transition={{ duration: 0.4 }}
                         className="flex-1 w-full grid grid-cols-1 md:grid-cols-2 gap-4"
                      >
                         <div className="bg-white rounded-xl border border-slate-200 p-4 min-h-[300px] shadow-sm flex flex-col">
                            <h4 className="text-sm font-bold text-slate-700 mb-2">Projected Rule Impact <span className="text-xs font-normal text-slate-500 uppercase">({selectedPolicyId})</span></h4>
                            <div className="flex-1 w-full flex items-center justify-center">
                               <RuleImpactPieChart data={pieChartData} />
                            </div>
                         </div>
                         
                         <div className="bg-white rounded-xl border border-slate-200 p-4 min-h-[300px] shadow-sm flex flex-col">
                            <h4 className="text-sm font-bold text-slate-700 mb-2">Violations Shift Breakdown</h4>
                            <div className="flex-1">
                               <ViolationsStackedChart data={stackedChartData} viewMode={viewMode} />
                            </div>
                         </div>
                         
                         <div className="md:col-span-2 bg-white rounded-xl border border-slate-200 p-4 min-h-[250px] shadow-sm flex flex-col">
                            <h4 className="text-sm font-bold text-slate-700 mb-2">{viewMode === "percentage" ? "Relative (%)" : "Total Absolute"} Baseline vs Projected</h4>
                            <div className="flex-1">
                               <ViolationsBarChart data={barChartData} activePolicyId={selectedPolicyId} viewMode={viewMode} />
                            </div>
                         </div>
                      </motion.div>
                    </AnimatePresence>
                 </div>
              ) : (
                  <div className="flex-1 rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 flex flex-col items-center justify-center p-12 text-center relative overflow-hidden group">
                     <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, #0f172a 1px, transparent 0)', backgroundSize: '16px 16px' }}></div>
                     <div className="w-16 h-16 bg-white shadow-sm border border-slate-200 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-500 z-10">
                        <BarChart3 className="w-8 h-8 text-slate-400" />
                     </div>
                     <h4 className="text-slate-700 font-bold tracking-tight mb-1 z-10">No Simulation Data</h4>
                     <p className="text-sm text-slate-500 font-medium max-w-sm mb-6 z-10">Upload a baseline policy and at least one scenario format to compute compliance tradeoffs.</p>
                     <button onClick={handleRunAnalysis} className="z-10 bg-indigo-50 text-indigo-700 border border-indigo-100 hover:bg-indigo-100 px-5 py-2.5 rounded-xl text-sm font-bold tracking-wide transition-colors shadow-sm">Generate Sample Run</button>
                  </div>
              )}
            </div>
          </div>

          {/* Right (4 cols): Ranking panel */}
          <div className="xl:col-span-4 self-start bg-white rounded-2xl border border-slate-200/60 p-6 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.1)] min-h-[400px]">
            <div className="flex items-center gap-2 mb-6">
              <ListOrdered className="w-5 h-5 text-emerald-500" />
              <h3 className="font-bold text-lg text-slate-800 tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-500">Policy Ranking</h3>
            </div>
            
            <RankingPanel ranking={ranking} />
          </div>
        </section>

        {/* 4. Below: Rule Impact Table & Explainability Panel */}
        {(policies.length > 0 && !error) && (
          <section className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            
            {/* Rule Impact Table */}
            <motion.div 
               key={`table-${selectedPolicyId}`}
               initial={{ opacity: 0, y: 15 }}
               animate={{ opacity: 1, y: 0 }}
               transition={{ duration: 0.4 }}
               className="bg-white rounded-2xl border border-slate-200/60 p-6 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.1)] min-h-[450px] flex flex-col"
            >
              <div className="flex items-center gap-2 mb-6">
                <TableIcon className="w-5 h-5 text-indigo-500" />
                <h3 className="font-bold text-lg text-slate-800 tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-500">Rule Impact Table</h3>
               {selectedPolicy && (
                  <span className="ml-auto text-[10px] bg-indigo-100/80 text-indigo-700 px-2.5 py-1 rounded-full uppercase tracking-widest font-bold shadow-sm">{selectedPolicy.policy_id}</span>
               )}
             </div>
             
             <div className="flex-1 flex flex-col w-full h-full overflow-hidden">
                <RuleImpactTable rules={tableRules} />
             </div>
           </motion.div>

           {/* Explainability Panel */}
           <motion.div
              key={`exp-${selectedPolicyId}`}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.1 }}
              className="h-full shadow-[0_2px_10px_-4px_rgba(0,0,0,0.2)] rounded-2xl overflow-hidden"
           >
             <ExplainabilityPanel explanations={selectedPolicy?.explanations || null} />
           </motion.div>
         </section>
        )}

      </div>
    </div>
  );
}
