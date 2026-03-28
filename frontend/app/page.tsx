"use client";

import React from "react";
import Link from "next/link";
import {
  ArrowRight, ShieldCheck, Database, Layers, BarChart2,
  FileText, Brain, Search, Zap, BarChart3, ShieldAlert
} from "lucide-react";

// ─── Header ───────────────────────────────────────────────────────────────────

function LandingHeader() {
  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <header className="fixed top-0 left-0 right-0 h-16 bg-[#0B0F19]/80 backdrop-blur-xl border-b border-white/5 flex items-center justify-between px-6 md:px-12 z-50">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
          <ShieldCheck className="w-5 h-5 text-white" />
        </div>
        <span className="text-white font-bold text-lg tracking-tight">ComplianceAI</span>
      </div>

      <nav className="hidden md:flex items-center gap-8">
        <button onClick={() => scrollTo("features")} className="text-sm font-medium text-gray-400 hover:text-white transition-colors">
          Features
        </button>
        <button onClick={() => scrollTo("how-it-works")} className="text-sm font-medium text-gray-400 hover:text-white transition-colors">
          How it Works
        </button>
      </nav>

      <div className="flex items-center gap-4">
        <Link href="/dashboard" className="hidden sm:flex items-center gap-2 px-5 py-2 bg-white/5 hover:bg-white/10 text-white text-sm font-semibold rounded-xl border border-white/10 transition-all">
          Sign In
        </Link>
        <Link href="/dashboard" className="flex items-center gap-2 px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-xl transition-all shadow-lg shadow-indigo-600/20">
          Get Started
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </header>
  );
}

// ─── Hero ──────────────────────────────────────────────────────────────────────

