const pool = require('../config/db');
const { estimateWaitingTime } = require('../services/waitingTimeService');
const { logQueueTelemetry } = require('../services/telemetryService');

// Issue a new token (Walk-in, Appointment Check-in, or Emergency Referral)
exports.issueToken = async (req, res) => {
  try {
    const {
      patient_id,
      doctor_id,
      source = 'WALK_IN',
      triage_level = 'ROUTINE',
      appointment_id = null
    } = req.body;

    if (!patient_id || !doctor_id) {
      return res.status(400).json({ success: false, message: 'patient_id and doctor_id are required' });
    }

    // 1. Gather queue parameters for the AI waiting time estimator
    const [doctorRows] = await pool.query(
      `SELECT d.*, dept.dept_code, dept.dept_name 
       FROM doctors d 
       JOIN departments dept ON d.dept_id = dept.dept_id 
       WHERE d.doctor_id = ?`,
      [doctor_id]
    );

    if (doctorRows.length === 0) {
      return res.status(404).json({ success: false, message: 'Doctor not found' });
    }
    const doctor = doctorRows[0];

    const [queueRows] = await pool.query(
      `SELECT 
         COUNT(*) AS queue_length,
         COUNT(CASE WHEN triage_level = 'EMERGENCY' THEN 1 END) AS emergency_count
       FROM queue_tokens 
       WHERE doctor_id = ? AND status = 'WAITING' AND token_date = CURRENT_DATE`,
      [doctor_id]
    );
    const queueLengthAhead = queueRows[0].queue_length || 0;
    const emergencyAhead = queueRows[0].emergency_count || 0;

    // Doctor elapsed time with current patient
    let doctorElapsedMins = 0;
    if (doctor.current_token_id) {
      const [currToken] = await pool.query(
        `SELECT consultation_start_at FROM queue_tokens WHERE token_id = ?`,
        [doctor.current_token_id]
      );
      if (currToken.length > 0 && currToken[0].consultation_start_at) {
        doctorElapsedMins = Math.max(0, Math.floor((new Date() - new Date(currToken[0].consultation_start_at)) / 60000));
      }
    }

    // Map triage level to numeric priority tier (1-4)
    const triageMap = { 'ROUTINE': 1, 'URGENT': 3, 'EMERGENCY': 4 };
    const priorityTier = triageMap[triage_level] || 1;

    // 2. Call Intelligent Python / Little's Law Waiting Time Estimator
    const waitPrediction = await estimateWaitingTime({
      queueLengthAhead,
      avgConsultationTime: doctor.avg_consultation_time,
      emergencyAhead,
      triagePriority: priorityTier,
      doctorElapsedMins,
      isAppointment: source === 'APPOINTMENT' ? 1 : 0
    });

    const estimatedWaitMins = Math.round(waitPrediction.estimated_wait_time_minutes || 15);

    // 3. Execute ACID Stored Procedure: sp_issue_token
    await pool.query(
      `CALL sp_issue_token(?, ?, ?, ?, ?, ?, @new_token_id, @new_token_num, @priority_score, @queue_pos)`,
      [patient_id, doctor_id, source, triage_level, appointment_id || null, estimatedWaitMins]
    );

    const [outParams] = await pool.query(
      `SELECT @new_token_id AS token_id, @new_token_num AS token_number, @priority_score AS priority_score, @queue_pos AS queue_position`
    );

    const tokenInfo = outParams[0];

    // Fetch complete record with patient & doctor info
    const [tokenRecord] = await pool.query(
      `SELECT t.*, p.full_name AS patient_name, p.uhid, p.phone, p.category,
              d.full_name AS doctor_name, d.room_number, dept.dept_name
       FROM queue_tokens t
       JOIN patients p ON t.patient_id = p.patient_id
       JOIN doctors d ON t.doctor_id = d.doctor_id
       JOIN departments dept ON t.dept_id = dept.dept_id
       WHERE t.token_id = ?`,
      [tokenInfo.token_id]
    );

    const fullToken = tokenRecord[0];

    // 4. Real-time WebSocket Broadcast
    const io = req.app.get('io');
    if (io) {
      io.emit('token:issued', fullToken);
      io.emit('queue:updated', { doctorId: doctor_id });
    }

    // 5. Distributed Telemetry Logging to MongoDB
    await logQueueTelemetry('TOKEN_ISSUED', {
      tokenId: tokenInfo.token_id,
      tokenNumber: tokenInfo.token_number,
      doctorId: doctor_id,
      patientId: patient_id,
      predictedWaitTime: estimatedWaitMins,
      provider: waitPrediction.provider
    });

    res.status(201).json({
      success: true,
      message: 'Token issued successfully',
      data: fullToken,
      prediction_details: waitPrediction
    });
  } catch (error) {
    console.error('Error issuing token:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Patient Self-Service Tracker Endpoint (Lookup by token number e.g. 'CARD-102' or phone)
exports.getTokenStatus = async (req, res) => {
  try {
    const { tokenNumber } = req.params;

    const [tokens] = await pool.query(
      `SELECT t.*, p.full_name AS patient_name, p.uhid, p.phone,
              d.full_name AS doctor_name, d.room_number, d.current_status AS doctor_status,
              dept.dept_name,
              curr_t.token_number AS doctor_now_serving_token
       FROM queue_tokens t
       JOIN patients p ON t.patient_id = p.patient_id
       JOIN doctors d ON t.doctor_id = d.doctor_id
       JOIN departments dept ON t.dept_id = dept.dept_id
       LEFT JOIN queue_tokens curr_t ON d.current_token_id = curr_t.token_id
       WHERE t.token_number = ? AND t.token_date = CURRENT_DATE`,
      [tokenNumber]
    );

    if (tokens.length === 0) {
      return res.status(404).json({ success: false, message: `Token ${tokenNumber} not found for today` });
    }

    const token = tokens[0];

    // Count how many patients are ahead of this patient in queue
    let patientsAhead = 0;
    if (token.status === 'WAITING') {
      const [aheadCount] = await pool.query(
        `SELECT COUNT(*) AS count_ahead 
         FROM queue_tokens 
         WHERE doctor_id = ? 
           AND status = 'WAITING' 
           AND token_date = CURRENT_DATE
           AND (priority_score > ? OR (priority_score = ? AND token_sequence < ?))`,
        [token.doctor_id, token.priority_score, token.priority_score, token.token_sequence]
      );
      patientsAhead = aheadCount[0].count_ahead;
    }

    res.json({
      success: true,
      data: {
        ...token,
        patients_ahead: patientsAhead,
        current_time: new Date().toISOString()
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get all tokens with date & status filters
exports.getAllTokens = async (req, res) => {
  try {
    const { date = new Date().toISOString().split('T')[0], doctor_id, status } = req.query;
    let query = `
      SELECT t.*, p.full_name AS patient_name, p.phone, p.uhid,
             d.full_name AS doctor_name, d.room_number, dept.dept_name
      FROM queue_tokens t
      JOIN patients p ON t.patient_id = p.patient_id
      JOIN doctors d ON t.doctor_id = d.doctor_id
      JOIN departments dept ON t.dept_id = dept.dept_id
      WHERE t.token_date = ?
    `;
    const params = [date];

    if (doctor_id) {
      query += ` AND t.doctor_id = ?`;
      params.push(doctor_id);
    }
    if (status) {
      query += ` AND t.status = ?`;
      params.push(status);
    }

    query += ` ORDER BY t.issued_at DESC`;
    const [rows] = await pool.query(query, params);
    res.json({ success: true, count: rows.length, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
