-- =========================================================================
-- Healthcare Queue Management System (Project 36)
-- Stored Procedures with ACID Transactions (CO2: Database Implementation & Operations)
-- =========================================================================

USE healthcare_queue_db;

DELIMITER $$

-- -------------------------------------------------------------------------
-- Procedure 1: sp_issue_token
-- Atomically generates the next daily sequential token, calculates priority score,
-- initial estimated wait time, and inserts queue record.
-- -------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_issue_token$$
CREATE PROCEDURE sp_issue_token(
    IN p_patient_id INT,
    IN p_doctor_id INT,
    IN p_source ENUM('WALK_IN', 'APPOINTMENT', 'EMERGENCY_REFERRAL'),
    IN p_triage_level ENUM('EMERGENCY', 'URGENT', 'ROUTINE'),
    IN p_appointment_id INT,
    IN p_estimated_wait INT,
    OUT p_token_id INT,
    OUT p_token_number VARCHAR(25),
    OUT p_priority_score INT,
    OUT p_queue_position INT
)
proc_body: BEGIN
    DECLARE v_dept_id INT;
    DECLARE v_dept_code VARCHAR(10);
    DECLARE v_seq INT DEFAULT 1;
    DECLARE v_patient_category VARCHAR(30);
    DECLARE v_calc_priority INT DEFAULT 10;
    DECLARE v_waiting_count INT DEFAULT 0;
    DECLARE v_avg_time INT DEFAULT 15;

    -- Error Handling
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    START TRANSACTION;

    -- Retrieve department and doctor details
    SELECT d.dept_id, dept.dept_code, d.avg_consultation_time
    INTO v_dept_id, v_dept_code, v_avg_time
    FROM doctors d
    JOIN departments dept ON d.dept_id = dept.dept_id
    WHERE d.doctor_id = p_doctor_id;

    -- Retrieve patient category
    SELECT category INTO v_patient_category
    FROM patients WHERE patient_id = p_patient_id;

    -- Calculate Priority Score
    IF p_triage_level = 'EMERGENCY' THEN
        SET v_calc_priority = 95;
    ELSEIF p_triage_level = 'URGENT' THEN
        SET v_calc_priority = 65;
    ELSE
        SET v_calc_priority = 20;
    END IF;

    -- Vulnerability category bonus
    IF v_patient_category IN ('SENIOR_CITIZEN', 'PEDIATRIC', 'PREGNANT', 'PERSON_WITH_DISABILITY') THEN
        SET v_calc_priority = v_calc_priority + 15;
    END IF;

    -- Appointment on-time bonus
    IF p_source = 'APPOINTMENT' THEN
        SET v_calc_priority = v_calc_priority + 10;
    END IF;

    -- Generate Next Sequential Number for today
    SELECT COALESCE(MAX(token_sequence), 0) + 1 INTO v_seq
    FROM queue_tokens
    WHERE doctor_id = p_doctor_id AND token_date = CURRENT_DATE
    FOR UPDATE;

    -- Construct Token String e.g. CARD-105
    SET p_token_number = CONCAT(v_dept_code, '-', LPAD(v_seq + 100, 3, '0'));
    SET p_priority_score = v_calc_priority;

    -- Count existing waiting patients ahead
    SELECT COUNT(*) INTO v_waiting_count
    FROM queue_tokens
    WHERE doctor_id = p_doctor_id 
      AND status = 'WAITING' 
      AND token_date = CURRENT_DATE
      AND priority_score >= v_calc_priority;

    SET p_queue_position = v_waiting_count + 1;

    -- Fallback wait time if 0 passed
    IF p_estimated_wait IS NULL OR p_estimated_wait <= 0 THEN
        SET p_estimated_wait = p_queue_position * v_avg_time;
    END IF;

    -- Insert Token
    INSERT INTO queue_tokens (
        token_number, token_date, patient_id, doctor_id, dept_id,
        appointment_id, source, triage_level, priority_score,
        token_sequence, status, estimated_wait_time, issued_at
    ) VALUES (
        p_token_number, CURRENT_DATE, p_patient_id, p_doctor_id, v_dept_id,
        p_appointment_id, p_source, p_triage_level, v_calc_priority,
        v_seq, 'WAITING', p_estimated_wait, NOW()
    );

    SET p_token_id = LAST_INSERT_ID();

    -- Insert into active queues
    INSERT INTO active_queues (token_id, doctor_id, current_position, status)
    VALUES (p_token_id, p_doctor_id, p_queue_position, 'WAITING');

    -- Update appointment status if applicable
    IF p_appointment_id IS NOT NULL THEN
        UPDATE appointments SET status = 'CHECKED_IN' WHERE appointment_id = p_appointment_id;
    END IF;

    -- Log Telemetry
    INSERT INTO ml_waiting_time_telemetry (
        token_id, queue_length_at_issue, predicted_wait_time
    ) VALUES (
        p_token_id, v_waiting_count, p_estimated_wait
    );

    -- Log Queue History
    INSERT INTO queue_history (
        token_id, patient_id, doctor_id, event_type, previous_status, new_status, notes
    ) VALUES (
        p_token_id, p_patient_id, p_doctor_id, 'TOKEN_ISSUED', NULL, 'WAITING',
        CONCAT('Token ', p_token_number, ' issued. Queue position: ', p_queue_position)
    );

    COMMIT;
