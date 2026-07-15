import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { io } from 'socket.io-client';
import { useAuth } from '../context/AuthContext';
import {
  Send,
  Plus,
  Play,
  Pause,
  AlertCircle,
  Eye,
  Search,
  Users,
  Target,
  Clock,
  Check,
  RefreshCw,
  Sliders,
  X,
  FileText
} from 'lucide-react';

const Campaigns = () => {
  const { user } = useAuth();
  const [campaigns, setCampaigns] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [contacts, setContacts] = useState([]);
  
  // Creation States
  const [name, setName] = useState('');
  const [sessionId, setSessionId] = useState('');
  const [messageText, setMessageText] = useState('');
  const [mediaUrl, setMediaUrl] = useState('');
  const [delaySeconds, setDelaySeconds] = useState(5);
  const [scheduleType, setScheduleType] = useState('IMMEDIATE');
  const [scheduledAtTime, setScheduledAtTime] = useState('');

  // Audience Target Selection States
  const [targetType, setTargetType] = useState('ALL');
  const [targetStage, setTargetStage] = useState('');
  const [targetTag, setTargetTag] = useState('');
  const [selectedContactIds, setSelectedContactIds] = useState([]);
  const [searchContactQuery, setSearchContactQuery] = useState('');

  // UI Control States
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [logsCampaignId, setLogsCampaignId] = useState(null);
  const [logs, setLogs] = useState([]);
  const [logSearchQuery, setLogSearchQuery] = useState('');
  const [logStatusFilter, setLogStatusFilter] = useState('ALL');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [logsLoading, setLogsLoading] = useState(false);

  const fetchData = async () => {
    try {
      const campRes = await api.get('/campaigns');
      setCampaigns(campRes.data);

      const sessRes = await api.get('/sessions');
      setSessions(sessRes.data.filter((s) => s.status === 'CONNECTED'));

      const contactsRes = await api.get('/contacts', { params: { limit: 1000 } });
      setContacts(contactsRes.data.contacts || []);
    } catch (err) {
      setError('Failed to load page data.');
    }
  };

  useEffect(() => {
    fetchData();

    const socket = io('http://localhost:5000', {
      auth: { token: localStorage.getItem('accessToken') }
    });
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
      setError('All basic fields are required.');
      return;
    }

    if (targetType === 'STAGE' && !targetStage) {
      setError('Please select a targeted CRM stage.');
      return;
    }

    if (targetType === 'TAG' && !targetTag) {
      setError('Please specify a targeted tag name.');
      return;
    }

    if (targetType === 'MANUAL' && selectedContactIds.length === 0) {
      setError('Please select at least one contact manually.');
      return;
    }

    try {
      const { data } = await api.post('/campaigns', {
        name,
        whatsappSessionId: sessionId,
        messageText,
        mediaUrl,
        delaySeconds,
        targetCriteria: {
          type: targetType,
          stage: targetStage,
          tag: targetTag,
          contactIds: selectedContactIds
        },
        scheduledAt: scheduleType === 'SCHEDULED' ? new Date(scheduledAtTime) : new Date(),
      });
      
      setCampaigns((prev) => [data, ...prev]);
      
      // Reset form states
      setName('');
      setSessionId('');
      setMessageText('');
      setMediaUrl('');
      setTargetType('ALL');
      setTargetStage('');
      setTargetTag('');
      setSelectedContactIds([]);
      setDelaySeconds(5);
      setScheduleType('IMMEDIATE');
      setScheduledAtTime('');
      
      setShowCreateModal(false);
      setSuccess('Campaign created in Draft status.');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create campaign.');
    }
  };

  const handleStart = async (campaignId) => {
    setError('');
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
    setLogsLoading(true);
    try {
      const { data } = await api.get(`/campaigns/${campaignId}/logs`);
      setLogs(data);
    } catch (err) {
      setError('Failed to load message logs.');
    } finally {
      setLogsLoading(false);
    }
  };

  const getPercentage = (stats) => {
    if (!stats.total) return 0;
    const progress = stats.sent + stats.failed;
    return Math.round((progress / stats.total) * 100);
  };

  // Get filtered campaign logs
  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      log.phone?.toLowerCase().includes(logSearchQuery.toLowerCase()) ||
      log.messageText?.toLowerCase().includes(logSearchQuery.toLowerCase());
    
    const matchesStatus =
      logStatusFilter === 'ALL' || log.status === logStatusFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-800">Campaign Broadcaster</h1>
          <p className="text-slate-500 text-sm mt-1">Design, execute, and monitor bulk marketing blasts.</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4.5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold flex items-center gap-2 cursor-pointer transition-colors shadow-md shadow-emerald-600/10"
        >
          <Plus size={16} /> Create Campaign
        </button>
      </div>

      {error && (
        <div className="p-3.5 rounded-xl border border-red-200 bg-red-50 text-red-655 text-sm font-semibold flex items-center gap-2">
          <AlertCircle size={16} /> {error}
        </div>
      )}

      {success && (
        <div className="p-3.5 rounded-xl border border-emerald-250 bg-emerald-50 text-emerald-700 text-sm font-semibold">
          {success}
        </div>
      )}

      {/* Campaigns Listing */}
      <div className="flex flex-col gap-6">
        {campaigns.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-3xl p-8 text-center text-slate-550 text-sm font-semibold">
            No broadcasting campaigns created. Create one above to start marketing.
          </div>
        ) : (
          campaigns.map((camp) => {
            const pct = getPercentage(camp.stats);
            
            // Render friendly representation of target criteria
            let targetLabel = 'All CRM Contacts';
            if (camp.targetCriteria) {
              const tc = camp.targetCriteria;
              if (tc.type === 'STAGE') targetLabel = `CRM Stage: ${tc.stage}`;
              else if (tc.type === 'TAG') targetLabel = `Tag: ${tc.tag}`;
              else if (tc.type === 'MANUAL') targetLabel = `${tc.contactIds?.length || 0} Select Recipients`;
            }

            return (
              <div
                key={camp._id}
                className="bg-white border border-slate-200 shadow-sm rounded-3xl p-6 flex flex-col gap-4"
              >
                {/* Row Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="font-bold text-slate-800 text-sm">{camp.name}</h3>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 mt-1 font-semibold">
                      <span>Linked Device: <strong className="text-slate-700">{camp.whatsappSessionId?.sessionName || 'Deleted Device'}</strong></span>
                      <span className="h-1.5 w-1.5 bg-slate-300 rounded-full"></span>
                      <span>Targeting: <strong className="text-indigo-650">{targetLabel}</strong></span>
                      <span className="h-1.5 w-1.5 bg-slate-300 rounded-full"></span>
                      <span>Delay: <strong className="text-slate-750">{camp.delaySeconds || 5}s</strong></span>
                      <span className="h-1.5 w-1.5 bg-slate-300 rounded-full"></span>
                      <span>Scheduled: <strong className="text-emerald-650">{new Date(camp.scheduledAt).toLocaleString()}</strong></span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2.5">
                    {camp.status === 'DRAFT' && (
                      <button
                        onClick={() => handleStart(camp._id)}
                        className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors shadow-sm"
                      >
                        <Play size={12} /> Start Broadcast
                      </button>
                    )}

                    {camp.status === 'RUNNING' && (
                      <button
                        onClick={() => handlePause(camp._id)}
                        className="px-3.5 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-700 text-xs font-bold flex items-center gap-1.5 cursor-pointer border border-amber-200 transition-colors"
                      >
                        <Pause size={12} /> Pause
                      </button>
                    )}

                    {camp.status === 'PAUSED' && (
                      <button
                        onClick={() => handleResume(camp._id)}
                        className="px-3.5 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold flex items-center gap-1.5 cursor-pointer border border-emerald-250 transition-colors"
                      >
                        <Play size={12} /> Resume
                      </button>
                    )}

                    <button
                      onClick={() => viewLogs(camp._id)}
                      className="px-3.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-655 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
                    >
                      <Eye size={12} /> Logs
                    </button>

                    <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase border ${
                      camp.status === 'COMPLETED' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                      camp.status === 'RUNNING' ? 'bg-indigo-50 text-indigo-700 border-indigo-200 animate-pulse' :
                      camp.status === 'PAUSED' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                      'bg-slate-100 text-slate-500 border-slate-200'
                    }`}>{camp.status}</span>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex justify-between text-xs text-slate-500 font-semibold">
                    <span>Progress: {camp.stats.sent + camp.stats.failed} / {camp.stats.total} messages</span>
                    <span className="font-extrabold text-emerald-650">{pct}%</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden border border-slate-200/50">
                    <div
                      className="bg-emerald-600 h-full transition-all duration-300"
                      style={{ width: `${pct}%` }}
                    ></div>
                  </div>
                  <div className="flex gap-4 text-[10px] font-bold">
                    <span className="text-emerald-655">Sent: {camp.stats.sent}</span>
                    <span className="text-red-500">Failed: {camp.stats.failed}</span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-xl bg-white border border-slate-250 shadow-2xl rounded-3xl p-6 my-8">
            <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-100">
              <h3 className="text-lg font-extrabold text-slate-850">Create Broadcast Campaign</h3>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>
            
            <form onSubmit={handleCreate} className="flex flex-col gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">Campaign Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. July Summer Promo"
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 focus:outline-none focus:border-emerald-600 text-sm font-semibold"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">Select WhatsApp Device</label>
                  {sessions.length === 0 ? (
                    <p className="text-xs text-red-500 mt-1 font-semibold">No active WhatsApp device linked.</p>
                  ) : (
                    <select
                      required
                      value={sessionId}
                      onChange={(e) => setSessionId(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 focus:outline-none focus:border-emerald-600 text-sm font-bold cursor-pointer"
                    >
                      <option value="">Choose device...</option>
                      {sessions.map((s) => (
                        <option key={s._id} value={s._id}>{s.sessionName}</option>
                      ))}
                    </select>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase flex items-center gap-1">
                    <Clock size={13} /> Dispatch Delay (Sec)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="300"
                    required
                    value={delaySeconds}
                    onChange={(e) => setDelaySeconds(parseInt(e.target.value) || 5)}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-850 focus:outline-none focus:border-emerald-600 text-sm font-semibold"
                  />
                </div>
              </div>

              {/* Scheduling Section */}
              <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 flex flex-col gap-3">
                <label className="block text-xs font-black text-slate-655 uppercase flex items-center gap-1">
                  <Clock size={13} className="text-emerald-650" /> Campaign Schedule
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setScheduleType('IMMEDIATE')}
                    className={`py-2 px-1 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                      scheduleType === 'IMMEDIATE'
                        ? 'bg-emerald-600 border-emerald-600 text-white shadow-sm'
                        : 'bg-white border-slate-200 text-slate-650 hover:bg-slate-50'
                    }`}
                  >
                    Send Immediately
                  </button>
                  <button
                    type="button"
                    onClick={() => setScheduleType('SCHEDULED')}
                    className={`py-2 px-1 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                      scheduleType === 'SCHEDULED'
                        ? 'bg-emerald-600 border-emerald-600 text-white shadow-sm'
                        : 'bg-white border-slate-200 text-slate-650 hover:bg-slate-50'
                    }`}
                  >
                    Schedule for Later
                  </button>
                </div>

                {scheduleType === 'SCHEDULED' && (
                  <div className="flex flex-col gap-1.5 mt-1">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase">Start Date & Time</label>
                    <input
                      type="datetime-local"
                      required
                      value={scheduledAtTime}
                      onChange={(e) => setScheduledAtTime(e.target.value)}
                      className="w-full px-4 py-2 rounded-xl bg-white border border-slate-200 text-slate-800 text-xs focus:outline-none focus:border-emerald-655 font-semibold cursor-pointer"
                    />
                  </div>
                )}
              </div>

              {/* Target Scope Categories */}
              <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 flex flex-col gap-3">
                <div className="flex justify-between items-center">
                  <label className="block text-xs font-black text-slate-600 uppercase flex items-center gap-1">
                    <Target size={13} className="text-indigo-650" /> Target Audience Segment
                  </label>
                </div>
                
                {/* Target Type selection */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { value: 'ALL', label: 'All Contacts' },
                    { value: 'STAGE', label: 'By CRM Stage' },
                    { value: 'TAG', label: 'By Tag' },
                    { value: 'MANUAL', label: 'Select Manually' }
                  ].map((btn) => (
                    <button
                      key={btn.value}
                      type="button"
                      onClick={() => setTargetType(btn.value)}
                      className={`py-2 px-1 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                        targetType === btn.value
                          ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm'
                          : 'bg-white border-slate-200 text-slate-650 hover:bg-slate-50'
                      }`}
                    >
                      {btn.label}
                    </button>
                  ))}
                </div>

                {/* Sub UI for STAGE */}
                {targetType === 'STAGE' && (
                  <div className="flex flex-col gap-1.5 mt-1">
                    <select
                      value={targetStage}
                      onChange={(e) => setTargetStage(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 text-xs focus:outline-none focus:border-indigo-650 font-semibold cursor-pointer"
                    >
                      <option value="">Select Stage...</option>
                      <option value="lead">Lead</option>
                      <option value="contact">Contact</option>
                      <option value="demo">Demo Scheduled</option>
                      <option value="won">Won / Customer</option>
                      <option value="lost">Lost</option>
                    </select>
                    <p className="text-[10px] text-indigo-600 font-extrabold">
                      Messages will be sent to {contacts.filter((c) => c.stage === targetStage).length} matching contacts.
                    </p>
                  </div>
                )}

                {/* Sub UI for TAG */}
                {targetType === 'TAG' && (
                  <div className="flex flex-col gap-1.5 mt-1">
                    <input
                      type="text"
                      placeholder="Type tag name... (e.g. VIP)"
                      value={targetTag}
                      onChange={(e) => setTargetTag(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-800 text-xs focus:outline-none focus:border-indigo-650 font-semibold"
                    />
                    <p className="text-[10px] text-indigo-600 font-extrabold">
                      Messages will be sent to {contacts.filter((c) => c.tags?.includes(targetTag)).length} matching contacts.
                    </p>
                  </div>
                )}

                {/* Sub UI for MANUAL */}
                {targetType === 'MANUAL' && (
                  <div className="flex flex-col gap-2 mt-1">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-bold text-slate-450">{selectedContactIds.length} recipient(s) selected</span>
                      <button
                        type="button"
                        onClick={() => setSelectedContactIds(selectedContactIds.length === contacts.length ? [] : contacts.map(c => c._id))}
                        className="text-[10px] text-indigo-600 hover:text-indigo-700 font-black uppercase hover:underline cursor-pointer"
                      >
                        {selectedContactIds.length === contacts.length ? 'Deselect All' : 'Select All'}
                      </button>
                    </div>

                    <div className="relative">
                      <Search className="absolute left-2.5 top-2 text-slate-400" size={13} />
                      <input
                        type="text"
                        placeholder="Search contact by name or number..."
                        value={searchContactQuery}
                        onChange={(e) => setSearchContactQuery(e.target.value)}
                        className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-800 text-xs focus:outline-none focus:border-indigo-655"
                      />
                    </div>

                    <div className="max-h-36 overflow-y-auto flex flex-col gap-1 border border-slate-150 rounded-xl p-2 bg-white">
                      {contacts
                        .filter(c => c.name?.toLowerCase().includes(searchContactQuery.toLowerCase()) || c.phone?.includes(searchContactQuery))
                        .map((c) => {
                          const isSelected = selectedContactIds.includes(c._id);
                          return (
                            <label key={c._id} className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-slate-50 cursor-pointer text-xs font-semibold text-slate-700">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => {
                                  if (isSelected) {
                                    setSelectedContactIds(selectedContactIds.filter(id => id !== c._id));
                                  } else {
                                    setSelectedContactIds([...selectedContactIds, c._id]);
                                  }
                                }}
                                className="rounded text-indigo-650 focus:ring-indigo-500"
                              />
                              <span>{c.name} <span className="text-slate-400 font-medium">(+{c.phone})</span></span>
                            </label>
                          );
                        })}
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">Message Content (Personalization: use {"{{name}}"})</label>
                <textarea
                  required
                  rows="4"
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  placeholder="Hello {{name}}, welcome to our workspace..."
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 focus:outline-none focus:border-emerald-600 text-sm resize-none font-semibold"
                ></textarea>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">Media Image URL (Optional)</label>
                <input
                  type="url"
                  value={mediaUrl}
                  onChange={(e) => setMediaUrl(e.target.value)}
                  placeholder="https://image-link.com/promo.png"
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 focus:outline-none focus:border-emerald-600 text-sm font-semibold"
                />
              </div>

              <div className="flex items-center justify-end gap-3 mt-2 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-550 hover:bg-slate-100 text-sm font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={sessions.length === 0}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white text-sm font-black cursor-pointer shadow-md shadow-emerald-600/10"
                >
                  Create Campaign
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Logs View Panel */}
      {logsCampaignId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-2xl bg-white border border-slate-250 shadow-2xl rounded-3xl p-6 flex flex-col h-[560px] my-6">
            
            {/* Header section */}
            <div className="flex justify-between items-center pb-3 border-b border-slate-100 shrink-0">
              <div>
                <h3 className="text-lg font-black text-slate-850 flex items-center gap-1.5">
                  <FileText size={18} className="text-indigo-600" /> Campaign Dispatch logs
                </h3>
                <p className="text-[10px] text-slate-400 font-bold mt-0.5">Real-time delivery status logs recorded for this campaign.</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => viewLogs(logsCampaignId)}
                  disabled={logsLoading}
                  className="p-1.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-500 hover:text-indigo-650 cursor-pointer disabled:opacity-50"
                  title="Reload Logs"
                >
                  <RefreshCw size={14} className={logsLoading ? 'animate-spin' : ''} />
                </button>
                <button
                  onClick={() => setLogsCampaignId(null)}
                  className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Filter Log Form */}
            <div className="flex flex-col sm:flex-row gap-3 py-3 border-b border-slate-50 shrink-0 items-center justify-between">
              <div className="relative w-full sm:w-64">
                <Search size={13} className="absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search log recipient..."
                  value={logSearchQuery}
                  onChange={(e) => setLogSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs focus:outline-none focus:border-indigo-655"
                />
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Status:</span>
                <div className="flex gap-1">
                  {['ALL', 'SENT', 'FAILED'].map((st) => (
                    <button
                      key={st}
                      onClick={() => setLogStatusFilter(st)}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-colors cursor-pointer ${
                        logStatusFilter === st
                          ? 'bg-indigo-50 border-indigo-250 text-indigo-700'
                          : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            
            {/* Scrollable logs list */}
            <div className="flex-1 overflow-y-auto flex flex-col gap-2.5 py-3 pr-1">
              {logsLoading ? (
                <div className="flex justify-center items-center py-16">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent"></div>
                </div>
              ) : filteredLogs.length === 0 ? (
                <div className="text-center text-xs text-slate-450 py-16 font-semibold">No matching logs recorded.</div>
              ) : (
                filteredLogs.map((log) => (
                  <div key={log._id} className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs flex justify-between items-center hover:border-slate-300 transition-colors">
                    <div>
                      <p className="text-slate-900 font-bold">+{log.phone}</p>
                      <p className="text-slate-500 mt-1 truncate max-w-sm font-semibold">{log.messageText}</p>
                      {log.errorReason && (
                        <p className="text-[10px] text-red-500 font-bold mt-1 max-w-xs">{log.errorReason}</p>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase border inline-flex items-center gap-0.5 ${
                        log.status === 'SENT' ? 'bg-emerald-50 text-emerald-700 border-emerald-250' : 'bg-red-50 text-red-655 border-red-200'
                      }`}>
                        {log.status === 'SENT' && <Check size={8} />}
                        {log.status}
                      </span>
                      <p className="text-[10px] text-slate-400 mt-1.5 font-bold">{new Date(log.createdAt).toLocaleTimeString()}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
            
            <div className="border-t border-slate-100 pt-3 shrink-0 flex justify-between text-[10px] text-slate-450 font-bold uppercase tracking-wider">
              <span>Showing {filteredLogs.length} of {logs.length} Log Entries</span>
              <span>Workspace Server Secure API</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Campaigns;
