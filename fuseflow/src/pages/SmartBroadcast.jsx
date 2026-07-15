import React, { useState, useEffect } from 'react';
import api from '../services/api';
import {
  Send,
  Sparkles,
  Smartphone,
  Users,
  HelpCircle,
  Eye,
  AlertCircle,
  CheckCircle,
  Target,
  Clock,
  Search,
  Check
} from 'lucide-react';

const SmartBroadcast = () => {
  const [devices, setDevices] = useState([]);
  const [contacts, setContacts] = useState([]);
  
  const [selectedDeviceId, setSelectedDeviceId] = useState('');
  const [campaignName, setCampaignName] = useState('');
  const [messageText, setMessageText] = useState('');
  const [mediaUrl, setMediaUrl] = useState('');
  const [delaySeconds, setDelaySeconds] = useState(5);

  // Audience Target Selection States
  const [targetType, setTargetType] = useState('ALL');
  const [targetStage, setTargetStage] = useState('');
  const [targetTag, setTargetTag] = useState('');
  const [selectedContactIds, setSelectedContactIds] = useState([]);
  const [searchContactQuery, setSearchContactQuery] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [previewText, setPreviewText] = useState('');

  // Fetch metadata
  const fetchData = async () => {
    try {
      const devRes = await api.get('/sessions');
      const connected = devRes.data.filter(d => d.status === 'CONNECTED');
      setDevices(connected);
      if (connected.length > 0) setSelectedDeviceId(connected[0]._id);

      const contactRes = await api.get('/contacts?limit=10000');
      setContacts(contactRes.data.contacts || []);
    } catch (err) {
      setError('Failed to fetch required database values.');
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Update live preview
  useEffect(() => {
    if (messageText) {
      setPreviewText(
        messageText
          .replace(/\{\{name\}\}/gi, 'Vishwas Saxena')
          .replace(/\{\{variable\}\}/gi, 'CustomValue')
      );
    } else {
      setPreviewText('A preview of your personalized message will display here...');
    }
  }, [messageText]);

  // Find target contacts based on active filter criteria
  const getTargetContactsCount = () => {
    if (targetType === 'ALL') return contacts.length;
    if (targetType === 'STAGE') {
      if (!targetStage) return 0;
      return contacts.filter(c => c.stage === targetStage).length;
    }
    if (targetType === 'TAG') {
      if (!targetTag) return 0;
      return contacts.filter(c => c.tags?.includes(targetTag)).length;
    }
    if (targetType === 'MANUAL') return selectedContactIds.length;
    return 0;
  };

  const handleLaunch = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!selectedDeviceId) {
      setError('Please select an active connected WhatsApp device first.');
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

    setLoading(true);
    try {
      // 1. Create Campaign
      const { data: campaign } = await api.post('/campaigns', {
        name: campaignName,
        whatsappSessionId: selectedDeviceId,
        messageText,
        mediaUrl,
        delaySeconds,
        targetCriteria: {
          type: targetType,
          stage: targetStage,
          tag: targetTag,
          contactIds: selectedContactIds
        }
      });

      // 2. Start Campaign immediately
      await api.post(`/campaigns/${campaign._id}/start`);

      setSuccess('Smart broadcast campaign launched and dispatched successfully! Check Campaigns tab to view progress logs.');
      
      // Reset form
      setCampaignName('');
      setMessageText('');
      setMediaUrl('');
      setTargetType('ALL');
      setTargetStage('');
      setTargetTag('');
      setSelectedContactIds([]);
      setDelaySeconds(5);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to dispatch smart broadcast.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Welcome Banner */}
      <div>
        <h1 className="text-2xl font-extrabold text-slate-800">Smart Broadcast Builder</h1>
        <p className="text-slate-500 text-sm mt-1">Configure advanced bulk outreach sequences using personalized variables, target segment filters, and custom message delays.</p>
      </div>

      {error && (
        <div className="p-3.5 rounded-xl border border-red-200 bg-red-50 text-red-655 text-sm font-semibold flex items-center gap-2">
          <AlertCircle size={16} /> {error}
        </div>
      )}

      {success && (
        <div className="p-3.5 rounded-xl border border-emerald-250 bg-emerald-50 text-emerald-700 text-sm font-semibold flex items-center gap-2">
          <CheckCircle size={16} /> {success}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Configuration Column */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
            <form onSubmit={handleLaunch} className="flex flex-col gap-5">
              
              {/* Campaign Title */}
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">Campaign Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. July Product Launch"
                  value={campaignName}
                  onChange={(e) => setCampaignName(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-850 focus:outline-none focus:border-indigo-600 text-sm font-semibold"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Active Device */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">Dispatch Device</label>
                  <select
                    required
                    value={selectedDeviceId}
                    onChange={(e) => setSelectedDeviceId(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 focus:outline-none focus:border-indigo-650 text-sm cursor-pointer font-bold"
                  >
                    {devices.length === 0 ? (
                      <option value="">-- No connected devices --</option>
                    ) : (
                      devices.map(d => (
                        <option key={d._id} value={d._id}>{d.sessionName} (+{d.phone})</option>
                      ))
                    )}
                  </select>
                </div>

                {/* Delay Seconds */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase flex items-center gap-1">
                    <Clock size={13} /> Message Dispatch Delay (Seconds)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="300"
                    required
                    value={delaySeconds}
                    onChange={(e) => setDelaySeconds(parseInt(e.target.value) || 5)}
                    className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 focus:outline-none focus:border-indigo-650 text-sm font-semibold"
                  />
                </div>
              </div>

              {/* Target Segment Filter Selection */}
              <div className="p-4.5 rounded-2xl border border-slate-200 bg-slate-50/50 flex flex-col gap-3">
                <label className="block text-xs font-black text-slate-600 uppercase flex items-center gap-1">
                  <Target size={13} className="text-indigo-650" /> Target Audience Segment
                </label>
                
                {/* Filter Selector Pills */}
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
                      Broadcast will target {contacts.filter((c) => c.stage === targetStage).length} matching contacts.
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
                      Broadcast will target {contacts.filter((c) => c.tags?.includes(targetTag)).length} matching contacts.
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

              {/* Message Input */}
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="block text-xs font-bold text-slate-500 uppercase">Message Template Text</label>
                  <span className="text-[10px] text-slate-400 font-bold flex items-center gap-1">
                    Use <code className="text-indigo-650 font-extrabold bg-indigo-50 px-1 rounded">{"{{name}}"}</code> to insert contact name
                  </span>
                </div>
                <textarea
                  required
                  rows="6"
                  placeholder="Hello {{name}}, welcome to our platform!"
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 focus:outline-none focus:border-indigo-600 text-sm resize-none font-semibold"
                ></textarea>
              </div>

              {/* Media URL optional */}
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">Attachment Image URL (Optional)</label>
                <input
                  type="url"
                  placeholder="https://example.com/promo-banner.jpg"
                  value={mediaUrl}
                  onChange={(e) => setMediaUrl(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-850 focus:outline-none focus:border-indigo-650 text-sm font-semibold"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between border-t border-slate-100 pt-5 mt-2">
                <span className="text-xs font-bold text-slate-500">
                  Targeting <span className="text-indigo-650 font-extrabold">{getTargetContactsCount()}</span> contact(s)
                </span>
                <button
                  type="submit"
                  disabled={loading || getTargetContactsCount() === 0}
                  className="px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-100 disabled:text-slate-400 text-white text-sm font-black flex items-center gap-2 cursor-pointer transition-colors shadow-md shadow-indigo-600/10"
                >
                  <Send size={16} /> Launch Broadcast
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Live Simulation Preview Column */}
        <div className="flex flex-col gap-6">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 text-white shadow-xl flex flex-col h-[520px]">
            <div className="flex items-center gap-2 border-b border-slate-800 pb-4 mb-4">
              <Eye size={18} className="text-indigo-400" />
              <div>
                <h3 className="font-extrabold text-sm text-slate-200">WhatsApp Preview</h3>
                <p className="text-[10px] text-slate-500 font-bold">Real-time template message simulation</p>
              </div>
            </div>

            {/* Simulated Phone Screen */}
            <div className="flex-1 bg-[url('https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png')] bg-repeat bg-slate-950/90 rounded-2xl p-4 flex flex-col justify-end overflow-hidden border border-slate-800/80">
              
              {/* Msg Box */}
              <div className="bg-slate-900 border border-slate-800/60 max-w-[85%] rounded-2xl rounded-tl-none p-3 shadow-md self-start flex flex-col gap-2">
                {mediaUrl && (
                  <img
                    src={mediaUrl}
                    alt="Broadcast attachment preview"
                    onError={(e) => {
                      e.target.style.display = 'none';
                    }}
                    className="w-full h-32 object-cover rounded-xl border border-slate-800"
                  />
                )}
                <p className="text-xs leading-relaxed text-slate-100 whitespace-pre-wrap font-semibold break-words">
                  {previewText}
                </p>
                <span className="text-[9px] text-slate-500 font-bold text-right block">12:00 PM</span>
              </div>

            </div>

            <div className="mt-4 flex items-start gap-2 bg-slate-950/60 border border-slate-800 p-3.5 rounded-xl">
              <Sparkles size={16} className="text-indigo-400 shrink-0 mt-0.5" />
              <p className="text-[10px] text-slate-400 font-semibold leading-relaxed">
                Smart Broadcasts will add a custom {delaySeconds}s spacing delay between every contact destination to secure delivery integrity.
              </p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default SmartBroadcast;