function LandingHero() {
  return (
    <section className="relative flex flex-col items-center justify-center text-center px-6 pt-32 pb-24 md:pt-48 md:pb-36 bg-[#0B0F19] overflow-hidden">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-indigo-500/10 via-transparent to-transparent opacity-60 rounded-full blur-[120px] scale-150" />

      <div className="animate-in fade-in slide-in-from-bottom-5 duration-1000 max-w-4xl mx-auto flex flex-col items-center">
        <div className="flex items-center gap-2 px-3 py-1 bg-indigo-500/10 border border-indigo-500/20 rounded-full mb-8">
          <span className="w-2 h-2 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.5)] animate-pulse" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-400">Powered by Enterprise AI</span>
        </div>

        <h1 className="text-4xl md:text-7xl font-bold text-white tracking-tight leading-[1.1] mb-8">
          AI-Powered <br className="hidden md:block" />
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 via-white to-purple-400">
            Compliance Analysis
          </span>
        </h1>

        <p className="max-w-2xl text-lg md:text-xl text-gray-400 font-medium leading-relaxed mb-12">
          Automatically detect compliance violations in your datasets against your policies.
          Save time, reduce risk, and ensure regulatory adherence with our automated AI engine.
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-4 mb-20">
          <Link
            href="/dashboard"
            className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold rounded-2xl flex items-center justify-center gap-2 group transition-all shadow-xl shadow-indigo-600/20"
          >
            Start Analysis
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        <div className="flex flex-wrap justify-center gap-10 opacity-30 grayscale pointer-events-none">
          {[
            { icon: ShieldCheck, label: "GDPR Ready" },
            { icon: Database,    label: "Dataset Ingestion" },
            { icon: Layers,      label: "Policy Mapping" },
            { icon: BarChart2,   label: "Live Insights" },
          ].map(({ icon: Icon, label }) => (
            <div key={label} className="flex items-center gap-2">
              <Icon className="w-5 h-5" />
              <span className="text-xs font-bold tracking-widest uppercase text-white">{label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Feature Grid ──────────────────────────────────────────────────────────────

function FeatureGrid() {
  const features = [
    { title: "Intelligent Extraction",  description: "Extract complex clauses from PDF documents automatically.",                                    icon: Search    },
    { title: "Real-Time Validation",    description: "Instant validation of massive datasets against stored policies.",                              icon: Zap       },
    { title: "Risk Scoring",            description: "Detailed risk and compliance scores for high-level overviews.",                                icon: BarChart3 },
    { title: "Export Reports",          description: "Generate deep-dive compliance reports for stakeholders.",                                      icon: ShieldAlert },
    { title: "Explainability",          description: "Clear justifications for why each row is or is not compliant.",                               icon: Brain     },
    { title: "Schema Mapping",          description: "Map diverse dataset schemas to internal policy formats.",                                      icon: Layers    },
  ];

  return (
    <section id="features" className="py-24 bg-[#0B0F19] border-t border-white/5">
      <div className="max-w-6xl mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-bold text-white mb-4">Powerful Features</h2>
          <p className="text-gray-500 max-w-2xl mx-auto font-medium leading-relaxed">
            Our platform is built to handle the complexities of enterprise-grade policy compliance validation.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, i) => (
            <div key={i} className="group flex flex-col p-8 rounded-3xl bg-[#111827] border border-white/5 hover:border-white/10 transition-all hover:bg-white/[0.03]">
              <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-gray-400 group-hover:text-white group-hover:bg-indigo-600 transition-all mb-6">
                <feature.icon className="w-5 h-5" />
              </div>
              <h4 className="text-lg font-bold text-white mb-2 group-hover:text-indigo-400 transition-colors uppercase tracking-tight">{feature.title}</h4>
              <p className="text-sm text-gray-500 leading-relaxed font-medium">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── How It Works ──────────────────────────────────────────────────────────────

function FeatureCards() {
  const cards = [
    {
      title: "Upload Policy",
      description: "Extract compliance requirements from your PDF policies using AI-driven NLP analysis.",
      icon: FileText,
    },
    {
      title: "Analyze Data",
      description: "Upload your dataset and validate it against your policies in real-time.",
      icon: Database,
    },
    {
      title: "Get Insights",
      description: "Receive a detailed compliance report with granular violation breakdowns and explainability.",
      icon: ShieldCheck,
    },
  ];

  return (
    <section id="how-it-works" className="py-24 bg-[#0B0F19] flex flex-col items-center border-t border-white/5">
      <div className="max-w-6xl w-full px-6 mb-16 text-center">
        <h2 className="text-3xl md:text-5xl font-bold text-white mb-4">How It Works</h2>
        <p className="text-gray-500 max-w-2xl mx-auto font-medium leading-relaxed">
          Three simple steps to full compliance visibility across your entire dataset.
        </p>
      </div>
      <div className="max-w-6xl w-full px-6 grid grid-cols-1 md:grid-cols-3 gap-6">
        {cards.map((card, i) => (
          <div key={i} className="group relative bg-[#111827] border border-white/5 p-8 rounded-3xl hover:border-indigo-500/30 transition-all duration-300 hover:scale-[1.02] shadow-[0_0_20px_rgba(0,0,0,0.3)]">
            <div className="absolute top-8 left-8 -z-10 w-12 h-12 bg-indigo-500/20 rounded-full blur-2xl group-hover:blur-3xl transition-all opacity-0 group-hover:opacity-100" />
            <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-6 text-white group-hover:bg-indigo-600 transition-colors">
              <card.icon className="w-6 h-6" />
            </div>
            <div className="flex items-center gap-3 mb-3">
              <span className="text-xs font-bold text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded-full">Step {i + 1}</span>
            </div>
            <h3 className="text-xl font-bold text-white mb-3 group-hover:text-indigo-400 transition-colors">{card.title}</h3>
            <p className="text-gray-400 leading-relaxed font-medium">{card.description}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

// ─── Footer ────────────────────────────────────────────────────────────────────

function Footer() {
  return (
    <footer className="bg-[#0B0F19] border-t border-white/5 py-10 px-6 text-center">
      <div className="flex items-center justify-center gap-2.5 mb-4">
        <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center">
          <ShieldCheck className="w-4 h-4 text-white" />
        </div>
        <span className="text-white font-bold tracking-tight">ComplianceAI</span>
      </div>
      <p className="text-xs text-gray-600">© {new Date().getFullYear()} ComplianceAI. Built for enterprise-grade policy compliance.</p>
    </footer>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#0B0F19]">
      <LandingHeader />
      <LandingHero />
      <FeatureGrid />
      <FeatureCards />
      <Footer />
    </div>
  );
}
