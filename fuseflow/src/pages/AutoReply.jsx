import React, { useEffect, useState } from 'react';
import api from '../services/api';
import {
  Plus,
  Trash2,
  AlertCircle,
  ToggleLeft,
  ToggleRight
} from 'lucide-react';
import { motion } from 'framer-motion';

const AutoReply = () => {
  const [rules, setRules] = useState([]);
  const [keywords, setKeywords] = useState('');
  const [matchType, setMatchType] = useState('EXACT');
  const [replyText, setReplyText] = useState('');
  const [replyMode, setReplyMode] = useState('STATIC');
  const [mediaUrl, setMediaUrl] = useState('');
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchRules = async () => {
    try {
      const { data } = await api.get('/autoreply');
      setRules(data);
    } catch (err) {
      setError('Failed to fetch auto-reply rules.');
    }
  };

  useEffect(() => {
    fetchRules();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!keywords.trim() || !replyText.trim()) return;

    try {
      const kwList = keywords.split(',').map((k) => k.trim()).filter((k) => k);
      const { data } = await api.post('/autoreply', {
        keywords: kwList,
        matchType,
        replyText,
        replyMode,
        mediaUrl
      });

      setRules((prev) => [data, ...prev]);
      setKeywords('');
      setReplyText('');
      setMediaUrl('');
      setShowAddModal(false);
      setSuccess('Auto-reply rule created.');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create auto-reply rule.');
    }
  };

  const handleToggle = async (ruleId, currentStatus) => {
    try {
      const { data } = await api.put(`/autoreply/${ruleId}`, { isActive: !currentStatus });
      setRules((prev) => prev.map((r) => (r._id === ruleId ? data : r)));
    } catch (err) {
      setError('Failed to toggle rule state.');
    }
  };

  const handleDelete = async (ruleId) => {
    try {
      await api.delete(`/autoreply/${ruleId}`);
      setRules((prev) => prev.filter((r) => r._id !== ruleId));
    } catch (err) {
      setError('Failed to delete rule.');
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-800">Auto Reply Rules</h1>
          <p className="text-slate-500 text-sm mt-1">Configure keyword triggers and route chats to static texts or AI.</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="px-4.5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold flex items-center gap-2 cursor-pointer transition-colors shadow-md shadow-emerald-600/10"
        >
          <Plus size={16} /> Add Rule
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

      {/* Rules Listing */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {rules.length === 0 ? (
          <div className="col-span-full bg-white border border-slate-200 rounded-3xl p-8 text-center text-slate-550 text-sm font-semibold">
            No auto-reply rules configured yet. Click "Add Rule" to automate chat triggers.
          </div>
        ) : (
          rules.map((rule) => (
            <motion.div
              key={rule._id}
              layout
              className="bg-white border border-slate-200 shadow-sm rounded-3xl p-6 flex flex-col justify-between gap-4"
            >
              <div>
                {/* Keywords Row */}
                <div className="flex flex-wrap items-center gap-1.5">
                  {rule.keywords.map((kw, i) => (
                    <span key={i} className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold">
                      {kw}
                    </span>
                  ))}
                  <span className="ml-auto text-[9px] font-extrabold tracking-wider uppercase px-2 py-0.5 rounded bg-slate-50 border border-slate-200 text-slate-500">
                    {rule.matchType}
                  </span>
                </div>

                {/* Reply Info */}
                <div className="mt-4">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Reply Output</h4>
                  <p className="text-slate-700 text-xs font-semibold mt-1.5 bg-slate-50 p-3 rounded-xl border border-slate-200 leading-relaxed">
                    {rule.replyText}
                  </p>
                  {rule.mediaUrl && (
                    <p className="text-[10px] text-slate-450 font-semibold truncate mt-1">Image attachment: {rule.mediaUrl}</p>
                  )}
                </div>
              </div>

              {/* Footer Panel */}
              <div className="flex items-center justify-between border-t border-slate-100 pt-4">
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => handleToggle(rule._id, rule.isActive)}
                    className="flex items-center gap-1.5 text-slate-500 hover:text-slate-700 text-xs font-bold transition-colors cursor-pointer"
                  >
                    {rule.isActive ? (
                      <ToggleRight size={24} className="text-emerald-600" />
                    ) : (
                      <ToggleLeft size={24} className="text-slate-300" />
                    )}
                    <span>{rule.isActive ? 'Active' : 'Paused'}</span>
                  </button>

                  <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase border ${
                    rule.replyMode === 'AI' ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : 'bg-slate-100 text-slate-500 border-slate-200'
                  }`}>{rule.replyMode} mode</span>
                </div>

                <button
                  onClick={() => handleDelete(rule._id)}
                  className="p-1.5 rounded-lg bg-red-50 hover:bg-red-100 border border-red-200 text-red-655 transition-colors cursor-pointer"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </motion.div>
          ))
        )}
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-white border border-slate-250 shadow-2xl rounded-3xl p-6">
            <h3 className="text-lg font-bold text-slate-850 mb-4">Add Auto Reply Rule</h3>
            <form onSubmit={handleCreate} className="flex flex-col gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">Keywords (Comma-separated)</label>
                <input
                  type="text"
                  required
                  value={keywords}
                  onChange={(e) => setKeywords(e.target.value)}
                  placeholder="e.g. price, cost, rate"
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 focus:outline-none focus:border-emerald-600 text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">Match Method</label>
                  <select
                    value={matchType}
                    onChange={(e) => setMatchType(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 focus:outline-none focus:border-emerald-600 text-sm"
                  >
                    <option value="EXACT">Exact match</option>
                    <option value="CONTAINS">Contains match</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">Reply Mode</label>
                  <select
                    value={replyMode}
                    onChange={(e) => setReplyMode(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 focus:outline-none focus:border-emerald-600 text-sm"
                  >
                    <option value="STATIC">Static Text</option>
                    <option value="AI">AI Assistant</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">Reply Text</label>
                <textarea
                  required
                  rows="3"
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Type the message to send back..."
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 focus:outline-none focus:border-emerald-600 text-sm resize-none"
                ></textarea>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">Image Attachment URL (Optional)</label>
                <input
                  type="url"
                  value={mediaUrl}
                  onChange={(e) => setMediaUrl(e.target.value)}
                  placeholder="https://image-link.com/photo.png"
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 focus:outline-none focus:border-emerald-600 text-sm"
                />
              </div>

              <div className="flex items-center justify-end gap-3 mt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-500 hover:bg-slate-100 text-sm font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-705 text-white text-sm font-bold cursor-pointer"
                >
                  Save Rule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AutoReply;
