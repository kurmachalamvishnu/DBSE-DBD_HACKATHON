import React, { useState, useEffect } from 'react';
import { Volume2, VolumeX, Bell, Clock, RefreshCw, AlertCircle } from 'lucide-react';
import { getTVBoard } from '../api';
import { announceTokenCall } from '../utils/audioAnnouncer';

export default function TVDisplayBoard({ liveCallingEvent }) {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date().toLocaleTimeString());
  const [flashRoom, setFlashRoom] = useState(null);

  const fetchRooms = async () => {
    try {
      const res = await getTVBoard();
      if (res.data.success) {
        setRooms(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load TV display board:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRooms();
    const clockInterval = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString());
    }, 1000);
    const pollInterval = setInterval(fetchRooms, 8000); // Polling backup
    return () => {
      clearInterval(clockInterval);
      clearInterval(pollInterval);
    };
  }, []);

  // React to live WebSocket calling event
  useEffect(() => {
    if (liveCallingEvent) {
      fetchRooms();
      setFlashRoom(liveCallingEvent.roomNumber);
      if (audioEnabled) {
        announceTokenCall(liveCallingEvent.tokenNumber, liveCallingEvent.doctorName, liveCallingEvent.roomNumber);
      }
      const timeout = setTimeout(() => setFlashRoom(null), 12000);
      return () => clearTimeout(timeout);
    }
  }, [liveCallingEvent, audioEnabled]);

  const handleTestAudio = () => {
    announceTokenCall('CARD-103', 'Dr. Ramesh Sharma', 'Room 201');
  };

  return (
    <div className="space-y-6">
      {/* TV Header Bar */}
      <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-xl border border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 rounded-xl bg-teal-500/20 border border-teal-500/30 flex items-center justify-center text-teal-400">
            <Bell className="w-6 h-6 animate-bounce" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-3">
              OUTPATIENT CALLING DISPLAY
              <span className="text-xs font-semibold uppercase bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2.5 py-1 rounded-full">
                Live Broadcast
              </span>
            </h1>
            <p className="text-slate-400 text-sm">Please proceed to your assigned consultation room when your token is called</p>
          </div>
        </div>

        {/* Controls & Clock */}
        <div className="flex items-center space-x-4">
          <button
            onClick={() => setAudioEnabled(!audioEnabled)}
            className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all ${
              audioEnabled 
                ? 'bg-teal-500/10 text-teal-300 border-teal-500/30 hover:bg-teal-500/20' 
                : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700'
            }`}
          >
            {audioEnabled ? <Volume2 className="w-4 h-4 text-teal-400" /> : <VolumeX className="w-4 h-4" />}
            <span>{audioEnabled ? 'Voice Chime ON' : 'Muted'}</span>
          </button>

          <button
            onClick={handleTestAudio}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 transition-all"
            title="Test Voice Announcement"
          >
            Test Chime
          </button>

          <button
            onClick={fetchRooms}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-400 hover:text-white transition-all"
            title="Refresh Board"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          <div className="flex items-center space-x-2 bg-slate-800/80 px-4 py-2 rounded-xl border border-slate-700 mono font-bold text-teal-400 text-lg">
            <Clock className="w-4 h-4 text-slate-400" />
            <span>{currentTime}</span>
          </div>
        </div>
      </div>

      {/* Grid of Consultation Rooms */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {rooms.map((room) => {
          const isFlashing = flashRoom === room.room_number;
          const hasActiveToken = Boolean(room.now_serving_token);

          return (
            <div
              key={room.doctor_id}
              className={`rounded-2xl border transition-all duration-300 overflow-hidden shadow-lg ${
                isFlashing
                  ? 'ring-4 ring-teal-400 bg-teal-950/20 border-teal-500 glow-teal scale-[1.02]'
                  : 'bg-white border-slate-200 hover:border-slate-300'
              }`}
            >
              {/* Card Header: Room & Dept */}
              <div className="bg-slate-900 text-white px-5 py-3.5 flex items-center justify-between border-b border-slate-800">
                <div className="flex items-center space-x-2.5">
                  <span className="font-extrabold text-base tracking-wide text-teal-300 mono bg-slate-800 px-2.5 py-1 rounded-md border border-slate-700">
                    {room.room_number}
                  </span>
                  <span className="font-semibold text-sm text-slate-300">{room.dept_name}</span>
                </div>
                <span className={`text-[11px] font-bold uppercase px-2 py-0.5 rounded-full ${
                  room.current_status === 'IN_CONSULTATION' 
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    : room.current_status === 'AVAILABLE'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : 'bg-slate-700 text-slate-300'
                }`}>
                  {room.current_status.replace('_', ' ')}
                </span>
              </div>

              {/* Card Body: Doctor & Token */}
              <div className="p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-slate-800 text-lg">{room.doctor_name}</h3>
                    <p className="text-xs text-slate-500">Department of {room.dept_name}</p>
                  </div>
                  {isFlashing && (
                    <span className="flex h-3 w-3 relative">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-teal-500"></span>
                    </span>
                  )}
                </div>

                {/* Now Serving Big Display Box */}
                <div className={`rounded-xl p-5 text-center border transition-all ${
                  hasActiveToken
                    ? 'bg-gradient-to-br from-teal-500/10 to-emerald-500/10 border-teal-200 text-teal-950'
                    : 'bg-slate-50 border-slate-200 text-slate-400'
                }`}>
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                    NOW SERVING
                  </p>
                  <p className={`text-4xl sm:text-5xl font-black mono tracking-tight ${
                    hasActiveToken ? 'text-teal-700 font-extrabold' : 'text-slate-400'
                  }`}>
                    {hasActiveToken ? room.now_serving_token : '---'}
                  </p>
                  {hasActiveToken && (
                    <p className="text-xs text-teal-600 font-semibold mt-1 animate-pulse">
                      Consultation in Room {room.room_number}
                    </p>
                  )}
                </div>

                {/* Upcoming Tokens Ticker */}
                <div>
                  <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
                    <span className="font-bold uppercase tracking-wider">Upcoming in Line</span>
                    <span className="text-[11px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-medium">
                      Next Up
                    </span>
                  </div>
                  {room.upcoming_tokens_list ? (
                    <div className="flex flex-wrap gap-2">
                      {room.upcoming_tokens_list.split(', ').map((tok, idx) => (
                        <span
                          key={idx}
                          className="px-2.5 py-1 bg-slate-100 border border-slate-200 text-slate-700 rounded-lg text-xs font-bold mono"
                        >
                          {tok}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 italic">No waiting tokens in this queue</p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Emergency Broadcast Ticker */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-center space-x-3 text-amber-900 text-xs font-medium">
        <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
        <span>
          Emergency Code Red and Urgent cases are automatically triaged by the dynamic priority algorithm. Thank you for your patience.
        </span>
      </div>
    </div>
  );
}
