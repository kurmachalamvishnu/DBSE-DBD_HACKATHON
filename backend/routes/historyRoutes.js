const express = require('express');
const router = express.Router();
const historyController = require('../controllers/historyController');

router.get('/', historyController.getQueueHistory);
router.get('/export-csv', historyController.exportCSV);

module.exports = router;
