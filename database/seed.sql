-- HazardEye Seed Data — Chennai
-- Real MLA constituencies (2021 TN Assembly) + Corporation Wards
-- All coordinates are real Chennai lat/lng

-- ============================================
-- CLEAN EXISTING DATA
-- ============================================
TRUNCATE leaderboard_events CASCADE;
TRUNCATE verifications CASCADE;
TRUNCATE hotspot_predictions CASCADE;
TRUNCATE reports CASCADE;
TRUNCATE constituencies CASCADE;
TRUNCATE users CASCADE;

-- ============================================
-- USERS
-- ============================================
-- Password for all seed users: "password123" (bcrypt hash)

INSERT INTO users (id, email, password_hash, name, phone, role, city, points) VALUES
('a0000000-0000-0000-0000-000000000001', 'karthik@test.com',   '$2b$12$LQv3c1yqBo9SkvXS7QTJPOzFuMiGmeGhI3KxBKhF1jQHvYfn0xmHy', 'Karthik Sundaram',    '+91-9876543210', 'citizen', 'Chennai', 185),
('a0000000-0000-0000-0000-000000000002', 'lakshmi@test.com',   '$2b$12$LQv3c1yqBo9SkvXS7QTJPOzFuMiGmeGhI3KxBKhF1jQHvYfn0xmHy', 'Lakshmi Narayanan',   '+91-9876543211', 'citizen', 'Chennai', 145),
('a0000000-0000-0000-0000-000000000003', 'murugan@test.com',   '$2b$12$LQv3c1yqBo9SkvXS7QTJPOzFuMiGmeGhI3KxBKhF1jQHvYfn0xmHy', 'Murugan Velayutham',  '+91-9876543212', 'citizen', 'Chennai', 220),
('a0000000-0000-0000-0000-000000000004', 'divya@test.com',     '$2b$12$LQv3c1yqBo9SkvXS7QTJPOzFuMiGmeGhI3KxBKhF1jQHvYfn0xmHy', 'Divya Ramesh',        '+91-9876543213', 'citizen', 'Chennai', 60),
('a0000000-0000-0000-0000-000000000005', 'priya@test.com',     '$2b$12$LQv3c1yqBo9SkvXS7QTJPOzFuMiGmeGhI3KxBKhF1jQHvYfn0xmHy', 'Priya Dharshini',     '+91-9876543214', 'citizen', 'Chennai', 95),
('a0000000-0000-0000-0000-000000000006', 'authority@test.com', '$2b$12$LQv3c1yqBo9SkvXS7QTJPOzFuMiGmeGhI3KxBKhF1jQHvYfn0xmHy', 'Chennai Corp Officer', '+91-9876543215', 'authority', 'Chennai', 0),
('a0000000-0000-0000-0000-000000000007', 'admin@test.com',     '$2b$12$LQv3c1yqBo9SkvXS7QTJPOzFuMiGmeGhI3KxBKhF1jQHvYfn0xmHy', 'System Admin',        '+91-9876543216', 'admin', 'Chennai', 0);

-- ============================================
-- CONSTITUENCIES — Real Chennai MLAs (2021 TN Assembly) + GCC Wards
-- ============================================

INSERT INTO constituencies (id, name, type, representative_name, city, boundary) VALUES
-- MLA Constituencies (2021 Tamil Nadu Assembly Election winners)
('c0000000-0000-0000-0000-000000000001', 'Chepauk-Thiruvallikeni', 'mla', 'Udhayanidhi Stalin (DMK)', 'Chennai',
 ST_SetSRID(ST_MakePolygon(ST_GeomFromText('LINESTRING(80.26 13.04, 80.29 13.04, 80.29 13.08, 80.26 13.08, 80.26 13.04)')), 4326)),

('c0000000-0000-0000-0000-000000000002', 'Velachery', 'mla', 'A.M. Nassar (DMK)', 'Chennai',
 ST_SetSRID(ST_MakePolygon(ST_GeomFromText('LINESTRING(80.20 12.96, 80.24 12.96, 80.24 13.00, 80.20 13.00, 80.20 12.96)')), 4326)),

('c0000000-0000-0000-0000-000000000003', 'Sholinganallur', 'mla', 'Kanimozhi Karunanidhi (DMK)', 'Chennai',
 ST_SetSRID(ST_MakePolygon(ST_GeomFromText('LINESTRING(80.22 12.88, 80.26 12.88, 80.26 12.93, 80.22 12.93, 80.22 12.88)')), 4326)),

