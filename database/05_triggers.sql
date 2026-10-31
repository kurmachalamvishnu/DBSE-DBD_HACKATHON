-- =========================================================================
-- Healthcare Queue Management System (Project 36)
-- Database Triggers (CO2: Database Implementation & Operations)
-- =========================================================================

USE healthcare_queue_db;

DELIMITER $$

-- -------------------------------------------------------------------------
-- Trigger 1: trg_prevent_duplicate_active_token
-- Prevents the same patient from being issued multiple concurrent active tokens
-- for the exact same doctor on the current calendar day.
-- -------------------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_prevent_duplicate_active_token$$
CREATE TRIGGER trg_prevent_duplicate_active_token
BEFORE INSERT ON queue_tokens
FOR EACH ROW
BEGIN
    DECLARE v_active_count INT DEFAULT 0;

    SELECT COUNT(*) INTO v_active_count
    FROM queue_tokens
    WHERE patient_id = NEW.patient_id
      AND doctor_id = NEW.doctor_id
      AND token_date = NEW.token_date
      AND status IN ('WAITING', 'CALLED', 'IN_CONSULTATION');

    IF v_active_count > 0 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Integrity Violation: Patient already holds an active token for this doctor today.';
    END IF;
END$$

-- -------------------------------------------------------------------------
-- Trigger 2: trg_calc_token_metrics
-- Automatically computes actual wait time and consultation duration on updates
-- -------------------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_calc_token_metrics$$
CREATE TRIGGER trg_calc_token_metrics
BEFORE UPDATE ON queue_tokens
FOR EACH ROW
BEGIN
    -- If moving to IN_CONSULTATION and actual_wait_time is not yet set
    IF NEW.status = 'IN_CONSULTATION' AND (NEW.actual_wait_time IS NULL OR NEW.actual_wait_time = 0) THEN
        IF NEW.consultation_start_at IS NULL THEN
            SET NEW.consultation_start_at = NOW();
        END IF;
        SET NEW.actual_wait_time = TIMESTAMPDIFF(MINUTE, OLD.issued_at, NEW.consultation_start_at);
        IF NEW.actual_wait_time < 0 THEN SET NEW.actual_wait_time = 0; END IF;
    END IF;

    -- If moving to COMPLETED and consultation_duration is not yet set
    IF NEW.status = 'COMPLETED' AND (NEW.consultation_duration IS NULL OR NEW.consultation_duration = 0) THEN
        IF NEW.completed_at IS NULL THEN
            SET NEW.completed_at = NOW();
        END IF;
        IF OLD.consultation_start_at IS NOT NULL THEN
            SET NEW.consultation_duration = TIMESTAMPDIFF(MINUTE, OLD.consultation_start_at, NEW.completed_at);
        ELSE
            SET NEW.consultation_duration = 10;
        END IF;
        IF NEW.consultation_duration <= 0 THEN SET NEW.consultation_duration = 1; END IF;
    END IF;
END$$

-- -------------------------------------------------------------------------
-- Trigger 3: trg_token_audit_history
-- Automatically logs status transitions into queue_history table
-- -------------------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_token_audit_history$$
CREATE TRIGGER trg_token_audit_history
AFTER UPDATE ON queue_tokens
FOR EACH ROW
BEGIN
    IF OLD.status != NEW.status THEN
        INSERT INTO queue_history (
            token_id, patient_id, doctor_id, event_type,
            previous_status, new_status, notes, timestamp
        ) VALUES (
            NEW.token_id, NEW.patient_id, NEW.doctor_id,
            CASE 
                WHEN NEW.status = 'CALLED' THEN 'CALLED'
                WHEN NEW.status = 'IN_CONSULTATION' THEN 'CONSULTATION_STARTED'
                WHEN NEW.status = 'COMPLETED' THEN 'CONSULTATION_COMPLETED'
                WHEN NEW.status = 'SKIPPED' THEN 'SKIPPED'
                WHEN NEW.status = 'CANCELLED' THEN 'CANCELLED'
                ELSE 'CALLED'
            END,
            OLD.status, NEW.status,
            CONCAT('Automatic Audit: Status transitioned from ', OLD.status, ' to ', NEW.status),
            NOW()
        );
    END IF;
END$$

DELIMITER ;

-- =========================================================================
-- End of Triggers Definition
-- =========================================================================
