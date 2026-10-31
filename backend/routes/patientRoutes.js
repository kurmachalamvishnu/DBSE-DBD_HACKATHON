const express = require('express');
const router = express.Router();
const patientController = require('../controllers/patientController');

router.post('/login', patientController.loginPatient);
router.get('/demo-accounts', patientController.getDemoPatients);
router.get('/profile/:id', patientController.getPatientProfile);
router.get('/', patientController.getAllPatients);
router.get('/:id', patientController.getPatientById);
router.post('/', patientController.registerPatient);

module.exports = router;
