# Viva Voce & Defense Preparation Guide
## Healthcare Queue Management System (Project 36)

---

### Q1. What is the business problem addressed by this project, and what are its core functional modules?
**Answer:**  
In outpatient healthcare facilities, long and unpredictable waiting times lead to patient anxiety, overcrowding, and compromised clinical care. Standard First-In, First-Out (FIFO) queuing fails to accommodate medical urgency.  
This project addresses these challenges with six core functional components:
1. **Patients:** Comprehensive demographic and medical profile management with auto-generated Universal Health IDs (UHID).
2. **Doctors & Availability:** Physician schedules, room allocations, real-time consultation states (Available, In Consultation, On Break, Off Duty).
3. **Tokens:** Daily sequential token numbers with priority scoring and printable ticket slips.
4. **Queues:** Real-time priority-ordered queue management with atomic advance procedures.
5. **Appointments:** Scheduled visit booking and check-in to token conversion.
6. **Queue History & Telemetry:** Immutable audit logs of all queue events and wait-time prediction analytics.

---

### Q2. How is ACID compliance ensured during high-concurrency token issuance and patient calling?
**Answer:**  
ACID properties are enforced at the database level using MySQL 8.0 InnoDB transactions:
- **Atomicity:** In `sp_issue_token` and `sp_call_next_patient`, operations are wrapped in `START TRANSACTION ... COMMIT` with `DECLARE EXIT HANDLER FOR SQLEXCEPTION BEGIN ROLLBACK; RESIGNAL; END;`. If any step fails, the entire transaction rolls back cleanly.
- **Consistency:** Enforced via foreign key constraints (`ON DELETE CASCADE / RESTRICT`), unique constraints (`uq_token_day_number`), and check constraints.
- **Isolation:** Row-level locking is used via `FOR UPDATE` queries (`SELECT ... FOR UPDATE`), preventing race conditions when two receptionists attempt to generate the same sequence number or two doctors advance a shared queue.
- **Durability:** Committed transactions are written to InnoDB redo logs, guaranteeing persistence across crashes.

---

### Q3. Explain your dynamic priority queuing algorithm. Why is FIFO not used?
**Answer:**  
FIFO is unsuitable in healthcare because an emergency patient (e.g., acute chest pain) cannot wait behind routine dermatological or follow-up checkups.  
Our dynamic priority score formula is:
$$\text{PriorityScore} = \text{TriageBase} + \text{VulnerabilityModifier} + \text{AppointmentBonus}$$
- **Triage Acuity:** Emergency Code Red = 95, Urgent Yellow = 65, Routine Green = 20.
- **Vulnerability Bonus:** Senior Citizens (65+), Pediatric (<12), Pregnant patients, or Persons with Disabilities receive +15 points.
- **Appointment Bonus:** Patients who booked ahead and checked in on-time receive +10 points.  
The queue is ordered by `ORDER BY priority_score DESC, token_sequence ASC`, ensuring that emergency and vulnerable patients are called first, while routine patients within the same tier are served in FIFO order.

---

### Q4. How does the Python Waiting Time Estimation microservice work?
**Answer:**  
Waiting times in clinics are non-linear due to doctor consultation speed, patient complexity, and time-of-day fatigue. Our Python FastAPI microservice on port 8000 implements a hybrid approach:
1. **Queuing Theory (Little's Law):**
   $$W_q = (\text{Doctor Remaining Time with Current Patient}) + (\text{Queue Length} \times \text{Avg Service Time}) + \text{Emergency Overhead}$$
2. **Machine Learning Model:** A Random Forest Regressor ($n=100$, max_depth=12) trained on 5,000 clinical encounters evaluating queue length, doctor pace, circadian fatigue factors, and triage priority ($R^2 = 0.9897$, MAE = 5.07 mins).
3. **Hybrid Blending:** Blends 70% ML prediction with 30% Little's Law analytical wait to deliver an accurate point estimate with a 95% confidence interval.
4. **Resilience:** If the Python microservice is temporarily offline, the Node.js backend automatically falls back to the analytical Little's Law formula without breaking the user experience.

---

### Q5. What is the role of SQL Views and Triggers in your database?
**Answer:**
- **Views (CO2):**
  - `vw_live_queue_monitor`: Provides an aggregated operational overview of every consulting room, elapsed minutes, and next patient in line.
  - `vw_tv_display_board`: Optimized specifically for waiting room TV screens, concatenating upcoming tokens into a ticker.
  - `vw_daily_department_analytics`: Aggregates throughput, average wait times, and SLA breaches (>30 mins).
- **Triggers (CO2):**
  - `trg_prevent_duplicate_active_token`: BEFORE INSERT trigger preventing double-booking of active tokens for the same patient on the same day.
  - `trg_calc_token_metrics`: BEFORE UPDATE trigger auto-calculating `actual_wait_time` and `consultation_duration` in minutes.
  - `trg_token_audit_history`: AFTER UPDATE trigger recording status transitions into `queue_history`.

---

### Q6. How does real-time communication work across the TV display, doctor console, and mobile tracker?
**Answer:**  
The Node.js backend integrates **Socket.IO**. When a doctor calls the next patient via `sp_call_next_patient`:
1. The backend executes the stored procedure and updates the database.
2. It emits a WebSocket broadcast `token:called` containing the token number, doctor name, and room number.
3. Connected client screens (TV Display Board, Doctor Console, Patient Mobile Tracker) receive the event immediately without polling or page refresh.
4. The TV board triggers a 2-tone audio chime and Web Speech API synthesis ("Attention: Token CARD-103, please proceed to Room 201").
5. The patient's mobile tracker immediately flashes "YOU ARE BEING CALLED!".
