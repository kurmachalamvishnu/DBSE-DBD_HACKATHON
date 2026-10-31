const axios = require('axios');

const BASE_URL = 'http://localhost:5000/api';

async function runTestSuite() {
  console.log('--- Starting Healthcare Queue API Test Suite ---');
  let passed = 0;
  let failed = 0;

  async function test(name, fn) {
    try {
      await fn();
      console.log(` PASS: ${name}`);
      passed++;
    } catch (err) {
      console.error(` FAIL: ${name} ->`, err.response ? err.response.data : err.message);
      failed++;
    }
  }

  // 1. Health check
  await test('GET /health', async () => {
    const res = await axios.get(`${BASE_URL}/health`);
    if (res.data.status !== 'ONLINE') throw new Error('Status not online');
  });

  // 2. Patient Demo Accounts
  await test('GET /patients/demo-accounts', async () => {
    const res = await axios.get(`${BASE_URL}/patients/demo-accounts`);
    if (!res.data.success || res.data.data.length === 0) throw new Error('No demo accounts');
  });

  // 3. Patient Login
  await test('POST /patients/login', async () => {
    const res = await axios.post(`${BASE_URL}/patients/login`, {
      identifier: 'UHID-2026-001',
      password: 'patient123'
    });
    if (!res.data.success || !res.data.data.patient) throw new Error('Login failed');
  });

  // 4. Patient Comprehensive Profile
  await test('GET /patients/profile/1', async () => {
    const res = await axios.get(`${BASE_URL}/patients/profile/1`);
    if (!res.data.success || !res.data.data.patient) throw new Error('Profile not found');
  });

  // 5. Available Appointment Slots
  await test('GET /appointments/slots', async () => {
    const today = new Date().toISOString().split('T')[0];
    const res = await axios.get(`${BASE_URL}/appointments/slots`, {
      params: { doctor_id: 1, date: today }
    });
    if (!res.data.success || !Array.isArray(res.data.slots)) throw new Error('No slots returned');
  });

  // 6. Book an Appointment
  let createdAptId = null;
  await test('POST /appointments (Book)', async () => {
    const futureDate = new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0];
    const res = await axios.post(`${BASE_URL}/appointments`, {
      patient_id: 1,
      doctor_id: 2,
      scheduled_date: futureDate,
      time_slot: '11:00:00',
      reason_for_visit: 'Comprehensive Cardiac Screening'
    });
    if (!res.data.success || !res.data.data.appointment_id) throw new Error('Booking failed');
    createdAptId = res.data.data.appointment_id;
  });

  // 7. Cancel Appointment
  if (createdAptId) {
    await test(`PUT /appointments/${createdAptId}/cancel`, async () => {
      const res = await axios.put(`${BASE_URL}/appointments/${createdAptId}/cancel`);
      if (!res.data.success) throw new Error('Cancel failed');
    });
  }

  // 8. Doctors API
  await test('GET /doctors', async () => {
    const res = await axios.get(`${BASE_URL}/doctors`);
    if (!res.data.success || res.data.data.length === 0) throw new Error('No doctors returned');
  });

  // 9. Departments API
  await test('GET /departments', async () => {
    const res = await axios.get(`${BASE_URL}/departments`);
    if (!res.data.success || res.data.data.length === 0) throw new Error('No departments returned');
  });

  // 10. Live Queue Monitor
  await test('GET /queues/live', async () => {
    const res = await axios.get(`${BASE_URL}/queues/live`);
    if (!res.data.success || !Array.isArray(res.data.data)) throw new Error('Invalid live queue data');
  });

  // 11. TV Display Board
  await test('GET /queues/tv-board', async () => {
    const res = await axios.get(`${BASE_URL}/queues/tv-board`);
    if (!res.data.success || !Array.isArray(res.data.data)) throw new Error('Invalid TV board data');
  });

  // 12. Analytics Summary
  await test('GET /analytics/summary', async () => {
    const res = await axios.get(`${BASE_URL}/analytics/summary`);
    if (!res.data.success || !res.data.data.kpis) throw new Error('Invalid summary KPIs');
  });

  // 13. Queue History
  await test('GET /history', async () => {
    const res = await axios.get(`${BASE_URL}/history`);
    if (!res.data.success || !Array.isArray(res.data.data)) throw new Error('Invalid history list');
  });

  // 14. AI Prediction Endpoint
  await test('POST /predict/estimate', async () => {
    const res = await axios.post(`${BASE_URL}/predict/estimate`, {
      queueLengthAhead: 3,
      avgConsultationTime: 15,
      emergencyAhead: 1,
      triagePriority: 2
    });
    if (!res.data.estimated_wait_time_minutes) throw new Error('No wait time predicted');
  });

  console.log(`\n===========================================`);
  console.log(`Test Suite Finished: ${passed} Passed, ${failed} Failed`);
  console.log(`===========================================`);
}

runTestSuite();
