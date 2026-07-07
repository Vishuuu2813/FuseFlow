import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { io } from 'socket.io-client';
import { useAuth } from '../context/AuthContext';
import {
  Send,
  Plus,
  Play,
  Pause,
  Clock,
  CheckCircle2,
  AlertCircle,
  Eye
} from 'lucide-react';

const Campaigns = () => {
  const { user } = useAuth();
  const [campaigns, setCampaigns] = useState([]);
  const [sessions, setSessions] = useState([]);
  
  // Creation States
  const [name, setName] = useState('');
  const [sessionId, setSessionId] = useState('');
  const [messageText, setMessageText] = useState('');
  const [mediaUrl, setMediaUrl] = useState('');
  
  // UI Control States
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [logsCampaignId, setLogsCampaignId] = useState(null);
  const [logs, setLogs] = useState([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchData = async () => {
    try {
      const campRes = await api.get('/campaigns');
      setCampaigns(campRes.data);

      const sessRes = await api.get('/sessions');
      // Only keep connected sessions for dispatching campaigns
      setSessions(sessRes.data.filter((s) => s.status === 'CONNECTED'));
    } catch (err) {
      setError('Failed to load page data.');
    }
  };

  useEffect(() => {
    fetchData();

    // Socket listeners for real-time progress update
    const socket = io('http://localhost:5000');
    socket.emit('join-tenant', user.tenantId);

    socket.on('campaign-progress', (data) => {
      setCampaigns((prev) =>
        prev.map((c) => {
          if (c._id === data.campaignId) {
            return {
              ...c,
              stats: {
                ...c.stats,
                sent: data.stats.sent,
                failed: data.stats.failed,
              },
              status: data.status,
            };
          }
          return c;
        })
      );
    });

    return () => {
      socket.disconnect();
    };
  }, [user.tenantId]);

  const handleCreate = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!name || !sessionId || !messageText) {
      setError('All fields are required.');
      return;
    }

    try {
      const { data } = await api.post('/campaigns', {
        name,
        whatsappSessionId: sessionId,
        messageText,
        mediaUrl
      });
      setCampaigns((prev) => [data, ...prev]);
      setName('');
      setSessionId('');
      setMessageText('');
      setMediaUrl('');
      setShowCreateModal(false);
      setSuccess('Campaign created in Draft status.');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create campaign.');
    }
  };

  const handleStart = async (campaignId) => {
    try {
      await api.post(`/campaigns/${campaignId}/start`);
      fetchData();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to start campaign.');
    }
  };

  const handlePause = async (campaignId) => {
    try {
      await api.post(`/campaigns/${campaignId}/pause`);
      fetchData();
    } catch (err) {
      setError('Failed to pause campaign.');
    }
  };

  const handleResume = async (campaignId) => {
    try {
      await api.post(`/campaigns/${campaignId}/resume`);
      fetchData();
    } catch (err) {
      setError('Failed to resume campaign.');
    }
  };

  const viewLogs = async (campaignId) => {
    setLogsCampaignId(campaignId);
    setLogs([]);
    try {
      const { data } = await api.get(`/campaigns/${campaignId}/logs`);
      setLogs(data);
    } catch (err) {
      setError('Failed to load message logs.');
    }
  };

  const getPercentage = (stats) => {
    if (!stats.total) return 0;
    const progress = stats.sent + stats.failed;
    return Math.round((progress / stats.total) * 100);
  };

  return (
    <div className="flex flex-col gap-8">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">Campaign Broadcaster</h1>
          <p className="text-slate-400 text-sm mt-1">Design, execute, and monitor bulk marketing blasts.</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 text-sm font-semibold flex items-center gap-2 cursor-pointer transition-colors"
        >
          <Plus size={16} /> Create Campaign
        </button>
      </div>

      {error && (
        <div className="p-3 rounded-xl border border-red-500/20 bg-red-500/5 text-red-400 text-xs font-medium flex items-center gap-2">
          <AlertCircle size={16} /> {error}
        </div>
      )}

      {success && (
        <div className="p-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 text-emerald-400 text-xs font-medium">
          {success}
        </div>
      )}

      {/* Campaigns Listing */}
      <div className="flex flex-col gap-6">
        {campaigns.length === 0 ? (
          <div className="backdrop-blur-md bg-slate-900/20 border border-white/5 rounded-2xl p-8 text-center text-slate-500 text-sm">
            No broadcasting campaigns created. Create one above to start marketing.
          </div>
        ) : (
          campaigns.map((camp) => {
            const pct = getPercentage(camp.stats);
            return (
              <div
                key={camp._id}
                className="backdrop-blur-md bg-slate-900/40 border border-white/5 shadow-xl rounded-2xl p-6 flex flex-col gap-4"
              >
                {/* Row Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="font-semibold text-slate-200 text-sm">{camp.name}</h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Linked Device: {camp.whatsappSessionId?.sessionName || 'Deleted Device'}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2.5">
                    {camp.status === 'DRAFT' && (
                      <button
                        onClick={() => handleStart(camp._id)}
                        className="px-3.5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-slate-950 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
                      >
                        <Play size={12} /> Start Broadcast
                      </button>
                    )}

                    {camp.status === 'RUNNING' && (
                      <button
                        onClick={() => handlePause(camp._id)}
                        className="px-3.5 py-1.5 rounded-lg bg-yellow-500/10 hover:bg-yellow-500/25 text-yellow-400 text-xs font-bold flex items-center gap-1.5 cursor-pointer border border-yellow-500/20 transition-colors"
                      >
                        <Pause size={12} /> Pause
                      </button>
                    )}

                    {camp.status === 'PAUSED' && (
                      <button
                        onClick={() => handleResume(camp._id)}
                        className="px-3.5 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/25 text-emerald-400 text-xs font-bold flex items-center gap-1.5 cursor-pointer border border-emerald-500/20 transition-colors"
                      >
                        <Play size={12} /> Resume
                      </button>
                    )}

                    <button
                      onClick={() => viewLogs(camp._id)}
                      className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
                    >
                      <Eye size={12} /> Logs
                    </button>

                    <span className={`px-2 py-0.5 rounded text-[9px] font-bold border ${
                      camp.status === 'COMPLETED' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                      camp.status === 'RUNNING' ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' :
                      camp.status === 'PAUSED' ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' :
                      'bg-slate-800 text-slate-500 border-white/5'
                    }`}>{camp.status}</span>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex justify-between text-xs text-slate-400">
                    <span>Progress: {camp.stats.sent + camp.stats.failed} / {camp.stats.total} messages</span>
                    <span className="font-semibold text-emerald-400">{pct}%</span>
                  </div>
                  <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-white/5">
                    <div
                      className="bg-gradient-to-r from-emerald-500 to-green-400 h-full transition-all duration-300"
                      style={{ width: `${pct}%` }}
                    ></div>
                  </div>
                  <div className="flex gap-4 text-[10px] text-slate-500 font-medium">
                    <span className="text-emerald-500/80">Sent: {camp.stats.sent}</span>
                    <span className="text-red-500/80">Failed: {camp.stats.failed}</span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg backdrop-blur-xl bg-slate-900 border border-white/5 shadow-2xl rounded-3xl p-6">
            <h3 className="text-lg font-bold text-slate-100 mb-4">Create Broadcast Campaign</h3>
            <form onSubmit={handleCreate} className="flex flex-col gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Campaign Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. July Summer Promo"
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950/50 border border-white/5 text-slate-300 focus:outline-none focus:border-emerald-500 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Select WhatsApp Device</label>
                {sessions.length === 0 ? (
                  <p className="text-xs text-red-400 mt-1">No active WhatsApp device linked. Scan/connect a device first!</p>
                ) : (
                  <select
                    required
                    value={sessionId}
                    onChange={(e) => setSessionId(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-950/50 border border-white/5 text-slate-400 focus:outline-none focus:border-emerald-500 text-sm"
                  >
                    <option value="">Choose device...</option>
                    {sessions.map((s) => (
                      <option key={s._id} value={s._id}>{s.sessionName}</option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Message Content (Personalization: use {"{{name}}"})</label>
                <textarea
                  required
                  rows="4"
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  placeholder="Hello {{name}}, welcome to our workspace..."
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950/50 border border-white/5 text-slate-300 focus:outline-none focus:border-emerald-500 text-sm resize-none"
                ></textarea>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Media Image URL (Optional)</label>
                <input
                  type="url"
                  value={mediaUrl}
                  onChange={(e) => setMediaUrl(e.target.value)}
                  placeholder="https://image-link.com/promo.png"
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950/50 border border-white/5 text-slate-300 focus:outline-none focus:border-emerald-500 text-sm"
                />
              </div>

              <div className="flex items-center justify-end gap-3 mt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-400 hover:bg-slate-800 hover:text-slate-200 text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={sessions.length === 0}
                  className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40 text-slate-950 text-xs font-semibold cursor-pointer"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Logs View Panel */}
      {logsCampaignId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-2xl backdrop-blur-xl bg-slate-900 border border-white/5 shadow-2xl rounded-3xl p-6 flex flex-col h-[500px]">
            <div className="flex justify-between items-center mb-4 shrink-0">
              <h3 className="text-lg font-bold text-slate-100">Broadcast Dispatch Logs</h3>
              <button
                onClick={() => setLogsCampaignId(null)}
                className="text-xs text-slate-400 hover:text-slate-200 cursor-pointer"
              >
                Close
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto flex flex-col gap-2.5 pr-2">
              {logs.length === 0 ? (
                <div className="text-center text-xs text-slate-600 py-12">No logs recorded yet.</div>
              ) : (
                logs.map((log) => (
                  <div key={log._id} className="p-3.5 rounded-xl bg-slate-950/50 border border-white/5 text-xs flex justify-between items-center">
                    <div>
                      <p className="text-slate-300 font-semibold">{log.phone}</p>
                      <p className="text-slate-500 mt-1 truncate max-w-md">{log.messageText}</p>
                    </div>
                    <div className="text-right">
                      <span className={`px-2 py-0.5 rounded text-[8px] font-bold ${
                        log.status === 'SENT' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
                      }`}>{log.status}</span>
                      <p className="text-[10px] text-slate-600 mt-1">{new Date(log.createdAt).toLocaleTimeString()}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Campaigns;
