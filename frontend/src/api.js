import axios from 'axios';

const API_BASE_URL = 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Patient Auth & Profile API
export const loginPatient = (identifier, password) => api.post('/patients/login', { identifier, password });
export const getDemoPatients = () => api.get('/patients/demo-accounts');
export const getPatientProfile = (id) => api.get(`/patients/profile/${id}`);
export const getPatients = (params) => api.get('/patients', { params });
export const getPatientById = (id) => api.get(`/patients/${id}`);
export const registerPatient = (data) => api.post('/patients', data);

// Doctors API
export const getDoctors = () => api.get('/doctors');
export const getDoctorById = (id) => api.get(`/doctors/${id}`);
export const updateDoctorStatus = (id, status) => api.put(`/doctors/${id}/status`, { status });
export const getDoctorQueue = (id) => api.get(`/doctors/${id}/queue`);

// Departments API
export const getDepartments = () => api.get('/departments');

// Appointments & Scheduling API
export const getAppointments = (params) => api.get('/appointments', { params });
export const getAvailableSlots = (doctorId, date) => api.get('/appointments/slots', { params: { doctor_id: doctorId, date } });
export const bookAppointment = (data) => api.post('/appointments', data);
export const cancelAppointment = (id) => api.put(`/appointments/${id}/cancel`);
export const checkInAppointment = (id) => api.post(`/appointments/${id}/checkin`);

// Tokens & Queue Operations
export const issueToken = (data) => api.post('/tokens/issue', data);
export const getTokenStatus = (tokenNumber) => api.get(`/tokens/status/${tokenNumber}`);
export const getAllTokens = (params) => api.get('/tokens', { params });
export const getLiveMonitor = () => api.get('/queues/live');
export const getTVBoard = () => api.get('/queues/tv-board');
export const callNextPatient = (doctorId) => api.post('/queues/call-next', { doctor_id: doctorId });
export const startConsultation = (tokenId) => api.post('/queues/start-consultation', { token_id: tokenId });
export const completeConsultation = (data) => api.post('/queues/complete', data);
export const skipPatient = (tokenId, reason) => api.post('/queues/skip', { token_id: tokenId, reason });
export const reassignQueue = (fromDoctorId, toDoctorId) => api.post('/queues/reassign', { from_doctor_id: fromDoctorId, to_doctor_id: toDoctorId });

// History & Export
export const getQueueHistory = (params) => api.get('/history', { params });
export const getExportCsvUrl = () => `${API_BASE_URL}/history/export-csv`;

// Analytics & AI (Patient Health Status & Clinical Prognosis)
export const getPatientHealthAnalytics = () => api.get('/analytics/patient-health');
export const evaluatePatientHealthAI = (data) => api.post('/analytics/patient-health-ai', data);
export const getAnalyticsSummary = () => api.get('/analytics/summary');
export const getHourlyThroughput = () => api.get('/analytics/hourly');
export const getPredictionAccuracy = () => api.get('/analytics/prediction-accuracy');
export const getModelMetrics = () => api.get('/predict/metrics');
export const estimateWaitTimeDirect = (data) => api.post('/predict/estimate', data);

export default api;