('c0000000-0000-0000-0000-000000000004', 'T. Nagar', 'mla', 'K. Karthikeya Sivasenapathy (DMK)', 'Chennai',
 ST_SetSRID(ST_MakePolygon(ST_GeomFromText('LINESTRING(80.22 13.03, 80.25 13.03, 80.25 13.06, 80.22 13.06, 80.22 13.03)')), 4326)),

('c0000000-0000-0000-0000-000000000005', 'Mylapore', 'mla', 'Dha. Velu (DMK)', 'Chennai',
 ST_SetSRID(ST_MakePolygon(ST_GeomFromText('LINESTRING(80.25 13.02, 80.28 13.02, 80.28 13.05, 80.25 13.05, 80.25 13.02)')), 4326)),

('c0000000-0000-0000-0000-000000000006', 'Saidapet', 'mla', 'Ma. Subramanian (DMK)', 'Chennai',
 ST_SetSRID(ST_MakePolygon(ST_GeomFromText('LINESTRING(80.20 13.01, 80.24 13.01, 80.24 13.04, 80.20 13.04, 80.20 13.01)')), 4326)),

('c0000000-0000-0000-0000-000000000007', 'Anna Nagar', 'mla', 'R. Udayakumar (DMK)', 'Chennai',
 ST_SetSRID(ST_MakePolygon(ST_GeomFromText('LINESTRING(80.19 13.08, 80.22 13.08, 80.22 13.11, 80.19 13.11, 80.19 13.08)')), 4326)),

('c0000000-0000-0000-0000-000000000008', 'Harbour', 'mla', 'P.K. Sekar Babu (DMK)', 'Chennai',
 ST_SetSRID(ST_MakePolygon(ST_GeomFromText('LINESTRING(80.28 13.08, 80.31 13.08, 80.31 13.12, 80.28 13.12, 80.28 13.08)')), 4326)),

('c0000000-0000-0000-0000-000000000009', 'Kolathur', 'mla', 'M.K. Stalin (DMK, Chief Minister)', 'Chennai',
 ST_SetSRID(ST_MakePolygon(ST_GeomFromText('LINESTRING(80.20 13.12, 80.24 13.12, 80.24 13.16, 80.20 13.16, 80.20 13.12)')), 4326)),

('c0000000-0000-0000-0000-000000000010', 'Alandur', 'mla', 'T.M. Anbarasan (DMK)', 'Chennai',
 ST_SetSRID(ST_MakePolygon(ST_GeomFromText('LINESTRING(80.19 12.99, 80.22 12.99, 80.22 13.02, 80.19 13.02, 80.19 12.99)')), 4326)),

-- GCC Ward Councillors
('c0000000-0000-0000-0000-000000000011', 'Ward 115 - T. Nagar', 'ward', 'Cllr. S. Bhuvaneshwari', 'Chennai',
 ST_SetSRID(ST_MakePolygon(ST_GeomFromText('LINESTRING(80.23 13.04, 80.25 13.04, 80.25 13.06, 80.23 13.06, 80.23 13.04)')), 4326)),

('c0000000-0000-0000-0000-000000000012', 'Ward 126 - Adyar', 'ward', 'Cllr. M. Meenakshi', 'Chennai',
 ST_SetSRID(ST_MakePolygon(ST_GeomFromText('LINESTRING(80.24 13.00, 80.27 13.00, 80.27 13.03, 80.24 13.03, 80.24 13.00)')), 4326)),

('c0000000-0000-0000-0000-000000000013', 'Ward 96 - Anna Nagar East', 'ward', 'Cllr. R. Thilagavathi', 'Chennai',
 ST_SetSRID(ST_MakePolygon(ST_GeomFromText('LINESTRING(80.20 13.08, 80.22 13.08, 80.22 13.10, 80.20 13.10, 80.20 13.08)')), 4326)),

('c0000000-0000-0000-0000-000000000014', 'Ward 134 - Velachery', 'ward', 'Cllr. K. Saravanan', 'Chennai',
 ST_SetSRID(ST_MakePolygon(ST_GeomFromText('LINESTRING(80.21 12.97, 80.24 12.97, 80.24 13.00, 80.21 13.00, 80.21 12.97)')), 4326)),

