import React, { useState, useEffect } from 'react';
import { 
  Stethoscope, 
  UserCheck, 
  PhoneCall, 
  CheckCircle, 
  SkipForward, 
  Clock, 
  FileText, 
  AlertTriangle, 
  ArrowRightLeft, 
  Play, 
  Sparkles,
  HeartPulse,
  User,
  ShieldAlert
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { 
  getDoctors, 
  getDoctorQueue, 
  callNextPatient, 
  startConsultation, 
  completeConsultation, 
  skipPatient, 
  updateDoctorStatus,
  reassignQueue
} from '../api';
import { announceTokenCall } from '../utils/audioAnnouncer';

export default function DoctorConsole({ onActionTriggered }) {
  const [doctors, setDoctors] = useState([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState(1);
  const [queue, setQueue] = useState([]);
  const [loading, setLoading] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isTimerActive, setIsTimerActive] = useState(false);

  // Modal State for Completing Consultation
  const [isCompleteModalOpen, setIsCompleteModalOpen] = useState(false);
  const [clinicalNotes, setClinicalNotes] = useState({
    vitals_bp: '120/80',
    vitals_pulse: '72',
    vitals_temp: '98.6',
    symptoms: '',
    diagnosis: '',
    prescription_notes: '',
    follow_up_date: ''
  });

  // Modal State for Queue Transfer
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [targetDoctorId, setTargetDoctorId] = useState('');

  const loadDoctors = async () => {
    try {
      const res = await getDoctors();
      if (res.data.success) {
        setDoctors(res.data.data);
      }
    } catch (e) {
      console.error('Failed to load doctors:', e);
    }
  };

  const loadQueue = async (docId) => {
    if (!docId) return;
    setLoading(true);
    try {
      const res = await getDoctorQueue(docId);
      if (res.data.success) {
        setQueue(res.data.data);
      }
    } catch (e) {
      console.error('Failed to load queue:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDoctors();
  }, []);

  useEffect(() => {
    if (selectedDoctorId) {
      loadQueue(selectedDoctorId);
    }
  }, [selectedDoctorId]);

  // Consultation Stopwatch Timer
  useEffect(() => {
    let interval = null;
    if (isTimerActive) {
      interval = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [isTimerActive]);

  const currentDoctor = doctors.find((d) => d.doctor_id === Number(selectedDoctorId));
  const activeEncounter = queue.find((t) => t.status === 'IN_CONSULTATION' || t.status === 'CALLED');
  const waitingPatients = queue.filter((t) => t.status === 'WAITING');

  // Trigger Stopwatch when consultation starts
  useEffect(() => {
    if (activeEncounter && activeEncounter.status === 'IN_CONSULTATION') {
      setIsTimerActive(true);
    } else {
      setIsTimerActive(false);
      setElapsedSeconds(0);
    }
  }, [activeEncounter?.token_id, activeEncounter?.status]);

  const handleStatusChange = async (newStatus) => {
    try {
      await updateDoctorStatus(selectedDoctorId, newStatus);
      await loadDoctors();
      if (onActionTriggered) onActionTriggered();
    } catch (err) {
      alert(`Error updating status: ${err.message}`);
    }
  };

  const handleCallNext = async () => {
    try {
      const res = await callNextPatient(selectedDoctorId);
      if (res.data.success && res.data.data) {
        announceTokenCall(res.data.data.tokenNumber, res.data.data.doctorName, res.data.data.roomNumber);
      } else {
        alert('No patients currently waiting in queue.');
      }
      await loadQueue(selectedDoctorId);
      await loadDoctors();
      if (onActionTriggered) onActionTriggered();
    } catch (err) {
      alert(`Error calling next patient: ${err.message}`);
    }
  };

  const handleRecall = () => {
    if (activeEncounter && currentDoctor) {
      announceTokenCall(activeEncounter.token_number, currentDoctor.doctor_name, currentDoctor.room_number);
    }
  };

  const handleStartConsultation = async () => {
    if (!activeEncounter) return;
    try {
      await startConsultation(activeEncounter.token_id);
      setIsTimerActive(true);
      await loadQueue(selectedDoctorId);
      await loadDoctors();
      if (onActionTriggered) onActionTriggered();
    } catch (err) {
      alert(`Error starting consultation: ${err.message}`);
    }
  };

  const handleOpenCompleteModal = () => {
    setIsCompleteModalOpen(true);
  };

  const handleFinishConsultation = async () => {
    if (!activeEncounter) return;
    try {
      await completeConsultation({
        token_id: activeEncounter.token_id,
        ...clinicalNotes
      });
      setIsCompleteModalOpen(false);
      setIsTimerActive(false);
      setElapsedSeconds(0);

      // Trigger celebratory confetti for consultation completion
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.7 }
      });

      // Clear clinical notes
      setClinicalNotes({
        vitals_bp: '120/80',
        vitals_pulse: '72',
        vitals_temp: '98.6',
        symptoms: '',
        diagnosis: '',
        prescription_notes: '',
        follow_up_date: ''
      });

      await loadQueue(selectedDoctorId);
      await loadDoctors();
      if (onActionTriggered) onActionTriggered();
    } catch (err) {
      alert(`Error completing consultation: ${err.message}`);
    }
  };

  const handleSkip = async () => {
    if (!activeEncounter) return;
    if (!confirm(`Are you sure you want to mark Token ${activeEncounter.token_number} as No-Show / Skipped?`)) return;
    try {
      await skipPatient(activeEncounter.token_id, 'No-Show / Unresponsive to call');
      setIsTimerActive(false);
      setElapsedSeconds(0);
      await loadQueue(selectedDoctorId);
      await loadDoctors();
      if (onActionTriggered) onActionTriggered();
    } catch (err) {
      alert(`Error skipping patient: ${err.message}`);
    }
  };

  const handleTransfer = async () => {
    if (!targetDoctorId) return alert('Please select target doctor');
    try {
      await reassignQueue(selectedDoctorId, targetDoctorId);
      setIsTransferModalOpen(false);
      await loadQueue(selectedDoctorId);
      await loadDoctors();
      if (onActionTriggered) onActionTriggered();
    } catch (err) {
      alert(`Transfer failed: ${err.message}`);
    }
  };

  const formatTimer = (sec) => {
    const mins = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(mins).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  return (
    <div className="space-y-6">
      {/* Doctor Header & Profile Switcher */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-700 font-black text-xl shadow-inner">
            <Stethoscope className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center space-x-3">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Doctor Profile:</label>
              <select
                value={selectedDoctorId}
                onChange={(e) => setSelectedDoctorId(Number(e.target.value))}
                className="bg-slate-50 border border-slate-300 text-slate-800 font-bold rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none"
              >
                {doctors.map((doc) => (
                  <option key={doc.doctor_id} value={doc.doctor_id}>
                    {doc.doctor_name} ({doc.room_number} - {doc.dept_name})
                  </option>
                ))}
              </select>
            </div>
            {currentDoctor && (
              <div className="flex items-center space-x-3 mt-1.5 text-xs text-slate-600">
                <span className="font-semibold text-slate-900">{currentDoctor.qualification}</span>
                <span>•</span>
                <span className="font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                  {currentDoctor.room_number}
                </span>
                <span>•</span>
                <span>Avg: {currentDoctor.avg_consultation_time} mins</span>
              </div>
            )}
          </div>
        </div>

        {/* Doctor Status Selector */}
        {currentDoctor && (
          <div className="flex items-center space-x-2">
            <span className="text-xs text-slate-500 font-medium">Availability:</span>
            {['AVAILABLE', 'ON_BREAK', 'OFF_DUTY'].map((st) => (
              <button
                key={st}
                onClick={() => handleStatusChange(st)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  currentDoctor.current_status === st
                    ? st === 'AVAILABLE'
                      ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/30'
                      : st === 'ON_BREAK'
                      ? 'bg-amber-600 text-white shadow-sm shadow-amber-600/30'
                      : 'bg-slate-700 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {st.replace('_', ' ')}
              </button>
            ))}

            <button
              onClick={() => setIsTransferModalOpen(true)}
              className="p-1.5 rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-100 transition-all"
              title="Transfer Waiting Queue to Another Doctor"
            >
              <ArrowRightLeft className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Main Grid: Active Patient vs Waiting Queue */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Active Patient Encounter (Left Col - 7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <HeartPulse className="w-5 h-5 text-teal-400" />
                <h2 className="font-bold text-base tracking-wide">ACTIVE PATIENT ENCOUNTER</h2>
              </div>
              {activeEncounter && (
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${
                  activeEncounter.status === 'IN_CONSULTATION'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 animate-pulse'
                    : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                }`}>
                  {activeEncounter.status === 'IN_CONSULTATION' ? 'In Consultation Room' : 'Called / Waiting to Enter'}
                </span>
              )}
            </div>

            <div className="p-6">
              {activeEncounter ? (
                <div className="space-y-6">
                  {/* Token & Patient Big Banner */}
                  <div className="flex flex-wrap items-center justify-between gap-4 bg-teal-50/60 border border-teal-100 p-5 rounded-2xl">
                    <div>
                      <span className="text-xs font-bold uppercase tracking-wider text-teal-700">Token Number</span>
                      <p className="text-4xl sm:text-5xl font-black mono text-teal-900 tracking-tight">
                        {activeEncounter.token_number}
                      </p>
                    </div>

                    {/* Consultation Stopwatch */}
                    <div className="text-right">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Consultation Duration</span>
                      <div className="flex items-center space-x-2 text-3xl font-black mono text-slate-800">
                        <Clock className="w-6 h-6 text-teal-600 animate-spin" style={{ animationDuration: '6s' }} />
                        <span>{formatTimer(elapsedSeconds)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Patient Bio Profile */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
                    <div>
                      <p className="text-slate-400 font-semibold uppercase">Patient Name</p>
                      <p className="text-slate-800 font-bold text-sm mt-0.5">{activeEncounter.patient_name}</p>
                    </div>
                    <div>
                      <p className="text-slate-400 font-semibold uppercase">UHID</p>
                      <p className="text-slate-800 font-bold mono mt-0.5">{activeEncounter.uhid}</p>
                    </div>
                    <div>
                      <p className="text-slate-400 font-semibold uppercase">Category</p>
                      <span className="inline-block px-2 py-0.5 mt-0.5 font-bold rounded bg-slate-200 text-slate-800">
                        {activeEncounter.category}
                      </span>
                    </div>
                    <div>
                      <p className="text-slate-400 font-semibold uppercase">Triage Level</p>
                      <span className={`inline-block px-2 py-0.5 mt-0.5 font-bold rounded ${
                        activeEncounter.triage_level === 'EMERGENCY'
                          ? 'bg-red-100 text-red-800 border border-red-200'
                          : activeEncounter.triage_level === 'URGENT'
                          ? 'bg-amber-100 text-amber-800 border border-amber-200'
                          : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                      }`}>
                        {activeEncounter.triage_level}
                      </span>
                    </div>
                  </div>

                  {/* Allergies / Medical Flags */}
                  {activeEncounter.allergies && (
                    <div className="bg-red-50 border border-red-200 p-3 rounded-xl flex items-center space-x-2 text-xs text-red-800">
                      <ShieldAlert className="w-4 h-4 text-red-600 shrink-0" />
                      <span><strong>Documented Allergies:</strong> {activeEncounter.allergies}</span>
                    </div>
                  )}

                  {/* Doctor Consultation Action Buttons */}
                  <div className="flex flex-wrap items-center gap-3 pt-2">
                    {activeEncounter.status === 'CALLED' && (
                      <button
                        onClick={handleStartConsultation}
                        className="flex-1 min-w-[160px] flex items-center justify-center space-x-2 bg-teal-600 hover:bg-teal-700 text-white font-bold py-3 px-4 rounded-xl shadow-md shadow-teal-600/20 transition-all"
                      >
                        <Play className="w-4 h-4 fill-current" />
                        <span>Patient Arrived (Start)</span>
                      </button>
                    )}

                    <button
                      onClick={handleRecall}
                      className="flex items-center space-x-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-3 px-4 rounded-xl transition-all"
                      title="Re-announce patient token on waiting room TV"
                    >
                      <PhoneCall className="w-4 h-4 text-teal-600" />
                      <span>Re-call TV</span>
                    </button>

                    <button
                      onClick={handleOpenCompleteModal}
                      className="flex-1 min-w-[180px] flex items-center justify-center space-x-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-4 rounded-xl shadow-md shadow-emerald-600/20 transition-all"
                    >
                      <CheckCircle className="w-4 h-4" />
                      <span>Complete & Save Rx</span>
                    </button>

                    <button
                      onClick={handleSkip}
                      className="flex items-center space-x-2 bg-slate-100 hover:bg-red-50 text-slate-600 hover:text-red-700 font-semibold py-3 px-3.5 rounded-xl transition-all border border-slate-200"
                      title="Skip / Patient No-show"
                    >
                      <SkipForward className="w-4 h-4" />
                      <span>Skip</span>
                    </button>
                  </div>
                </div>
              ) : (
                /* No Active Encounter - Call Next Patient State */
                <div className="py-12 text-center space-y-4">
                  <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
                    <User className="w-8 h-8" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-800">No Patient in Room</h3>
                    <p className="text-sm text-slate-500 max-w-sm mx-auto mt-1">
                      {waitingPatients.length > 0 
                        ? `${waitingPatients.length} patient(s) waiting in your priority queue.` 
                        : 'Queue is currently empty.'}
                    </p>
                  </div>

                  {waitingPatients.length > 0 && (
                    <button
                      onClick={handleCallNext}
                      className="inline-flex items-center space-x-2 bg-teal-600 hover:bg-teal-700 text-white font-bold py-3.5 px-8 rounded-xl shadow-lg shadow-teal-600/30 transition-all text-base hover:scale-105"
                    >
                      <PhoneCall className="w-5 h-5 animate-pulse" />
                      <span>Call Next Patient ({waitingPatients[0].token_number})</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Doctor's Active Queue List (Right Col - 5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-full">
            <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Clock className="w-5 h-5 text-teal-400" />
                <h3 className="font-bold text-sm tracking-wide">WAITING QUEUE</h3>
              </div>
              <span className="text-xs bg-slate-800 text-teal-300 font-bold px-2.5 py-0.5 rounded-full border border-slate-700">
                {waitingPatients.length} Waiting
              </span>
            </div>

            <div className="p-4 flex-1 overflow-y-auto max-h-[540px] space-y-2.5">
              {waitingPatients.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-sm italic">
                  No patients waiting in queue.
                </div>
              ) : (
                waitingPatients.map((item, idx) => (
                  <div
                    key={item.token_id}
                    className="p-3.5 rounded-xl border border-slate-200 hover:border-teal-400 bg-slate-50/60 hover:bg-white transition-all flex items-center justify-between gap-3 shadow-xs"
                  >
                    <div className="flex items-center space-x-3">
                      <span className="w-7 h-7 rounded-full bg-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center mono">
                        {idx + 1}
                      </span>
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-extrabold text-sm mono text-teal-800">{item.token_number}</span>
                          <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded uppercase ${
                            item.triage_level === 'EMERGENCY'
                              ? 'bg-red-100 text-red-800 border border-red-200 font-black'
                              : item.triage_level === 'URGENT'
                              ? 'bg-amber-100 text-amber-800 border border-amber-200'
                              : 'bg-slate-200 text-slate-700'
                          }`}>
                            {item.triage_level}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 font-medium truncate max-w-[160px]">{item.patient_name}</p>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-[11px] text-slate-500 font-semibold block">
                        Wait: ~{item.estimated_wait_time}m
                      </span>
                      <span className="text-[10px] text-teal-700 font-bold mono bg-teal-50 px-1.5 py-0.5 rounded border border-teal-200">
                        Score: {item.priority_score}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Quick Call Action footer */}
            {waitingPatients.length > 0 && !activeEncounter && (
              <div className="p-3 bg-slate-50 border-t border-slate-200">
                <button
                  onClick={handleCallNext}
                  className="w-full bg-teal-600 hover:bg-teal-700 text-white font-bold py-2.5 rounded-xl text-xs uppercase tracking-wider transition-all"
                >
                  Call Next Patient
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Complete Consultation Modal */}
      {isCompleteModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden">
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <FileText className="w-5 h-5 text-teal-400" />
                <h3 className="font-bold text-base">Complete Consultation & Save Clinical Rx</h3>
              </div>
              <button
                onClick={() => setIsCompleteModalOpen(false)}
                className="text-slate-400 hover:text-white font-bold"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              {/* Patient Header */}
              {activeEncounter && (
                <div className="p-3 bg-teal-50 border border-teal-200 rounded-xl flex items-center justify-between text-xs">
                  <div>
                    <span className="font-bold text-teal-900">{activeEncounter.patient_name}</span>
                    <span className="text-slate-500"> ({activeEncounter.uhid})</span>
                  </div>
                  <span className="font-black mono text-teal-800 bg-white px-2 py-0.5 rounded border border-teal-200">
                    {activeEncounter.token_number}
                  </span>
                </div>
              )}

              {/* Vitals */}
              <div>
                <label className="text-xs font-bold text-slate-600 uppercase">Patient Vitals</label>
                <div className="grid grid-cols-3 gap-3 mt-1">
                  <div>
                    <span className="text-[11px] text-slate-500">BP (mmHg)</span>
                    <input
                      type="text"
                      value={clinicalNotes.vitals_bp}
                      onChange={(e) => setClinicalNotes({ ...clinicalNotes, vitals_bp: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs font-medium focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-500">Pulse (bpm)</span>
                    <input
                      type="number"
                      value={clinicalNotes.vitals_pulse}
                      onChange={(e) => setClinicalNotes({ ...clinicalNotes, vitals_pulse: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs font-medium focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-500">Temp (°F)</span>
                    <input
                      type="text"
                      value={clinicalNotes.vitals_temp}
                      onChange={(e) => setClinicalNotes({ ...clinicalNotes, vitals_temp: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs font-medium focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                </div>
              </div>

              {/* Clinical Symptoms */}
              <div>
                <label className="text-xs font-bold text-slate-600 uppercase">Symptoms & Observations</label>
                <textarea
                  rows={2}
                  placeholder="Enter patient symptoms and clinical exam notes..."
                  value={clinicalNotes.symptoms}
                  onChange={(e) => setClinicalNotes({ ...clinicalNotes, symptoms: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-xs font-medium focus:ring-2 focus:ring-teal-500 mt-1"
                />
              </div>

              {/* Diagnosis */}
              <div>
                <label className="text-xs font-bold text-slate-600 uppercase">Provisional Diagnosis</label>
                <input
                  type="text"
                  placeholder="e.g. Acute bronchitis, Essential Hypertension..."
                  value={clinicalNotes.diagnosis}
                  onChange={(e) => setClinicalNotes({ ...clinicalNotes, diagnosis: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-xs font-medium focus:ring-2 focus:ring-teal-500 mt-1"
                />
              </div>

              {/* Prescription Notes */}
              <div>
                <label className="text-xs font-bold text-slate-600 uppercase">Prescription & Medication Orders</label>
                <textarea
                  rows={3}
                  placeholder="e.g. Tab. Azithromycin 500mg 1-0-0 x 5 days, Syrup Paracetamol 10ml TDS..."
                  value={clinicalNotes.prescription_notes}
                  onChange={(e) => setClinicalNotes({ ...clinicalNotes, prescription_notes: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-xs font-medium focus:ring-2 focus:ring-teal-500 mt-1"
                />
              </div>

              {/* Follow-up Date */}
              <div>
                <label className="text-xs font-bold text-slate-600 uppercase">Follow-up Date (Optional)</label>
                <input
                  type="date"
                  value={clinicalNotes.follow_up_date}
                  onChange={(e) => setClinicalNotes({ ...clinicalNotes, follow_up_date: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs font-medium focus:ring-2 focus:ring-teal-500 mt-1"
                />
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end space-x-3">
              <button
                onClick={() => setIsCompleteModalOpen(false)}
                className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                onClick={handleFinishConsultation}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/30"
              >
                Finalize & Free Doctor
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Transfer Queue Modal */}
      {isTransferModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden">
            <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between">
              <h3 className="font-bold text-sm">Transfer Doctor Queue</h3>
              <button onClick={() => setIsTransferModalOpen(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>
            <div className="p-5 space-y-4">
              <p className="text-xs text-slate-600">
                Transfer all <strong>{waitingPatients.length} waiting patient(s)</strong> from {currentDoctor?.doctor_name} to another doctor:
              </p>
              <div>
                <label className="text-xs font-bold text-slate-600 uppercase">Select Target Doctor:</label>
                <select
                  value={targetDoctorId}
                  onChange={(e) => setTargetDoctorId(e.target.value)}
                  className="w-full mt-1 bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-xs font-bold focus:ring-2 focus:ring-teal-500"
                >
                  <option value="">-- Choose Doctor --</option>
                  {doctors
                    .filter((d) => d.doctor_id !== Number(selectedDoctorId))
                    .map((d) => (
                      <option key={d.doctor_id} value={d.doctor_id}>
                        {d.doctor_name} ({d.dept_name} - {d.room_number})
                      </option>
                    ))}
                </select>
              </div>
            </div>
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end space-x-2">
              <button onClick={() => setIsTransferModalOpen(false)} className="px-3 py-1.5 text-xs font-semibold text-slate-600">
                Cancel
              </button>
              <button onClick={handleTransfer} className="px-4 py-1.5 bg-teal-600 text-white font-bold rounded-lg text-xs shadow">
                Execute Transfer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
