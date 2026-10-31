import React, { useState, useEffect } from 'react';
import { 
  Smartphone, 
  Search, 
  Clock, 
  User, 
  MapPin, 
  CheckCircle2, 
  AlertCircle, 
  Sparkles,
  ArrowRight,
  RefreshCw,
  BellRing
} from 'lucide-react';
import { getTokenStatus } from '../api';

export default function PatientTracker({ liveCallingEvent }) {
  const [tokenInput, setTokenInput] = useState('CARD-102');
  const [tokenData, setTokenData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastRefreshed, setLastRefreshed] = useState(null);

  const fetchStatus = async (tokenNum) => {
    if (!tokenNum) return;
    setLoading(true);
    setError(null);
    try {
      const res = await getTokenStatus(tokenNum.trim().toUpperCase());
      if (res.data.success) {
        setTokenData(res.data.data);
        setLastRefreshed(new Date().toLocaleTimeString());
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Token not found for today. Please check token number.');
      setTokenData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus(tokenInput);
  }, []);

  // Auto-refresh if this token was called via WebSocket
  useEffect(() => {
    if (liveCallingEvent && tokenData && liveCallingEvent.tokenNumber === tokenData.token_number) {
      fetchStatus(tokenData.token_number);
    }
  }, [liveCallingEvent]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchStatus(tokenInput);
  };

  // Compute status step (1 to 5)
  const getStepNumber = (status) => {
    switch (status) {
      case 'WAITING': return 2;
      case 'CALLED': return 3;
      case 'IN_CONSULTATION': return 4;
      case 'COMPLETED': return 5;
      case 'SKIPPED':
      case 'CANCELLED': return 0;
      default: return 1;
    }
  };

  const currentStep = tokenData ? getStepNumber(tokenData.status) : 1;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Mobile Portal Mock Header */}
      <div className="bg-gradient-to-r from-teal-700 to-emerald-700 text-white rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
        <div className="relative z-10 space-y-3">
          <div className="flex items-center space-x-2 text-teal-200 text-xs font-bold uppercase tracking-wider">
            <Smartphone className="w-4 h-4" />
            <span>Patient Self-Service Queue Tracker</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
            Track Your Healthcare Queue Position
          </h1>
          <p className="text-teal-100 text-xs sm:text-sm max-w-lg">
            Stay comfortable in the cafeteria, waiting lounge, or parking. Get real-time updates on your phone.
          </p>
        </div>

        {/* Search Bar Form */}
        <form onSubmit={handleSearchSubmit} className="relative z-10 mt-6 flex gap-2">
          <div className="relative flex-1">
            <Search className="w-5 h-5 absolute left-3.5 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Enter your Token Number (e.g. CARD-102, ORTH-101)..."
              value={tokenInput}
              onChange={(e) => setTokenInput(e.target.value.toUpperCase())}
              className="w-full pl-11 pr-4 py-3 bg-white text-slate-800 font-bold mono text-sm rounded-2xl border-0 shadow-lg focus:ring-4 focus:ring-teal-300 focus:outline-none"
            />
          </div>
          <button
            type="submit"
            className="px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-2xl text-xs uppercase tracking-wider shadow-lg transition-all"
          >
            Track Now
          </button>
        </form>
      </div>

      {loading && (
        <div className="text-center py-10">
          <div className="w-10 h-10 border-4 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-xs text-slate-500 mt-2 font-semibold">Fetching live queue telemetry...</p>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-5 text-center space-y-2">
          <AlertCircle className="w-8 h-8 text-red-500 mx-auto" />
          <h3 className="font-bold text-red-800 text-sm">Token Lookup Failed</h3>
          <p className="text-xs text-red-600">{error}</p>
        </div>
      )}

      {tokenData && !loading && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200 space-y-8">
          {/* Header Card: Token & Status Banner */}
          <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-slate-100">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">YOUR TOKEN</span>
              <p className="text-4xl sm:text-5xl font-black mono text-teal-800 tracking-tight">
                {tokenData.token_number}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Patient: <span className="font-bold text-slate-800">{tokenData.patient_name}</span> ({tokenData.uhid})
              </p>
            </div>

            <div className="text-right">
              <span className={`inline-block px-3.5 py-1.5 rounded-full text-xs font-black uppercase tracking-wider ${
                tokenData.status === 'CALLED'
                  ? 'bg-amber-100 text-amber-800 border border-amber-300 animate-pulse text-sm'
                  : tokenData.status === 'IN_CONSULTATION'
                  ? 'bg-teal-100 text-teal-800 border border-teal-300'
                  : tokenData.status === 'COMPLETED'
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                  : 'bg-slate-100 text-slate-800 border border-slate-200'
              }`}>
                {tokenData.status === 'CALLED' ? '🔔 YOU ARE BEING CALLED!' : tokenData.status.replace('_', ' ')}
              </span>
              {lastRefreshed && (
                <p className="text-[11px] text-slate-400 mt-1 flex items-center justify-end gap-1">
                  <RefreshCw className="w-3 h-3" /> Updated at {lastRefreshed}
                </p>
              )}
            </div>
          </div>

          {/* Urgent Call Alert Banner */}
          {tokenData.status === 'CALLED' && (
            <div className="bg-amber-500 text-slate-900 rounded-2xl p-5 shadow-lg animate-bounce flex items-center space-x-4">
              <BellRing className="w-8 h-8 shrink-0 text-slate-900" />
              <div>
                <h3 className="font-black text-lg">YOUR TOKEN HAS BEEN CALLED!</h3>
                <p className="text-xs font-bold text-amber-950">
                  Please proceed immediately to <strong>{tokenData.room_number}</strong> to see {tokenData.doctor_name}.
                </p>
              </div>
            </div>
          )}

          {/* 5-Step Visual Timeline */}
          <div className="space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Live Progress Track</span>
            <div className="grid grid-cols-5 gap-2 text-center text-xs">
              {[
                { step: 1, label: 'Issued' },
                { step: 2, label: 'Waiting Lounge' },
                { step: 3, label: 'Called to Room' },
                { step: 4, label: 'In Consultation' },
                { step: 5, label: 'Completed' },
              ].map((s) => {
                const isPassed = currentStep >= s.step;
                const isCurrent = currentStep === s.step;
                return (
                  <div key={s.step} className="space-y-2">
                    <div className={`h-2.5 rounded-full transition-all ${
                      isPassed ? 'bg-teal-600' : 'bg-slate-200'
                    } ${isCurrent ? 'ring-2 ring-teal-400 ring-offset-2' : ''}`} />
                    <span className={`text-[11px] font-bold block ${
                      isCurrent ? 'text-teal-700' : isPassed ? 'text-slate-800' : 'text-slate-400'
                    }`}>
                      {s.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Real-Time Queue Metrics Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Patients Ahead */}
            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <User className="w-4 h-4 text-slate-500" />
                Patients Ahead in Queue
              </span>
              <p className="text-4xl font-black mono text-slate-800">
                {tokenData.status === 'WAITING' ? tokenData.patients_ahead : 0}
              </p>
              <p className="text-xs text-slate-500">
                {tokenData.patients_ahead === 0 && tokenData.status === 'WAITING'
                  ? 'You are next in line!'
                  : tokenData.status === 'WAITING'
                  ? 'Patients with higher priority or earlier queue position ahead'
                  : 'Currently in encounter'}
              </p>
            </div>

            {/* Estimated Wait Time */}
            <div className="p-5 rounded-2xl bg-teal-50/70 border border-teal-200 space-y-1">
              <span className="text-xs font-bold uppercase tracking-wider text-teal-800 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-teal-600" />
                AI Estimated Wait Time
              </span>
              <p className="text-4xl font-black mono text-teal-900">
                ~{tokenData.status === 'WAITING' ? tokenData.estimated_wait_time : 0} mins
              </p>
              <p className="text-xs text-teal-700">
                Calculated dynamically via Little's Law & Random Forest Regressor
              </p>
            </div>
          </div>

          {/* Assigned Doctor & Room Details */}
          <div className="bg-slate-900 text-white p-5 rounded-2xl flex flex-wrap items-center justify-between gap-4">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">CONSULTING PHYSICIAN</span>
              <h3 className="text-lg font-bold text-white">{tokenData.doctor_name}</h3>
              <p className="text-xs text-slate-300">Department of {tokenData.dept_name}</p>
            </div>

            <div className="text-right">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">ASSIGNED ROOM</span>
              <p className="text-2xl font-black mono text-teal-400">{tokenData.room_number}</p>
              <span className="text-[11px] text-slate-400">Doctor Status: {tokenData.doctor_status}</span>
            </div>
          </div>

          <div className="text-center pt-2">
            <button
              onClick={() => fetchStatus(tokenData.token_number)}
              className="inline-flex items-center space-x-2 text-xs font-bold text-teal-700 hover:text-teal-800 hover:underline"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Refresh Status Manually</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
