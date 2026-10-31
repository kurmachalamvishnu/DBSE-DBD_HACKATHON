const express = require('express');
const router = express.Router();
const queueController = require('../controllers/queueController');

router.get('/live', queueController.getLiveMonitor);
router.get('/tv-board', queueController.getTVBoard);
router.post('/call-next', queueController.callNextPatient);
router.post('/start-consultation', queueController.startConsultation);
router.post('/complete', queueController.completeConsultation);
router.post('/skip', queueController.skipPatient);
router.post('/reassign', queueController.reassignQueue);

module.exports = router;
