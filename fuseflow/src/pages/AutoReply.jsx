import React, { useEffect, useState } from 'react';
import api from '../services/api';
import {
  MessageSquare,
  Plus,
  Trash2,
  CheckCircle2,
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
    <div className="flex flex-col gap-8">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">Auto Reply Rules</h1>
          <p className="text-slate-400 text-sm mt-1">Configure keyword triggers and route chats to static texts or AI.</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 text-sm font-semibold flex items-center gap-2 cursor-pointer transition-colors"
        >
          <Plus size={16} /> Add Rule
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

      {/* Rules Listing */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {rules.length === 0 ? (
          <div className="col-span-full backdrop-blur-md bg-slate-900/20 border border-white/5 rounded-2xl p-8 text-center text-slate-500 text-sm">
            No auto-reply rules configured yet. Click "Add Rule" to automate chat triggers.
          </div>
        ) : (
          rules.map((rule) => (
            <motion.div
              key={rule._id}
              layout
              className="backdrop-blur-md bg-slate-900/40 border border-white/5 shadow-xl rounded-2xl p-6 flex flex-col justify-between gap-4"
            >
              <div>
                {/* Keywords Row */}
                <div className="flex flex-wrap items-center gap-1.5">
                  {rule.keywords.map((kw, i) => (
                    <span key={i} className="px-2.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/15 text-[10px] font-semibold">
                      {kw}
                    </span>
                  ))}
                  <span className="ml-auto text-[9px] font-bold tracking-wider uppercase px-2 py-0.5 rounded bg-slate-800 border border-white/5 text-slate-400">
                    {rule.matchType}
                  </span>
                </div>

                {/* Reply Info */}
                <div className="mt-4">
                  <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Reply Output</h4>
                  <p className="text-slate-300 text-xs font-medium mt-1 bg-slate-950/40 p-3 rounded-xl border border-white/5 leading-relaxed">
                    {rule.replyText}
                  </p>
                  {rule.mediaUrl && (
                    <p className="text-[10px] text-slate-500 truncate mt-1">Image attachments: {rule.mediaUrl}</p>
                  )}
                </div>
              </div>

              {/* Footer Panel */}
              <div className="flex items-center justify-between border-t border-white/5 pt-4">
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => handleToggle(rule._id, rule.isActive)}
                    className="flex items-center gap-1.5 text-slate-400 hover:text-slate-300 text-xs font-semibold transition-colors cursor-pointer"
                  >
                    {rule.isActive ? (
                      <ToggleRight size={24} className="text-emerald-400" />
                    ) : (
                      <ToggleLeft size={24} className="text-slate-600" />
                    )}
                    <span>{rule.isActive ? 'Active' : 'Paused'}</span>
                  </button>

                  <span className={`px-2 py-0.5 rounded text-[8px] font-bold border ${
                    rule.replyMode === 'AI' ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' : 'bg-slate-800 text-slate-500 border-white/5'
                  }`}>{rule.replyMode} mode</span>
                </div>

                <button
                  onClick={() => handleDelete(rule._id)}
                  className="p-1.5 rounded-lg bg-red-500/5 hover:bg-red-500/10 border border-red-500/10 text-red-500 transition-colors cursor-pointer"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md backdrop-blur-xl bg-slate-900 border border-white/5 shadow-2xl rounded-3xl p-6">
            <h3 className="text-lg font-bold text-slate-100 mb-4">Add Auto Reply Rule</h3>
            <form onSubmit={handleCreate} className="flex flex-col gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Keywords (Comma-separated)</label>
                <input
                  type="text"
                  required
                  value={keywords}
                  onChange={(e) => setKeywords(e.target.value)}
                  placeholder="e.g. price, cost, rate"
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950/50 border border-white/5 text-slate-300 focus:outline-none focus:border-emerald-500 text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Match Method</label>
                  <select
                    value={matchType}
                    onChange={(e) => setMatchType(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-950/50 border border-white/5 text-slate-400 focus:outline-none focus:border-emerald-500 text-sm"
                  >
                    <option value="EXACT">Exact match</option>
                    <option value="CONTAINS">Contains match</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Reply Mode</label>
                  <select
                    value={replyMode}
                    onChange={(e) => setReplyMode(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-950/50 border border-white/5 text-slate-400 focus:outline-none focus:border-emerald-500 text-sm"
                  >
                    <option value="STATIC">Static Text</option>
                    <option value="AI">AI Assistant</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Reply Text</label>
                <textarea
                  required
                  rows="3"
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Type the message to send back..."
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950/50 border border-white/5 text-slate-300 focus:outline-none focus:border-emerald-500 text-sm resize-none"
                ></textarea>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Image Attachment URL (Optional)</label>
                <input
                  type="url"
                  value={mediaUrl}
                  onChange={(e) => setMediaUrl(e.target.value)}
                  placeholder="https://image-link.com/photo.png"
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950/50 border border-white/5 text-slate-300 focus:outline-none focus:border-emerald-500 text-sm"
                />
              </div>

              <div className="flex items-center justify-end gap-3 mt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-400 hover:bg-slate-800 hover:text-slate-200 text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 text-xs font-semibold cursor-pointer"
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
