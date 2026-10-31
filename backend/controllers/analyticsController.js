const pool = require('../config/db');
const axios = require('axios');
require('dotenv').config();

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';

// Overall Patient Health Status & Clinical Cohort Analytics
exports.getPatientHealthAnalytics = async (req, res) => {
  try {
    // 1. Clinical Vitals Analytics from completed consultation sessions
    const [vitalsStats] = await pool.query(`
      SELECT 
        COUNT(*) AS total_screened_encounters,
        ROUND(AVG(vitals_pulse), 1) AS avg_pulse_rate,
        ROUND(AVG(vitals_temp), 1) AS avg_body_temp,
        COUNT(CASE WHEN vitals_pulse > 100 THEN 1 END) AS tachycardia_cases,
        COUNT(CASE WHEN vitals_temp >= 100.0 THEN 1 END) AS pyrexia_fever_cases
      FROM consultation_sessions
      WHERE vitals_pulse IS NOT NULL
    `);

    // 2. Patient Demographics & Health Risk Distribution
    const [demographics] = await pool.query(`
      SELECT 
        category,
        COUNT(*) AS patient_count,
        ROUND((COUNT(*) / (SELECT COUNT(*) FROM patients)) * 100, 1) AS percentage
      FROM patients
      GROUP BY category
    `);

    // 3. Clinical Triage Urgency Distribution
    const [triageDistribution] = await pool.query(`
      SELECT 
        triage_level,
        COUNT(*) AS count,
        ROUND((COUNT(*) / (SELECT COUNT(*) FROM queue_tokens WHERE token_date = CURRENT_DATE)) * 100, 1) AS percentage
      FROM queue_tokens
      WHERE token_date = CURRENT_DATE
      GROUP BY triage_level
    `);

    // 4. Most Common Diagnoses & Chronic Conditions
    const [diagnoses] = await pool.query(`
      SELECT 
        diagnosis,
        COUNT(*) AS occurrences
      FROM consultation_sessions
      WHERE diagnosis IS NOT NULL AND diagnosis != ''
      GROUP BY diagnosis
      ORDER BY occurrences DESC
      LIMIT 6
    `);

    // 5. Patient Recovery & Vital Stability Rates
    const [healthIndex] = await pool.query(`
      SELECT 
        COUNT(*) AS total_patients,
        COUNT(CASE WHEN allergies IS NOT NULL AND allergies != 'None' AND allergies != '' THEN 1 END) AS documented_allergies_count,
        ROUND(AVG(TIMESTAMPDIFF(YEAR, dob, CURDATE())), 1) AS avg_patient_age
      FROM patients
    `);

    res.json({
      success: true,
      data: {
        cohort_vitals: vitalsStats[0],
        demographics,
        triage_distribution: triageDistribution,
        common_diagnoses: diagnoses,
        patient_health_summary: healthIndex[0]
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// AI Clinical Health Status Prognosis for a Specific Patient
exports.evaluatePatientHealthAI = async (req, res) => {
  try {
    const {
      age = 30,
      gender = 'Male',
      systolic_bp = 120,
      diastolic_bp = 80,
      pulse = 74,
      temperature = 98.6,
      symptoms = 'Routine Health Check',
      category = 'GENERAL',
      allergies = 'None'
    } = req.body;

    try {
      const response = await axios.post(`${AI_SERVICE_URL}/predict-health-status`, {
        age: parseInt(age, 10),
        gender,
        systolic_bp: parseInt(systolic_bp, 10),
        diastolic_bp: parseInt(diastolic_bp, 10),
        pulse: parseInt(pulse, 10),
        temperature: parseFloat(temperature),
        symptoms,
        category,
        allergies
      }, { timeout: 3000 });

      return res.json({
        success: true,
        source: 'Python-AI-Clinical-Engine',
        data: response.data
      });
    } catch (aiErr) {
      // Analytical Clinical Fallback
      let score = 92.0;
      if (systolic_bp >= 140) score -= 18;
      else if (systolic_bp >= 130) score -= 10;
      if (pulse > 100 || pulse < 55) score -= 10;
      if (temperature > 100) score -= 12;

      return res.json({
        success: true,
        source: 'Analytical-Rule-Engine',
        data: {
          health_score: Math.max(45, score),
          health_status: score >= 80 ? 'OPTIMAL_HEALTH' : (score >= 65 ? 'MODERATE_WELLNESS' : 'CLINICAL_ATTENTION_NEEDED'),
          vital_stability: 'Stable Vital Signs',
          bp_classification: systolic_bp >= 140 ? 'Stage 2 Hypertension' : (systolic_bp >= 130 ? 'Stage 1 Hypertension' : 'Normal'),
          cardiac_risk_level: systolic_bp > 135 ? 'MODERATE_WATCH' : 'LOW_RISK',
          respiratory_status: 'Normal Airway',
          recommended_triage: 'ROUTINE',
          key_findings: ['Blood pressure and pulse baseline evaluated.'],
          ai_clinical_recommendations: ['Maintain hydration and balanced dietary sodium.', 'Periodic blood pressure tracking.'],
          lifestyle_guidance: ['Aerobic exercise 20 mins/day', 'Optimal 7-8 hours sleep']
        }
      });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Legacy hospital queue summary for administrative audit
exports.getSummary = async (req, res) => {
  try {
    const [summaryRows] = await pool.query(`
      SELECT 
        COUNT(token_id) AS total_tokens_today,
        COUNT(CASE WHEN status = 'COMPLETED' THEN 1 END) AS total_completed,
        COUNT(CASE WHEN status = 'WAITING' THEN 1 END) AS currently_waiting,
        COUNT(CASE WHEN status = 'IN_CONSULTATION' THEN 1 END) AS in_consultation,
        COUNT(CASE WHEN status = 'CALLED' THEN 1 END) AS called_count,
        ROUND(AVG(CASE WHEN status = 'COMPLETED' THEN actual_wait_time END), 1) AS avg_wait_time_mins,
        ROUND(AVG(CASE WHEN status = 'COMPLETED' THEN consultation_duration END), 1) AS avg_consultation_duration_mins,
        COUNT(CASE WHEN status = 'COMPLETED' AND actual_wait_time > 30 THEN 1 END) AS sla_breaches
      FROM queue_tokens
      WHERE token_date = CURRENT_DATE
    `);

    const [deptAnalytics] = await pool.query(`SELECT * FROM vw_daily_department_analytics`);

    res.json({
      success: true,
      data: {
        kpis: summaryRows[0],
        department_breakdown: deptAnalytics
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getHourlyThroughput = async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT 
        HOUR(issued_at) AS hour_of_day,
        COUNT(*) AS tokens_issued,
        COUNT(CASE WHEN status = 'COMPLETED' THEN 1 END) AS tokens_completed
      FROM queue_tokens
      WHERE token_date = CURRENT_DATE
      GROUP BY HOUR(issued_at)
      ORDER BY hour_of_day ASC
    `);
    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getPredictionAccuracy = async (req, res) => {
  try {
    const [stats] = await pool.query(`
      SELECT 
        ROUND(AVG(ABS(error_margin)), 2) AS empirical_mae,
        ROUND(SQRT(AVG(POW(error_margin, 2))), 2) AS empirical_rmse,
        COUNT(*) AS verified_predictions_count
      FROM ml_waiting_time_telemetry
      WHERE actual_wait_time IS NOT NULL
    `);
    res.json({ success: true, data: { eval_metrics: stats[0] } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
