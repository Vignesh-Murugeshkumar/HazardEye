"""
Simulated Historical Data Generator for HazardEye

Generates 2000+ simulated historical hazard reports across 10 Indian cities
with realistic distribution patterns for training the hotspot prediction model.
"""

import random
import csv
import os
from datetime import datetime, timedelta
from pathlib import Path

# ============================================
# CITY CENTERS (lat, lng) + approximate radius
# ============================================

CITIES = {
    "Mumbai": {"lat": 19.076, "lng": 72.8777, "radius": 0.15},
    "Delhi": {"lat": 28.6139, "lng": 77.2090, "radius": 0.18},
    "Bangalore": {"lat": 12.9716, "lng": 77.5946, "radius": 0.12},
    "Chennai": {"lat": 13.0827, "lng": 80.2707, "radius": 0.10},
    "Kolkata": {"lat": 22.5726, "lng": 88.3639, "radius": 0.12},
    "Hyderabad": {"lat": 17.3850, "lng": 78.4867, "radius": 0.12},
    "Pune": {"lat": 18.5204, "lng": 73.8567, "radius": 0.10},
    "Ahmedabad": {"lat": 23.0225, "lng": 72.5714, "radius": 0.10},
    "Jaipur": {"lat": 26.9124, "lng": 75.7873, "radius": 0.10},
    "Lucknow": {"lat": 26.8467, "lng": 80.9462, "radius": 0.08},
}

HAZARD_TYPES = ["pothole", "broken_edge", "waterlogging", "missing_manhole"]
HAZARD_WEIGHTS = [0.45, 0.25, 0.20, 0.10]  # Potholes most common

ROAD_TYPES = ["national_highway", "state_highway", "urban_road", "rural_road"]
ROAD_WEIGHTS = [0.10, 0.15, 0.55, 0.20]

WEATHER_CONDITIONS = ["Sunny", "Partly cloudy", "Cloudy", "Light rain", "Heavy rain", "Thunderstorm", "Mist"]

STATUSES = ["reported", "verified", "in_progress", "resolved", "resolved_unverified"]
STATUS_WEIGHTS = [0.25, 0.20, 0.15, 0.30, 0.10]

# Monsoon months (higher waterlogging)
MONSOON_MONTHS = {6, 7, 8, 9}


def generate_hotspot_areas(city_info, num_hotspots=5):
    """Generate a few 'hotspot' areas within a city that have higher report density."""
    hotspots = []
    for _ in range(num_hotspots):
        lat = city_info["lat"] + random.uniform(-city_info["radius"], city_info["radius"])
        lng = city_info["lng"] + random.uniform(-city_info["radius"], city_info["radius"])
        hotspots.append({"lat": lat, "lng": lng, "intensity": random.uniform(0.5, 1.0)})
    return hotspots


