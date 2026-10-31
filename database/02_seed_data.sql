-- =========================================================================
-- Healthcare Queue Management System (Project 36)
-- Seed Data Script
-- Populates departments, doctors, patients, appointments, active/past tokens,
-- queue history, consultation records, and wait time telemetry.
-- =========================================================================

USE healthcare_queue_db;

SET FOREIGN_KEY_CHECKS = 0;

-- -------------------------------------------------------------------------
-- 1. Populate DEPARTMENTS
-- -------------------------------------------------------------------------
TRUNCATE TABLE departments;
INSERT INTO departments (dept_id, dept_code, dept_name, description, floor_number, total_rooms) VALUES
(1, 'CARD', 'Cardiology', 'Heart, cardiovascular health, ECG, and echocardiography', 2, 4),
(2, 'ORTH', 'Orthopedics', 'Bones, joints, fractures, spine, and musculoskeletal care', 1, 3),
(3, 'PEDI', 'Pediatrics', 'Child healthcare, vaccinations, and neonatal monitoring', 3, 4),
(4, 'GENM', 'General Medicine', 'Primary care, fevers, internal medicine, and diagnostic triage', 1, 5),
(5, 'DERM', 'Dermatology', 'Skin, hair, allergies, and cosmetic dermatology', 2, 3),
(6, 'EMER', 'Emergency & Trauma', 'Acute critical trauma, resuscitation, and code red triage', 1, 6);

-- -------------------------------------------------------------------------
-- 2. Populate DOCTORS
-- -------------------------------------------------------------------------
TRUNCATE TABLE doctors;
INSERT INTO doctors (doctor_id, emp_code, full_name, email, phone, dept_id, qualification, room_number, avg_consultation_time, current_status, max_daily_capacity) VALUES
(1, 'DOC-101', 'Dr. Ramesh Sharma', 'ramesh.sharma@hospital.org', '+91 98765 43210', 1, 'MBBS, MD, DM (Cardiology)', 'Room 201', 18, 'IN_CONSULTATION', 35),
(2, 'DOC-102', 'Dr. Priya Varma', 'priya.varma@hospital.org', '+91 98765 43211', 1, 'MBBS, DNB (Cardiology)', 'Room 202', 15, 'AVAILABLE', 40),
(3, 'DOC-201', 'Dr. Ananya Iyer', 'ananya.iyer@hospital.org', '+91 98765 43212', 2, 'MBBS, MS (Orthopedics)', 'Room 105', 20, 'IN_CONSULTATION', 30),
(4, 'DOC-202', 'Dr. Vikram Reddy', 'vikram.reddy@hospital.org', '+91 98765 43213', 2, 'MBBS, D.Ortho', 'Room 106', 15, 'ON_BREAK', 35),
(5, 'DOC-301', 'Dr. Sneha Kulkarni', 'sneha.kulkarni@hospital.org', '+91 98765 43214', 3, 'MBBS, MD (Pediatrics)', 'Room 302', 12, 'AVAILABLE', 45),
(6, 'DOC-401', 'Dr. Rajesh Nair', 'rajesh.nair@hospital.org', '+91 98765 43215', 4, 'MBBS, MD (General Medicine)', 'Room 101', 10, 'IN_CONSULTATION', 50),
(7, 'DOC-402', 'Dr. Sunita Deshmukh', 'sunita.deshmukh@hospital.org', '+91 98765 43216', 4, 'MBBS, MD (Internal Med)', 'Room 102', 12, 'AVAILABLE', 50),
(8, 'DOC-501', 'Dr. Arvind Patel', 'arvind.patel@hospital.org', '+91 98765 43217', 5, 'MBBS, MD (Dermatology)', 'Room 210', 14, 'AVAILABLE', 35),
(9, 'DOC-601', 'Dr. Farooq Khan', 'farooq.khan@hospital.org', '+91 98765 43218', 6, 'MBBS, FEM (Emergency Medicine)', 'ER Bay 1', 8, 'AVAILABLE', 60);

