import pandas as pd
import numpy as np

class RiskScorer:
    """
    Combined risk scoring module that blends rule-based violations and 
    machine-learning-based anomaly detection results into a final risk metric.
    """
    
    def compute_risk(self, df: pd.DataFrame, violations: list, anomaly_df: pd.DataFrame) -> pd.DataFrame:
        """
        Calculates normalized risk scores and classifies them into risk levels.
        
        This method combines the frequency of rule-based violations with the 
        intensity of detected anomalies using a weighted average.
        
        Weights:
        - Rule Violations: 60%
        - Anomaly Score: 40%
        
        Args:
            df (pd.DataFrame): The original input dataset.
            violations (list): A list of violation objects or dicts, each expected 
                               to have a 'row_index' field.
            anomaly_df (pd.DataFrame): A DataFrame (aligned with df) containing 
                                       the 'anomaly_score' column (scale 0-1).
            
        Returns:
            pd.DataFrame: A copy of the input DataFrame with 'risk_score' (0-100) 
                          and 'risk_level' (LOW/MEDIUM/HIGH) columns.
        """
        # Create a deep copy to avoid modifying original data
        results = df.copy()
        n_rows = len(df)
        
        # Handle empty input case gracefully
        if n_rows == 0:
            results["risk_score"] = []
            results["risk_level"] = []
            return results

        # 1. Rule Score Calculation
        # We count the number of violations associated with each row index.
        violation_counts = np.zeros(n_rows)
        for v in violations:
            # Check for 'row_index' as an attribute (e.g. Pydantic model) or dict key
            idx = getattr(v, "row_index", None)
            if idx is None and isinstance(v, dict):
                idx = v.get("row_index")
                
            # Verify the index is within bounds of the current DataFrame
            if idx is not None and 0 <= int(idx) < n_rows:
                violation_counts[int(idx)] += 1
        
        # Normalize rule_scores to [0, 1] based on the maximum violations in the batch
        max_v = violation_counts.max()
        rule_scores = violation_counts / max_v if max_v > 0 else np.zeros(n_rows)
        
        # 2. Anomaly Score Extraction
        # Ensure strict index alignment (Requirement 4)
        # Use reindex to map anomaly scores to the search results' exact row order/index
        aligned_anomaly = anomaly_df.reindex(df.index).fillna(0.5) # Default to mid-range if missing
        
        if "anomaly_score" in aligned_anomaly.columns:
            anomaly_scores = aligned_anomaly["anomaly_score"].values
        else:
            anomaly_scores = np.full(n_rows, 0.5)

        # 3. Final Risk Score Computation
        # Weighted formula: (60% Rule Score + 40% Anomaly Score) scaled to 100
        raw_final_scores = (0.6 * rule_scores + 0.4 * anomaly_scores) * 100
        
        # Clamp values between 0 and 100 (Requirement 6)
        final_scores = np.clip(raw_final_scores, 0, 100)
        
        # 4. Classification into Risk Levels
        results["risk_score"] = final_scores.astype(float)
        
        # Safety Check: Log if all scores are zero (Requirement 7)
        if n_rows > 0 and results["risk_score"].sum() == 0:
            import logging
            logging.warning("All risk scores are zero — check feature distribution or model input.")

        conditions = [
            (results["risk_score"] < 30),
            (results["risk_score"] >= 30) & (results["risk_score"] < 70),
            (results["risk_score"] >= 70)
        ]
        choices = ["LOW", "MEDIUM", "HIGH"]
        
        results["risk_level"] = np.select(conditions, choices, default="LOW")
        
        return results
