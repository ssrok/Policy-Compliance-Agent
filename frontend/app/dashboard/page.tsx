"use client";

import React from "react";
import Link from "next/link";
import { useDashboard } from "@/lib/context/dashboard-context";
import { 
  ShieldCheck, 
  ArrowRight,
  Database,
  FileText,
  AlertCircle,
  BarChart3
} from "lucide-react";

export default function OverviewPage() {
  const { policyState, datasetState, mappingState, reportState } = useDashboard();
  const { file: policyFile } = policyState;
  const { file: datasetFile } = datasetState;
  const { mappings } = mappingState;
  const { data: reportData } = reportState;

  return (
    <div className="space-y-12 animate-in fade-in duration-700">
      <div className="text-center space-y-4">
        <h1 className="text-5xl font-black uppercase tracking-tighter italic">Dashboard <span className="text-gray-300 font-medium not-italic">Overview</span></h1>
        <p className="text-gray-400 max-w-lg mx-auto font-medium">Manage your enterprise data policy compliance automation. Monitor status across ingestion, mapping, and reporting.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatusCard 
          icon={FileText} 
          title="Policy" 
          status={policyFile ? "Ready" : "Pending"} 
          color={policyFile ? "indigo" : "gray"}
          href="/dashboard/policy-upload"
        />
        <StatusCard 
          icon={Database} 
          title="Dataset" 
          status={datasetFile ? "Uploaded" : "Pending"} 
          color={datasetFile ? "cyan" : "gray"}
          href="/dashboard/dataset-upload"
        />
        <StatusCard 
          icon={ShieldCheck} 
          title="Mapping" 
          status={mappings.length > 0 ? `${mappings.length} Fields` : "Required"} 
          color={mappings.length > 0 ? "black" : "gray"}
          href="/dashboard/schema-mapping"
        />
        <StatusCard 
          icon={BarChart3} 
          title="Compliance" 
          status={reportData ? `${reportData.summary.compliance_rate}% Rate` : "Not Run"} 
          color={reportData ? "green" : "gray"}
          href="/dashboard/compliance-report"
        />
      </div>

      <div className="bg-white rounded-3xl p-12 shadow-2xl shadow-gray-100 border border-gray-50 flex flex-col items-center text-center space-y-6">
        <div className="p-6 bg-indigo-50 rounded-full">
           <AlertCircle className="w-12 h-12 text-indigo-500" />
        </div>
        <div className="space-y-2">
           <h3 className="text-2xl font-black uppercase tracking-tight">System Ready to Process</h3>
           <p className="text-gray-400 font-medium max-w-sm">Start by uploading your data policy PDF to extract executable compliance rules.</p>
        </div>
        <Link 
          href="/dashboard/policy-upload" 
          className="bg-black text-white px-10 py-5 rounded-2xl font-black text-lg uppercase tracking-widest hover:scale-105 active:scale-95 transition-all flex items-center shadow-xl shadow-black/10"
        >
          Begin Pipeline <ArrowRight className="w-6 h-6 ml-3" />
        </Link>
      </div>
    </div>
  );
}

function StatusCard({ icon: Icon, title, status, color, href }: any) {
  const colorMap: any = {
    indigo: "text-indigo-600 bg-indigo-50",
    cyan: "text-cyan-600 bg-cyan-50",
    black: "text-white bg-black",
    green: "text-green-600 bg-green-50",
    gray: "text-gray-400 bg-gray-50"
  };

  return (
    <Link href={href}>
      <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-xl shadow-gray-100/50 hover:scale-105 transition-all cursor-pointer group">
        <div className={`p-4 rounded-2xl w-fit ${colorMap[color]} mb-6 transition-colors`}>
           <Icon className="w-6 h-6" />
        </div>
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-1">{title}</p>
        <h4 className="text-xl font-black uppercase tracking-tighter truncate">{status}</h4>
      </div>
    </Link>
  );
}
