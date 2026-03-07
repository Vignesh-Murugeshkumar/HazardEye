# 🛣️ HazardEye — AI-Powered Road Hazard Reporting Platform

> **Crowdsourced pothole and road hazard detection with AI severity scoring, predictive hotspots, MLA accountability, and gamified citizen engagement.**

![Python](https://img.shields.io/badge/Python-3.11-blue) ![FastAPI](https://img.shields.io/badge/FastAPI-0.115-green) ![React Native](https://img.shields.io/badge/React%20Native-Expo%2052-blueviolet) ![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16%20%2B%20PostGIS-orange) ![YOLOv8](https://img.shields.io/badge/YOLOv8-Ultralytics-red)

---

## 📋 Table of Contents

- [Features](#-features)
- [Architecture](#-architecture)
- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
- [Setup & Installation](#-setup--installation)
- [API Documentation](#-api-documentation)
- [ML Pipeline](#-ml-pipeline)
- [Mobile App](#-mobile-app)
- [Database Schema](#-database-schema)
- [Demo Credentials](#-demo-credentials)

---

## ✨ Features

### Core Features
- **📸 AI Hazard Detection** — Upload a photo, YOLOv8 detects hazard type (pothole, broken edge, waterlogging, missing manhole) with confidence scores
- **🎯 Severity Scoring** — Automated 1-10 severity rating based on hazard type, detection confidence, and affected area
- **🗺️ Interactive Map** — Real-time hazard map with custom markers, severity-color-coded pins, and filter controls
- **✅ Community Verification** — Citizens verify reports via upvotes and repair confirmations (crowd-sourced accountability)

### Enhanced Features (6 Innovations)
1. **🔥 Predictive Hotspot Mapping** — XGBoost ML model predicts future hazard-prone areas using historical patterns, weather data, and road classification
2. **💰 Repair Cost Estimator** — Automated ₹ cost estimation per hazard type/severity using road-class-specific matrices
3. **🔧 Contractor Accountability** — Repair verification workflow with push notifications; citizens confirm/deny repairs to prevent false claims
4. **🌧️ Weather Correlation Layer** — WeatherAPI.com integration showing weather overlays on the map and weather-at-report metadata
5. **🏛️ MLA/Ward Accountability Dashboard** — Constituency-level performance grading (A+ to F), resolution rates, response time tracking
6. **🏆 Gamification & Leaderboard** — Points system (submit=5, verified=15, resolved=25, verify=3), badges, weekly/monthly/all-time rankings

---

## 🏗️ Architecture

```
┌─────────────────┐     REST API      ┌──────────────────┐     SQL       ┌──────────────────┐
│   React Native   │ ◄──────────────► │     FastAPI       │ ◄──────────► │  PostgreSQL 16   │
│   Expo 52 App    │                   │   Python 3.11     │              │  + PostGIS 3.4   │
│                  │                   │                    │              │                  │
│  • Expo Router   │                   │  • JWT Auth        │              │  • Spatial Index  │
│  • React Native  │                   │  • YOLO Detector   │              │  • GeoAlchemy2    │
│    Maps          │                   │  • Cost Estimator  │              │  • 6 Tables       │
│  • Expo Camera   │                   │  • Weather Service  │              │  • 7 Enums        │
│  • Expo Location │                   │  • Gamification    │              │                  │
└─────────────────┘                   └──────────────────┘              └──────────────────┘
                                           │
                                    ┌──────┴──────┐
                                    │  ML Models   │
                                    │  • YOLOv8n   │
                                    │  • XGBoost   │
                                    └─────────────┘
```

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Mobile** | React Native (Expo 52), Expo Router v4, TypeScript |
| **Backend** | FastAPI, Async SQLAlchemy, Uvicorn |
| **Database** | PostgreSQL 16 + PostGIS 3.4 |
| **ML Detection** | YOLOv8n (Ultralytics) — 4 hazard classes |
| **ML Prediction** | XGBoost — hotspot risk scoring |
| **Auth** | JWT (python-jose + passlib/bcrypt) |
| **Maps** | Google Maps (react-native-maps) |
| **Weather** | WeatherAPI.com |
| **Notifications** | Expo Push Notifications |
| **Containerization** | Docker Compose |

---

## 📁 Project Structure

```
HazardEye/
├── backend/
│   ├── app/
│   │   ├── config.py          # Pydantic Settings (env vars)
│   │   ├── database.py        # Async SQLAlchemy engine
│   │   ├── main.py            # FastAPI app + lifespan
│   │   ├── models/
│   │   │   └── models.py      # ORM: Users, Reports, Verifications, etc.
│   │   ├── schemas/
│   │   │   └── schemas.py     # Pydantic v2 request/response schemas
│   │   ├── routes/
│   │   │   ├── auth.py        # Register, Login, Refresh, Push Token
│   │   │   ├── reports.py     # CRUD + AI detection + cost + weather
│   │   │   ├── verification.py # Upvote, Repair Confirm/Deny
│   │   │   ├── hotspots.py    # GeoJSON predictive hotspots
│   │   │   ├── constituencies.py # MLA/Ward accountability
│   │   │   ├── leaderboard.py # Rankings + badges
│   │   │   └── weather.py     # Current, overlay, alerts
│   │   ├── ml/
│   │   │   ├── detector.py    # YOLOv8 hazard detection
│   │   │   ├── severity.py    # Severity scoring formula
│   │   │   └── hotspot.py     # XGBoost hotspot prediction
│   │   ├── services/
│   │   │   ├── cost_estimator.py   # Repair cost calculation
│   │   │   ├── weather.py          # WeatherAPI.com client
│   │   │   ├── notifications.py    # Expo push notifications
│   │   │   └── gamification.py     # Points & badges
│   │   └── utils/
│   │       └── auth.py        # JWT helpers, password hashing
│   ├── Dockerfile
│   └── requirements.txt
├── mobile/
│   ├── app/
│   │   ├── _layout.tsx        # Root layout (providers)
│   │   ├── index.tsx          # Auth redirect
│   │   ├── (auth)/
│   │   │   ├── login.tsx      # Login screen
│   │   │   └── register.tsx   # Registration with city picker
│   │   ├── (tabs)/
│   │   │   ├── report.tsx     # 4-step: Capture → Details → AI → Result
│   │   │   ├── map.tsx        # Google Maps + filters + hotspots
│   │   │   ├── leaderboard.tsx # Podium + weekly/monthly/all-time
│   │   │   └── profile.tsx    # Stats, badges, points guide
│   │   ├── report-detail/
│   │   │   └── [id].tsx       # Full report view + verify/status actions
│   │   ├── verify/
│   │   │   └── [id].tsx       # Repair verification flow
│   │   └── accountability.tsx # MLA constituency dashboard
│   ├── components/
│   │   ├── SeverityGauge.tsx
│   │   ├── HazardBadge.tsx
│   │   └── ReportCard.tsx
│   ├── context/
│   │   ├── AuthContext.tsx     # JWT storage + auth state
│   │   └── NotificationContext.tsx
│   ├── hooks/
│   │   ├── useLocation.ts     # GPS + reverse geocoding
│   │   └── useCamera.ts       # Camera + gallery
│   ├── services/
│   │   └── api.ts             # Axios + interceptors + all API calls
│   └── constants/
│       └── index.ts           # Colors, labels, configs
├── database/
│   ├── init.sql               # Full PostGIS schema
│   └── seed.sql               # Sample data (users, reports, constituencies)
├── ml/
│   ├── generate_simulated_data.py  # 2500 synthetic reports
│   ├── train_hotspot.py            # XGBoost grid-cell training
│   ├── train_yolo.py               # YOLOv8 fine-tuning
│   └── requirements.txt
├── docker-compose.yml
├── .env.example
├── .gitignore
└── README.md
```

---

## 🚀 Setup & Installation

### Prerequisites
- Docker & Docker Compose
- Node.js 18+ & npm
- Expo CLI (`npx expo`)
- Python 3.11+ (for ML training only)

### 1. Backend + Database (Docker)

```bash
# Clone and configure
cp .env.example .env
# Edit .env with your API keys (WeatherAPI.com, Google Maps)

# Start services
docker-compose up -d

# Database auto-initializes with init.sql schema
# Seed with sample data:
docker exec -i hazardeye-postgres psql -U hazardeye -d hazardeye < database/seed.sql
```

The backend will be available at `http://localhost:8000`.

### 2. Mobile App

```bash
cd mobile

# Install dependencies
npm install

# Update API URL in constants/index.ts
# Set API_BASE_URL to your local IP (e.g., http://192.168.1.100:8000)

# Start Expo
npx expo start

# Scan QR code with Expo Go app, or:
npx expo start --android
npx expo start --ios
```

### 3. ML Training (Optional)

```bash
cd ml
pip install -r requirements.txt

# Generate synthetic training data
python generate_simulated_data.py

# Train hotspot prediction model
python train_hotspot.py

# Train YOLO model (requires labeled dataset)
python train_yolo.py
```

> **Note:** The backend includes simulation fallback modes for both YOLO and hotspot prediction, so the app works end-to-end even without trained models.

---

## 📡 API Documentation

Base URL: `http://localhost:8000`

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login (returns JWT) |
| POST | `/api/auth/refresh` | Refresh access token |
| GET | `/api/auth/me` | Get current user |
| PUT | `/api/auth/push-token` | Update Expo push token |

### Reports
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/reports` | Submit report (multipart image + GPS) |
| GET | `/api/reports` | List reports (filters: status, type, severity, bbox) |
| GET | `/api/reports/{id}` | Get report detail |
| PATCH | `/api/reports/{id}/status` | Update status (authority only) |

### Verification
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/reports/{id}/verify` | Submit verification (upvote/confirm/deny) |
| GET | `/api/reports/{id}/verifications` | Get verification summary |

### Hotspots
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/hotspots` | Get predictive hotspots (GeoJSON) |
| POST | `/api/hotspots/refresh` | Refresh predictions (admin) |

### Constituencies
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/constituencies` | List with stats (sortable) |
| GET | `/api/constituencies/{id}/stats` | Detailed constituency stats |

### Leaderboard
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/leaderboard` | Top 50 (weekly/monthly/alltime) |
| GET | `/api/leaderboard/me` | Current user stats + badges |

### Weather
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/weather/current` | Current weather at coordinates |
| GET | `/api/weather/overlay` | Grid weather for map bbox |
| GET | `/api/weather/alerts` | Weather alerts by city |

### Health
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Service health check |

---

## 🤖 ML Pipeline

### YOLOv8 Hazard Detection
- **Model:** YOLOv8n (nano) — optimized for mobile inference
- **Classes:** `pothole`, `broken_edge`, `waterlogging`, `missing_manhole`
- **Fallback:** Simulation mode using image pixel analysis when model file unavailable

### Severity Scoring Formula
```
score = base_weight × 0.4 + confidence × 10 × 0.3 + area_ratio × 10 × 0.3 + multi_bonus
```
Where `base_weight`: missing_manhole=9, pothole=7, waterlogging=6, broken_edge=5

### XGBoost Hotspot Prediction
- **Features:** report_count, avg_severity, trend, road_mix, month, monsoon_flag, water_distance
- **Output:** Risk score (0-1) per grid cell
- **Training data:** 2500 simulated reports across 10 Indian cities

---

## 📱 Mobile App

### Screens

| Tab | Screen | Features |
|-----|--------|----------|
| 📸 Report | Camera capture | 4-step flow: Capture → Road type → AI Analysis → Result with severity |
| 🗺️ Map | Hazard map | Clustered markers, hazard/status filters, hotspot overlay, MLA FAB |
| 🏆 Ranks | Leaderboard | Podium top 3, period tabs, city filter, personal stats |
| 👤 Profile | User profile | Points, badges, reports, logout |
| – | Report Detail | Full details, mini-map, verification buttons, status updates |
| – | Verify | Repair confirmation/denial with optional photo |
| – | Accountability | Constituency grades, resolution rates, sort/filter |

### Design System
- **Primary:** Safety Orange `#FF6B35`
- **Secondary:** Charcoal `#2D2D2D`
- **Severity colors:** Green (1-3) → Yellow (4-6) → Orange (7-8) → Red (9-10)

---

## 🗄️ Database Schema

### Tables
- **users** — email, name, role (citizen/authority/admin), points, city, push_token
- **constituencies** — name, type (mla/ward), city, representative, PostGIS boundary polygon
- **reports** — location (PostGIS Point), hazard_type, severity, cost, status, weather, FK to user/constituency
- **verifications** — type (upvote/repair_confirm/repair_deny), FK to report/user
- **hotspot_predictions** — zone (PostGIS Point), risk_score, predicted_count
- **leaderboard_events** — event_type, points, FK to user/report

### Spatial Features
- PostGIS `GEOGRAPHY(POINT, 4326)` for report locations
- PostGIS `GEOGRAPHY(POLYGON, 4326)` for constituency boundaries
- `ST_Contains()` for auto-assigning reports to constituencies
- `ST_DWithin()` for nearby verification notifications (1km radius)

---

## 🔑 Demo Credentials

| Email | Password | Role |
|-------|----------|------|
| priya@example.com | password123 | citizen |
| rahul@example.com | password123 | citizen |
| anita@example.com | password123 | citizen |
| vikram@example.com | password123 | citizen |
| meera@example.com | password123 | citizen |
| officer@bmc.gov.in | password123 | authority |
| admin@hazardeye.app | password123 | admin |

---

## 📄 License

Built for hackathon demonstration. MIT License.

---

<p align="center">
  <b>🛣️ HazardEye</b> — Making Indian roads safer, one report at a time.
</p>
