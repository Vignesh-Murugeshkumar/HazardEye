import uuid
from datetime import datetime
from sqlalchemy import (
    Column, String, Integer, Float, Numeric, Text, DateTime, Enum, ForeignKey,
    UniqueConstraint, CheckConstraint, JSON, Boolean
)
from sqlalchemy.dialects.postgresql import UUID
from geoalchemy2 import Geometry
from sqlalchemy.orm import relationship
from app.database import Base
import enum


# ============================================
# ENUMS
# ============================================

class UserRole(str, enum.Enum):
    citizen = "citizen"
    authority = "authority"
    admin = "admin"


class HazardType(str, enum.Enum):
    pothole = "pothole"
    broken_edge = "broken_edge"
    waterlogging = "waterlogging"
    missing_manhole = "missing_manhole"


class ReportStatus(str, enum.Enum):
    reported = "reported"
    verified = "verified"
    in_progress = "in_progress"
    resolved = "resolved"
    resolved_unverified = "resolved_unverified"


class RoadClassification(str, enum.Enum):
    national_highway = "national_highway"
    state_highway = "state_highway"
    urban_road = "urban_road"
    rural_road = "rural_road"


class VerificationType(str, enum.Enum):
    upvote = "upvote"
    repair_confirm = "repair_confirm"
    repair_deny = "repair_deny"


class ConstituencyType(str, enum.Enum):
    mla = "mla"
    ward = "ward"


class LeaderboardEventType(str, enum.Enum):
    report_submitted = "report_submitted"
    report_verified = "report_verified"
    report_resolved = "report_resolved"
    verification_cast = "verification_cast"


# ============================================
# MODELS
# ============================================

class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    name = Column(String(150), nullable=False)
    phone = Column(String(20))
    role = Column(Enum(UserRole, name="user_role", create_type=False), nullable=False, default=UserRole.citizen)
    city = Column(String(100))
    ward_id = Column(UUID(as_uuid=True))
    expo_push_token = Column(String(255))
    points = Column(Integer, nullable=False, default=0)
    created_at = Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    reports = relationship("Report", back_populates="user", lazy="selectin")
    verifications = relationship("Verification", back_populates="user", lazy="selectin")
    leaderboard_events = relationship("LeaderboardEvent", back_populates="user", lazy="selectin")


class Constituency(Base):
    __tablename__ = "constituencies"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    type = Column(Enum(ConstituencyType, name="constituency_type", create_type=False), nullable=False)
    representative_name = Column(String(255))
    city = Column(String(100), nullable=False)
    boundary = Column(Geometry("POLYGON", srid=4326))
    created_at = Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)

    reports = relationship("Report", back_populates="constituency", lazy="selectin")


class Report(Base):
    __tablename__ = "reports"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    image_url = Column(String(500), nullable=False)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    location = Column(Geometry("POINT", srid=4326), nullable=False)
    hazard_type = Column(Enum(HazardType, name="hazard_type", create_type=False), nullable=False)
    severity_score = Column(Numeric(4, 2), nullable=False)
    estimated_repair_cost = Column(Numeric(12, 2))
    road_classification = Column(
        Enum(RoadClassification, name="road_class", create_type=False),
        nullable=False, default=RoadClassification.urban_road
    )
    status = Column(Enum(ReportStatus, name="report_status", create_type=False), nullable=False, default=ReportStatus.reported)
    constituency_id = Column(UUID(as_uuid=True), ForeignKey("constituencies.id"), nullable=True)
    weather_at_report = Column(JSON)
    description = Column(Text)
    ai_confidence = Column(Numeric(5, 4))
    bbox_area_ratio = Column(Numeric(5, 4))
    upvote_count = Column(Integer, nullable=False, default=0)
    created_at = Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)
    resolved_at = Column(DateTime(timezone=True))
    updated_at = Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", back_populates="reports")
    constituency = relationship("Constituency", back_populates="reports")
    verifications = relationship("Verification", back_populates="report", lazy="selectin")


class Verification(Base):
    __tablename__ = "verifications"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    report_id = Column(UUID(as_uuid=True), ForeignKey("reports.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    type = Column(Enum(VerificationType, name="verification_type", create_type=False), nullable=False)
    image_url = Column(String(500))
    created_at = Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)

    __table_args__ = (
        UniqueConstraint("report_id", "user_id", "type", name="uq_verification_report_user_type"),
    )

    report = relationship("Report", back_populates="verifications")
    user = relationship("User", back_populates="verifications")


class HotspotPrediction(Base):
    __tablename__ = "hotspot_predictions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    zone = Column(Geometry("POLYGON", srid=4326), nullable=False)
    risk_score = Column(Numeric(5, 4), nullable=False)
    predicted_for_date = Column(DateTime, nullable=False)
    city = Column(String(100), nullable=False)
    model_version = Column(String(50), nullable=False, default="v1")
    features = Column(JSON)
    created_at = Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)


class LeaderboardEvent(Base):
    __tablename__ = "leaderboard_events"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    report_id = Column(UUID(as_uuid=True), ForeignKey("reports.id", ondelete="SET NULL"), nullable=True)
    event_type = Column(Enum(LeaderboardEventType, name="leaderboard_event_type", create_type=False), nullable=False)
    points_awarded = Column(Integer, nullable=False)
    created_at = Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)

    user = relationship("User", back_populates="leaderboard_events")
