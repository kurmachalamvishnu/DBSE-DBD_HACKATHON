import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
  Clock, 
  Stethoscope, 
  CheckCircle2, 
  AlertCircle, 
  ChevronRight, 
  ChevronLeft, 
  Activity, 
  MapPin, 
  X,
  Sparkles,
  Ticket
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { getDepartments, getDoctors, getAvailableSlots, bookAppointment, checkInAppointment } from '../api';

export default function BookAppointmentModal({ isOpen, onClose, currentPatient, onAppointmentBooked }) {
  const [step, setStep] = useState(1); // 1: Dept, 2: Doctor, 3: Date & Slot, 4: Reason & Confirm
  const [departments, setDepartments] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [selectedDeptId, setSelectedDeptId] = useState(null);
  const [selectedDoctorId, setSelectedDoctorId] = useState(null);
  
  // Date & Slot state (default to today or tomorrow)
  const todayStr = new Date().toISOString().split('T')[0];
  const [scheduledDate, setScheduledDate] = useState(todayStr);
  const [availableSlots, setAvailableSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [loadingSlots, setLoadingSlots] = useState(false);

  // Clinical reason
  const [reason, setReason] = useState('');
  const [bookingLoading, setBookingLoading] = useState(false);
  const [error, setError] = useState(null);
  const [confirmedBooking, setConfirmedBooking] = useState(null);

  useEffect(() => {
    if (isOpen) {
      Promise.all([getDepartments(), getDoctors()]).then(([deptRes, docRes]) => {
        if (deptRes.data.success) setDepartments(deptRes.data.data);
        if (docRes.data.success) setDoctors(docRes.data.data);
      }).catch(err => console.error(err));
    }
  }, [isOpen]);

  // Fetch slots whenever doctor or date changes
  useEffect(() => {
    if (selectedDoctorId && scheduledDate) {
      setLoadingSlots(true);
      setSelectedSlot(null);
      getAvailableSlots(selectedDoctorId, scheduledDate)
        .then((res) => {
          if (res.data.success) {
            setAvailableSlots(res.data.slots);
          }
        })
        .catch((e) => console.error('Slot error:', e))
        .finally(() => setLoadingSlots(false));
    }
  }, [selectedDoctorId, scheduledDate]);

  if (!isOpen) return null;

  const selectedDeptObj = departments.find((d) => Number(d.dept_id) === Number(selectedDeptId));
  const selectedDoctorObj = doctors.find((d) => Number(d.doctor_id) === Number(selectedDoctorId));

  const matchingDoctors = selectedDeptId
    ? doctors.filter((d) => 
        (d.dept_id && Number(d.dept_id) === Number(selectedDeptId)) ||
        (d.dept_code && selectedDeptObj?.dept_code && d.dept_code === selectedDeptObj.dept_code) ||
        (d.dept_name && selectedDeptObj?.dept_name && d.dept_name.toLowerCase() === selectedDeptObj.dept_name.toLowerCase())
      )
    : doctors;

  const displayDoctors = matchingDoctors.length > 0 ? matchingDoctors : doctors;

  const handleBookSubmit = async () => {
    if (!currentPatient) {
      setError('Please log in as a patient first to confirm your booking.');
      return;
    }
    if (!selectedDoctorId || !scheduledDate || !selectedSlot) {
      setError('Please complete all selection steps.');
      return;
    }

    setBookingLoading(true);
    setError(null);
    try {
      const res = await bookAppointment({
        patient_id: currentPatient.patient_id,
        uhid: currentPatient.uhid,
        doctor_id: selectedDoctorId,
        scheduled_date: scheduledDate,
        time_slot: selectedSlot,
        reason_for_visit: reason || 'Routine Consultation'
      });

      if (res.data.success) {
        setConfirmedBooking(res.data.data);
        confetti({ particleCount: 60, spread: 70, origin: { y: 0.6 } });
        if (onAppointmentBooked) onAppointmentBooked();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to book appointment.');
    } finally {
      setBookingLoading(false);
    }
  };

  const handleInstantCheckin = async () => {
    if (!confirmedBooking) return;
    try {
      const res = await checkInAppointment(confirmedBooking.appointment_id);
      if (res.data.success) {
        alert(`Checked in successfully! Your Token is ${res.data.data.token_number}`);
        if (onAppointmentBooked) onAppointmentBooked();
        onClose();
      }
    } catch (err) {
      alert(`Check-in failed: ${err.message}`);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in duration-200">
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
              <Calendar className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[11px] font-extrabold uppercase tracking-widest text-teal-200">
                CareQueue™ Outpatient Booking
              </span>
              <h2 className="text-xl font-black tracking-tight text-white">
                Book a Doctor Consultation Appointment
              </h2>
            </div>
          </div>

          {/* 4-Step Indicator */}
          {!confirmedBooking && (
            <div className="grid grid-cols-4 gap-2 mt-5">
              {[
                { s: 1, label: 'Department' },
                { s: 2, label: 'Doctor' },
                { s: 3, label: 'Date & Slot' },
                { s: 4, label: 'Confirm' }
              ].map((item) => (
                <div key={item.s} className="space-y-1">
                  <div className={`h-1.5 rounded-full transition-all ${
                    step >= item.s ? 'bg-white' : 'bg-white/30'
                  }`} />
                  <span className={`text-[10px] font-bold block ${
                    step === item.s ? 'text-white' : 'text-teal-200'
                  }`}>
                    {item.s}. {item.label}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Modal Body */}
        <div className="p-6 max-h-[70vh] overflow-y-auto space-y-5">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {confirmedBooking ? (
            /* Booking Confirmation Screen */
            <div className="py-6 text-center space-y-5">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-inner">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <div>
                <h3 className="text-2xl font-black text-slate-800">Appointment Confirmed!</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Reference: <span className="font-bold mono text-teal-700">{confirmedBooking.appointment_number}</span>
                </p>
              </div>

              {/* Summary Card */}
              <div className="max-w-md mx-auto bg-slate-50 border border-slate-200 rounded-2xl p-5 text-left text-xs space-y-2.5">
                <div className="flex justify-between">
                  <span className="text-slate-500">Patient Name:</span>
                  <span className="font-bold text-slate-800">{currentPatient?.full_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Consulting Physician:</span>
                  <span className="font-bold text-slate-800">{confirmedBooking.doctor_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Department & Room:</span>
                  <span className="font-bold text-teal-700">{confirmedBooking.room_number} ({confirmedBooking.dept_name})</span>
                </div>
                <div className="flex justify-between border-t border-slate-200 pt-2">
                  <span className="text-slate-500">Scheduled Date & Time:</span>
                  <span className="font-extrabold text-slate-900 mono">{confirmedBooking.scheduled_date} at {confirmedBooking.time_slot}</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                {confirmedBooking.scheduled_date === todayStr && (
                  <button
                    onClick={handleInstantCheckin}
                    className="w-full sm:w-auto px-6 py-3 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold shadow-lg shadow-teal-600/30 flex items-center justify-center gap-2"
                  >
                    <Ticket className="w-4 h-4" />
                    <span>Check-in Now & Get Queue Token</span>
                  </button>
                )}
                <button
                  onClick={onClose}
                  className="w-full sm:w-auto px-6 py-3 border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-bold"
                >
                  Close & View Dashboard
                </button>
              </div>
            </div>
          ) : step === 1 ? (
            /* Step 1: Select Department */
            <div className="space-y-4">
              <h3 className="font-bold text-sm text-slate-800 flex items-center gap-2">
                <Activity className="w-4 h-4 text-teal-600" />
                Select Medical Specialty Department
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {departments.map((dept) => (
                  <div
                    key={dept.dept_id}
                    onClick={() => { setSelectedDeptId(dept.dept_id); setStep(2); }}
                    className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                      selectedDeptId === dept.dept_id
                        ? 'border-teal-500 bg-teal-50/50 shadow-md ring-2 ring-teal-300'
                        : 'border-slate-200 bg-white hover:border-teal-300 hover:bg-slate-50/70'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-sm text-slate-800">{dept.dept_name}</span>
                      <span className="mono text-[10px] font-bold text-teal-700 bg-teal-100 px-2 py-0.5 rounded">
                        {dept.dept_code}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1 line-clamp-2">{dept.description}</p>
                    <div className="mt-2 text-[10px] text-slate-400 flex items-center gap-3">
                      <span>Floor {dept.floor_number}</span>
                      <span>•</span>
                      <span>{dept.active_doctors || 2} Doctors Available</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : step === 2 ? (
            /* Step 2: Select Doctor */
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-sm text-slate-800 flex items-center gap-2">
                  <Stethoscope className="w-4 h-4 text-teal-600" />
                  Select Consulting Physician ({selectedDeptObj?.dept_name})
                </h3>
                <button onClick={() => setStep(1)} className="text-xs text-teal-600 font-bold hover:underline">
                  Change Dept
                </button>
              </div>

              {matchingDoctors.length === 0 && doctors.length > 0 && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">
                  Showing all active hospital consultants available for scheduling.
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {displayDoctors.map((doc) => (
                  <div
                    key={doc.doctor_id}
                    onClick={() => { setSelectedDoctorId(doc.doctor_id); setStep(3); }}
                    className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                      selectedDoctorId === doc.doctor_id
                        ? 'border-teal-500 bg-teal-50/50 shadow-md ring-2 ring-teal-300'
                        : 'border-slate-200 bg-white hover:border-teal-300 hover:bg-slate-50/70'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-bold text-sm text-slate-800 block">{doc.doctor_name}</span>
                        <span className="text-[10px] text-teal-700 font-bold">{doc.dept_name}</span>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                        doc.current_status === 'AVAILABLE' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                      }`}>
                        {doc.current_status.replace('_', ' ')}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1 font-medium">{doc.qualification}</p>
                    <div className="flex items-center justify-between mt-3 text-[11px] text-slate-500 pt-2 border-t border-slate-100">
                      <span className="font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded">{doc.room_number}</span>
                      <span>Avg: {doc.avg_consultation_time} mins</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : step === 3 ? (
            /* Step 3: Select Date & Available Slots */
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-sm text-slate-800 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-teal-600" />
                  Choose Date & Consultation Slot with {selectedDoctorObj?.doctor_name}
                </h3>
                <button onClick={() => setStep(2)} className="text-xs text-teal-600 font-bold hover:underline">
                  Change Doctor
                </button>
              </div>

              {/* Date Input */}
              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                <label className="text-xs font-bold text-slate-700 uppercase block mb-1">Select Consultation Date</label>
                <input
                  type="date"
                  min={todayStr}
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                  className="w-full sm:w-64 px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-teal-500 focus:outline-none"
                />
              </div>

              {/* Available Slots Grid */}
              <div>
                <label className="text-xs font-bold text-slate-700 uppercase block mb-2">
                  Available Time Slots ({availableSlots.filter(s => s.is_available).length} open)
                </label>

                {loadingSlots ? (
                  <div className="text-center py-8">
                    <div className="w-8 h-8 border-3 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                    <p className="text-xs text-slate-400 mt-2">Checking doctor schedule & reservations...</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5">
                    {availableSlots.map((slot) => (
                      <button
                        key={slot.time_slot}
                        disabled={!slot.is_available}
                        onClick={() => setSelectedSlot(slot.time_slot)}
                        className={`p-2.5 rounded-xl text-xs font-bold transition-all ${
                          selectedSlot === slot.time_slot
                            ? 'bg-teal-600 text-white shadow-md shadow-teal-600/30 ring-2 ring-teal-400 ring-offset-1'
                            : slot.is_available
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100'
                            : 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed line-through'
                        }`}
                      >
                        {slot.display_time}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Step 4: Symptoms, Reason, and Final Summary */
            <div className="space-y-4">
              <h3 className="font-bold text-sm text-slate-800 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-teal-600" />
                Consultation Symptoms & Final Review
              </h3>

              {/* Booking Summary Box */}
              <div className="bg-teal-50/70 border border-teal-200 rounded-2xl p-4 text-xs space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-500">Patient:</span>
                  <span className="font-bold text-slate-800">{currentPatient?.full_name} ({currentPatient?.uhid})</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Specialty & Doctor:</span>
                  <span className="font-bold text-slate-800">{selectedDoctorObj?.doctor_name} ({selectedDeptObj?.dept_name})</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Room Location:</span>
                  <span className="font-bold text-teal-700">{selectedDoctorObj?.room_number}</span>
                </div>
                <div className="flex justify-between border-t border-teal-200 pt-2">
                  <span className="text-slate-500">Date & Slot:</span>
                  <span className="font-black text-slate-900 mono">{scheduledDate} at {selectedSlot}</span>
                </div>
              </div>

              {/* Symptoms Input */}
              <div>
                <label className="text-xs font-bold text-slate-700 uppercase block mb-1">
                  Reason for Visit / Symptoms Description
                </label>
                <textarea
                  rows={3}
                  placeholder="Describe current symptoms (e.g. Mild chest heaviness on climbing stairs, recurrent headaches for 3 days)..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-teal-500 focus:outline-none"
                />
              </div>
            </div>
          )}
        </div>

        {/* Modal Bottom Navigation */}
        {!confirmedBooking && (
          <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-between items-center">
            {step > 1 ? (
              <button
                type="button"
                onClick={() => setStep(step - 1)}
                className="flex items-center space-x-1 px-4 py-2 border border-slate-300 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-100"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Back</span>
              </button>
            ) : <div />}

            {step < 4 ? (
              <button
                type="button"
                disabled={(step === 1 && !selectedDeptId) || (step === 2 && !selectedDoctorId) || (step === 3 && !selectedSlot)}
                onClick={() => setStep(step + 1)}
                className="flex items-center space-x-1 px-5 py-2.5 bg-teal-600 disabled:bg-slate-300 hover:bg-teal-700 text-white rounded-xl text-xs font-bold shadow-md shadow-teal-600/30 transition-all"
              >
                <span>Continue</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                disabled={bookingLoading}
                onClick={handleBookSubmit}
                className="flex items-center space-x-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-lg shadow-emerald-600/30 transition-all"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{bookingLoading ? 'Confirming...' : 'Confirm & Book Appointment'}</span>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
