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
  Check,
  Paperclip,
  Image as ImageIcon,
  Video,
  FileText,
  Trash2,
  Folder,
  ChevronLeft,
  ChevronRight,
  Play,
  UploadCloud
} from 'lucide-react';

const SmartBroadcast = () => {
  const [devices, setDevices] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [lists, setLists] = useState([]);
  
  const [selectedDeviceId, setSelectedDeviceId] = useState('');
  const [campaignName, setCampaignName] = useState('');
  const [messageText, setMessageText] = useState('');
  const [delaySeconds, setDelaySeconds] = useState(5);

  // Audience Target Selection States
  const [targetType, setTargetType] = useState('ALL');
  const [targetStage, setTargetStage] = useState('');
  const [targetTag, setTargetTag] = useState('');
  const [targetListId, setTargetListId] = useState('');
  const [selectedContactIds, setSelectedContactIds] = useState([]);
  const [searchContactQuery, setSearchContactQuery] = useState('');
  
  // Attachments State
  const [attachments, setAttachments] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [activePreviewIndex, setActivePreviewIndex] = useState(0);

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

      const listRes = await api.get('/contacts/lists');
      setLists(listRes.data || []);
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

  // Adjust preview index when attachments change
  useEffect(() => {
    if (attachments.length === 0) {
      setActivePreviewIndex(0);
    } else if (activePreviewIndex >= attachments.length) {
      setActivePreviewIndex(attachments.length - 1);
    }
  }, [attachments, activePreviewIndex]);

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
    if (targetType === 'LIST') {
      if (!targetListId) return 0;
      const listObj = lists.find(l => l._id === targetListId);
      return listObj?.contacts?.length || 0;
    }
    if (targetType === 'MANUAL') return selectedContactIds.length;
    return 0;
  };

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    setUploading(true);
    setError('');

    try {
      const uploadedItems = [];
      for (const file of files) {
        const formData = new FormData();
        formData.append('file', file);

        const response = await api.post('/sessions/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });

        // Determine file type
        let fileType = 'document';
        if (file.type.startsWith('image/')) {
          fileType = 'image';
        } else if (file.type.startsWith('video/')) {
          fileType = 'video';
        } else if (file.name.endsWith('.apk')) {
          fileType = 'document';
        }

        uploadedItems.push({
          url: response.data.url,
          fileType,
          filename: response.data.filename || file.name,
          mimetype: response.data.mimetype || file.type,
          size: response.data.size || file.size
        });
      }

      setAttachments((prev) => [...prev, ...uploadedItems]);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to upload one or more files.');
    } finally {
      setUploading(false);
    }
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

    if (targetType === 'LIST' && !targetListId) {
      setError('Please select a targeted CRM list.');
      return;
    }

    if (targetType === 'MANUAL' && selectedContactIds.length === 0) {
      setError('Please select at least one contact manually.');
      return;
    }

    setLoading(true);
    try {
      // 1. Resolve targeting criteria
      let campaignTargetCriteria = {
        type: targetType,
        stage: targetStage,
        tag: targetTag,
        contactIds: selectedContactIds
      };

      if (targetType === 'LIST') {
        const listObj = lists.find(l => l._id === targetListId);
        const resolvedContactIds = listObj?.contacts?.map(c => c._id || c) || [];
        if (resolvedContactIds.length === 0) {
          setError('Selected list has no contacts.');
          setLoading(false);
          return;
        }
        campaignTargetCriteria = {
          type: 'MANUAL',
          contactIds: resolvedContactIds
        };
      }

      // 2. Create Campaign
      const { data: campaign } = await api.post('/campaigns', {
        name: campaignName,
        whatsappSessionId: selectedDeviceId,
        messageText,
        mediaUrl: attachments[0]?.url || '',
        mediaAttachments: attachments,
        delaySeconds,
        targetCriteria: campaignTargetCriteria
      });

      // 3. Start Campaign immediately
      await api.post(`/campaigns/${campaign._id}/start`);

      setSuccess('Smart campaign launched and dispatched successfully! Check progress in your Message Logs.');
      
      // Reset form
      setCampaignName('');
      setMessageText('');
      setAttachments([]);
      setTargetType('ALL');
      setTargetStage('');
      setTargetTag('');
      setTargetListId('');
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
        <h1 className="text-2xl font-extrabold text-slate-800">Smart Campaign Builder</h1>
        <p className="text-slate-500 text-sm mt-1">Configure advanced bulk outreach sequences using personalized variables, target segment filters, and custom message delays.</p>
      </div>

      {error && (
        <div className="p-3.5 rounded-xl border border-red-200 bg-red-50 text-red-650 text-sm font-semibold flex items-center gap-2">
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
                    className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 focus:outline-none focus:border-indigo-655 text-sm font-semibold"
                  />
                </div>
              </div>

              {/* Target Segment Filter Selection */}
              <div className="p-4.5 rounded-2xl border border-slate-200 bg-slate-50/50 flex flex-col gap-3">
                <label className="block text-xs font-black text-slate-600 uppercase flex items-center gap-1">
                  <Target size={13} className="text-indigo-650" /> Target Audience Segment
                </label>
                
                {/* Filter Selector Pills */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  {[
                    { value: 'ALL', label: 'All Contacts' },
                    { value: 'STAGE', label: 'By CRM Stage' },
                    { value: 'TAG', label: 'By Tag' },
                    { value: 'LIST', label: 'By CRM List' },
                    { value: 'MANUAL', label: 'Select Manually' }
                  ].map((btn) => (
                    <button
                      key={btn.value}
                      type="button"
                      onClick={() => setTargetType(btn.value)}
                      className={`py-2 px-1 rounded-xl text-[10px] sm:text-xs font-bold transition-all border cursor-pointer ${
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

                {/* Sub UI for LIST */}
                {targetType === 'LIST' && (
                  <div className="flex flex-col gap-1.5 mt-1">
                    <select
                      value={targetListId}
                      onChange={(e) => setTargetListId(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 text-xs focus:outline-none focus:border-indigo-650 font-semibold cursor-pointer"
                    >
                      <option value="">Select CRM List...</option>
                      {lists.map(list => (
                        <option key={list._id} value={list._id}>{list.name} ({list.contacts?.length || 0} contacts)</option>
                      ))}
                    </select>
                    <p className="text-[10px] text-indigo-600 font-extrabold">
                      Broadcast will target {lists.find(l => l._id === targetListId)?.contacts?.length || 0} matching contacts from selected list.
                    </p>
                  </div>
                )}

                {/* Sub UI for MANUAL */}
                {targetType === 'MANUAL' && (
                  <div className="flex flex-col gap-2 mt-1">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-bold text-slate-455">{selectedContactIds.length} recipient(s) selected</span>
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
                                className="rounded text-indigo-650 focus:ring-indigo-500 cursor-pointer"
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
                  rows="5"
                  placeholder="Hello {{name}}, welcome to our platform!"
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 focus:outline-none focus:border-indigo-600 text-sm resize-none font-semibold"
                ></textarea>
              </div>

              {/* Attachments Section */}
              <div className="flex flex-col gap-3.5">
                <div className="flex justify-between items-center">
                  <label className="block text-xs font-bold text-slate-500 uppercase">Media Attachments</label>
                  <span className="text-[10px] text-slate-400 font-bold">Upload images, videos, or APK/documents</span>
                </div>

                {/* Dropzone Uploader */}
                <div className="border-2 border-dashed border-slate-200 hover:border-indigo-500/80 rounded-2xl p-5 bg-slate-50/50 hover:bg-slate-55 transition-all flex flex-col items-center justify-center gap-2.5 relative group">
                  <input
                    type="file"
                    multiple
                    onChange={handleFileUpload}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    disabled={uploading}
                  />
                  <div className="p-3 rounded-full bg-indigo-50 text-indigo-600 group-hover:scale-110 transition-transform">
                    {uploading ? (
                      <div className="w-5 h-5 border-2 border-indigo-650 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <UploadCloud size={20} />
                    )}
                  </div>
                  <div className="text-center">
                    <p className="text-xs font-bold text-slate-700">
                      {uploading ? 'Uploading assets...' : 'Drag & drop or click to upload'}
                    </p>
                    <p className="text-[10px] text-slate-400 font-medium mt-0.5">Supports single/multiple images, videos, or APK files (No size limits)</p>
                  </div>
                </div>

                {/* Manual Media URL Add input */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    id="manualUrlInput"
                    placeholder="Or enter a media URL manually (e.g. https://...)"
                    className="flex-1 px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 focus:outline-none focus:border-indigo-650 text-xs font-semibold"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        const val = e.target.value.trim();
                        if (val) {
                          let fileType = 'image';
                          if (val.includes('.mp4') || val.includes('.mov') || val.includes('.avi')) fileType = 'video';
                          else if (val.includes('.apk') || val.includes('.pdf') || val.includes('.zip')) fileType = 'document';
                          setAttachments((prev) => [...prev, {
                            url: val,
                            fileType,
                            filename: val.split('/').pop() || 'Manual URL Attachment',
                            mimetype: ''
                          }]);
                          e.target.value = '';
                        }
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const input = document.getElementById('manualUrlInput');
                      const val = input?.value.trim();
                      if (val) {
                        let fileType = 'image';
                        if (val.includes('.mp4') || val.includes('.mov') || val.includes('.avi')) fileType = 'video';
                        else if (val.includes('.apk') || val.includes('.pdf') || val.includes('.zip')) fileType = 'document';
                        setAttachments((prev) => [...prev, {
                          url: val,
                          fileType,
                          filename: val.split('/').pop() || 'Manual URL Attachment',
                          mimetype: ''
                        }]);
                        input.value = '';
                      }
                    }}
                    className="px-4 py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-xl text-xs font-extrabold transition-colors cursor-pointer"
                  >
                    Add URL
                  </button>
                </div>

                {/* Render Attachment List */}
                {attachments.length > 0 && (
                  <div className="flex flex-col gap-2 bg-slate-50/50 border border-slate-200/60 rounded-2xl p-3">
                    <span className="text-[10px] font-extrabold text-slate-450 uppercase tracking-wider">{attachments.length} attachment(s) queued</span>
                    <div className="flex flex-col gap-2 mt-1">
                      {attachments.map((file, idx) => {
                        const isImage = file.fileType === 'image';
                        const isVideo = file.fileType === 'video';
                        return (
                          <div key={idx} className="flex items-center justify-between bg-white border border-slate-150 rounded-xl p-2.5 shadow-sm">
                            <div className="flex items-center gap-3 min-w-0">
                              {/* Preview Thumbnail or Icon */}
                              {isImage ? (
                                <img
                                  src={file.url}
                                  alt="Preview"
                                  className="w-10 h-10 rounded-lg object-cover border border-slate-200"
                                  onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=80&q=80'; }}
                                />
                              ) : (
                                <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100/50 shrink-0">
                                  {isVideo ? <Video size={16} /> : <FileText size={16} />}
                                </div>
                              )}
                              
                              <div className="min-w-0">
                                <p className="text-xs font-bold text-slate-700 truncate max-w-[200px] sm:max-w-[300px]" title={file.filename}>
                                  {file.filename}
                                </p>
                                <p className="text-[9px] text-slate-400 font-extrabold uppercase mt-0.5">
                                  {file.fileType} {file.size ? `• ${(file.size / (1024 * 1024)).toFixed(2)} MB` : ''}
                                </p>
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => {
                                setAttachments(attachments.filter((_, i) => i !== idx));
                              }}
                              className="p-2 text-slate-400 hover:text-red-650 hover:bg-red-55 rounded-lg cursor-pointer transition-colors"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between border-t border-slate-100 pt-5 mt-2">
                <span className="text-xs font-bold text-slate-500">
                  Targeting <span className="text-indigo-650 font-extrabold">{getTargetContactsCount()}</span> contact(s)
                </span>
                <button
                  type="submit"
                  disabled={loading || uploading || getTargetContactsCount() === 0}
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
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 text-white shadow-xl flex flex-col h-[560px]">
            <div className="flex items-center gap-2 border-b border-slate-800 pb-4 mb-4">
              <Eye size={18} className="text-indigo-400" />
              <div>
                <h3 className="font-extrabold text-sm text-slate-200">WhatsApp Preview</h3>
                <p className="text-[10px] text-slate-500 font-bold">Real-time template message simulation</p>
              </div>
            </div>

            {/* Simulated Phone Screen */}
            <div className="flex-1 bg-[url('https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png')] bg-repeat bg-slate-950/90 rounded-2xl p-4 flex flex-col justify-end overflow-hidden border border-slate-800/80 min-h-[300px]">
              
              {/* Msg Box */}
              <div className="bg-slate-900 border border-slate-800/60 max-w-[88%] rounded-2xl rounded-tl-none p-3 shadow-md self-start flex flex-col gap-2">
                
                {/* Media Attachment Preview with Carousel */}
                {attachments.length > 0 && (
                  <div className="relative w-full rounded-xl overflow-hidden border border-slate-800 bg-slate-950/40">
                    
                    {/* Media render */}
                    {attachments[activePreviewIndex]?.fileType === 'image' && (
                      <img
                        src={attachments[activePreviewIndex].url}
                        alt="Preview"
                        className="w-full h-36 object-cover"
                        onError={(e) => {
                          e.target.src = 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=200&q=80';
                        }}
                      />
                    )}

                    {attachments[activePreviewIndex]?.fileType === 'video' && (
                      <div className="w-full h-36 flex flex-col items-center justify-center bg-slate-950 text-slate-400 relative">
                        <Video size={28} className="text-indigo-400 mb-1" />
                        <span className="text-[10px] font-bold text-slate-300 truncate max-w-[80%] px-2">
                          {attachments[activePreviewIndex].filename}
                        </span>
                        <div className="absolute inset-0 bg-black/20 hover:bg-black/40 transition-colors flex items-center justify-center cursor-pointer">
                          <div className="p-2.5 rounded-full bg-white/10 backdrop-blur-md text-white shadow-lg">
                            <Play size={16} fill="white" />
                          </div>
                        </div>
                      </div>
                    )}

                    {attachments[activePreviewIndex]?.fileType === 'document' && (
                      <div className="w-full p-3 flex items-center gap-3 bg-slate-850/80 border-b border-slate-800">
                        <div className="w-10 h-10 bg-indigo-950/50 border border-indigo-900/50 rounded-lg text-indigo-400 flex items-center justify-center shrink-0">
                          <FileText size={18} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-slate-200 truncate" title={attachments[activePreviewIndex].filename}>
                            {attachments[activePreviewIndex].filename}
                          </p>
                          <p className="text-[9px] text-indigo-400 font-extrabold uppercase mt-0.5">
                            {attachments[activePreviewIndex].filename.endsWith('.apk') ? 'Android APK Package' : 'Document File'}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Carousel Nav Controls */}
                    {attachments.length > 1 && (
                      <div className="absolute bottom-2 right-2 bg-slate-900/80 backdrop-blur-md px-2 py-1 rounded-lg flex items-center gap-1.5 border border-slate-800/80 text-[10px] font-extrabold text-slate-300">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            setActivePreviewIndex((prev) => (prev > 0 ? prev - 1 : attachments.length - 1));
                          }}
                          className="hover:text-white cursor-pointer"
                        >
                          <ChevronLeft size={12} />
                        </button>
                        <span>{activePreviewIndex + 1}/{attachments.length}</span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            setActivePreviewIndex((prev) => (prev < attachments.length - 1 ? prev + 1 : 0));
                          }}
                          className="hover:text-white cursor-pointer"
                        >
                          <ChevronRight size={12} />
                        </button>
                      </div>
                    )}

                  </div>
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
