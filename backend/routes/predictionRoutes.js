const express = require('express');
const router = express.Router();
const predictionController = require('../controllers/predictionController');

router.post('/estimate', predictionController.predictWaitTime);
router.get('/metrics', predictionController.getModelMetrics);

module.exports = router;
