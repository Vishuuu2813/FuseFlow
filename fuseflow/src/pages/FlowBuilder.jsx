import React, { useEffect, useState } from 'react';
import api from '../services/api';
import {
  Workflow,
  Plus,
  Trash2,
  Play,
  CheckCircle,
  AlertCircle,
  ChevronUp,
  ChevronDown,
  Clock,
  Eye,
  RefreshCw,
  Search,
  MessageSquare,
  Sparkles,
  Link,
  ChevronLeft
} from 'lucide-react';

const FlowBuilder = () => {
  const [flows, setFlows] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Editor State
  const [isEditing, setIsEditing] = useState(false);
  const [editingFlowId, setEditingFlowId] = useState(null);
  const [flowName, setFlowName] = useState('');
  const [selectedSessionId, setSelectedSessionId] = useState('');
  const [triggerKeywordsInput, setTriggerKeywordsInput] = useState('');
  const [steps, setSteps] = useState([]);

  // Modals
  const [statsFlow, setStatsFlow] = useState(null);
  const [statsData, setStatsData] = useState(null);
  const [enrollFlow, setEnrollFlow] = useState(null);
  const [selectedContactId, setSelectedContactId] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchFlows = async () => {
    try {
      const { data } = await api.get('/flows');
      setFlows(data);
    } catch (err) {
      setError('Failed to load conversational flows.');
    }
  };

  const fetchSessionsAndContacts = async () => {
    try {
      const [sessionsRes, contactsRes] = await Promise.all([
        api.get('/sessions'),
        api.get('/contacts')
      ]);
      setSessions(sessionsRes.data);
      setContacts(contactsRes.data);
    } catch (err) {
      console.error('Failed to load session or contact details.', err);
    }
  };

  useEffect(() => {
    fetchFlows();
    fetchSessionsAndContacts();
  }, []);

  // Step Helpers
  const addStep = () => {
    setSteps([...steps, { messageText: '', mediaUrl: '', delayAmount: 5, delayUnit: 'SECONDS' }]);
  };

  const removeStep = (index) => {
    const updated = [...steps];
    updated.splice(index, 1);
    setSteps(updated);
  };

  const updateStepField = (index, field, value) => {
    const updated = [...steps];
    updated[index][field] = value;
    setSteps(updated);
  };

  const moveStep = (index, direction) => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === steps.length - 1) return;

    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    const updated = [...steps];
    const temp = updated[index];
    updated[index] = updated[targetIndex];
    updated[targetIndex] = temp;
    setSteps(updated);
  };

  const handleOpenCreate = () => {
    setIsEditing(true);
    setEditingFlowId(null);
    setFlowName('');
    setSelectedSessionId(sessions[0]?._id || '');
    setTriggerKeywordsInput('');
    setSteps([{ messageText: '', mediaUrl: '', delayAmount: 5, delayUnit: 'SECONDS' }]);
    setError('');
  };

  const handleOpenEdit = (flow) => {
    setIsEditing(true);
    setEditingFlowId(flow._id);
    setFlowName(flow.name);
    setSelectedSessionId(flow.whatsappSessionId?._id || '');
    setTriggerKeywordsInput(flow.triggerKeywords?.join(', ') || '');
    
    // Parse step delays
    const parsedSteps = flow.steps.map(step => {
      let delayAmount = step.delaySeconds || 5;
      let delayUnit = 'SECONDS';
      if (delayAmount >= 3600 && delayAmount % 3600 === 0) {
        delayAmount = delayAmount / 3600;
        delayUnit = 'HOURS';
      } else if (delayAmount >= 60 && delayAmount % 60 === 0) {
        delayAmount = delayAmount / 60;
        delayUnit = 'MINUTES';
      }
      return {
        messageText: step.messageText,
        mediaUrl: step.mediaUrl || '',
        delayAmount,
        delayUnit
      };
    });
    setSteps(parsedSteps);
    setError('');
  };

  const handleSaveFlow = async (e) => {
    e.preventDefault();
    if (!flowName.trim()) {
      setError('Flow name is required.');
      return;
    }
    if (!selectedSessionId) {
      setError('Please connect a WhatsApp device session to execute this flow.');
      return;
    }
    if (steps.length === 0) {
      setError('A conversational flow must contain at least one step.');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    // Transform trigger keywords
    const keywords = triggerKeywordsInput
      .split(',')
      .map(k => k.trim().toLowerCase())
      .filter(k => k.length > 0);

    // Transform steps into seconds
    const processedSteps = steps.map(step => {
      let multiplier = 1;
      if (step.delayUnit === 'MINUTES') multiplier = 60;
      if (step.delayUnit === 'HOURS') multiplier = 3600;
      return {
        messageText: step.messageText,
        mediaUrl: step.mediaUrl,
        delaySeconds: (parseInt(step.delayAmount) || 5) * multiplier
      };
    });

    try {
      const payload = {
        name: flowName,
        whatsappSessionId: selectedSessionId,
        triggerKeywords: keywords,
        steps: processedSteps
      };

      if (editingFlowId) {
        await api.put(`/flows/${editingFlowId}`, payload);
        setSuccess('Flow updated successfully.');
      } else {
        await api.post('/flows', payload);
        setSuccess('New conversational message flow created.');
      }

      setIsEditing(false);
      fetchFlows();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save conversational flow.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteFlow = async (id) => {
    if (!window.confirm('Are you sure you want to permanently delete this flow and drop enrolled contacts?')) return;
    try {
      await api.delete(`/flows/${id}`);
      setSuccess('Flow deleted successfully.');
      fetchFlows();
    } catch (err) {
      setError('Failed to delete conversational flow.');
    }
  };

  const handleToggleActive = async (flow) => {
    try {
      await api.put(`/flows/${flow._id}`, { isActive: !flow.isActive });
      setFlows(prev => prev.map(f => f._id === flow._id ? { ...f, isActive: !f.isActive } : f));
    } catch (err) {
      setError('Failed to update active state.');
    }
  };

  const viewStats = async (flow) => {
    setStatsFlow(flow);
    setStatsData(null);
    try {
      const { data } = await api.get(`/flows/${flow._id}/stats`);
      setStatsData(data.stats);
    } catch (err) {
      console.error(err);
    }
  };

  const handleEnrollContactSubmit = async (e) => {
    e.preventDefault();
    if (!selectedContactId || !enrollFlow) return;
    try {
      await api.post(`/flows/${enrollFlow._id}/enroll`, { contactId: selectedContactId });
      setSuccess('Contact enrolled manually into flow.');
      setEnrollFlow(null);
      setSelectedContactId('');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to enroll contact.');
    }
  };

  const filteredFlows = flows.filter(f =>
    f.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // EDITOR VIEW
  if (isEditing) {
    return (
      <div className="flex flex-col gap-6 max-w-5xl">
        <div>
          <button
            onClick={() => setIsEditing(false)}
            className="flex items-center gap-2 text-slate-500 hover:text-indigo-650 font-bold text-sm cursor-pointer transition-colors"
          >
            <ChevronLeft size={16} /> Back to Conversational Flows
          </button>
        </div>

        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-800">
              {editingFlowId ? 'Configure Flow Sequence' : 'Create Message Flow'}
            </h1>
            <p className="text-slate-550 text-sm mt-1">Design automated multi-step auto-replies scheduled relative to enrolment or keywords.</p>
          </div>
        </div>

        {error && (
          <div className="p-3.5 rounded-xl border border-red-200 bg-red-50 text-red-655 text-sm font-semibold">
            {error}
          </div>
        )}

        <form onSubmit={handleSaveFlow} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Settings Panel */}
          <div className="lg:col-span-1 flex flex-col gap-5 bg-white border border-slate-200 rounded-3xl p-6 shadow-sm self-start">
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">Flow Metadata</h3>
            
            <div className="flex flex-col gap-1.5">
              <label className="block text-xs font-bold text-slate-500 uppercase">Flow Name</label>
              <input
                type="text"
                required
                placeholder="e.g. Lead Nurturing Flow"
                value={flowName}
                onChange={(e) => setFlowName(e.target.value)}
                className="w-full px-4 py-2.5 text-sm rounded-xl bg-slate-50 border border-slate-200 text-slate-800 focus:outline-none focus:border-indigo-600 font-semibold"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="block text-xs font-bold text-slate-500 uppercase">Connected Device Session</label>
              <select
                required
                value={selectedSessionId}
                onChange={(e) => setSelectedSessionId(e.target.value)}
                className="w-full px-4 py-2.5 text-sm rounded-xl bg-slate-50 border border-slate-200 text-slate-800 focus:outline-none focus:border-indigo-600 font-semibold cursor-pointer"
              >
                <option value="">-- Choose active session --</option>
                {sessions.map(s => (
                  <option key={s._id} value={s._id}>
                    {s.sessionName} (+{s.phoneNumber})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="block text-xs font-bold text-slate-500 uppercase">Trigger Keywords</label>
              <input
                type="text"
                placeholder="start, join, hello (comma separated)"
                value={triggerKeywordsInput}
                onChange={(e) => setTriggerKeywordsInput(e.target.value)}
                className="w-full px-4 py-2.5 text-sm rounded-xl bg-slate-50 border border-slate-200 text-slate-800 focus:outline-none focus:border-indigo-600 font-semibold"
              />
              <p className="text-[10px] text-slate-400 font-medium">When a contact sends this word, they automatically enroll in the flow.</p>
            </div>

            <div className="border-t border-slate-100 pt-4 flex gap-3">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-500 text-xs font-bold transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-colors cursor-pointer shadow-md shadow-indigo-600/10 flex items-center justify-center gap-1"
              >
                {loading && <RefreshCw size={12} className="animate-spin" />}
                Save Flow
              </button>
            </div>
          </div>

          {/* Sequence Steps Panel */}
          <div className="lg:col-span-2 flex flex-col gap-5">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">Flow Sequence Steps</h3>
              <button
                type="button"
                onClick={addStep}
                className="px-3 py-1.5 rounded-lg bg-indigo-50 border border-indigo-150 text-indigo-700 text-xs font-bold flex items-center gap-1 hover:bg-indigo-100 transition-colors cursor-pointer"
              >
                <Plus size={14} /> Add Sequence Step
              </button>
            </div>

            <div className="flex flex-col gap-4">
              {steps.map((step, idx) => (
                <div key={idx} className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm flex flex-col gap-4 relative">
                  {/* Header / Number & Ordering Controls */}
                  <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                    <span className="px-2.5 py-1 rounded-lg bg-indigo-50 border border-indigo-100 text-[10px] font-black text-indigo-700 uppercase tracking-wider">
                      Step {idx + 1}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => moveStep(idx, 'up')}
                        disabled={idx === 0}
                        className="p-1 rounded hover:bg-slate-100 text-slate-400 disabled:opacity-30 cursor-pointer"
                      >
                        <ChevronUp size={16} />
                      </button>
                      <button
                        type="button"
                        onClick={() => moveStep(idx, 'down')}
                        disabled={idx === steps.length - 1}
                        className="p-1 rounded hover:bg-slate-100 text-slate-400 disabled:opacity-30 cursor-pointer"
                      >
                        <ChevronDown size={16} />
                      </button>
                      <button
                        type="button"
                        onClick={() => removeStep(idx)}
                        className="p-1 rounded hover:bg-red-50 text-red-500 cursor-pointer ml-1"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>

                  {/* Message Input */}
                  <div className="flex flex-col gap-1">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase">Message Text</label>
                    <textarea
                      required
                      placeholder="Type the message to send in this step..."
                      rows={3}
                      value={step.messageText}
                      onChange={(e) => updateStepField(idx, 'messageText', e.target.value)}
                      className="w-full px-4 py-2.5 text-xs rounded-xl bg-slate-50 border border-slate-200 text-slate-805 focus:outline-none focus:border-indigo-600 font-medium"
                    />
                  </div>

                  {/* Media & Delay Fields */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase">Media attachment URL (Optional)</label>
                      <input
                        type="text"
                        placeholder="https://example.com/image.png"
                        value={step.mediaUrl}
                        onChange={(e) => updateStepField(idx, 'mediaUrl', e.target.value)}
                        className="w-full px-4 py-2.5 text-xs rounded-xl bg-slate-50 border border-slate-200 text-slate-805 focus:outline-none focus:border-indigo-600"
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase">Delay Offset before send</label>
                      <div className="flex gap-2">
                        <input
                          type="number"
                          required
                          min={1}
                          value={step.delayAmount}
                          onChange={(e) => updateStepField(idx, 'delayAmount', parseInt(e.target.value) || 1)}
                          className="w-20 px-3 py-2 text-xs rounded-xl bg-slate-50 border border-slate-200 text-slate-805 font-bold"
                        />
                        <select
                          value={step.delayUnit}
                          onChange={(e) => updateStepField(idx, 'delayUnit', e.target.value)}
                          className="flex-1 px-3 py-2 text-xs rounded-xl bg-slate-50 border border-slate-200 text-slate-805 font-bold cursor-pointer"
                        >
                          <option value="SECONDS">Seconds</option>
                          <option value="MINUTES">Minutes</option>
                          <option value="HOURS">Hours</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {steps.length === 0 && (
                <div className="p-8 text-center bg-white border border-dashed border-slate-200 rounded-3xl text-slate-400 font-bold text-sm">
                  Add steps using the button above to build your sequence.
                </div>
              )}
            </div>
          </div>
        </form>
      </div>
    );
  }

  // MAIN FLOWS DIRECTORY VIEW
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-800">Conversational Flows</h1>
          <p className="text-slate-500 text-sm mt-1">Design sequences of messages that trigger relative to contact enrollment or auto-replies.</p>
        </div>
        <button
          onClick={handleOpenCreate}
          className="px-4.5 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold flex items-center gap-2 cursor-pointer transition-all shadow-md shadow-indigo-600/10"
        >
          <Plus size={16} /> Create Flow
        </button>
      </div>

      {error && (
        <div className="p-3.5 rounded-xl border border-red-200 bg-red-50 text-red-655 text-sm font-semibold">
          {error}
        </div>
      )}

      {success && (
        <div className="p-3.5 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-700 text-sm font-semibold">
          {success}
        </div>
      )}

      {/* SEARCH AND FILTER */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col gap-5">
        <div className="flex justify-between items-center">
          <h2 className="text-base font-bold text-slate-800">My Sequences</h2>
          <div className="relative w-72">
            <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
            <input
              type="text"
              placeholder="Search flows..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm rounded-xl bg-slate-50 border border-slate-200 text-slate-700 placeholder-slate-400 focus:outline-none focus:border-indigo-600"
            />
          </div>
        </div>

        {/* FLOWS GRID */}
        {filteredFlows.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredFlows.map((flow) => (
              <div key={flow._id} className="border border-slate-200 rounded-3xl p-6 bg-white flex flex-col justify-between gap-5 transition-shadow hover:shadow-md">
                <div>
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <h4 className="font-extrabold text-slate-800 text-base flex items-center gap-2">
                        <Workflow size={16} className="text-indigo-600" />
                        {flow.name}
                      </h4>
                      <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">
                        Device: {flow.whatsappSessionId?.sessionName || 'Not Linked'}
                      </p>
                    </div>
                    {/* Active toggle */}
                    <button
                      onClick={() => handleToggleActive(flow)}
                      className={`px-2.5 py-1 rounded-full text-[10px] font-black tracking-wider uppercase border transition-colors cursor-pointer ${
                        flow.isActive
                          ? 'bg-emerald-50 border-emerald-100 text-emerald-700'
                          : 'bg-slate-100 border-slate-200 text-slate-450'
                      }`}
                    >
                      {flow.isActive ? 'Active' : 'Inactive'}
                    </button>
                  </div>

                  {/* Trigger Keywords */}
                  <div className="mt-4 flex flex-col gap-1.5">
                    <span className="text-[10px] text-slate-450 font-bold uppercase tracking-wider">Triggers keywords</span>
                    <div className="flex flex-wrap gap-1">
                      {flow.triggerKeywords && flow.triggerKeywords.length > 0 ? (
                        flow.triggerKeywords.map((k, i) => (
                          <span key={i} className="px-2 py-0.5 rounded-lg bg-indigo-50 border border-indigo-100 text-[10px] font-bold text-indigo-700">
                            {k}
                          </span>
                        ))
                      ) : (
                        <span className="text-[10px] text-slate-400 italic font-semibold">No keyword triggers (Manual enrollment only)</span>
                      )}
                    </div>
                  </div>

                  {/* Steps count & delays info */}
                  <div className="mt-4 flex justify-between items-center text-xs border-t border-slate-50 pt-3">
                    <span className="text-slate-500 font-bold">Steps count:</span>
                    <span className="text-slate-800 font-black">{flow.steps?.length || 0} step(s)</span>
                  </div>
                </div>

                <div className="flex flex-col gap-2 pt-2 border-t border-slate-100">
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => viewStats(flow)}
                      className="py-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-bold flex items-center justify-center gap-1 cursor-pointer transition-colors"
                    >
                      <Eye size={13} /> Stats
                    </button>
                    <button
                      onClick={() => {
                        setEnrollFlow(flow);
                        setSelectedContactId('');
                      }}
                      className="py-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-bold flex items-center justify-center gap-1 cursor-pointer transition-colors"
                    >
                      <Play size={13} className="text-emerald-600" /> Enroll Contact
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => handleOpenEdit(flow)}
                      className="py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 border border-indigo-150 text-indigo-700 text-xs font-bold cursor-pointer transition-colors"
                    >
                      Edit Sequence
                    </button>
                    <button
                      onClick={() => handleDeleteFlow(flow._id)}
                      className="py-2 rounded-xl bg-red-50 hover:bg-red-100 border border-red-200 text-red-655 text-xs font-bold cursor-pointer transition-colors flex items-center justify-center gap-1"
                    >
                      <Trash2 size={13} /> Remove
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-16 text-center flex flex-col items-center justify-center gap-3">
            <div className="h-16 w-16 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 shadow-inner">
              <Workflow size={28} />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-base">Create your first Flow</h3>
              <p className="text-slate-500 text-xs mt-1 max-w-sm">Setup conversational workflows that trigger automatically when users message your connected Whatsapp lines.</p>
            </div>
            <button
              onClick={handleOpenCreate}
              className="mt-2 px-4 py-2 rounded-xl bg-indigo-600 text-white font-bold text-xs hover:bg-indigo-700 cursor-pointer shadow-md shadow-indigo-600/10"
            >
              Get Started
            </button>
          </div>
        )}
      </div>

      {/* STATISTICS MODAL */}
      {statsFlow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-white border border-slate-200 shadow-2xl rounded-3xl p-6 flex flex-col gap-5">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-800">Flow Enrolment Analytics</h3>
              <button onClick={() => setStatsFlow(null)} className="text-slate-400 hover:text-slate-655 text-lg cursor-pointer">×</button>
            </div>
            <div className="flex flex-col gap-4">
              <h4 className="text-sm font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 rounded-xl p-3 text-center">
                {statsFlow.name}
              </h4>

              {statsData ? (
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex flex-col items-center justify-center">
                    <span className="text-xl font-black text-slate-800">{statsData.total}</span>
                    <span className="text-[10px] font-bold uppercase text-slate-400 mt-1">Total Enrolled</span>
                  </div>
                  <div className="bg-amber-50 p-4 rounded-2xl border border-amber-100 flex flex-col items-center justify-center">
                    <span className="text-xl font-black text-amber-700">{statsData.active}</span>
                    <span className="text-[10px] font-bold uppercase text-amber-500 mt-1">Active State</span>
                  </div>
                  <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-100 flex flex-col items-center justify-center">
                    <span className="text-xl font-black text-emerald-700">{statsData.completed}</span>
                    <span className="text-[10px] font-bold uppercase text-emerald-600 mt-1">Completed</span>
                  </div>
                  <div className="bg-red-50 p-4 rounded-2xl border border-red-100 flex flex-col items-center justify-center">
                    <span className="text-xl font-black text-red-700">{statsData.failed}</span>
                    <span className="text-[10px] font-bold uppercase text-red-550 mt-1">Aborted/Failed</span>
                  </div>
                </div>
              ) : (
                <div className="flex justify-center items-center py-6">
                  <RefreshCw size={24} className="animate-spin text-indigo-650" />
                </div>
              )}
            </div>
            <button
              onClick={() => setStatsFlow(null)}
              className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-655 text-xs font-bold transition-colors mt-2 cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* MANUAL ENROLLMENT MODAL */}
      {enrollFlow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-sm p-4">
          <form onSubmit={handleEnrollContactSubmit} className="w-full max-w-md bg-white border border-slate-200 shadow-2xl rounded-3xl p-6 flex flex-col gap-5">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-800">Enroll CRM Contact</h3>
              <button type="button" onClick={() => setEnrollFlow(null)} className="text-slate-400 hover:text-slate-655 text-lg cursor-pointer">×</button>
            </div>
            <div className="flex flex-col gap-4">
              <p className="text-xs text-slate-500 font-semibold">
                Manually push a contact from your CRM directory to start executing this conversational sequence.
              </p>
              
              <div className="flex flex-col gap-1">
                <label className="block text-[10px] font-bold text-slate-500 uppercase">Select Contact</label>
                <select
                  required
                  value={selectedContactId}
                  onChange={(e) => setSelectedContactId(e.target.value)}
                  className="w-full px-4 py-2.5 text-xs rounded-xl bg-slate-50 border border-slate-200 text-slate-800 font-bold focus:outline-none focus:border-indigo-600 cursor-pointer"
                >
                  <option value="">-- Choose contact --</option>
                  {contacts.map(c => (
                    <option key={c._id} value={c._id}>
                      {c.name} (+{c.phone})
                    </option>
                  ))}
                </select>
              </div>
            </div>
            
            <div className="flex gap-3 mt-2">
              <button
                type="button"
                onClick={() => setEnrollFlow(null)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-500 text-xs font-bold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer transition-colors shadow-md shadow-emerald-600/10 flex items-center justify-center gap-1"
              >
                <Play size={13} /> Enroll Now
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default FlowBuilder;
