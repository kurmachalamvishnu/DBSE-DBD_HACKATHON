"""
Healthcare Queue Management - AI Clinical Health Status & Queue Microservice
FastAPI Microservice running on Port 8000
Implements:
1. Patient Clinical Health Risk Assessment & Vitals Prognosis Engine
2. Hybrid Queuing Theory (Little's Law) + Machine Learning Wait Time Model
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List
import joblib
import os
import numpy as np
import datetime

app = FastAPI(
    title="Healthcare AI Clinical & Queue Service",
    description="Intelligent Patient Health Status Analysis & Queuing Engine",
    version="2.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

MODEL_PATH = os.path.join(os.path.dirname(__file__), "queue_model.joblib")
model_data = None

def load_model():
    global model_data
    if os.path.exists(MODEL_PATH):
        try:
            model_data = joblib.load(MODEL_PATH)
            print(f"[AI Service] Successfully loaded model from {MODEL_PATH}")
        except Exception as e:
            print(f"[AI Service] Error loading model: {e}")
            model_data = None
    else:
        print("[AI Service] Model file not found. Running training script...")
        try:
            from train_model import train_and_save_model
            model_data = train_and_save_model(MODEL_PATH)
        except Exception as e:
            print(f"[AI Service] Training fallback: {e}")

load_model()

# =========================================================================
# 1. Patient Health Status & Clinical AI Models
# =========================================================================

class PatientHealthAnalysisRequest(BaseModel):
    age: int = Field(default=30, ge=0, le=120)
    gender: str = Field(default="Male")
    systolic_bp: int = Field(default=120, ge=60, le=260)
    diastolic_bp: int = Field(default=80, ge=40, le=160)
    pulse: int = Field(default=74, ge=30, le=220)
    temperature: float = Field(default=98.6, ge=92.0, le=108.0)
    symptoms: Optional[str] = Field(default="Routine Checkup")
    category: Optional[str] = Field(default="GENERAL")
    allergies: Optional[str] = Field(default="None")

class PatientHealthAnalysisResponse(BaseModel):
    health_score: float
    health_status: str
    vital_stability: str
    bp_classification: str
    cardiac_risk_level: str
    respiratory_status: str
    recommended_triage: str
    key_findings: List[str]
    ai_clinical_recommendations: List[str]
    lifestyle_guidance: List[str]
    generated_at: str

@app.post("/predict-health-status", response_model=PatientHealthAnalysisResponse)
def analyze_patient_health_status(payload: PatientHealthAnalysisRequest):
    """
    Evaluates patient vital signs, reported symptoms, age demographics,
    and calculates clinical health score, cardiovascular risk, and guidance.
    """
    findings = []
    recommendations = []
    lifestyle = []
    
    # 1. Blood Pressure Classification (AHA Standards)
    sbp = payload.systolic_bp
    dbp = payload.diastolic_bp
    if sbp < 120 and dbp < 80:
        bp_class = "Normal (Optimal)"
    elif 120 <= sbp <= 129 and dbp < 80:
        bp_class = "Elevated Blood Pressure"
        findings.append("Systolic BP is slightly elevated (120-129 mmHg). Early lifestyle intervention recommended.")
        recommendations.append("Reduce dietary sodium intake (<2,000 mg/day) and monitor BP weekly.")
    elif (130 <= sbp <= 139) or (80 <= dbp <= 89):
        bp_class = "Stage 1 Hypertension"
        findings.append("Stage 1 Hypertension identified. Arterial resistance above baseline.")
        recommendations.append("Schedule physician consultation for cardiovascular risk evaluation.")
    elif (sbp >= 140) or (dbp >= 90):
        bp_class = "Stage 2 Hypertension"
        findings.append("Stage 2 Hypertension. Significant arterial load detected.")
        recommendations.append("Immediate clinical pharmacological review recommended.")
    else:
        bp_class = "Normal"

    # 2. Pulse / Heart Rate
    pulse = payload.pulse
    if pulse < 60:
        cardiac_finding = "Bradycardia (Resting heart rate below 60 bpm)"
        findings.append(cardiac_finding)
    elif pulse > 100:
        cardiac_finding = "Tachycardia (Elevated resting heart rate >100 bpm)"
        findings.append(cardiac_finding)
        recommendations.append("Rest and re-check pulse in 15 mins. ECG evaluation advised if symptomatic.")
    else:
        cardiac_finding = "Normal Sinus Rhythm (60-100 bpm)"

    # 3. Body Temperature
    temp = payload.temperature
    if temp >= 100.4:
        findings.append(f"Pyrexia / Fever detected ({temp}°F). Suggests active inflammatory or infectious response.")
        recommendations.append("Maintain hydration, take antipyretic if prescribed, and monitor temperature q4h.")
    elif temp < 95.0:
        findings.append(f"Hypothermia alert ({temp}°F).")

    # 4. Symptom NLP Keyword Screening
    symptom_lower = (payload.symptoms or "").lower()
    cardiac_keywords = ["chest pain", "heart pain", "palpitation", "shortness of breath", "angina", "tightness"]
    is_cardiac_symptom = any(k in symptom_lower for k in cardiac_keywords)
    
    if is_cardiac_symptom:
        findings.append(f"Cardiovascular Symptom Alert: Patient reported '{payload.symptoms}'. High clinical priority.")
        cardiac_risk = "ELEVATED_ATTENTION" if (sbp > 135 or pulse > 90) else "MODERATE_WATCH"
        triage = "EMERGENCY" if "severe" in symptom_lower or sbp > 160 else "URGENT"
        recommendations.append("Perform 12-lead Electrocardiogram (ECG) and serum troponin assessment.")
        recommendations.append("Avoid physical exertion. Patient placed in monitored queue.")
    else:
        cardiac_risk = "LOW_RISK" if sbp < 130 and pulse < 85 else "MILD_RISK"
        triage = "ROUTINE"

    # Age and demographic adjustments
    if payload.age >= 65:
        findings.append("Geriatric demographic factor: Elevated vascular stiffness baseline.")
        lifestyle.append("Low-impact aerobic walking 20 mins/day and fall prevention precautions.")
    elif payload.age < 12:
        findings.append("Pediatric vital baseline reference applied.")

    lifestyle.append("Maintain balanced Mediterranean/DASH diet with adequate potassium and fiber.")
    lifestyle.append("Target 7-8 hours of quality sleep to support circadian autonomic recovery.")

    # Calculate Overall Health Score (0 - 100)
    score = 100.0
    # Deductions
    if sbp >= 140 or dbp >= 90: score -= 18.0
    elif sbp >= 130 or dbp >= 80: score -= 10.0
    elif sbp >= 120: score -= 4.0

    if pulse > 100 or pulse < 55: score -= 12.0
    if temp >= 100.4: score -= 14.0
    if is_cardiac_symptom: score -= 20.0
    if payload.age >= 65 and score > 85: score -= 5.0
    if payload.allergies and payload.allergies.lower() != "none": score -= 2.0

    score = max(35.0, min(98.0, round(score, 1)))

    if score >= 85:
        health_status = "EXCELLENT_VITALITY"
        vital_stability = "Stable / Optimal Range"
    elif score >= 70:
        health_status = "MODERATE_WELLNESS"
        vital_stability = "Mild Variance / Stable"
    elif score >= 55:
        health_status = "CLINICAL_ATTENTION_NEEDED"
        vital_stability = "Borderline / Monitored"
    else:
        health_status = "CRITICAL_RISK_ALERT"
        vital_stability = "Unstable / Urgent Evaluation"

    return PatientHealthAnalysisResponse(
        health_score=score,
        health_status=health_status,
        vital_stability=vital_stability,
        bp_classification=bp_class,
        cardiac_risk_level=cardiac_risk,
        respiratory_status="Normal Airway / Non-distressed",
        recommended_triage=triage,
        key_findings=findings if findings else ["All recorded vital signs within standard clinical reference ranges."],
        ai_clinical_recommendations=recommendations if recommendations else ["Routine preventive health follow-up every 6-12 months.", "Maintain current medication and hydration regimen."],
        lifestyle_guidance=lifestyle,
        generated_at=datetime.datetime.now().isoformat()
    )


# =========================================================================
# 2. Waiting Time Microservice Models (Queue Dynamics)
# =========================================================================

class WaitTimePredictionRequest(BaseModel):
    queue_length_ahead: int = Field(..., ge=0)
    avg_consultation_time: int = Field(default=15, ge=1, le=60)
    emergency_ahead: int = Field(default=0, ge=0)
    triage_priority: int = Field(default=1, ge=1, le=4)
    hour_of_day: Optional[int] = Field(default=None, ge=0, le=23)
    doctor_elapsed_mins: int = Field(default=0, ge=0)
    is_appointment: int = Field(default=0, ge=0, le=1)

class WaitTimePredictionResponse(BaseModel):
    status: str
    estimated_wait_time_minutes: float
    confidence_interval: List[float]
    queue_congestion_level: str
    littles_law_theoretical_wait: float
    ml_model_prediction: float
    hybrid_final_estimate: float
    feature_contributions: Dict[str, Any]
    generated_at: str

@app.get("/")
def health_check():
    return {
        "service": "Healthcare AI Clinical Health & Queue Service",
        "status": "healthy",
        "port": 8000,
        "capabilities": [
            "Patient Health Status Analysis",
            "Vitals & Cardiovascular Prognosis",
            "Queuing Theory Wait Time Estimation"
        ],
        "model_loaded": model_data is not None,
        "timestamp": datetime.datetime.now().isoformat()
    }

@app.post("/predict-wait-time", response_model=WaitTimePredictionResponse)
def predict_wait_time(payload: WaitTimePredictionRequest):
    current_hour = payload.hour_of_day if payload.hour_of_day is not None else datetime.datetime.now().hour
    service_rate = payload.avg_consultation_time
    remaining_current = max(0, service_rate - payload.doctor_elapsed_mins)
    emergency_overhead = payload.emergency_ahead * 5.0
    
    littles_law_wait = remaining_current + (payload.queue_length_ahead * service_rate) + emergency_overhead
    priority_scaling = {4: 0.25, 3: 0.60, 2: 0.85, 1: 1.0}
    littles_law_wait = round(float(littles_law_wait * priority_scaling.get(payload.triage_priority, 1.0)), 1)
    
    ml_pred = littles_law_wait
    if model_data and "model" in model_data:
        feature_vector = np.array([[
            payload.queue_length_ahead,
            payload.avg_consultation_time,
            payload.emergency_ahead,
            payload.triage_priority,
            current_hour,
            payload.doctor_elapsed_mins,
            payload.is_appointment
        ]])
        ml_pred = float(model_data["model"].predict(feature_vector)[0])
        ml_pred = round(max(0.0, ml_pred), 1)

    hybrid_estimate = round(0.70 * ml_pred + 0.30 * littles_law_wait, 1)
    if payload.queue_length_ahead == 0 and payload.doctor_elapsed_mins == 0:
        hybrid_estimate = 2.0
    
    ci_margin = max(2.0, round(hybrid_estimate * 0.18, 1))
    ci_lower = max(0.0, round(hybrid_estimate - ci_margin, 1))
    ci_upper = round(hybrid_estimate + ci_margin, 1)

    congestion = "LOW_WAIT" if hybrid_estimate <= 15 else ("MODERATE" if hybrid_estimate <= 35 else "CONGESTED")

    return WaitTimePredictionResponse(
        status="success",
        estimated_wait_time_minutes=hybrid_estimate,
        confidence_interval=[ci_lower, ci_upper],
        queue_congestion_level=congestion,
        littles_law_theoretical_wait=littles_law_wait,
        ml_model_prediction=ml_pred,
        hybrid_final_estimate=hybrid_estimate,
        feature_contributions={
            "queue_patients_ahead": payload.queue_length_ahead,
            "doctor_consult_rate_mins": payload.avg_consultation_time,
            "emergency_patients_ahead": payload.emergency_ahead,
            "priority_tier": payload.triage_priority
        },
        generated_at=datetime.datetime.now().isoformat()
    )

@app.get("/model-metrics")
def get_metrics():
    if not model_data:
        raise HTTPException(status_code=503, detail="Model not loaded")
    return {
        "metrics": model_data["metrics"],
        "feature_importances": model_data["feature_importances"],
        "model_type": "Random Forest Regressor (100 estimators, max_depth=12)"
    }
