import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
  Unlock,
  MessageSquare,
  Users,
  Award,
  Clock,
  CheckCircle2,
  X,
  Sliders,
  Tag,
  Briefcase,
  Layers,
  List as ListIcon,
  Copy,
  Calendar,
  Settings,
  Eye,
  Edit2,
  DollarSign,
  History,
  Info,
  Check,
  Filter,
  UserCheck,
  RefreshCw
} from 'lucide-react';

const Contacts = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('pipeline');
  
  // Core Contact Data
  const [contacts, setContacts] = useState([]);
  const [search, setSearch] = useState('');
  const [stage, setStage] = useState('');
  const [filterTag, setFilterTag] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);

  // Modals & UI States
  const [showAddModal, setShowAddModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [selectedContact, setSelectedContact] = useState(null); // For CRM Sidebar Drawer
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // Single Contact Form State
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [tags, setTags] = useState('');
  const [stageInput, setStageInput] = useState('lead');
  const [birthday, setBirthday] = useState('');
  const [anniversary, setAnniversary] = useState('');

  // Bulk Operations State
  const [selectedContactIds, setSelectedContactIds] = useState([]);
  const [showBulkEditModal, setShowBulkEditModal] = useState(false);
  const [bulkStage, setBulkStage] = useState('');
  const [bulkTagsToAdd, setBulkTagsToAdd] = useState('');
  const [bulkTagsToRemove, setBulkTagsToRemove] = useState('');
  const [bulkAgentId, setBulkAgentId] = useState('');

  // Custom Columns State
  const [showColumnConfig, setShowColumnConfig] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState({
    name: true,
    phone: true,
    stage: true,
    birthday: true,
    anniversary: true,
    tags: true,
    scores: true,
    actions: true
  });

  // Lists & Segments Data
  const [lists, setLists] = useState([]);
  const [segments, setSegments] = useState([]);
  const [selectedListId, setSelectedListId] = useState('');
  const [selectedSegmentId, setSelectedSegmentId] = useState('');
  const [showCreateListModal, setShowCreateListModal] = useState(false);
  const [showCreateSegmentModal, setShowCreateSegmentModal] = useState(false);
  
  // List Creation Form
  const [newListName, setNewListName] = useState('');
  const [newListDesc, setNewListDesc] = useState('');

  // Segment Creation Form
  const [newSegmentName, setNewSegmentName] = useState('');
  const [newSegmentDesc, setNewSegmentDesc] = useState('');
  const [newSegmentStage, setNewSegmentStage] = useState('');
  const [newSegmentTag, setNewSegmentTag] = useState('');
  const [newSegmentMinScore, setNewSegmentMinScore] = useState('');

  // Duplicate Detection Data
  const [duplicates, setDuplicates] = useState([]);
  const [duplicatesLoading, setDuplicatesLoading] = useState(false);

  // Reminders Settings
  const [sessions, setSessions] = useState([]);
  const [birthdayReminderEnabled, setBirthdayReminderEnabled] = useState(false);
  const [birthdayReminderTemplate, setBirthdayReminderTemplate] = useState('');
  const [birthdayReminderTime, setBirthdayReminderTime] = useState('09:00');
  const [anniversaryReminderEnabled, setAnniversaryReminderEnabled] = useState(false);
  const [anniversaryReminderTemplate, setAnniversaryReminderTemplate] = useState('');
  const [anniversaryReminderTime, setAnniversaryReminderTime] = useState('09:00');
  const [reminderSessionId, setReminderSessionId] = useState('');

  // Purchase History Drawer Form
  const [purchaseItem, setPurchaseItem] = useState('');
  const [purchaseAmount, setPurchaseAmount] = useState('');
  const [purchaseDate, setPurchaseDate] = useState('');

  // Custom Fields Drawer Form
  const [customFieldKey, setCustomFieldKey] = useState('');
  const [customFieldValue, setCustomFieldValue] = useState('');

  // Vault Access Lock
  const [isUnlocked, setIsUnlocked] = useState(() => {
    return sessionStorage.getItem('crm_unlocked') === 'true';
  });

  const handleUnlock = () => {
    sessionStorage.setItem('crm_unlocked', 'true');
    setIsUnlocked(true);
  };

  // Fetch Core Contact Data
  const fetchContacts = async () => {
    try {
      const params = { search, stage, tag: filterTag, page, limit: 10 };
      if (selectedListId) {
        // If viewing a list, we might want to filter, but let's load all or query specifically
      }
      
      const { data } = await api.get('/contacts', { params });
      setContacts(data.contacts);
      setTotalPages(data.pagination.pages);
      setTotalRecords(data.pagination.total);
    } catch (err) {
      setError('Failed to fetch contacts.');
    }
  };

  // Fetch Lists
  const fetchLists = async () => {
    try {
      const { data } = await api.get('/contacts/lists');
      setLists(data);
    } catch (err) {
      console.error(err);
    }
  };

  // Fetch Segments
  const fetchSegments = async () => {
    try {
      const { data } = await api.get('/contacts/segments');
      setSegments(data);
    } catch (err) {
      console.error(err);
    }
  };

  // Fetch Duplicates
  const fetchDuplicates = async () => {
    setDuplicatesLoading(true);
    try {
      const { data } = await api.get('/contacts/duplicates');
      setDuplicates(data);
    } catch (err) {
      console.error(err);
    } finally {
      setDuplicatesLoading(false);
    }
  };

  // Fetch Settings & Sessions
  const fetchReminderSettings = async () => {
    try {
      const { data: profileData } = await api.get('/auth/me');
      const tenantSettings = profileData.tenant?.settings || {};
      setBirthdayReminderEnabled(!!tenantSettings.birthdayReminderEnabled);
      setBirthdayReminderTemplate(tenantSettings.birthdayReminderTemplate || 'Happy Birthday {{name}}! 🎉');
      setBirthdayReminderTime(tenantSettings.birthdayReminderTime || '09:00');
      setAnniversaryReminderEnabled(!!tenantSettings.anniversaryReminderEnabled);
      setAnniversaryReminderTemplate(tenantSettings.anniversaryReminderTemplate || 'Happy Anniversary {{name}}! 💕');
      setAnniversaryReminderTime(tenantSettings.anniversaryReminderTime || '09:00');
      setReminderSessionId(tenantSettings.reminderSessionId || '');

      const { data: sessionData } = await api.get('/sessions');
      setSessions(sessionData || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (isUnlocked) {
      fetchContacts();
      fetchLists();
      fetchSegments();
      fetchReminderSettings();
      if (activeTab === 'duplicates') {
        fetchDuplicates();
      }
    }
  }, [search, stage, filterTag, page, isUnlocked, activeTab]);

  // Add Contact Handler
  const handleAddContact = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!name || !phone) return;

    try {
      const tagList = tags.split(',').map((t) => t.trim()).filter((t) => t);
      await api.post('/contacts', { 
        name, 
        phone, 
        tags: tagList, 
        stage: stageInput,
        birthday: birthday || null,
        anniversary: anniversary || null
      });
      setName('');
      setPhone('');
      setTags('');
      setStageInput('lead');
      setBirthday('');
      setAnniversary('');
      setShowAddModal(false);
      setSuccess('Contact created successfully.');
      fetchContacts();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to add contact.');
    }
  };

  // Single Delete Handler
  const handleDelete = async (contactId) => {
    if (!window.confirm('Are you sure you want to delete this contact record?')) return;
    try {
      await api.delete(`/contacts/${contactId}`);
      setContacts((prev) => prev.filter((c) => c._id !== contactId));
      setSuccess('Contact record deleted successfully.');
      if (selectedContact?._id === contactId) setSelectedContact(null);
    } catch (err) {
      setError('Failed to delete contact.');
    }
  };

  // Bulk Edit Handler
  const handleBulkEdit = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      const tagsToAddList = bulkTagsToAdd.split(',').map(t => t.trim()).filter(Boolean);
      const tagsToRemoveList = bulkTagsToRemove.split(',').map(t => t.trim()).filter(Boolean);
      
      const payload = {
        contactIds: selectedContactIds,
        stage: bulkStage || undefined,
        tagsToAdd: tagsToAddList.length > 0 ? tagsToAddList : undefined,
        tagsToRemove: tagsToRemoveList.length > 0 ? tagsToRemoveList : undefined,
        assignedAgentId: bulkAgentId || undefined
      };

      const { data } = await api.post('/contacts/bulk-edit', payload);
      setSuccess(data.message);
      setSelectedContactIds([]);
      setShowBulkEditModal(false);
      fetchContacts();
    } catch (err) {
      setError('Failed to perform bulk edit.');
    } finally {
      setActionLoading(false);
    }
  };

  // Bulk Delete Handler
  const handleBulkDelete = async () => {
    if (!window.confirm(`Are you sure you want to delete all ${selectedContactIds.length} selected contacts?`)) return;
    setActionLoading(true);
    try {
      const { data } = await api.post('/contacts/bulk-delete', { contactIds: selectedContactIds });
      setSuccess(data.message);
      setSelectedContactIds([]);
      fetchContacts();
    } catch (err) {
      setError('Failed to perform bulk delete.');
    } finally {
      setActionLoading(false);
    }
  };

  // List Management
  const handleCreateList = async (e) => {
    e.preventDefault();
    try {
      await api.post('/contacts/lists', { name: newListName, description: newListDesc });
      setSuccess('List created successfully.');
      setNewListName('');
      setNewListDesc('');
      setShowCreateListModal(false);
      fetchLists();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create list.');
    }
  };

  const handleDeleteList = async (id) => {
    if (!window.confirm('Delete this list?')) return;
    try {
      await api.delete(`/contacts/lists/${id}`);
      setSuccess('List deleted successfully.');
      fetchLists();
    } catch (err) {
      setError('Failed to delete list.');
    }
  };

  // Segment Management
  const handleCreateSegment = async (e) => {
    e.preventDefault();
    try {
      const filters = {
        stage: newSegmentStage || undefined,
        tag: newSegmentTag || undefined,
        minLeadScore: newSegmentMinScore ? Number(newSegmentMinScore) : undefined
      };
      await api.post('/contacts/segments', {
        name: newSegmentName,
        description: newSegmentDesc,
        filters
      });
      setSuccess('Segment saved successfully.');
      setNewSegmentName('');
      setNewSegmentDesc('');
      setNewSegmentStage('');
      setNewSegmentTag('');
      setNewSegmentMinScore('');
      setShowCreateSegmentModal(false);
      fetchSegments();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create segment.');
    }
  };

  const handleDeleteSegment = async (id) => {
    if (!window.confirm('Delete this segment?')) return;
    try {
      await api.delete(`/contacts/segments/${id}`);
      setSuccess('Segment deleted.');
      fetchSegments();
    } catch (err) {
      setError('Failed to delete segment.');
    }
  };

  // Merge Contacts Handler
  const handleMerge = async (primaryId, secondaryId) => {
    if (!window.confirm('Merge these two contacts? The secondary contact will be merged into primary and then deleted.')) return;
    try {
      const { data } = await api.post('/contacts/merge', { primaryId, secondaryId });
      setSuccess(data.message);
      fetchDuplicates();
      fetchContacts();
    } catch (err) {
      setError('Failed to merge contacts.');
    }
  };

  // Update Automated Reminder Settings
  const handleSaveReminderSettings = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      await api.put('/auth/tenant', {
        birthdayReminderEnabled,
        birthdayReminderTemplate,
        birthdayReminderTime,
        anniversaryReminderEnabled,
        anniversaryReminderTemplate,
        anniversaryReminderTime,
        reminderSessionId: reminderSessionId || null
      });
      setSuccess('Reminder settings updated successfully.');
    } catch (err) {
      setError('Failed to save reminder settings.');
    } finally {
      setActionLoading(false);
    }
  };

  // Drawer Actions: Log Purchase
  const handleAddPurchase = async (e) => {
    e.preventDefault();
    if (!purchaseItem || !purchaseAmount) return;

    try {
      // Deserialize current purchases
      const currentPurchasesStr = selectedContact.customFields?.purchases || '[]';
      let currentPurchases = [];
      try {
        currentPurchases = JSON.parse(currentPurchasesStr);
      } catch (err) {
        currentPurchases = [];
      }

      const newPurchase = {
        id: Math.random().toString(36).substring(2, 9),
        item: purchaseItem,
        amount: Number(purchaseAmount),
        date: purchaseDate || new Date().toISOString().split('T')[0]
      };

      const updatedPurchases = [newPurchase, ...currentPurchases];
      const customFields = {
        ...(selectedContact.customFields || {}),
        purchases: JSON.stringify(updatedPurchases)
      };

      // Call update API
      const { data } = await api.put(`/contacts/${selectedContact._id}`, { customFields });
      setSelectedContact(data);
      setSuccess('Purchase recorded successfully.');
      setPurchaseItem('');
      setPurchaseAmount('');
      setPurchaseDate('');
      fetchContacts();
    } catch (err) {
      setError('Failed to record purchase.');
    }
  };

  const handleDeletePurchase = async (purchaseId) => {
    try {
      const currentPurchasesStr = selectedContact.customFields?.purchases || '[]';
      let currentPurchases = JSON.parse(currentPurchasesStr);
      const updatedPurchases = currentPurchases.filter(p => p.id !== purchaseId);

      const customFields = {
        ...(selectedContact.customFields || {}),
        purchases: JSON.stringify(updatedPurchases)
      };

      const { data } = await api.put(`/contacts/${selectedContact._id}`, { customFields });
      setSelectedContact(data);
      setSuccess('Purchase entry removed.');
      fetchContacts();
    } catch (err) {
      setError('Failed to delete purchase.');
    }
  };

  // Drawer Actions: Custom Fields
  const handleAddCustomField = async (e) => {
    e.preventDefault();
    if (!customFieldKey || !customFieldValue) return;

    try {
      const customFields = {
        ...(selectedContact.customFields || {}),
        [customFieldKey.trim()]: customFieldValue.trim()
      };

      const { data } = await api.put(`/contacts/${selectedContact._id}`, { customFields });
      setSelectedContact(data);
      setSuccess('Custom column/field added.');
      setCustomFieldKey('');
      setCustomFieldValue('');
      fetchContacts();
    } catch (err) {
      setError('Failed to add custom field.');
    }
  };

  const handleDeleteCustomField = async (key) => {
    try {
      const customFields = { ...(selectedContact.customFields || {}) };
      delete customFields[key];

      const { data } = await api.put(`/contacts/${selectedContact._id}`, { customFields });
      setSelectedContact(data);
      setSuccess('Custom column/field removed.');
      fetchContacts();
    } catch (err) {
      setError('Failed to remove custom field.');
    }
  };

  // Pipeline Column Layout Helpers
  const stages = [
    { id: 'lead', title: 'Leads / Incoming', color: 'border-t-sky-500 bg-sky-50/20 text-sky-700' },
    { id: 'contact', title: 'Contacted', color: 'border-t-indigo-500 bg-indigo-50/20 text-indigo-700' },
    { id: 'demo', title: 'Demo Scheduled', color: 'border-t-amber-500 bg-amber-50/20 text-amber-700' },
    { id: 'negotiation', title: 'Negotiating', color: 'border-t-purple-500 bg-purple-50/20 text-purple-700' },
    { id: 'won', title: 'Closed Won', color: 'border-t-emerald-500 bg-emerald-50/20 text-emerald-700' },
    { id: 'lost', title: 'Closed Lost', color: 'border-t-rose-500 bg-rose-50/20 text-rose-700' }
  ];

  const handleMoveStage = async (contactId, newStage) => {
    try {
      const { data } = await api.put(`/contacts/${contactId}`, { stage: newStage });
      setContacts(prev => prev.map(c => c._id === contactId ? { ...c, stage: newStage } : c));
      setSuccess(`Moved ${data.name} to ${newStage.toUpperCase()}`);
    } catch (err) {
      setError('Failed to update stage.');
    }
  };

  const getStageBadgeColor = (stg) => {
    switch (stg) {
      case 'lead': return 'bg-sky-100 text-sky-800';
      case 'contact': return 'bg-indigo-100 text-indigo-800';
      case 'demo': return 'bg-amber-100 text-amber-800';
      case 'negotiation': return 'bg-purple-100 text-purple-800';
      case 'won': return 'bg-emerald-100 text-emerald-800';
      case 'lost': return 'bg-rose-100 text-rose-800';
      default: return 'bg-slate-100 text-slate-800';
    }
  };

  if (!isUnlocked) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[75vh] max-w-xl mx-auto text-center px-4">
        <div className="relative mb-6">
          <div className="absolute inset-0 bg-indigo-500/10 rounded-full blur-2xl scale-150 animate-pulse"></div>
          <div className="relative h-28 w-28 rounded-[2rem] bg-[var(--bg-card)] border border-[var(--border)] shadow-xl flex items-center justify-center text-indigo-400">
            <Lock size={48} className="stroke-[1.5]" />
          </div>
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight font-display" style={{ color: 'var(--text-primary)' }}>Secure CRM Database</h1>
        <p className="text-sm mt-3 max-w-md leading-relaxed font-semibold" style={{ color: 'var(--text-secondary)' }}>
          This section contains private customer information, contact details, and custom marketing tags. You must unlock the vault to view and manage these profiles.
        </p>
        <button
          onClick={handleUnlock}
          className="mt-8 px-7 py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-extrabold flex items-center gap-2.5 cursor-pointer transition-all shadow-lg shadow-indigo-600/20 active:scale-98"
        >
          <Unlock size={16} />
          Access CRM Contacts Database
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 pb-12 relative min-h-screen">
      {/* 1. Header Section */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-5">
        <div>
          <span className="text-[10px] font-black tracking-widest text-indigo-650 uppercase">Workspace Hub</span>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight mt-1 flex items-center gap-2">
            CRM Contacts Workspace
            <span className="text-xs bg-slate-100 text-slate-605 px-2.5 py-1 rounded-full font-bold border border-slate-200/50">
              {totalRecords} Contacts
            </span>
          </h1>
          <p className="text-slate-550 text-xs mt-1 font-semibold">Pipelines, static lists, dynamic filter segments, duplicates merge control, and automated reminders.</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setShowImportModal(true)}
            className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-black flex items-center gap-2 cursor-pointer transition-all shadow-sm active:scale-95"
          >
            <Upload size={14} className="text-slate-400" /> Import File
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2.5 rounded-xl bg-indigo-650 hover:bg-indigo-700 text-white text-xs font-black flex items-center gap-2 cursor-pointer transition-all shadow-lg shadow-indigo-600/10 active:scale-95"
          >
            <Plus size={15} /> Add Contact
          </button>
        </div>
      </div>

      {/* Alert Banners */}
      {error && (
        <div className="p-3.5 rounded-xl border border-red-200 bg-red-50 text-red-650 text-xs font-extrabold flex items-center justify-between gap-2 animate-fadeIn">
          <div className="flex items-center gap-2">
            <AlertCircle size={15} /> {error}
          </div>
          <button onClick={() => setError('')} className="p-1 text-red-400 hover:text-red-655"><X size={14} /></button>
        </div>
      )}

      {success && (
        <div className="p-3.5 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-700 text-xs font-extrabold flex items-center justify-between gap-2 animate-fadeIn">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={15} /> {success}
          </div>
          <button onClick={() => setSuccess('')} className="p-1 text-emerald-400 hover:text-emerald-750"><X size={14} /></button>
        </div>
      )}

      {/* 2. Sub-navigation tabs */}
      <div className="flex gap-1.5 border-b border-slate-150 pb-px overflow-x-auto select-none no-scrollbar">
        {[
          { id: 'pipeline', label: 'Funnel Board', icon: Briefcase },
          { id: 'list', label: 'All Contacts', icon: Sliders },
          { id: 'lists', label: 'Static Lists', icon: ListIcon },
          { id: 'segments', label: 'Saved Segments', icon: Filter },
          { id: 'duplicates', label: 'Merge Profiles', icon: Copy },
          { id: 'reminders', label: 'Auto Reminders', icon: Calendar }
        ].map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id); setSelectedContactIds([]); }}
              className={`flex items-center gap-2 px-4 py-2.5 border-b-2 text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                active
                  ? 'border-indigo-600 text-indigo-650 bg-indigo-50/40 rounded-t-xl font-extrabold'
                  : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
              }`}
            >
              <Icon size={14} className={active ? 'text-indigo-600' : 'text-slate-400'} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* 3. Tab contents */}

      {/* TAB 1: KANBAN BOARD */}
      {activeTab === 'pipeline' && (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-3.5 items-start">
          {stages.map((stg) => {
            const stageContacts = contacts.filter((c) => c.stage === stg.id);
            return (
              <div key={stg.id} className={`flex flex-col border border-slate-150 rounded-2xl p-3 shadow-sm min-h-[500px]`}>
                {/* Stage Header */}
                <div className={`border-t-4 ${stg.color} rounded-t p-2 pb-3 mb-2 flex items-center justify-between`}>
                  <h3 className="font-extrabold text-[11px] uppercase tracking-wide">{stg.title}</h3>
                  <span className="text-[10px] font-black bg-white px-2 py-0.5 rounded-full border border-slate-200">
                    {stageContacts.length}
                  </span>
                </div>

                {/* Stage Cards */}
                <div className="flex flex-col gap-2 overflow-y-auto max-h-[600px] pr-0.5">
                  {stageContacts.length === 0 ? (
                    <div className="text-center py-8 text-[10px] text-slate-400 italic font-semibold border-2 border-dashed border-slate-100 rounded-xl bg-slate-50/50">
                      Empty Column
                    </div>
                  ) : (
                    stageContacts.map((contact) => (
                      <div
                        key={contact._id}
                        onClick={() => setSelectedContact(contact)}
                        className="bg-white border border-slate-200/90 rounded-xl p-3 shadow-xs hover:shadow-md hover:border-indigo-300 transition-all cursor-pointer group"
                      >
                        <div className="flex justify-between items-start gap-1.5">
                          <span className="font-extrabold text-xs text-slate-800 group-hover:text-indigo-600 transition-colors truncate block max-w-[110px]">
                            {contact.name}
                          </span>
                          <span className="text-[9px] bg-slate-100 px-1.5 py-0.5 rounded font-black text-slate-500 shrink-0">
                            L:{contact.leadScore || 0}
                          </span>
                        </div>
                        <span className="text-[10px] font-mono text-slate-400 block mt-1">+{contact.phone}</span>
                        
                        {/* Tags */}
                        {contact.tags && contact.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2.5">
                            {contact.tags.slice(0, 2).map((t, idx) => (
                              <span key={idx} className="px-1.5 py-0.5 text-[8px] font-bold bg-slate-50 text-slate-600 rounded border border-slate-150 max-w-[65px] truncate">
                                {t}
                              </span>
                            ))}
                            {contact.tags.length > 2 && (
                              <span className="px-1 py-0.5 text-[8px] font-bold bg-indigo-50 text-indigo-600 rounded">
                                +{contact.tags.length - 2}
                              </span>
                            )}
                          </div>
                        )}

                        {/* Shift Card actions */}
                        <div className="flex items-center justify-between border-t border-slate-100 mt-2.5 pt-2 text-[9px] font-bold text-slate-400">
                          <span>Timeline</span>
                          <div className="flex items-center gap-1">
                            <select
                              onClick={(e) => e.stopPropagation()}
                              value={contact.stage}
                              onChange={(e) => handleMoveStage(contact._id, e.target.value)}
                              className="text-[9px] bg-slate-550 text-white rounded px-1 py-0.5 cursor-pointer font-bold outline-none"
                            >
                              {stages.map(s => <option key={s.id} value={s.id}>{s.id.toUpperCase()}</option>)}
                            </select>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* TAB 2: ALL CONTACTS LIST TABLE */}
      {activeTab === 'list' && (
        <div className="flex flex-col gap-4 animate-fadeIn">
          {/* Filters Bar */}
          <div className="flex flex-col md:flex-row md:items-center gap-3 bg-white border border-slate-150 rounded-2xl p-3 shadow-xs">
            {/* Search */}
            <div className="relative flex-1">
              <Search size={15} className="absolute left-3.5 top-3 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                placeholder="Search contacts by name or phone..."
                className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:border-indigo-600 text-slate-800 placeholder-slate-400 focus:outline-none transition-colors text-xs font-semibold"
              />
            </div>

            {/* Stage Filter */}
            <div className="flex items-center gap-2 shrink-0">
              <Sliders size={13} className="text-slate-400" />
              <select
                value={stage}
                onChange={(e) => { setStage(e.target.value); setPage(1); }}
                className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 focus:outline-none focus:border-indigo-600 text-xs font-bold cursor-pointer transition-colors"
              >
                <option value="">All Pipeline Stages</option>
                {stages.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}
              </select>
            </div>

            {/* Tag Filter */}
            <div className="flex items-center gap-2 shrink-0">
              <Tag size={13} className="text-slate-400" />
              <input
                type="text"
                value={filterTag}
                onChange={(e) => { setFilterTag(e.target.value); setPage(1); }}
                placeholder="Filter by Tag..."
                className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-850 placeholder-slate-400 focus:outline-none focus:border-indigo-600 text-xs font-semibold max-w-[140px]"
              />
            </div>

            {/* Custom Columns Config Toggle */}
            <div className="relative">
              <button
                onClick={() => setShowColumnConfig(!showColumnConfig)}
                className="p-2 bg-slate-50 border border-slate-200 hover:bg-slate-100 rounded-xl cursor-pointer text-slate-600 transition-colors"
                title="Configure Table Columns"
              >
                <Settings size={14} />
              </button>

              {showColumnConfig && (
                <div className="absolute right-0 mt-2 z-10 w-44 bg-white border border-slate-200 shadow-xl rounded-xl p-3.5 flex flex-col gap-2">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">Columns</h4>
                  {Object.keys(visibleColumns).map((col) => (
                    <label key={col} className="flex items-center gap-2 text-xs font-bold text-slate-650 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={visibleColumns[col]}
                        onChange={() => setVisibleColumns(prev => ({ ...prev, [col]: !prev[col] }))}
                        className="rounded text-indigo-600 focus:ring-indigo-500"
                      />
                      {col.charAt(0).toUpperCase() + col.slice(1)}
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Bulk Action Panel (appears when checkboxes are ticked) */}
          {selectedContactIds.length > 0 && (
            <div className="p-3 bg-indigo-50 border border-indigo-150 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-fadeIn">
              <span className="text-xs font-black text-indigo-900">
                {selectedContactIds.length} profiles selected
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowBulkEditModal(true)}
                  className="px-3.5 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 flex items-center gap-1.5 shadow-sm cursor-pointer transition-all active:scale-95"
                >
                  <Edit2 size={12} /> Bulk Edit
                </button>
                <button
                  onClick={handleBulkDelete}
                  className="px-3.5 py-1.5 bg-red-650 text-white rounded-lg text-xs font-bold hover:bg-red-750 flex items-center gap-1.5 shadow-sm cursor-pointer transition-all active:scale-95"
                >
                  <Trash2 size={12} /> Bulk Delete
                </button>
                <button
                  onClick={() => setSelectedContactIds([])}
                  className="text-xs text-indigo-600 hover:text-indigo-805 font-bold px-2 py-1.5 cursor-pointer"
                >
                  Clear Selection
                </button>
              </div>
            </div>
          )}

          {/* Contacts Table */}
          <div className="bg-white border border-slate-200 shadow-sm rounded-2xl overflow-hidden">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/70 text-slate-450 font-black tracking-wider uppercase">
                  <th className="px-4 py-4 w-10">
                    <input
                      type="checkbox"
                      checked={contacts.length > 0 && selectedContactIds.length === contacts.length}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedContactIds(contacts.map(c => c._id));
                        } else {
                          setSelectedContactIds([]);
                        }
                      }}
                      className="rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                    />
                  </th>
                  {visibleColumns.name && <th className="px-6 py-4">Name</th>}
                  {visibleColumns.phone && <th className="px-6 py-4">Phone</th>}
                  {visibleColumns.stage && <th className="px-6 py-4">Stage</th>}
                  {visibleColumns.birthday && <th className="px-6 py-4">Birthday</th>}
                  {visibleColumns.anniversary && <th className="px-6 py-4">Anniversary</th>}
                  {visibleColumns.tags && <th className="px-6 py-4">Tags</th>}
                  {visibleColumns.scores && <th className="px-6 py-4">Scores</th>}
                  {visibleColumns.actions && <th className="px-6 py-4 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {contacts.length === 0 ? (
                  <tr>
                    <td colSpan="9" className="px-6 py-16 text-center text-slate-400 font-bold">
                      No contacts found matching the filters.
                    </td>
                  </tr>
                ) : (
                  contacts.map((contact) => {
                    const isChecked = selectedContactIds.includes(contact._id);
                    return (
                      <tr key={contact._id} className={`hover:bg-slate-50/50 transition-colors ${isChecked ? 'bg-indigo-50/15' : ''}`}>
                        <td className="px-4 py-3">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedContactIds(prev => [...prev, contact._id]);
                              } else {
                                setSelectedContactIds(prev => prev.filter(id => id !== contact._id));
                              }
                            }}
                            className="rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                          />
                        </td>
                        {visibleColumns.name && (
                          <td className="px-6 py-3 font-extrabold text-slate-800">
                            <button
                              onClick={() => setSelectedContact(contact)}
                              className="text-left hover:text-indigo-650 hover:underline cursor-pointer transition-colors"
                            >
                              {contact.name}
                            </button>
                          </td>
                        )}
                        {visibleColumns.phone && (
                          <td className="px-6 py-3 font-mono text-slate-500">+{contact.phone}</td>
                        )}
                        {visibleColumns.stage && (
                          <td className="px-6 py-3">
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase border ${getStageBadgeColor(contact.stage)}`}>
                              {contact.stage}
                            </span>
                          </td>
                        )}
                        {visibleColumns.birthday && (
                          <td className="px-6 py-3 text-slate-500">
                            {contact.birthday
                              ? new Date(contact.birthday).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
                              : <span className="text-[10px] text-slate-400 italic">Not set</span>}
                          </td>
                        )}
                        {visibleColumns.anniversary && (
                          <td className="px-6 py-3 text-slate-500">
                            {contact.anniversary
                              ? new Date(contact.anniversary).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
                              : <span className="text-[10px] text-slate-400 italic">Not set</span>}
                          </td>
                        )}
                        {visibleColumns.tags && (
                          <td className="px-6 py-3">
                            <div className="flex flex-wrap gap-1">
                              {contact.tags && contact.tags.length > 0 ? (
                                contact.tags.slice(0, 3).map((t, idx) => (
                                  <span key={idx} className="px-1.5 py-0.5 rounded bg-slate-50 text-slate-550 border border-slate-150 text-[9px] font-bold">
                                    {t}
                                  </span>
                                ))
                              ) : (
                                <span className="text-[10px] text-slate-400 italic">No tags</span>
                              )}
                              {contact.tags && contact.tags.length > 3 && (
                                <span className="px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-650 text-[9px] font-black">+{contact.tags.length - 3}</span>
                              )}
                            </div>
                          </td>
                        )}
                        {visibleColumns.scores && (
                          <td className="px-6 py-3">
                            <div className="flex flex-col gap-0.5 text-[9px]">
                              <span className="font-semibold text-slate-500">Lead Score: <strong className="text-slate-800">{contact.leadScore || 0}</strong></span>
                              <span className="font-semibold text-slate-500">Customer Score: <strong className="text-slate-800">{contact.customerScore || 0}</strong></span>
                            </div>
                          </td>
                        )}
                        {visibleColumns.actions && (
                          <td className="px-6 py-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => setSelectedContact(contact)}
                                className="h-7 w-7 rounded bg-slate-50 hover:bg-slate-100 text-slate-600 flex items-center justify-center transition-colors cursor-pointer border border-slate-200"
                                title="View CRM Drawer / History"
                              >
                                <Eye size={12} />
                              </button>
                              <button
                                onClick={() => navigate(`/dashboard/live-chat?phone=${contact.phone}`)}
                                className="h-7 w-7 rounded bg-indigo-50 hover:bg-indigo-100 text-indigo-600 flex items-center justify-center transition-colors cursor-pointer border border-indigo-100"
                                title="Chat Profile"
                              >
                                <MessageSquare size={12} />
                              </button>
                              <button
                                onClick={() => handleDelete(contact._id)}
                                className="h-7 w-7 rounded bg-red-50 hover:bg-red-100 text-red-650 flex items-center justify-center transition-colors cursor-pointer border border-red-100"
                                title="Delete"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="px-6 py-3 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
                <span className="text-xs text-slate-450 font-black">
                  Page {page} of {totalPages}
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    disabled={page === 1}
                    onClick={() => setPage(p => Math.max(p - 1, 1))}
                    className="p-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 disabled:opacity-40 transition-colors cursor-pointer text-slate-600"
                  >
                    <ChevronLeft size={13} />
                  </button>
                  <button
                    disabled={page === totalPages}
                    onClick={() => setPage(p => Math.min(p + 1, totalPages))}
                    className="p-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 disabled:opacity-40 transition-colors cursor-pointer text-slate-600"
                  >
                    <ChevronRight size={13} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: STATIC LISTS */}
      {activeTab === 'lists' && (
        <div className="flex flex-col gap-4 animate-fadeIn">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-base font-extrabold text-slate-800">Saved Contact Groups (Lists)</h3>
              <p className="text-slate-500 text-xs mt-0.5">Static user categories for targeted campaigns.</p>
            </div>
            <button
              onClick={() => setShowCreateListModal(true)}
              className="px-3.5 py-2 bg-indigo-650 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md shadow-indigo-600/10 cursor-pointer"
            >
              <Plus size={14} /> Create New List
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {lists.length === 0 ? (
              <div className="col-span-full py-16 text-center text-slate-400 font-bold border-2 border-dashed border-slate-200 rounded-2xl bg-white">
                No lists created yet. Create a static list to target users with campaigns.
              </div>
            ) : (
              lists.map((list) => (
                <div key={list._id} className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs flex flex-col justify-between hover:shadow-md transition-shadow">
                  <div>
                    <div className="flex justify-between items-start gap-2">
                      <h4 className="font-extrabold text-sm text-slate-850 truncate">{list.name}</h4>
                      <span className="text-[10px] font-black bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full border border-indigo-100">
                        {list.contacts?.length || 0} contacts
                      </span>
                    </div>
                    <p className="text-slate-500 text-xs mt-2 leading-relaxed h-12 overflow-hidden">{list.description || 'No description provided.'}</p>
                  </div>
                  <div className="flex items-center justify-between border-t border-slate-100 pt-3 mt-4">
                    <span className="text-[10px] text-slate-400 font-semibold">Created: {new Date(list.createdAt).toLocaleDateString()}</span>
                    <button
                      onClick={() => handleDeleteList(list._id)}
                      className="text-red-500 hover:text-red-700 p-1 cursor-pointer transition-colors"
                      title="Delete List"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 4: SAVED SEGMENTS */}
      {activeTab === 'segments' && (
        <div className="flex flex-col gap-4 animate-fadeIn">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-base font-extrabold text-slate-800">Dynamic Filter Segments</h3>
              <p className="text-slate-505 text-xs mt-0.5">Filter rules that fetch matching contacts dynamically.</p>
            </div>
            <button
              onClick={() => setShowCreateSegmentModal(true)}
              className="px-3.5 py-2 bg-indigo-650 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md shadow-indigo-600/10 cursor-pointer"
            >
              <Plus size={14} /> Save New Segment
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {segments.length === 0 ? (
              <div className="col-span-full py-16 text-center text-slate-400 font-bold border-2 border-dashed border-slate-200 rounded-2xl bg-white">
                No segments saved. Use filter criteria to segment your clients dynamically.
              </div>
            ) : (
              segments.map((segment) => (
                <div key={segment._id} className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs flex flex-col justify-between hover:shadow-md transition-shadow">
                  <div>
                    <div className="flex justify-between items-start gap-2">
                      <h4 className="font-extrabold text-sm text-slate-850 truncate">{segment.name}</h4>
                      <span className="text-[9px] font-black bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full border border-emerald-100">
                        Active Rules
                      </span>
                    </div>
                    <p className="text-slate-500 text-xs mt-2 leading-relaxed">{segment.description || 'No description.'}</p>
                    
                    {/* Rules Pills */}
                    <div className="flex flex-wrap gap-1 mt-3">
                      {segment.filters.stage && (
                        <span className="px-1.5 py-0.5 bg-slate-50 border border-slate-150 rounded text-[9px] font-bold text-slate-600">
                          Stage: {segment.filters.stage}
                        </span>
                      )}
                      {segment.filters.tag && (
                        <span className="px-1.5 py-0.5 bg-slate-50 border border-slate-150 rounded text-[9px] font-bold text-slate-600">
                          Tag: {segment.filters.tag}
                        </span>
                      )}
                      {segment.filters.minLeadScore && (
                        <span className="px-1.5 py-0.5 bg-slate-50 border border-slate-150 rounded text-[9px] font-bold text-slate-600">
                          Lead Score ≥ {segment.filters.minLeadScore}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center justify-between border-t border-slate-100 pt-3 mt-4">
                    <span className="text-[10px] text-slate-400 font-semibold">Created: {new Date(segment.createdAt).toLocaleDateString()}</span>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => {
                          setFilterTag(segment.filters.tag || '');
                          setStage(segment.filters.stage || '');
                          setActiveTab('list');
                        }}
                        className="text-xs text-indigo-650 hover:text-indigo-850 font-bold px-2 py-1.5 cursor-pointer bg-indigo-50/50 rounded-lg"
                        title="Load Contacts"
                      >
                        Apply Segment
                      </button>
                      <button
                        onClick={() => handleDeleteSegment(segment._id)}
                        className="text-red-500 hover:text-red-700 p-1 cursor-pointer transition-colors"
                        title="Delete Segment"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 5: DUPLICATE MERGER */}
      {activeTab === 'duplicates' && (
        <div className="flex flex-col gap-4 animate-fadeIn">
          <div>
            <h3 className="text-base font-extrabold text-slate-800 flex items-center gap-1.5">
              Duplicate Profiles Detector
              <span className="text-xs bg-slate-100 text-slate-505 px-2 py-0.5 rounded-full font-bold">
                {duplicates.length} groups found
              </span>
            </h3>
            <p className="text-slate-505 text-xs mt-0.5">Scans contacts database for entries with identical names (case-insensitive) to prevent database clutter.</p>
          </div>

          {duplicatesLoading ? (
            <div className="py-20 flex flex-col justify-center items-center gap-2">
              <RefreshCw size={24} className="animate-spin text-indigo-600" />
              <span className="text-xs text-slate-400 font-bold">Scanning database for duplicates...</span>
            </div>
          ) : duplicates.length === 0 ? (
            <div className="py-16 text-center text-slate-400 font-bold border border-slate-200 bg-white rounded-2xl shadow-xs">
              <CheckCircle2 size={36} className="text-emerald-500 mx-auto mb-3" />
              All clean! No duplicate profile groups detected.
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {duplicates.map((group, idx) => (
                <div key={idx} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-slate-100 pb-3 mb-4 gap-2">
                    <div>
                      <h4 className="font-extrabold text-sm text-slate-800 uppercase">Group: "{group._id}"</h4>
                      <p className="text-xs text-slate-500 mt-0.5">{group.count} profiles matching name</p>
                    </div>
                    <span className="text-[10px] font-black bg-rose-50 text-rose-600 border border-rose-100 px-2.5 py-1 rounded-full uppercase tracking-wider">
                      Needs Merge
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {group.contacts.map((contact, cIdx) => {
                      const nextContact = group.contacts[(cIdx + 1) % group.contacts.length];
                      return (
                        <div key={contact.id} className="bg-slate-50/50 border border-slate-200 rounded-xl p-4 flex flex-col justify-between hover:border-slate-300 transition-colors">
                          <div>
                            <div className="flex justify-between items-start">
                              <span className="font-extrabold text-xs text-slate-850">{contact.name}</span>
                              <span className={`px-2 py-0.5 text-[8px] font-black uppercase rounded ${getStageBadgeColor(contact.stage)}`}>
                                {contact.stage}
                              </span>
                            </div>
                            <div className="mt-2 text-xs text-slate-500 font-semibold">
                              <p>Phone: <strong className="text-slate-700">+{contact.phone}</strong></p>
                              <p className="mt-0.5">Created: {new Date(contact.createdAt).toLocaleDateString()}</p>
                            </div>
                          </div>
                          
                          <div className="border-t border-slate-200/60 pt-3 mt-4 flex items-center justify-between">
                            <span className="text-[10px] text-slate-400 italic">ID: {contact.id.slice(-8).toUpperCase()}</span>
                            <button
                              onClick={() => handleMerge(contact.id, nextContact.id)}
                              className="px-3 py-1 bg-indigo-650 hover:bg-indigo-700 text-white rounded text-[10px] font-black shadow-xs cursor-pointer active:scale-95"
                            >
                              Keep & Merge Other
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 6: AUTOMATED REMINDERS */}
      {activeTab === 'reminders' && (
        <form onSubmit={handleSaveReminderSettings} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs flex flex-col gap-6 animate-fadeIn max-w-2xl">
          <div>
            <h3 className="text-base font-extrabold text-slate-800">Birthday & Anniversary Automation</h3>
            <p className="text-slate-500 text-xs mt-0.5">Send personalized messages to contacts on their special dates automatically.</p>
          </div>

          <div className="flex flex-col gap-4">
            {/* WhatsApp Session Selector */}
            <div>
              <label className="block text-[10px] font-black text-slate-450 mb-1.5 uppercase tracking-wider">Sending WhatsApp Device</label>
              <select
                required
                value={reminderSessionId}
                onChange={(e) => setReminderSessionId(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 focus:outline-none focus:border-indigo-600 text-xs font-bold cursor-pointer"
              >
                <option value="">-- Choose Connected WhatsApp Device --</option>
                {sessions.map((s) => (
                  <option key={s._id} value={s._id}>
                    {s.sessionName} (+{s.phoneNumber || 'unknown'}) [{s.status}]
                  </option>
                ))}
              </select>
            </div>

            <hr className="border-slate-100" />

            {/* Birthday Section */}
            <div className="flex flex-col gap-3 bg-slate-50/50 border border-slate-150 p-4 rounded-xl">
              <div className="flex justify-between items-center">
                <label className="flex items-center gap-2 cursor-pointer font-extrabold text-xs text-slate-800">
                  <input
                    type="checkbox"
                    checked={birthdayReminderEnabled}
                    onChange={(e) => setBirthdayReminderEnabled(e.target.checked)}
                    className="rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                  />
                  Enable Birthday Greetings
                </label>
                <input
                  type="time"
                  disabled={!birthdayReminderEnabled}
                  value={birthdayReminderTime}
                  onChange={(e) => setBirthdayReminderTime(e.target.value)}
                  className="px-2 py-1 bg-white border border-slate-200 text-xs rounded font-bold cursor-pointer focus:outline-none focus:border-indigo-650"
                />
              </div>

              <div>
                <label className="block text-[9px] font-bold text-slate-400 mb-1 uppercase">Greeting Message Template</label>
                <textarea
                  disabled={!birthdayReminderEnabled}
                  value={birthdayReminderTemplate}
                  onChange={(e) => setBirthdayReminderTemplate(e.target.value)}
                  placeholder="e.g. Happy Birthday {{name}}! Wish you a successful year ahead! 🎉"
                  rows="3"
                  className="w-full px-3 py-2 rounded-lg bg-white border border-slate-200 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-650 text-xs font-semibold"
                />
                <span className="text-[9px] text-slate-400 block mt-1 font-semibold">Placeholders: <code>{"{{name}}"}</code> will be substituted dynamically.</span>
              </div>
            </div>

            {/* Anniversary Section */}
            <div className="flex flex-col gap-3 bg-slate-50/50 border border-slate-150 p-4 rounded-xl">
              <div className="flex justify-between items-center">
                <label className="flex items-center gap-2 cursor-pointer font-extrabold text-xs text-slate-800">
                  <input
                    type="checkbox"
                    checked={anniversaryReminderEnabled}
                    onChange={(e) => setAnniversaryReminderEnabled(e.target.checked)}
                    className="rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                  />
                  Enable Anniversary Greetings
                </label>
                <input
                  type="time"
                  disabled={!anniversaryReminderEnabled}
                  value={anniversaryReminderTime}
                  onChange={(e) => setAnniversaryReminderTime(e.target.value)}
                  className="px-2 py-1 bg-white border border-slate-200 text-xs rounded font-bold cursor-pointer focus:outline-none focus:border-indigo-650"
                />
              </div>

              <div>
                <label className="block text-[9px] font-bold text-slate-400 mb-1 uppercase">Greeting Message Template</label>
                <textarea
                  disabled={!anniversaryReminderEnabled}
                  value={anniversaryReminderTemplate}
                  onChange={(e) => setAnniversaryReminderTemplate(e.target.value)}
                  placeholder="e.g. Happy Anniversary {{name}}! Wish you many more years of togetherness! 💕"
                  rows="3"
                  className="w-full px-3 py-2 rounded-lg bg-white border border-slate-200 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-650 text-xs font-semibold"
                />
                <span className="text-[9px] text-slate-400 block mt-1 font-semibold">Placeholders: <code>{"{{name}}"}</code> will be substituted dynamically.</span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end mt-4">
            <button
              type="submit"
              disabled={actionLoading}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 text-white rounded-xl text-xs font-bold cursor-pointer shadow-md transition-colors"
            >
              {actionLoading ? 'Saving Settings...' : 'Save Automation Config'}
            </button>
          </div>
        </form>
      )}

      {/* 4. CRM Detail Drawer Sidebar */}
      {selectedContact && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/30 backdrop-blur-xs">
          {/* Backdrop closer click */}
          <div className="flex-1" onClick={() => setSelectedContact(null)}></div>

          {/* Drawer Body */}
          <div className="w-full max-w-md bg-white border-l border-slate-200 shadow-2xl h-screen overflow-y-auto flex flex-col p-6 relative animate-slideLeft">
            <button
              onClick={() => setSelectedContact(null)}
              className="absolute right-4 top-4 p-1.5 rounded-lg text-slate-450 hover:bg-slate-50 transition-colors"
            >
              <X size={18} />
            </button>

            {/* Profile Header */}
            <div className="flex items-center gap-4 border-b border-slate-100 pb-5 mb-5 mt-2">
              <div className="h-14 w-14 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-600 text-xl font-black flex items-center justify-center shadow-xs">
                {selectedContact.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <h2 className="text-base font-extrabold text-slate-850">{selectedContact.name}</h2>
                <span className="text-xs font-mono text-slate-450 block mt-0.5">+{selectedContact.phone}</span>
                <span className={`inline-block mt-2 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase border ${getStageBadgeColor(selectedContact.stage)}`}>
                  {selectedContact.stage}
                </span>
              </div>
            </div>

            {/* Tabbed view inside Drawer */}
            <div className="flex flex-col gap-6">
              {/* Pipeline Scores */}
              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3.5 rounded-2xl border border-slate-150">
                <div className="text-center">
                  <span className="text-[9px] font-bold text-slate-400 uppercase block">Lead Score</span>
                  <strong className="text-base text-slate-800 font-extrabold block mt-0.5">{selectedContact.leadScore || 0}/100</strong>
                </div>
                <div className="text-center border-l border-slate-200">
                  <span className="text-[9px] font-bold text-slate-400 uppercase block">Customer Score</span>
                  <strong className="text-base text-slate-800 font-extrabold block mt-0.5">{selectedContact.customerScore || 0}/100</strong>
                </div>
              </div>

              {/* Dates */}
              <div className="flex flex-col gap-2 bg-slate-50/50 p-3 rounded-2xl border border-slate-200/60">
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                  <Calendar size={13} className="text-slate-400" />
                  <span>Birthday: <strong>{selectedContact.birthday ? new Date(selectedContact.birthday).toLocaleDateString() : 'Not Set'}</strong></span>
                </div>
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                  <Award size={13} className="text-slate-400" />
                  <span>Anniversary: <strong>{selectedContact.anniversary ? new Date(selectedContact.anniversary).toLocaleDateString() : 'Not Set'}</strong></span>
                </div>
              </div>

              {/* Purchase History Section */}
              <div className="border-t border-slate-100 pt-5">
                <h3 className="text-xs font-black text-slate-450 uppercase tracking-wider flex items-center gap-1.5 mb-3">
                  <DollarSign size={13} /> Purchase History Tracking
                </h3>
                
                {/* List Purchases */}
                <div className="flex flex-col gap-1.5 mb-3.5">
                  {(() => {
                    const purchaseStr = selectedContact.customFields?.purchases || '[]';
                    let list = [];
                    try {
                      list = JSON.parse(purchaseStr);
                    } catch (e) {
                      list = [];
                    }
                    if (list.length === 0) {
                      return <span className="text-[10px] text-slate-400 italic">No purchase records tracked yet.</span>;
                    }
                    return list.map((p) => (
                      <div key={p.id} className="p-2.5 rounded-xl border border-slate-200 bg-white flex justify-between items-center text-xs shadow-xs hover:border-slate-300">
                        <div>
                          <strong className="text-slate-800 block">{p.item}</strong>
                          <span className="text-[10px] text-slate-400 font-semibold">{new Date(p.date).toLocaleDateString()}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <strong className="text-indigo-650">₹{p.amount}</strong>
                          <button onClick={() => handleDeletePurchase(p.id)} className="text-red-400 hover:text-red-600 p-0.5">
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                    ));
                  })()}
                </div>

                {/* Log Purchase Inline Form */}
                <form onSubmit={handleAddPurchase} className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex flex-col gap-2">
                  <span className="text-[10px] font-black text-slate-500 uppercase">Log Purchase</span>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      required
                      placeholder="Item name (e.g. License)"
                      value={purchaseItem}
                      onChange={(e) => setPurchaseItem(e.target.value)}
                      className="px-2 py-1.5 bg-white border border-slate-200 text-xs rounded placeholder-slate-400 font-semibold focus:outline-none"
                    />
                    <input
                      type="number"
                      required
                      placeholder="Amount"
                      value={purchaseAmount}
                      onChange={(e) => setPurchaseAmount(e.target.value)}
                      className="px-2 py-1.5 bg-white border border-slate-200 text-xs rounded placeholder-slate-400 font-semibold focus:outline-none"
                    />
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="date"
                      value={purchaseDate}
                      onChange={(e) => setPurchaseDate(e.target.value)}
                      className="flex-1 px-2 py-1.5 bg-white border border-slate-200 text-xs rounded font-semibold focus:outline-none"
                    />
                    <button type="submit" className="px-3 bg-indigo-650 text-white rounded text-[10px] font-black cursor-pointer shadow-sm">
                      Record
                    </button>
                  </div>
                </form>
              </div>

              {/* Custom Columns / Fields Section */}
              <div className="border-t border-slate-100 pt-5">
                <h3 className="text-xs font-black text-slate-450 uppercase tracking-wider flex items-center gap-1.5 mb-3">
                  <Layers size={13} /> Custom Columns & Variables
                </h3>

                {/* Display Custom Fields */}
                <div className="flex flex-wrap gap-1.5 mb-3.5">
                  {(() => {
                    const fields = selectedContact.customFields || {};
                    const keys = Object.keys(fields).filter(k => k !== 'purchases');
                    if (keys.length === 0) {
                      return <span className="text-[10px] text-slate-400 italic">No custom fields defined.</span>;
                    }
                    return keys.map((key) => (
                      <span key={key} className="px-2.5 py-1 rounded bg-slate-50 border border-slate-200 text-xs font-medium text-slate-650 flex items-center gap-2">
                        <strong>{key}:</strong> {fields[key]}
                        <button onClick={() => handleDeleteCustomField(key)} className="text-slate-400 hover:text-red-500 font-bold">×</button>
                      </span>
                    ));
                  })()}
                </div>

                {/* Add Custom Field Inline Form */}
                <form onSubmit={handleAddCustomField} className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex flex-col gap-2">
                  <span className="text-[10px] font-black text-slate-500 uppercase font-display">Add custom variable</span>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      required
                      placeholder="Column Name (e.g. City)"
                      value={customFieldKey}
                      onChange={(e) => setCustomFieldKey(e.target.value)}
                      className="px-2 py-1.5 bg-white border border-slate-200 text-xs rounded placeholder-slate-400 font-semibold focus:outline-none"
                    />
                    <input
                      type="text"
                      required
                      placeholder="Value"
                      value={customFieldValue}
                      onChange={(e) => setCustomFieldValue(e.target.value)}
                      className="px-2 py-1.5 bg-white border border-slate-200 text-xs rounded placeholder-slate-400 font-semibold focus:outline-none"
                    />
                  </div>
                  <button type="submit" className="w-full py-1.5 bg-indigo-650 text-white rounded text-[10px] font-black cursor-pointer shadow-sm">
                    Save Variable
                  </button>
                </form>
              </div>

              {/* Customer History / Timeline view */}
              <div className="border-t border-slate-100 pt-5 pb-10">
                <h3 className="text-xs font-black text-slate-450 uppercase tracking-wider flex items-center gap-1.5 mb-4">
                  <History size={13} /> Customer History & Activity Timeline
                </h3>
                <div className="flex flex-col gap-4 border-l-2 border-slate-150 pl-4 ml-2">
                  <div className="relative">
                    <div className="absolute -left-[23px] top-1 h-2.5 w-2.5 rounded-full bg-indigo-500 ring-4 ring-white"></div>
                    <span className="text-[10px] text-slate-400 font-bold block">{new Date(selectedContact.createdAt).toLocaleString()}</span>
                    <span className="text-xs font-bold text-slate-700 block mt-0.5">Profile Created</span>
                    <p className="text-[10px] text-slate-450 mt-0.5 font-medium">Record registered as Funnel stage "{selectedContact.stage.toUpperCase()}".</p>
                  </div>
                  <div className="relative">
                    <div className="absolute -left-[23px] top-1 h-2.5 w-2.5 rounded-full bg-slate-400 ring-4 ring-white"></div>
                    <span className="text-[10px] text-slate-400 font-bold block">{selectedContact.updatedAt ? new Date(selectedContact.updatedAt).toLocaleString() : 'Recent'}</span>
                    <span className="text-xs font-bold text-slate-700 block mt-0.5">Last Interaction / Update</span>
                    <p className="text-[10px] text-slate-450 mt-0.5 font-medium">Contact profile synced or updated by active session.</p>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* MODAL 1: ADD CONTACT */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="w-full max-w-md bg-white border border-slate-200 shadow-2xl rounded-2xl p-6 relative">
            <button
              onClick={() => setShowAddModal(false)}
              className="absolute right-4 top-4 p-1.5 rounded-lg text-slate-400 hover:bg-slate-50 transition-colors"
            >
              <X size={16} />
            </button>
            
            <h3 className="text-lg font-black text-slate-900 mb-5">Create New Contact Profile</h3>
            <form onSubmit={handleAddContact} className="flex flex-col gap-4">
              <div>
                <label className="block text-[10px] font-black text-slate-450 mb-1.5 uppercase tracking-wider">Full Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Rahul Sharma"
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-205 text-slate-800 focus:outline-none focus:border-indigo-650 text-xs font-semibold"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-450 mb-1.5 uppercase tracking-wider">WhatsApp Phone Number</label>
                <input
                  type="text"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g. 919876543210 (with country code, no +)"
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-205 text-slate-800 focus:outline-none focus:border-indigo-650 text-xs font-semibold"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-450 mb-1.5 uppercase tracking-wider">Tags (Optional - Comma separated)</label>
                <input
                  type="text"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  placeholder="e.g. VIP, lead, follow up"
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-205 text-slate-850 focus:outline-none focus:border-indigo-655 text-xs font-semibold"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-450 mb-1.5 uppercase tracking-wider">Pipeline Funnel Stage</label>
                <select
                  value={stageInput}
                  onChange={(e) => setStageInput(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-205 text-slate-850 focus:outline-none focus:border-indigo-655 text-xs font-black cursor-pointer"
                >
                  {stages.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}
                </select>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-black text-slate-450 mb-1.5 uppercase tracking-wider">Birthday (Optional)</label>
                  <input
                    type="date"
                    value={birthday}
                    onChange={(e) => setBirthday(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-205 text-slate-850 focus:outline-none focus:border-indigo-655 text-xs font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-450 mb-1.5 uppercase tracking-wider">Anniversary (Optional)</label>
                  <input
                    type="date"
                    value={anniversary}
                    onChange={(e) => setAnniversary(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-205 text-slate-855 focus:outline-none focus:border-indigo-655 text-xs font-semibold"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 mt-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-500 hover:bg-slate-100 text-xs font-bold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-indigo-650 hover:bg-indigo-700 text-white text-xs font-black cursor-pointer shadow-md"
                >
                  Save Profile
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: BULK EDIT */}
      {showBulkEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="w-full max-w-md bg-white border border-slate-205 shadow-2xl rounded-2xl p-6 relative">
            <button
              onClick={() => setShowBulkEditModal(false)}
              className="absolute right-4 top-4 p-1.5 rounded-lg text-slate-400 hover:bg-slate-50 transition-colors"
            >
              <X size={16} />
            </button>

            <h3 className="text-lg font-black text-slate-900 mb-2">Bulk Edit {selectedContactIds.length} Profiles</h3>
            <p className="text-slate-500 text-[10px] mb-5 leading-relaxed font-bold">Only fill columns/fields you wish to update across all selected contact profiles.</p>

            <form onSubmit={handleBulkEdit} className="flex flex-col gap-4">
              <div>
                <label className="block text-[10px] font-black text-slate-450 mb-1.5 uppercase tracking-wider">Update Pipeline Stage</label>
                <select
                  value={bulkStage}
                  onChange={(e) => setBulkStage(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 focus:outline-none text-xs font-bold cursor-pointer"
                >
                  <option value="">-- Keep Current Stages --</option>
                  {stages.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-450 mb-1.5 uppercase tracking-wider">Tags to Add (Comma separated)</label>
                <input
                  type="text"
                  placeholder="e.g. VIP, customer"
                  value={bulkTagsToAdd}
                  onChange={(e) => setBulkTagsToAdd(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-805 text-xs font-semibold focus:outline-none focus:border-indigo-650"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-450 mb-1.5 uppercase tracking-wider">Tags to Remove (Comma separated)</label>
                <input
                  type="text"
                  placeholder="e.g. old_tag"
                  value={bulkTagsToRemove}
                  onChange={(e) => setBulkTagsToRemove(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-805 text-xs font-semibold focus:outline-none focus:border-indigo-650"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 mt-3">
                <button
                  type="button"
                  onClick={() => setShowBulkEditModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-500 hover:bg-slate-100 text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2.5 bg-indigo-650 hover:bg-indigo-700 text-white rounded-xl text-xs font-black shadow-md cursor-pointer"
                >
                  {actionLoading ? 'Applying...' : 'Apply Bulk Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: IMPORT SHEETS */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="w-full max-w-md bg-white border border-slate-200 shadow-2xl rounded-2xl p-6 relative">
            <button
              onClick={() => setShowImportModal(false)}
              className="absolute right-4 top-4 p-1.5 rounded-lg text-slate-400 hover:bg-slate-50 transition-colors"
            >
              <X size={16} />
            </button>
            
            <h3 className="text-lg font-black text-slate-900 mb-2">Import Bulk Contacts</h3>
            <p className="text-slate-550 text-[10px] mb-5 leading-relaxed font-bold">
              Upload an Excel (.xlsx) or CSV file. The file columns must include <strong className="text-slate-800">Name</strong> and <strong className="text-slate-800">Phone</strong>, and optionally <strong className="text-slate-800">Tags</strong> (separated by comma) and <strong className="text-slate-800">Stage</strong>.
            </p>
            
            <form onSubmit={handleAddContact} className="flex flex-col gap-4">
              <input
                type="file"
                required
                accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                className="block w-full text-xs text-slate-550 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border file:border-slate-200 file:text-xs file:font-black file:bg-slate-50 file:text-slate-700 hover:file:bg-slate-100 cursor-pointer"
              />

              <div className="flex items-center justify-end gap-2.5 mt-3">
                <button
                  type="button"
                  onClick={() => setShowImportModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-550 hover:bg-slate-100 text-xs font-bold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-indigo-650 hover:bg-indigo-700 text-white text-xs font-black cursor-pointer shadow-md"
                >
                  Start Import
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: CREATE STATIC LIST */}
      {showCreateListModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="w-full max-w-md bg-white border border-slate-200 shadow-2xl rounded-2xl p-6 relative">
            <button
              onClick={() => setShowCreateListModal(false)}
              className="absolute right-4 top-4 p-1.5 rounded-lg text-slate-405 hover:bg-slate-55 transition-colors"
            >
              <X size={16} />
            </button>
            
            <h3 className="text-lg font-black text-slate-900 mb-4">Create Static List Group</h3>
            <form onSubmit={handleCreateList} className="flex flex-col gap-4">
              <div>
                <label className="block text-[10px] font-black text-slate-450 mb-1.5 uppercase tracking-wider">List Group Name</label>
                <input
                  type="text"
                  required
                  value={newListName}
                  onChange={(e) => setNewListName(e.target.value)}
                  placeholder="e.g. Diwali Promo Targets"
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs font-semibold focus:outline-none focus:border-indigo-650"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-450 mb-1.5 uppercase tracking-wider">Description (Optional)</label>
                <textarea
                  value={newListDesc}
                  onChange={(e) => setNewListDesc(e.target.value)}
                  placeholder="Describe the target audience..."
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs font-semibold focus:outline-none focus:border-indigo-650"
                  rows="3"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowCreateListModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-500 hover:bg-slate-100 text-xs font-bold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-indigo-655 hover:bg-indigo-705 text-white text-xs font-black cursor-pointer shadow-md"
                >
                  Create Group
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 5: CREATE DYNAMIC SEGMENT */}
      {showCreateSegmentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="w-full max-w-md bg-white border border-slate-200 shadow-2xl rounded-2xl p-6 relative">
            <button
              onClick={() => setShowCreateSegmentModal(false)}
              className="absolute right-4 top-4 p-1.5 rounded-lg text-slate-405 hover:bg-slate-55 transition-colors"
            >
              <X size={16} />
            </button>
            
            <h3 className="text-lg font-black text-slate-900 mb-3">Save Dynamic Segment Filter</h3>
            <p className="text-[10px] text-slate-500 mb-4 font-semibold">Contacts matching these criteria will be automatically grouped in this segment.</p>
            
            <form onSubmit={handleCreateSegment} className="flex flex-col gap-4">
              <div>
                <label className="block text-[10px] font-black text-slate-450 mb-1.5 uppercase tracking-wider">Segment Name</label>
                <input
                  type="text"
                  required
                  value={newSegmentName}
                  onChange={(e) => setNewSegmentName(e.target.value)}
                  placeholder="e.g. VIP Leads"
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs font-semibold focus:outline-none focus:border-indigo-650"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-450 mb-1.5 uppercase tracking-wider">Description</label>
                <input
                  type="text"
                  value={newSegmentDesc}
                  onChange={(e) => setNewSegmentDesc(e.target.value)}
                  placeholder="e.g. Hot leads with score greater than 80"
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs font-semibold focus:outline-none focus:border-indigo-650"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-black text-slate-450 mb-1.5 uppercase tracking-wider">Stage Filter</label>
                  <select
                    value={newSegmentStage}
                    onChange={(e) => setNewSegmentStage(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs font-bold cursor-pointer"
                  >
                    <option value="">All Stages</option>
                    {stages.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-450 mb-1.5 uppercase tracking-wider">Tag Filter</label>
                  <input
                    type="text"
                    placeholder="e.g. VIP"
                    value={newSegmentTag}
                    onChange={(e) => setNewSegmentTag(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs font-semibold focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-450 mb-1.5 uppercase tracking-wider">Minimum Lead Score</label>
                <input
                  type="number"
                  placeholder="e.g. 80"
                  value={newSegmentMinScore}
                  onChange={(e) => setNewSegmentMinScore(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs font-semibold focus:outline-none focus:border-indigo-650"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowCreateSegmentModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-500 hover:bg-slate-100 text-xs font-bold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-indigo-655 hover:bg-indigo-705 text-white text-xs font-black cursor-pointer shadow-md"
                >
                  Save Segment
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
