-- =========================================================================
-- Healthcare Queue Management System (Project 36)
-- Database Indexing, Optimization & Performance Tuning (CO2 & CO5)
-- =========================================================================

USE healthcare_queue_db;

-- -------------------------------------------------------------------------
-- 1. Performance-Critical Composite Indexes
-- -------------------------------------------------------------------------

-- Speeds up priority queue retrieval: (doctor_id, status, token_date) with priority ordering
CREATE INDEX idx_queue_tokens_priority 
ON queue_tokens (doctor_id, status, token_date, priority_score DESC, token_sequence ASC);

-- Speeds up patient lookup and mobile tracker queries by token number
CREATE INDEX idx_queue_tokens_number 
ON queue_tokens (token_number);

-- Speeds up patient historical journey lookup
CREATE INDEX idx_queue_tokens_patient 
ON queue_tokens (patient_id, token_date DESC);

-- Speeds up appointment check-ins
CREATE INDEX idx_appointments_lookup 
ON appointments (scheduled_date, doctor_id, status);

-- Speeds up phone search on patients table
CREATE INDEX idx_patients_phone 
ON patients (phone);

-- Speeds up UHID search on patients table
CREATE INDEX idx_patients_uhid 
ON patients (uhid);

-- Speeds up queue history audit queries
CREATE INDEX idx_history_token_date 
ON queue_history (token_id, timestamp DESC);

-- Speeds up doctor status lookups
CREATE INDEX idx_doctors_dept_status 
ON doctors (dept_id, current_status);

-- -------------------------------------------------------------------------
-- 2. Query Performance Verification with EXPLAIN
-- -------------------------------------------------------------------------

-- Test 1: Fetching Next Patient in Queue using the Composite Index
EXPLAIN SELECT token_id, token_number, patient_id, priority_score, token_sequence
FROM queue_tokens
WHERE doctor_id = 1 
  AND status = 'WAITING' 
  AND token_date = CURRENT_DATE
ORDER BY priority_score DESC, token_sequence ASC
LIMIT 1;

-- Test 2: Live TV Waiting Room Display View
EXPLAIN SELECT * FROM vw_tv_display_board;

-- Test 3: Patient Journey Lookup
EXPLAIN SELECT * FROM vw_patient_journey_summary WHERE patient_id = 1;

-- =========================================================================
-- End of Indexes & Optimization Script
-- =========================================================================