END$$

-- -------------------------------------------------------------------------
-- Procedure 2: sp_call_next_patient
-- Advances queue: calls highest priority waiting patient and updates doctor state
-- -------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_call_next_patient$$
CREATE PROCEDURE sp_call_next_patient(
    IN p_doctor_id INT,
    OUT p_called_token_id INT,
    OUT p_called_token_number VARCHAR(25),
    OUT p_patient_name VARCHAR(100),
    OUT p_status_message VARCHAR(100)
)
proc_body: BEGIN
    DECLARE v_token_id INT DEFAULT NULL;
    DECLARE v_token_num VARCHAR(25);
    DECLARE v_patient_id INT;
    DECLARE v_patient_name VARCHAR(100);
    DECLARE v_room VARCHAR(20);

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    START TRANSACTION;

    SELECT room_number INTO v_room FROM doctors WHERE doctor_id = p_doctor_id;

    -- Select next highest priority waiting patient
    SELECT t.token_id, t.token_number, t.patient_id, p.full_name
    INTO v_token_id, v_token_num, v_patient_id, v_patient_name
    FROM queue_tokens t
    JOIN patients p ON t.patient_id = p.patient_id
    WHERE t.doctor_id = p_doctor_id 
      AND t.status = 'WAITING' 
      AND t.token_date = CURRENT_DATE
    ORDER BY t.priority_score DESC, t.token_sequence ASC
    LIMIT 1
    FOR UPDATE;

    IF v_token_id IS NULL THEN
        -- No patient waiting
        UPDATE doctors SET current_token_id = NULL, current_status = 'AVAILABLE' WHERE doctor_id = p_doctor_id;
        SET p_called_token_id = NULL;
        SET p_called_token_number = NULL;
        SET p_patient_name = NULL;
        SET p_status_message = 'No patients currently waiting in queue.';
        COMMIT;
        LEAVE proc_body;
    END IF;

    -- Update token status to CALLED
    UPDATE queue_tokens 
    SET status = 'CALLED', called_at = NOW() 
    WHERE token_id = v_token_id;

    -- Update active_queues
    UPDATE active_queues 
    SET status = 'CALLED', current_position = 0 
    WHERE token_id = v_token_id;

    -- Update doctor status and current token
    UPDATE doctors 
    SET current_token_id = v_token_id, current_status = 'IN_CONSULTATION' 
    WHERE doctor_id = p_doctor_id;

    -- Recalculate positions for remaining waiting tokens
    SET @pos := 0;
    UPDATE active_queues aq
    JOIN (
        SELECT t.token_id, (@pos := @pos + 1) AS new_pos
        FROM queue_tokens t
        WHERE t.doctor_id = p_doctor_id 
          AND t.status = 'WAITING' 
          AND t.token_date = CURRENT_DATE
        ORDER BY t.priority_score DESC, t.token_sequence ASC
    ) ranked ON aq.token_id = ranked.token_id
    SET aq.current_position = ranked.new_pos;

    -- Log Queue History
    INSERT INTO queue_history (
        token_id, patient_id, doctor_id, event_type, previous_status, new_status, notes
    ) VALUES (
        v_token_id, v_patient_id, p_doctor_id, 'CALLED', 'WAITING', 'CALLED',
        CONCAT('Patient called to ', v_room)
    );

    SET p_called_token_id = v_token_id;
    SET p_called_token_number = v_token_num;
    SET p_patient_name = v_patient_name;
    SET p_status_message = CONCAT('Token ', v_token_num, ' called successfully.');

    COMMIT;
