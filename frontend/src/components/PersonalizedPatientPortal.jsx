import React, { useState, useEffect } from 'react';
import { 
  User, 
  Calendar, 
  Clock, 
  FileText, 
  Ticket, 
  Stethoscope, 
  CheckCircle2, 
  AlertCircle, 
  Heart, 
  MapPin, 
  ShieldAlert, 
  Activity, 
  RefreshCw, 
  Plus, 
  Printer, 
  LogOut, 
  Sparkles,
  BellRing
} from 'lucide-react';
import { getPatientProfile, cancelAppointment, checkInAppointment } from '../api';
import BookAppointmentModal from './BookAppointmentModal';

export default function PersonalizedPatientPortal({ 
  patient, 
  onLogout, 
  onOpenBookAppointment, 
  liveCallingEvent 
}) {
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview'); // 'overview', 'appointments', 'records'
  const [isBookModalOpen, setIsBookModalOpen] = useState(false);

  const loadProfile = async () => {
    if (!patient?.patient_id) return;
    setLoading(true);
    try {
      const res = await getPatientProfile(patient.patient_id);
      if (res.data.success) {
        setProfileData(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load patient profile:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, [patient?.patient_id]);

  // Real-time refresh when WebSocket calling event happens
  useEffect(() => {
    if (liveCallingEvent && profileData?.active_token && liveCallingEvent.tokenNumber === profileData.active_token.token_number) {
      loadProfile();
    }
  }, [liveCallingEvent]);

  const handleCancelApt = async (aptId) => {
    if (!confirm('Are you sure you want to cancel this appointment?')) return;
    try {
      await cancelAppointment(aptId);
      loadProfile();
    } catch (err) {
      alert(`Error cancelling appointment: ${err.message}`);
    }
  };

  const handleCheckinApt = async (aptId) => {
    try {
      const res = await checkInAppointment(aptId);
      if (res.data.success) {
        alert(`Checked in successfully! Your Token is ${res.data.data.token_number}`);
        loadProfile();
      }
    } catch (err) {
      alert(`Check-in failed: ${err.response?.data?.message || err.message}`);
    }
  };

  const activeToken = profileData?.active_token;
  const appointments = profileData?.appointments || [];
  const consultations = profileData?.consultations || [];
  const patientBio = profileData?.patient || patient;

  const upcomingApts = appointments.filter(a => a.status === 'SCHEDULED' || a.status === 'CHECKED_IN');
  const pastApts = appointments.filter(a => a.status === 'COMPLETED' || a.status === 'CANCELLED');

  return (
    <div className="space-y-6">
      {/* Personalized Welcome Hero Banner */}
      <div className="bg-gradient-to-r from-teal-800 via-teal-700 to-emerald-700 text-white rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex flex-wrap items-center justify-between gap-6">
          <div className="flex items-center space-x-4 sm:space-x-5">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-white text-2xl font-black shadow-inner">
              {patientBio.full_name?.charAt(0) || 'P'}
            </div>
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[11px] font-extrabold uppercase tracking-widest bg-teal-900/60 text-teal-200 border border-teal-500/30 px-2.5 py-0.5 rounded-full">
                  Verified Patient Portal
                </span>
                <span className="text-[11px] font-bold uppercase bg-white/20 text-white px-2.5 py-0.5 rounded-full">
                  {patientBio.category}
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
                Welcome back, {patientBio.full_name}! 👋
              </h1>
              <div className="flex flex-wrap items-center gap-3 text-xs text-teal-100">
                <span className="mono font-bold bg-teal-950/40 px-2 py-0.5 rounded border border-white/10">
                  {patientBio.uhid}
                </span>
                <span>•</span>
                <span>DOB: {patientBio.dob}</span>
                <span>•</span>
                <span>Blood: <strong>{patientBio.blood_group || 'O+'}</strong></span>
                <span>•</span>
                <span>Phone: {patientBio.phone}</span>
              </div>
            </div>
          </div>

          {/* Header Action Buttons */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => setIsBookModalOpen(true)}
              className="flex items-center space-x-2 px-5 py-3 bg-white hover:bg-teal-50 text-teal-900 font-extrabold rounded-2xl text-xs uppercase tracking-wider shadow-lg shadow-black/10 transition-all hover:scale-105"
            >
              <Calendar className="w-4 h-4 text-teal-700" />
              <span>Book Appointment</span>
            </button>

            <button
              onClick={loadProfile}
              className="p-3 bg-teal-900/50 hover:bg-teal-900 text-teal-200 hover:text-white rounded-2xl border border-white/10 transition-all"
              title="Refresh Dashboard"
            >
              <RefreshCw className="w-4 h-4" />
            </button>

            <button
              onClick={onLogout}
              className="flex items-center space-x-1 px-4 py-3 bg-teal-900/40 hover:bg-red-500/80 text-teal-200 hover:text-white rounded-2xl border border-white/10 text-xs font-bold transition-all"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>

        {/* Allergy Warning Banner */}
        {patientBio.allergies && (
          <div className="relative z-10 mt-5 bg-red-950/40 border border-red-400/30 rounded-xl px-4 py-2 flex items-center space-x-2 text-xs text-red-200">
            <ShieldAlert className="w-4 h-4 text-red-400 shrink-0" />
            <span><strong>Clinical Allergy Warning:</strong> {patientBio.allergies}</span>
          </div>
        )}
      </div>

      {/* Hero Widget: Active Token Today (if currently waiting or called) */}
      {activeToken ? (
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-700">
                <Ticket className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-teal-700">
                  Live Queue Tracker Today
                </span>
                <h3 className="text-lg font-black text-slate-800">Your Active Consultation Token</h3>
              </div>
            </div>

            <span className={`px-3.5 py-1.5 rounded-full text-xs font-black uppercase tracking-wider ${
              activeToken.status === 'CALLED'
                ? 'bg-amber-100 text-amber-900 border border-amber-300 animate-bounce'
                : activeToken.status === 'IN_CONSULTATION'
                ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                : 'bg-teal-100 text-teal-900 border border-teal-300'
            }`}>
              {activeToken.status === 'CALLED' ? '🔔 NOW BEING CALLED!' : activeToken.status.replace('_', ' ')}
            </span>
          </div>

          {/* Urgent Call Alert Banner */}
          {activeToken.status === 'CALLED' && (
            <div className="bg-amber-500 text-slate-900 rounded-2xl p-5 shadow-lg flex items-center space-x-4">
              <BellRing className="w-8 h-8 shrink-0 text-slate-900 animate-bounce" />
              <div>
                <h4 className="font-black text-lg">YOUR TOKEN HAS BEEN CALLED!</h4>
                <p className="text-xs font-bold text-amber-950">
                  Please proceed immediately to <strong>{activeToken.room_number}</strong> to see {activeToken.doctor_name}.
                </p>
              </div>
            </div>
          )}

          {/* Token Big Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-5 rounded-2xl bg-teal-50/70 border border-teal-200 text-center sm:text-left">
              <span className="text-xs font-bold uppercase tracking-wider text-teal-800">Your Token</span>
              <p className="text-4xl sm:text-5xl font-black mono text-teal-950 mt-1">
                {activeToken.token_number}
              </p>
              <span className="text-[11px] font-semibold text-teal-700 block mt-1">
                Triage Priority: {activeToken.triage_level}
              </span>
            </div>

            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 text-center sm:text-left">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Patients Ahead</span>
              <p className="text-4xl sm:text-5xl font-black mono text-slate-800 mt-1">
                {activeToken.status === 'WAITING' ? activeToken.patients_ahead : 0}
              </p>
              <span className="text-[11px] text-slate-500 block mt-1">
                {activeToken.patients_ahead === 0 && activeToken.status === 'WAITING' ? 'You are next in line!' : 'Ahead in priority queue'}
              </span>
            </div>

            <div className="p-5 rounded-2xl bg-gradient-to-br from-teal-500/10 to-emerald-500/10 border border-teal-200 text-center sm:text-left">
              <span className="text-xs font-bold uppercase tracking-wider text-teal-800 flex items-center gap-1 justify-center sm:justify-start">
                <Sparkles className="w-4 h-4 text-teal-600" />
                AI Estimated Wait Time
              </span>
              <p className="text-4xl sm:text-5xl font-black mono text-teal-900 mt-1">
                ~{activeToken.status === 'WAITING' ? activeToken.estimated_wait_time : 0}m
              </p>
              <span className="text-[11px] text-teal-700 block mt-1">
                Little's Law + Random Forest Engine
              </span>
            </div>
          </div>

          {/* Consulting Doctor & Room */}
          <div className="bg-slate-900 text-white p-5 rounded-2xl flex flex-wrap items-center justify-between gap-4">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Consulting Physician</span>
              <h4 className="text-lg font-bold text-white">{activeToken.doctor_name}</h4>
              <p className="text-xs text-slate-300">Department of {activeToken.dept_name}</p>
            </div>
            <div className="text-right">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Room Location</span>
              <p className="text-2xl font-black mono text-teal-400">{activeToken.room_number}</p>
              <span className="text-[11px] text-slate-400">Doctor Status: {activeToken.doctor_status}</span>
            </div>
          </div>
        </div>
      ) : (
        /* No active token state */
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400">
              <Ticket className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-800">No Active Queue Token Today</h3>
              <p className="text-xs text-slate-500">Book an appointment or check-in to join the outpatient queue.</p>
            </div>
          </div>
          <button
            onClick={() => setIsBookModalOpen(true)}
            className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold shadow-md shadow-teal-600/20"
          >
            + Book Appointment
          </button>
        </div>
      )}

      {/* Main Tabs Navigation: Appointments vs Medical Records */}
      <div className="flex border-b border-slate-200 space-x-4 text-xs font-bold">
        <button
          onClick={() => setActiveTab('overview')}
          className={`pb-3 border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'overview' ? 'border-teal-600 text-teal-700' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>My Appointments ({appointments.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('records')}
          className={`pb-3 border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'records' ? 'border-teal-600 text-teal-700' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>My Prescriptions & Medical Records ({consultations.length})</span>
        </button>
      </div>

      {/* Tab 1: Appointments */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Upcoming Section */}
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-base text-slate-800 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-teal-600" />
                Upcoming Scheduled Appointments
              </h3>
              <button
                onClick={() => setIsBookModalOpen(true)}
                className="text-xs text-teal-700 font-bold hover:underline flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> Book Another
              </button>
            </div>

            {upcomingApts.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-xs italic">
                You have no upcoming appointments scheduled.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {upcomingApts.map((apt) => (
                  <div
                    key={apt.appointment_id}
                    className="p-5 rounded-2xl border border-slate-200 bg-slate-50/70 hover:bg-white hover:border-teal-300 transition-all space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-black mono text-xs text-teal-900 bg-white px-2 py-0.5 rounded border border-slate-200">
                        {apt.appointment_number}
                      </span>
                      <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                        apt.status === 'CHECKED_IN' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {apt.status}
                      </span>
                    </div>

                    <div>
                      <h4 className="font-bold text-slate-800 text-sm">{apt.doctor_name}</h4>
                      <p className="text-xs text-slate-500">{apt.room_number} • {apt.dept_name}</p>
                      <p className="text-xs text-slate-700 mt-2 font-medium">
                        <strong>Date & Time:</strong> {apt.scheduled_date} at {apt.time_slot}
                      </p>
                      {apt.reason_for_visit && (
                        <p className="text-[11px] text-slate-400 italic mt-0.5">
                          "{apt.reason_for_visit}"
                        </p>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 pt-2 border-t border-slate-200">
                      {apt.status === 'SCHEDULED' && (
                        <>
                          <button
                            onClick={() => handleCheckinApt(apt.appointment_id)}
                            className="flex-1 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all"
                          >
                            Check In & Get Token
                          </button>
                          <button
                            onClick={() => handleCancelApt(apt.appointment_id)}
                            className="px-3 py-2 border border-slate-300 hover:bg-red-50 hover:text-red-600 text-slate-600 rounded-xl text-xs font-semibold transition-all"
                          >
                            Cancel
                          </button>
                        </>
                      )}
                      {apt.status === 'CHECKED_IN' && (
                        <span className="text-xs font-bold text-emerald-700 flex items-center gap-1">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          Checked In (Token Active)
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Past Appointments Section */}
          {pastApts.length > 0 && (
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 space-y-4">
              <h3 className="font-bold text-base text-slate-800">Past Appointment History</h3>
              <div className="divide-y divide-slate-100 text-xs">
                {pastApts.map((apt) => (
                  <div key={apt.appointment_id} className="py-3 flex items-center justify-between">
                    <div>
                      <span className="font-bold text-slate-800">{apt.doctor_name} ({apt.dept_name})</span>
                      <span className="text-slate-400 block text-[11px]">{apt.scheduled_date} at {apt.time_slot}</span>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                      apt.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'
                    }`}>
                      {apt.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Medical Records & Prescriptions */}
      {activeTab === 'records' && (
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-base text-slate-800 flex items-center gap-2">
              <FileText className="w-4 h-4 text-teal-600" />
              Clinical Consultation Records & Prescriptions
            </h3>
            <span className="text-xs text-slate-400 font-semibold">{consultations.length} Encounter(s) Recorded</span>
          </div>

          {consultations.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs italic">
              No completed clinical consultation encounters on record yet.
            </div>
          ) : (
            <div className="space-y-4">
              {consultations.map((c) => (
                <div
                  key={c.session_id}
                  className="p-6 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-4 hover:border-teal-300 transition-all"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-3">
                    <div>
                      <span className="font-bold text-sm text-slate-800">{c.doctor_name}</span>
                      <span className="text-xs text-slate-500"> ({c.qualification}) • {c.dept_name}</span>
                    </div>
                    <div className="text-right">
                      <span className="font-black mono text-xs text-teal-800 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                        Token #{c.token_number}
                      </span>
                      <span className="text-[11px] text-slate-400 block">{new Date(c.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>

                  {/* Vitals Grid */}
                  <div className="grid grid-cols-3 gap-3 bg-white p-3 rounded-xl border border-slate-200 text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-semibold">Blood Pressure</span>
                      <p className="font-bold mono text-slate-800">{c.vitals_bp || '120/80'} mmHg</p>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-semibold">Pulse Rate</span>
                      <p className="font-bold mono text-slate-800">{c.vitals_pulse || '72'} bpm</p>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-semibold">Body Temp</span>
                      <p className="font-bold mono text-slate-800">{c.vitals_temp || '98.6'} °F</p>
                    </div>
                  </div>

                  {/* Diagnosis */}
                  {c.diagnosis && (
                    <div className="text-xs">
                      <span className="text-[11px] font-bold text-slate-500 uppercase">Diagnosis:</span>
                      <p className="font-bold text-slate-900 mt-0.5">{c.diagnosis}</p>
                    </div>
                  )}

                  {/* Prescription Orders */}
                  {c.prescription_notes && (
                    <div className="bg-teal-50/80 border border-teal-200 rounded-xl p-4 text-xs space-y-1">
                      <span className="text-[11px] font-extrabold uppercase tracking-wider text-teal-900 block">
                        Prescribed Medications & Clinical Advice:
                      </span>
                      <p className="text-slate-800 whitespace-pre-line font-medium leading-relaxed">
                        {c.prescription_notes}
                      </p>
                    </div>
                  )}

                  {c.follow_up_date && (
                    <p className="text-xs text-slate-500">
                      <strong>Recommended Follow-up:</strong> {c.follow_up_date}
                    </p>
                  )}

                  <div className="flex justify-end pt-2">
                    <button
                      onClick={() => window.print()}
                      className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-xs font-bold transition-all"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>Print Prescription</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Book Appointment Modal */}
      <BookAppointmentModal
        isOpen={isBookModalOpen}
        onClose={() => setIsBookModalOpen(false)}
        currentPatient={patientBio}
        onAppointmentBooked={loadProfile}
      />
    </div>
  );
}
