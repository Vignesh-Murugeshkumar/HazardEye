"""
Repair Cost Estimator

Estimates the approximate repair cost in INR for a road hazard based on:
- Hazard type
- Severity score
- Road classification
- Estimated area (from bounding box ratio)
"""

from typing import Optional


# Base cost ranges per hazard type (INR per square meter)
HAZARD_BASE_COST = {
    "pothole": {"min": 800, "max": 2500},
    "broken_edge": {"min": 600, "max": 1800},
    "waterlogging": {"min": 1500, "max": 4000},
    "missing_manhole": {"min": 5000, "max": 15000},  # per unit, not per sqm
}

# Road classification multiplier
ROAD_MULTIPLIER = {
    "national_highway": 1.5,
    "state_highway": 1.3,
    "urban_road": 1.0,
    "rural_road": 0.8,
}

# Assume average photographed area visible from phone camera at ~1.5m height
# A typical road photo covers approximately 3-5 sqm at ground level
DEFAULT_PHOTO_COVERAGE_SQM = 4.0  # square meters


def estimate_repair_cost(
    hazard_type: str,
    severity_score: float,
    road_classification: str,
    bbox_area_ratio: float,
    photo_coverage_sqm: float = DEFAULT_PHOTO_COVERAGE_SQM,
) -> float:
    """
    Estimate the repair cost in INR.

    For missing_manhole, cost is per unit (not area-based).
    For other hazard types, cost is based on estimated affected area.

    Args:
        hazard_type: Type of hazard detected
        severity_score: 1-10 severity score
        road_classification: Type of road
        bbox_area_ratio: Ratio of detection bbox to total image area
        photo_coverage_sqm: Estimated real-world area covered by the photo

    Returns:
        Estimated repair cost in INR
    """
    cost_range = HAZARD_BASE_COST.get(hazard_type, HAZARD_BASE_COST["pothole"])
    road_mult = ROAD_MULTIPLIER.get(road_classification, 1.0)

    # Interpolate within the cost range based on severity
    severity_factor = severity_score / 10.0
    base_cost_per_unit = cost_range["min"] + (cost_range["max"] - cost_range["min"]) * severity_factor

    if hazard_type == "missing_manhole":
        # Flat per-unit cost for manhole cover replacement
        estimated_cost = base_cost_per_unit * road_mult
    else:
        # Estimate the physical area of the hazard
        estimated_area = bbox_area_ratio * photo_coverage_sqm
        estimated_area = max(0.5, min(estimated_area, photo_coverage_sqm))  # clamp

        estimated_cost = base_cost_per_unit * estimated_area * road_mult

    return round(estimated_cost, 2)
