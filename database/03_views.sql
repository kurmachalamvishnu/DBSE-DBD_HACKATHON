-- =========================================================================
-- Healthcare Queue Management System (Project 36)
-- Advanced SQL Views (CO2: Database Implementation & Operations)
-- =========================================================================

USE healthcare_queue_db;

-- -------------------------------------------------------------------------
-- View 1: vw_live_queue_monitor
-- Comprehensive real-time operational monitor for reception & clinic managers
-- -------------------------------------------------------------------------
DROP VIEW IF EXISTS vw_live_queue_monitor;
CREATE VIEW vw_live_queue_monitor AS
SELECT 
    d.doctor_id,
    d.emp_code,
    d.full_name AS doctor_name,
    d.room_number,
    d.current_status,
    dept.dept_id,
    dept.dept_code,
    dept.dept_name,
    curr_t.token_id AS current_token_id,
    curr_t.token_number AS current_serving_token,
    curr_p.full_name AS current_patient_name,
    curr_t.consultation_start_at,
    TIMESTAMPDIFF(MINUTE, curr_t.consultation_start_at, NOW()) AS current_consultation_elapsed_mins,
    COUNT(CASE WHEN q.status = 'WAITING' THEN 1 END) AS total_waiting_count,
    COUNT(CASE WHEN q.status = 'WAITING' AND q.triage_level = 'EMERGENCY' THEN 1 END) AS emergency_count,
    (COUNT(CASE WHEN q.status = 'WAITING' THEN 1 END) * d.avg_consultation_time) AS estimated_queue_wait_mins,
    (
        SELECT t_sub.token_number 
        FROM queue_tokens t_sub 
        WHERE t_sub.doctor_id = d.doctor_id 
          AND t_sub.status = 'WAITING' 
          AND t_sub.token_date = CURRENT_DATE 
        ORDER BY t_sub.priority_score DESC, t_sub.token_sequence ASC 
        LIMIT 1
    ) AS next_token_in_line
FROM doctors d
JOIN departments dept ON d.dept_id = dept.dept_id
LEFT JOIN queue_tokens curr_t ON d.current_token_id = curr_t.token_id
LEFT JOIN patients curr_p ON curr_t.patient_id = curr_p.patient_id
LEFT JOIN queue_tokens q ON d.doctor_id = q.doctor_id 
    AND q.status = 'WAITING' 
    AND q.token_date = CURRENT_DATE
GROUP BY 
    d.doctor_id, d.emp_code, d.full_name, d.room_number, d.current_status,
    dept.dept_id, dept.dept_code, dept.dept_name,
    curr_t.token_id, curr_t.token_number, curr_p.full_name, curr_t.consultation_start_at;

-- -------------------------------------------------------------------------
-- View 2: vw_doctor_availability_status
-- Detailed doctor status overview with shift schedule & capacity indicators
-- -------------------------------------------------------------------------
DROP VIEW IF EXISTS vw_doctor_availability_status;
CREATE VIEW vw_doctor_availability_status AS
SELECT 
    d.doctor_id,
    d.emp_code,
    d.full_name AS doctor_name,
    d.qualification,
    d.room_number,
    dept.dept_id,
    dept.dept_code,
    dept.dept_name,
    d.current_status,
    d.avg_consultation_time,
    d.max_daily_capacity,
    COUNT(t_today.token_id) AS total_tokens_issued_today,
    COUNT(CASE WHEN t_today.status = 'COMPLETED' THEN 1 END) AS patients_completed_today,
    COUNT(CASE WHEN t_today.status = 'WAITING' THEN 1 END) AS patients_currently_waiting,
    ROUND((COUNT(CASE WHEN t_today.status = 'COMPLETED' THEN 1 END) / d.max_daily_capacity) * 100, 1) AS capacity_utilization_pct,
    CASE 
        WHEN d.current_status = 'OFF_DUTY' THEN 'Offline'
        WHEN d.current_status = 'ON_BREAK' THEN 'On Break'
        WHEN d.current_status = 'IN_CONSULTATION' THEN CONCAT('Serving ', COALESCE(curr.token_number, 'Patient'))
        WHEN COUNT(CASE WHEN t_today.status = 'WAITING' THEN 1 END) = 0 THEN 'Available / No Queue'
        ELSE CONCAT('Available (', COUNT(CASE WHEN t_today.status = 'WAITING' THEN 1 END), ' in queue)')
    END AS display_status_label
FROM doctors d
JOIN departments dept ON d.dept_id = dept.dept_id
LEFT JOIN queue_tokens curr ON d.current_token_id = curr.token_id
LEFT JOIN queue_tokens t_today ON d.doctor_id = t_today.doctor_id AND t_today.token_date = CURRENT_DATE
GROUP BY 
    d.doctor_id, d.emp_code, d.full_name, d.qualification, d.room_number,
    dept.dept_id, dept.dept_code, dept.dept_name, d.current_status, d.avg_consultation_time, d.max_daily_capacity,
    curr.token_number;