-- -------------------------------------------------------------------------
-- 3. Populate DOCTOR_SCHEDULES
-- -------------------------------------------------------------------------
TRUNCATE TABLE doctor_schedules;
INSERT INTO doctor_schedules (doctor_id, day_of_week, start_time, end_time, break_start, break_end) VALUES
(1, 'Monday', '09:00:00', '17:00:00', '13:00:00', '14:00:00'),
(1, 'Tuesday', '09:00:00', '17:00:00', '13:00:00', '14:00:00'),
(1, 'Wednesday', '09:00:00', '17:00:00', '13:00:00', '14:00:00'),
(1, 'Thursday', '09:00:00', '17:00:00', '13:00:00', '14:00:00'),
(1, 'Friday', '09:00:00', '17:00:00', '13:00:00', '14:00:00'),
(2, 'Monday', '10:00:00', '18:00:00', '14:00:00', '15:00:00'),
(3, 'Monday', '08:30:00', '16:30:00', '12:30:00', '13:30:00'),
(4, 'Monday', '11:00:00', '19:00:00', '15:00:00', '16:00:00'),
(5, 'Monday', '09:00:00', '15:00:00', '12:30:00', '13:00:00'),
(6, 'Monday', '08:00:00', '16:00:00', '12:00:00', '13:00:00'),
(7, 'Monday', '12:00:00', '20:00:00', '16:00:00', '17:00:00');

-- -------------------------------------------------------------------------
-- 4. Populate PATIENTS
-- -------------------------------------------------------------------------
TRUNCATE TABLE patients;
INSERT INTO patients (patient_id, uhid, full_name, phone, email, dob, gender, blood_group, category, emergency_contact, allergies) VALUES
(1, 'UHID-2026-001', 'Kavita Menon', '+91 91234 56780', 'kavita.m@gmail.com', '1985-04-12', 'Female', 'O+', 'GENERAL', '+91 91234 56789', 'Penicillin'),
(2, 'UHID-2026-002', 'Suresh Kumar', '+91 91234 56781', 'suresh.k@yahoo.com', '1955-08-25', 'Male', 'B+', 'SENIOR_CITIZEN', '+91 91234 56790', 'None'),
(3, 'UHID-2026-003', 'Aarav Gupta', '+91 91234 56782', 'gupta.family@gmail.com', '2021-03-10', 'Male', 'A+', 'PEDIATRIC', '+91 91234 56791', 'Dairy, Sulfa'),
(4, 'UHID-2026-004', 'Deepa Shenoy', '+91 91234 56783', 'deepa.s@outlook.com', '1992-11-18', 'Female', 'AB+', 'PREGNANT', '+91 91234 56792', 'None'),
(5, 'UHID-2026-005', 'Manish Joshi', '+91 91234 56784', 'manish.j@gmail.com', '1978-01-30', 'Male', 'O-', 'GENERAL', '+91 91234 56793', 'Aspirin'),
(6, 'UHID-2026-006', 'Lakshmi Narayanan', '+91 91234 56785', 'lakshmi.n@gmail.com', '1950-06-15', 'Female', 'A-', 'SENIOR_CITIZEN', '+91 91234 56794', 'None'),
(7, 'UHID-2026-007', 'Harish Rao', '+91 91234 56786', 'harish.rao@hotmail.com', '1963-09-05', 'Male', 'B-', 'SENIOR_CITIZEN', '+91 91234 56795', 'Iodine dye'),
(8, 'UHID-2026-008', 'Bhavna Chawla', '+91 91234 56787', 'bhavna.c@gmail.com', '1998-07-22', 'Female', 'O+', 'GENERAL', '+91 91234 56796', 'None'),
(9, 'UHID-2026-009', 'Rohan Verma', '+91 91234 56788', 'rohan.v@gmail.com', '2000-02-14', 'Male', 'AB-', 'PERSON_WITH_DISABILITY', '+91 91234 56797', 'Pollen'),
(10, 'UHID-2026-010', 'Meera Pillai', '+91 91234 56789', 'meera.p@gmail.com', '1995-12-03', 'Female', 'B+', 'GENERAL', '+91 91234 56798', 'None'),
(11, 'UHID-2026-011', 'Devendra Prasad', '+91 98111 22334', 'dev.prasad@gmail.com', '1958-03-22', 'Male', 'O+', 'SENIOR_CITIZEN', '+91 98111 22330', 'None'),
(12, 'UHID-2026-012', 'Simran Kaur', '+91 98111 22335', 'simran.k@gmail.com', '2022-09-15', 'Female', 'A+', 'PEDIATRIC', '+91 98111 22331', 'None'),
(13, 'UHID-2026-013', 'Gautam Singhania', '+91 98111 22336', 'gautam.s@gmail.com', '1988-05-19', 'Male', 'B+', 'GENERAL', '+91 98111 22332', 'Amoxicillin'),
(14, 'UHID-2026-014', 'Ananya Bose', '+91 98111 22337', 'ananya.b@gmail.com', '1996-08-30', 'Female', 'AB+', 'GENERAL', '+91 98111 22333', 'None'),
(15, 'UHID-2026-015', 'Tariq Siddiqui', '+91 98111 22338', 'tariq.s@gmail.com', '1975-10-10', 'Male', 'O-', 'GENERAL', '+91 98111 22339', 'None'),
(16, 'UHID-2026-0016', 'VISHNU', '7386677132', 'vishnu@carequeue.org', '2008-01-30', 'Male', 'B+', 'GENERAL', '+91 98765 43210', 'None');

