import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { Send, Smartphone, MessageSquare, Image, AlertCircle, CheckCircle, Upload, Trash2 } from 'lucide-react';

const SendMessage = () => {
  const [devices, setDevices] = useState([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState('');
  const [phone, setPhone] = useState('');
  const [messageText, setMessageText] = useState('');
  const [mediaUrl, setMediaUrl] = useState('');
  const [attachmentType, setAttachmentType] = useState('upload'); // 'upload' or 'url'
  const [uploading, setUploading] = useState(false);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 300 * 1024) {
      setError('File size exceeds the maximum limit of 300 KB. Please compress your image.');
      e.target.value = null; // Clear file input
      return;
    }

    setError('');
    setUploading(true);
    setSuccess('');
    const formData = new FormData();
    formData.append('image', file);

    try {
      const { data } = await api.post('/sessions/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setMediaUrl(data.url);
      setSuccess('Image uploaded and attached successfully!');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to upload image. Please try again.');
      e.target.value = null;
    } finally {
      setUploading(false);
    }
  };

  const fetchDevices = async () => {
    try {
      const { data } = await api.get('/sessions');
      const connectedDevices = data.filter(d => d.status === 'CONNECTED');
      setDevices(connectedDevices);
      if (connectedDevices.length > 0) {
        setSelectedDeviceId(connectedDevices[0]._id);
      }
    } catch (err) {
      setError('Failed to fetch WhatsApp connection sessions.');
    }
  };

  useEffect(() => {
    fetchDevices();
  }, []);

  const handleSend = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!selectedDeviceId) {
      setError('Please select an active connected WhatsApp device first.');
      return;
    }

    setLoading(true);
    try {
      await api.post(`/sessions/${selectedDeviceId}/send-message`, {
        phone,
        messageText,
        mediaUrl
      });
      setSuccess('Message sent successfully!');
      setPhone('');
      setMessageText('');
      setMediaUrl('');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send WhatsApp message.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-800">Send Single Message</h1>
        <p className="text-slate-500 text-sm mt-1">Directly dispatch a test or single customized WhatsApp message from your connected device.</p>
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

      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
        <form onSubmit={handleSend} className="flex flex-col gap-5">
          {/* Active Device Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">Select Active WhatsApp Device</label>
            <div className="relative">
              <select
                required
                value={selectedDeviceId}
                onChange={(e) => setSelectedDeviceId(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 focus:outline-none focus:border-indigo-600 text-sm appearance-none cursor-pointer"
              >
                {devices.length === 0 ? (
                  <option value="">-- No connected devices available --</option>
                ) : (
                  devices.map((dev) => (
                    <option key={dev._id} value={dev._id}>
                      {dev.sessionName} (+{dev.phone || 'Unknown'})
                    </option>
                  ))
                )}
              </select>
              <div className="absolute right-3.5 top-3.5 pointer-events-none text-slate-500">
                <Smartphone size={16} />
              </div>
            </div>
            {devices.length === 0 && (
              <p className="text-xs text-amber-600 font-bold mt-1.5 flex items-center gap-1">
                <AlertCircle size={12} /> Make sure to link a device in "WhatsApp Devices" and connect it.
              </p>
            )}
          </div>

          {/* Recipient Phone */}
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">Recipient Phone Number (with Country Code)</label>
            <input
              type="text"
              required
              placeholder="e.g. 919876543210"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 focus:outline-none focus:border-indigo-600 text-sm"
            />
          </div>

          {/* Message Text */}
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">Message Body</label>
            <textarea
              required
              rows="5"
              placeholder="Type your WhatsApp message here..."
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 focus:outline-none focus:border-indigo-600 text-sm resize-none"
            ></textarea>
          </div>

          {/* Media Attachment Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-2 uppercase">Image Attachment (Optional)</label>
            <div className="flex border-b border-slate-100 mb-4">
              <button
                type="button"
                onClick={() => { setAttachmentType('upload'); setMediaUrl(''); }}
                className={`flex-1 pb-2.5 text-xs font-extrabold uppercase border-b-2 transition-all ${
                  attachmentType === 'upload'
                    ? 'border-indigo-600 text-indigo-750 font-bold'
                    : 'border-transparent text-slate-400 hover:text-slate-650'
                }`}
              >
                Upload Local File (Max 300KB)
              </button>
              <button
                type="button"
                onClick={() => { setAttachmentType('url'); setMediaUrl(''); }}
                className={`flex-1 pb-2.5 text-xs font-extrabold uppercase border-b-2 transition-all ${
                  attachmentType === 'url'
                    ? 'border-indigo-600 text-indigo-755 font-bold'
                    : 'border-transparent text-slate-400 hover:text-slate-650'
                }`}
              >
                Provide Image Web URL
              </button>
            </div>

            {attachmentType === 'upload' ? (
              <div className="flex flex-col gap-3">
                {!mediaUrl ? (
                  <div className="border-2 border-dashed border-slate-200 rounded-2xl p-6 flex flex-col items-center justify-center gap-2 hover:border-indigo-500 transition-colors bg-slate-50/50">
                    <Upload size={32} className="text-slate-400" />
                    <div className="text-center">
                      <label className="relative cursor-pointer bg-white rounded-md font-semibold text-indigo-600 hover:text-indigo-550 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-indigo-500">
                        <span className="text-xs px-2 py-1.5 border border-slate-200 rounded-lg inline-block hover:bg-slate-50 transition-colors shadow-sm">Select Image</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleFileUpload}
                          className="sr-only"
                          disabled={uploading}
                        />
                      </label>
                    </div>
                    <p className="text-[10px] text-slate-400 font-medium">JPEG, PNG, WEBP (Max size: 300 KB)</p>
                  </div>
                ) : (
                  <div className="flex items-center gap-4 p-3 bg-slate-50 rounded-2xl border border-slate-200">
                    <img src={mediaUrl} alt="Attached media" className="w-16 h-16 object-cover rounded-xl border border-slate-200" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-slate-700 truncate">Uploaded Image</p>
                      <p className="text-[10px] text-slate-400 select-all truncate">{mediaUrl}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setMediaUrl('')}
                      className="p-2 text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                      title="Remove attachment"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                )}
                {uploading && (
                  <div className="flex items-center gap-2 justify-center text-xs font-semibold text-indigo-600 animate-pulse">
                    <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                    Uploading image to system...
                  </div>
                )}
              </div>
            ) : (
              <div className="relative">
                <input
                  type="url"
                  placeholder="https://example.com/image.jpg"
                  value={mediaUrl}
                  onChange={(e) => setMediaUrl(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-805 focus:outline-none focus:border-indigo-600 text-sm"
                />
                <div className="absolute left-3.5 top-3.5 text-slate-400">
                  <Image size={16} />
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end border-t border-slate-100 pt-5 mt-2">
            <button
              type="submit"
              disabled={loading || devices.length === 0}
              className="px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none text-white text-sm font-bold flex items-center gap-2 cursor-pointer transition-colors shadow-md shadow-indigo-600/10"
            >
              {loading ? (
                'Sending Message...'
              ) : (
                <>
                  <Send size={16} /> Send Message
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SendMessage;