-- -------------------------------------------------------------------------
-- View 3: vw_tv_display_board
-- Optimized view specifically for the waiting room public display monitors
-- -------------------------------------------------------------------------
DROP VIEW IF EXISTS vw_tv_display_board;
CREATE VIEW vw_tv_display_board AS
SELECT 
    d.doctor_id,
    dept.dept_code,
    dept.dept_name,
    d.room_number,
    d.full_name AS doctor_name,
    d.current_status,
    curr_t.token_number AS now_serving_token,
    curr_t.called_at AS called_timestamp,
    (
        SELECT GROUP_CONCAT(sub.token_number ORDER BY sub.priority_score DESC, sub.token_sequence ASC SEPARATOR ', ')
        FROM (
            SELECT token_number, priority_score, token_sequence 
            FROM queue_tokens 
            WHERE doctor_id = d.doctor_id 
              AND status = 'WAITING' 
              AND token_date = CURRENT_DATE 
            ORDER BY priority_score DESC, token_sequence ASC 
            LIMIT 4
        ) sub
    ) AS upcoming_tokens_list
FROM doctors d
JOIN departments dept ON d.dept_id = dept.dept_id
LEFT JOIN queue_tokens curr_t ON d.current_token_id = curr_t.token_id
WHERE d.current_status != 'OFF_DUTY'
ORDER BY d.room_number ASC;

-- -------------------------------------------------------------------------
-- View 4: vw_patient_journey_summary
-- Complete end-to-end timeline for patient audit and satisfaction review
-- -------------------------------------------------------------------------
DROP VIEW IF EXISTS vw_patient_journey_summary;
CREATE VIEW vw_patient_journey_summary AS
SELECT 
    t.token_id,
    t.token_number,
    t.token_date,
    p.patient_id,
    p.uhid,
    p.full_name AS patient_name,
    p.phone,
    p.category AS patient_category,
    d.full_name AS doctor_name,
    dept.dept_name,
    d.room_number,
    t.source,
    t.triage_level,
    t.priority_score,
    t.status AS token_status,
    t.issued_at,
    t.called_at,
    t.consultation_start_at,
    t.completed_at,
    t.estimated_wait_time AS predicted_wait_mins,
    TIMESTAMPDIFF(MINUTE, t.issued_at, COALESCE(t.consultation_start_at, t.called_at, NOW())) AS actual_wait_mins,
    TIMESTAMPDIFF(MINUTE, t.consultation_start_at, t.completed_at) AS actual_consultation_mins,
    s.diagnosis,
    s.prescription_notes
FROM queue_tokens t
JOIN patients p ON t.patient_id = p.patient_id
JOIN doctors d ON t.doctor_id = d.doctor_id
JOIN departments dept ON t.dept_id = dept.dept_id
LEFT JOIN consultation_sessions s ON t.token_id = s.token_id;

-- -------------------------------------------------------------------------
-- View 5: vw_daily_department_analytics
-- Daily throughput, average waiting time and SLA metrics per department
-- -------------------------------------------------------------------------
DROP VIEW IF EXISTS vw_daily_department_analytics;
CREATE VIEW vw_daily_department_analytics AS
SELECT 
    dept.dept_id,
    dept.dept_code,
    dept.dept_name,
    COUNT(t.token_id) AS total_tokens_issued,
    COUNT(CASE WHEN t.status = 'COMPLETED' THEN 1 END) AS total_completed,
    COUNT(CASE WHEN t.status = 'WAITING' THEN 1 END) AS total_currently_waiting,
    COUNT(CASE WHEN t.status = 'IN_CONSULTATION' THEN 1 END) AS total_in_consultation,
    COUNT(CASE WHEN t.status IN ('SKIPPED', 'CANCELLED') THEN 1 END) AS total_no_shows_cancelled,
    ROUND(AVG(CASE WHEN t.status = 'COMPLETED' THEN t.actual_wait_time END), 1) AS avg_wait_time_mins,
    MAX(CASE WHEN t.status = 'COMPLETED' THEN t.actual_wait_time END) AS max_wait_time_mins,
    ROUND(AVG(CASE WHEN t.status = 'COMPLETED' THEN t.consultation_duration END), 1) AS avg_consultation_mins,
    COUNT(CASE WHEN t.status = 'COMPLETED' AND t.actual_wait_time > 30 THEN 1 END) AS sla_breaches_over_30min
FROM departments dept
LEFT JOIN queue_tokens t ON dept.dept_id = t.dept_id AND t.token_date = CURRENT_DATE
GROUP BY dept.dept_id, dept.dept_code, dept.dept_name;

-- =========================================================================
-- End of Views Definition
-- =========================================================================
