# Database Design & Entity-Relationship Architecture
## Healthcare Queue Management System (MySQL 8.0)

### 1. Mermaid Entity-Relationship Diagram (ERD)

```mermaid
erDiagram
    DEPARTMENTS ||--o{ DOCTORS : "houses"
    DEPARTMENTS ||--o{ QUEUE_TOKENS : "categorizes"
    DOCTORS ||--o{ DOCTOR_SCHEDULES : "has"
    DOCTORS ||--o{ APPOINTMENTS : "conducts"
    DOCTORS ||--o{ QUEUE_TOKENS : "serves"
    DOCTORS ||--o{ ACTIVE_QUEUES : "manages"
    PATIENTS ||--o{ APPOINTMENTS : "books"
    PATIENTS ||--o{ QUEUE_TOKENS : "receives"
    APPOINTMENTS ||--o| QUEUE_TOKENS : "generates"
    QUEUE_TOKENS ||--|| ACTIVE_QUEUES : "tracked_in"
    QUEUE_TOKENS ||--o| CONSULTATION_SESSIONS : "results_in"
    QUEUE_TOKENS ||--o{ QUEUE_HISTORY : "audited_by"
    QUEUE_TOKENS ||--o| ML_WAITING_TIME_TELEMETRY : "evaluates"

    DEPARTMENTS {
        int dept_id PK
        string dept_code UK
        string dept_name
        int floor_number
        int total_rooms
        boolean is_active
    }

    DOCTORS {
        int doctor_id PK
        string emp_code UK
        string full_name
        string email UK
        string phone
        int dept_id FK
        string qualification
        string room_number
        int avg_consultation_time
        enum current_status
        int max_daily_capacity
        int current_token_id
    }

    PATIENTS {
        int patient_id PK
        string uhid UK
        string full_name
        string phone
        string email
        date dob
        enum gender
        string blood_group
        enum category
        text allergies
    }

    APPOINTMENTS {
        int appointment_id PK
        string appointment_number UK
        int patient_id FK
        int doctor_id FK
        date scheduled_date
        time time_slot
        enum status
        string reason_for_visit
    }

    QUEUE_TOKENS {
        int token_id PK
        string token_number
        date token_date
        int patient_id FK
        int doctor_id FK
        int dept_id FK
        int appointment_id FK
        enum source
        enum triage_level
        int priority_score
        int token_sequence
        enum status
        int estimated_wait_time
        int actual_wait_time
        int consultation_duration
        timestamp issued_at
        timestamp called_at
        timestamp consultation_start_at
        timestamp completed_at
    }

    ACTIVE_QUEUES {
        int queue_entry_id PK
        int token_id FK,UK
        int doctor_id FK
        int current_position
        enum status
        timestamp last_updated
    }

    CONSULTATION_SESSIONS {
        int session_id PK
        int token_id FK,UK
        int doctor_id FK
        int patient_id FK
        string vitals_bp
        int vitals_pulse
        decimal vitals_temp
        text symptoms
        text diagnosis
        text prescription_notes
        date follow_up_date
    }

    QUEUE_HISTORY {
        int history_id PK
        int token_id FK
        int patient_id FK
        int doctor_id FK
        enum event_type
        string previous_status
        string new_status
        string notes
        timestamp timestamp
    }

    ML_WAITING_TIME_TELEMETRY {
        int telemetry_id PK
        int token_id FK
        int queue_length_at_issue
        decimal predicted_wait_time
        decimal actual_wait_time
        decimal error_margin
        string model_version
        timestamp recorded_at
    }
```

### 2. Relational Schema Normalization Analysis
- **1NF Compliance:** All attributes contain indivisible scalar values; no repeating arrays or comma-delimited strings in core relational keys; primary keys explicitly defined for all 10 relations.
- **2NF Compliance:** There are no partial functional dependencies. In `queue_tokens`, candidate key `(token_date, token_number)` determines non-key attributes entirely, and synthetic surrogate key `token_id` is the primary key.
- **3NF Compliance:** No non-prime attribute is transitively dependent on any candidate key. Physician room numbers and qualifications are stored solely in `doctors`, not duplicated into `queue_tokens` or `active_queues`.
- **BCNF Compliance:** Every determinant in the relational schema is a candidate key.