END$$

-- -------------------------------------------------------------------------
-- Procedure 3: sp_start_consultation
-- Marks patient in consultation room and computes actual wait time
-- -------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_start_consultation$$
CREATE PROCEDURE sp_start_consultation(
    IN p_token_id INT
)
BEGIN
    DECLARE v_issued_at TIMESTAMP;
    DECLARE v_actual_wait INT;
    DECLARE v_patient_id INT;
    DECLARE v_doctor_id INT;

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    START TRANSACTION;

    SELECT issued_at, patient_id, doctor_id 
    INTO v_issued_at, v_patient_id, v_doctor_id
    FROM queue_tokens WHERE token_id = p_token_id;

    SET v_actual_wait = TIMESTAMPDIFF(MINUTE, v_issued_at, NOW());

    UPDATE queue_tokens 
    SET status = 'IN_CONSULTATION', 
        consultation_start_at = NOW(),
        actual_wait_time = v_actual_wait
    WHERE token_id = p_token_id;

    UPDATE active_queues 
    SET status = 'IN_CONSULTATION' 
    WHERE token_id = p_token_id;

    UPDATE doctors 
    SET current_status = 'IN_CONSULTATION', current_token_id = p_token_id
    WHERE doctor_id = v_doctor_id;

    -- Update ML telemetry with actual wait time & error margin
    UPDATE ml_waiting_time_telemetry 
    SET actual_wait_time = v_actual_wait,
        error_margin = v_actual_wait - predicted_wait_time
    WHERE token_id = p_token_id;

    INSERT INTO queue_history (
        token_id, patient_id, doctor_id, event_type, previous_status, new_status, notes
    ) VALUES (
        p_token_id, v_patient_id, v_doctor_id, 'CONSULTATION_STARTED', 'CALLED', 'IN_CONSULTATION',
        CONCAT('Consultation started. Actual wait: ', v_actual_wait, ' mins')
    );

    COMMIT;
END$$

-- -------------------------------------------------------------------------
-- Procedure 4: sp_complete_consultation
-- Finalizes consultation session, notes, prescriptions, and frees doctor
-- -------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_complete_consultation$$
CREATE PROCEDURE sp_complete_consultation(
    IN p_token_id INT,
    IN p_vitals_bp VARCHAR(20),
    IN p_vitals_pulse INT,
    IN p_vitals_temp DECIMAL(4,1),
    IN p_symptoms TEXT,
    IN p_diagnosis TEXT,
    IN p_prescription TEXT,
    IN p_follow_up_date DATE
)
BEGIN
    DECLARE v_consult_start TIMESTAMP;
    DECLARE v_duration INT;
    DECLARE v_patient_id INT;
    DECLARE v_doctor_id INT;

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    START TRANSACTION;

    SELECT consultation_start_at, patient_id, doctor_id 
    INTO v_consult_start, v_patient_id, v_doctor_id
    FROM queue_tokens WHERE token_id = p_token_id;

    IF v_consult_start IS NULL THEN
        SET v_consult_start = NOW();
    END IF;

    SET v_duration = TIMESTAMPDIFF(MINUTE, v_consult_start, NOW());
    IF v_duration <= 0 THEN SET v_duration = 1; END IF;

    -- Update token
    UPDATE queue_tokens 
    SET status = 'COMPLETED', 
        completed_at = NOW(),
        consultation_duration = v_duration
    WHERE token_id = p_token_id;

    -- Remove from active queues
    DELETE FROM active_queues WHERE token_id = p_token_id;

    -- Insert consultation session
    INSERT INTO consultation_sessions (
        token_id, doctor_id, patient_id, vitals_bp, vitals_pulse, vitals_temp,
        symptoms, diagnosis, prescription_notes, follow_up_date
    ) VALUES (
        p_token_id, v_doctor_id, v_patient_id, p_vitals_bp, p_vitals_pulse, p_vitals_temp,
        p_symptoms, p_diagnosis, p_prescription, p_follow_up_date
    ) ON DUPLICATE KEY UPDATE
        vitals_bp = VALUES(vitals_bp),
        vitals_pulse = VALUES(vitals_pulse),
        vitals_temp = VALUES(vitals_temp),
        symptoms = VALUES(symptoms),
        diagnosis = VALUES(diagnosis),
        prescription_notes = VALUES(prescription_notes),
        follow_up_date = VALUES(follow_up_date);

    -- Free doctor
    UPDATE doctors 
    SET current_status = 'AVAILABLE', current_token_id = NULL 
    WHERE doctor_id = v_doctor_id;

    -- Log Queue History
    INSERT INTO queue_history (
        token_id, patient_id, doctor_id, event_type, previous_status, new_status, notes
    ) VALUES (
        p_token_id, v_patient_id, v_doctor_id, 'CONSULTATION_COMPLETED', 'IN_CONSULTATION', 'COMPLETED',
        CONCAT('Consultation completed. Duration: ', v_duration, ' mins.')
    );

    COMMIT;