-- -------------------------------------------------------------------------
-- 5. Populate APPOINTMENTS
-- -------------------------------------------------------------------------
TRUNCATE TABLE appointments;
INSERT INTO appointments (appointment_id, appointment_number, patient_id, doctor_id, scheduled_date, time_slot, status, reason_for_visit) VALUES
(1, 'APT-20261030-001', 1, 1, CURRENT_DATE, '09:30:00', 'CHECKED_IN', 'Follow-up hypertension & ECG check'),
(2, 'APT-20261030-002', 2, 1, CURRENT_DATE, '10:00:00', 'CHECKED_IN', 'Chest pain on exertion evaluation'),
(3, 'APT-20261030-003', 4, 1, CURRENT_DATE, '10:30:00', 'CHECKED_IN', 'Maternal heart palpitations check'),
(4, 'APT-20261030-004', 3, 5, CURRENT_DATE, '10:00:00', 'CHECKED_IN', 'Routine immunization and cough'),
(5, 'APT-20261030-005', 6, 3, CURRENT_DATE, '09:00:00', 'CHECKED_IN', 'Severe knee osteoarthritis consultation'),
(6, 'APT-20261030-006', 7, 3, CURRENT_DATE, '09:45:00', 'CHECKED_IN', 'Lower back pain lumbar spine review'),
(7, 'APT-20261030-007', 8, 8, CURRENT_DATE, '11:00:00', 'SCHEDULED', 'Eczema flare-up on hands'),
(8, 'APT-20261030-008', 9, 6, CURRENT_DATE, '10:15:00', 'CHECKED_IN', 'Persistent fever and fatigue');

-- -------------------------------------------------------------------------
-- 6. Populate QUEUE_TOKENS
-- Realistic mix of COMPLETED earlier today, currently IN_CONSULTATION, and WAITING
-- -------------------------------------------------------------------------
TRUNCATE TABLE queue_tokens;
INSERT INTO queue_tokens 
(token_id, token_number, token_date, patient_id, doctor_id, dept_id, appointment_id, source, triage_level, priority_score, token_sequence, status, estimated_wait_time, actual_wait_time, consultation_duration, issued_at, called_at, consultation_start_at, completed_at) 
VALUES
-- Dr. Ramesh Sharma (Cardiology) - Completed earlier today
(1, 'CARD-101', CURRENT_DATE, 1, 1, 1, 1, 'APPOINTMENT', 'ROUTINE', 40, 1, 'COMPLETED', 15, 12, 17, 
 DATE_SUB(NOW(), INTERVAL 95 MINUTE), DATE_SUB(NOW(), INTERVAL 83 MINUTE), DATE_SUB(NOW(), INTERVAL 82 MINUTE), DATE_SUB(NOW(), INTERVAL 65 MINUTE)),

-- Dr. Ramesh Sharma (Cardiology) - Currently In Consultation
(2, 'CARD-102', CURRENT_DATE, 2, 1, 1, 2, 'APPOINTMENT', 'URGENT', 65, 2, 'IN_CONSULTATION', 18, 16, NULL, 
 DATE_SUB(NOW(), INTERVAL 65 MINUTE), DATE_SUB(NOW(), INTERVAL 14 MINUTE), DATE_SUB(NOW(), INTERVAL 12 MINUTE), NULL),

