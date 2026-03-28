"use client";

import React, { useState } from "react";
import { 
  ShieldAlert, 
  Play, 
  Database, 
  FileText, 
  BarChart3,
  Info,
  ShieldCheck,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  Brain,
  List,
  ChevronDown,
  Download,
  Share2,
  History,
  Loader2
} from "lucide-react";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Cell,
  PieChart,
  Pie
} from "recharts";
import { motion, AnimatePresence } from "framer-motion";

export default function PolicySimulationPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [ruleInput, setRuleInput] = useState("");
  const [showResults, setShowResults] = useState(false);
  const [showAllRows, setShowAllRows] = useState(false);
  const [sessionContext, setSessionContext] = useState<{
    policy_name: string | null;
    dataset_name: string | null;
    total_rows: number;
    compliance_score: number | null;
  } | null>(null);
  
  const resultsRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const fetchContext = async () => {
      try {
        const res = await fetch("http://localhost:8000/api/v1/session/context");
        if (res.ok) {
          const data = await res.json();
          setSessionContext(data);
        }
      } catch (err) {
        console.error("Failed to fetch session context:", err);
      }
    };
    fetchContext();
  }, []);

  React.useEffect(() => {
    if (showResults && !isLoading && resultsRef.current) {
      resultsRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [showResults, isLoading]);

  const MOCK_ROWS = Array.from({ length: 20 }).map((_, i) => ({
    id: `TX-${1000 + i}`,
    status: i % 4 === 0 ? "resolved" : "new",
    rule: i % 2 === 0 ? "PII_THRESHOLD_LOGIC" : "GDPR_DATA_LOC_02",
    value: i % 3 === 0 ? "$5,420.00" : i % 3 === 1 ? "$8,211.50" : "$9,000.00"
  }));

  const handleAnalysis = () => {
    if (!ruleInput.trim()) return;
    setIsLoading(true);
    setShowResults(false);
    setShowAllRows(false);
    // Increased speed (1.8s) for 'snappy' feel
    setTimeout(() => {
      setIsLoading(false);
      setShowResults(true);
    }, 1800);
  };

  return (
    <div className="min-h-screen text-slate-100 font-sans pb-20">
      <div className="max-w-[1000px] mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
        
        {/* 1. Top Section */}
        <header>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center shadow-[0_0_15px_rgba(99,102,241,0.1)]">
              <Sparkles className="w-5 h-5 text-indigo-400" />
            </div>
            <h1 className="text-3xl font-black bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-200 to-slate-400 tracking-tight">
              Policy What-if Analysis
            </h1>
          </div>
          <p className="text-sm text-slate-400 font-medium ml-[52px]">
            Test how a new rule impacts your current compliance state instantly.
          </p>
        </header>

        {/* 2. Main Content Container */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Main Input - 2/3 Width */}
          <div className="lg:col-span-2 space-y-6">
            <motion.div 
               className="bg-[#111827] rounded-3xl border border-white/5 p-8 shadow-[0_8px_30px_rgb(0,0,0,0.4)] relative overflow-hidden"
               initial={{ opacity: 0, y: 20 }}
               animate={{ opacity: 1, y: 0 }}
            >
              <div className="absolute top-0 right-0 p-32 bg-indigo-500/5 blur-[100px] -mr-16 -mt-16 pointer-events-none"></div>
              
              <div className="relative z-10 space-y-6">
                <div className="flex items-center justify-between">
                  <label className="text-base font-bold text-slate-200 tracking-tight">Enter New Policy Rule</label>
                  <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest bg-indigo-400/10 px-2 py-1 rounded">Real-time Draft</span>
                </div>
                
                <div className="relative group">
                  <textarea 
                    value={ruleInput}
                    onChange={(e) => setRuleInput(e.target.value)}
                    placeholder="e.g. Transactions above 5000 must be flagged"
                    className="w-full bg-slate-900/50 border border-white/10 rounded-2xl p-6 h-48 text-lg font-medium text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500/50 transition-all resize-none shadow-inner"
                  />
                  <div className="absolute inset-0 rounded-2xl border border-indigo-500/20 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity"></div>
                </div>

                <div className="flex items-start gap-3 p-4 rounded-xl bg-slate-900/30 border border-white/5">
                  <Info className="w-4 h-4 text-slate-500 mt-1 shrink-0" />
                  <p className="text-sm text-slate-500 font-medium leading-relaxed">
                    This logic will be compared against your <span className="text-slate-300">existing policy</span> and current <span className="text-slate-300">dataset</span> to calculate delta impact.
                  </p>
                </div>
              </div>
            </motion.div>

            {/* Run Analysis Button */}
            <motion.button 
              onClick={handleAnalysis}
              disabled={isLoading || !ruleInput.trim() || !sessionContext?.policy_name}
              className="w-full relative group overflow-hidden"
              whileHover={{ scale: (isLoading || !ruleInput.trim() || !sessionContext?.policy_name) ? 1 : 1.01 }}
              whileTap={{ scale: (isLoading || !ruleInput.trim() || !sessionContext?.policy_name) ? 1 : 0.99 }}
            >
               <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 to-purple-600 blur-[8px] opacity-20 group-hover:opacity-40 transition-opacity"></div>
               <div className="relative flex items-center justify-center gap-3 bg-gradient-to-r from-indigo-500/90 to-indigo-600 text-white font-black text-lg py-5 rounded-2xl shadow-[0_10px_30px_-5px_rgba(79,70,229,0.3)] disabled:opacity-30 disabled:grayscale transition-all uppercase tracking-wider overflow-hidden">
                 {isLoading ? (
                   <div className="flex items-center gap-3">
                     <Loader2 className="w-5 h-5 animate-spin" />
                     <span className="animate-pulse">Analyzing policy impact...</span>
                   </div>
                 ) : !sessionContext?.policy_name ? (
                   <div className="flex items-center gap-2 opacity-50">
                     <ShieldAlert className="w-5 h-5" />
                     <span>Policy Data Required</span>
                   </div>
                 ) : (
                   <>
                     <span>Run What-if Analysis</span>
                     <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
                   </>
                 )}
               </div>
            </motion.button>
          </div>

          {/* Sidebar Info - 1/3 Width */}
          <div className="space-y-6">
            <motion.div 
               className="bg-[#111827] rounded-3xl border border-white/5 p-6 shadow-xl relative overflow-hidden"
               initial={{ opacity: 0, x: 20 }}
               animate={{ opacity: 1, x: 0 }}
               transition={{ delay: 0.1 }}
            >
              <div className="absolute top-0 right-0 p-16 bg-indigo-500/5 blur-[60px] -mr-8 -mt-8 pointer-events-none"></div>
              
              <div className="relative z-10 flex items-center justify-between mb-6 border-b border-white/5 pb-4">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Analysis Context</h3>
                <span className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-tighter transition-all ${!sessionContext?.dataset_name ? 'bg-amber-400/10 text-amber-400' : 'bg-indigo-400/10 text-indigo-400'}`}>
                  {!sessionContext?.dataset_name ? 'Demo Mode' : 'From current session'}
                </span>
              </div>
              
              <div className="space-y-6 relative z-10">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-slate-400">
                    <ShieldCheck className="w-4 h-4" />
                    <span className="text-xs font-semibold text-slate-500">Active Policy</span>
                  </div>
                  <div className={`p-3 rounded-xl border transition-all ${sessionContext?.policy_name ? 'bg-slate-900/50 border-white/5 text-slate-200' : 'bg-red-500/5 border-red-500/20 text-red-400/60 font-medium italic'}`}>
                    <div className="text-sm font-bold truncate">
                      {sessionContext?.policy_name || "No policy uploaded yet"}
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-slate-400">
                    <Database className="w-4 h-4" />
                    <span className="text-xs font-semibold text-slate-500">Dataset</span>
                  </div>
                  <div className="p-3 rounded-xl border border-white/5 bg-slate-900/50 transition-all">
                    <div className="text-sm font-bold truncate text-slate-200">
                      {sessionContext?.dataset_name || "Demo Financial Transactions"}
                    </div>
                    <div className="text-[10px] font-bold text-indigo-400 mt-1 uppercase tracking-tighter">
                      {sessionContext?.dataset_name ? `${sessionContext.total_rows.toLocaleString()} Records` : "200 records"}
                    </div>
                  </div>
                </div>

                {sessionContext?.compliance_score && (
                  <div className="pt-4 mt-6 border-t border-white/5 flex flex-col gap-3">
                     <div className="flex items-center justify-between">
                       <span className="text-xs text-slate-500 font-medium">Compliance Score</span>
                       <span className="text-xs text-emerald-400 font-bold">{sessionContext.compliance_score}%</span>
                     </div>
                     <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${sessionContext.compliance_score}%` }}
                          className="bg-emerald-500 h-full" 
                        />
                     </div>
                  </div>
                )}
              </div>
            </motion.div>

            {/* Quick Tips */}
            <div className="p-6 rounded-3xl border border-slate-800 bg-slate-900/20">
               <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Pro Tips</h4>
               <ul className="space-y-4">
                 {[
                   "Use specific field names for better accuracy.",
                   "Combine multiple conditions using 'and' / 'or'.",
                   "Simulate restrictive rules to find compliance gaps."
                 ].map((tip, i) => (
                   <li key={i} className="flex gap-3 text-xs text-slate-500 leading-relaxed">
                     <span className="text-indigo-400 font-bold tracking-tight">0{i+1}.</span>
                     {tip}
                   </li>
                 ))}
               </ul>
            </div>
          </div>

        </div>

        {/* Results Area */}
        <AnimatePresence>
          {isLoading && (
            <motion.div 
               initial={{ opacity: 0, scale: 0.95 }}
               animate={{ opacity: 1, scale: 1 }}
               exit={{ opacity: 0, scale: 0.95 }}
               className="p-12 text-center rounded-3xl border border-dashed border-indigo-500/20 bg-indigo-500/5"
            >
              <div className="relative inline-flex items-center justify-center mb-6">
                 <div className="absolute inset-0 bg-indigo-500 blur-2xl opacity-20 animate-pulse"></div>
                 <BarChart3 className="w-12 h-12 text-indigo-400 relative z-10" />
              </div>
              <h3 className="text-xl font-bold text-slate-200 mb-2 font-black tracking-tight">Simulating Policy Logic</h3>
              <p className="text-sm text-slate-500 max-w-sm mx-auto font-medium">Our LLM is parsing your rule while our audit engine checks every row in the dataset for potential compliance violations...</p>
            </motion.div>
          )}

          {showResults && !isLoading && (
            <motion.div 
              ref={resultsRef}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-8 scroll-mt-8"
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-1">
                <div className="flex items-center gap-2">
                  <div className="bg-emerald-500/10 p-1.5 rounded-lg">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-slate-100 tracking-tight">Analysis Complete</h2>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">Computed in 2.5s • Audit ID: #SIM-9210</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <button className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-white/5 rounded-xl text-xs font-bold text-slate-300 transition-all">
                    <Share2 className="w-3.5 h-3.5" />
                    Share Results
                  </button>
                  <button className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-xs font-bold text-white shadow-lg shadow-indigo-600/20 transition-all">
                    <Download className="w-3.5 h-3.5" />
                    Export Audit Report
                  </button>
                </div>
              </div>

              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-[#111827] border border-white/5 p-6 rounded-2xl shadow-xl flex flex-col gap-2">
                   <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Violations Change</span>
                   <div className="flex items-center gap-3">
                      <span className="text-3xl font-black text-red-400">+120</span>
                      <div className="bg-red-400/10 p-1 rounded-lg">
                        <TrendingUp className="w-4 h-4 text-red-400" />
                      </div>
                   </div>
                   <p className="text-xs text-slate-500 font-medium leading-relaxed">Increase primarily driven by stricter transaction thresholds.</p>
                </div>
                
                <div className="bg-[#111827] border border-white/5 p-6 rounded-2xl shadow-xl flex flex-col gap-2">
                   <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Compliance Rate</span>
                   <div className="flex items-end gap-2 text-slate-400">
                      <span className="text-3xl font-black text-white">74%</span>
                      <span className="text-sm font-bold pb-1 text-slate-500">from 82%</span>
                   </div>
                   <div className="w-full h-1.5 bg-slate-800 rounded-full mt-2 overflow-hidden">
                      <div className="bg-amber-500 h-full w-[74%]" />
                   </div>
                </div>

                <div className="bg-[#111827] border border-white/5 p-6 rounded-2xl shadow-xl flex flex-col gap-2">
                   <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Risk Level</span>
                   <div className="flex items-center gap-2">
                      <div className="bg-red-500 w-3 h-3 rounded-full animate-pulse shadow-[0_0_10px_rgba(239,68,68,0.5)]" />
                      <span className="text-2xl font-black text-red-500 uppercase tracking-tighter">High Risk</span>
                   </div>
                   <p className="text-xs text-slate-500 font-medium">Critical logic mismatch in data localization detected.</p>
                </div>
              </div>

              {/* Impact Insights Section */}
              <div className="bg-[#111827] border border-white/5 rounded-3xl p-8 shadow-2xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-32 bg-indigo-500/5 blur-[80px] -mr-16 -mt-16 pointer-events-none"></div>
                
                <div className="flex items-center gap-4 mb-8">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center shadow-inner">
                    <Brain className="w-6 h-6 text-indigo-400" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-slate-100 tracking-tight">Impact Insights</h3>
                    <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-0.5">Automated Behavioral Analysis</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
                  {[
                    "Violations increased by 45% due to stricter transaction thresholds.",
                    "70% of new violations are from transactions between 5k–10k.",
                    "Existing policy did not flag these transactions previously.",
                    "This change increases compliance strictness but may increase review workload."
                  ].map((insight, idx) => (
                    <div key={idx} className="flex gap-4 items-start group/insight">
                      <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.6)] group-hover/insight:scale-125 transition-transform" />
                      <p className="text-sm font-medium text-slate-400 group-hover/insight:text-slate-200 transition-colors leading-relaxed">
                        {insight}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Charts Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* A. Bar Chart: Baseline vs New */}
                <div className="bg-[#111827] border border-white/5 p-6 rounded-3xl shadow-xl h-[350px] flex flex-col">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-6">Total Violations Comparison</h4>
                  <div className="flex-1 min-h-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={[
                        { name: "Baseline", value: 450, fill: "#475569" },
                        { name: "New Policy", value: 570, fill: "#6366f1" }
                      ]}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                        <XAxis 
                          dataKey="name" 
                          axisLine={false} 
                          tickLine={false} 
                          tick={{ fill: "#94a3b8", fontSize: 12, fontWeight: 600 }} 
                        />
                        <YAxis 
                          axisLine={false} 
                          tickLine={false} 
                          tick={{ fill: "#94a3b8", fontSize: 12 }} 
                        />
                        <Tooltip 
                          contentStyle={{ backgroundColor: "#0f172a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "12px", color: "#fff" }}
                          itemStyle={{ color: "#fff", fontWeight: "bold" }}
                          cursor={{ fill: "rgba(255,255,255,0.05)" }}
                        />
                        <Bar dataKey="value" radius={[6, 6, 0, 0]} barSize={60} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* B. Delta Chart: New vs Resolved (Horizontal) */}
                <div className="bg-[#111827] border border-white/5 p-6 rounded-3xl shadow-xl h-[350px] flex flex-col">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-6">Simulation Delta Breakdown</h4>
                  <div className="flex-1 min-h-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart layout="vertical" data={[
                        { name: "New Violations", value: 180, color: "#ef4444" },
                        { name: "Resolved Violations", value: 60, color: "#10b981" }
                      ]} margin={{ left: 20 }}>
                        <XAxis type="number" hide />
                        <YAxis 
                          dataKey="name" 
                          type="category" 
                          axisLine={false} 
                          tickLine={false} 
                          tick={{ fill: "#94a3b8", fontSize: 12, fontWeight: 700 }}
                          width={120}
                        />
                        <Tooltip 
                          contentStyle={{ backgroundColor: "#0f172a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "12px", color: "#fff" }}
                        />
                        <Bar dataKey="value" radius={[0, 6, 6, 0]} barSize={40}>
                          { [0, 1].map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={index === 0 ? "#ef4444" : "#10b981"} />
                            ))
                          }
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* C. Rule Impact (Top Driver) - Small Chart */}
                <div className="lg:col-span-2 bg-[#111827] border border-white/5 p-6 rounded-3xl shadow-xl h-[250px] flex flex-col">
                  <div className="flex items-center justify-between mb-6">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Top Rule Drivers (Net Impact)</h4>
                    <span className="text-[10px] font-bold bg-indigo-500/10 text-indigo-400 px-2 py-1 rounded">Dominant Factor Detected</span>
                  </div>
                  <div className="flex-1 min-h-0 flex items-center gap-8 px-4">
                    <div className="h-full aspect-square relative">
                       <ResponsiveContainer width="100%" height="100%">
                         <PieChart>
                           <Pie
                             data={[
                               { name: "Rule A", value: 65, fill: "#6366f1" },
                               { name: "Other", value: 35, fill: "#1e293b" }
                             ]}
                             innerRadius={50}
                             outerRadius={80}
                             paddingAngle={5}
                             dataKey="value"
                             stroke="none"
                           />
                         </PieChart>
                       </ResponsiveContainer>
                       <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                          <span className="text-xl font-black text-white">65%</span>
                          <span className="text-[8px] font-bold text-slate-500 uppercase">Impact</span>
                       </div>
                    </div>
                    <div className="flex-1 space-y-4">
                       <div className="space-y-1">
                          <div className="text-sm font-bold text-slate-200">PII_DATA_THRESHOLD</div>
                          <p className="text-xs text-slate-500 font-medium leading-relaxed">This rule triggered <span className="text-red-400 font-bold">117 new flags</span>, making it the primary driver of the compliance decrease.</p>
                       </div>
                       <div className="flex gap-2">
                          <div className="px-2 py-1 bg-white/5 border border-white/10 rounded-md text-[9px] font-bold text-slate-400 uppercase">Financial Audit</div>
                          <div className="px-2 py-1 bg-white/5 border border-white/10 rounded-md text-[9px] font-bold text-slate-400 uppercase">Critical Risk</div>
                       </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Affected Transactions - Minimal Table */}
              <div className="bg-[#111827] border border-white/5 rounded-3xl p-8 shadow-xl">
                 <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-3">
                       <List className="w-5 h-5 text-indigo-400" />
                       <h3 className="text-xl font-black text-slate-100 tracking-tight">View Affected Transactions</h3>
                    </div>
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest bg-white/5 px-2 py-1 rounded">Sample Review (First 20)</span>
                 </div>

                 <div className="overflow-hidden rounded-2xl border border-white/5">
                    <table className="w-full text-left border-collapse">
                       <thead>
                          <tr className="bg-slate-900/50 border-b border-white/5">
                             <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Row ID</th>
                             <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Status Change</th>
                             <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Triggered Rule</th>
                             <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Value</th>
                          </tr>
                       </thead>
                       <tbody className="divide-y divide-white/5">
                          {MOCK_ROWS.slice(0, showAllRows ? 20 : 6).map((row) => (
                             <tr key={row.id} className="hover:bg-white/5 transition-colors group/row">
                                <td className="px-6 py-4 text-sm font-bold text-slate-300 group-hover/row:text-white transition-colors capitalize">{row.id}</td>
                                <td className="px-6 py-4 text-sm">
                                   <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-tighter ${
                                      row.status === 'new' 
                                        ? 'bg-red-400/10 text-red-400 border border-red-400/20' 
                                        : 'bg-emerald-400/10 text-emerald-400 border border-emerald-400/20'
                                   }`}>
                                      <div className={`w-1 h-1 rounded-full ${row.status === 'new' ? 'bg-red-400' : 'bg-emerald-400'}`} />
                                      {row.status}
                                   </span>
                                </td>
                                <td className="px-6 py-4 text-sm font-medium text-slate-500 font-mono text-xs">{row.rule}</td>
                                <td className="px-6 py-4 text-sm font-black text-slate-200">{row.value}</td>
                             </tr>
                          ))}
                       </tbody>
                    </table>
                 </div>

                 {!showAllRows && (
                    <button 
                       onClick={() => setShowAllRows(true)}
                       className="w-full mt-4 py-4 rounded-2xl border border-dashed border-white/10 text-slate-500 hover:text-indigo-400 hover:border-indigo-500/30 hover:bg-indigo-500/5 transition-all flex items-center justify-center gap-2 font-bold text-sm"
                    >
                       <ChevronDown className="w-4 h-4" />
                       Show More Affected Rows (14 more)
                    </button>
                 )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
}