END$$

-- -------------------------------------------------------------------------
-- Procedure 5: sp_skip_patient
-- Marks a no-show or skipped patient and updates queue
-- -------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_skip_patient$$
CREATE PROCEDURE sp_skip_patient(
    IN p_token_id INT,
    IN p_reason VARCHAR(255)
)
BEGIN
    DECLARE v_patient_id INT;
    DECLARE v_doctor_id INT;
    DECLARE v_curr_status VARCHAR(30);

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    START TRANSACTION;

    SELECT patient_id, doctor_id, status 
    INTO v_patient_id, v_doctor_id, v_curr_status
    FROM queue_tokens WHERE token_id = p_token_id;

    UPDATE queue_tokens 
    SET status = 'SKIPPED', completed_at = NOW() 
    WHERE token_id = p_token_id;

    DELETE FROM active_queues WHERE token_id = p_token_id;

    UPDATE doctors 
    SET current_status = 'AVAILABLE', current_token_id = NULL 
    WHERE doctor_id = v_doctor_id AND current_token_id = p_token_id;

    INSERT INTO queue_history (
        token_id, patient_id, doctor_id, event_type, previous_status, new_status, notes
    ) VALUES (
        p_token_id, v_patient_id, v_doctor_id, 'SKIPPED', v_curr_status, 'SKIPPED',
        COALESCE(p_reason, 'Patient did not respond / No show')
    );

    COMMIT;
END$$

-- -------------------------------------------------------------------------
-- Procedure 6: sp_reassign_queue
-- Bulk transfers waiting patients from an unavailable doctor to another doctor
-- -------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_reassign_queue$$
CREATE PROCEDURE sp_reassign_queue(
    IN p_from_doctor_id INT,
    IN p_to_doctor_id INT,
    OUT p_transferred_count INT
)
BEGIN
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    START TRANSACTION;

    SELECT COUNT(*) INTO p_transferred_count
    FROM queue_tokens
    WHERE doctor_id = p_from_doctor_id 
      AND status = 'WAITING' 
      AND token_date = CURRENT_DATE;

    -- Update queue tokens doctor_id
    UPDATE queue_tokens 
    SET doctor_id = p_to_doctor_id 
    WHERE doctor_id = p_from_doctor_id 
      AND status = 'WAITING' 
      AND token_date = CURRENT_DATE;

    -- Update active queues
    UPDATE active_queues 
    SET doctor_id = p_to_doctor_id 
    WHERE doctor_id = p_from_doctor_id 
      AND status = 'WAITING';

    -- Mark from_doctor as ON_BREAK or OFF_DUTY
    UPDATE doctors SET current_status = 'OFF_DUTY' WHERE doctor_id = p_from_doctor_id;

    -- Log transfer events in history
    INSERT INTO queue_history (token_id, patient_id, doctor_id, event_type, previous_status, new_status, notes)
    SELECT token_id, patient_id, p_to_doctor_id, 'TRANSFERRED', 'WAITING', 'WAITING',
           CONCAT('Reassigned from Doctor ID ', p_from_doctor_id, ' to Doctor ID ', p_to_doctor_id)
    FROM queue_tokens
    WHERE doctor_id = p_to_doctor_id 
      AND status = 'WAITING' 
      AND token_date = CURRENT_DATE;

    COMMIT;
END$$

DELIMITER ;

-- =========================================================================
-- End of Stored Procedures Definition
-- =========================================================================
