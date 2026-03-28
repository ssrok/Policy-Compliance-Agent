"use client";

import React, { useState, useRef, useEffect } from "react";
import { useDashboard } from "@/lib/context/dashboard-context";
import {
  MessageSquare, Send, Bot, User, Loader2,
  ShieldCheck, TrendingUp, Lightbulb, Wrench, Copy, Check,
} from "lucide-react";

interface AdvisorData {
  explanation?: string;
  impact_analysis?: string;
  business_insight?: string;
  recommendation?: string;
  risk_level?: "low" | "medium" | "high" | string;
}

interface RawData {
  // simulation
  old_violations?: number;
  new_violations?: number;
  difference?: number;
  old_threshold?: number;
  new_threshold?: number;
  column_used?: string;
  // analytics
  total_rows?: number;
  total_violations?: number;
  compliance_rate?: number;
  [key: string]: unknown;
}

interface Message {
  role: "user" | "assistant";
  content: string;
  advisor?: AdvisorData;
  intent?: string;
  raw?: RawData;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

const RISK_STYLES: Record<string, string> = {
  low:    "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  medium: "bg-yellow-500/10  text-yellow-400  border-yellow-500/20",
  high:   "bg-red-500/10     text-red-400     border-red-500/20",
};

const CARDS = [
  { key: "explanation",      label: "Explanation",      icon: ShieldCheck },
  { key: "impact_analysis",  label: "Impact Analysis",  icon: TrendingUp  },
  { key: "business_insight", label: "Business Insight", icon: Lightbulb   },
  { key: "recommendation",   label: "Recommendation",   icon: Wrench      },
] as const;

// ── Simulation numbers strip ──────────────────────────────────────────────────
function SimulationStrip({ raw }: { raw: RawData }) {
  const diff = raw.difference ?? 0;
  const diffColor = diff < 0 ? "text-emerald-400" : diff > 0 ? "text-red-400" : "text-gray-400";
  const diffLabel = diff > 0 ? `+${diff}` : String(diff);

  return (
    <div className="flex flex-wrap gap-3 p-3 bg-indigo-500/5 border border-indigo-500/20 rounded-xl">
      <Stat label="Old Violations" value={String(raw.old_violations ?? "—")} color="text-yellow-400" />
      <div className="w-px bg-white/5" />
      <Stat label="New Violations" value={String(raw.new_violations ?? "—")} color="text-white" />
      <div className="w-px bg-white/5" />
      <Stat label="Change" value={diffLabel} color={diffColor} />
      {raw.column_used && (
        <>
          <div className="w-px bg-white/5" />
          <Stat label="Column" value={raw.column_used} color="text-indigo-400" />
        </>
      )}
    </div>
  );
}

// ── Analytics metrics strip ───────────────────────────────────────────────────
function AnalyticsStrip({ raw }: { raw: RawData }) {
  return (
    <div className="flex flex-wrap gap-3 p-3 bg-emerald-500/5 border border-emerald-500/20 rounded-xl">
      <Stat label="Total Rows"       value={String(raw.total_rows        ?? "—")} color="text-white"        />
      <div className="w-px bg-white/5" />
      <Stat label="Violations"       value={String(raw.total_violations  ?? "—")} color="text-red-400"      />
      <div className="w-px bg-white/5" />
      <Stat label="Compliance"       value={raw.compliance_rate != null ? `${raw.compliance_rate}%` : "—"} color="text-emerald-400" />
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="flex flex-col gap-0.5 min-w-[70px]">
      <span className="text-[9px] font-semibold uppercase tracking-widest text-gray-500">{label}</span>
      <span className={`text-sm font-bold ${color}`}>{value}</span>
    </div>
  );
}

// ── Copy button ───────────────────────────────────────────────────────────────
function CopyButton({ advisor }: { advisor: AdvisorData }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    const text = [
      advisor.explanation      && `Explanation:\n${advisor.explanation}`,
      advisor.impact_analysis  && `Impact Analysis:\n${advisor.impact_analysis}`,
      advisor.business_insight && `Business Insight:\n${advisor.business_insight}`,
      advisor.recommendation   && `Recommendation:\n${advisor.recommendation}`,
      advisor.risk_level       && `Risk Level: ${advisor.risk_level}`,
    ].filter(Boolean).join("\n\n");

    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <button
      onClick={handleCopy}
      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 border border-white/5 rounded-lg transition-all"
    >
      {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
      {copied ? "Copied!" : "Copy Insight"}
    </button>
  );
}

// ── Advisor cards ─────────────────────────────────────────────────────────────
function AdvisorCards({ advisor, intent, raw }: { advisor: AdvisorData; intent?: string; raw?: RawData }) {
  const risk = advisor.risk_level?.toLowerCase() ?? "";
  const riskStyle = RISK_STYLES[risk] ?? "bg-white/5 text-gray-400 border-white/10";

  return (
    <div className="w-full space-y-3">
      {/* Intent + Risk badge row */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          {intent && (
            <span className="text-[10px] font-semibold uppercase tracking-widest px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              {intent.replace(/_/g, " ")}
            </span>
          )}
          {advisor.risk_level && (
            <span className={`text-[10px] font-semibold uppercase tracking-widest px-2 py-0.5 rounded-full border ${riskStyle}`}>
              {advisor.risk_level} risk
            </span>
          )}
        </div>
        <CopyButton advisor={advisor} />
      </div>

      {/* Simulation numbers strip */}
      {intent === "simulation" && raw && <SimulationStrip raw={raw} />}

      {/* Analytics metrics strip */}
      {intent === "analytics" && raw && <AnalyticsStrip raw={raw} />}

      {/* 2-col grid of cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {CARDS.map(({ key, label, icon: Icon }) => {
          const value = advisor[key as keyof AdvisorData];
          if (!value) return null;
          return (
            <div key={key} className="bg-[#0B0F19] border border-white/5 rounded-xl p-4 space-y-1.5">
              <div className="flex items-center gap-2">
                <Icon className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-500">{label}</p>
              </div>
              <p className="text-sm text-gray-200 leading-relaxed">{value}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function ChatPage() {
  const { reportState, policyState } = useDashboard();
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "Hello! I'm your compliance AI assistant. Ask me anything about your policy analysis, violations, or compliance results.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingText, setLoadingText] = useState("Analyzing data...");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // Cycle loading messages for better UX
  useEffect(() => {
    if (!loading) return;
    const steps = ["Analyzing data...", "Detecting intent...", "Generating insights...", "Almost ready..."];
    let i = 0;
    const id = setInterval(() => { i = (i + 1) % steps.length; setLoadingText(steps[i]); }, 1800);
    return () => clearInterval(id);
  }, [loading]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || loading) return;

    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setInput("");
    setLoading(true);
    setLoadingText("Analyzing data...");

    try {
      const context = {
        compliance_rate: reportState.data?.summary?.compliance_rate ?? null,
        violations:      reportState.data?.summary?.violations      ?? null,
        total_rows:      reportState.data?.summary?.total_rows      ?? null,
        policy_clauses:  policyState.clauses.length,
      };

      const res = await fetch(`${API_URL}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, context }),
      });

      if (!res.ok) throw new Error("Failed to get response");
      const json = await res.json();

      if (json.intent && json.data && typeof json.data === "object") {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: "", advisor: json.data, intent: json.intent, raw: json.raw },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: json.response ?? json.message ?? "No response." },
        ]);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "I'm unable to connect to the AI service right now. Please ensure the backend is running and try again.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] animate-in fade-in duration-500">
      {/* Header */}
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <MessageSquare className="w-6 h-6 text-indigo-400" />
          AI Chat
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Ask questions about your compliance data and policy analysis
        </p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto bg-[#111827] border border-white/5 rounded-xl p-4 space-y-4">
        {messages.map((msg, i) => (
          <div key={i} className={`flex items-start gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
            <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${msg.role === "assistant" ? "bg-indigo-600" : "bg-white/10"}`}>
              {msg.role === "assistant" ? <Bot className="w-4 h-4 text-white" /> : <User className="w-4 h-4 text-gray-300" />}
            </div>

            {msg.role === "assistant" && msg.advisor ? (
              <div className="flex-1 max-w-[90%]">
                <AdvisorCards advisor={msg.advisor} intent={msg.intent} raw={msg.raw} />
              </div>
            ) : (
              <div className={`max-w-[75%] px-4 py-2.5 rounded-xl text-sm leading-relaxed ${msg.role === "assistant" ? "bg-white/5 text-gray-200" : "bg-indigo-600 text-white"}`}>
                {msg.content}
              </div>
            )}
          </div>
        ))}

        {/* Loading state */}
        {loading && (
          <div className="flex items-start gap-3">
            <div className="w-7 h-7 rounded-full bg-indigo-600 flex items-center justify-center shrink-0">
              <Bot className="w-4 h-4 text-white" />
            </div>
            <div className="flex items-center gap-2.5 px-4 py-2.5 bg-white/5 rounded-xl">
              <Loader2 className="w-4 h-4 text-indigo-400 animate-spin shrink-0" />
              <span className="text-sm text-gray-400 animate-pulse">{loadingText}</span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="mt-3 flex items-end gap-2">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask about your compliance results..."
          rows={1}
          className="flex-1 resize-none bg-[#111827] border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 outline-none focus:border-indigo-500/50 transition-all"
        />
        <button
          onClick={sendMessage}
          disabled={!input.trim() || loading}
          className="p-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl transition-all"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
