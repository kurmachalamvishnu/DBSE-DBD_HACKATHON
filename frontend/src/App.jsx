import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import PersonalizedPatientPortal from './components/PersonalizedPatientPortal';
import BookAppointmentModal from './components/BookAppointmentModal';
import PatientAuthModal from './components/PatientAuthModal';
import TVDisplayBoard from './components/TVDisplayBoard';
import DoctorConsole from './components/DoctorConsole';
import ReceptionKiosk from './components/ReceptionKiosk';
import PatientTracker from './components/PatientTracker';
import AnalyticsDashboard from './components/AnalyticsDashboard';
import QueueHistoryView from './components/QueueHistoryView';
import { socket } from './socket';

export default function App() {
  const [activeTab, setActiveTab] = useState('patient_portal');
  const [socketConnected, setSocketConnected] = useState(socket.connected);
  const [liveCallingEvent, setLiveCallingEvent] = useState(null);
  const [toastNotification, setToastNotification] = useState(null);

  // Patient Authentication State
  const [loggedInPatient, setLoggedInPatient] = useState(() => {
    try {
      const saved = localStorage.getItem('carequeue_patient');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isBookModalOpen, setIsBookModalOpen] = useState(false);

  useEffect(() => {
    function onConnect() {
      console.log('[App] WebSocket Connected');
      setSocketConnected(true);
    }
    function onDisconnect() {
      console.log('[App] WebSocket Disconnected');
      setSocketConnected(false);
    }
    function onTokenCalled(data) {
      console.log('[App] Real-time event: token:called', data);
      setLiveCallingEvent(data);
      showToast(`📢 Token ${data.tokenNumber} called to ${data.roomNumber} (${data.doctorName})`, 'calling');
    }
    function onTokenIssued(data) {
      console.log('[App] Real-time event: token:issued', data);
      showToast(`🎟️ New Token Issued: ${data.token_number} (${data.patient_name})`, 'info');
    }

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('token:called', onTokenCalled);
    socket.on('token:issued', onTokenIssued);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('token:called', onTokenCalled);
      socket.off('token:issued', onTokenIssued);
    };
  }, []);

  const showToast = (message, type = 'info') => {
    setToastNotification({ message, type });
    setTimeout(() => {
      setToastNotification(null);
    }, 6000);
  };

  const handleAuthSuccess = (patient) => {
    setLoggedInPatient(patient);
    localStorage.setItem('carequeue_patient', JSON.stringify(patient));
    showToast(`Welcome back, ${patient.full_name}!`, 'info');
  };

  const handleLogout = () => {
    setLoggedInPatient(null);
    localStorage.removeItem('carequeue_patient');
    showToast('Signed out successfully.', 'info');
  };

  // If user clicks "Book Appointment" tab, check auth
  const handleTabChange = (tabId) => {
    if (tabId === 'book_appointment') {
      if (!loggedInPatient) {
        setIsAuthModalOpen(true);
      } else {
        setIsBookModalOpen(true);
      }
      return;
    }
    setActiveTab(tabId);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col selection:bg-teal-500 selection:text-white">
      {/* Toast Notification Banner */}
      {toastNotification && (
        <div className={`fixed bottom-6 right-6 z-50 px-5 py-3.5 rounded-2xl shadow-2xl text-xs font-bold text-white flex items-center space-x-3 transition-all animate-in slide-in-from-bottom duration-300 ${
          toastNotification.type === 'calling' ? 'bg-amber-600 ring-4 ring-amber-400/50' : 'bg-slate-900 border border-slate-700'
        }`}>
          <span>{toastNotification.message}</span>
          <button onClick={() => setToastNotification(null)} className="ml-2 text-white/70 hover:text-white">✕</button>
        </div>
      )}

      {/* Navigation Header */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={handleTabChange}
        socketConnected={socketConnected}
        loggedInPatient={loggedInPatient}
        onOpenAuth={() => setIsAuthModalOpen(true)}
        onLogout={handleLogout}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Patient Portal (Default View) */}
        {activeTab === 'patient_portal' && (
          loggedInPatient ? (
            <PersonalizedPatientPortal
              patient={loggedInPatient}
              onLogout={handleLogout}
              onOpenBookAppointment={() => setIsBookModalOpen(true)}
              liveCallingEvent={liveCallingEvent}
            />
          ) : (
            /* Unauthenticated Visitor Hero / Intro */
            <div className="space-y-8">
              <div className="bg-gradient-to-r from-teal-800 via-teal-700 to-emerald-700 text-white rounded-3xl p-8 sm:p-12 shadow-xl text-center space-y-6 relative overflow-hidden">
                <div className="max-w-2xl mx-auto space-y-4">
                  <span className="text-xs font-extrabold uppercase tracking-widest bg-white/20 px-3 py-1 rounded-full text-teal-100">
                    Patient-First Healthcare Experience
                  </span>
                  <h1 className="text-3xl sm:text-5xl font-black tracking-tight leading-tight">
                    Your Personalized Healthcare Portal & Queue Tracker
                  </h1>
                  <p className="text-sm sm:text-base text-teal-100 font-medium">
                    Sign in to book doctor appointments, track your live queue token with AI-estimated wait times, and access your clinical prescriptions.
                  </p>
                </div>

                <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
                  <button
                    onClick={() => setIsAuthModalOpen(true)}
                    className="px-8 py-3.5 bg-white hover:bg-teal-50 text-teal-900 font-black rounded-2xl text-sm shadow-xl transition-all hover:scale-105"
                  >
                    Patient Sign In / Register
                  </button>
                  <button
                    onClick={() => setActiveTab('tv')}
                    className="px-6 py-3.5 bg-teal-900/60 hover:bg-teal-900 text-white font-bold rounded-2xl text-sm border border-white/20 transition-all"
                  >
                    Watch Live Waiting Room TV
                  </button>
                </div>
              </div>

              {/* Feature Highlights Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-teal-50 text-teal-700 flex items-center justify-center font-bold">
                    📅
                  </div>
                  <h3 className="font-extrabold text-slate-800 text-base">Interactive Appointment Booking</h3>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Select department, doctor, and live available morning or afternoon slots. Instant booking with automated reminders.
                  </p>
                </div>

                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
                    ⏱️
                  </div>
                  <h3 className="font-extrabold text-slate-800 text-base">Python AI Wait Time Prediction</h3>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Powered by Little's Law and Random Forest Regression ($R^2=98.97\%$). Real-time countdown on your mobile device.
                  </p>
                </div>

                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold">
                    📋
                  </div>
                  <h3 className="font-extrabold text-slate-800 text-base">Digital Prescriptions & Records</h3>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Immediate access to clinical notes, recorded vitals (BP, pulse, temp), diagnoses, and printable prescription slips.
                  </p>
                </div>
              </div>
            </div>
          )
        )}

        {/* Public & Staff Tabs */}
        {activeTab === 'tv' && <TVDisplayBoard liveCallingEvent={liveCallingEvent} />}
        {activeTab === 'doctor' && <DoctorConsole onActionTriggered={() => {}} />}
        {activeTab === 'reception' && <ReceptionKiosk onTokenIssued={() => {}} />}
        {activeTab === 'patient' && <PatientTracker liveCallingEvent={liveCallingEvent} />}
        {activeTab === 'analytics' && <AnalyticsDashboard loggedInPatient={loggedInPatient} />}
        {activeTab === 'history' && <QueueHistoryView />}
      </main>

      {/* Patient Authentication Modal */}
      <PatientAuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onAuthSuccess={handleAuthSuccess}
      />

      {/* Appointment Booking Modal */}
      <BookAppointmentModal
        isOpen={isBookModalOpen}
        onClose={() => setIsBookModalOpen(false)}
        currentPatient={loggedInPatient}
        onAppointmentBooked={() => {
          showToast('Appointment booked successfully!', 'info');
        }}
      />

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-4 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-wrap items-center justify-between text-xs text-slate-500 gap-2">
          <p>© 2026 CareQueue™ Healthcare Platform • Project 36 (DBSE_DBD)</p>
          <div className="flex items-center space-x-3">
            <span>Personalized Patient Portal</span>
            <span>•</span>
            <span>Appointment Scheduling</span>
            <span>•</span>
            <span>AI Wait Time Engine</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
