"use client";

import React, { useState, useRef, useEffect } from "react";
import { Send, Bot, User, Loader2, Zap, BarChart2, Search, ShieldCheck, TrendingUp, ChevronRight } from "lucide-react";

const BASE_URL = "http://localhost:8000/api/v1";

interface Message {
  id: number;
  role: "user" | "assistant";
  content: string;
  intent?: string;
  loading?: boolean;
}

interface Suggestion {
  label: string;
  query: string;
}

const INTENT_COLORS: Record<string, string> = {
  simulate:  "text-indigo-400 bg-indigo-500/10 border-indigo-500/20",
  recommend: "text-yellow-400 bg-yellow-500/10 border-yellow-500/20",
  explain:   "text-red-400 bg-red-500/10 border-red-500/20",
  query:     "text-cyan-400 bg-cyan-500/10 border-cyan-500/20",
  general:   "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
  error:     "text-red-400 bg-red-500/10 border-red-500/20",
};

const INTENT_ICONS: Record<string, React.ReactNode> = {
  simulate:  <TrendingUp className="w-3 h-3" />,
  recommend: <Zap className="w-3 h-3" />,
  explain:   <ShieldCheck className="w-3 h-3" />,
  query:     <Search className="w-3 h-3" />,
  general:   <BarChart2 className="w-3 h-3" />,
};

function MessageBubble({ msg }: { msg: Message }) {
  const isUser = msg.role === "user";
  return (
    <div className={`flex gap-3 ${isUser ? "flex-row-reverse" : "flex-row"} items-start`}>
      <div className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center ${isUser ? "bg-indigo-600" : "bg-white/10"}`}>
        {isUser ? <User className="w-3.5 h-3.5 text-white" /> : <Bot className="w-3.5 h-3.5 text-gray-300" />}
      </div>
      <div className={`max-w-[78%] ${isUser ? "items-end" : "items-start"} flex flex-col gap-1`}>
        {msg.intent && !isUser && (
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border w-fit ${INTENT_COLORS[msg.intent] || INTENT_COLORS.general}`}>
            {INTENT_ICONS[msg.intent]}
            {msg.intent}
          </span>
        )}
        <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
          isUser
            ? "bg-indigo-600 text-white rounded-tr-sm"
            : "bg-white/[0.06] border border-white/10 text-gray-200 rounded-tl-sm"
        }`}>
          {msg.loading ? (
            <div className="flex items-center gap-2 text-gray-400">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span className="text-xs">Analyzing...</span>
            </div>
          ) : msg.content}
        </div>
      </div>
    </div>
  );
}

export default function ChatPage() {
  const [messages, setMessages]     = useState<Message[]>([
    {
      id: 0,
      role: "assistant",
      content: "Hello! I'm your AI Compliance Copilot. I can explain violations, simulate rule changes, query the dataset, and recommend optimal compliance strategies.\n\nTry one of the suggestions below or ask me anything.",
      intent: "general",
    },
  ]);
  const [input, setInput]           = useState("");
  const [loading, setLoading]       = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const bottomRef                   = useRef<HTMLDivElement>(null);
  const inputRef                    = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch(`${BASE_URL}/chat/suggestions`)
      .then(r => r.json())
      .then(d => setSuggestions(d.suggestions || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async (query: string) => {
    if (!query.trim() || loading) return;

    const userMsg: Message = { id: Date.now(), role: "user", content: query };
    const loadingMsg: Message = { id: Date.now() + 1, role: "assistant", content: "", loading: true };

    setMessages(prev => [...prev, userMsg, loadingMsg]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch(`${BASE_URL}/chat/query`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, session_id: "demo_session" }),
      });
      const data = await res.json();

      setMessages(prev => [
        ...prev.filter(m => !m.loading),
        {
          id: Date.now() + 2,
          role: "assistant",
          content: data.response || "No response received.",
          intent: data.intent,
        },
      ]);
    } catch {
      setMessages(prev => [
        ...prev.filter(m => !m.loading),
        { id: Date.now() + 2, role: "assistant", content: "Connection error. Make sure the backend is running.", intent: "error" },
      ]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-6rem)] animate-in fade-in duration-500">
      {/* Header */}
      <div className="mb-4 shrink-0">
        <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
          <span>Dashboard</span>
          <ChevronRight className="w-3 h-3" />
          <span className="text-indigo-400">AI Copilot</span>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Compliance Copilot</h1>
            <p className="text-sm text-gray-500 mt-1">Ask anything about your compliance data</p>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">750 Transactions Loaded</span>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-1 pb-2">
        {messages.map(msg => <MessageBubble key={msg.id} msg={msg} />)}
        <div ref={bottomRef} />
      </div>

      {/* Suggestions */}
      {suggestions.length > 0 && (
        <div className="shrink-0 py-3">
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {suggestions.map((s, i) => (
              <button
                key={i}
                onClick={() => sendMessage(s.query)}
                disabled={loading}
                className="shrink-0 px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-indigo-500/40 text-gray-300 hover:text-white text-xs font-medium rounded-lg transition-all disabled:opacity-40 whitespace-nowrap"
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="shrink-0 flex gap-3 items-center bg-white/[0.04] border border-white/10 rounded-2xl px-4 py-3 focus-within:border-indigo-500/50 transition-all">
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask about violations, simulate rules, query data..."
          className="flex-1 bg-transparent text-sm text-white placeholder-gray-600 outline-none"
          disabled={loading}
        />
        <button
          onClick={() => sendMessage(input)}
          disabled={loading || !input.trim()}
          className="shrink-0 w-8 h-8 flex items-center justify-center bg-indigo-600 hover:bg-indigo-500 disabled:opacity-30 disabled:cursor-not-allowed rounded-xl transition-all hover:scale-105 active:scale-95"
        >
          {loading ? <Loader2 className="w-3.5 h-3.5 text-white animate-spin" /> : <Send className="w-3.5 h-3.5 text-white" />}
        </button>
      </div>
    </div>
  );
}
