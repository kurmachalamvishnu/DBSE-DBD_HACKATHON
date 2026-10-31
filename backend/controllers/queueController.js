const pool = require('../config/db');
const { logQueueTelemetry } = require('../services/telemetryService');

// Get live monitor of all doctor queues
exports.getLiveMonitor = async (req, res) => {
  try {
    const [rows] = await pool.query(`SELECT * FROM vw_live_queue_monitor ORDER BY dept_code ASC, room_number ASC`);
    res.json({ success: true, count: rows.length, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get waiting room TV display board data
exports.getTVBoard = async (req, res) => {
  try {
    const [rows] = await pool.query(`SELECT * FROM vw_tv_display_board`);
    res.json({ success: true, count: rows.length, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Call next patient for doctor (advances queue atomically)
exports.callNextPatient = async (req, res) => {
  try {
    const { doctor_id } = req.body;
    if (!doctor_id) {
      return res.status(400).json({ success: false, message: 'doctor_id is required' });
    }

    // Call ACID Stored Procedure
    await pool.query(
      `CALL sp_call_next_patient(?, @called_id, @called_num, @patient_name, @status_msg)`,
      [doctor_id]
    );

    const [outParams] = await pool.query(
      `SELECT @called_id AS token_id, @called_num AS token_number, @patient_name AS patient_name, @status_msg AS message`
    );

    const result = outParams[0];

    if (!result.token_id) {
      return res.json({
        success: true,
        message: 'No patients currently waiting in queue',
        data: null
      });
    }

    // Retrieve doctor & room information for announcement
    const [doctorInfo] = await pool.query(
      `SELECT d.full_name AS doctor_name, d.room_number, dept.dept_name 
       FROM doctors d 
       JOIN departments dept ON d.dept_id = dept.dept_id 
       WHERE d.doctor_id = ?`,
      [doctor_id]
    );

    const callPayload = {
      tokenId: result.token_id,
      tokenNumber: result.token_number,
      patientName: result.patient_name,
      doctorId: doctor_id,
      doctorName: doctorInfo[0].doctor_name,
      roomNumber: doctorInfo[0].room_number,
      department: doctorInfo[0].dept_name,
      calledAt: new Date().toISOString()
    };

    // Broadcast Real-Time Calling Event to TV Displays & Consoles
    const io = req.app.get('io');
    if (io) {
      io.emit('token:called', callPayload);
      io.emit('queue:updated', { doctorId: doctor_id });
    }

    // Distributed Telemetry
    await logQueueTelemetry('TOKEN_CALLED', callPayload);

    res.json({
      success: true,
      message: result.message,
      data: callPayload
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Start Consultation (Patient has walked into doctor's room)
exports.startConsultation = async (req, res) => {
  try {
    const { token_id } = req.body;
    if (!token_id) {
      return res.status(400).json({ success: false, message: 'token_id is required' });
    }

    await pool.query(`CALL sp_start_consultation(?)`, [token_id]);

    const io = req.app.get('io');
    if (io) {
      io.emit('queue:updated', { tokenId: token_id, status: 'IN_CONSULTATION' });
    }

    res.json({ success: true, message: 'Consultation marked as started' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Complete Consultation & save clinical notes
exports.completeConsultation = async (req, res) => {
  try {
    const {
      token_id,
      vitals_bp = null,
      vitals_pulse = null,
      vitals_temp = null,
      symptoms = '',
      diagnosis = '',
      prescription_notes = '',
      follow_up_date = null
    } = req.body;

    if (!token_id) {
      return res.status(400).json({ success: false, message: 'token_id is required' });
    }

    await pool.query(
      `CALL sp_complete_consultation(?, ?, ?, ?, ?, ?, ?, ?)`,
      [token_id, vitals_bp, vitals_pulse, vitals_temp, symptoms, diagnosis, prescription_notes, follow_up_date || null]
    );

    const io = req.app.get('io');
    if (io) {
      io.emit('token:completed', { tokenId: token_id });
      io.emit('queue:updated', { tokenId: token_id });
    }

    res.json({ success: true, message: 'Consultation successfully completed and clinical notes saved' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Skip / No-show patient
exports.skipPatient = async (req, res) => {
  try {
    const { token_id, reason = 'No show / Did not respond' } = req.body;
    if (!token_id) {
      return res.status(400).json({ success: false, message: 'token_id is required' });
    }

    await pool.query(`CALL sp_skip_patient(?, ?)`, [token_id, reason]);

    const io = req.app.get('io');
    if (io) {
      io.emit('token:skipped', { tokenId: token_id, reason });
      io.emit('queue:updated', { tokenId: token_id });
    }

    res.json({ success: true, message: 'Patient skipped and queue adjusted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Reassign waiting queue from one doctor to another doctor
exports.reassignQueue = async (req, res) => {
  try {
    const { from_doctor_id, to_doctor_id } = req.body;
    if (!from_doctor_id || !to_doctor_id) {
      return res.status(400).json({ success: false, message: 'from_doctor_id and to_doctor_id are required' });
    }

    await pool.query(`CALL sp_reassign_queue(?, ?, @transferred_count)`, [from_doctor_id, to_doctor_id]);
    const [outParams] = await pool.query(`SELECT @transferred_count AS transferred_count`);

    const io = req.app.get('io');
    if (io) {
      io.emit('queue:reassigned', { fromDoctorId: from_doctor_id, toDoctorId: to_doctor_id });
      io.emit('queue:updated', {});
    }

    res.json({
      success: true,
      message: `Successfully transferred ${outParams[0].transferred_count} patients to new doctor queue`,
      data: outParams[0]
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
