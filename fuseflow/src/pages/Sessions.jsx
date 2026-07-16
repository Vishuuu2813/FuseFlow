import React, { useEffect, useState } from 'react';
import api, { SOCKET_URL } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { io } from 'socket.io-client';
import {
  Smartphone,
  Plus,
  RefreshCw,
  Power,
  Trash2,
  AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const Sessions = () => {
  const { user, tenant } = useAuth();
  const [sessions, setSessions] = useState([]);
  const [newSessionName, setNewSessionName] = useState('');
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

    const socket = io(SOCKET_URL, {
      auth: { token: localStorage.getItem('accessToken') }
    });
    socket.emit('join-tenant', user.tenantId);

    socket.on('session-update', (data) => {
      setSessions((prev) =>
        prev.map((s) => {
          if (s._id === data.sessionId) {
            return {
              ...s,
              status: data.status,
              phone: data.phone || s.phone,
              qrCode: data.status === 'QR' ? data.qrCode : (data.status === 'CONNECTED' ? null : s.qrCode)
            };
          }
          return s;
        })
      );
    });

    return () => {
      socket.disconnect();
    };
  }, [user.tenantId]);

  const handleCreateSession = async (e) => {
    e.preventDefault();
    setError('');
    if (!newSessionName.trim()) {
      setError('Device name is required.');
      return;
    }

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
        setActiveSessionId(null);
      }
    } catch (err) {
      setError('Could not delete session.');
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-800">WhatsApp Devices</h1>
        <p className="text-slate-500 text-sm mt-1">Manage active connections, link new numbers, and audit QR authentications.</p>
      </div>

      {error && (
        <div className="p-3.5 rounded-xl border border-red-200 bg-red-50 text-red-655 text-sm font-semibold flex items-center gap-2">
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Creation & List Card */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          {/* Create Form or Limit Notice */}
          {sessions.length >= (tenant?.limits?.maxDevices || 1) ? (
            <div className="bg-amber-50 border border-amber-250 text-amber-800 rounded-3xl p-5 text-sm font-semibold flex items-center justify-between gap-4">
              <div>
                <span className="font-extrabold block text-slate-800">Device Limit Reached</span>
                <span className="text-xs text-amber-600 font-medium block mt-0.5">
                  Your plan ({tenant?.plan ? tenant.plan.toUpperCase() : 'TRIAL'}) allows a maximum of {tenant?.limits?.maxDevices || 1} connected device(s).
                </span>
              </div>
              <span className="px-3 py-1.5 bg-amber-100 text-amber-800 border border-amber-200 text-[10px] font-extrabold rounded-lg uppercase tracking-wider">
                Max Allowed: {tenant?.limits?.maxDevices || 1}
              </span>
            </div>
          ) : (
            <form onSubmit={handleCreateSession} className="bg-white border border-slate-200 shadow-sm rounded-3xl p-5 flex items-center gap-4">
              <input
                type="text"
                required
                value={newSessionName}
                onChange={(e) => setNewSessionName(e.target.value)}
                placeholder="Device name (e.g. Sales Team)"
                className="flex-1 px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-emerald-600 text-sm transition-colors"
              />
              <button
                type="submit"
                disabled={loading}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm transition-colors flex items-center gap-2 cursor-pointer shrink-0 disabled:opacity-50"
              >
                <Plus size={16} /> Add Device
              </button>
            </form>
          )}

          {/* Sessions List */}
          <div className="flex flex-col gap-4">
            {sessions.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-3xl p-8 text-center text-slate-550 text-sm font-semibold">
                No WhatsApp devices registered yet. Create one above to connect.
              </div>
            ) : (
              sessions.map((session) => (
                <motion.div
                  key={session._id}
                  layout
                  className="bg-white border border-slate-200 shadow-sm rounded-3xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-2xl ${
                      session.status === 'CONNECTED' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-slate-50 border border-slate-100 text-slate-400'
                    }`}>
                      <Smartphone size={24} />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-800 text-sm">{session.sessionName}</h3>
                      <p className="text-xs text-slate-500 mt-0.5 font-medium">
                        {session.phone ? `Phone: +${session.phone}` : 'No phone linked'}
                      </p>
                      <div className="mt-2 flex items-center gap-2">
                        <span className={`inline-block h-2 w-2 rounded-full ${
                          session.status === 'CONNECTED' ? 'bg-emerald-500 animate-pulse' :
                          session.status === 'CONNECTING' ? 'bg-yellow-500 animate-pulse' :
                          session.status === 'QR' ? 'bg-indigo-500 animate-pulse' :
                          'bg-slate-400'
                        }`}></span>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{session.status}</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions Buttons */}
                  <div className="flex items-center gap-3 self-end md:self-center">
                    {session.status === 'DISCONNECTED' ? (
                      <button
                        onClick={() => handleConnect(session._id)}
                        className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-250 border border-slate-200 text-slate-655 text-xs font-bold flex items-center gap-2 cursor-pointer transition-colors"
                      >
                        <RefreshCw size={14} /> Connect
                      </button>
                    ) : (
                      <button
                        onClick={() => handleDisconnect(session._id)}
                        className="px-4 py-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-655 text-xs font-bold flex items-center gap-2 cursor-pointer border border-red-200 transition-colors"
                      >
                        <Power size={14} /> Disconnect
                      </button>
                    )}

                    <button
                      onClick={() => handleDelete(session._id)}
                      className="p-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 transition-colors cursor-pointer"
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
        <div className="bg-white border border-slate-200 rounded-3xl p-6 flex flex-col items-center shadow-sm w-full">
          <h3 className="font-bold text-slate-800 text-sm mb-4">Device Authentication</h3>
          
          <AnimatePresence mode="wait">
            {activeSessionId ? (
              (() => {
                const activeSession = sessions.find((s) => s._id === activeSessionId);
                if (!activeSession) return null;

                if (activeSession.status === 'QR' && activeSession.qrCode) {
                  return (
                    <motion.div
                      key="qr-view"
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      className="flex flex-col items-center gap-4 text-center w-full"
                    >
                      <div className="p-3 bg-white rounded-2xl border border-slate-200 shadow-md">
                        <img
                          src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(activeSession.qrCode)}`}
                          alt="WhatsApp QR Code"
                          className="h-48 w-48 block"
                        />
                      </div>
                      <p className="text-xs text-slate-500 max-w-xs mt-2 leading-relaxed font-semibold">
                        Open WhatsApp on your phone, go to Linked Devices, and scan this QR code to authenticate.
                      </p>
                    </motion.div>
                  );
                } else if (activeSession.status === 'CONNECTING' || activeSession.status === 'QR') {
                  return (
                    <motion.div
                      key="connecting-view"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="h-48 flex flex-col items-center justify-center text-center text-slate-400 text-xs gap-3 w-full"
                    >
                      <RefreshCw size={24} className="animate-spin text-emerald-600" />
                      Generating session handshake...
                    </motion.div>
                  );
                } else if (activeSession.status === 'CONNECTED') {
                  return (
                    <motion.div
                      key="connected-view"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="h-48 flex flex-col items-center justify-center text-center text-slate-400 text-xs gap-3 w-full"
                    >
                      <span className="text-emerald-600 font-extrabold text-sm">✓ Connected Successfully</span>
                    </motion.div>
                  );
                } else {
                  return (
                    <div className="h-48 flex flex-col items-center justify-center text-center text-slate-400 text-xs p-4 leading-relaxed font-semibold">
                      <AlertCircle size={24} className="mb-2 text-slate-400" />
                      Device disconnected. Select "Connect" to try again.
                    </div>
                  );
                }
              })()
            ) : (
              <div className="h-48 flex flex-col items-center justify-center text-center text-slate-400 text-xs p-4 leading-relaxed font-semibold">
                <AlertCircle size={24} className="mb-2 text-slate-400" />
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
