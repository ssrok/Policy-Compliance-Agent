"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { DashboardProvider, useDashboard, useDashboardDispatch } from "@/lib/context/dashboard-context";
import {
  LayoutDashboard, FileText, Database, Layers, ShieldCheck,
  MessageSquare, FlaskConical, BarChart2,
  CheckCircle2, Lock, AlertCircle, RotateCcw,
  Search, Bell, User, ChevronRight, Menu, X, Loader2,
} from "lucide-react";

const sidebarSections = [
  {
    label: "Core Modules",
    items: [
      { name: "Dashboard",          href: "/dashboard",                   icon: LayoutDashboard, key: "none"    },
      { name: "Policy Analysis",    href: "/dashboard/policy-upload",     icon: FileText,        key: "policy"  },
      { name: "Dataset Validation", href: "/dashboard/dataset-upload",    icon: Database,        key: "dataset" },
      { name: "Schema Mapping",     href: "/dashboard/schema-mapping",    icon: Layers,          key: "mapping" },
      { name: "Explainability",     href: "/dashboard/compliance-report", icon: ShieldCheck,     key: "report"  },
    ],
  },
  {
    label: "Advanced Features",
    items: [
      { name: "AI Copilot",  href: "/dashboard/chat",       icon: MessageSquare, key: "free" },
      { name: "Simulation",  href: "/dashboard/simulation",  icon: FlaskConical,  key: "free" },
      { name: "Insights",    href: "/dashboard/insights",    icon: BarChart2,     key: "free" },
    ],
  },
];

function RouteGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { policyState, datasetState, mappingState } = useDashboard();

  React.useEffect(() => {
    if (pathname === "/dashboard") return;
    if (pathname === "/dashboard/chat") return;
    if (pathname === "/dashboard/simulation") return;
    if (pathname === "/dashboard/insights") return;
    const hasPolicy = policyState.clauses.length > 0;
    if (!hasPolicy && pathname !== "/dashboard/policy-upload") {
      router.replace("/dashboard/policy-upload");
      return;
    }
    if (hasPolicy) {
      const hasDataset = datasetState.columns.length > 0;
      if (!hasDataset && pathname !== "/dashboard/policy-upload" && pathname !== "/dashboard/dataset-upload") {
        router.replace("/dashboard/dataset-upload");
        return;
      }
      if (hasDataset) {
        const hasMapping = mappingState.mappings.length > 0;
        if (!hasMapping && pathname === "/dashboard/compliance-report") {
          router.replace("/dashboard/schema-mapping");
          return;
        }
      }
    }
  }, [pathname, policyState.clauses, datasetState.columns, mappingState.mappings, router]);

  return <>{children}</>;
}

