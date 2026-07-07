import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { io } from 'socket.io-client';
import {
  Smartphone,
  Plus,
  RefreshCw,
  Power,
  Trash2,
  AlertCircle,
  CheckCircle2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const Sessions = () => {
  const { user } = useAuth();
  const [sessions, setSessions] = useState([]);
  const [newSessionName, setNewSessionName] = useState('');
  const [activeQr, setActiveQr] = useState(null);
  const [activeSessionId, setActiveSessionId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchSessions = async () => {
    try {
      const { data } = await api.get('/sessions');
      setSessions(data);
    } catch (err) {
      setError('Failed to fetch devices.');
    }
  };

  useEffect(() => {
    fetchSessions();

    // 1. Establish WebSocket Connection
    const socket = io('http://localhost:5000');
    
    // Join tenant room for secure events routing
    socket.emit('join-tenant', user.tenantId);

    // 2. Listen for Realtime Session Updates
    socket.on('session-update', (data) => {
      setSessions((prev) =>
        prev.map((s) => {
          if (s._id === data.sessionId) {
            return { ...s, status: data.status, phone: data.phone || s.phone };
          }
          return s;
        })
      );

      if (data.sessionId === activeSessionId) {
        if (data.status === 'QR') {
          setActiveQr(data.qrCode);
        } else if (data.status === 'CONNECTED') {
          setActiveQr(null);
          setActiveSessionId(null);
        }
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [user.tenantId, activeSessionId]);

  const handleCreateSession = async (e) => {
    e.preventDefault();
    setError('');
    if (!newSessionName.trim()) return;

    setLoading(true);
    try {
      const { data } = await api.post('/sessions', { sessionName: newSessionName });
      setSessions((prev) => [...prev, data]);
      setNewSessionName('');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create device session.');
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async (sessionId) => {
    setError('');
    setActiveSessionId(sessionId);
    setActiveQr(null);
    try {
      await api.post(`/sessions/${sessionId}/connect`);
    } catch (err) {
      setError('Could not connect session.');
    }
  };

  const handleDisconnect = async (sessionId) => {
    setError('');
    try {
      await api.post(`/sessions/${sessionId}/disconnect`);
      fetchSessions();
      if (activeSessionId === sessionId) {
        setActiveQr(null);
        setActiveSessionId(null);
      }
    } catch (err) {
      setError('Could not disconnect session.');
    }
  };

  const handleDelete = async (sessionId) => {
    setError('');
    try {
      await api.delete(`/sessions/${sessionId}`);
      setSessions((prev) => prev.filter((s) => s._id !== sessionId));
      if (activeSessionId === sessionId) {
        setActiveQr(null);
        setActiveSessionId(null);
      }
    } catch (err) {
      setError('Could not delete session.');
    }
  };

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-bold bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">WhatsApp Devices</h1>
        <p className="text-slate-400 text-sm mt-1">Manage active connections and QR authentication codes.</p>
      </div>

      {error && (
        <div className="p-3 rounded-xl border border-red-500/20 bg-red-500/5 text-red-400 text-xs font-medium flex items-center gap-2">
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Creation & List Card */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          {/* Create Form */}
          <form onSubmit={handleCreateSession} className="backdrop-blur-md bg-slate-900/40 border border-white/5 shadow-xl rounded-2xl p-5 flex items-center gap-4">
            <input
              type="text"
              value={newSessionName}
              onChange={(e) => setNewSessionName(e.target.value)}
              placeholder="Device name (e.g. Sales Team)"
              className="flex-1 px-4 py-2.5 rounded-xl bg-slate-950/50 border border-white/5 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-emerald-500 transition-colors text-sm"
            />
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-semibold text-sm transition-colors flex items-center gap-2 cursor-pointer shrink-0 disabled:opacity-50"
            >
              <Plus size={16} /> Add Device
            </button>
          </form>

          {/* Sessions List */}
          <div className="flex flex-col gap-4">
            {sessions.length === 0 ? (
              <div className="backdrop-blur-md bg-slate-900/20 border border-white/5 rounded-2xl p-8 text-center text-slate-500 text-sm">
                No WhatsApp devices registered yet. Create one above to connect.
              </div>
            ) : (
              sessions.map((session) => (
                <motion.div
                  key={session._id}
                  layout
                  className="backdrop-blur-md bg-slate-900/40 border border-white/5 shadow-xl rounded-2xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-2xl ${
                      session.status === 'CONNECTED' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-800/60 text-slate-400'
                    }`}>
                      <Smartphone size={24} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-200 text-sm">{session.sessionName}</h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {session.phone ? `Phone: +${session.phone}` : 'No phone linked'}
                      </p>
                      <div className="mt-2 flex items-center gap-2">
                        <span className={`inline-block h-2 w-2 rounded-full ${
                          session.status === 'CONNECTED' ? 'bg-emerald-500 animate-pulse' :
                          session.status === 'CONNECTING' ? 'bg-yellow-500 animate-pulse' :
                          session.status === 'QR' ? 'bg-indigo-500 animate-pulse' :
                          'bg-slate-600'
                        }`}></span>
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{session.status}</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions Buttons */}
                  <div className="flex items-center gap-3 self-end md:self-center">
                    {session.status === 'DISCONNECTED' ? (
                      <button
                        onClick={() => handleConnect(session._id)}
                        className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-2 cursor-pointer transition-colors"
                      >
                        <RefreshCw size={14} /> Connect
                      </button>
                    ) : (
                      <button
                        onClick={() => handleDisconnect(session._id)}
                        className="px-4 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-semibold flex items-center gap-2 cursor-pointer transition-colors"
                      >
                        <Power size={14} /> Disconnect
                      </button>
                    )}

                    <button
                      onClick={() => handleDelete(session._id)}
                      className="p-2 rounded-xl bg-red-500/5 hover:bg-red-500/10 text-red-500 border border-red-500/10 transition-colors cursor-pointer"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </div>

        {/* QR Scanner Panel */}
        <div className="backdrop-blur-md bg-slate-900/40 border border-white/5 shadow-xl rounded-2xl p-6 flex flex-col items-center">
          <h3 className="font-semibold text-slate-200 text-sm mb-4">Device Authentication</h3>
          
          <AnimatePresence mode="wait">
            {activeSessionId ? (
              activeQr ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="flex flex-col items-center gap-4 text-center"
                >
                  <div className="p-3 bg-white rounded-2xl shadow-lg">
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(activeQr)}`}
                      alt="WhatsApp QR Code"
                      className="h-48 w-48 block"
                    />
                  </div>
                  <p className="text-xs text-slate-400 max-w-xs mt-2">
                    Open WhatsApp on your phone, go to Linked Devices, and scan this QR code to authenticate.
                  </p>
                </motion.div>
              ) : (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="h-48 flex flex-col items-center justify-center text-center text-slate-500 text-xs gap-3"
                >
                  <RefreshCw size={24} className="animate-spin text-emerald-500" />
                  Generating session handshake...
                </motion.div>
              )
            ) : (
              <div className="h-48 flex flex-col items-center justify-center text-center text-slate-500 text-xs p-4">
                <AlertCircle size={24} className="mb-2 text-slate-600" />
                Select "Connect" on an inactive device to view its pairing QR code here.
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default Sessions;
