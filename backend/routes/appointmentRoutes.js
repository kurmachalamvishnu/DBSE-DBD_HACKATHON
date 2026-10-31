const express = require('express');
const router = express.Router();
const appointmentController = require('../controllers/appointmentController');

router.get('/', appointmentController.getAppointments);
router.get('/slots', appointmentController.getAvailableSlots);
router.post('/', appointmentController.bookAppointment);
router.put('/:id/cancel', appointmentController.cancelAppointment);
router.post('/:id/checkin', appointmentController.checkInAppointment);

module.exports = router;
