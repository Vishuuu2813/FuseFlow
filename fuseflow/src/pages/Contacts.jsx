import React, { useEffect, useState } from 'react';
import api from '../services/api';
import {
  Search,
  Plus,
  Upload,
  ChevronLeft,
  ChevronRight,
  Trash2,
  AlertCircle,
  Lock,
  Unlock
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

  const [isUnlocked, setIsUnlocked] = useState(() => {
    return sessionStorage.getItem('crm_unlocked') === 'true';
  });

  const handleUnlock = () => {
    sessionStorage.setItem('crm_unlocked', 'true');
    setIsUnlocked(true);
  };

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
    if (isUnlocked) {
      fetchContacts();
    }
  }, [search, stage, page, isUnlocked]);

  if (!isUnlocked) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] max-w-xl mx-auto text-center gap-6">
        <div className="relative">
          <div className="absolute inset-0 bg-indigo-500/10 rounded-full blur-xl scale-125 animate-pulse"></div>
          <div className="relative h-24 w-24 rounded-3xl bg-indigo-50 border border-indigo-100/80 flex items-center justify-center text-indigo-650 shadow-md">
            <Lock size={44} className="text-indigo-600" />
          </div>
        </div>
        <div>
          <h1 className="text-2xl font-extrabold text-slate-800">CRM Contacts Database Locked</h1>
          <p className="text-slate-500 text-sm mt-2 max-w-sm mx-auto leading-relaxed">
            The contacts database contains sensitive customer information and is secured. You must explicitly unlock it to view and manage records.
          </p>
        </div>
        <button
          onClick={handleUnlock}
          className="px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold flex items-center gap-2 cursor-pointer transition-all shadow-md shadow-indigo-600/15"
        >
          <Unlock size={16} />
          Unlock Database & View Contacts
        </button>
      </div>
    );
  }

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
      case 'lead': return 'bg-blue-50 text-blue-750 border border-blue-100';
      case 'contact': return 'bg-indigo-50 text-indigo-750 border border-indigo-100';
      case 'demo': return 'bg-amber-50 text-amber-750 border border-amber-100';
      case 'negotiation': return 'bg-purple-50 text-purple-750 border border-purple-100';
      case 'won': return 'bg-emerald-50 text-emerald-700 border border-emerald-100';
      case 'lost': return 'bg-red-50 text-red-655 border border-red-100';
      default: return 'bg-slate-50 text-slate-500 border border-slate-200';
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-800">CRM Contacts</h1>
          <p className="text-slate-500 text-sm mt-1">Manage client profiles, filter pipeline segments, and import contact sheets.</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowImportModal(true)}
            className="px-4.5 py-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-655 text-sm font-bold flex items-center gap-2 cursor-pointer transition-colors"
          >
            <Upload size={16} /> Import Sheets
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4.5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold flex items-center gap-2 cursor-pointer transition-colors shadow-md shadow-emerald-600/10"
          >
            <Plus size={16} /> Add Contact
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3.5 rounded-xl border border-red-205 bg-red-50 text-red-655 text-sm font-semibold flex items-center gap-2">
          <AlertCircle size={16} /> {error}
        </div>
      )}

      {success && (
        <div className="p-3.5 rounded-xl border border-emerald-250 bg-emerald-50 text-emerald-700 text-sm font-semibold">
          {success}
        </div>
      )}

      {/* Filters Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 bg-white border border-slate-200 rounded-3xl p-4 shadow-sm">
        {/* Search */}
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-3.5 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search by name or phone..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-emerald-605 transition-colors text-sm"
          />
        </div>

        {/* Stage Filter */}
        <select
          value={stage}
          onChange={(e) => { setStage(e.target.value); setPage(1); }}
          className="px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 focus:outline-none focus:border-emerald-605 text-sm"
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
      <div className="bg-white border border-slate-200 shadow-sm rounded-3xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50 text-slate-400 font-bold text-xs uppercase tracking-wider">
                <th className="px-6 py-4">Name</th>
                <th className="px-6 py-4">Phone Number</th>
                <th className="px-6 py-4">Stage</th>
                <th className="px-6 py-4">Tags</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {contacts.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-12 text-center text-slate-450 font-semibold">
                    No contacts found matching search criteria.
                  </td>
                </tr>
              ) : (
                contacts.map((contact) => (
                  <tr key={contact._id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 font-bold text-slate-850">{contact.name}</td>
                    <td className="px-6 py-4 font-semibold text-slate-500">+{contact.phone}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide ${getStageStyle(contact.stage)}`}>
                        {contact.stage}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {contact.tags.map((tag, i) => (
                          <span key={i} className="px-2 py-0.5 rounded bg-slate-50 border border-slate-200 text-slate-500 text-[10px] font-bold">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleDelete(contact._id)}
                        className="p-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 transition-colors cursor-pointer"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Row */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between">
            <span className="text-xs text-slate-450 font-semibold">
              Page {page} of {totalPages}
            </span>
            <div className="flex items-center gap-2">
              <button
                disabled={page === 1}
                onClick={() => setPage((p) => Math.max(p - 1, 1))}
                className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 disabled:opacity-40 transition-colors text-slate-655 cursor-pointer"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                disabled={page === totalPages}
                onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
                className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 disabled:opacity-40 transition-colors text-slate-655 cursor-pointer"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add Single Contact Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-white border border-slate-250 shadow-2xl rounded-3xl p-6">
            <h3 className="text-lg font-bold text-slate-850 mb-4">Add New Contact</h3>
            <form onSubmit={handleAddContact} className="flex flex-col gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">Full Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="John Doe"
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 focus:outline-none focus:border-emerald-600 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">Phone Number</label>
                <input
                  type="text"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g. 919876543210"
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 focus:outline-none focus:border-emerald-600 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">Tags (Comma-separated)</label>
                <input
                  type="text"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  placeholder="vip, lead, promo"
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 focus:outline-none focus:border-emerald-600 text-sm"
                />
              </div>

              <div className="flex items-center justify-end gap-3 mt-4">
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
                  Add Contact
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-white border border-slate-250 shadow-2xl rounded-3xl p-6">
            <h3 className="text-lg font-bold text-slate-850 mb-2">Import Contact Sheets</h3>
            <p className="text-xs text-slate-500 mb-4 leading-relaxed font-semibold">Upload an Excel (.xlsx) or CSV file. The file should have columns matching: Name, Phone, and optionally Tags (comma-separated).</p>
            
            <form onSubmit={handleImport} className="flex flex-col gap-4">
              <input
                type="file"
                required
                accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                onChange={(e) => setFile(e.target.files[0])}
                className="block w-full text-xs text-slate-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border file:border-slate-200 file:text-xs file:font-bold file:bg-slate-50 file:text-slate-700 hover:file:bg-slate-100 cursor-pointer"
              />

              <div className="flex items-center justify-end gap-3 mt-4">
                <button
                  type="button"
                  onClick={() => setShowImportModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-500 hover:bg-slate-100 text-sm font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-705 text-white text-sm font-bold cursor-pointer"
                >
                  Import File
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
