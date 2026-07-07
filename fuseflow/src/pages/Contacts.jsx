import React, { useEffect, useState } from 'react';
import api from '../services/api';
import {
  Users,
  Search,
  Plus,
  Upload,
  ChevronLeft,
  ChevronRight,
  Trash2,
  AlertCircle
} from 'lucide-react';

const Contacts = () => {
  const [contacts, setContacts] = useState([]);
  const [search, setSearch] = useState('');
  const [stage, setStage] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  
  // Single Contact Form State
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [tags, setTags] = useState('');
  
  // File State
  const [file, setFile] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchContacts = async () => {
    try {
      const { data } = await api.get('/contacts', {
        params: { search, stage, page, limit: 10 }
      });
      setContacts(data.contacts);
      setTotalPages(data.pagination.pages);
    } catch (err) {
      setError('Failed to fetch contacts.');
    }
  };

  useEffect(() => {
    fetchContacts();
  }, [search, stage, page]);

  const handleAddContact = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    
    if (!name || !phone) return;

    try {
      const tagList = tags.split(',').map((t) => t.trim()).filter((t) => t);
      await api.post('/contacts', { name, phone, tags: tagList });
      setName('');
      setPhone('');
      setTags('');
      setShowAddModal(false);
      setSuccess('Contact created successfully.');
      fetchContacts();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to add contact.');
    }
  };

  const handleImport = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      const { data } = await api.post('/contacts/import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setSuccess(`Imported ${data.inserted} contacts (matched ${data.matched}).`);
      setFile(null);
      setShowImportModal(false);
      fetchContacts();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to import contacts.');
    }
  };

  const handleDelete = async (contactId) => {
    try {
      await api.delete(`/contacts/${contactId}`);
      setContacts((prev) => prev.filter((c) => c._id !== contactId));
    } catch (err) {
      setError('Failed to delete contact.');
    }
  };

  const getStageStyle = (stg) => {
    switch (stg) {
      case 'lead': return 'bg-blue-500/10 text-blue-400 border border-blue-500/20';
      case 'contact': return 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20';
      case 'demo': return 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20';
      case 'negotiation': return 'bg-purple-500/10 text-purple-400 border border-purple-500/20';
      case 'won': return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
      case 'lost': return 'bg-red-500/10 text-red-400 border border-red-500/20';
      default: return 'bg-slate-800 text-slate-400';
    }
  };

  return (
    <div className="flex flex-col gap-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">CRM Contacts</h1>
          <p className="text-slate-400 text-sm mt-1">Manage leads, segment lists, and upload customer sheets.</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowImportModal(true)}
            className="px-4 py-2.5 rounded-xl border border-white/5 bg-slate-900/40 hover:bg-slate-800 text-slate-300 text-sm font-semibold flex items-center gap-2 cursor-pointer transition-colors"
          >
            <Upload size={16} /> Import Sheets
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 text-sm font-semibold flex items-center gap-2 cursor-pointer transition-colors"
          >
            <Plus size={16} /> Add Contact
          </button>
        </div>
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

      {/* Filters Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 bg-slate-900/20 border border-white/5 rounded-2xl p-4">
        {/* Search */}
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-3.5 text-slate-600" />
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search by name or phone..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950/50 border border-white/5 text-slate-300 placeholder-slate-600 focus:outline-none focus:border-emerald-500 transition-colors text-sm"
          />
        </div>

        {/* Stage Filter */}
        <select
          value={stage}
          onChange={(e) => { setStage(e.target.value); setPage(1); }}
          className="px-4 py-2.5 rounded-xl bg-slate-950/50 border border-white/5 text-slate-400 focus:outline-none focus:border-emerald-500 text-sm"
        >
          <option value="">All Stages</option>
          <option value="lead">Lead</option>
          <option value="contact">Contact</option>
          <option value="demo">Demo</option>
          <option value="negotiation">Negotiation</option>
          <option value="won">Won</option>
          <option value="lost">Lost</option>
        </select>
      </div>

      {/* Table Container */}
      <div className="backdrop-blur-md bg-slate-900/40 border border-white/5 shadow-xl rounded-2xl overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-white/5 bg-slate-900/20 text-slate-400 text-xs font-semibold uppercase tracking-wider">
              <th className="px-6 py-4">Name</th>
              <th className="px-6 py-4">Phone Number</th>
              <th className="px-6 py-4">Stage</th>
              <th className="px-6 py-4">Tags</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5 text-sm text-slate-300">
            {contacts.length === 0 ? (
              <tr>
                <td colSpan="5" className="px-6 py-12 text-center text-slate-500">
                  No contacts found matching search criteria.
                </td>
              </tr>
            ) : (
              contacts.map((contact) => (
                <tr key={contact._id} className="hover:bg-slate-800/10 transition-colors">
                  <td className="px-6 py-4.5 font-semibold text-slate-200">{contact.name}</td>
                  <td className="px-6 py-4.5 text-slate-400">+{contact.phone}</td>
                  <td className="px-6 py-4.5">
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wide ${getStageStyle(contact.stage)}`}>
                      {contact.stage}
                    </span>
                  </td>
                  <td className="px-6 py-4.5">
                    <div className="flex flex-wrap gap-1">
                      {contact.tags.map((tag, i) => (
                        <span key={i} className="px-2 py-0.5 rounded bg-slate-800 border border-white/5 text-slate-400 text-[10px]">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-4.5 text-right">
                    <button
                      onClick={() => handleDelete(contact._id)}
                      className="p-1.5 rounded-lg bg-red-500/5 hover:bg-red-500/10 text-red-500 border border-red-500/10 transition-colors cursor-pointer"
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Pagination Row */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-white/5 flex items-center justify-between">
            <span className="text-xs text-slate-500">
              Page {page} of {totalPages}
            </span>
            <div className="flex items-center gap-2">
              <button
                disabled={page === 1}
                onClick={() => setPage((p) => Math.max(p - 1, 1))}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 transition-colors text-slate-300 cursor-pointer"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                disabled={page === totalPages}
                onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 transition-colors text-slate-300 cursor-pointer"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add Single Contact Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md backdrop-blur-xl bg-slate-900 border border-white/5 shadow-2xl rounded-3xl p-6">
            <h3 className="text-lg font-bold text-slate-100 mb-4">Add Contact</h3>
            <form onSubmit={handleAddContact} className="flex flex-col gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="John Doe"
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950/50 border border-white/5 text-slate-300 focus:outline-none focus:border-emerald-500 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Phone Number</label>
                <input
                  type="text"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g. 919876543210"
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950/50 border border-white/5 text-slate-300 focus:outline-none focus:border-emerald-500 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Tags (Comma-separated)</label>
                <input
                  type="text"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  placeholder="vip, lead, promo"
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950/50 border border-white/5 text-slate-300 focus:outline-none focus:border-emerald-500 text-sm"
                />
              </div>

              <div className="flex items-center justify-end gap-3 mt-4">
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
                  Add Contact
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md backdrop-blur-xl bg-slate-900 border border-white/5 shadow-2xl rounded-3xl p-6">
            <h3 className="text-lg font-bold text-slate-100 mb-2">Import Contact Sheets</h3>
            <p className="text-xs text-slate-500 mb-4">Upload an Excel (.xlsx) or CSV file. The file should have columns matching: Name, Phone, and optionally Tags (comma-separated).</p>
            
            <form onSubmit={handleImport} className="flex flex-col gap-4">
              <input
                type="file"
                required
                accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                onChange={(e) => setFile(e.target.files[0])}
                className="block w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-slate-800 file:text-slate-300 hover:file:bg-slate-700 cursor-pointer"
              />

              <div className="flex items-center justify-end gap-3 mt-4">
                <button
                  type="button"
                  onClick={() => setShowImportModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-400 hover:bg-slate-800 hover:text-slate-200 text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 text-xs font-semibold cursor-pointer"
                >
                  Import file
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Contacts;
