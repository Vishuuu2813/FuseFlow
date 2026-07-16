import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { Plus, Trash2, AlertCircle, ToggleLeft, ToggleRight, ChevronLeft, MessageSquare, X, Edit2, Filter, Search, CheckCircle2, Shield, Info, Save } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import AutomationSandbox from '../components/AutomationSandbox';

const EMPTY = { keywords: '', matchType: 'CONTAINS', accuracy: 75, replyText: '', replyMode: 'STATIC', mediaUrl: '' };

const AutoReply = () => {
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('list'); // 'list' | 'form' | 'sandbox'
  const [editingRule, setEditingRule] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState('ALL');
  const [showInfo, setShowInfo] = useState(false);

  const sf = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const fetchRules = async () => {
    try { const { data } = await api.get('/autoreply'); setRules(data); }
    catch { setError('Failed to fetch rules.'); } finally { setLoading(false); }
  };

  useEffect(() => { fetchRules(); }, []);

  const openCreate = () => { setEditingRule(null); setForm(EMPTY); setError(''); setSuccess(''); setView('form'); };
  const openEdit = (r) => {
    setEditingRule(r);
    setForm({ keywords: r.keywords.join(', '), matchType: r.matchType, accuracy: r.matchType === 'EXACT' ? 100 : 75, replyText: r.replyText, replyMode: r.replyMode, mediaUrl: r.mediaUrl || '' });
    setError(''); setSuccess(''); setView('form');
  };

  const handleSave = async (e) => {
    e.preventDefault(); setError(''); setSaving(true);
    const kwList = form.keywords.split(',').map(k => k.trim()).filter(Boolean);
    if (!kwList.length || !form.replyText.trim()) { setError('Keywords and reply text required.'); setSaving(false); return; }
    const payload = { keywords: kwList, matchType: form.matchType, replyText: form.replyText, replyMode: form.replyMode, mediaUrl: form.mediaUrl };
    try {
      if (editingRule) {
        const { data } = await api.put(`/autoreply/${editingRule._id}`, payload);
        setRules(p => p.map(r => r._id === editingRule._id ? data : r));
      } else {
        const { data } = await api.post('/autoreply', payload);
        setRules(p => [data, ...p]);
      }
      setSuccess(editingRule ? 'Rule updated!' : 'Rule created!');
      setTimeout(() => { setView('list'); setSuccess(''); }, 700);
    } catch (err) { setError(err.response?.data?.message || 'Save failed.'); }
    finally { setSaving(false); }
  };

  const handleToggle = async (id, cur) => {
    try { const { data } = await api.put(`/autoreply/${id}`, { isActive: !cur }); setRules(p => p.map(r => r._id === id ? data : r)); }
    catch { setError('Toggle failed.'); }
  };

  const handleToggleAll = async (state) => {
    try {
      await Promise.all(rules.map(r => api.put(`/autoreply/${r._id}`, { isActive: state })));
      setRules(p => p.map(r => ({ ...r, isActive: state })));
      setSuccess(state ? 'All rules activated.' : 'All rules paused.');
      setTimeout(() => setSuccess(''), 2500);
    } catch { setError('Bulk toggle failed.'); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this rule?')) return;
    try { await api.delete(`/autoreply/${id}`); setRules(p => p.filter(r => r._id !== id)); }
    catch { setError('Delete failed.'); }
  };

  const handleUpload = async (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData(); fd.append('file', file);
      const { data } = await api.post('/sessions/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      sf('mediaUrl', data.url);
    } catch { setError('Upload failed.'); } finally { setUploading(false); }
  };

  const filtered = rules
    .filter(r => filterMode === 'ALL' || r.replyMode === filterMode)
    .filter(r => !searchQuery.trim() || r.keywords.some(k => k.includes(searchQuery.toLowerCase())) || r.replyText.toLowerCase().includes(searchQuery.toLowerCase()));

  // ── SANDBOX VIEW ──
  if (view === 'sandbox') return (
    <div className="flex flex-col gap-6 max-w-4xl">
      <button onClick={() => setView('list')} className="flex items-center gap-2 text-slate-500 hover:text-indigo-600 font-bold text-sm cursor-pointer"><ChevronLeft size={16}/>Back</button>
      <h1 className="text-2xl font-extrabold text-slate-800">Bot Chat Simulator</h1>
      <AutomationSandbox />
    </div>
  );

  // ── FORM VIEW ──
  if (view === 'form') return (
    <div className="flex flex-col gap-6 max-w-3xl">
      <div className="flex items-center gap-3">
        <button onClick={() => setView('list')} className="p-2 rounded-xl hover:bg-slate-100 text-slate-500 cursor-pointer transition-colors"><ChevronLeft size={18}/></button>
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">{editingRule ? 'Edit Rule' : 'New Auto Reply Rule'}</h1>
          <p className="text-sm text-slate-500">Configure keyword triggers and the automated response.</p>
        </div>
      </div>

      {error && <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-center gap-2"><AlertCircle size={14}/>{error}</div>}
      {success && <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm flex items-center gap-2"><CheckCircle2 size={14}/>{success}</div>}

      <form onSubmit={handleSave} className="flex flex-col gap-5">
        {/* Keywords */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col gap-3">
          <h3 className="text-xs font-black text-slate-500 uppercase tracking-wider">Trigger Keywords</h3>
          <input type="text" required value={form.keywords} onChange={e => sf('keywords', e.target.value)}
            placeholder="e.g. hello sir, hi there, greet"
            className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm focus:outline-none focus:border-emerald-500 font-semibold"/>
          {form.keywords.trim() && (
            <div className="flex flex-wrap gap-1.5">
              {form.keywords.split(',').map((k,i) => k.trim() && (
                <span key={i} className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold">{k.trim()}</span>
              ))}
            </div>
          )}
          <p className="text-[10px] text-slate-400">Comma-separated. Longer keywords auto get higher priority over shorter ones.</p>
        </div>

        {/* Accuracy */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col gap-3">
          <div className="flex justify-between items-center">
            <h3 className="text-xs font-black text-slate-500 uppercase tracking-wider">Match Accuracy</h3>
            <div className="flex items-center gap-2">
              <span className="text-sm font-black text-emerald-600">{form.matchType === 'EXACT' ? '100%' : `${form.accuracy}%`}</span>
              <span className="text-[10px] px-2 py-0.5 rounded-lg font-black uppercase bg-slate-50 text-slate-500 border border-slate-200">
                {form.matchType === 'EXACT' ? 'Exact' : 'Contains'}
              </span>
            </div>
          </div>
          {(() => {
            const sliderVal = form.matchType === 'EXACT' ? 100 : form.accuracy;
            const pct = ((sliderVal - 50) / 50) * 100;
            return (
              <input type="range" min="50" max="100" step="5"
                value={sliderVal}
                onChange={e => { const v = Number(e.target.value); v === 100 ? sf('matchType','EXACT') : (sf('matchType','CONTAINS'), sf('accuracy', v)); }}
                className="w-full h-2 rounded-full appearance-none cursor-pointer"
                style={{ background: `linear-gradient(to right, #059669 0%, #059669 ${pct}%, #e2e8f0 ${pct}%, #e2e8f0 100%)` }}
              />
            );
          })()}
          <div className="flex justify-between text-[10px] text-slate-400 font-bold">
            <span>50% — Fuzzy / Partial</span><span>100% — Exact Match</span>
          </div>
          <p className="text-[10px] text-slate-400">
            {form.matchType === 'EXACT' ? '🎯 Full message must match keyword exactly.' : '🔍 Message just needs to contain the keyword anywhere.'}
          </p>
        </div>

        {/* Reply Mode */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col gap-3">
          <h3 className="text-xs font-black text-slate-500 uppercase tracking-wider">Reply Mode</h3>
          <div className="grid grid-cols-2 gap-3">
            {['STATIC','AI'].map(m => (
              <button key={m} type="button" onClick={() => sf('replyMode', m)}
                className={`py-3 rounded-xl text-sm font-black border transition-all cursor-pointer ${
                  form.replyMode === m ? 'bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-600/20' : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-emerald-300'
                }`}>
                {m === 'STATIC' ? '💬 Static Text' : '🤖 AI Assistant'}
              </button>
            ))}
          </div>
        </div>

        {/* Reply Text + Media */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col gap-4">
          <h3 className="text-xs font-black text-slate-500 uppercase tracking-wider">Response</h3>
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">Reply Message *</label>
            <textarea required rows="4" value={form.replyText} onChange={e => sf('replyText', e.target.value)}
              placeholder={form.replyMode === 'AI' ? 'AI prompt context (optional)...' : 'Type the message to send automatically...'}
              className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm resize-none focus:outline-none focus:border-emerald-500 font-semibold"/>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">Media Attachment (Optional)</label>
            <div className="flex gap-2">
              <input type="text" value={form.mediaUrl} onChange={e => sf('mediaUrl', e.target.value)}
                placeholder="https://..." className="flex-1 px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm focus:outline-none focus:border-emerald-500 font-semibold"/>
              <label className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 cursor-pointer flex items-center gap-1.5">
                <input type="file" className="hidden" onChange={handleUpload} disabled={uploading}/>
                {uploading ? '...' : '📎 Upload'}
              </label>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <button type="button" onClick={() => setView('list')} className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-bold hover:bg-slate-100 cursor-pointer">Cancel</button>
          <button type="submit" disabled={saving}
            className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-black cursor-pointer flex items-center gap-2 disabled:opacity-60 shadow-md shadow-emerald-600/20">
            <Save size={15}/>{saving ? 'Saving...' : editingRule ? 'Update Rule' : 'Save Rule'}
          </button>
        </div>
      </form>
    </div>
  );

  // ── LIST VIEW ──
  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">Auto Reply Rules</h1>
          <p className="text-sm text-slate-500 mt-1">Keyword-triggered automated responses — static text or AI-powered.</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={() => setShowInfo(!showInfo)}
            className="p-2.5 rounded-xl border border-slate-200 bg-white text-slate-500 hover:text-indigo-600 hover:border-indigo-300 cursor-pointer transition-colors" title="Keyword conflict info">
            <Info size={16}/>
          </button>
          <button onClick={() => setView('sandbox')}
            className="px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-bold flex items-center gap-2 cursor-pointer shadow-md shadow-violet-600/15">
            <MessageSquare size={15}/> Bot Sandbox
          </button>
          <button onClick={openCreate}
            className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-black flex items-center gap-2 cursor-pointer shadow-md shadow-emerald-600/15">
            <Plus size={15}/> Add Rule
          </button>
        </div>
      </div>

      {/* Conflict Info Banner */}
      <AnimatePresence>
        {showInfo && (
          <motion.div initial={{opacity:0,y:-8}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-8}}
            className="bg-indigo-50 border border-indigo-200 rounded-2xl p-4 flex gap-3">
            <Shield size={18} className="text-indigo-600 flex-shrink-0 mt-0.5"/>
            <div>
              <p className="text-sm font-extrabold text-indigo-800">✅ Keyword Conflict — Auto Priority System Active</p>
              <p className="text-xs text-indigo-700 leading-relaxed mt-1">
                <strong>Problem was:</strong> "hello sir" aur "hello sir send me scanner" dono rules hone par, shorter keyword galat reply bhejta tha.<br/>
                <strong>Fix applied:</strong> Longer keywords ko automatically higher priority milti hai. "hello sir send me scanner" ab hamesha "hello sir" se pehle check hoga.
              </p>
            </div>
            <button onClick={() => setShowInfo(false)} className="text-indigo-400 hover:text-indigo-600 cursor-pointer flex-shrink-0 ml-auto"><X size={15}/></button>
          </motion.div>
        )}
      </AnimatePresence>

      {error && <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-center gap-2"><AlertCircle size={14}/>{error}<button onClick={() => setError('')} className="ml-auto cursor-pointer"><X size={13}/></button></div>}
      {success && <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm flex items-center gap-2"><CheckCircle2 size={14}/>{success}</div>}

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total', value: rules.length, col: 'text-slate-700', bg: 'bg-slate-50 border-slate-200' },
          { label: 'Active', value: rules.filter(r=>r.isActive).length, col: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200' },
          { label: 'Static', value: rules.filter(r=>r.replyMode==='STATIC').length, col: 'text-blue-700', bg: 'bg-blue-50 border-blue-200' },
          { label: 'AI Rules', value: rules.filter(r=>r.replyMode==='AI').length, col: 'text-violet-700', bg: 'bg-violet-50 border-violet-200' },
        ].map(s => (
          <div key={s.label} className={`${s.bg} border rounded-2xl p-4`}>
            <span className="text-xs font-bold text-slate-500 uppercase block">{s.label}</span>
            <span className={`text-2xl font-black ${s.col}`}>{s.value}</span>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-2.5 text-slate-400" size={15}/>
          <input type="text" placeholder="Search keywords or reply text..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-50 border border-slate-200 text-sm focus:outline-none focus:border-emerald-500 font-semibold"/>
        </div>
        <div className="flex items-center gap-2">
          <Filter size={13} className="text-slate-400"/>
          {['ALL','STATIC','AI'].map(m => (
            <button key={m} onClick={() => setFilterMode(m)}
              className={`px-3 py-1.5 rounded-xl text-xs font-black border transition-all cursor-pointer ${filterMode===m ? 'bg-slate-900 text-white border-slate-900' : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-slate-400'}`}>
              {m==='ALL'?'🔀 All':m==='STATIC'?'💬 Static':'🤖 AI'}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 border-l border-slate-200 pl-3">
          <button onClick={() => handleToggleAll(true)} className="px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-black cursor-pointer">All ON</button>
          <button onClick={() => handleToggleAll(false)} className="px-3 py-1.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 text-xs font-black cursor-pointer">All OFF</button>
        </div>
      </div>

      {/* Rules */}
      {loading ? (
        <div className="flex h-48 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-600 border-t-transparent"/></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 bg-white border border-slate-200 rounded-3xl flex flex-col items-center gap-3 shadow-sm">
          <div className="p-4 rounded-full bg-slate-50 text-slate-300"><MessageSquare size={32}/></div>
          <h3 className="text-sm font-bold text-slate-700">{rules.length === 0 ? 'No rules yet' : 'No rules match filter'}</h3>
          {rules.length === 0 && <button onClick={openCreate} className="mt-2 px-4 py-2 bg-emerald-600 text-white text-xs font-black rounded-xl hover:bg-emerald-700 cursor-pointer">+ Add First Rule</button>}
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {filtered.map(rule => (
            <motion.div key={rule._id} layout initial={{opacity:0,y:6}} animate={{opacity:1,y:0}}
              className={`bg-white border rounded-2xl p-5 shadow-sm transition-all ${rule.isActive ? 'border-slate-200' : 'border-slate-100 opacity-55'}`}>
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1 flex flex-col gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    {rule.keywords.map((kw,i) => <span key={i} className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-bold">{kw}</span>)}
                    <span className={`ml-auto text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-lg border ${rule.matchType==='EXACT'?'bg-amber-50 text-amber-600 border-amber-200':'bg-sky-50 text-sky-600 border-sky-200'}`}>
                      {rule.matchType==='EXACT'?'🎯 Exact':'🔍 Contains'}
                    </span>
                    <span className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-lg border ${rule.replyMode==='AI'?'bg-violet-50 text-violet-700 border-violet-200':'bg-blue-50 text-blue-700 border-blue-200'}`}>
                      {rule.replyMode==='AI'?'🤖 AI':'💬 Static'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-700 font-semibold bg-slate-50 border border-slate-100 rounded-xl px-3 py-2.5 leading-relaxed line-clamp-2">{rule.replyText}</p>
                  {rule.mediaUrl && <p className="text-[10px] text-slate-400 font-semibold truncate">📎 {rule.mediaUrl}</p>}
                </div>
                <div className="flex sm:flex-col items-center gap-2 flex-shrink-0">
                  <button onClick={() => handleToggle(rule._id, rule.isActive)} className="cursor-pointer" title="Toggle">
                    {rule.isActive ? <ToggleRight size={28} className="text-emerald-500"/> : <ToggleLeft size={28} className="text-slate-300"/>}
                  </button>
                  <button onClick={() => openEdit(rule)} className="p-2 rounded-xl bg-slate-50 hover:bg-indigo-50 hover:text-indigo-600 text-slate-500 border border-slate-200 hover:border-indigo-200 cursor-pointer transition-colors" title="Edit">
                    <Edit2 size={14}/>
                  </button>
                  <button onClick={() => handleDelete(rule._id)} className="p-2 rounded-xl bg-slate-50 hover:bg-red-50 hover:text-red-600 text-slate-500 border border-slate-200 hover:border-red-200 cursor-pointer transition-colors" title="Delete">
                    <Trash2 size={14}/>
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AutoReply;
