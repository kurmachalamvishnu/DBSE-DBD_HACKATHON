import React from 'react';
import { 
  Tv, 
  Stethoscope, 
  Ticket, 
  Smartphone, 
  BarChart3, 
  History, 
  Activity, 
  Wifi, 
  WifiOff,
  User,
  Calendar,
  LogIn,
  LogOut,
  Heart
} from 'lucide-react';

export default function Navbar({ 
  activeTab, 
  setActiveTab, 
  socketConnected, 
  loggedInPatient, 
  onOpenAuth, 
  onLogout 
}) {
  const patientNav = [
    { id: 'patient_portal', label: 'My Patient Portal', icon: User, highlight: true },
    { id: 'book_appointment', label: 'Book Appointment', icon: Calendar },
    { id: 'patient', label: 'Live Queue Tracker', icon: Smartphone },
  ];

  const hospitalNav = [
    { id: 'tv', label: 'TV Display Board', icon: Tv, badge: 'Live' },
    { id: 'doctor', label: 'Doctor Console', icon: Stethoscope },
    { id: 'reception', label: 'Reception & Kiosk', icon: Ticket },
    { id: 'analytics', label: 'Patient Health AI', icon: Heart },
    { id: 'history', label: 'Audit History', icon: History },
  ];

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo */}
          <div className="flex items-center space-x-3 cursor-pointer shrink-0" onClick={() => setActiveTab('patient_portal')}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-teal-600 to-emerald-500 flex items-center justify-center text-white shadow-md shadow-teal-500/20">
              <Activity className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-extrabold text-xl tracking-tight bg-gradient-to-r from-teal-700 to-emerald-600 bg-clip-text text-transparent">
                  CareQueue™
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider bg-teal-100 text-teal-800 px-1.5 py-0.5 rounded">
                  Pro v36
                </span>
              </div>
              <p className="text-[10px] text-slate-500 hidden sm:block">Intelligent Hospital & Patient Management System</p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center space-x-1 overflow-x-auto py-2">
            {/* Patient Links */}
            <div className="flex items-center space-x-1 pr-2 border-r border-slate-200">
              {patientNav.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                      isActive
                        ? 'bg-teal-600 text-white shadow-xs font-bold'
                        : item.highlight
                        ? 'text-teal-800 bg-teal-50 hover:bg-teal-100'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Hospital Staff & Operational Links */}
            <div className="flex items-center space-x-1 pl-2">
              {hospitalNav.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
                      isActive
                        ? 'bg-slate-900 text-white font-bold shadow-xs'
                        : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{item.label}</span>
                    {item.badge && (
                      <span className={`text-[9px] uppercase font-bold px-1 py-0.2 rounded ${
                        isActive ? 'bg-teal-500 text-white' : 'bg-emerald-100 text-emerald-800'
                      }`}>
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </nav>

          {/* Right Header: Patient Auth Pill & WebSocket Status */}
          <div className="flex items-center space-x-3">
            {loggedInPatient ? (
              <div className="flex items-center space-x-2 bg-slate-50 border border-slate-200 p-1.5 pl-3 rounded-2xl">
                <div className="flex items-center space-x-2 cursor-pointer" onClick={() => setActiveTab('patient_portal')}>
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  <div className="text-left">
                    <p className="text-xs font-bold text-slate-800 truncate max-w-[110px] sm:max-w-[150px]">
                      {loggedInPatient.full_name}
                    </p>
                    <p className="text-[10px] text-teal-700 mono font-semibold">{loggedInPatient.uhid}</p>
                  </div>
                </div>
                <button
                  onClick={onLogout}
                  className="p-1.5 rounded-xl hover:bg-red-50 text-slate-400 hover:text-red-600 transition-all"
                  title="Logout"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={onOpenAuth}
                className="flex items-center space-x-1.5 px-3.5 py-2 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white font-bold rounded-xl text-xs shadow-md shadow-teal-600/20 transition-all hover:scale-105"
              >
                <LogIn className="w-4 h-4" />
                <span>Patient Sign In / Register</span>
              </button>
            )}

            {/* Socket Status Dot */}
            <div className="hidden xl:flex items-center space-x-1 text-[11px] text-slate-400">
              {socketConnected ? (
                <span className="flex items-center gap-1 text-emerald-700">
                  <Wifi className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="font-semibold text-[10px]">Live</span>
                </span>
              ) : (
                <span className="flex items-center gap-1 text-amber-700">
                  <WifiOff className="w-3.5 h-3.5 text-amber-600" />
                  <span className="font-semibold text-[10px]">Syncing</span>
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Mobile Navigation Row (under header on small screens) */}
        <div className="flex md:hidden overflow-x-auto py-2 border-t border-slate-100 space-x-2 text-xs">
          {[...patientNav, ...hospitalNav].map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center space-x-1 px-3 py-1.5 rounded-lg whitespace-nowrap text-xs font-semibold ${
                  isActive ? 'bg-teal-600 text-white' : 'text-slate-600 bg-slate-50'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
}