function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const pathname = usePathname();
  const { steps, resetPipeline } = useDashboard();

  const getStatus = (key: string) => {
    if (key === "free")    return { enabled: true,          completed: false,          coming: false };
    if (key === "coming")  return { enabled: false,         completed: false,          coming: true  };
    if (key === "none")    return { enabled: true,          completed: false,          coming: false };
    if (key === "policy")  return { enabled: true,          completed: steps.policy,   coming: false };
    if (key === "dataset") return { enabled: steps.policy,  completed: steps.dataset,  coming: false };
    if (key === "mapping") return { enabled: steps.dataset, completed: steps.mapping,  coming: false };
    if (key === "report")  return { enabled: steps.mapping, completed: steps.report,   coming: false };
    return { enabled: false, completed: false, coming: false };
  };

  return (
    <>
      {open && <div className="fixed inset-0 bg-black/60 z-20 lg:hidden" onClick={onClose} />}
      <aside className={`fixed top-0 left-0 h-full w-64 bg-[#0B0F19] border-r border-white/5 flex flex-col z-30 transition-transform duration-300 ${open ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}>
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/5">
          <Link href="/dashboard" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4 text-white" />
            </div>
            <span className="text-white font-bold text-sm tracking-tight">ComplianceAI</span>
          </Link>
          <button onClick={onClose} className="lg:hidden text-gray-500 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
          {sidebarSections.map((section) => (
            <div key={section.label}>
              <p className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-widest text-gray-500">
                {section.label}
              </p>
              <div className="space-y-0.5">
                {section.items.map((item) => {
                  const { enabled, completed, coming } = getStatus(item.key);
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.name}
                      href={enabled ? item.href : "#"}
                      onClick={(e) => !enabled && e.preventDefault()}
                      className={`flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200
                        ${isActive
                          ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/20"
                          : !enabled
                            ? "text-gray-600 cursor-not-allowed"
                            : "text-gray-400 hover:bg-white/5 hover:text-white"
                        }`}
                    >
                      <div className="flex items-center gap-3">
                        <item.icon className={`w-4 h-4 ${isActive ? "text-white" : !enabled ? "text-gray-600" : "text-gray-500"}`} />
                        {item.name}
                      </div>
                      {completed && !isActive && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
                      {coming && <span className="text-[9px] font-bold px-1.5 py-0.5 bg-indigo-500/20 text-indigo-400 rounded-md">Soon</span>}
                      {!enabled && !coming && <Lock className="w-3 h-3 text-gray-600" />}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="px-3 py-4 border-t border-white/5 space-y-3">
          <button
            onClick={resetPipeline}
            className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-xs font-medium text-gray-500 hover:bg-red-500/10 hover:text-red-400 transition-all"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset Pipeline
          </button>
          <div className="flex items-center gap-2 px-3 py-2.5 bg-emerald-500/10 rounded-lg">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs text-emerald-400 font-medium">AI Node: Online</span>
          </div>
        </div>
      </aside>
    </>
  );
}

function Topbar({ onMenuClick }: { onMenuClick: () => void }) {
  return (
    <header className="fixed top-0 left-0 lg:left-64 right-0 h-14 bg-[#0B0F19]/80 backdrop-blur-xl border-b border-white/5 flex items-center justify-between px-4 lg:px-6 z-10">
      <div className="flex items-center gap-4">
        <button onClick={onMenuClick} className="lg:hidden text-gray-400 hover:text-white">
          <Menu className="w-5 h-5" />
        </button>
        <nav className="hidden md:flex items-center gap-1">
          {["Platform", "Solutions", "Resources", "Pricing"].map((item) => (
            <button key={item} className="px-3 py-1.5 text-xs font-medium text-gray-400 hover:text-white rounded-lg hover:bg-white/5 transition-all">
              {item}
            </button>
          ))}
        </nav>
      </div>
      <div className="flex items-center gap-2">
        <div className="hidden sm:flex items-center gap-2 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5">
          <Search className="w-3.5 h-3.5 text-gray-500" />
          <input placeholder="Search..." className="bg-transparent text-xs text-gray-400 placeholder-gray-600 outline-none w-28" />
        </div>
        <button className="p-2 text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-all">
          <Bell className="w-4 h-4" />
        </button>
        <button className="p-2 text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-all">
          <User className="w-4 h-4" />
        </button>
        <button className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg transition-all">
          Request Demo
          <ChevronRight className="w-3 h-3" />
        </button>
      </div>
    </header>
  );
}

function DashboardContent({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();
  const { policyState, datasetState, mappingState, reportState } = useDashboard();
  const dispatch = useDashboardDispatch();

  const pageErrorMap: Record<string, string | null> = {
    "/dashboard/policy-upload":     policyState.error,
    "/dashboard/dataset-upload":    datasetState.error,
    "/dashboard/schema-mapping":    mappingState.error,
    "/dashboard/compliance-report": reportState.error,
  };
  const currentError = pageErrorMap[pathname] ?? null;

  const dismissError = () => {
    if (pathname === "/dashboard/policy-upload")     dispatch({ type: "SET_POLICY",  payload: { error: null } });
    if (pathname === "/dashboard/dataset-upload")    dispatch({ type: "SET_DATASET", payload: { error: null } });
    if (pathname === "/dashboard/schema-mapping")    dispatch({ type: "SET_MAPPING", payload: { error: null } });
    if (pathname === "/dashboard/compliance-report") dispatch({ type: "SET_REPORT",  payload: { error: null } });
  };

  return (
    <div className="min-h-screen bg-[#0B0F19]">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <Topbar onMenuClick={() => setSidebarOpen(true)} />
      <main className="lg:pl-64 pt-14 min-h-screen">
        <div className="p-6 lg:p-8 max-w-6xl mx-auto" key={pathname}>
          {currentError && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center justify-between animate-in slide-in-from-top-4 duration-300">
              <div className="flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-red-400">Error</p>
                  <p className="text-xs text-red-400/70 mt-0.5">{currentError}</p>
                </div>
              </div>
              <button onClick={dismissError} className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 text-xs font-semibold rounded-lg transition-all">
                Dismiss
              </button>
            </div>
          )}
          <RouteGuard>{children}</RouteGuard>
        </div>
      </main>
    </div>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardProvider>
      <DashboardContent>{children}</DashboardContent>
    </DashboardProvider>
  );
}
