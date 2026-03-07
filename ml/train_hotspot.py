"""
Train Hotspot Prediction Model (XGBoost)

Trains a gradient boosted classifier to predict which grid cells
are likely to receive new hazard reports in the next 30 days.

Usage:
    python train_hotspot.py [--data datasets/simulated_reports.csv]
"""

import os
import sys
import logging
import argparse
from pathlib import Path
from typing import Optional

import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.metrics import roc_auc_score, classification_report
import joblib

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Grid cell size in degrees (~500m at Indian latitudes)
GRID_SIZE_DEG = 0.005


def create_grid_cells(df, grid_size=GRID_SIZE_DEG):
    """Assign each report to a grid cell and aggregate features per cell."""
    df["grid_lat"] = np.round(df["latitude"] / grid_size) * grid_size
    df["grid_lng"] = np.round(df["longitude"] / grid_size) * grid_size
    df["cell_id"] = df["grid_lat"].astype(str) + "_" + df["grid_lng"].astype(str)
    return df


def engineer_features(df, cutoff_date):
    """
    Create features for each grid cell based on data before cutoff_date.

    Features:
    - report_count: total historical reports in cell
    - avg_severity: mean severity score
    - report_trend: reports in last 30 days vs. 30-60 days ago (ratio)
    - road_mix_score: variety of road types (0-1)
    - month: current month (for seasonality)
    - is_monsoon: whether cutoff_date is in monsoon season
    - distance_water: simulated distance to water body
    """
    historical = df[df["created_at"] < cutoff_date].copy()

    if len(historical) == 0:
        return pd.DataFrame()

    # Group by cell
    cells = historical.groupby("cell_id").agg(
        report_count=("cell_id", "count"),
        avg_severity=("severity_score", "mean"),
        lat_center=("grid_lat", "first"),
        lng_center=("grid_lng", "first"),
        city=("city", "first"),
    ).reset_index()

    # Report trend: last 30 days vs 30-60 days
    d30 = cutoff_date - pd.Timedelta(days=30)
    d60 = cutoff_date - pd.Timedelta(days=60)

    recent = historical[historical["created_at"] >= d30].groupby("cell_id").size().reset_index(name="recent_count")
    older = historical[(historical["created_at"] >= d60) & (historical["created_at"] < d30)].groupby("cell_id").size().reset_index(name="older_count")

    cells = cells.merge(recent, on="cell_id", how="left")
    cells = cells.merge(older, on="cell_id", how="left")
    cells["recent_count"] = cells["recent_count"].fillna(0)
    cells["older_count"] = cells["older_count"].fillna(0)
    cells["report_trend"] = cells.apply(
        lambda r: r["recent_count"] / max(r["older_count"], 1), axis=1
    )

    # Road mix score
    road_types = historical.groupby("cell_id")["road_classification"].nunique().reset_index(name="road_variety")
    cells = cells.merge(road_types, on="cell_id", how="left")
    cells["road_mix_score"] = cells["road_variety"].fillna(1) / 4.0

    # Temporal features
    cells["month"] = cutoff_date.month
    cells["is_monsoon"] = int(cutoff_date.month in {6, 7, 8, 9})

    # Simulated distance to water (based on lat/lng hash)
    np.random.seed(42)
    cells["distance_water"] = np.random.uniform(0.1, 10.0, len(cells))

    return cells


def create_labels(df, cutoff_date, window_days=30):
    """Create binary labels: did this grid cell get a new report within window_days?"""
    future = df[
        (df["created_at"] >= cutoff_date) &
        (df["created_at"] < cutoff_date + pd.Timedelta(days=window_days))
    ]
    active_cells = set(future["cell_id"].unique())
    return active_cells


def train_model(data_path: str, output_path: Optional[str] = None):
    """Train the hotspot prediction model."""
    logger.info(f"Loading data from {data_path}")
    df = pd.read_csv(data_path, parse_dates=["created_at"])

    # Handle resolved_at column
    if "resolved_at" in df.columns:
        df["resolved_at"] = pd.to_datetime(df["resolved_at"], errors="coerce")

    # Assign grid cells
    df = create_grid_cells(df)

    # Use multiple cutoff dates for more training data
    cutoff_dates = pd.date_range(
        start=df["created_at"].min() + pd.Timedelta(days=90),
        end=df["created_at"].max() - pd.Timedelta(days=30),
        freq="30D",
    )

    all_features = []
    all_labels = []

    for cutoff in cutoff_dates:
        features = engineer_features(df, cutoff)
        if len(features) == 0:
            continue

        active_cells = create_labels(df, cutoff)
        features["label"] = features["cell_id"].isin(active_cells).astype(int)

        all_features.append(features)

    if not all_features:
        logger.error("No training data generated!")
        return

    dataset = pd.concat(all_features, ignore_index=True)
    logger.info(f"Training dataset: {len(dataset)} samples, {dataset['label'].sum()} positive ({dataset['label'].mean()*100:.1f}%)")

    # Feature columns
    feature_cols = [
        "report_count", "avg_severity", "report_trend",
        "road_mix_score", "month", "is_monsoon", "distance_water"
    ]

    X = dataset[feature_cols].values
    y = dataset["label"].values

    # Train/test split
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    # Train XGBoost
    try:
        from xgboost import XGBClassifier
        model = XGBClassifier(
            n_estimators=100,
            max_depth=5,
            learning_rate=0.1,
            min_child_weight=3,
            subsample=0.8,
            colsample_bytree=0.8,
            random_state=42,
            eval_metric="logloss",
        )
    except ImportError:
        from sklearn.ensemble import GradientBoostingClassifier
        logger.warning("XGBoost not available, using sklearn GradientBoosting")
        model = GradientBoostingClassifier(
            n_estimators=100,
            max_depth=5,
            learning_rate=0.1,
            random_state=42,
        )

    logger.info("Training model...")
    model.fit(X_train, y_train)

    # Evaluate
    y_pred_proba = model.predict_proba(X_test)[:, 1]
    y_pred = model.predict(X_test)

    auc = roc_auc_score(y_test, y_pred_proba)
    logger.info(f"AUC-ROC: {auc:.4f}")
    logger.info(f"\n{classification_report(y_test, y_pred)}")

    # Feature importance
    if hasattr(model, "feature_importances_"):
        importances = sorted(zip(feature_cols, model.feature_importances_), key=lambda x: -x[1])
        logger.info("Feature importances:")
        for feat, imp in importances:
            logger.info(f"  {feat}: {imp:.4f}")

    # Save model
    if output_path is None:
        output_path = os.path.join(os.path.dirname(__file__), "models", "hotspot_model.joblib")

    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    joblib.dump(model, output_path)
    logger.info(f"Model saved to {output_path}")

    return model, auc


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Train hotspot prediction model")
    parser.add_argument("--data", default="datasets/simulated_reports.csv",
                        help="Path to training data CSV")
    parser.add_argument("--output", default=None,
                        help="Output path for model file")
    args = parser.parse_args()

    # Change to script directory
    os.chdir(os.path.dirname(os.path.abspath(__file__)))

    train_model(args.data, args.output)
