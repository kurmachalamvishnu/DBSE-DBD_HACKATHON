const pool = require('../config/db');

// Retrieve detailed audit trail of queue operations
exports.getQueueHistory = async (req, res) => {
  try {
    const { doctor_id, patient_id, event_type, date, limit = 100, offset = 0 } = req.query;

    let query = `
      SELECT h.*, 
             t.token_number, t.source, t.triage_level,
             p.full_name AS patient_name, p.uhid, p.phone,
             d.full_name AS doctor_name, d.room_number, dept.dept_name
      FROM queue_history h
      JOIN queue_tokens t ON h.token_id = t.token_id
      JOIN patients p ON h.patient_id = p.patient_id
      JOIN doctors d ON h.doctor_id = d.doctor_id
      JOIN departments dept ON d.dept_id = dept.dept_id
      WHERE 1=1
    `;
    const params = [];

    if (doctor_id) {
      query += ` AND h.doctor_id = ?`;
      params.push(doctor_id);
    }
    if (patient_id) {
      query += ` AND h.patient_id = ?`;
      params.push(patient_id);
    }
    if (event_type) {
      query += ` AND h.event_type = ?`;
      params.push(event_type);
    }
    if (date) {
      query += ` AND DATE(h.timestamp) = ?`;
      params.push(date);
    }

    query += ` ORDER BY h.timestamp DESC LIMIT ? OFFSET ?`;
    params.push(parseInt(limit, 10), parseInt(offset, 10));

    const [rows] = await pool.query(query, params);
    res.json({ success: true, count: rows.length, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Export Queue History as CSV
exports.exportCSV = async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT h.history_id, h.timestamp, t.token_number, p.full_name AS patient_name,
             p.uhid, d.full_name AS doctor_name, d.room_number, h.event_type,
             h.previous_status, h.new_status, h.notes
      FROM queue_history h
      JOIN queue_tokens t ON h.token_id = t.token_id
      JOIN patients p ON h.patient_id = p.patient_id
      JOIN doctors d ON h.doctor_id = d.doctor_id
      ORDER BY h.timestamp DESC
      LIMIT 1000
    `);

    // Build CSV content
    const headers = ['History ID', 'Timestamp', 'Token Number', 'Patient Name', 'UHID', 'Doctor Name', 'Room', 'Event Type', 'Prev Status', 'New Status', 'Notes'];
    const csvLines = [headers.join(',')];

    for (const r of rows) {
      const line = [
        r.history_id,
        `"${r.timestamp}"`,
        `"${r.token_number}"`,
        `"${r.patient_name}"`,
        `"${r.uhid}"`,
        `"${r.doctor_name}"`,
        `"${r.room_number}"`,
        `"${r.event_type}"`,
        `"${r.previous_status || ''}"`,
        `"${r.new_status}"`,
        `"${(r.notes || '').replace(/"/g, '""')}"`
      ].join(',');
      csvLines.push(line);
    }

    res.header('Content-Type', 'text/csv');
    res.attachment(`queue_history_${new Date().toISOString().split('T')[0]}.csv`);
    res.send(csvLines.join('\n'));
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
