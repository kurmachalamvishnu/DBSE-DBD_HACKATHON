const express = require('express');
const router = express.Router();
const doctorController = require('../controllers/doctorController');

router.get('/', doctorController.getAllDoctors);
router.get('/:id', doctorController.getDoctorById);
router.put('/:id/status', doctorController.updateDoctorStatus);
router.get('/:id/queue', doctorController.getDoctorQueue);

module.exports = router;
