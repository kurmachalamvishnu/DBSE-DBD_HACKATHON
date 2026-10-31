const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analyticsController');

// Patient Health Status & Clinical AI Routes
router.get('/patient-health', analyticsController.getPatientHealthAnalytics);
router.post('/patient-health-ai', analyticsController.evaluatePatientHealthAI);

// Hospital Operations & Telemetry
router.get('/summary', analyticsController.getSummary);
router.get('/hourly', analyticsController.getHourlyThroughput);
router.get('/prediction-accuracy', analyticsController.getPredictionAccuracy);

module.exports = router;
