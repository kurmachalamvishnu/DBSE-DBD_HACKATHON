# REST API Reference & Specification
## Healthcare Queue Management Backend (Port 5000)

**Base URL:** `http://localhost:5000/api`  
**Standard Response Envelope:**
```json
{
  "success": true,
  "message": "Optional status message",
  "data": { ... }
}
```

---

### 1. Issue Queue Token
- **Endpoint:** `POST /api/tokens/issue`
- **Request Body:**
  ```json
  {
    "patient_id": 1,
    "doctor_id": 1,
    "source": "WALK_IN",
    "triage_level": "URGENT",
    "appointment_id": null
  }
  ```
- **Response (201 Created):**
  ```json
  {
    "success": true,
    "message": "Token issued successfully",
    "data": {
      "token_id": 14,
      "token_number": "CARD-106",
      "priority_score": 65,
      "estimated_wait_time": 22,
      "doctor_name": "Dr. Ramesh Sharma",
      "room_number": "Room 201",
      "status": "WAITING"
    },
    "prediction_details": {
      "provider": "Python-FastAPI-RandomForest-Model",
      "estimated_wait_time_minutes": 22.4,
      "confidence_interval": [18.2, 26.6]
    }
  }
  ```

---

### 2. Patient Live Token Tracker
- **Endpoint:** `GET /api/tokens/status/:tokenNumber`
- **Example:** `GET /api/tokens/status/CARD-102`
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "data": {
      "token_number": "CARD-102",
      "patient_name": "Suresh Kumar",
      "uhid": "UHID-2026-002",
      "doctor_name": "Dr. Ramesh Sharma",
      "room_number": "Room 201",
      "doctor_status": "IN_CONSULTATION",
      "status": "IN_CONSULTATION",
      "patients_ahead": 0,
      "estimated_wait_time": 18
    }
  }
  ```

---

### 3. Call Next Patient
- **Endpoint:** `POST /api/queues/call-next`
- **Request Body:**
  ```json
  {
    "doctor_id": 1
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "Token CARD-103 called successfully.",
    "data": {
      "tokenId": 3,
      "tokenNumber": "CARD-103",
      "patientName": "Harish Rao",
      "doctorId": 1,
      "doctorName": "Dr. Ramesh Sharma",
      "roomNumber": "Room 201",
      "calledAt": "2026-10-30T16:15:00.000Z"
    }
  }
  ```

---

### 4. Complete Consultation & Clinical Notes
- **Endpoint:** `POST /api/queues/complete`
- **Request Body:**
  ```json
  {
    "token_id": 3,
    "vitals_bp": "130/80",
    "vitals_pulse": 76,
    "vitals_temp": 98.6,
    "symptoms": "Mild dyspnea",
    "diagnosis": "Stable angina rule-out",
    "prescription_notes": "Tab. Aspirin 75mg OD",
    "follow_up_date": "2026-11-30"
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "Consultation successfully completed and clinical notes saved"
  }
  ```

---

### 5. Waiting Room TV Display Board
- **Endpoint:** `GET /api/queues/tv-board`
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "count": 6,
    "data": [
      {
        "doctor_id": 1,
        "dept_code": "CARD",
        "dept_name": "Cardiology",
        "room_number": "Room 201",
        "doctor_name": "Dr. Ramesh Sharma",
        "current_status": "IN_CONSULTATION",
        "now_serving_token": "CARD-102",
        "upcoming_tokens_list": "CARD-103, CARD-104, CARD-105"
      }
    ]
  }
  ```

---

### 6. Hospital Queue Analytics Summary
- **Endpoint:** `GET /api/analytics/summary`
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "data": {
      "kpis": {
        "total_tokens_today": 13,
        "total_completed": 1,
        "currently_waiting": 9,
        "in_consultation": 3,
        "avg_wait_time_mins": 12.0,
        "avg_consultation_duration_mins": 17.0,
        "sla_breaches": 0
      },
      "department_breakdown": [ ... ],
      "doctor_workload": [ ... ]
    }
  }
  ```
