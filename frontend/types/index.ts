export interface PolicyUploadResponse {
  file_id: string;
  filename: string;
}

export interface PolicyProcessResponse {
  file_id: string;
  num_clauses: number;
  clauses: string[];
}

// ── Policy Analysis ───────────────────────────────────────────────────────────

export interface PolicyScenarioInput {
  policy_id: string;
  rules: string[];
}

export interface PolicyAnalyzeRequest {
  dataset_id: string;
  baseline_rules: string[];
  new_policies: PolicyScenarioInput[];
}

export interface SimulateResult {
  total_rows: number;
  violations: number;
  compliance_rate: number;
  violation_rows: { row_index: number; rule: string; value: unknown }[];
  row_status: Record<string, "compliant" | "violation">;
  rule_impact: Record<string, number[]>;
  skipped_rules: string[];
}

export interface ComparisonSummary {
  baseline_violations: number;
  scenario_violations: number;
  delta: number;
  percent_change: number;
  impact_ratio: number;
  total_rows: number;
}

export interface ComparisonResult {
  summary: ComparisonSummary;
  details: {
    new_violations: number[];
    resolved_violations: number[];
    unchanged_violations: number[];
    unchanged_compliant: number[];
  };
  counts: {
    new_violations: number;
    resolved_violations: number;
    unchanged_violations: number;
    unchanged_compliant: number;
  };
}

export interface RuleImpactEntry {
  rule: string;
  new_violations: number;
  resolved_violations: number;
  net_impact: number;
  impact_percent: number;
}

export interface ImpactAnalysis {
  rule_impact: RuleImpactEntry[];
  total_rules_evaluated: number;
  total_new_violations: number;
}

export interface Recommendation {
  policy_type: "stricter" | "lenient" | "neutral";
  risk_level: "high" | "medium" | "low";
  key_drivers: { rule: string; impact_percent: number }[];
  recommendation: string;
  reasoning: string;
}

export interface ExplanationEntry {
  row_index: number;
  change_type: "new_violation" | "resolved_violation";
  triggered_rules: string[];
  details: {
    previous_status: string;
    current_status: string;
    triggered_values: { rule: string; value: unknown }[];
  };
  explanation: string;
  confidence: string;
  explanation_metadata: { num_rules_triggered: number; has_multiple_rules: boolean };
}

export interface PolicyOutput {
  policy_id: string;
  scenario_result: SimulateResult;
  comparison: ComparisonResult;
  explanations: ExplanationEntry[];
  explanation_count: number;
  impact_analysis: ImpactAnalysis;
  recommendation: Recommendation;
}

export interface RankedPolicy {
  policy_id: string;
  rank: number;
  score: number;
  summary: { delta: number; percent_change: number; risk_level: string };
  key_driver: { rule: string; impact_percent: number } | null;
}

export interface PolicyAnalyzeResponse {
  baseline: SimulateResult;
  policies: PolicyOutput[];
  ranking: {
    ranked_policies: RankedPolicy[];
    best_policy: { policy_id: string; reason: string } | null;
  };
  summary: { total_policies: number; best_policy_id: string };
}
