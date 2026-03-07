"""
Hotspot Prediction Model

Uses a spatial grid approach + XGBoost to predict which areas are likely
to develop new hazards in the next 30 days.

Features per grid cell:
- Historical report count
- Average severity
- Report frequency trend
- Road classification mix
- Seasonal factors (month/monsoon)
- Distance to water bodies (simulated)
"""

import os
import json
import logging
from pathlib import Path
from typing import Optional

import numpy as np
import pandas as pd
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)


class HotspotPredictor:
    """Loads trained model and generates predictions for grid cells."""

    def __init__(self, model_path: Optional[str] = None):
        self.model = None
        self.model_path = model_path
        self._loaded = False

    def load_model(self, model_path: Optional[str] = None):
        path = model_path or self.model_path
        if path and os.path.exists(path):
            try:
                import joblib
                self.model = joblib.load(path)
                self._loaded = True
                logger.info(f"Hotspot model loaded from {path}")
                return
            except Exception as e:
                logger.warning(f"Failed to load hotspot model: {e}")
        self._loaded = False

    def predict_grid(self, city: str, grid_features: pd.DataFrame) -> np.ndarray:
        """
        Predict risk scores for a grid of cells.

        Args:
            city: City name
            grid_features: DataFrame with columns:
                - lat_center, lng_center
                - report_count, avg_severity, report_trend
                - road_mix_score, month, is_monsoon
                - distance_water (km)

        Returns:
            Array of risk scores [0, 1] for each grid cell.
        """
        if self.model and self._loaded:
            feature_cols = [
                "report_count", "avg_severity", "report_trend",
                "road_mix_score", "month", "is_monsoon", "distance_water"
            ]
            X = grid_features[feature_cols].values
            return self.model.predict_proba(X)[:, 1]
        else:
            return self._simulate_predictions(grid_features)

    def _simulate_predictions(self, grid_features: pd.DataFrame) -> np.ndarray:
        """Simulated predictions based on historical report density."""
        np.random.seed(42)
        n = len(grid_features)

        # Base risk from report count (more reports → higher risk)
        report_counts = np.asarray(grid_features.get("report_count", pd.Series(np.zeros(n))).values, dtype=float)
        max_count = max(float(np.nanmax(report_counts)) if len(report_counts) > 0 else 1, 1)
        base_risk = report_counts / max_count * 0.6

        # Severity contribution
        severities = np.asarray(grid_features.get("avg_severity", pd.Series(np.full(n, 5.0))).values, dtype=float)
        severity_risk = severities / 10.0 * 0.2

        # Monsoon bonus
        is_monsoon = np.asarray(grid_features.get("is_monsoon", pd.Series(np.zeros(n))).values, dtype=float)
        monsoon_risk = is_monsoon * 0.15

        # Random noise
        noise = np.random.uniform(-0.05, 0.05, n)

        risk_scores = np.clip(base_risk + severity_risk + monsoon_risk + noise, 0.0, 1.0)
        return risk_scores


# Global singleton
hotspot_predictor = HotspotPredictor()
