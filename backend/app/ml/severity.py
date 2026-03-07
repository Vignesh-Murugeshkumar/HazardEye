"""
Severity Scoring Algorithm

Computes a 1–10 severity score based on:
- Hazard type base weight
- AI detection confidence
- Bounding box area ratio (proxy for hazard physical size)
- Multiple detection bonus
"""

from typing import List
from app.ml.detector import Detection


# Base severity weights by hazard type
HAZARD_BASE_WEIGHTS = {
    "pothole": 7.0,
    "broken_edge": 5.0,
    "waterlogging": 6.0,
    "missing_manhole": 9.0,
}

# Weight factors
WEIGHT_BASE = 0.40
WEIGHT_CONFIDENCE = 0.30
WEIGHT_AREA = 0.30

# Multiple detection bonus per extra detection
MULTI_DETECTION_BONUS = 0.5


def compute_severity(detections: List[Detection]) -> float:
    """
    Compute severity score (1.0 – 10.0) from a list of detections.

    Formula:
        severity = base_weight * 0.4 + (confidence * 10) * 0.3 + (area_ratio * 10) * 0.3
                 + multi_detection_bonus
        Clamped to [1.0, 10.0]

    For multiple detections, uses the highest-confidence detection as primary.
    """
    if not detections:
        return 1.0

    # Sort by confidence, use the best detection as primary
    primary = max(detections, key=lambda d: d.confidence)

    base_weight = HAZARD_BASE_WEIGHTS.get(primary.hazard_type, 5.0)
    confidence_score = primary.confidence * 10.0
    area_score = min(primary.bbox_area_ratio * 10.0, 10.0)  # cap at 10

    raw_score = (
        base_weight * WEIGHT_BASE +
        confidence_score * WEIGHT_CONFIDENCE +
        area_score * WEIGHT_AREA
    )

    # Bonus for multiple hazards detected in one image
    extra_detections = len(detections) - 1
    bonus = min(extra_detections * MULTI_DETECTION_BONUS, 2.0)

    severity = raw_score + bonus

    return round(max(1.0, min(10.0, severity)), 2)


def get_primary_hazard_type(detections: List[Detection]) -> str:
    """Return the hazard type with the highest confidence."""
    if not detections:
        return "pothole"
    primary = max(detections, key=lambda d: d.confidence)
    return primary.hazard_type
