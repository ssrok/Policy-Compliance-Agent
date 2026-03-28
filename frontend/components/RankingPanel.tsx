import React from "react";
import { Award, ShieldCheck, ListOrdered } from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export interface RankingDetail {
  rank: number;
  policy_id: string;
  score: number;
  reason: string;
}

export interface RankingData {
  top_pick: string;
  details: RankingDetail[];
}

interface RankingPanelProps {
  ranking: RankingData | null;
}

export default function RankingPanel({ ranking }: RankingPanelProps) {
  if (!ranking) {
    return (
      <div className="space-y-4 w-full h-full flex flex-col justify-center pb-8 opacity-60">
        {[1, 2, 3].map((rank) => (
          <div key={rank} className="p-4 rounded-xl border border-slate-200/50 bg-slate-50/50 flex items-center gap-4 w-full">
            <div className="w-10 h-10 rounded-full bg-white border border-slate-200 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.1)] flex items-center justify-center font-black text-slate-300">
              #{rank}
            </div>
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-slate-200/80 rounded-md w-3/4 animate-pulse delay-75"></div>
              <div className="h-3 bg-slate-200/50 rounded-md w-1/2 animate-pulse delay-150"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  const bestPolicy = ranking.details.find((d) => d.policy_id === ranking.top_pick) || ranking.details[0];

  return (
    <div className="space-y-6 w-full">
      {/* 1. Highlight BEST POLICY */}
      <div className="relative rounded-2xl bg-emerald-50 border border-emerald-200 p-6 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.1)] overflow-hidden group hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all duration-300 hover:-translate-y-1">
        {/* Background decorative blob */}
        <div className="absolute -top-10 -right-10 w-40 h-40 bg-emerald-200/50 rounded-full blur-3xl pointer-events-none group-hover:scale-110 transition-transform duration-500"></div>
        
        <div className="flex flex-wrap items-center gap-3 mb-5 relative z-10 w-full">
          <div className="bg-emerald-100/80 text-emerald-600 p-2.5 rounded-xl border border-emerald-200/50 shadow-sm shrink-0">
            <Award className="w-6 h-6" />
          </div>
          <div className="flex-1 min-w-[120px]">
            <div className="text-emerald-800 text-[10px] font-bold uppercase tracking-widest mb-0.5">Top Recommendation</div>
            <div className="text-emerald-950 font-black text-2xl leading-none">{bestPolicy.policy_id}</div>
          </div>
          <div className="flex flex-col items-end shrink-0 ml-auto">
            <span className="text-emerald-700 text-[10px] font-bold uppercase tracking-widest bg-emerald-100/50 px-2 py-0.5 rounded-full mb-1">Score</span>
            <span className="text-3xl font-black text-emerald-600 leading-none">{bestPolicy.score}</span>
          </div>
        </div>
        
        <div className="relative z-10 bg-white/70 backdrop-blur-sm rounded-xl p-4 border border-emerald-100 shadow-sm w-full">
          <div className="flex items-start gap-2.5">
            <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <p className="text-sm font-semibold text-emerald-900 leading-snug">
              {bestPolicy.reason}
            </p>
          </div>
        </div>
      </div>

      {/* 2. List all policies ranked */}
      <div className="space-y-3 w-full">
        <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1 mb-2 flex items-center gap-1.5">
          <ListOrdered className="w-3.5 h-3.5" /> Full Leaderboard
        </h4>
        
        {ranking.details.map((item) => {
          const isBest = item.policy_id === ranking.top_pick;
          return (
            <div 
              key={item.rank} 
              className={cn(
               "p-4 rounded-xl flex items-center justify-between transition group relative overflow-hidden w-full",
               isBest 
                 ? "bg-white border-2 border-emerald-400 shadow-sm" 
                 : "bg-slate-50 border border-slate-200 hover:bg-white hover:border-slate-300 hover:shadow-sm"
              )}
            >
              {isBest && <div className="absolute left-0 top-0 bottom-0 w-1 bg-emerald-500"></div>}
              
              <div className="flex items-center gap-4 flex-1 min-w-0">
                <div className="flex flex-col items-center justify-center shrink-0 w-8">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Rank</span>
                  <div className={cn(
                    "w-7 h-7 rounded-full flex items-center justify-center font-black text-sm shadow-sm border",
                    isBest ? "bg-emerald-500 text-white border-emerald-600" : "bg-white text-slate-700 border-slate-200"
                  )}>
                    #{item.rank}
                  </div>
                </div>
                <div className="flex-1 min-w-0 pr-2">
                  <div className="font-bold text-slate-900 flex flex-wrap items-center gap-2">
                    {item.policy_id}
                    {isBest && <span className="text-[9px] uppercase tracking-widest font-bold bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded shrink-0">Best</span>}
                  </div>
                  <div className="text-xs font-medium text-slate-500 line-clamp-2 mt-0.5" title={item.reason}>
                    {item.reason}
                  </div>
                </div>
              </div>
              
              <div className="shrink-0 flex flex-col items-end pl-2">
                 <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-0.5">Score</div>
                 <div className={cn(
                   "text-lg font-black",
                   isBest ? "text-emerald-600" : "text-slate-700"
                 )}>
                   {item.score}
                 </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
