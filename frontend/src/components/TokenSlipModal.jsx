import React from 'react';
import { Printer, CheckCircle, Clock, MapPin, QrCode } from 'lucide-react';

export default function TokenSlipModal({ token, onClose }) {
  if (!token) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-sm w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in duration-200">
        {/* Printable Ticket Area */}
        <div id="printable-token" className="p-6 text-center space-y-4 bg-white border-b border-dashed border-slate-300">
          <div className="space-y-1">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-teal-700 bg-teal-50 px-2.5 py-0.5 rounded-full border border-teal-200">
              CareQueue™ Health System
            </span>
            <h3 className="font-extrabold text-base text-slate-800">Outpatient Consultation Token</h3>
            <p className="text-[11px] text-slate-400">{new Date().toLocaleString()}</p>
          </div>

          {/* Big Token Number */}
          <div className="bg-slate-900 text-teal-400 p-4 rounded-2xl shadow-inner border border-slate-800">
            <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400 block mb-1">
              YOUR QUEUE TOKEN
            </span>
            <p className="text-4xl sm:text-5xl font-black mono tracking-tight text-white">
              {token.token_number}
            </p>
            <span className="text-[11px] font-semibold text-teal-300 mt-1 block">
              Priority Tier: {token.triage_level}
            </span>
          </div>

          {/* Details */}
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs space-y-2 text-left">
            <div className="flex justify-between">
              <span className="text-slate-500 font-medium">Patient:</span>
              <span className="font-bold text-slate-800">{token.patient_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 font-medium">UHID:</span>
              <span className="font-bold mono text-slate-800">{token.uhid}</span>
            </div>
            <div className="flex justify-between border-t border-slate-200 pt-2">
              <span className="text-slate-500 font-medium">Consulting Doctor:</span>
              <span className="font-bold text-slate-800">{token.doctor_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 font-medium">Room & Dept:</span>
              <span className="font-bold text-teal-700">{token.room_number} ({token.dept_name})</span>
            </div>
            <div className="flex justify-between border-t border-slate-200 pt-2">
              <span className="text-slate-500 font-medium">Est. Wait Time:</span>
              <span className="font-extrabold text-teal-800 mono">~{token.estimated_wait_time} mins</span>
            </div>
          </div>

          {/* Simulated QR Code for mobile tracking */}
          <div className="flex flex-col items-center justify-center p-3 border border-slate-200 rounded-xl bg-slate-50/50">
            <QrCode className="w-16 h-16 text-slate-700" />
            <span className="text-[10px] text-slate-400 mt-1">Scan or visit mobile tracker: token #{token.token_number}</span>
          </div>

          <p className="text-[10px] text-slate-400 italic">
            Please be seated in the waiting area. Watch the TV display or check the mobile tracker for your call.
          </p>
        </div>

        {/* Modal Action Buttons */}
        <div className="p-4 bg-slate-50 flex items-center justify-between gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 px-4 border border-slate-300 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-100 transition-all"
          >
            Close
          </button>
          <button
            onClick={handlePrint}
            className="flex-1 flex items-center justify-center space-x-2 py-2.5 px-4 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold shadow-md shadow-teal-600/20 transition-all"
          >
            <Printer className="w-4 h-4" />
            <span>Print Slip</span>
          </button>
        </div>
      </div>
    </div>
  );
}
