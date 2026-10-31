const axios = require('axios');
require('dotenv').config();

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';

/**
 * Predicts patient waiting time using the intelligent Python microservice,
 * falling back to Little's Law formula if microservice is offline.
 */
async function estimateWaitingTime({
  queueLengthAhead = 0,
  avgConsultationTime = 15,
  emergencyAhead = 0,
  triagePriority = 1,
  doctorElapsedMins = 0,
  isAppointment = 0
}) {
  try {
    const response = await axios.post(`${AI_SERVICE_URL}/predict-wait-time`, {
      queue_length_ahead: queueLengthAhead,
      avg_consultation_time: avgConsultationTime,
      emergency_ahead: emergencyAhead,
      triage_priority: triagePriority,
      doctor_elapsed_mins: doctorElapsedMins,
      is_appointment: isAppointment
    }, { timeout: 2500 });

    return {
      success: true,
      provider: 'Python-FastAPI-RandomForest-Model',
      ...response.data
    };
  } catch (error) {
    // Little's Law Queuing Theory Fallback
    const remainingCurrent = Math.max(0, avgConsultationTime - doctorElapsedMins);
    const emergencyPenalty = emergencyAhead * 5;
    const priorityFactorMap = { 4: 0.25, 3: 0.60, 2: 0.85, 1: 1.0 };
    const priorityMultiplier = priorityFactorMap[triagePriority] || 1.0;

    let fallbackWait = (remainingCurrent + (queueLengthAhead * avgConsultationTime) + emergencyPenalty) * priorityMultiplier;
    fallbackWait = Math.max(2, Math.round(fallbackWait));

    return {
      success: true,
      provider: 'Littles-Law-Analytical-Fallback',
      estimated_wait_time_minutes: fallbackWait,
      confidence_interval: [Math.max(0, fallbackWait - 3), fallbackWait + 4],
      queue_congestion_level: fallbackWait > 45 ? 'CONGESTED' : (fallbackWait > 20 ? 'MODERATE' : 'LOW_WAIT'),
      littles_law_theoretical_wait: fallbackWait,
      ml_model_prediction: fallbackWait,
      hybrid_final_estimate: fallbackWait,
      feature_contributions: {
        queue_patients_ahead: queueLengthAhead,
        doctor_consult_rate_mins: avgConsultationTime,
        emergency_patients_ahead: emergencyAhead
      },
      fallback_active: true
    };
  }
}

module.exports = { estimateWaitingTime };
