import React, { useEffect, useState } from 'react';
import api from '../services/api';
import {
  FileText, Search, Plus, Trash2, Edit2, ArrowLeft,
  AlertCircle, CheckCircle2, FolderOpen, Sparkles,
  ExternalLink, Phone, MessageSquare, X, UploadCloud, Save, Eye
} from 'lucide-react';

const EMPTY_FORM = {
  name: '', language: 'en', type: 'TEXT',
  body: '', header: '', footer: '', mediaUrl: '',
  buttons: [], keywords: '', accuracy: 80
};

const Templates = () => {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [view, setView] = useState('list'); // 'list' | 'form'
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  const setField = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const fetchTemplates = async () => {
    try {
      const { data } = await api.get('/templates');
      setTemplates(data);
    } catch { setError('Failed to load templates.'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchTemplates(); }, []);

  const openCreate = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setError(''); setSuccess('');
    setView('form');
  };

  const openEdit = (tpl) => {
    setEditingId(tpl._id);
    setForm({
      name: tpl.name, language: tpl.language || 'en', type: tpl.type,
      body: tpl.body, header: tpl.header || '', footer: tpl.footer || '',
      mediaUrl: tpl.mediaUrl || '', buttons: tpl.buttons || [],
      keywords: (tpl.keywords || []).join(', '), accuracy: tpl.accuracy ?? 80
    });
    setError(''); setSuccess('');
    setView('form');
  };

  const handleUpload = async (e) => {
    const file = e.target.files[0]; if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData(); fd.append('file', file);
      const { data } = await api.post('/sessions/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      setField('mediaUrl', data.url);
    } catch { setError('Upload failed.'); }
    finally { setUploading(false); }
  };

  const addButton = () => {
    if (form.buttons.length >= 3) return;
    setField('buttons', [...form.buttons, { type: 'QUICK_REPLY', text: '', value: '' }]);
  };

  const updateBtn = (i, k, v) => {
    const b = [...form.buttons]; b[i] = { ...b[i], [k]: v }; setField('buttons', b);
  };

  const removeBtn = (i) => setField('buttons', form.buttons.filter((_, idx) => idx !== i));

  const handleSave = async () => {
    if (!form.name.trim()) return setError('Template name is required.');
    if (!form.body.trim()) return setError('Body content is required.');
    setSaving(true); setError(''); setSuccess('');
    const payload = {
      name: form.name.trim(), language: form.language, type: form.type,
      body: form.body.trim(), header: form.header.trim(), footer: form.footer.trim(),
      mediaUrl: form.type === 'MEDIA' ? form.mediaUrl.trim() : '',
      buttons: form.type === 'BUTTONS' ? form.buttons.filter(b => b.text.trim()) : [],
      keywords: form.keywords.split(',').map(k => k.trim()).filter(Boolean),
      accuracy: Number(form.accuracy)
    };
    try {
      if (editingId) {
        await api.put(`/templates/${editingId}`, payload);
        setSuccess('Template updated!');
      } else {
        await api.post('/templates', payload);
        setSuccess('Template created!');
      }
      await fetchTemplates();
      setTimeout(() => { setView('list'); setSuccess(''); }, 900);
    } catch (err) { setError(err.response?.data?.message || 'Save failed.'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this template?')) return;
    try {
      await api.delete(`/templates/${id}`);
      setTemplates(t => t.filter(x => x._id !== id));
    } catch { setError('Delete failed.'); }
  };

  const filtered = templates.filter(t =>
    t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.body.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // ── FORM VIEW ──────────────────────────────────────────────────
  if (view === 'form') {
    const preview = `${form.header ? `*${form.header}*\n\n` : ''}${form.body}${form.footer ? `\n\n_${form.footer}_` : ''}`;
    return (
      <div className="flex flex-col gap-6 max-w-7xl mx-auto">
        <div className="flex items-center gap-3">
          <button onClick={() => setView('list')} className="p-2 rounded-xl hover:bg-slate-100 text-slate-500 cursor-pointer transition-colors">
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900">{editingId ? 'Edit Template' : 'New Template'}</h1>
            <p className="text-sm text-slate-500">Design your message template with live preview.</p>
          </div>
        </div>

        {error && <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-center gap-2"><AlertCircle size={15}/>{error}</div>}
        {success && <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm flex items-center gap-2"><CheckCircle2 size={15}/>{success}</div>}

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* ── LEFT: FORM ── */}
          <div className="lg:col-span-3 flex flex-col gap-5">
            {/* Identity */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col gap-4">
              <h3 className="text-xs font-black text-slate-500 uppercase tracking-wider flex items-center gap-1.5"><Sparkles size={13} className="text-indigo-600"/>Identity</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">Template Name</label>
                  <input
                    type="text" value={form.name} disabled={!!editingId}
                    onChange={e => setField('name', e.target.value.toLowerCase().replace(/[^a-z0-9_]/g,'_'))}
                    placeholder="order_confirmation"
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm focus:outline-none focus:border-indigo-500 font-semibold disabled:opacity-50"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">Type</label>
                  <select value={form.type} onChange={e => setField('type', e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm focus:outline-none focus:border-indigo-500 font-bold cursor-pointer">
                    <option value="TEXT">Text</option>
                    <option value="MEDIA">Media</option>
                    <option value="BUTTONS">Buttons</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">Language</label>
                <input type="text" value={form.language} onChange={e => setField('language', e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm focus:outline-none focus:border-indigo-500 font-semibold"/>
              </div>
            </div>

            {/* Content */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col gap-4">
              <h3 className="text-xs font-black text-slate-500 uppercase tracking-wider">Content</h3>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">Header (Optional)</label>
                <input type="text" value={form.header} onChange={e => setField('header', e.target.value)}
                  placeholder="Order Confirmed ✅"
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm focus:outline-none focus:border-indigo-500 font-semibold"/>
              </div>
              <div>
                <div className="flex justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase">Body <span className="text-red-500">*</span></label>
                  <span className="text-[10px] text-slate-400 font-bold">Use <code className="text-indigo-600 bg-indigo-50 px-1 rounded">{'{{name}}'}</code></span>
                </div>
                <textarea required rows={5} value={form.body} onChange={e => setField('body', e.target.value)}
                  placeholder={"Hello {{name}}, your order is on the way!"}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm focus:outline-none focus:border-indigo-500 resize-none font-semibold"/>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">Footer (Optional)</label>
                <input type="text" value={form.footer} onChange={e => setField('footer', e.target.value)}
                  placeholder="Reply STOP to unsubscribe"
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm focus:outline-none focus:border-indigo-500 font-semibold"/>
              </div>
              {form.type === 'MEDIA' && (
                <div className="flex gap-2">
                  <input type="url" value={form.mediaUrl} onChange={e => setField('mediaUrl', e.target.value)}
                    placeholder="https://example.com/image.png"
                    className="flex-1 px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm focus:outline-none focus:border-indigo-500 font-semibold"/>
                  <div className="relative">
                    <input type="file" id="tplFile" className="hidden" onChange={handleUpload} disabled={uploading}/>
                    <label htmlFor="tplFile" className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black cursor-pointer flex items-center gap-1.5 h-full">
                      <UploadCloud size={13}/>{uploading ? '...' : 'Upload'}
                    </label>
                  </div>
                </div>
              )}
            </div>

            {/* Buttons */}
            {form.type === 'BUTTONS' && (
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col gap-3">
                <div className="flex justify-between items-center">
                  <h3 className="text-xs font-black text-slate-500 uppercase tracking-wider">Buttons ({form.buttons.length}/3)</h3>
                  <button type="button" onClick={addButton} disabled={form.buttons.length >= 3}
                    className="text-xs font-black text-indigo-600 hover:underline cursor-pointer disabled:opacity-40">+ Add</button>
                </div>
                {form.buttons.map((btn, i) => (
                  <div key={i} className="flex flex-wrap gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <select value={btn.type} onChange={e => updateBtn(i,'type',e.target.value)}
                      className="px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-bold focus:outline-none cursor-pointer">
                      <option value="QUICK_REPLY">Quick Reply</option>
                      <option value="URL">Open URL</option>
                      <option value="CALL">Call</option>
                    </select>
                    <input type="text" placeholder="Label" value={btn.text} onChange={e => updateBtn(i,'text',e.target.value)}
                      className="flex-1 min-w-[100px] px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs focus:outline-none font-semibold"/>
                    {btn.type !== 'QUICK_REPLY' && (
                      <input type="text" placeholder={btn.type === 'URL' ? 'https://' : '+91...'} value={btn.value} onChange={e => updateBtn(i,'value',e.target.value)}
                        className="flex-1 min-w-[120px] px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs focus:outline-none font-semibold"/>
                    )}
                    <button type="button" onClick={() => removeBtn(i)} className="p-1.5 text-red-400 hover:text-red-600 cursor-pointer"><X size={13}/></button>
                  </div>
                ))}
              </div>
            )}

            {/* Trigger Keywords + Accuracy */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col gap-4">
              <h3 className="text-xs font-black text-slate-500 uppercase tracking-wider">Auto-Trigger Keywords</h3>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">Keywords (comma-separated)</label>
                <input type="text" value={form.keywords} onChange={e => setField('keywords', e.target.value)}
                  placeholder="order status, track my order, where is my package"
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm focus:outline-none focus:border-indigo-500 font-semibold"/>
                <p className="text-[10px] text-slate-400 mt-1">When any keyword is received, this template is auto-sent.</p>
              </div>
              <div>
                <div className="flex justify-between mb-2">
                  <label className="text-xs font-bold text-slate-500 uppercase">Match Accuracy</label>
                  <span className="text-xs font-black text-indigo-600">{form.accuracy}%</span>
                </div>
                <input type="range" min="50" max="100" step="5" value={form.accuracy}
                  onChange={e => setField('accuracy', Number(e.target.value))}
                  className="w-full h-2 rounded-full appearance-none cursor-pointer accent-indigo-600"/>
                <div className="flex justify-between text-[10px] text-slate-400 font-bold mt-1">
                  <span>50% Fuzzy</span><span>100% Exact</span>
                </div>
              </div>
            </div>

            {/* Save */}
            <div className="flex items-center justify-end gap-3">
              <button onClick={() => setView('list')} className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-bold hover:bg-slate-100 cursor-pointer">Cancel</button>
              <button onClick={handleSave} disabled={saving}
                className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-black cursor-pointer flex items-center gap-2 disabled:opacity-60 shadow-md shadow-indigo-600/20">
                <Save size={15}/>{saving ? 'Saving...' : editingId ? 'Update Template' : 'Create Template'}
              </button>
            </div>
          </div>

          {/* ── RIGHT: PREVIEW ── */}
          <div className="lg:col-span-2">
            <div className="sticky top-6">
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                <h3 className="text-xs font-black text-slate-500 uppercase tracking-wider flex items-center gap-1.5 mb-4"><Eye size={13}/>Live Preview</h3>
                {/* WhatsApp-style bubble */}
                <div className="rounded-2xl overflow-hidden" style={{background:'#e5ddd5'}}>
                  <div className="p-4 flex flex-col items-start gap-2">
                    <div className="bg-white rounded-2xl rounded-tl-sm shadow-sm max-w-[90%] overflow-hidden">
                      {form.mediaUrl && form.type === 'MEDIA' && (
                        <div className="w-full h-32 bg-slate-200 flex items-center justify-center overflow-hidden">
                          {form.mediaUrl.match(/\.(jpg|jpeg|png|webp|gif)/i)
                            ? <img src={form.mediaUrl} alt="preview" className="w-full h-full object-cover"/>
                            : <span className="text-[10px] text-slate-400 font-bold">📎 Media</span>}
                        </div>
                      )}
                      <div className="p-3">
                        {form.header && <p className="text-xs font-extrabold text-slate-800 mb-1">{form.header}</p>}
                        <p className="text-xs text-slate-700 font-medium leading-relaxed whitespace-pre-wrap">{form.body || <span className="text-slate-300 italic">Message body...</span>}</p>
                        {form.footer && <p className="text-[10px] text-slate-400 mt-1 border-t border-slate-100 pt-1">{form.footer}</p>}
                        <p className="text-[9px] text-slate-400 text-right mt-1">10:30 AM ✓✓</p>
                      </div>
                      {form.type === 'BUTTONS' && form.buttons.length > 0 && (
                        <div className="border-t border-slate-100">
                          {form.buttons.map((btn, i) => (
                            <div key={i} className="flex items-center justify-center gap-1.5 py-2 px-3 border-b border-slate-100 last:border-0 text-[11px] font-bold text-indigo-600 cursor-pointer hover:bg-slate-50">
                              {btn.type === 'URL' && <ExternalLink size={10}/>}
                              {btn.type === 'CALL' && <Phone size={10}/>}
                              {btn.type === 'QUICK_REPLY' && <MessageSquare size={10}/>}
                              {btn.text || 'Button'}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Keyword Tags Preview */}
                {form.keywords && (
                  <div className="mt-4">
                    <p className="text-[10px] font-black text-slate-400 uppercase mb-2">Triggers</p>
                    <div className="flex flex-wrap gap-1.5">
                      {form.keywords.split(',').map((k,i) => k.trim() && (
                        <span key={i} className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold rounded-full">{k.trim()}</span>
                      ))}
                    </div>
                  </div>
                )}
                <div className="mt-3 flex items-center gap-2">
                  <span className="text-[10px] text-slate-400 font-bold">Accuracy:</span>
                  <div className="flex-1 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                    <div className="h-full bg-indigo-500 rounded-full transition-all" style={{width:`${form.accuracy}%`}}/>
                  </div>
                  <span className="text-[10px] font-black text-indigo-600">{form.accuracy}%</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── LIST VIEW ──────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-extrabold text-slate-900">Message Templates</h1>
          <p className="text-sm font-medium text-slate-500">Create reusable message templates with keyword auto-triggers.</p>
        </div>
        <button onClick={openCreate} className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 px-4 py-2.5 text-xs font-black text-white shadow-md shadow-indigo-600/10 cursor-pointer transition-colors">
          <Plus size={16}/> New Template
        </button>
      </div>

      {error && <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-center gap-2"><AlertCircle size={15}/>{error}</div>}
      {success && <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm flex items-center gap-2"><CheckCircle2 size={15}/>{success}</div>}

      <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-sm">
        <div className="relative">
          <Search className="absolute left-3 top-3 text-slate-400" size={16}/>
          <input type="text" placeholder="Search templates..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm focus:outline-none focus:border-indigo-500 font-semibold"/>
        </div>
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent"/>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 bg-white border border-slate-200 rounded-3xl flex flex-col items-center gap-3 shadow-sm">
          <div className="p-4 rounded-full bg-slate-50 text-slate-400"><FolderOpen size={32}/></div>
          <h3 className="text-sm font-bold text-slate-700">No Templates Found</h3>
          <p className="text-xs text-slate-400">Create your first template to get started.</p>
          <button onClick={openCreate} className="mt-2 px-4 py-2 bg-indigo-600 text-white text-xs font-black rounded-xl hover:bg-indigo-700 cursor-pointer">
            + Create Template
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filtered.map(tpl => (
            <div key={tpl._id} className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between gap-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-100">{tpl.type}</span>
                  <span className="text-[10px] text-slate-400 font-bold">{tpl.language}</span>
                </div>
                <h3 className="text-sm font-extrabold text-slate-800 truncate">{tpl.name}</h3>
                <div className="mt-3 p-3 rounded-2xl bg-slate-50 border border-slate-100 font-mono text-[11px] text-slate-600 whitespace-pre-wrap leading-relaxed max-h-24 overflow-hidden">
                  {tpl.header && <p className="font-extrabold text-slate-700 border-b border-slate-100 pb-1 mb-1">{tpl.header}</p>}
                  {tpl.body}
                </div>
                {tpl.keywords?.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {tpl.keywords.slice(0,3).map((k,i) => <span key={i} className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold rounded-full">{k}</span>)}
                    {tpl.keywords.length > 3 && <span className="text-[10px] text-slate-400 font-bold">+{tpl.keywords.length-3}</span>}
                  </div>
                )}
                {tpl.accuracy != null && (
                  <div className="flex items-center gap-2 mt-2">
                    <div className="flex-1 bg-slate-100 rounded-full h-1 overflow-hidden">
                      <div className="h-full bg-indigo-400 rounded-full" style={{width:`${tpl.accuracy}%`}}/>
                    </div>
                    <span className="text-[10px] text-slate-400 font-bold">{tpl.accuracy}%</span>
                  </div>
                )}
              </div>
              <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-3">
                <button onClick={() => openEdit(tpl)} className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl cursor-pointer transition-colors" title="Edit">
                  <Edit2 size={14}/>
                </button>
                <button onClick={() => handleDelete(tpl._id)} className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-xl cursor-pointer transition-colors" title="Delete">
                  <Trash2 size={14}/>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Templates;
