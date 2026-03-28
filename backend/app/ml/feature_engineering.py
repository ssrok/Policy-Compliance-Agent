import pandas as pd
import numpy as np
from typing import List, Optional

def generate_features(df: pd.DataFrame, numeric_cols: Optional[List[str]] = None) -> pd.DataFrame:
    """
    Generate aggregate features from numeric columns.

    Fix 5: Accepts numeric_cols from schema mapping instead of hardcoding 'amount'.
    Falls back to all numeric columns in the DataFrame if none provided.
    """
    df = df.copy()

    if df.empty:
        return df

    # Determine which columns to use for feature engineering
    if numeric_cols:
        # Use only the mapped numeric columns that actually exist
        cols = [c for c in numeric_cols if c in df.columns and pd.api.types.is_numeric_dtype(df[c])]
    else:
        # Fall back to all numeric columns
        cols = df.select_dtypes(include=[np.number]).columns.tolist()

    if not cols:
        # No numeric columns at all — return df with zero features
        for feat in ["transaction_count", "avg_amount", "std_amount", "max_amount", "min_amount"]:
            df[feat] = 0.0
        return df

    # Use the first numeric column as the primary feature source
    primary = cols[0]

    df["transaction_count"] = len(df)
    df["avg_amount"]        = df[primary].mean()
    df["std_amount"]        = df[primary].std()
    df["max_amount"]        = df[primary].max()
    df["min_amount"]        = df[primary].min()

    target_cols = ["transaction_count", "avg_amount", "std_amount", "max_amount", "min_amount"]
    df[target_cols] = df[target_cols].fillna(0.0)

    try:
        is_constant = (df[target_cols].nunique() <= 1).all()
        if is_constant and len(df) > 1:
            import logging
            logging.warning("Feature variance too low — anomaly detection may be ineffective.")
    except Exception as e:
        import logging
        logging.warning(f"Feature variance check failed: {e}")

    return df
