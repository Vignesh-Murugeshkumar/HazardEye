-- HazardEye Database Schema
-- PostgreSQL + PostGIS

CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- ENUM TYPES
-- ============================================

CREATE TYPE user_role AS ENUM ('citizen', 'authority', 'admin');
CREATE TYPE hazard_type AS ENUM ('pothole', 'broken_edge', 'waterlogging', 'missing_manhole');
CREATE TYPE report_status AS ENUM ('reported', 'verified', 'in_progress', 'resolved', 'resolved_unverified');
CREATE TYPE road_class AS ENUM ('national_highway', 'state_highway', 'urban_road', 'rural_road');
CREATE TYPE verification_type AS ENUM ('upvote', 'repair_confirm', 'repair_deny');
CREATE TYPE constituency_type AS ENUM ('mla', 'ward');
CREATE TYPE leaderboard_event_type AS ENUM ('report_verified', 'report_resolved', 'report_submitted', 'verification_cast');

-- ============================================
-- TABLES
-- ============================================

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(150) NOT NULL,
    phone VARCHAR(20),
    role user_role NOT NULL DEFAULT 'citizen',
    city VARCHAR(100),
    ward_id UUID,
    expo_push_token VARCHAR(255),
    points INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE constituencies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    type constituency_type NOT NULL,
    representative_name VARCHAR(255),
    city VARCHAR(100) NOT NULL,
    boundary GEOMETRY(POLYGON, 4326),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    image_url VARCHAR(500) NOT NULL,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    location GEOMETRY(POINT, 4326) NOT NULL,
    hazard_type hazard_type NOT NULL,
    severity_score NUMERIC(4,2) NOT NULL CHECK (severity_score >= 1 AND severity_score <= 10),
    estimated_repair_cost NUMERIC(12,2),
    road_classification road_class NOT NULL DEFAULT 'urban_road',
    status report_status NOT NULL DEFAULT 'reported',
    constituency_id UUID REFERENCES constituencies(id),
    weather_at_report JSONB,
    description TEXT,
    ai_confidence NUMERIC(5,4),
    bbox_area_ratio NUMERIC(5,4),
    upvote_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    resolved_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE verifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    report_id UUID NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type verification_type NOT NULL,
    image_url VARCHAR(500),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(report_id, user_id, type)
);

CREATE TABLE hotspot_predictions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    zone GEOMETRY(POLYGON, 4326) NOT NULL,
    risk_score NUMERIC(5,4) NOT NULL CHECK (risk_score >= 0 AND risk_score <= 1),
    predicted_for_date DATE NOT NULL,
    city VARCHAR(100) NOT NULL,
    model_version VARCHAR(50) NOT NULL DEFAULT 'v1',
    features JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE leaderboard_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    report_id UUID REFERENCES reports(id) ON DELETE SET NULL,
    event_type leaderboard_event_type NOT NULL,
    points_awarded INTEGER NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================

-- Spatial indexes
CREATE INDEX idx_reports_location ON reports USING GIST (location);
CREATE INDEX idx_hotspot_zone ON hotspot_predictions USING GIST (zone);
CREATE INDEX idx_constituency_boundary ON constituencies USING GIST (boundary);

-- Standard indexes
CREATE INDEX idx_reports_status ON reports (status);
CREATE INDEX idx_reports_hazard_type ON reports (hazard_type);
CREATE INDEX idx_reports_constituency ON reports (constituency_id);
CREATE INDEX idx_reports_created_at ON reports (created_at DESC);
CREATE INDEX idx_reports_user_id ON reports (user_id);
CREATE INDEX idx_reports_severity ON reports (severity_score DESC);
CREATE INDEX idx_verifications_report ON verifications (report_id);
CREATE INDEX idx_verifications_user ON verifications (user_id);
CREATE INDEX idx_leaderboard_user ON leaderboard_events (user_id);
CREATE INDEX idx_leaderboard_created ON leaderboard_events (created_at DESC);
CREATE INDEX idx_hotspot_date ON hotspot_predictions (predicted_for_date);
CREATE INDEX idx_hotspot_city ON hotspot_predictions (city);
CREATE INDEX idx_users_city ON users (city);
CREATE INDEX idx_users_email ON users (email);

-- ============================================
-- FUNCTIONS
-- ============================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reports_updated_at
    BEFORE UPDATE ON reports
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
