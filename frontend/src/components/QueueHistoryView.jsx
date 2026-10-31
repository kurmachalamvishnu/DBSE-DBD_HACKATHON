import React, { useState, useEffect } from 'react';
import { 
  History, 
  Download, 
  Search, 
  Filter, 
  RefreshCw, 
  Clock, 
  User, 
  Stethoscope 
} from 'lucide-react';
import { getQueueHistory, getExportCsvUrl, getDoctors } from '../api';

export default function QueueHistoryView() {
  const [history, setHistory] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDoctorId, setFilterDoctorId] = useState('');
  const [filterEventType, setFilterEventType] = useState('');

  const loadHistory = async () => {
    setLoading(true);
    try {
      const res = await getQueueHistory({
        doctor_id: filterDoctorId || undefined,
        event_type: filterEventType || undefined,
        limit: 150
      });
      if (res.data.success) {
        setHistory(res.data.data);
      }
    } catch (e) {
      console.error('Failed to load queue history:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
    getDoctors().then((res) => {
      if (res.data.success) setDoctors(res.data.data);
    });
  }, [filterDoctorId, filterEventType]);

  const filteredHistory = history.filter((item) => {
    const term = searchTerm.toLowerCase();
    return (
      item.token_number?.toLowerCase().includes(term) ||
      item.patient_name?.toLowerCase().includes(term) ||
      item.doctor_name?.toLowerCase().includes(term) ||
      item.notes?.toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 rounded-2xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-700 shadow-inner">
            <History className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight">
              HEALTHCARE QUEUE AUDIT TRAIL
            </h1>
            <p className="text-xs text-slate-500">
              Complete chronological audit logs of all queue events, token issuances, calling actions, and clinical completions
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <a
            href={getExportCsvUrl()}
            download
            className="flex items-center space-x-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow-md shadow-emerald-600/20 transition-all"
          >
            <Download className="w-4 h-4" />
            <span>Export to CSV</span>
          </a>

          <button
            onClick={loadHistory}
            className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-all"
            title="Refresh Logs"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Search by Token #, Patient, Doctor, or Notes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-teal-500 focus:outline-none"
          />
        </div>

        {/* Doctor Filter */}
        <select
          value={filterDoctorId}
          onChange={(e) => setFilterDoctorId(e.target.value)}
          className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 focus:ring-2 focus:ring-teal-500"
        >
          <option value="">-- All Doctors --</option>
          {doctors.map((d) => (
            <option key={d.doctor_id} value={d.doctor_id}>
              {d.doctor_name} ({d.room_number})
            </option>
          ))}
        </select>

        {/* Event Type Filter */}
        <select
          value={filterEventType}
          onChange={(e) => setFilterEventType(e.target.value)}
          className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 focus:ring-2 focus:ring-teal-500"
        >
          <option value="">-- All Events --</option>
          <option value="TOKEN_ISSUED">TOKEN_ISSUED</option>
          <option value="CALLED">CALLED</option>
          <option value="CONSULTATION_STARTED">CONSULTATION_STARTED</option>
          <option value="CONSULTATION_COMPLETED">CONSULTATION_COMPLETED</option>
          <option value="SKIPPED">SKIPPED</option>
          <option value="TRANSFERRED">TRANSFERRED</option>
        </select>
      </div>

      {/* History Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase font-bold border-b border-slate-200">
              <tr>
                <th className="p-3.5">Timestamp</th>
                <th className="p-3.5">Token Number</th>
                <th className="p-3.5">Patient Details</th>
                <th className="p-3.5">Doctor & Room</th>
                <th className="p-3.5">Event Type</th>
                <th className="p-3.5">Status Transition</th>
                <th className="p-3.5">Event Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredHistory.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400 italic">
                    {loading ? 'Loading queue history logs...' : 'No queue history logs found matching current criteria.'}
                  </td>
                </tr>
              ) : (
                filteredHistory.map((item) => (
                  <tr key={item.history_id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-3.5 mono text-slate-500 whitespace-nowrap">
                      {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </td>
                    <td className="p-3.5 font-black mono text-teal-800 whitespace-nowrap">
                      {item.token_number}
                    </td>
                    <td className="p-3.5">
                      <span className="font-bold text-slate-800 block">{item.patient_name}</span>
                      <span className="text-[10px] text-slate-400 mono">{item.uhid}</span>
                    </td>
                    <td className="p-3.5">
                      <span className="font-semibold text-slate-800 block">{item.doctor_name}</span>
                      <span className="text-[10px] text-teal-700 font-bold">{item.room_number}</span>
                    </td>
                    <td className="p-3.5 whitespace-nowrap">
                      <span className={`px-2 py-0.5 rounded-full font-bold uppercase text-[10px] ${
                        item.event_type === 'TOKEN_ISSUED'
                          ? 'bg-blue-100 text-blue-800'
                          : item.event_type === 'CALLED'
                          ? 'bg-amber-100 text-amber-800'
                          : item.event_type === 'CONSULTATION_STARTED'
                          ? 'bg-teal-100 text-teal-800'
                          : item.event_type === 'CONSULTATION_COMPLETED'
                          ? 'bg-emerald-100 text-emerald-800'
                          : item.event_type === 'SKIPPED'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-purple-100 text-purple-800'
                      }`}>
                        {item.event_type.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="p-3.5 mono text-[11px] text-slate-600 whitespace-nowrap">
                      {item.previous_status || 'NONE'} &rarr; <strong>{item.new_status}</strong>
                    </td>
                    <td className="p-3.5 text-slate-600 max-w-xs truncate" title={item.notes}>
                      {item.notes}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
