import React, { useState, useEffect } from 'react';
import { 
  User, 
  Lock, 
  Phone, 
  Mail, 
  Calendar, 
  Heart, 
  ShieldAlert, 
  CheckCircle, 
  UserPlus, 
  LogIn, 
  Zap, 
  X 
} from 'lucide-react';
import { loginPatient, registerPatient, getDemoPatients } from '../api';

export default function PatientAuthModal({ isOpen, onClose, onAuthSuccess }) {
  const [mode, setMode] = useState('login'); // 'login' or 'register'
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('patient123');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [demoPatients, setDemoPatients] = useState([]);

  // Register Form Data
  const [registerData, setRegisterData] = useState({
    full_name: '',
    phone: '',
    email: '',
    password: 'patient123',
    dob: '1995-05-15',
    gender: 'Male',
    blood_group: 'O+',
    category: 'GENERAL',
    emergency_contact: '',
    allergies: ''
  });

  useEffect(() => {
    if (isOpen) {
      getDemoPatients()
        .then((res) => {
          if (res.data.success) setDemoPatients(res.data.data);
        })
        .catch((e) => console.debug('Demo patients fetch error:', e));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await loginPatient(identifier, password);
      if (res.data.success) {
        onAuthSuccess(res.data.data.patient);
        onClose();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Please check credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = (p) => {
    setIdentifier(p.uhid);
    setPassword('patient123');
    loginPatient(p.uhid, 'patient123')
      .then((res) => {
        if (res.data.success) {
          onAuthSuccess(res.data.data.patient);
          onClose();
        }
      })
      .catch((err) => setError(err.message));
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await registerPatient(registerData);
      if (res.data.success) {
        onAuthSuccess(res.data.data.patient);
        onClose();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in duration-200">
        {/* Modal Top Header */}
        <div className="bg-gradient-to-r from-teal-700 to-emerald-700 text-white p-6 relative">
          <button
            onClick={onClose}
            className="absolute top-5 right-5 text-white/80 hover:text-white p-1 rounded-full hover:bg-white/10 transition-all"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-white shadow-inner">
              <User className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[11px] font-extrabold uppercase tracking-widest text-teal-200">
                Patient Portal Access
              </span>
              <h2 className="text-xl font-black tracking-tight text-white">
                {mode === 'login' ? 'Sign In to Your Account' : 'Register New Patient Profile'}
              </h2>
            </div>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="flex bg-teal-900/40 p-1 rounded-xl mt-5 border border-white/10 text-xs font-bold">
            <button
              onClick={() => { setMode('login'); setError(null); }}
              className={`flex-1 py-2 rounded-lg transition-all ${
                mode === 'login' ? 'bg-white text-teal-900 shadow-sm' : 'text-teal-100 hover:text-white'
              }`}
            >
              Sign In (Existing Patient)
            </button>
            <button
              onClick={() => { setMode('register'); setError(null); }}
              className={`flex-1 py-2 rounded-lg transition-all ${
                mode === 'register' ? 'bg-white text-teal-900 shadow-sm' : 'text-teal-100 hover:text-white'
              }`}
            >
              New Patient Registration
            </button>
          </div>
        </div>

        <div className="p-6 max-h-[72vh] overflow-y-auto space-y-5">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-semibold flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-red-500 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {mode === 'login' ? (
            /* Login Form */
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 uppercase block mb-1">
                  Universal Health ID (UHID), Phone, or Email
                </label>
                <div className="relative">
                  <User className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. UHID-2026-001 or +91 91234 56780"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 uppercase block mb-1">
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  />
                </div>
                <span className="text-[10px] text-slate-400 mt-1 block">Default demo password: <code>patient123</code></span>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center space-x-2 py-3 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-bold text-xs uppercase tracking-wider shadow-lg shadow-teal-600/30 transition-all"
              >
                <LogIn className="w-4 h-4" />
                <span>{loading ? 'Authenticating...' : 'Sign In to Portal'}</span>
              </button>

              {/* 1-Click Demo Logins for Examiner / User */}
              <div className="pt-3 border-t border-slate-100 space-y-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                  <Zap className="w-3.5 h-3.5 text-amber-500" />
                  1-Click Quick Demo Patient Logins:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {demoPatients.map((p) => (
                    <button
                      key={p.patient_id}
                      type="button"
                      onClick={() => handleDemoLogin(p)}
                      className="p-2.5 rounded-xl border border-slate-200 hover:border-teal-400 bg-slate-50 hover:bg-teal-50/50 text-left transition-all"
                    >
                      <span className="font-bold text-xs text-slate-800 block truncate">{p.full_name}</span>
                      <span className="text-[10px] text-teal-700 mono font-semibold block">{p.uhid}</span>
                      <span className="text-[9px] text-slate-400 block">{p.category}</span>
                    </button>
                  ))}
                </div>
              </div>
            </form>
          ) : (
            /* Register Form */
            <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
              <div>
                <label className="text-xs font-bold text-slate-700 uppercase block mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Radhika Sharma"
                  value={registerData.full_name}
                  onChange={(e) => setRegisterData({ ...registerData, full_name: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-teal-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 uppercase block mb-1">Phone *</label>
                  <input
                    type="tel"
                    required
                    placeholder="+91 98765 43210"
                    value={registerData.phone}
                    onChange={(e) => setRegisterData({ ...registerData, phone: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 uppercase block mb-1">Date of Birth *</label>
                  <input
                    type="date"
                    required
                    value={registerData.dob}
                    onChange={(e) => setRegisterData({ ...registerData, dob: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 uppercase block mb-1">Gender *</label>
                  <select
                    value={registerData.gender}
                    onChange={(e) => setRegisterData({ ...registerData, gender: e.target.value })}
                    className="w-full px-2.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 uppercase block mb-1">Blood Group</label>
                  <select
                    value={registerData.blood_group}
                    onChange={(e) => setRegisterData({ ...registerData, blood_group: e.target.value })}
                    className="w-full px-2.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  >
                    {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(bg => (
                      <option key={bg} value={bg}>{bg}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 uppercase block mb-1">Category</label>
                  <select
                    value={registerData.category}
                    onChange={(e) => setRegisterData({ ...registerData, category: e.target.value })}
                    className="w-full px-2.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  >
                    <option value="GENERAL">General</option>
                    <option value="SENIOR_CITIZEN">Senior (65+)</option>
                    <option value="PEDIATRIC">Pediatric (&lt;12)</option>
                    <option value="PREGNANT">Pregnant</option>
                    <option value="PERSON_WITH_DISABILITY">PWD</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 uppercase block mb-1">Email</label>
                  <input
                    type="email"
                    placeholder="name@gmail.com"
                    value={registerData.email}
                    onChange={(e) => setRegisterData({ ...registerData, email: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 uppercase block mb-1">Password</label>
                  <input
                    type="password"
                    required
                    value={registerData.password}
                    onChange={(e) => setRegisterData({ ...registerData, password: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 uppercase block mb-1">Known Allergies</label>
                <input
                  type="text"
                  placeholder="e.g. Penicillin, Sulfa, Dust, None"
                  value={registerData.allergies}
                  onChange={(e) => setRegisterData({ ...registerData, allergies: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-teal-500 focus:outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center space-x-2 py-3 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-bold text-xs uppercase tracking-wider shadow-lg shadow-teal-600/30 transition-all mt-4"
              >
                <UserPlus className="w-4 h-4" />
                <span>{loading ? 'Registering...' : 'Create Profile & Generate UHID'}</span>
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
