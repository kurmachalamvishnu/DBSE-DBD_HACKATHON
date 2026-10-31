import React, { useState, useEffect } from 'react';
import { 
  Ticket, 
  UserPlus, 
  CalendarCheck, 
  Search, 
  AlertCircle, 
  Clock, 
  Sparkles, 
  CheckCircle2,
  Printer,
  HeartHandshake
} from 'lucide-react';
import { 
  getPatients, 
  getDoctors, 
  getDepartments, 
  getAppointments, 
  registerPatient, 
  issueToken,
  estimateWaitTimeDirect 
} from '../api';
import TokenSlipModal from './TokenSlipModal';

export default function ReceptionKiosk({ onTokenIssued }) {
  const [patients, setPatients] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [appointments, setAppointments] = useState([]);

  // Form State
  const [patientSearch, setPatientSearch] = useState('');
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [selectedDoctorId, setSelectedDoctorId] = useState('');
  const [source, setSource] = useState('WALK_IN');
  const [triageLevel, setTriageLevel] = useState('ROUTINE');
  const [selectedAppointmentId, setSelectedAppointmentId] = useState(null);

  // Live AI Prediction Preview
  const [previewWaitTime, setPreviewWaitTime] = useState(null);
  const [predicting, setPredicting] = useState(false);

  // New Patient Registration Modal State
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [newPatientData, setNewPatientData] = useState({
    full_name: '',
    phone: '',
    email: '',
    dob: '1990-01-01',
    gender: 'Male',
    blood_group: 'O+',
    category: 'GENERAL',
    allergies: ''
  });

  // Token Slip Print Modal
  const [issuedTokenData, setIssuedTokenData] = useState(null);
  const [isTokenSlipOpen, setIsTokenSlipOpen] = useState(false);

  const loadData = async () => {
    try {
      const [patRes, docRes, deptRes, aptRes] = await Promise.all([
        getPatients({ limit: 100 }),
        getDoctors(),
        getDepartments(),
        getAppointments({ date: new Date().toISOString().split('T')[0] })
      ]);

      if (patRes.data.success) setPatients(patRes.data.data);
      if (docRes.data.success) setDoctors(docRes.data.data);
      if (deptRes.data.success) setDepartments(deptRes.data.data);
      if (aptRes.data.success) setAppointments(aptRes.data.data);
    } catch (e) {
      console.error('Failed to load reception kiosk data:', e);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filter patients by search term
  const filteredPatients = patients.filter((p) => {
    const term = patientSearch.toLowerCase();
    return (
      p.full_name.toLowerCase().includes(term) ||
      p.phone.includes(term) ||
      p.uhid.toLowerCase().includes(term)
    );
  });

  // Calculate AI Wait Time Preview whenever Doctor or Triage changes
  useEffect(() => {
    async function calculatePreview() {
      if (!selectedDoctorId) {
        setPreviewWaitTime(null);
        return;
      }
      setPredicting(true);
      try {
        const doc = doctors.find((d) => d.doctor_id === Number(selectedDoctorId));
        const res = await estimateWaitTimeDirect({
          queueLengthAhead: doc?.patients_currently_waiting || 0,
          avgConsultationTime: doc?.avg_consultation_time || 15,
          emergencyAhead: triageLevel === 'EMERGENCY' ? 0 : 1,
          triagePriority: triageLevel === 'EMERGENCY' ? 4 : triageLevel === 'URGENT' ? 3 : 1,
          isAppointment: source === 'APPOINTMENT' ? 1 : 0
        });
        setPreviewWaitTime(res.data);
      } catch (err) {
        console.error('Wait time preview error:', err);
      } finally {
        setPredicting(false);
      }
    }
    calculatePreview();
  }, [selectedDoctorId, triageLevel, source, doctors]);

  // Handle Token Issuance
  const handleIssueToken = async (e) => {
    e.preventDefault();
    if (!selectedPatientId || !selectedDoctorId) {
      alert('Please select both Patient and Doctor');
      return;
    }

    try {
      const res = await issueToken({
        patient_id: Number(selectedPatientId),
        doctor_id: Number(selectedDoctorId),
        source,
        triage_level: triageLevel,
        appointment_id: selectedAppointmentId
      });

      if (res.data.success) {
        setIssuedTokenData({
          ...res.data.data,
          prediction_details: res.data.prediction_details
        });
        setIsTokenSlipOpen(true);

        // Reset form
        setSelectedAppointmentId(null);
        setSource('WALK_IN');
        setTriageLevel('ROUTINE');

        if (onTokenIssued) onTokenIssued();
        loadData();
      }
    } catch (err) {
      alert(`Failed to issue token: ${err.response?.data?.message || err.message}`);
    }
  };

  // Quick Check-in for Appointment
  const handleCheckinAppointment = (apt) => {
    setSelectedPatientId(apt.patient_id);
    setSelectedDoctorId(apt.doctor_id);
    setSelectedAppointmentId(apt.appointment_id);
    setSource('APPOINTMENT');
    setTriageLevel('ROUTINE');
  };

  // Register New Patient Submit
  const handleRegisterPatientSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await registerPatient(newPatientData);
      if (res.data.success) {
        setIsRegisterModalOpen(false);
        await loadData();
        setSelectedPatientId(res.data.data.patient_id);
        alert(`Patient registered successfully! UHID: ${res.data.data.uhid}`);
      }
    } catch (err) {
      alert(`Registration error: ${err.message}`);
    }
  };

  const selectedPatientObj = patients.find((p) => p.patient_id === Number(selectedPatientId));
  const selectedDoctorObj = doctors.find((d) => d.doctor_id === Number(selectedDoctorId));

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 rounded-2xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-700 shadow-inner">
            <Ticket className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight">
              PATIENT RECEPTION & TOKEN KIOSK
            </h1>
            <p className="text-xs text-slate-500">
              Register walk-in arrivals, check-in booked appointments, triage acuity, and print queue tokens
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsRegisterModalOpen(true)}
          className="flex items-center space-x-2 bg-teal-600 hover:bg-teal-700 text-white font-bold py-2.5 px-4 rounded-xl text-xs shadow-md shadow-teal-600/20 transition-all"
        >
          <UserPlus className="w-4 h-4" />
          <span>Register New Patient</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Token Issuance Form (7 cols) */}
        <div className="lg:col-span-7 bg-white rounded-2xl p-6 shadow-sm border border-slate-200 space-y-6">
          <h2 className="font-bold text-base text-slate-800 border-b border-slate-100 pb-3 flex items-center gap-2">
            <Ticket className="w-4 h-4 text-teal-600" />
            Issue Healthcare Queue Token
          </h2>

          <form onSubmit={handleIssueToken} className="space-y-5">
            {/* 1. Patient Selection with Live Search */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase">1. Select Patient *</label>
                <span className="text-[11px] text-teal-600 font-semibold cursor-pointer" onClick={() => setIsRegisterModalOpen(true)}>
                  + Not found? Register new
                </span>
              </div>

              <div className="relative mb-2">
                <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <input
                  type="text"
                  placeholder="Quick search by patient name, phone number, or UHID..."
                  value={patientSearch}
                  onChange={(e) => setPatientSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-teal-500 focus:outline-none"
                />
              </div>

              <select
                required
                value={selectedPatientId}
                onChange={(e) => setSelectedPatientId(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-teal-500"
              >
                <option value="">-- Choose Patient from Database ({filteredPatients.length} found) --</option>
                {filteredPatients.map((p) => (
                  <option key={p.patient_id} value={p.patient_id}>
                    {p.full_name} | {p.phone} | {p.uhid} ({p.category})
                  </option>
                ))}
              </select>

              {/* Patient Quick Info Card */}
              {selectedPatientObj && (
                <div className="mt-2 p-3 bg-teal-50/70 border border-teal-200 rounded-xl text-xs flex items-center justify-between">
                  <div>
                    <span className="font-bold text-teal-950">{selectedPatientObj.full_name}</span>
                    <span className="text-slate-500"> • {selectedPatientObj.gender}, {selectedPatientObj.blood_group}</span>
                    <span className="block text-[11px] text-slate-500">Phone: {selectedPatientObj.phone}</span>
                  </div>
                  <span className="font-bold text-[10px] uppercase bg-teal-100 text-teal-800 px-2 py-0.5 rounded">
                    {selectedPatientObj.category}
                  </span>
                </div>
              )}
            </div>

            {/* 2. Doctor & Department Selection */}
            <div>
              <label className="text-xs font-bold text-slate-700 uppercase block mb-1.5">
                2. Select Department & Doctor *
              </label>
              <select
                required
                value={selectedDoctorId}
                onChange={(e) => setSelectedDoctorId(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-teal-500"
              >
                <option value="">-- Choose Doctor / Consultation Room --</option>
                {doctors.map((doc) => (
                  <option key={doc.doctor_id} value={doc.doctor_id}>
                    {doc.doctor_name} ({doc.dept_name} - {doc.room_number}) • Status: {doc.current_status} • ({doc.patients_currently_waiting} waiting)
                  </option>
                ))}
              </select>

              {selectedDoctorObj && (
                <div className="mt-2 p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs flex items-center justify-between">
                  <div>
                    <span className="font-bold text-slate-800">{selectedDoctorObj.doctor_name}</span>
                    <span className="text-slate-500"> ({selectedDoctorObj.room_number})</span>
                    <p className="text-[11px] text-slate-500">Avg consultation: {selectedDoctorObj.avg_consultation_time} mins</p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-black mono text-teal-700 block">
                      {selectedDoctorObj.patients_currently_waiting} in queue
                    </span>
                    <span className="text-[10px] text-slate-400">Capacity: {selectedDoctorObj.max_daily_capacity}/day</span>
                  </div>
                </div>
              )}
            </div>

            {/* 3. Triage Acuity Level */}
            <div>
              <label className="text-xs font-bold text-slate-700 uppercase block mb-2">
                3. Clinical Triage Acuity (Dynamic Priority Level)
              </label>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { id: 'ROUTINE', label: 'Routine (Walk-in/General)', score: 'Score ~20-35', color: 'border-emerald-300 bg-emerald-50 text-emerald-900', badge: 'Green' },
                  { id: 'URGENT', label: 'Urgent (Moderate distress)', score: 'Score ~65', color: 'border-amber-300 bg-amber-50 text-amber-900', badge: 'Yellow' },
                  { id: 'EMERGENCY', label: 'Code Red Emergency', score: 'Score ~95', color: 'border-red-400 bg-red-50 text-red-900 font-bold', badge: 'Red' },
                ].map((tier) => (
                  <div
                    key={tier.id}
                    onClick={() => setTriageLevel(tier.id)}
                    className={`cursor-pointer border-2 rounded-xl p-3 text-center transition-all ${
                      triageLevel === tier.id
                        ? `${tier.color} ring-2 ring-offset-1 ring-teal-500 shadow-sm`
                        : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <span className="text-xs font-bold block">{tier.label}</span>
                    <span className="text-[10px] text-slate-500 block mt-1">{tier.score}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* 4. Source of Arrival */}
            <div>
              <label className="text-xs font-bold text-slate-700 uppercase block mb-1.5">
                4. Arrival Source
              </label>
              <div className="flex gap-4">
                <label className="flex items-center space-x-2 text-xs font-semibold text-slate-700 cursor-pointer">
                  <input
                    type="radio"
                    name="source"
                    value="WALK_IN"
                    checked={source === 'WALK_IN'}
                    onChange={(e) => setSource(e.target.value)}
                    className="text-teal-600 focus:ring-teal-500"
                  />
                  <span>Walk-in Patient</span>
                </label>
                <label className="flex items-center space-x-2 text-xs font-semibold text-slate-700 cursor-pointer">
                  <input
                    type="radio"
                    name="source"
                    value="APPOINTMENT"
                    checked={source === 'APPOINTMENT'}
                    onChange={(e) => setSource(e.target.value)}
                    className="text-teal-600 focus:ring-teal-500"
                  />
                  <span>Scheduled Appointment Check-in (+10 Priority Bonus)</span>
                </label>
              </div>
            </div>

            {/* AI Estimation Live Preview Banner */}
            {previewWaitTime && (
              <div className="bg-gradient-to-r from-teal-50 to-emerald-50 border border-teal-200 rounded-xl p-4 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Sparkles className="w-5 h-5 text-teal-600 animate-pulse" />
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-teal-800">
                      Python AI Wait Time Estimation:
                    </span>
                    <p className="text-xs text-slate-600">
                      M/M/1 Little's Law + Random Forest Queuing Engine
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-2xl font-black mono text-teal-900">
                    ~{Math.round(previewWaitTime.estimated_wait_time_minutes)} mins
                  </span>
                  <span className="text-[10px] text-slate-500 block">
                    Range: [{previewWaitTime.confidence_interval?.[0]} - {previewWaitTime.confidence_interval?.[1]} mins]
                  </span>
                </div>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              className="w-full flex items-center justify-center space-x-2 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-teal-600/30 text-sm uppercase tracking-wider transition-all"
            >
              <Ticket className="w-5 h-5" />
              <span>Generate & Issue Queue Token</span>
            </button>
          </form>
        </div>

        {/* Scheduled Appointments Today (Right Col - 5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-full">
            <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <CalendarCheck className="w-5 h-5 text-teal-400" />
                <h3 className="font-bold text-sm tracking-wide">TODAY'S APPOINTMENTS</h3>
              </div>
              <span className="text-xs bg-slate-800 text-teal-300 font-bold px-2 py-0.5 rounded-full border border-slate-700">
                {appointments.length} Booked
              </span>
            </div>

            <div className="p-4 flex-1 overflow-y-auto max-h-[550px] space-y-3">
              {appointments.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-10">No appointments scheduled today</p>
              ) : (
                appointments.map((apt) => (
                  <div
                    key={apt.appointment_id}
                    className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-white hover:border-teal-300 transition-all flex flex-col justify-between space-y-2.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs mono text-teal-900">{apt.appointment_number}</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                        apt.status === 'CHECKED_IN'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}>
                        {apt.status}
                      </span>
                    </div>

                    <div>
                      <p className="font-bold text-slate-800 text-sm">{apt.patient_name}</p>
                      <p className="text-xs text-slate-500">
                        {apt.doctor_name} ({apt.room_number}) • Slot: {apt.time_slot}
                      </p>
                      <p className="text-[11px] text-slate-400 italic mt-0.5">{apt.reason_for_visit}</p>
                    </div>

                    {apt.status === 'SCHEDULED' && (
                      <button
                        onClick={() => handleCheckinAppointment(apt)}
                        className="w-full py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs"
                      >
                        Check-in & Issue Token
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* New Patient Registration Modal */}
      {isRegisterModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden">
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
              <h3 className="font-bold text-base flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-teal-400" />
                Register New Patient
              </h3>
              <button onClick={() => setIsRegisterModalOpen(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleRegisterPatientSubmit} className="p-6 space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 uppercase">Full Name *</label>
                <input
                  required
                  type="text"
                  placeholder="e.g. Ramesh Chandra"
                  value={newPatientData.full_name}
                  onChange={(e) => setNewPatientData({ ...newPatientData, full_name: e.target.value })}
                  className="w-full mt-1 bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-xs font-medium focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 uppercase">Phone Number *</label>
                  <input
                    required
                    type="tel"
                    placeholder="+91 98765 43210"
                    value={newPatientData.phone}
                    onChange={(e) => setNewPatientData({ ...newPatientData, phone: e.target.value })}
                    className="w-full mt-1 bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-xs font-medium focus:ring-2 focus:ring-teal-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 uppercase">Date of Birth *</label>
                  <input
                    required
                    type="date"
                    value={newPatientData.dob}
                    onChange={(e) => setNewPatientData({ ...newPatientData, dob: e.target.value })}
                    className="w-full mt-1 bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-xs font-medium focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 uppercase">Gender *</label>
                  <select
                    value={newPatientData.gender}
                    onChange={(e) => setNewPatientData({ ...newPatientData, gender: e.target.value })}
                    className="w-full mt-1 bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-xs font-medium focus:ring-2 focus:ring-teal-500"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 uppercase">Blood Group</label>
                  <select
                    value={newPatientData.blood_group}
                    onChange={(e) => setNewPatientData({ ...newPatientData, blood_group: e.target.value })}
                    className="w-full mt-1 bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-xs font-medium focus:ring-2 focus:ring-teal-500"
                  >
                    {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((bg) => (
                      <option key={bg} value={bg}>{bg}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 uppercase">Category</label>
                  <select
                    value={newPatientData.category}
                    onChange={(e) => setNewPatientData({ ...newPatientData, category: e.target.value })}
                    className="w-full mt-1 bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-xs font-medium focus:ring-2 focus:ring-teal-500"
                  >
                    <option value="GENERAL">General</option>
                    <option value="SENIOR_CITIZEN">Senior Citizen (65+)</option>
                    <option value="PEDIATRIC">Pediatric (&lt;12)</option>
                    <option value="PREGNANT">Pregnant</option>
                    <option value="PERSON_WITH_DISABILITY">PWD</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 uppercase">Documented Allergies</label>
                <input
                  type="text"
                  placeholder="e.g. Penicillin, Sulfa, Dust, None"
                  value={newPatientData.allergies}
                  onChange={(e) => setNewPatientData({ ...newPatientData, allergies: e.target.value })}
                  className="w-full mt-1 bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-xs font-medium focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end space-x-3 -mx-6 -mb-6">
                <button
                  type="button"
                  onClick={() => setIsRegisterModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold shadow-md shadow-teal-600/30"
                >
                  Save & Generate UHID
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Printable Token Slip Modal */}
      {isTokenSlipOpen && issuedTokenData && (
        <TokenSlipModal
          token={issuedTokenData}
          onClose={() => setIsTokenSlipOpen(false)}
        />
      )}
    </div>
  );
}