-- Dr. Ramesh Sharma (Cardiology) - Waiting in Queue (Priority Emergency)
(3, 'CARD-103', CURRENT_DATE, 7, 1, 1, NULL, 'WALK_IN', 'EMERGENCY', 95, 3, 'WAITING', 8, NULL, NULL, 
 DATE_SUB(NOW(), INTERVAL 25 MINUTE), NULL, NULL, NULL),

-- Dr. Ramesh Sharma (Cardiology) - Waiting in Queue (Appointment check-in)
(4, 'CARD-104', CURRENT_DATE, 4, 1, 1, 3, 'APPOINTMENT', 'ROUTINE', 55, 4, 'WAITING', 22, NULL, NULL, 
 DATE_SUB(NOW(), INTERVAL 20 MINUTE), NULL, NULL, NULL),

-- Dr. Ramesh Sharma (Cardiology) - Waiting in Queue (Walk-in)
(5, 'CARD-105', CURRENT_DATE, 11, 1, 1, NULL, 'WALK_IN', 'ROUTINE', 35, 5, 'WAITING', 38, NULL, NULL, 
 DATE_SUB(NOW(), INTERVAL 10 MINUTE), NULL, NULL, NULL),

-- Dr. Ananya Iyer (Orthopedics) - Currently In Consultation
(6, 'ORTH-101', CURRENT_DATE, 6, 3, 2, 5, 'APPOINTMENT', 'URGENT', 65, 1, 'IN_CONSULTATION', 15, 10, NULL, 
 DATE_SUB(NOW(), INTERVAL 45 MINUTE), DATE_SUB(NOW(), INTERVAL 10 MINUTE), DATE_SUB(NOW(), INTERVAL 8 MINUTE), NULL),

-- Dr. Ananya Iyer (Orthopedics) - Waiting
(7, 'ORTH-102', CURRENT_DATE, 5, 3, 2, 6, 'APPOINTMENT', 'ROUTINE', 45, 2, 'WAITING', 18, NULL, NULL, 
 DATE_SUB(NOW(), INTERVAL 30 MINUTE), NULL, NULL, NULL),

-- Dr. Sneha Kulkarni (Pediatrics) - Waiting
(8, 'PEDI-101', CURRENT_DATE, 3, 5, 3, 4, 'APPOINTMENT', 'ROUTINE', 50, 1, 'WAITING', 12, NULL, NULL, 
 DATE_SUB(NOW(), INTERVAL 15 MINUTE), NULL, NULL, NULL),

(9, 'PEDI-102', CURRENT_DATE, 12, 5, 3, NULL, 'WALK_IN', 'ROUTINE', 30, 2, 'WAITING', 24, NULL, NULL, 
 DATE_SUB(NOW(), INTERVAL 5 MINUTE), NULL, NULL, NULL),

-- Dr. Rajesh Nair (General Medicine) - In Consultation
(10, 'GENM-101', CURRENT_DATE, 9, 6, 4, 8, 'APPOINTMENT', 'ROUTINE', 45, 1, 'IN_CONSULTATION', 10, 8, NULL, 
 DATE_SUB(NOW(), INTERVAL 35 MINUTE), DATE_SUB(NOW(), INTERVAL 6 MINUTE), DATE_SUB(NOW(), INTERVAL 5 MINUTE), NULL),

-- Dr. Rajesh Nair (General Medicine) - Waiting
(11, 'GENM-102', CURRENT_DATE, 10, 6, 4, NULL, 'WALK_IN', 'URGENT', 60, 2, 'WAITING', 10, NULL, NULL, 
 DATE_SUB(NOW(), INTERVAL 18 MINUTE), NULL, NULL, NULL),

(12, 'GENM-103', CURRENT_DATE, 13, 6, 4, NULL, 'WALK_IN', 'ROUTINE', 25, 3, 'WAITING', 20, NULL, NULL, 
 DATE_SUB(NOW(), INTERVAL 12 MINUTE), NULL, NULL, NULL),

(13, 'GENM-104', CURRENT_DATE, 14, 6, 4, NULL, 'WALK_IN', 'ROUTINE', 20, 4, 'WAITING', 30, NULL, NULL, 
 DATE_SUB(NOW(), INTERVAL 4 MINUTE), NULL, NULL, NULL);

