-- StudyFlow MVP catalog: one active semester and seven PTIT subjects.
-- This migration only seeds shared academic reference data. Course Offerings
-- remain Teacher-owned and must be created through the public Java API.

INSERT INTO app.subjects (id, code, name, credits, description, status, created_at, updated_at)
VALUES
    ('71000000-0000-4000-8000-000000000001', 'GT2', 'Giải tích 2', 3, 'Môn học thuộc phạm vi MVP học kỳ 1.', 'ACTIVE', NOW(), NOW()),
    ('71000000-0000-4000-8000-000000000002', 'KTCT', 'Kinh tế chính trị Mác - Lênin', 2, 'Môn học thuộc phạm vi MVP học kỳ 1.', 'ACTIVE', NOW(), NOW()),
    ('71000000-0000-4000-8000-000000000003', 'KTS', 'Kỹ thuật số', 3, 'Môn học thuộc phạm vi MVP học kỳ 1.', 'ACTIVE', NOW(), NOW()),
    ('71000000-0000-4000-8000-000000000004', 'ENG-C1', 'Tiếng Anh C1', 3, 'Môn học thuộc phạm vi MVP học kỳ 1.', 'ACTIVE', NOW(), NOW()),
    ('71000000-0000-4000-8000-000000000005', 'THCS2', 'Tin học cơ sở 2', 3, 'Môn học thuộc phạm vi MVP học kỳ 1.', 'ACTIVE', NOW(), NOW()),
    ('71000000-0000-4000-8000-000000000006', 'VL-TN1', 'Vật lý thí nghiệm 1', 2, 'Môn học thuộc phạm vi MVP học kỳ 1.', 'ACTIVE', NOW(), NOW()),
    ('71000000-0000-4000-8000-000000000007', 'XSTK', 'Xác suất thống kê', 3, 'Môn học thuộc phạm vi MVP học kỳ 1.', 'ACTIVE', NOW(), NOW())
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    credits = EXCLUDED.credits,
    description = EXCLUDED.description,
    status = 'ACTIVE',
    updated_at = NOW();

INSERT INTO app.semesters (
    id, code, name, academic_year, start_date, end_date,
    status, offering_creation_enabled, created_at, updated_at
)
VALUES (
    '72000000-0000-4000-8000-000000000001',
    'HK1-2026-2027',
    'Học kỳ 1 · Năm học 2026 - 2027',
    '2026-2027',
    DATE '2026-09-01',
    DATE '2027-01-31',
    'ACTIVE',
    TRUE,
    NOW(),
    NOW()
)
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    academic_year = EXCLUDED.academic_year,
    start_date = EXCLUDED.start_date,
    end_date = EXCLUDED.end_date,
    status = 'ACTIVE',
    offering_creation_enabled = TRUE,
    updated_at = NOW();

-- Remove known synthetic integration catalog rows from normal MVP selectors
-- without deleting them or breaking historical foreign keys.
UPDATE app.subjects
SET status = 'INACTIVE', updated_at = NOW()
WHERE code = 'E2E101';

UPDATE app.semesters
SET status = 'CLOSED', offering_creation_enabled = FALSE, updated_at = NOW()
WHERE code = 'E2E-2026';