('c0000000-0000-0000-0000-000000000015', 'Ward 173 - Porur', 'ward', 'Cllr. P. Ganesh Babu', 'Chennai',
 ST_SetSRID(ST_MakePolygon(ST_GeomFromText('LINESTRING(80.15 13.03, 80.18 13.03, 80.18 13.06, 80.15 13.06, 80.15 13.03)')), 4326));

-- ============================================
-- REPORTS (using valid hex UUIDs — replaced 'r' with 'e')
-- ============================================

INSERT INTO reports (id, user_id, image_url, latitude, longitude, location, hazard_type, severity_score, estimated_repair_cost, road_classification, status, constituency_id, weather_at_report, ai_confidence, bbox_area_ratio, upvote_count, created_at) VALUES
-- Chepauk-Thiruvallikeni (Udhayanidhi Stalin's constituency)
('e0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', '/uploads/chennai_pothole_chepauk_1.jpg',
 13.060, 80.275, ST_SetSRID(ST_MakePoint(80.275, 13.060), 4326),
 'pothole', 8.20, 3800.00, 'urban_road', 'verified',
 'c0000000-0000-0000-0000-000000000001',
 '{"condition": "Partly cloudy", "temperature_c": 33, "rain_mm": 0}',
 0.9200, 0.2000, 4, '2026-02-10 09:30:00+05:30'),

('e0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000002', '/uploads/chennai_manhole_chepauk_1.jpg',
 13.055, 80.280, ST_SetSRID(ST_MakePoint(80.280, 13.055), 4326),
 'missing_manhole', 9.50, 13000.00, 'urban_road', 'reported',
 'c0000000-0000-0000-0000-000000000001',
 '{"condition": "Sunny", "temperature_c": 35, "rain_mm": 0}',
 0.9600, 0.1400, 3, '2026-02-18 14:00:00+05:30'),

-- Velachery (A.M. Nassar — flood-prone area)
('e0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000003', '/uploads/chennai_waterlog_velachery_1.jpg',
 12.980, 80.220, ST_SetSRID(ST_MakePoint(80.220, 12.980), 4326),
 'waterlogging', 9.40, 8500.00, 'urban_road', 'reported',
 'c0000000-0000-0000-0000-000000000002',
 '{"condition": "Heavy rain", "temperature_c": 25, "rain_mm": 55}',
 0.9500, 0.3500, 7, '2026-02-22 16:00:00+05:30'),

('e0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000001', '/uploads/chennai_pothole_velachery_1.jpg',
 12.985, 80.225, ST_SetSRID(ST_MakePoint(80.225, 12.985), 4326),
 'pothole', 8.10, 3600.00, 'urban_road', 'verified',
 'c0000000-0000-0000-0000-000000000002',
 '{"condition": "Light rain", "temperature_c": 27, "rain_mm": 12}',
 0.9000, 0.1900, 4, '2026-02-26 09:00:00+05:30'),

('e0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000004', '/uploads/chennai_waterlog_velachery_2.jpg',
 12.975, 80.218, ST_SetSRID(ST_MakePoint(80.218, 12.975), 4326),
 'waterlogging', 8.90, 7200.00, 'urban_road', 'in_progress',
 'c0000000-0000-0000-0000-000000000002',
 '{"condition": "Thunderstorm", "temperature_c": 24, "rain_mm": 60}',
 0.9300, 0.3100, 5, '2026-02-25 18:00:00+05:30'),

-- Sholinganallur / OMR (Kanimozhi Karunanidhi)
('e0000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000005', '/uploads/chennai_pothole_omr_1.jpg',
 12.910, 80.240, ST_SetSRID(ST_MakePoint(80.240, 12.910), 4326),
 'pothole', 7.20, 4800.00, 'national_highway', 'resolved_unverified',
 'c0000000-0000-0000-0000-000000000003',
 '{"condition": "Sunny", "temperature_c": 36, "rain_mm": 0}',
 0.8800, 0.1600, 2, '2026-01-15 12:00:00+05:30'),

('e0000000-0000-0000-0000-000000000007', 'a0000000-0000-0000-0000-000000000003', '/uploads/chennai_edge_omr_1.jpg',
 12.905, 80.235, ST_SetSRID(ST_MakePoint(80.235, 12.905), 4326),
 'broken_edge', 5.80, 3200.00, 'national_highway', 'reported',
 'c0000000-0000-0000-0000-000000000003',
 '{"condition": "Partly cloudy", "temperature_c": 33, "rain_mm": 0}',
 0.8100, 0.1200, 1, '2026-03-03 15:45:00+05:30'),

('e0000000-0000-0000-0000-000000000008', 'a0000000-0000-0000-0000-000000000002', '/uploads/chennai_manhole_omr_1.jpg',
 12.915, 80.245, ST_SetSRID(ST_MakePoint(80.245, 12.915), 4326),
 'missing_manhole', 9.30, 12000.00, 'urban_road', 'reported',
 'c0000000-0000-0000-0000-000000000003',
 '{"condition": "Cloudy", "temperature_c": 30, "rain_mm": 0}',
 0.9600, 0.1300, 3, '2026-03-05 10:30:00+05:30'),

-- T. Nagar (K. Karthikeya Sivasenapathy)
('e0000000-0000-0000-0000-000000000009', 'a0000000-0000-0000-0000-000000000001', '/uploads/chennai_pothole_tnagar_1.jpg',
 13.040, 80.234, ST_SetSRID(ST_MakePoint(80.234, 13.040), 4326),
 'pothole', 7.80, 3400.00, 'urban_road', 'verified',
 'c0000000-0000-0000-0000-000000000004',
 '{"condition": "Haze", "temperature_c": 32, "rain_mm": 0}',
 0.9100, 0.1800, 4, '2026-02-12 10:00:00+05:30'),

('e0000000-0000-0000-0000-000000000010', 'a0000000-0000-0000-0000-000000000004', '/uploads/chennai_edge_tnagar_1.jpg',
 13.045, 80.240, ST_SetSRID(ST_MakePoint(80.240, 13.045), 4326),
 'broken_edge', 5.40, 1600.00, 'urban_road', 'reported',
 'c0000000-0000-0000-0000-000000000004',
 '{"condition": "Sunny", "temperature_c": 35, "rain_mm": 0}',
 0.7800, 0.1000, 1, '2026-03-01 11:30:00+05:30'),

-- Mylapore (Dha. Velu)
('e0000000-0000-0000-0000-000000000011', 'a0000000-0000-0000-0000-000000000003', '/uploads/chennai_pothole_mylapore_1.jpg',
 13.035, 80.265, ST_SetSRID(ST_MakePoint(80.265, 13.035), 4326),
 'pothole', 6.90, 2800.00, 'urban_road', 'resolved',
 'c0000000-0000-0000-0000-000000000005',
 '{"condition": "Sunny", "temperature_c": 34, "rain_mm": 0}',
 0.8600, 0.1500, 3, '2026-01-20 08:30:00+05:30'),

-- Saidapet (Ma. Subramanian — Health Minister)
('e0000000-0000-0000-0000-000000000012', 'a0000000-0000-0000-0000-000000000002', '/uploads/chennai_waterlog_saidapet_1.jpg',
 13.020, 80.220, ST_SetSRID(ST_MakePoint(80.220, 13.020), 4326),
 'waterlogging', 8.40, 6500.00, 'urban_road', 'verified',
 'c0000000-0000-0000-0000-000000000006',
 '{"condition": "Moderate rain", "temperature_c": 28, "rain_mm": 25}',
 0.9200, 0.2800, 5, '2026-02-20 07:30:00+05:30'),

('e0000000-0000-0000-0000-000000000013', 'a0000000-0000-0000-0000-000000000005', '/uploads/chennai_pothole_saidapet_1.jpg',
 13.025, 80.215, ST_SetSRID(ST_MakePoint(80.215, 13.025), 4326),
 'pothole', 7.50, 3200.00, 'state_highway', 'reported',
 'c0000000-0000-0000-0000-000000000006',
 '{"condition": "Haze", "temperature_c": 31, "rain_mm": 0}',
 0.8700, 0.1600, 2, '2026-03-02 13:00:00+05:30'),

-- Anna Nagar (R. Udayakumar)
('e0000000-0000-0000-0000-000000000014', 'a0000000-0000-0000-0000-000000000003', '/uploads/chennai_pothole_annanagar_1.jpg',
 13.095, 80.205, ST_SetSRID(ST_MakePoint(80.205, 13.095), 4326),
 'pothole', 6.30, 2200.00, 'urban_road', 'verified',
 'c0000000-0000-0000-0000-000000000007',
 '{"condition": "Sunny", "temperature_c": 34, "rain_mm": 0}',
 0.8400, 0.1300, 3, '2026-02-14 10:15:00+05:30'),

-- Harbour (P.K. Sekar Babu)
('e0000000-0000-0000-0000-000000000015', 'a0000000-0000-0000-0000-000000000001', '/uploads/chennai_waterlog_harbour_1.jpg',
 13.100, 80.295, ST_SetSRID(ST_MakePoint(80.295, 13.100), 4326),
 'waterlogging', 8.70, 7000.00, 'urban_road', 'reported',
 'c0000000-0000-0000-0000-000000000008',
 '{"condition": "Heavy rain", "temperature_c": 26, "rain_mm": 40}',
 0.9400, 0.3000, 4, '2026-02-24 17:00:00+05:30'),

-- Kolathur (CM M.K. Stalin)
('e0000000-0000-0000-0000-000000000016', 'a0000000-0000-0000-0000-000000000004', '/uploads/chennai_edge_kolathur_1.jpg',
 13.140, 80.220, ST_SetSRID(ST_MakePoint(80.220, 13.140), 4326),
 'broken_edge', 5.10, 1800.00, 'urban_road', 'reported',
 'c0000000-0000-0000-0000-000000000009',
 '{"condition": "Partly cloudy", "temperature_c": 33, "rain_mm": 0}',
 0.7600, 0.0900, 1, '2026-03-04 09:00:00+05:30'),

('e0000000-0000-0000-0000-000000000017', 'a0000000-0000-0000-0000-000000000005', '/uploads/chennai_pothole_kolathur_1.jpg',
 13.145, 80.215, ST_SetSRID(ST_MakePoint(80.215, 13.145), 4326),
 'pothole', 7.00, 2800.00, 'state_highway', 'reported',
 'c0000000-0000-0000-0000-000000000009',
 '{"condition": "Sunny", "temperature_c": 35, "rain_mm": 0}',
 0.8500, 0.1400, 2, '2026-03-06 14:30:00+05:30'),

-- Alandur (T.M. Anbarasan)
('e0000000-0000-0000-0000-000000000018', 'a0000000-0000-0000-0000-000000000003', '/uploads/chennai_pothole_alandur_1.jpg',
 13.005, 80.205, ST_SetSRID(ST_MakePoint(80.205, 13.005), 4326),
 'pothole', 6.50, 2400.00, 'urban_road', 'resolved',
 'c0000000-0000-0000-0000-000000000010',
 '{"condition": "Sunny", "temperature_c": 34, "rain_mm": 0}',
 0.8300, 0.1200, 3, '2026-01-25 11:00:00+05:30'),

('e0000000-0000-0000-0000-000000000019', 'a0000000-0000-0000-0000-000000000002', '/uploads/chennai_manhole_alandur_1.jpg',
 13.000, 80.200, ST_SetSRID(ST_MakePoint(80.200, 13.000), 4326),
 'missing_manhole', 9.60, 14000.00, 'urban_road', 'in_progress',
 'c0000000-0000-0000-0000-000000000010',
 '{"condition": "Cloudy", "temperature_c": 30, "rain_mm": 0}',
 0.9700, 0.1500, 4, '2026-02-28 08:45:00+05:30'),

-- Ward-level reports (T. Nagar ward)
('e0000000-0000-0000-0000-000000000020', 'a0000000-0000-0000-0000-000000000001', '/uploads/chennai_pothole_tnagar_ward_1.jpg',
 13.050, 80.240, ST_SetSRID(ST_MakePoint(80.240, 13.050), 4326),
 'pothole', 7.40, 3000.00, 'urban_road', 'reported',
 'c0000000-0000-0000-0000-000000000011',
 '{"condition": "Haze", "temperature_c": 32, "rain_mm": 0}',
 0.8900, 0.1700, 2, '2026-03-05 10:00:00+05:30');

-- ============================================
-- VERIFICATIONS
-- ============================================

INSERT INTO verifications (report_id, user_id, type) VALUES
-- Chepauk pothole verified (4 upvotes)
('e0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000002', 'upvote'),
('e0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000003', 'upvote'),
('e0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000004', 'upvote'),
('e0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000005', 'upvote'),

-- Chepauk manhole (3 upvotes)
('e0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'upvote'),
('e0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000003', 'upvote'),
('e0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000005', 'upvote'),

-- Velachery waterlogging (7 upvotes — flood area, many people affected)
('e0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 'upvote'),
('e0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000002', 'upvote'),
('e0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000004', 'upvote'),
('e0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000005', 'upvote'),
('e0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 'upvote'),
('e0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000002', 'upvote'),
('e0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000003', 'upvote'),

-- Velachery pothole verified (4 upvotes)
('e0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000002', 'upvote'),
('e0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000003', 'upvote'),
('e0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000004', 'upvote'),
('e0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000005', 'upvote'),

-- Velachery waterlogging 2 (5 upvotes)
('e0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000001', 'upvote'),
('e0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000002', 'upvote'),
('e0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000003', 'upvote'),
('e0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000005', 'upvote'),
('e0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000001', 'upvote'),

-- OMR pothole repair verification (resolved_unverified — needs 1 more)
('e0000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000001', 'repair_confirm'),
('e0000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000003', 'repair_confirm'),

-- OMR manhole (3 upvotes)
('e0000000-0000-0000-0000-000000000008', 'a0000000-0000-0000-0000-000000000001', 'upvote'),
('e0000000-0000-0000-0000-000000000008', 'a0000000-0000-0000-0000-000000000003', 'upvote'),
('e0000000-0000-0000-0000-000000000008', 'a0000000-0000-0000-0000-000000000004', 'upvote'),

-- T. Nagar pothole verified (4 upvotes)
('e0000000-0000-0000-0000-000000000009', 'a0000000-0000-0000-0000-000000000002', 'upvote'),
('e0000000-0000-0000-0000-000000000009', 'a0000000-0000-0000-0000-000000000003', 'upvote'),
('e0000000-0000-0000-0000-000000000009', 'a0000000-0000-0000-0000-000000000004', 'upvote'),
('e0000000-0000-0000-0000-000000000009', 'a0000000-0000-0000-0000-000000000005', 'upvote'),

-- Mylapore resolved (3 repair confirmations)
('e0000000-0000-0000-0000-000000000011', 'a0000000-0000-0000-0000-000000000001', 'repair_confirm'),
('e0000000-0000-0000-0000-000000000011', 'a0000000-0000-0000-0000-000000000002', 'repair_confirm'),
('e0000000-0000-0000-0000-000000000011', 'a0000000-0000-0000-0000-000000000004', 'repair_confirm'),

-- Saidapet waterlogging verified (5 upvotes)
('e0000000-0000-0000-0000-000000000012', 'a0000000-0000-0000-0000-000000000001', 'upvote'),
('e0000000-0000-0000-0000-000000000012', 'a0000000-0000-0000-0000-000000000003', 'upvote'),
('e0000000-0000-0000-0000-000000000012', 'a0000000-0000-0000-0000-000000000004', 'upvote'),
('e0000000-0000-0000-0000-000000000012', 'a0000000-0000-0000-0000-000000000005', 'upvote'),
('e0000000-0000-0000-0000-000000000012', 'a0000000-0000-0000-0000-000000000001', 'upvote'),

-- Anna Nagar verified (3 upvotes)
('e0000000-0000-0000-0000-000000000014', 'a0000000-0000-0000-0000-000000000001', 'upvote'),
('e0000000-0000-0000-0000-000000000014', 'a0000000-0000-0000-0000-000000000002', 'upvote'),
('e0000000-0000-0000-0000-000000000014', 'a0000000-0000-0000-0000-000000000004', 'upvote'),

-- Harbour waterlogging (4 upvotes)
('e0000000-0000-0000-0000-000000000015', 'a0000000-0000-0000-0000-000000000002', 'upvote'),
('e0000000-0000-0000-0000-000000000015', 'a0000000-0000-0000-0000-000000000003', 'upvote'),
('e0000000-0000-0000-0000-000000000015', 'a0000000-0000-0000-0000-000000000004', 'upvote'),
('e0000000-0000-0000-0000-000000000015', 'a0000000-0000-0000-0000-000000000005', 'upvote'),

-- Alandur resolved (3 repair confirmations)
('e0000000-0000-0000-0000-000000000018', 'a0000000-0000-0000-0000-000000000001', 'repair_confirm'),
('e0000000-0000-0000-0000-000000000018', 'a0000000-0000-0000-0000-000000000002', 'repair_confirm'),
('e0000000-0000-0000-0000-000000000018', 'a0000000-0000-0000-0000-000000000005', 'repair_confirm'),

-- Alandur manhole (4 upvotes)
('e0000000-0000-0000-0000-000000000019', 'a0000000-0000-0000-0000-000000000001', 'upvote'),
('e0000000-0000-0000-0000-000000000019', 'a0000000-0000-0000-0000-000000000003', 'upvote'),
('e0000000-0000-0000-0000-000000000019', 'a0000000-0000-0000-0000-000000000004', 'upvote'),
('e0000000-0000-0000-0000-000000000019', 'a0000000-0000-0000-0000-000000000005', 'upvote');

-- ============================================
-- LEADERBOARD EVENTS
-- ============================================

INSERT INTO leaderboard_events (user_id, report_id, event_type, points_awarded) VALUES
-- Karthik (185 points)
('a0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000001', 'report_submitted', 5),
('a0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000001', 'report_verified', 15),
('a0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000004', 'report_submitted', 5),
('a0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000004', 'report_verified', 15),
('a0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000009', 'report_submitted', 5),
('a0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000009', 'report_verified', 15),
('a0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000015', 'report_submitted', 5),
('a0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000020', 'report_submitted', 5),

-- Lakshmi (145 points)
('a0000000-0000-0000-0000-000000000002', 'e0000000-0000-0000-0000-000000000002', 'report_submitted', 5),
('a0000000-0000-0000-0000-000000000002', 'e0000000-0000-0000-0000-000000000008', 'report_submitted', 5),
('a0000000-0000-0000-0000-000000000002', 'e0000000-0000-0000-0000-000000000012', 'report_submitted', 5),
('a0000000-0000-0000-0000-000000000002', 'e0000000-0000-0000-0000-000000000012', 'report_verified', 15),
('a0000000-0000-0000-0000-000000000002', 'e0000000-0000-0000-0000-000000000019', 'report_submitted', 5),

-- Murugan (220 points — top reporter)
('a0000000-0000-0000-0000-000000000003', 'e0000000-0000-0000-0000-000000000003', 'report_submitted', 5),
('a0000000-0000-0000-0000-000000000003', 'e0000000-0000-0000-0000-000000000003', 'report_verified', 15),
('a0000000-0000-0000-0000-000000000003', 'e0000000-0000-0000-0000-000000000007', 'report_submitted', 5),
('a0000000-0000-0000-0000-000000000003', 'e0000000-0000-0000-0000-000000000011', 'report_submitted', 5),
('a0000000-0000-0000-0000-000000000003', 'e0000000-0000-0000-0000-000000000011', 'report_resolved', 25),
('a0000000-0000-0000-0000-000000000003', 'e0000000-0000-0000-0000-000000000014', 'report_submitted', 5),
('a0000000-0000-0000-0000-000000000003', 'e0000000-0000-0000-0000-000000000014', 'report_verified', 15),
('a0000000-0000-0000-0000-000000000003', 'e0000000-0000-0000-0000-000000000018', 'report_submitted', 5),
('a0000000-0000-0000-0000-000000000003', 'e0000000-0000-0000-0000-000000000018', 'report_resolved', 25),

-- Divya (60 points)
('a0000000-0000-0000-0000-000000000004', 'e0000000-0000-0000-0000-000000000005', 'report_submitted', 5),
('a0000000-0000-0000-0000-000000000004', 'e0000000-0000-0000-0000-000000000010', 'report_submitted', 5),
('a0000000-0000-0000-0000-000000000004', 'e0000000-0000-0000-0000-000000000016', 'report_submitted', 5),

-- Priya (95 points)
('a0000000-0000-0000-0000-000000000005', 'e0000000-0000-0000-0000-000000000006', 'report_submitted', 5),
('a0000000-0000-0000-0000-000000000005', 'e0000000-0000-0000-0000-000000000013', 'report_submitted', 5),
('a0000000-0000-0000-0000-000000000005', 'e0000000-0000-0000-0000-000000000017', 'report_submitted', 5);

-- ============================================
-- HOTSPOT PREDICTIONS (30-day risk zones)
-- ============================================

INSERT INTO hotspot_predictions (zone, risk_score, predicted_for_date, city, model_version, features) VALUES
-- Velachery (flood-prone, highest risk)
(ST_SetSRID(ST_MakePolygon(ST_GeomFromText('LINESTRING(80.21 12.97, 80.24 12.97, 80.24 13.00, 80.21 13.00, 80.21 12.97)')), 4326),
 0.9400, '2026-04-01', 'Chennai', 'xgb_v1', '{"report_count": 25, "avg_severity": 8.8, "flood_risk": true, "monsoon_factor": 1.5}'),

-- Chepauk near Marina (coastal, high traffic)
(ST_SetSRID(ST_MakePolygon(ST_GeomFromText('LINESTRING(80.27 13.05, 80.29 13.05, 80.29 13.07, 80.27 13.07, 80.27 13.05)')), 4326),
 0.8600, '2026-04-01', 'Chennai', 'xgb_v1', '{"report_count": 18, "avg_severity": 8.0, "flood_risk": true, "monsoon_factor": 1.3}'),

-- Adyar river area
(ST_SetSRID(ST_MakePolygon(ST_GeomFromText('LINESTRING(80.25 13.00, 80.27 13.00, 80.27 13.02, 80.25 13.02, 80.25 13.00)')), 4326),
 0.8200, '2026-04-01', 'Chennai', 'xgb_v1', '{"report_count": 15, "avg_severity": 7.8, "flood_risk": true, "monsoon_factor": 1.4}'),

-- T. Nagar commercial area (heavy traffic)
(ST_SetSRID(ST_MakePolygon(ST_GeomFromText('LINESTRING(80.23 13.04, 80.25 13.04, 80.25 13.06, 80.23 13.06, 80.23 13.04)')), 4326),
 0.7400, '2026-04-01', 'Chennai', 'xgb_v1', '{"report_count": 12, "avg_severity": 7.2, "flood_risk": false, "monsoon_factor": 1.0}'),

-- Harbour coastal
(ST_SetSRID(ST_MakePolygon(ST_GeomFromText('LINESTRING(80.29 13.09, 80.31 13.09, 80.31 13.11, 80.29 13.11, 80.29 13.09)')), 4326),
 0.7100, '2026-04-01', 'Chennai', 'xgb_v1', '{"report_count": 10, "avg_severity": 7.5, "flood_risk": true, "monsoon_factor": 1.2}'),

-- Sholinganallur OMR
(ST_SetSRID(ST_MakePolygon(ST_GeomFromText('LINESTRING(80.23 12.90, 80.25 12.90, 80.25 12.92, 80.23 12.92, 80.23 12.90)')), 4326),
 0.6800, '2026-04-01', 'Chennai', 'xgb_v1', '{"report_count": 9, "avg_severity": 7.0, "flood_risk": false, "monsoon_factor": 1.0}'),

-- Saidapet
(ST_SetSRID(ST_MakePolygon(ST_GeomFromText('LINESTRING(80.21 13.02, 80.23 13.02, 80.23 13.04, 80.21 13.04, 80.21 13.02)')), 4326),
 0.6200, '2026-04-01', 'Chennai', 'xgb_v1', '{"report_count": 8, "avg_severity": 6.8, "flood_risk": false, "monsoon_factor": 1.0}'),

-- Anna Nagar
(ST_SetSRID(ST_MakePolygon(ST_GeomFromText('LINESTRING(80.20 13.09, 80.22 13.09, 80.22 13.11, 80.20 13.11, 80.20 13.09)')), 4326),
 0.5500, '2026-04-01', 'Chennai', 'xgb_v1', '{"report_count": 6, "avg_severity": 5.8, "flood_risk": false, "monsoon_factor": 1.0}'),

-- Porur (lower risk)
(ST_SetSRID(ST_MakePolygon(ST_GeomFromText('LINESTRING(80.15 13.04, 80.17 13.04, 80.17 13.06, 80.15 13.06, 80.15 13.04)')), 4326),
 0.4800, '2026-04-01', 'Chennai', 'xgb_v1', '{"report_count": 4, "avg_severity": 5.2, "flood_risk": false, "monsoon_factor": 1.0}');