-- Update doctor current_token_id pointers
UPDATE doctors SET current_token_id = 2 WHERE doctor_id = 1;
UPDATE doctors SET current_token_id = 6 WHERE doctor_id = 3;
UPDATE doctors SET current_token_id = 10 WHERE doctor_id = 6;

-- -------------------------------------------------------------------------
-- 7. Populate ACTIVE_QUEUES
-- Current active state tracking for real-time lookups
-- -------------------------------------------------------------------------
TRUNCATE TABLE active_queues;
INSERT INTO active_queues (token_id, doctor_id, current_position, status) VALUES
(2, 1, 0, 'IN_CONSULTATION'),
(3, 1, 1, 'WAITING'),
(4, 1, 2, 'WAITING'),
(5, 1, 3, 'WAITING'),

(6, 3, 0, 'IN_CONSULTATION'),
(7, 3, 1, 'WAITING'),

(8, 5, 1, 'WAITING'),
(9, 5, 2, 'WAITING'),

(10, 6, 0, 'IN_CONSULTATION'),
(11, 6, 1, 'WAITING'),
(12, 6, 2, 'WAITING'),
(13, 6, 3, 'WAITING');

-- -------------------------------------------------------------------------
-- 8. Populate CONSULTATION_SESSIONS
-- -------------------------------------------------------------------------
TRUNCATE TABLE consultation_sessions;
INSERT INTO consultation_sessions (token_id, doctor_id, patient_id, vitals_bp, vitals_pulse, vitals_temp, symptoms, diagnosis, prescription_notes, follow_up_date) VALUES
(1, 1, 1, '130/85', 74, 98.4, 'Occasional shortness of breath during climbing stairs, mild ankle edema.', 'Stage 1 Hypertension, stable angina pectoris rule-out', 'Tab. Telmisartan 40mg OD morning, Tab. Aspirin 75mg OD post-dinner. Low salt diet.', DATE_ADD(CURRENT_DATE, INTERVAL 30 DAY));

-- -------------------------------------------------------------------------
-- 9. Populate QUEUE_HISTORY
-- -------------------------------------------------------------------------
TRUNCATE TABLE queue_history;
INSERT INTO queue_history (token_id, patient_id, doctor_id, event_type, previous_status, new_status, notes, timestamp) VALUES
(1, 1, 1, 'TOKEN_ISSUED', NULL, 'WAITING', 'Token issued via Appointment Check-in', DATE_SUB(NOW(), INTERVAL 95 MINUTE)),
(1, 1, 1, 'CALLED', 'WAITING', 'CALLED', 'Patient called to Room 201', DATE_SUB(NOW(), INTERVAL 83 MINUTE)),
(1, 1, 1, 'CONSULTATION_STARTED', 'CALLED', 'IN_CONSULTATION', 'Doctor began consultation', DATE_SUB(NOW(), INTERVAL 82 MINUTE)),
(1, 1, 1, 'CONSULTATION_COMPLETED', 'IN_CONSULTATION', 'COMPLETED', 'Prescription finalized and consultation closed', DATE_SUB(NOW(), INTERVAL 65 MINUTE)),

(2, 2, 1, 'TOKEN_ISSUED', NULL, 'WAITING', 'Token issued via Appointment Check-in', DATE_SUB(NOW(), INTERVAL 65 MINUTE)),
(2, 2, 1, 'CALLED', 'WAITING', 'CALLED', 'Called to Room 201', DATE_SUB(NOW(), INTERVAL 14 MINUTE)),
(2, 2, 1, 'CONSULTATION_STARTED', 'CALLED', 'IN_CONSULTATION', 'Consultation in progress', DATE_SUB(NOW(), INTERVAL 12 MINUTE)),

(3, 7, 1, 'TOKEN_ISSUED', NULL, 'WAITING', 'Walk-in emergency chest heaviness triage score 95', DATE_SUB(NOW(), INTERVAL 25 MINUTE)),
(4, 4, 1, 'TOKEN_ISSUED', NULL, 'WAITING', 'Token issued via Appointment check-in', DATE_SUB(NOW(), INTERVAL 20 MINUTE)),
(5, 11, 1, 'TOKEN_ISSUED', NULL, 'WAITING', 'Walk-in senior citizen token issued', DATE_SUB(NOW(), INTERVAL 10 MINUTE)),

