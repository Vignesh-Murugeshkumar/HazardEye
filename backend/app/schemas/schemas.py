from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, EmailStr, Field
from uuid import UUID
from enum import Enum


# ============================================
# ENUMS
# ============================================

class UserRoleEnum(str, Enum):
    citizen = "citizen"
    authority = "authority"
    admin = "admin"


class HazardTypeEnum(str, Enum):
    pothole = "pothole"
    broken_edge = "broken_edge"
    waterlogging = "waterlogging"
    missing_manhole = "missing_manhole"


class ReportStatusEnum(str, Enum):
    reported = "reported"
    verified = "verified"
    in_progress = "in_progress"
    resolved = "resolved"
    resolved_unverified = "resolved_unverified"


class RoadClassEnum(str, Enum):
    national_highway = "national_highway"
    state_highway = "state_highway"
    urban_road = "urban_road"
    rural_road = "rural_road"


class VerificationTypeEnum(str, Enum):
    upvote = "upvote"
    repair_confirm = "repair_confirm"
    repair_deny = "repair_deny"


class ConstituencyTypeEnum(str, Enum):
    mla = "mla"
    ward = "ward"


# ============================================
# AUTH SCHEMAS
# ============================================

class UserRegister(BaseModel):
    email: str = Field(..., max_length=255)
    password: str = Field(..., min_length=6, max_length=128)
    name: str = Field(..., max_length=150)
    phone: Optional[str] = Field(None, max_length=20)
    city: Optional[str] = Field(None, max_length=100)
    role: UserRoleEnum = UserRoleEnum.citizen
    invite_code: Optional[str] = None


class UserLogin(BaseModel):
    email: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: "UserResponse"


class UserResponse(BaseModel):
    id: UUID
    email: str
    name: str
    phone: Optional[str]
    role: UserRoleEnum
    city: Optional[str]
    points: int
    created_at: datetime

    class Config:
        from_attributes = True


class PushTokenUpdate(BaseModel):
    expo_push_token: str


# ============================================
# REPORT SCHEMAS
# ============================================

class ReportCreate(BaseModel):
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)
    road_classification: RoadClassEnum = RoadClassEnum.urban_road
    description: Optional[str] = None


class AIClassificationResult(BaseModel):
    hazard_type: HazardTypeEnum
    confidence: float
    severity_score: float
    bbox_area_ratio: float
    estimated_repair_cost: float


class ReportResponse(BaseModel):
    id: UUID
    user_id: UUID
    image_url: str
    latitude: float
    longitude: float
    hazard_type: HazardTypeEnum
    severity_score: float
    estimated_repair_cost: Optional[float]
    road_classification: RoadClassEnum
    status: ReportStatusEnum
    constituency_id: Optional[UUID]
    weather_at_report: Optional[dict]
    description: Optional[str]
    ai_confidence: Optional[float]
    bbox_area_ratio: Optional[float]
    upvote_count: int
    created_at: datetime
    resolved_at: Optional[datetime]
    reporter_name: Optional[str] = None
    verification_count: Optional[int] = 0

    class Config:
        from_attributes = True


class ReportListResponse(BaseModel):
    reports: List[ReportResponse]
    total: int
    page: int
    page_size: int


class ReportStatusUpdate(BaseModel):
    status: ReportStatusEnum


# ============================================
# VERIFICATION SCHEMAS
# ============================================

class VerificationCreate(BaseModel):
    type: VerificationTypeEnum


class VerificationResponse(BaseModel):
    id: UUID
    report_id: UUID
    user_id: UUID
    type: VerificationTypeEnum
    created_at: datetime

    class Config:
        from_attributes = True


class VerificationSummary(BaseModel):
    upvotes: int
    repair_confirms: int
    repair_denies: int
    user_has_voted: bool = False


# ============================================
# HOTSPOT SCHEMAS
# ============================================

class HotspotResponse(BaseModel):
    id: UUID
    zone_geojson: dict
    risk_score: float
    predicted_for_date: datetime
    city: str
    model_version: str

    class Config:
        from_attributes = True


# ============================================
# CONSTITUENCY SCHEMAS
# ============================================

class ConstituencyResponse(BaseModel):
    id: UUID
    name: str
    type: ConstituencyTypeEnum
    representative_name: Optional[str]
    city: str
    created_at: datetime

    class Config:
        from_attributes = True


class ConstituencyStatsResponse(BaseModel):
    constituency: ConstituencyResponse
    total_reports: int
    unresolved_count: int
    resolved_count: int
    avg_resolution_days: Optional[float]
    resolution_rate: float
    total_estimated_cost: float
    hazard_breakdown: dict
    trend: str  # "improving", "worsening", "stable"


# ============================================
# LEADERBOARD SCHEMAS
# ============================================

class LeaderboardEntry(BaseModel):
    user_id: UUID
    name: str
    city: Optional[str]
    points: int
    rank: int
    report_count: int


class LeaderboardResponse(BaseModel):
    entries: List[LeaderboardEntry]
    period: str
    city: Optional[str]
    user_rank: Optional[LeaderboardEntry] = None


# ============================================
# WEATHER SCHEMAS
# ============================================

class WeatherInfo(BaseModel):
    temperature_c: float
    condition: str
    humidity: int
    wind_kph: float
    is_raining: bool
    rain_mm: float
    flood_risk: bool


class WeatherOverlayPoint(BaseModel):
    latitude: float
    longitude: float
    weather: WeatherInfo
    affected_reports: int


# Resolve forward reference
TokenResponse.model_rebuild()
