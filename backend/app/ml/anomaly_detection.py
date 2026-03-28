import pandas as pd
import numpy as np
from sklearn.ensemble import IsolationForest

class AnomalyDetector:
    """
    Modular anomaly detection using Isolation Forest from scikit-learn.
    
    This class handles feature selection on numeric columns, basic missing 
    value imputation (filling with 0), and predicting both labels 
    (1 for anomaly, 0 for normal) and normalized anomaly scores.
    """
    
    def __init__(self, n_estimators: int = 100, contamination: float = 0.1, random_state: int = 42):
        """
        Initialize the AnomalyDetector with Isolation Forest parameters.
        
        Args:
            n_estimators (int): Number of trees in the forest.
            contamination (float): Expected share of anomalies in the dataset.
            random_state (int): Random seed for reproducibility.
        """
        self.model = IsolationForest(
            n_estimators=n_estimators,
            contamination=contamination,
            random_state=random_state
        )
        self.features = []
        self.is_fitted = False

    def fit(self, df: pd.DataFrame):
        """
        Train the model on numeric columns only.
        
        Args:
            df (pd.DataFrame): Training data.
        """
        if df.empty:
            return

        # Select only numeric columns for training
        numeric_df = df.select_dtypes(include=[np.number])
        if numeric_df.empty:
            return
            
        self.features = numeric_df.columns.tolist()
        
        # Fill missing values with 0 to prevent model errors
        train_data = numeric_df.fillna(0)
        
        try:
            self.model.fit(train_data)
            self.is_fitted = True
        except Exception as e:
            # Handle potential training errors (e.g., all rows identical)
            self.is_fitted = False
            print(f"Error fitting anomaly detection model: {e}")

    def predict(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Predict anomalies for the given DataFrame.
        
        Returns a DataFrame identical to input but with 'anomaly_score' and 'is_anomaly' columns.
        'anomaly_score' is normalized between 0 and 1 (1 being highly anomalous).
        'is_anomaly' uses 1 for anomalies and 0 for normal transactions.
        
        Args:
            df (pd.DataFrame): Data to predict on.
            
        Returns:
            pd.DataFrame: Data with results appended.
        """
        # Return empty or base if not fitted or empty input
        if df.empty or not self.is_fitted:
            results = df.copy()
            results["anomaly_score"] = 0.5 # Default fallback
            results["is_anomaly"] = 0
            return results

        try:
            # Match features used during fitting (handle missing columns safely)
            # Use only numeric columns that the model expects (Requirement 3)
            input_data = df.reindex(columns=self.features, fill_value=0).select_dtypes(include=[np.number])
            
            # Isolation Forest predict returns -1 for outlier, 1 for inlier
            # Ensure index alignment with input_data (Requirement 4)
            raw_labels = self.model.predict(input_data)
            is_anomaly = (raw_labels == -1).astype(int)
            
            # decision_function returns raw scores (lower = more anomalous)
            # Typically range in roughly [-0.5, 0.5]
            raw_scores = self.model.decision_function(input_data)
            
            # Normalize scores: 1.0 (most anomalous) to 0.0 (least anomalous)
            if len(raw_scores) > 1:
                s_min, s_max = raw_scores.min(), raw_scores.max()
                if s_max != s_min:
                    normalized_scores = (s_max - raw_scores) / (s_max - s_min)
                else:
                    # Case: Variance too low to differentiate (Requirement 2)
                    normalized_scores = np.full_like(raw_scores, 0.5)
            else:
                # Single row case
                normalized_scores = (raw_labels == -1).astype(float)
            
            # Create a clean results dataframe matching the input index (Requirement 4)
            results = df.copy()
            results["anomaly_score"] = pd.Series(normalized_scores.astype(float), index=input_data.index)
            results["is_anomaly"] = pd.Series(is_anomaly, index=input_data.index)
            
            return results
            
        except Exception as e:
            # Fallback for production safety
            import logging
            logging.error(f"Prediction error in anomaly detection: {e}")
            results = df.copy()
            results["anomaly_score"] = 0.5
            results["is_anomaly"] = 0
            return results
