const pool = require('../config/db');

// Get all doctors with live availability status and queue metrics
exports.getAllDoctors = async (req, res) => {
  try {
    const [rows] = await pool.query(`SELECT * FROM vw_doctor_availability_status ORDER BY room_number ASC`);
    res.json({ success: true, count: rows.length, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get single doctor with current schedule
exports.getDoctorById = async (req, res) => {
  try {
    const { id } = req.params;
    const [doctors] = await pool.query(
      `SELECT d.*, dept.dept_name, dept.dept_code 
       FROM doctors d 
       JOIN departments dept ON d.dept_id = dept.dept_id 
       WHERE d.doctor_id = ?`,
      [id]
    );

    if (doctors.length === 0) {
      return res.status(404).json({ success: false, message: 'Doctor not found' });
    }

    const [schedules] = await pool.query(
      `SELECT * FROM doctor_schedules WHERE doctor_id = ? ORDER BY schedule_id ASC`,
      [id]
    );

    res.json({ success: true, data: { doctor: doctors[0], schedules } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Update doctor availability status (AVAILABLE, ON_BREAK, OFF_DUTY, etc.)
exports.updateDoctorStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const allowed = ['AVAILABLE', 'IN_CONSULTATION', 'ON_BREAK', 'OFF_DUTY', 'EMERGENCY_DUTY'];
    if (!allowed.includes(status)) {
      return res.status(400).json({ success: false, message: `Invalid status. Allowed: ${allowed.join(', ')}` });
    }

    await pool.query(`UPDATE doctors SET current_status = ? WHERE doctor_id = ?`, [status, id]);
    
    // Broadcast real-time status update to connected clients
    const io = req.app.get('io');
    if (io) {
      io.emit('doctor:status_changed', { doctorId: id, newStatus: status });
    }

    res.json({ success: true, message: `Doctor status updated to ${status}` });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get current active queue for a specific doctor
exports.getDoctorQueue = async (req, res) => {
  try {
    const { id } = req.params;
    const [queue] = await pool.query(
      `SELECT t.*, p.full_name AS patient_name, p.uhid, p.phone, p.category, p.allergies,
              aq.current_position
       FROM queue_tokens t
       JOIN patients p ON t.patient_id = p.patient_id
       LEFT JOIN active_queues aq ON t.token_id = aq.token_id
       WHERE t.doctor_id = ? 
         AND t.status IN ('WAITING', 'CALLED', 'IN_CONSULTATION')
         AND t.token_date = CURRENT_DATE
       ORDER BY 
         CASE WHEN t.status = 'IN_CONSULTATION' THEN 1
              WHEN t.status = 'CALLED' THEN 2
              ELSE 3 END ASC,
         t.priority_score DESC, 
         t.token_sequence ASC`,
      [id]
    );

    res.json({ success: true, count: queue.length, data: queue });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
