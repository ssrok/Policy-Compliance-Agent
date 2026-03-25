import React from 'react'
import { ArrowRight, ShieldCheck, FileText, Database, Code2 } from 'lucide-react'

export default function HomePage() {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Navigation */}
      <header className="fixed top-0 w-full z-50 glass border-b border-border/10">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center border border-primary/30">
              <ShieldCheck className="w-5 h-5 text-primary" />
            </div>
            <span className="font-outfit font-bold text-xl tracking-tight">Compliance<span className="text-primary italic">AI</span></span>
          </div>
          <nav className="hidden md:flex items-center space-x-8 text-sm font-medium text-foreground/60">
            <a href="#" className="hover:text-primary transition-colors">How it Works</a>
            <a href="#" className="hover:text-primary transition-colors">Rule Engine</a>
            <a href="#" className="hover:text-primary transition-colors">Datasets</a>
          </nav>
          <button className="px-4 py-2 rounded-full bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity shadow-lg shadow-primary/20">
            Get Started
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 overflow-hidden">
        {/* Background Gradients */}
        <div className="absolute top-0 right-0 -z-10 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 -z-10 w-[600px] h-[600px] bg-accent/5 rounded-full blur-[150px] translate-y-1/2 -translate-x-1/3" />
        
        <div className="max-w-7xl mx-auto px-4">
          <div className="max-w-3xl">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold mb-6">
              <Code2 className="w-3.5 h-3.5" />
              <span className="uppercase tracking-wider">Next-Gen Compliance Agent</span>
            </div>
            
            <h1 className="text-5xl md:text-7xl font-outfit font-black mb-8 leading-[1.1]">
              AI Data Policy <br />
              <span className="gradient-text">Compliance Agent</span>
            </h1>
            
            <p className="text-lg md:text-xl text-foreground/70 mb-10 leading-relaxed max-w-2xl">
              Upload enterprise policies, automatically extract machine-executable rules, and validate datasets with millisecond latency using state-of-the-art LLMs.
            </p>

            <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-4 sm:space-y-0 sm:space-x-4">
              <button className="px-8 py-4 rounded-2xl bg-primary text-primary-foreground font-bold text-lg flex items-center group shadow-2xl shadow-primary/30 hover:scale-105 transition-transform duration-300">
                Deploy Agent
                <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
              <button className="px-8 py-4 rounded-2xl bg-secondary text-secondary-foreground font-bold text-lg border border-border/50 hover:bg-secondary/80 transition-colors">
                View Demo
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Grid */}
      <section className="py-20 bg-secondary/30">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <FeatureCard 
              icon={<FileText className="w-6 h-6" />}
              title="Policy Ingestion"
              description="Extract clauses, obligations, and thresholds from complex PDFs automatically."
            />
            <FeatureCard 
              icon={<ShieldCheck className="w-6 h-6" />}
              title="Rule Compilation"
              description="Convert natural language policy requirements into executable logic and SQL queries."
            />
            <FeatureCard 
              icon={<Database className="w-6 h-6" />}
              title="Deep Validation"
              description="Scan millions of rows across datasets to detect violations and generate AI-reasoned explanations."
            />
          </div>
        </div>
      </section>

      {/* Footer Placeholder */}
      <footer className="mt-auto py-12 border-t border-border/10">
        <div className="max-w-7xl mx-auto px-4 text-center text-foreground/40 text-sm">
          © 2026 Policy Compliance Agent. Enterprise Grade Governance.
        </div>
      </footer>
    </div>
  )
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) {
  return (
    <div className="p-8 rounded-3xl glass hover:border-primary/30 transition-all duration-500 group">
      <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mb-6 group-hover:scale-110 transition-transform">
        {icon}
      </div>
      <h3 className="text-xl font-outfit font-bold mb-3">{title}</h3>
      <p className="text-foreground/60 leading-relaxed text-sm">
        {description}
      </p>
    </div>
  )
}
