const pool = require('../config/db');

// Patient Login (by UHID, Phone, or Email + Password)
exports.loginPatient = async (req, res) => {
  try {
    const { identifier, password = 'patient123' } = req.body;

    if (!identifier) {
      return res.status(400).json({ success: false, message: 'Please provide UHID, Phone number, or Email' });
    }

    const trimmed = identifier.trim();

    // Find patient by UHID, Phone, or Email
    const [patients] = await pool.query(
      `SELECT * FROM patients WHERE uhid = ? OR phone = ? OR email = ? LIMIT 1`,
      [trimmed, trimmed, trimmed]
    );

    if (patients.length === 0) {
      return res.status(404).json({ success: false, message: 'Patient not found with this UHID, Phone, or Email' });
    }

    const patient = patients[0];

    // Password verification (supports custom password or default 'patient123')
    if (patient.password && patient.password !== password && password !== 'patient123') {
      return res.status(401).json({ success: false, message: 'Invalid password. (Default is patient123)' });
    }

    // Strip password from response
    delete patient.password;

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        patient,
        token: `jwt_sim_${patient.patient_id}_${Date.now()}`
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Quick Demo Patients List for 1-click demonstration login
exports.getDemoPatients = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT patient_id, uhid, full_name, phone, email, category, gender, blood_group
       FROM patients ORDER BY patient_id ASC LIMIT 5`
    );
    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Comprehensive Patient Profile (Personal Dashboard Data)
exports.getPatientProfile = async (req, res) => {
  try {
    const { id } = req.params;

    const [patients] = await pool.query(`SELECT * FROM patients WHERE patient_id = ?`, [id]);
    if (patients.length === 0) {
      return res.status(404).json({ success: false, message: 'Patient not found' });
    }
    const patient = patients[0];
    delete patient.password;

    // 1. Fetch active token today (if waiting or in consultation)
    const [activeTokens] = await pool.query(
      `SELECT t.*, d.full_name AS doctor_name, d.room_number, d.current_status AS doctor_status,
              dept.dept_name, curr_t.token_number AS doctor_now_serving
       FROM queue_tokens t
       JOIN doctors d ON t.doctor_id = d.doctor_id
       JOIN departments dept ON t.dept_id = dept.dept_id
       LEFT JOIN queue_tokens curr_t ON d.current_token_id = curr_t.token_id
       WHERE t.patient_id = ? AND t.token_date = CURRENT_DATE AND t.status IN ('WAITING', 'CALLED', 'IN_CONSULTATION')
       ORDER BY t.issued_at DESC LIMIT 1`,
      [id]
    );

    let activeToken = null;
    if (activeTokens.length > 0) {
      activeToken = activeTokens[0];
      // Calculate patients ahead
      if (activeToken.status === 'WAITING') {
        const [aheadCount] = await pool.query(
          `SELECT COUNT(*) AS count_ahead 
           FROM queue_tokens 
           WHERE doctor_id = ? 
             AND status = 'WAITING' 
             AND token_date = CURRENT_DATE
             AND (priority_score > ? OR (priority_score = ? AND token_sequence < ?))`,
          [activeToken.doctor_id, activeToken.priority_score, activeToken.priority_score, activeToken.token_sequence]
        );
        activeToken.patients_ahead = aheadCount[0].count_ahead;
      } else {
        activeToken.patients_ahead = 0;
      }
    }

    // 2. Fetch appointments (upcoming and past)
    const [appointments] = await pool.query(
      `SELECT a.*, d.full_name AS doctor_name, d.room_number, dept.dept_name
       FROM appointments a
       JOIN doctors d ON a.doctor_id = d.doctor_id
       JOIN departments dept ON d.dept_id = dept.dept_id
       WHERE a.patient_id = ?
       ORDER BY a.scheduled_date DESC, a.time_slot DESC`,
      [id]
    );

    // 3. Fetch past consultation medical records & prescriptions
    const [consultations] = await pool.query(
      `SELECT cs.*, t.token_number, t.token_date, t.issued_at, t.completed_at,
              d.full_name AS doctor_name, d.qualification, d.room_number, dept.dept_name
       FROM consultation_sessions cs
       JOIN queue_tokens t ON cs.token_id = t.token_id
       JOIN doctors d ON cs.doctor_id = d.doctor_id
       JOIN departments dept ON d.dept_id = dept.dept_id
       WHERE cs.patient_id = ?
       ORDER BY cs.created_at DESC`,
      [id]
    );

    res.json({
      success: true,
      data: {
        patient,
        active_token: activeToken,
        appointments,
        consultations
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get all patients with optional search
exports.getAllPatients = async (req, res) => {
  try {
    const { search, limit = 50, offset = 0 } = req.query;
    let query = `SELECT patient_id, uhid, full_name, phone, email, dob, gender, blood_group, category, address, emergency_contact, allergies, created_at FROM patients`;
    const params = [];

    if (search) {
      query += ` WHERE full_name LIKE ? OR phone LIKE ? OR uhid LIKE ?`;
      const term = `%${search}%`;
      params.push(term, term, term);
    }

    query += ` ORDER BY patient_id DESC LIMIT ? OFFSET ?`;
    params.push(parseInt(limit, 10), parseInt(offset, 10));

    const [rows] = await pool.query(query, params);
    res.json({ success: true, count: rows.length, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get single patient by ID with full history
exports.getPatientById = async (req, res) => {
  try {
    const { id } = req.params;
    const [patients] = await pool.query(`SELECT patient_id, uhid, full_name, phone, email, dob, gender, blood_group, category, address, emergency_contact, allergies, created_at FROM patients WHERE patient_id = ?`, [id]);
    
    if (patients.length === 0) {
      return res.status(404).json({ success: false, message: 'Patient not found' });
    }

    const [tokens] = await pool.query(
      `SELECT t.*, d.full_name AS doctor_name, dept.dept_name 
       FROM queue_tokens t 
       JOIN doctors d ON t.doctor_id = d.doctor_id 
       JOIN departments dept ON t.dept_id = dept.dept_id 
       WHERE t.patient_id = ? 
       ORDER BY t.issued_at DESC`,
      [id]
    );

    res.json({ success: true, data: { patient: patients[0], tokens } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Register a new patient
exports.registerPatient = async (req, res) => {
  try {
    const {
      full_name, phone, email, password = 'patient123', dob, gender, blood_group,
      category = 'GENERAL', address, emergency_contact, allergies
    } = req.body;

    if (!full_name || !phone || !dob || !gender) {
      return res.status(400).json({ success: false, message: 'Missing required fields: full_name, phone, dob, gender' });
    }

    // Check if phone or email already registered
    const [existing] = await pool.query(
      `SELECT * FROM patients WHERE phone = ? OR (email IS NOT NULL AND email = ?)`,
      [phone, email || '']
    );

    if (existing.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'A patient with this phone or email already exists. Please log in.',
        existing_uhid: existing[0].uhid
      });
    }

    // Auto-generate UHID: UHID-YYYY-XXXX
    const [countRow] = await pool.query(`SELECT COUNT(*) AS total FROM patients`);
    const uhid = `UHID-${new Date().getFullYear()}-${String(countRow[0].total + 1).padStart(4, '0')}`;

    const [result] = await pool.query(
      `INSERT INTO patients (uhid, full_name, phone, email, password, dob, gender, blood_group, category, address, emergency_contact, allergies)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [uhid, full_name, phone, email || null, password, dob, gender, blood_group || null, category, address || null, emergency_contact || null, allergies || null]
    );

    const [newPatient] = await pool.query(
      `SELECT patient_id, uhid, full_name, phone, email, dob, gender, blood_group, category, address, emergency_contact, allergies, created_at
       FROM patients WHERE patient_id = ?`,
      [result.insertId]
    );

    res.status(201).json({
      success: true,
      message: 'Patient registered successfully',
      data: {
        patient: newPatient[0],
        token: `jwt_sim_${newPatient[0].patient_id}_${Date.now()}`
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
