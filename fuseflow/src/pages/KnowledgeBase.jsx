import React, { useEffect, useState } from 'react';
import api from '../services/api';
import {
  Plus,
  Trash2,
  Globe,
  FileText,
  AlertCircle,
  Eye
} from 'lucide-react';
import { motion } from 'framer-motion';

const KnowledgeBase = () => {
  const [items, setItems] = useState([]);
  const [title, setTitle] = useState('');
  const [type, setType] = useState('FAQ');
  const [content, setContent] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [activeItem, setActiveItem] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchKB = async () => {
    try {
      const { data } = await api.get('/kb');
      setItems(data);
    } catch (err) {
      setError('Failed to fetch knowledge base.');
    }
  };

  useEffect(() => {
    fetchKB();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!title) return;

    try {
      const payload = { title, type };
      if (type === 'WEBSITE') {
        payload.sourceUrl = sourceUrl;
      } else {
        payload.content = content;
      }

      await api.post('/kb', payload);
      
      setTitle('');
      setContent('');
      setSourceUrl('');
      setShowAddModal(false);
      
      if (type === 'WEBSITE') {
        setSuccess('Crawling website started in background. Refresh in a few seconds.');
      } else {
        setSuccess('Knowledge document added successfully.');
      }
      fetchKB();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to add knowledge base entry.');
    }
  };

  const handleView = async (itemId) => {
    try {
      const { data } = await api.get(`/kb/${itemId}`);
      setActiveItem(data);
    } catch (err) {
      setError('Failed to load document text.');
    }
  };

  const handleDelete = async (itemId) => {
    try {
      await api.delete(`/kb/${itemId}`);
      setItems((prev) => prev.filter((i) => i._id !== itemId));
    } catch (err) {
      setError('Failed to delete document.');
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-800">Knowledge Base</h1>
          <p className="text-slate-500 text-sm mt-1">Train your AI auto-reply system with text logs, website pages, or FAQs.</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="px-4.5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold flex items-center gap-2 cursor-pointer transition-colors shadow-md shadow-emerald-600/10"
        >
          <Plus size={16} /> Ingest Data
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

      {/* Grid List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {items.length === 0 ? (
          <div className="col-span-full bg-white border border-slate-200 rounded-3xl p-8 text-center text-slate-550 text-sm font-semibold">
            No training materials ingested yet. Ingest a document or scrap a page to get started.
          </div>
        ) : (
          items.map((item) => (
            <motion.div
              key={item._id}
              layout
              className="bg-white border border-slate-200 shadow-sm rounded-3xl p-6 flex flex-col justify-between h-44 hover:shadow-md transition-all"
            >
              <div>
                <div className="flex items-center gap-3">
                  <div className={`p-2.5 rounded-2xl ${
                    item.type === 'WEBSITE' ? 'bg-indigo-50 text-indigo-650 border border-indigo-100' : 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                  }`}>
                    {item.type === 'WEBSITE' ? <Globe size={18} /> : <FileText size={18} />}
                  </div>
                  <div className="overflow-hidden">
                    <h3 className="font-bold text-slate-800 text-sm truncate">{item.title}</h3>
                    <span className="text-[9px] font-extrabold uppercase tracking-wider text-slate-450 mt-1 block">{item.type}</span>
                  </div>
                </div>

                <p className="text-xs text-slate-500 mt-4 leading-relaxed line-clamp-2 font-semibold">
                  {item.sourceUrl ? `URL: ${item.sourceUrl}` : 'Manually added text corpus for auto-replies.'}
                </p>
              </div>

              {/* Card Footer */}
              <div className="flex items-center justify-between border-t border-slate-100 pt-3 mt-auto">
                <span className="text-[10px] text-slate-400 font-bold">{new Date(item.createdAt).toLocaleDateString()}</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleView(item._id)}
                    className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-655 transition-colors cursor-pointer"
                  >
                    <Eye size={14} />
                  </button>
                  <button
                    onClick={() => handleDelete(item._id)}
                    className="p-1.5 rounded-lg bg-red-50 hover:bg-red-100 border border-red-200 text-red-655 transition-colors cursor-pointer"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-white border border-slate-250 shadow-2xl rounded-3xl p-6">
            <h3 className="text-lg font-bold text-slate-850 mb-4">Ingest Knowledge</h3>
            <form onSubmit={handleCreate} className="flex flex-col gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">Title / Label</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Return Policy"
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 focus:outline-none focus:border-emerald-600 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">Ingestion Type</label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 focus:outline-none focus:border-emerald-600 text-sm"
                >
                  <option value="FAQ">FAQ List</option>
                  <option value="FILE">Plain Text</option>
                  <option value="WEBSITE">Crawl Web Page</option>
                </select>
              </div>

              {type === 'WEBSITE' ? (
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">Target Web Page URL</label>
                  <input
                    type="url"
                    required
                    value={sourceUrl}
                    onChange={(e) => setSourceUrl(e.target.value)}
                    placeholder="https://company.com/faq"
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 focus:outline-none focus:border-emerald-600 text-sm"
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">Knowledge Content</label>
                  <textarea
                    required
                    rows="4"
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="Type or paste policies, answers, or training scripts..."
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 focus:outline-none focus:border-emerald-600 text-sm resize-none"
                  ></textarea>
                </div>
              )}

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
                  Ingest
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Details View Modal */}
      {activeItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-2xl bg-white border border-slate-250 shadow-2xl rounded-3xl p-6 flex flex-col h-[500px]">
            <div className="flex justify-between items-center mb-4 shrink-0">
              <div>
                <h3 className="text-lg font-bold text-slate-850">{activeItem.title}</h3>
                <span className="text-[9px] font-extrabold uppercase tracking-wider text-slate-450 block mt-0.5">{activeItem.type}</span>
              </div>
              <button
                onClick={() => setActiveItem(null)}
                className="text-sm font-bold text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                Close
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto pr-2 bg-slate-50 border border-slate-200 rounded-2xl p-4">
              <pre className="text-xs text-slate-700 font-sans whitespace-pre-wrap leading-relaxed font-semibold">
                {activeItem.content}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default KnowledgeBase;