(6, 6, 3, 'TOKEN_ISSUED', NULL, 'WAITING', 'Appointment check-in Orthopedics', DATE_SUB(NOW(), INTERVAL 45 MINUTE)),
(6, 6, 3, 'CALLED', 'WAITING', 'CALLED', 'Called to Room 105', DATE_SUB(NOW(), INTERVAL 10 MINUTE)),
(6, 6, 3, 'CONSULTATION_STARTED', 'CALLED', 'IN_CONSULTATION', 'Orthopedics exam underway', DATE_SUB(NOW(), INTERVAL 8 MINUTE)),

(7, 5, 3, 'TOKEN_ISSUED', NULL, 'WAITING', 'Appointment check-in Orthopedics', DATE_SUB(NOW(), INTERVAL 30 MINUTE)),

(8, 3, 5, 'TOKEN_ISSUED', NULL, 'WAITING', 'Appointment check-in Pediatrics', DATE_SUB(NOW(), INTERVAL 15 MINUTE)),
(9, 12, 5, 'TOKEN_ISSUED', NULL, 'WAITING', 'Walk-in pediatric fever check', DATE_SUB(NOW(), INTERVAL 5 MINUTE)),

(10, 9, 6, 'TOKEN_ISSUED', NULL, 'WAITING', 'General Medicine Appointment Check-in', DATE_SUB(NOW(), INTERVAL 35 MINUTE)),
(10, 9, 6, 'CALLED', 'WAITING', 'CALLED', 'Called to Room 101', DATE_SUB(NOW(), INTERVAL 6 MINUTE)),
(10, 9, 6, 'CONSULTATION_STARTED', 'CALLED', 'IN_CONSULTATION', 'General Medicine exam underway', DATE_SUB(NOW(), INTERVAL 5 MINUTE)),

(11, 10, 6, 'TOKEN_ISSUED', NULL, 'WAITING', 'General Medicine Walk-in Urgent', DATE_SUB(NOW(), INTERVAL 18 MINUTE)),
(12, 13, 6, 'TOKEN_ISSUED', NULL, 'WAITING', 'General Medicine Walk-in Routine', DATE_SUB(NOW(), INTERVAL 12 MINUTE)),
(13, 14, 6, 'TOKEN_ISSUED', NULL, 'WAITING', 'General Medicine Walk-in Routine', DATE_SUB(NOW(), INTERVAL 4 MINUTE));

-- -------------------------------------------------------------------------
-- 10. Populate ML_WAITING_TIME_TELEMETRY
-- -------------------------------------------------------------------------
TRUNCATE TABLE ml_waiting_time_telemetry;
INSERT INTO ml_waiting_time_telemetry (token_id, queue_length_at_issue, predicted_wait_time, actual_wait_time, error_margin, model_version) VALUES
(1, 1, 15.00, 12.00, -3.00, 'v1.0-rf-queuetheory'),
(2, 2, 18.00, 16.00, -2.00, 'v1.0-rf-queuetheory'),
(3, 1, 8.50, NULL, NULL, 'v1.0-rf-queuetheory'),
(4, 2, 22.00, NULL, NULL, 'v1.0-rf-queuetheory'),
(5, 3, 38.00, NULL, NULL, 'v1.0-rf-queuetheory'),
(6, 1, 15.00, 10.00, -5.00, 'v1.0-rf-queuetheory'),
(7, 2, 18.00, NULL, NULL, 'v1.0-rf-queuetheory'),
(8, 0, 5.00, NULL, NULL, 'v1.0-rf-queuetheory'),
(9, 1, 12.00, NULL, NULL, 'v1.0-rf-queuetheory'),
(10, 1, 10.00, 8.00, -2.00, 'v1.0-rf-queuetheory'),
(11, 2, 10.00, NULL, NULL, 'v1.0-rf-queuetheory'),
(12, 3, 20.00, NULL, NULL, 'v1.0-rf-queuetheory'),
(13, 4, 30.00, NULL, NULL, 'v1.0-rf-queuetheory');

SET FOREIGN_KEY_CHECKS = 1;

-- =========================================================================
-- End of Seed Data Script
-- =========================================================================