def generate_report(city_name, city_info, hotspots, report_date):
    """Generate a single simulated report."""
    # 60% chance of being near a hotspot, 40% random location
    if random.random() < 0.6 and hotspots:
        hotspot = random.choice(hotspots)
        lat = hotspot["lat"] + random.gauss(0, 0.01)
        lng = hotspot["lng"] + random.gauss(0, 0.01)
    else:
        lat = city_info["lat"] + random.uniform(-city_info["radius"], city_info["radius"])
        lng = city_info["lng"] + random.uniform(-city_info["radius"], city_info["radius"])

    month = report_date.month

    # Adjust hazard type weights based on season
    weights = HAZARD_WEIGHTS.copy()
    if month in MONSOON_MONTHS:
        # More waterlogging during monsoon
        weights[2] = 0.40  # waterlogging
        weights[0] = 0.30  # pothole (still common)

    hazard_type = random.choices(HAZARD_TYPES, weights=weights, k=1)[0]
    road_type = random.choices(ROAD_TYPES, weights=ROAD_WEIGHTS, k=1)[0]
    status = random.choices(STATUSES, weights=STATUS_WEIGHTS, k=1)[0]

    # Severity: higher near hotspots, for missing manholes, during monsoon
    base_severity = random.uniform(3, 8)
    if hazard_type == "missing_manhole":
        base_severity += 2
    if month in MONSOON_MONTHS:
        base_severity += 1
    severity = round(min(10, max(1, base_severity)), 2)

    # Weather
    if month in MONSOON_MONTHS:
        weather = random.choices(WEATHER_CONDITIONS, weights=[0.05, 0.05, 0.15, 0.30, 0.30, 0.10, 0.05], k=1)[0]
    else:
        weather = random.choices(WEATHER_CONDITIONS, weights=[0.30, 0.25, 0.20, 0.10, 0.05, 0.02, 0.08], k=1)[0]

    rain_mm = 0
    if "rain" in weather.lower():
        rain_mm = round(random.uniform(2, 50), 1)
    elif weather == "Thunderstorm":
        rain_mm = round(random.uniform(20, 80), 1)

    # Resolution date if resolved
    resolved_at = None
    if status in ["resolved", "resolved_unverified"]:
        days_to_resolve = random.randint(1, 60)
        resolved_at = report_date + timedelta(days=days_to_resolve)

    # Repair cost estimate
    cost_bases = {"pothole": 1500, "broken_edge": 1000, "waterlogging": 2500, "missing_manhole": 10000}
    road_mult = {"national_highway": 1.5, "state_highway": 1.3, "urban_road": 1.0, "rural_road": 0.8}
    area = random.uniform(0.5, 3.0) if hazard_type != "missing_manhole" else 1
    cost = round(cost_bases[hazard_type] * area * road_mult[road_type] * (severity / 10), 2)

    return {
        "city": city_name,
        "latitude": round(lat, 6),
        "longitude": round(lng, 6),
        "hazard_type": hazard_type,
        "severity_score": severity,
        "road_classification": road_type,
        "status": status,
        "weather_condition": weather,
        "rain_mm": rain_mm,
        "estimated_repair_cost": cost,
        "created_at": report_date.strftime("%Y-%m-%d %H:%M:%S"),
        "resolved_at": resolved_at.strftime("%Y-%m-%d %H:%M:%S") if resolved_at else "",
    }


def generate_all_data(num_reports=2500, output_dir=None):
    """Generate the full simulated dataset."""
    random.seed(42)

    if output_dir is None:
        output_dir = os.path.join(os.path.dirname(__file__), "datasets")
    os.makedirs(output_dir, exist_ok=True)

    reports = []
    city_hotspots = {}

    # Generate hotspots per city
    for city_name, city_info in CITIES.items():
        city_hotspots[city_name] = generate_hotspot_areas(city_info)

    # Generate reports across 18 months
    start_date = datetime(2024, 7, 1)
    end_date = datetime(2026, 1, 1)
    date_range_days = (end_date - start_date).days

    # Weight cities by size
    city_weights = {
        "Mumbai": 0.18, "Delhi": 0.18, "Bangalore": 0.14,
        "Chennai": 0.10, "Kolkata": 0.10, "Hyderabad": 0.08,
        "Pune": 0.07, "Ahmedabad": 0.06, "Jaipur": 0.05, "Lucknow": 0.04,
    }

    for _ in range(num_reports):
        city_name = random.choices(
            list(city_weights.keys()),
            weights=list(city_weights.values()),
            k=1
        )[0]
        city_info = CITIES[city_name]
        hotspots = city_hotspots[city_name]

        # Random date within range
        days_offset = random.randint(0, date_range_days)
        report_date = start_date + timedelta(days=days_offset)

        report = generate_report(city_name, city_info, hotspots, report_date)
        reports.append(report)

    # Write CSV
    csv_path = os.path.join(output_dir, "simulated_reports.csv")
    fieldnames = list(reports[0].keys())

    with open(csv_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(reports)

    print(f"Generated {len(reports)} simulated reports → {csv_path}")
    print(f"Cities: {len(CITIES)}")
    print(f"Date range: {start_date.date()} to {end_date.date()}")

    # Print summary
    from collections import Counter
    type_counts = Counter(r["hazard_type"] for r in reports)
    city_counts = Counter(r["city"] for r in reports)
    print(f"\nHazard type distribution:")
    for t, c in type_counts.most_common():
        print(f"  {t}: {c} ({c/len(reports)*100:.1f}%)")
    print(f"\nCity distribution:")
    for city, c in city_counts.most_common():
        print(f"  {city}: {c} ({c/len(reports)*100:.1f}%)")

    return reports


if __name__ == "__main__":
    generate_all_data()
