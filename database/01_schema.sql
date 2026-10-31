-- =========================================================================
-- Healthcare Queue Management System (Project 36)
-- Database: healthcare_queue_db
-- Target: MySQL 8.0+
-- Course Outcomes: CO1 (Database Design), CO2 (Implementation & Operations)
-- =========================================================================

CREATE DATABASE IF NOT EXISTS healthcare_queue_db
CHARACTER SET utf8mb4
COLLATE utf8mb4_unicode_ci;

USE healthcare_queue_db;

-- Disable foreign key checks during schema creation
SET FOREIGN_KEY_CHECKS = 0;

-- -------------------------------------------------------------------------
-- 1. Table: departments
-- Represents clinical departments (Cardiology, Orthopedics, Pediatrics, etc.)
-- -------------------------------------------------------------------------
DROP TABLE IF EXISTS departments;
CREATE TABLE departments (
    dept_id INT AUTO_INCREMENT PRIMARY KEY,
    dept_code VARCHAR(10) NOT NULL UNIQUE,
    dept_name VARCHAR(100) NOT NULL,
    description TEXT,
    floor_number INT NOT NULL DEFAULT 1,
    total_rooms INT NOT NULL DEFAULT 3,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT chk_floor_positive CHECK (floor_number >= 0)
) ENGINE=InnoDB;

-- -------------------------------------------------------------------------
-- 2. Table: doctors
-- Doctors providing consultations with current availability state.
-- -------------------------------------------------------------------------
DROP TABLE IF EXISTS doctors;
CREATE TABLE doctors (
    doctor_id INT AUTO_INCREMENT PRIMARY KEY,
    emp_code VARCHAR(20) NOT NULL UNIQUE,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    phone VARCHAR(20) NOT NULL,
    dept_id INT NOT NULL,
    qualification VARCHAR(100) NOT NULL DEFAULT 'MBBS, MD',
    room_number VARCHAR(20) NOT NULL,
    avg_consultation_time INT NOT NULL DEFAULT 15 COMMENT 'in minutes',
    current_status ENUM('AVAILABLE', 'IN_CONSULTATION', 'ON_BREAK', 'OFF_DUTY', 'EMERGENCY_DUTY') NOT NULL DEFAULT 'AVAILABLE',
    max_daily_capacity INT NOT NULL DEFAULT 40,
    current_token_id INT NULL,
    profile_photo_url VARCHAR(255) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_doctor_department FOREIGN KEY (dept_id) REFERENCES departments(dept_id) ON DELETE RESTRICT,
    CONSTRAINT chk_avg_consultation CHECK (avg_consultation_time > 0)
) ENGINE=InnoDB;

-- -------------------------------------------------------------------------
-- 3. Table: doctor_schedules
-- Operational work shifts and breaks for each doctor.
-- -------------------------------------------------------------------------
DROP TABLE IF EXISTS doctor_schedules;
CREATE TABLE doctor_schedules (
    schedule_id INT AUTO_INCREMENT PRIMARY KEY,
    doctor_id INT NOT NULL,
    day_of_week ENUM('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday') NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    break_start TIME NULL,
    break_end TIME NULL,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    CONSTRAINT fk_schedule_doctor FOREIGN KEY (doctor_id) REFERENCES doctors(doctor_id) ON DELETE CASCADE,
    CONSTRAINT chk_schedule_times CHECK (end_time > start_time)
) ENGINE=InnoDB;

