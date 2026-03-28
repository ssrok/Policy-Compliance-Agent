import pandas as pd
import numpy as np

class ExplainabilityEngine:
    """
    Generates human-readable explanations for risk scores and anomalies.
    
    This engine consumes rule violations, anomaly detection flags, and 
    risk scores to provide a plain-English summary of why a specific row 
    was flagged.
    """
    
    def generate_explanations(
        self, 
        df: pd.DataFrame, 
        violations: list, 
        risk_df: pd.DataFrame, 
        anomaly_df: pd.DataFrame
    ) -> list:
        """
        Synthesizes automated findings into text-based explanations.
        
        This method compiles rule-based failures and AI-driven anomaly signals 
        into a coherent summary that assists compliance officers in 
        decision-making.
        
        Args:
            df (pd.DataFrame): The original input dataset.
            violations (list): A list of detected rule violations (expected to have 
                               'row_index' and 'rule' attributes/keys).
            risk_df (pd.DataFrame): Data result containing 'risk_score' and 'risk_level'.
            anomaly_df (pd.DataFrame): Data result containing the 'is_anomaly' flag.
            
        Returns:
            list: A list of dictionaries, each containing 'row_index' and a 
                  textual 'explanation'.
        """
        results = []
        n_rows = len(df)
        
        # Handle empty input case
        if n_rows == 0:
            return []

        # 1. Organize violations by row_index for fast access O(V)
        violation_map = {}
        for v in violations:
            # Handle both Pydantic models/objects and raw dictionaries
            idx = getattr(v, "row_index", None)
            if idx is None and isinstance(v, dict):
                idx = v.get("row_index")
                
            rule_name = getattr(v, "rule", None)
            if rule_name is None and isinstance(v, dict):
                rule_name = v.get("rule")
            
            if idx is not None and rule_name:
                idx = int(idx)
                if idx not in violation_map:
                    violation_map[idx] = []
                violation_map[idx].append(rule_name)

        # 2. Iterate through each row to construct a descriptive explanation string
        for i in range(n_rows):
            explanation_parts = []
            
            # A) Process Rule Violations
            row_violations = violation_map.get(i, [])
            if row_violations:
                # Remove duplicates if same rule triggered multiple times for same row
                unique_rules = list(dict.fromkeys(row_violations))
                rules_text = ", ".join([f"[{r}]" for r in unique_rules])
                explanation_parts.append(f"Failed policy check(s): {rules_text}.")
            
            # B) Process Anomaly Detection Flags
            is_anomaly = 0
            if "is_anomaly" in anomaly_df.columns:
                try:
                    # Alignment check based on positional index
                    is_anomaly = int(anomaly_df.iloc[i]["is_anomaly"])
                except (IndexError, KeyError, ValueError):
                    is_anomaly = 0
            
            if is_anomaly == 1:
                explanation_parts.append("Unusual transaction pattern detected by the ML intelligence module.")
            
            # C) Extract Risk Metrics
            risk_level = "LOW"
            risk_score = 0.0
            if "risk_level" in risk_df.columns:
                try:
                    risk_level = str(risk_df.iloc[i]["risk_level"])
                    risk_score = float(risk_df.iloc[i]["risk_score"])
                except (IndexError, KeyError, ValueError):
                    pass
            
            # D) Synthesize Final Summary
            if explanation_parts:
                # High-priority explanation for flagged rows
                detail_text = " ".join(explanation_parts)
                final_explanation = (
                    f"Risk level is {risk_level} (Score: {risk_score:.1f}). "
                    f"This was flagged because: {detail_text}"
                )
            else:
                # Normal status explanation
                final_explanation = f"Transaction appears normal. Overall risk is {risk_level} (Score: {risk_score:.1f})."

            results.append({
                "row_index": i,
                "explanation": final_explanation
            })
            
        return results
