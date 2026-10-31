const { estimateWaitingTime } = require('../services/waitingTimeService');
const axios = require('axios');
require('dotenv').config();

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';

exports.predictWaitTime = async (req, res) => {
  try {
    const prediction = await estimateWaitingTime(req.body);
    res.json(prediction);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getModelMetrics = async (req, res) => {
  try {
    const response = await axios.get(`${AI_SERVICE_URL}/model-metrics`, { timeout: 3000 });
    res.json({ success: true, data: response.data });
  } catch (error) {
    // Return cached/analytical specs if Python microservice is offline
    res.json({
      success: true,
      data: {
        metrics: { mae: 5.07, rmse: 6.86, r2: 0.9897 },
        feature_importances: {
          queue_length_ahead: 0.6478,
          triage_priority: 0.1905,
          avg_consultation_time: 0.1414,
          doctor_elapsed_mins: 0.0073,
          hour_of_day: 0.0064,
          emergency_ahead: 0.0062,
          is_appointment: 0.0004
        },
        model_type: 'Random Forest Regressor (100 estimators, max_depth=12)',
        status: 'Offline cached specs'
      }
    });
  }
};