-- -------------------------------------------------------------------------
-- 4. Table: patients
-- Patient registry with demographic & priority categorization.
-- -------------------------------------------------------------------------
DROP TABLE IF EXISTS patients;
CREATE TABLE patients (
    patient_id INT AUTO_INCREMENT PRIMARY KEY,
    uhid VARCHAR(30) NOT NULL UNIQUE COMMENT 'Universal Health ID',
    full_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    email VARCHAR(100) NULL,
    dob DATE NOT NULL,
    gender ENUM('Male', 'Female', 'Other') NOT NULL,
    blood_group VARCHAR(5) NULL,
    category ENUM('GENERAL', 'SENIOR_CITIZEN', 'PEDIATRIC', 'PREGNANT', 'PERSON_WITH_DISABILITY') NOT NULL DEFAULT 'GENERAL',
    address TEXT NULL,
    emergency_contact VARCHAR(20) NULL,
    allergies TEXT NULL,
    password VARCHAR(255) NOT NULL DEFAULT 'patient123',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- -------------------------------------------------------------------------
-- 5. Table: appointments
-- Scheduled doctor appointments.
-- -------------------------------------------------------------------------
DROP TABLE IF EXISTS appointments;
CREATE TABLE appointments (
    appointment_id INT AUTO_INCREMENT PRIMARY KEY,
    appointment_number VARCHAR(30) NOT NULL UNIQUE,
    patient_id INT NOT NULL,
    doctor_id INT NOT NULL,
    scheduled_date DATE NOT NULL,
    time_slot TIME NOT NULL,
    status ENUM('SCHEDULED', 'CHECKED_IN', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW') NOT NULL DEFAULT 'SCHEDULED',
    reason_for_visit VARCHAR(255) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_apt_patient FOREIGN KEY (patient_id) REFERENCES patients(patient_id) ON DELETE CASCADE,
    CONSTRAINT fk_apt_doctor FOREIGN KEY (doctor_id) REFERENCES doctors(doctor_id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- -------------------------------------------------------------------------
-- 6. Table: queue_tokens
-- Tokens issued to patients for physical or scheduled queuing.
-- -------------------------------------------------------------------------
DROP TABLE IF EXISTS queue_tokens;
CREATE TABLE queue_tokens (
    token_id INT AUTO_INCREMENT PRIMARY KEY,
    token_number VARCHAR(25) NOT NULL,
    token_date DATE NOT NULL,
    patient_id INT NOT NULL,
    doctor_id INT NOT NULL,
    dept_id INT NOT NULL,
    appointment_id INT NULL,
    source ENUM('WALK_IN', 'APPOINTMENT', 'EMERGENCY_REFERRAL') NOT NULL DEFAULT 'WALK_IN',
    triage_level ENUM('EMERGENCY', 'URGENT', 'ROUTINE') NOT NULL DEFAULT 'ROUTINE',
    priority_score INT NOT NULL DEFAULT 10 COMMENT 'Calculated priority score for queue ordering',
    token_sequence INT NOT NULL COMMENT 'Sequential integer token per doctor/dept per day',
    status ENUM('WAITING', 'CALLED', 'IN_CONSULTATION', 'COMPLETED', 'SKIPPED', 'CANCELLED') NOT NULL DEFAULT 'WAITING',
    estimated_wait_time INT NOT NULL DEFAULT 15 COMMENT 'Predicted wait time in minutes',
    actual_wait_time INT NULL COMMENT 'Calculated minutes elapsed from issuance to consultation start',
    consultation_duration INT NULL COMMENT 'Minutes elapsed in consultation',
    issued_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    called_at TIMESTAMP NULL,
    consultation_start_at TIMESTAMP NULL,
    completed_at TIMESTAMP NULL,
    CONSTRAINT fk_token_patient FOREIGN KEY (patient_id) REFERENCES patients(patient_id) ON DELETE RESTRICT,
    CONSTRAINT fk_token_doctor FOREIGN KEY (doctor_id) REFERENCES doctors(doctor_id) ON DELETE RESTRICT,
    CONSTRAINT fk_token_department FOREIGN KEY (dept_id) REFERENCES departments(dept_id) ON DELETE RESTRICT,
    CONSTRAINT fk_token_appointment FOREIGN KEY (appointment_id) REFERENCES appointments(appointment_id) ON DELETE SET NULL,
    CONSTRAINT uq_token_day_number UNIQUE (token_date, token_number)
) ENGINE=InnoDB;

-- -------------------------------------------------------------------------
-- 7. Table: active_queues
-- Fast lookup table storing the active queue sequence currently in play.
-- -------------------------------------------------------------------------
DROP TABLE IF EXISTS active_queues;
CREATE TABLE active_queues (
    queue_entry_id INT AUTO_INCREMENT PRIMARY KEY,
    token_id INT NOT NULL UNIQUE,
    doctor_id INT NOT NULL,
    current_position INT NOT NULL,
    status ENUM('WAITING', 'CALLED', 'IN_CONSULTATION') NOT NULL DEFAULT 'WAITING',
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_active_token FOREIGN KEY (token_id) REFERENCES queue_tokens(token_id) ON DELETE CASCADE,
    CONSTRAINT fk_active_doctor FOREIGN KEY (doctor_id) REFERENCES doctors(doctor_id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- -------------------------------------------------------------------------
-- 8. Table: consultation_sessions
-- Record of consultation encounter, symptoms, diagnosis, and prescription.
-- -------------------------------------------------------------------------
DROP TABLE IF EXISTS consultation_sessions;
CREATE TABLE consultation_sessions (
    session_id INT AUTO_INCREMENT PRIMARY KEY,
    token_id INT NOT NULL UNIQUE,
    doctor_id INT NOT NULL,
    patient_id INT NOT NULL,
    vitals_bp VARCHAR(20) NULL,
    vitals_pulse INT NULL,
    vitals_temp DECIMAL(4,1) NULL,
    symptoms TEXT NULL,
    diagnosis TEXT NULL,
    prescription_notes TEXT NULL,
    follow_up_date DATE NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_session_token FOREIGN KEY (token_id) REFERENCES queue_tokens(token_id) ON DELETE CASCADE,
    CONSTRAINT fk_session_doctor FOREIGN KEY (doctor_id) REFERENCES doctors(doctor_id) ON DELETE CASCADE,
    CONSTRAINT fk_session_patient FOREIGN KEY (patient_id) REFERENCES patients(patient_id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- -------------------------------------------------------------------------
-- 9. Table: queue_history
-- Full audit trail of all queue events and state transitions.
-- -------------------------------------------------------------------------
DROP TABLE IF EXISTS queue_history;
CREATE TABLE queue_history (
    history_id INT AUTO_INCREMENT PRIMARY KEY,
    token_id INT NOT NULL,
    patient_id INT NOT NULL,
    doctor_id INT NOT NULL,
    event_type ENUM('TOKEN_ISSUED', 'CALLED', 'CONSULTATION_STARTED', 'CONSULTATION_COMPLETED', 'SKIPPED', 'RECALLED', 'TRANSFERRED', 'CANCELLED') NOT NULL,
    previous_status VARCHAR(30) NULL,
    new_status VARCHAR(30) NOT NULL,
    notes VARCHAR(255) NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_history_token FOREIGN KEY (token_id) REFERENCES queue_tokens(token_id) ON DELETE CASCADE,
    CONSTRAINT fk_history_patient FOREIGN KEY (patient_id) REFERENCES patients(patient_id) ON DELETE CASCADE,
    CONSTRAINT fk_history_doctor FOREIGN KEY (doctor_id) REFERENCES doctors(doctor_id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- -------------------------------------------------------------------------
-- 10. Table: ml_waiting_time_telemetry
-- AI and Little's Law telemetry comparison log for waiting time predictions.
-- -------------------------------------------------------------------------
DROP TABLE IF EXISTS ml_waiting_time_telemetry;
CREATE TABLE ml_waiting_time_telemetry (
    telemetry_id INT AUTO_INCREMENT PRIMARY KEY,
    token_id INT NOT NULL,
    queue_length_at_issue INT NOT NULL,
    predicted_wait_time DECIMAL(6,2) NOT NULL,
    actual_wait_time DECIMAL(6,2) NULL,
    error_margin DECIMAL(6,2) NULL,
    model_version VARCHAR(30) NOT NULL DEFAULT 'v1.0-rf-queuetheory',
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_telemetry_token FOREIGN KEY (token_id) REFERENCES queue_tokens(token_id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Re-enable foreign key checks
SET FOREIGN_KEY_CHECKS = 1;

-- =========================================================================
-- End of Schema Definition
-- =========================================================================
