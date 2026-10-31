const pool = require('../config/db');
const { estimateWaitingTime } = require('../services/waitingTimeService');
const { logQueueTelemetry } = require('../services/telemetryService');

// List appointments with optional date, doctor, or patient filter
exports.getAppointments = async (req, res) => {
  try {
    const { date, doctor_id, patient_id } = req.query;
    let query = `
      SELECT a.*, p.full_name AS patient_name, p.phone, p.uhid, p.category,
             d.full_name AS doctor_name, d.room_number, dept.dept_name, dept.dept_code
      FROM appointments a
      JOIN patients p ON a.patient_id = p.patient_id
      JOIN doctors d ON a.doctor_id = d.doctor_id
      JOIN departments dept ON d.dept_id = dept.dept_id
      WHERE 1=1
    `;
    const params = [];

    if (date) {
      query += ` AND a.scheduled_date = ?`;
      params.push(date);
    }
    if (doctor_id) {
      query += ` AND a.doctor_id = ?`;
      params.push(doctor_id);
    }
    if (patient_id) {
      query += ` AND a.patient_id = ?`;
      params.push(patient_id);
    }

    query += ` ORDER BY a.scheduled_date DESC, a.time_slot ASC`;
    const [rows] = await pool.query(query, params);
    res.json({ success: true, count: rows.length, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get available appointment time slots for a doctor on a specific date
exports.getAvailableSlots = async (req, res) => {
  try {
    const { doctor_id, date } = req.query;

    if (!doctor_id || !date) {
      return res.status(400).json({ success: false, message: 'doctor_id and date are required' });
    }

    // Default daily consultation slots from 09:00 AM to 05:00 PM
    const allSlots = [
      '09:00:00', '09:30:00', '10:00:00', '10:30:00', '11:00:00', '11:30:00',
      '14:00:00', '14:30:00', '15:00:00', '15:30:00', '16:00:00', '16:30:00'
    ];

    // Query booked slots for this doctor on this date
    const [bookedRows] = await pool.query(
      `SELECT time_slot FROM appointments 
       WHERE doctor_id = ? AND scheduled_date = ? AND status NOT IN ('CANCELLED')`,
      [doctor_id, date]
    );

    const bookedTimes = new Set(bookedRows.map(r => r.time_slot.substring(0, 8)));

    const slots = allSlots.map(time => {
      const isBooked = bookedTimes.has(time);
      // Format 24hr to 12hr e.g. "09:00 AM"
      const [h, m] = time.split(':');
      const hour = parseInt(h, 10);
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const formattedHour = hour % 12 || 12;
      const display = `${String(formattedHour).padStart(2, '0')}:${m} ${ampm}`;

      return {
        time_slot: time,
        display_time: display,
        is_available: !isBooked
      };
    });

    res.json({
      success: true,
      doctor_id: parseInt(doctor_id, 10),
      date,
      slots
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Book a new appointment
exports.bookAppointment = async (req, res) => {
  try {
    let { patient_id, uhid, doctor_id, scheduled_date, time_slot, reason_for_visit } = req.body;

    if (!patient_id || !doctor_id || !scheduled_date || !time_slot) {
      return res.status(400).json({ success: false, message: 'Missing required appointment fields: patient_id, doctor_id, scheduled_date, time_slot' });
    }

    // Check if patient exists; if not found by patient_id, try resolving by UHID
    const [patientCheck] = await pool.query(`SELECT patient_id FROM patients WHERE patient_id = ?`, [patient_id]);
    if (patientCheck.length === 0) {
      if (uhid) {
        const [uhidCheck] = await pool.query(`SELECT patient_id FROM patients WHERE uhid = ?`, [uhid]);
        if (uhidCheck.length > 0) {
          patient_id = uhidCheck[0].patient_id;
        } else {
          return res.status(404).json({ success: false, message: 'Patient account not found in database. Please log in again.' });
        }
      } else {
        return res.status(404).json({ success: false, message: 'Patient account not found in database. Please log in again.' });
      }
    }

    // Check for double booking conflict
    const [conflict] = await pool.query(
      `SELECT * FROM appointments 
       WHERE doctor_id = ? AND scheduled_date = ? AND time_slot = ? AND status != 'CANCELLED'`,
      [doctor_id, scheduled_date, time_slot]
    );

    if (conflict.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'This time slot is already booked for this doctor. Please select another slot.'
      });
    }

    // Generate unique Appointment Reference: APT-YYYYMMDD-XXX
    const appointmentNumber = `APT-${scheduled_date.replace(/-/g, '')}-${Math.floor(100 + Math.random() * 900)}`;

    const [result] = await pool.query(
      `INSERT INTO appointments (appointment_number, patient_id, doctor_id, scheduled_date, time_slot, status, reason_for_visit)
       VALUES (?, ?, ?, ?, ?, 'SCHEDULED', ?)`,
      [appointmentNumber, patient_id, doctor_id, scheduled_date, time_slot, reason_for_visit || 'Routine Consultation']
    );

    // Fetch full created appointment with doctor & department details
    const [created] = await pool.query(
      `SELECT a.*, p.full_name AS patient_name, p.uhid, p.phone,
              d.full_name AS doctor_name, d.room_number, dept.dept_name, dept.dept_code
       FROM appointments a
       JOIN patients p ON a.patient_id = p.patient_id
       JOIN doctors d ON a.doctor_id = d.doctor_id
       JOIN departments dept ON d.dept_id = dept.dept_id
       WHERE a.appointment_id = ?`,
      [result.insertId]
    );

    res.status(201).json({
      success: true,
      message: 'Appointment booked successfully!',
      data: created[0]
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Cancel an appointment
exports.cancelAppointment = async (req, res) => {
  try {
    const { id } = req.params;

    const [apt] = await pool.query(`SELECT * FROM appointments WHERE appointment_id = ?`, [id]);
    if (apt.length === 0) {
      return res.status(404).json({ success: false, message: 'Appointment not found' });
    }

    await pool.query(`UPDATE appointments SET status = 'CANCELLED' WHERE appointment_id = ?`, [id]);

    res.json({
      success: true,
      message: 'Appointment cancelled successfully'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Patient Self Check-in from personal dashboard (Issues Queue Token)
exports.checkInAppointment = async (req, res) => {
  try {
    const { id } = req.params;

    const [appointments] = await pool.query(
      `SELECT a.*, p.category, d.avg_consultation_time, d.current_token_id 
       FROM appointments a
       JOIN patients p ON a.patient_id = p.patient_id
       JOIN doctors d ON a.doctor_id = d.doctor_id
       WHERE a.appointment_id = ?`,
      [id]
    );

    if (appointments.length === 0) {
      return res.status(404).json({ success: false, message: 'Appointment not found' });
    }

    const apt = appointments[0];

    if (apt.status === 'CHECKED_IN') {
      return res.status(400).json({ success: false, message: 'Appointment is already checked in.' });
    }

    // 1. Gather queue parameters for the AI waiting time estimator
    const [queueRows] = await pool.query(
      `SELECT 
         COUNT(*) AS queue_length,
         COUNT(CASE WHEN triage_level = 'EMERGENCY' THEN 1 END) AS emergency_count
       FROM queue_tokens 
       WHERE doctor_id = ? AND status = 'WAITING' AND token_date = CURRENT_DATE`,
      [apt.doctor_id]
    );
    const queueLengthAhead = queueRows[0].queue_length || 0;
    const emergencyAhead = queueRows[0].emergency_count || 0;

    // Doctor elapsed time with current patient
    let doctorElapsedMins = 0;
    if (apt.current_token_id) {
      const [currToken] = await pool.query(
        `SELECT consultation_start_at FROM queue_tokens WHERE token_id = ?`,
        [apt.current_token_id]
      );
      if (currToken.length > 0 && currToken[0].consultation_start_at) {
        doctorElapsedMins = Math.max(0, Math.floor((new Date() - new Date(currToken[0].consultation_start_at)) / 60000));
      }
    }

    // 2. Call Intelligent Python / Little's Law Waiting Time Estimator
    const waitPrediction = await estimateWaitingTime({
      queueLengthAhead,
      avgConsultationTime: apt.avg_consultation_time,
      emergencyAhead,
      triagePriority: 1, // Routine appointment
      doctorElapsedMins,
      isAppointment: 1
    });

    const estimatedWaitMins = Math.round(waitPrediction.estimated_wait_time_minutes || 15);

    // 3. Call sp_issue_token stored procedure
    await pool.query(
      `CALL sp_issue_token(?, ?, 'APPOINTMENT', 'ROUTINE', ?, ?, @new_token_id, @new_token_num, @priority_score, @queue_pos)`,
      [apt.patient_id, apt.doctor_id, apt.appointment_id, estimatedWaitMins]
    );

    const [outParams] = await pool.query(
      `SELECT @new_token_id AS token_id, @new_token_num AS token_number, @priority_score AS priority_score, @queue_pos AS queue_position`
    );

    const tokenInfo = outParams[0];

    // Fetch full token data
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
      io.emit('queue:updated', { doctorId: apt.doctor_id });
    }

    // 5. Distributed Telemetry Logging to MongoDB
    await logQueueTelemetry('TOKEN_ISSUED_FROM_APPOINTMENT', {
      tokenId: tokenInfo.token_id,
      tokenNumber: tokenInfo.token_number,
      doctorId: apt.doctor_id,
      patientId: apt.patient_id,
      appointmentId: apt.appointment_id
    });

    res.json({
      success: true,
      message: `Checked in successfully! Your queue token is ${tokenInfo.token_number}`,
      data: fullToken
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
