const pool = require('../config/db');

exports.getAllDepartments = async (req, res) => {
  try {
    const [departments] = await pool.query(
      `SELECT d.*, 
              COUNT(DISTINCT doc.doctor_id) AS total_doctors,
              COUNT(DISTINCT CASE WHEN doc.current_status != 'OFF_DUTY' THEN doc.doctor_id END) AS active_doctors,
              COUNT(DISTINCT CASE WHEN t.status = 'WAITING' AND t.token_date = CURRENT_DATE THEN t.token_id END) AS waiting_patients
       FROM departments d
       LEFT JOIN doctors doc ON d.dept_id = doc.dept_id
       LEFT JOIN queue_tokens t ON d.dept_id = t.dept_id
       GROUP BY d.dept_id
       ORDER BY d.dept_name ASC`
    );

    res.json({ success: true, data: departments });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
