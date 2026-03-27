"use client";

import React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { DashboardProvider, useDashboard } from "@/lib/context/dashboard-context";
import { 
  BarChart3, 
  FileText, 
  FileSpreadsheet, 
  Layers, 
  ShieldCheck,
  LayoutDashboard,
  CheckCircle2, 
  Lock, 
  AlertCircle, 
  RotateCcw 
} from "lucide-react";

const navItems = [
  { name: "Overview", href: "/dashboard", icon: LayoutDashboard, key: 'none' },
  { name: "Policy Ingestion", href: "/dashboard/policy-upload", icon: FileText, key: 'policy' },
  { name: "Dataset Upload", href: "/dashboard/dataset-upload", icon: FileSpreadsheet, key: 'dataset' },
  { name: "Schema Mapping", href: "/dashboard/schema-mapping", icon: Layers, key: 'mapping' },
  { name: "Compliance Report", href: "/dashboard/compliance-report", icon: ShieldCheck, key: 'report' },
];

// Route Guard logic
function RouteGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { policyState, datasetState, mappingState } = useDashboard();

  React.useEffect(() => {
    if (pathname === "/dashboard") return;
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

function DashboardContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { steps, policyState, datasetState, mappingState, reportState, resetPipeline } = useDashboard();

  // Helper to determine if a route is enabled
  const getRouteStatus = (key: string) => {
    if (key === 'none' || key === 'policy') return { enabled: true, completed: key === 'policy' ? steps.policy : false };
    if (key === 'dataset') return { enabled: steps.policy, completed: steps.dataset };
    if (key === 'mapping') return { enabled: steps.dataset, completed: steps.mapping };
    if (key === 'report') return { enabled: steps.mapping, completed: steps.report };
    return { enabled: false, completed: false };
  };

  const currentError = policyState.error || datasetState.error || mappingState.error || reportState.error;

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside className="w-72 bg-white border-r border-gray-100 flex flex-col fixed h-full z-10 shadow-2xl shadow-gray-100/50">
        <div className="p-10">
          <Link href="/dashboard">
            <h1 className="text-2xl font-black uppercase tracking-tighter italic group cursor-pointer">
              Compliance<span className="text-indigo-600 transition-colors group-hover:text-black">AI</span>
            </h1>
          </Link>
        </div>
        
        <nav className="flex-1 px-6 space-y-2">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            const { enabled, completed } = getRouteStatus(item.key);
            
            return (
              <div key={item.href} className="relative group">
                <Link
                  href={enabled ? item.href : "#"}
                  onClick={(e) => !enabled && e.preventDefault()}
                  className={`flex items-center justify-between px-5 py-4 text-xs font-black uppercase tracking-[0.2em] rounded-[20px] transition-all duration-300 ${
                    isActive 
                      ? "bg-black text-white shadow-xl shadow-black/20 scale-[1.02]" 
                      : !enabled 
                        ? "opacity-30 grayscale cursor-not-allowed text-gray-400" 
                        : "text-gray-400 hover:bg-gray-50 hover:text-black"
                  }`}
                  title={!enabled ? `Complete the previous step to unlock.` : ''}
                >
                  <div className="flex items-center">
                    <item.icon className={`w-4 h-4 mr-4 ${isActive ? "text-indigo-400" : "text-gray-300"}`} />
                    {item.name}
                  </div>
                  {completed && <CheckCircle2 className="w-4 h-4 text-green-500 animate-in zoom-in" />}
                  {!enabled && <Lock className="w-3.5 h-3.5 text-gray-300" />}
                </Link>
              </div>
            );
          })}
        </nav>

        <div className="p-8 space-y-4">
           <button 
             onClick={resetPipeline}
             className="w-full flex items-center justify-center space-x-2 px-4 py-4 bg-gray-50 hover:bg-red-50 hover:text-red-600 text-gray-400 rounded-2xl transition-all font-black text-[10px] uppercase tracking-widest border border-transparent hover:border-red-100"
           >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Pipeline</span>
           </button>
           <div className="bg-indigo-50/50 rounded-2xl p-6 border border-indigo-50">
              <p className="text-[9px] font-black uppercase tracking-widest text-indigo-300 mb-1">Infrastructure</p>
              <p className="text-xs font-bold text-indigo-700 flex items-center">
                 <span className="w-2 h-2 rounded-full bg-green-500 mr-2 animate-pulse" />
                 AI Node: Online
              </p>
           </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 ml-72 min-h-screen p-12">
          <div className="max-w-5xl mx-auto space-y-12 page-transition" key={pathname}>
            
            {/* Global Error Handler */}
          {currentError && (
            <div className="p-8 bg-red-50 border border-red-100 rounded-[32px] flex items-center justify-between animate-in slide-in-from-top-10 shadow-xl shadow-red-100/50">
               <div className="flex items-center space-x-6">
                  <div className="p-4 bg-white rounded-2xl shadow-sm">
                     <AlertCircle className="w-8 h-8 text-red-500" />
                  </div>
                  <div className="space-y-1">
                     <h4 className="text-xl font-black uppercase tracking-tight text-red-900 italic">Critical System Failure</h4>
                     <p className="text-red-600 font-medium text-sm leading-relaxed">{currentError}</p>
                  </div>
               </div>
               <button 
                 onClick={() => window.location.reload()}
                 className="px-8 py-4 bg-red-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-xl shadow-red-600/20"
               >
                  Retry Operation
               </button>
            </div>
          )}

          <RouteGuard>
            {children}
          </RouteGuard>
        </div>
      </main>
    </div>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardProvider>
      <DashboardContent>
        {children}
      </DashboardContent>
    </DashboardProvider>
  );
}
