import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  Search,
  CheckCircle,
  XCircle,
  Trash2,
  Edit2,
  UserPlus,
  Wifi,
  WifiOff,
  ChevronLeft,
  Activity,
  Calendar,
  Settings,
  Check,
  Clock,
  Sparkles,
  User,
  Mail,
  Lock,
  Smartphone,
  Shield,
  ShieldAlert,
  KeyRound,
  Users
} from 'lucide-react';

const getDatetimeString = (dateVal) => {
  if (!dateVal) return '';
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const getAvatarColor = (name) => {
  const colors = [
    'from-violet-500 to-indigo-500',
    'from-cyan-500 to-blue-500',
    'from-emerald-500 to-teal-500',
    'from-amber-500 to-orange-500',
    'from-rose-500 to-pink-500',
    'from-purple-500 to-fuchsia-500'
  ];
  const idx = (name || '').charCodeAt(0) % colors.length;
  return colors[isNaN(idx) ? 0 : idx];
};

const WorkspaceUsers = () => {
  const { user: currentUser, loading } = useAuth();
  const isGlobalAdmin = currentUser && !currentUser.tenantId;

  const isWorkspaceAdmin = currentUser?.tenantId && currentUser?.role === 'Admin';
  const hasAccess = isGlobalAdmin || isWorkspaceAdmin;

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-650 border-t-transparent" />
      </div>
    );
  }

  if (!currentUser || !hasAccess) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="h-16 w-16 bg-red-50 text-red-600 rounded-full flex items-center justify-center border border-red-100 mb-4">
          <svg className="h-8 w-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h2 className="text-lg font-extrabold text-slate-800">Access Denied</h2>
        <p className="text-slate-500 text-sm max-w-sm mt-1 font-semibold">
          This administration section is restricted to global platform administrators and workspace administrators.
        </p>
      </div>
    );
  }

  const [users, setUsers] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  
  // Custom view toggles
  const [showAddPage, setShowAddPage] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [trackUser, setTrackUser] = useState(null);
  
  // Add User states
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPass, setNewUserPass] = useState('');
  const [newUserTenantId, setNewUserTenantId] = useState('');
  const [newUserRole, setNewUserRole] = useState('Employee');

  // Editing values
  const [editPassword, setEditPassword] = useState('');
  
  // Track Report states
  const [trackUsage, setTrackUsage] = useState(null);
  const [trackLoading, setTrackLoading] = useState(false);
  const [plansList, setPlansList] = useState([]);
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [planStartDateInput, setPlanStartDateInput] = useState('');
  const [planExpiresAtInput, setPlanExpiresAtInput] = useState('');
  const [extraDaysInput, setExtraDaysInput] = useState(0);
  const [customMaxDevices, setCustomMaxDevices] = useState(1);
  const [customMaxMessagesPerMonth, setCustomMaxMessagesPerMonth] = useState(500);
  const [customMaxAiCredits, setCustomMaxAiCredits] = useState(50);
  const [customMaxStorageMb, setCustomMaxStorageMb] = useState(100);
  const [customDailyMessageLimit, setCustomDailyMessageLimit] = useState(100);
  const [customDefaultDelaySeconds, setCustomDefaultDelaySeconds] = useState(5);

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [permissionsUser, setPermissionsUser] = useState(null);
  const [permissionsState, setPermissionsState] = useState({
    sendMessage: true,
    sendMessageNote: '',
    sendMessageExpiresAt: '',

    bulkScheduling: true,
    bulkSchedulingNote: '',
    bulkSchedulingExpiresAt: '',

    smartBroadcast: true,
    smartBroadcastNote: '',
    smartBroadcastExpiresAt: '',

    flowBuilder: true,
    flowBuilderNote: '',
    flowBuilderExpiresAt: '',

    aiAutoReply: true,
    aiAutoReplyNote: '',
    aiAutoReplyExpiresAt: '',

    messageLogs: true,
    messageLogsNote: '',
    messageLogsExpiresAt: '',

    contacts: true,
    contactsNote: '',
    contactsExpiresAt: '',

    kb: true,
    kbNote: '',
    kbExpiresAt: ''
  });

  const handleOpenPermissions = (member) => {
    setPermissionsUser(member);
    
    setPermissionsState({
      sendMessage: member.permissions?.sendMessage !== false,
      sendMessageNote: member.permissions?.sendMessageNote || '',
      sendMessageExpiresAt: getDatetimeString(member.permissions?.sendMessageExpiresAt),

      bulkScheduling: member.permissions?.bulkScheduling !== false,
      bulkSchedulingNote: member.permissions?.bulkSchedulingNote || '',
      bulkSchedulingExpiresAt: getDatetimeString(member.permissions?.bulkSchedulingExpiresAt),

      smartBroadcast: member.permissions?.smartBroadcast !== false,
      smartBroadcastNote: member.permissions?.smartBroadcastNote || '',
      smartBroadcastExpiresAt: getDatetimeString(member.permissions?.smartBroadcastExpiresAt),

      flowBuilder: member.permissions?.flowBuilder !== false,
      flowBuilderNote: member.permissions?.flowBuilderNote || '',
      flowBuilderExpiresAt: getDatetimeString(member.permissions?.flowBuilderExpiresAt),

      aiAutoReply: member.permissions?.aiAutoReply !== false,
      aiAutoReplyNote: member.permissions?.aiAutoReplyNote || '',
      aiAutoReplyExpiresAt: getDatetimeString(member.permissions?.aiAutoReplyExpiresAt),

      messageLogs: member.permissions?.messageLogs !== false,
      messageLogsNote: member.permissions?.messageLogsNote || '',
      messageLogsExpiresAt: getDatetimeString(member.permissions?.messageLogsExpiresAt),

      contacts: member.permissions?.contacts !== false,
      contactsNote: member.permissions?.contactsNote || '',
      contactsExpiresAt: getDatetimeString(member.permissions?.contactsExpiresAt),

      kb: member.permissions?.kb !== false,
      kbNote: member.permissions?.kbNote || '',
      kbExpiresAt: getDatetimeString(member.permissions?.kbExpiresAt)
    });
  };

  const applyPreset = (presetName) => {
    const updated = { ...permissionsState };
    const keys = ['sendMessage', 'bulkScheduling', 'smartBroadcast', 'flowBuilder', 'aiAutoReply', 'messageLogs', 'contacts', 'kb'];

    if (presetName === 'full') {
      keys.forEach(k => {
        updated[k] = true;
        updated[`${k}Note`] = '';
        updated[`${k}ExpiresAt`] = '';
      });
    } else if (presetName === 'support') {
      const allowed = ['sendMessage', 'messageLogs', 'contacts'];
      const blocked = ['bulkScheduling', 'smartBroadcast', 'flowBuilder', 'aiAutoReply', 'kb'];
      allowed.forEach(k => {
        updated[k] = true;
        updated[`${k}Note`] = '';
        updated[`${k}ExpiresAt`] = '';
      });
      blocked.forEach(k => {
        updated[k] = false;
        updated[`${k}Note`] = 'Locked: Module restricted to campaign managers only.';
        updated[`${k}ExpiresAt`] = '';
      });
    } else if (presetName === 'billing') {
      keys.forEach(k => {
        updated[k] = false;
        updated[`${k}Note`] = 'Subscription suspended due to unpaid invoice.';
        updated[`${k}ExpiresAt`] = '';
      });
    }
    setPermissionsState(updated);
  };

  const handleSavePermissions = async (e) => {
    e.preventDefault();
    if (!permissionsUser) return;
    setError('');
    setSuccess('');
    try {
      const endpoint = isGlobalAdmin 
        ? `/admin/users/${permissionsUser._id}/permissions` 
        : `/auth/users/${permissionsUser._id}/permissions`;
         
      const { data } = await api.put(endpoint, { permissions: permissionsState });
      setSuccess(`Permissions updated successfully for ${permissionsUser.name}.`);
      
      const updatedUser = { ...permissionsUser, permissions: data.permissions || permissionsState, permissionAuditLogs: data.permissionAuditLogs || permissionsUser.permissionAuditLogs };
      setUsers(prev => prev.map(u => u._id === permissionsUser._id ? updatedUser : u));
      setPermissionsUser(null);
    } catch (err) {
      setError('Failed to update user page access permissions.');
    }
  };

  const fetchUsersData = async () => {
    try {
      if (isGlobalAdmin) {
        const usersRes = await api.get('/admin/users');
        setUsers(usersRes.data);

        const tenantsRes = await api.get('/admin/tenants');
        setTenants(tenantsRes.data);
      } else {
        const usersRes = await api.get('/auth/users');
        setUsers(usersRes.data);

        const sessionsRes = await api.get('/sessions');
        setSessions(sessionsRes.data);
      }
    } catch (err) {
      setError('Failed to retrieve directory records.');
    }
  };

  useEffect(() => {
    if (!loading && currentUser) {
      fetchUsersData();
    }
  }, [isGlobalAdmin, loading, currentUser]);

  const handleToggleUserActive = async (userId, currentStatus) => {
    try {
      const endpoint = isGlobalAdmin ? `/admin/users/${userId}/status` : `/auth/users/${userId}`;
      const { data } = await api.put(endpoint, { isActive: !currentStatus });
      setUsers((prev) => prev.map((u) => (u._id === userId ? { ...u, isActive: data.isActive } : u)));
      setSuccess('User active state updated successfully.');
    } catch (err) {
      setError('Failed to update user active state.');
    }
  };

  const handleEditUserSubmit = async (e) => {
    e.preventDefault();
    if (!editingUser) return;
    setError('');
    setSuccess('');
    try {
      if (isGlobalAdmin) {
        if (editPassword) {
          await api.put(`/admin/users/${editingUser._id}/password`, { password: editPassword });
          setSuccess('User password reset successfully.');
        } else {
          setSuccess('No modifications requested.');
        }
      }
      setEditingUser(null);
      setEditPassword('');
      fetchUsersData();
    } catch (err) {
      setError('Failed to update user password.');
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm('Are you sure you want to delete this user from the system?')) return;
    try {
      const endpoint = isGlobalAdmin ? `/admin/users/${userId}` : `/auth/users/${userId}`;
      await api.delete(endpoint);
      setUsers((prev) => prev.filter((u) => u._id !== userId));
      setSuccess('User successfully deleted.');
    } catch (err) {
      setError('Failed to delete user.');
    }
  };

  const handleAddUserSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      const endpoint = isGlobalAdmin ? '/admin/users' : '/auth/users';
      const payload = isGlobalAdmin
        ? {
            name: newUserName,
            email: newUserEmail,
            password: newUserPass,
            role: 'Admin', // Global Admin creates other Admins/Tenants
            tenantId: newUserTenantId || null
          }
        : {
            name: newUserName,
            email: newUserEmail,
            password: newUserPass,
            role: newUserRole
          };

      const res = await api.post(endpoint, payload);
      setUsers((prev) => [res.data, ...prev]);
      
      setNewUserName('');
      setNewUserEmail('');
      setNewUserPass('');
      setNewUserTenantId('');
      setNewUserRole('Employee');
      
      setShowAddPage(false);
      setSuccess('User added successfully.');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to register user.');
    }
  };

  // Open usage tracker popup
  const handleOpenTrackPage = async (member) => {
    setTrackUser(member);
    setTrackUsage(null);
    setSelectedPlanId('');
    setPlanStartDateInput(getDatetimeString(new Date()));
    setPlanExpiresAtInput(getDatetimeString(new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)));
    setExtraDaysInput(0);
    setTrackLoading(true);
    try {
      // 1. Fetch usage report
      if (member.tenantId?._id) {
        const { data } = await api.get(`/admin/tenants/${member.tenantId._id}/usage`);
        setTrackUsage(data);
        
        if (data.tenant?.planStartDate) {
          setPlanStartDateInput(getDatetimeString(data.tenant.planStartDate));
        }
        if (data.tenant?.planExpiresAt) {
          setPlanExpiresAtInput(getDatetimeString(data.tenant.planExpiresAt));
        }
        if (data.tenant?.limits) {
          setCustomMaxDevices(data.tenant.limits.maxDevices || 1);
          setCustomMaxMessagesPerMonth(data.tenant.limits.maxMessagesPerMonth || 500);
          setCustomMaxAiCredits(data.tenant.limits.maxAiCredits || 50);
          setCustomMaxStorageMb(data.tenant.limits.maxStorageMb || 1000);
          setCustomDailyMessageLimit(data.tenant.limits.dailyMessageLimit || 100);
          setCustomDefaultDelaySeconds(data.tenant.limits.defaultDelaySeconds || 5);
        }
      }

      // 2. Fetch system pricing plans
      const plansRes = await api.get('/admin/plans');
      setPlansList(plansRes.data);

      if (member.tenantId?.plan) {
        const match = plansRes.data.find(p => p.name.toLowerCase() === member.tenantId.plan.toLowerCase());
        if (match) setSelectedPlanId(match._id);
      }
    } catch (err) {
      setError('Failed to load real-time analytics.');
    } finally {
      setTrackLoading(false);
    }
  };

  const handlePlanChange = (planId) => {
    setSelectedPlanId(planId);
    if (!planId) return;
    const selectedPlan = plansList.find(p => p._id === planId);
    if (selectedPlan) {
      const days = selectedPlan.validityDays || 30;
      const start = planStartDateInput ? new Date(planStartDateInput) : new Date();
      const expiry = new Date(start.getTime() + days * 24 * 60 * 60 * 1000);
      setPlanExpiresAtInput(getDatetimeString(expiry));

      setCustomMaxDevices(selectedPlan.deviceLimit || 1);
      setCustomMaxMessagesPerMonth(selectedPlan.maxMessagesPerMonth || 500);
      setCustomMaxAiCredits(selectedPlan.maxAiCredits || 50);
      setCustomMaxStorageMb(selectedPlan.maxStorageMb || 1000);
      setCustomDailyMessageLimit(selectedPlan.dailyMessageLimit || 100);
      setCustomDefaultDelaySeconds(selectedPlan.defaultDelaySeconds || 5);
    }
  };

  const handleStartDateChange = (dateVal) => {
    setPlanStartDateInput(dateVal);
    if (!dateVal || !selectedPlanId) return;
    const selectedPlan = plansList.find(p => p._id === selectedPlanId);
    if (selectedPlan) {
      const days = selectedPlan.validityDays || 30;
      const start = new Date(dateVal);
      const expiry = new Date(start.getTime() + days * 24 * 60 * 60 * 1000);
      setPlanExpiresAtInput(getDatetimeString(expiry));
    }
  };

  // Update tenant pricing plan
  const handleAssignPlanSubmit = async (e) => {
    e.preventDefault();
    if (!trackUser?.tenantId?._id || !selectedPlanId) return;
    setTrackLoading(true);
    try {
      await api.put(`/admin/tenants/${trackUser.tenantId._id}/plan`, {
        planId: selectedPlanId,
        planStartDate: planStartDateInput,
        planExpiresAt: planExpiresAtInput,
        extraDays: parseInt(extraDaysInput) || 0,
        customLimits: {
          maxDevices: parseInt(customMaxDevices) || 1,
          maxContacts: parseInt(customMaxStorageMb) || 0,
          maxMessagesPerMonth: parseInt(customMaxMessagesPerMonth) || 0,
          maxAiCredits: parseInt(customMaxAiCredits) || 0,
          maxStorageMb: parseInt(customMaxStorageMb) || 0,
          dailyMessageLimit: parseInt(customDailyMessageLimit) || 0,
          defaultDelaySeconds: parseInt(customDefaultDelaySeconds) || 5
        }
      });
      
      setSuccess(`Plan assigned successfully.`);
      setTrackUser(null);
      fetchUsersData();
    } catch (err) {
      setError('Failed to update workspace plan limits.');
    } finally {
      setTrackLoading(false);
    }
  };

  const handleExpirePlanImmediately = async () => {
    if (!trackUser?.tenantId?._id) return;
    const confirmExpire = window.confirm('Are you sure you want to expire this workspace subscription immediately?');
    if (!confirmExpire) return;
    
    setTrackLoading(true);
    try {
      const expiredTime = new Date(Date.now() - 1000).toISOString();
      await api.put(`/admin/tenants/${trackUser.tenantId._id}/plan`, {
        planId: selectedPlanId || plansList[0]?._id || 'virtual-trial-id',
        planStartDate: planStartDateInput,
        planExpiresAt: expiredTime,
        extraDays: 0,
        customLimits: {
          maxDevices: parseInt(customMaxDevices) || 1,
          maxContacts: parseInt(customMaxStorageMb) || 0,
          maxMessagesPerMonth: parseInt(customMaxMessagesPerMonth) || 0,
          maxAiCredits: parseInt(customMaxAiCredits) || 0,
          maxStorageMb: parseInt(customMaxStorageMb) || 0,
          dailyMessageLimit: parseInt(customDailyMessageLimit) || 0,
          defaultDelaySeconds: parseInt(customDefaultDelaySeconds) || 5
        }
      });
      
      setSuccess(`Subscription expired immediately.`);
      setTrackUser(null);
      fetchUsersData();
    } catch (err) {
      setError('Failed to expire workspace subscription.');
    } finally {
      setTrackLoading(false);
    }
  };

  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email?.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;

    if (statusFilter === 'All') return true;
    if (statusFilter === 'Allowed') return u.isActive;
    if (statusFilter === 'Banned') return !u.isActive;
    if (statusFilter === 'Admins') return u.role === 'Admin' || !u.tenantId;
    if (statusFilter === 'Members') return u.role !== 'Admin' && u.tenantId;
    return true;
  });

  // -------------------------------------------------------------
  // FULL PAGE VIEW: USER PERMISSIONS CHECKLIST
  // -------------------------------------------------------------
  if (permissionsUser) {
    const permissionFields = [
      { key: 'sendMessage', label: 'Single Send Message', desc: 'Allows sending single quick messages from the dashboard.' },
      { key: 'bulkScheduling', label: 'Bulk Scheduled Campaigns', desc: 'Allows scheduling and dispatching bulk message campaigns with delay parameters.' },
      { key: 'smartBroadcast', label: 'Smart Broadcast Filters', desc: 'Allows segmenting broadcast target lists with custom parameters.' },
      { key: 'flowBuilder', label: 'Flow Builder Sequences', desc: 'Allows designing complex multi-stage conversational reply flows.' },
      { key: 'aiAutoReply', label: 'AI Auto Reply Rules', desc: 'Allows building custom keyword lists and smart AI bot response templates.' },
      { key: 'messageLogs', label: 'Message Logs & History', desc: 'Allows tracing send statuses, logs, and connection details.' },
      { key: 'contacts', label: 'CRM Contacts Directory', desc: 'Allows database uploads, contact importing, and tagging.' },
      { key: 'kb', label: 'Knowledge Base Files', desc: 'Allows files scraping, PDFs indexing, and training documents setup for AI.' }
    ];

    return (
      <div className="flex flex-col gap-6 w-full max-w-3xl">
        <div>
          <button
            onClick={() => setPermissionsUser(null)}
            className="flex items-center gap-2 text-slate-500 hover:text-indigo-650 font-bold text-sm cursor-pointer transition-colors"
          >
            <ChevronLeft size={16} /> Back to Users Directory
          </button>
        </div>

        <div>
          <h1 className="text-2xl font-extrabold text-slate-800 flex items-center gap-2">
            <Settings size={24} className="text-indigo-600 animate-spin-slow" /> Manage User Access Permissions
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Configure which tabs and automation features are unlocked or locked for <strong className="text-indigo-655">{permissionsUser.name}</strong> ({permissionsUser.email}).
          </p>
        </div>

        {/* TEMPLATES PRESET PANEL */}
        <div className="bg-slate-50 border border-slate-200 rounded-3xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
          <div>
            <span className="block text-xs font-black text-slate-800 uppercase tracking-wider">Quick Presets</span>
            <span className="block text-[10px] text-slate-400 font-semibold mt-0.5">Instantly configure access presets for standard roles.</span>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => applyPreset('full')}
              className="px-3.5 py-2 rounded-xl border border-indigo-200 bg-indigo-50/50 hover:bg-indigo-50 text-indigo-700 text-xs font-extrabold cursor-pointer transition-colors"
            >
              Full Access
            </button>
            <button
              type="button"
              onClick={() => applyPreset('support')}
              className="px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-extrabold cursor-pointer transition-colors"
            >
              Support Team
            </button>
            <button
              type="button"
              onClick={() => applyPreset('billing')}
              className="px-3.5 py-2 rounded-xl border border-rose-250 bg-rose-50/50 hover:bg-rose-50 text-rose-700 text-xs font-extrabold cursor-pointer transition-colors"
            >
              Billing Lock
            </button>
          </div>
        </div>

        <div className="bg-white border border-slate-200 shadow-sm rounded-3xl p-8">
          <form onSubmit={handleSavePermissions} className="flex flex-col gap-6">
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {permissionFields.map((item) => (
                <div key={item.key} className="flex flex-col p-5 bg-slate-50/30 border border-slate-200 rounded-3xl gap-4 hover:border-slate-300 transition-all">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <span className="block text-xs font-extrabold text-slate-850 truncate">{item.label}</span>
                      <span className="block text-[10px] text-slate-400 font-semibold mt-0.5 leading-relaxed">{item.desc}</span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer select-none shrink-0">
                      <input
                        type="checkbox"
                        checked={permissionsState[item.key]}
                        onChange={(e) => setPermissionsState({ ...permissionsState, [item.key]: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-650"></div>
                    </label>
                  </div>
                  
                  {/* EXPANDABLE RULES PANEL */}
                  <div className="border-t border-slate-100 pt-3 flex flex-col gap-3">
                    <div>
                      <label className="block text-[9px] font-black text-slate-400 uppercase tracking-wider mb-1">Custom Lock Note / Message</label>
                      <input
                        type="text"
                        placeholder={permissionsState[item.key] ? "Optional block warning message..." : "Write warning note to show on locked screen..."}
                        value={permissionsState[`${item.key}Note`] || ''}
                        onChange={(e) => setPermissionsState({ ...permissionsState, [`${item.key}Note`]: e.target.value })}
                        className="w-full px-3 py-2 text-xs font-semibold rounded-xl bg-white border border-slate-200 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-600 transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-black text-slate-400 uppercase tracking-wider mb-1">Temporary Expiry Schedule</label>
                      <input
                        type="datetime-local"
                        value={permissionsState[`${item.key}ExpiresAt`] || ''}
                        onChange={(e) => setPermissionsState({ ...permissionsState, [`${item.key}ExpiresAt`]: e.target.value })}
                        className="w-full px-3 py-2 text-xs font-semibold rounded-xl bg-white border border-slate-200 text-slate-800 focus:outline-none focus:border-indigo-600 transition-colors cursor-pointer"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-6 mt-2">
              <button
                type="button"
                onClick={() => setPermissionsUser(null)}
                className="px-5 py-3 rounded-xl text-slate-500 hover:bg-slate-100 text-sm font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold cursor-pointer transition-colors shadow-md shadow-indigo-600/10"
              >
                Save Page Permissions
              </button>
            </div>
          </form>
        </div>

        {/* AUDIT LOG TRACKING TRAILS */}
        {permissionsUser.permissionAuditLogs && permissionsUser.permissionAuditLogs.length > 0 && (
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col gap-4">
            <h3 className="text-sm font-extrabold text-slate-850 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-3">
              <Clock size={16} className="text-indigo-600" /> Permission Audit Trails
            </h3>
            <div className="flex flex-col gap-3 max-h-64 overflow-y-auto pr-1">
              {permissionsUser.permissionAuditLogs.map((log, idx) => (
                <div key={idx} className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs flex justify-between items-start gap-4">
                  <div>
                    <span className="font-bold text-slate-850 block">{log.action}</span>
                    {log.note && <span className="text-slate-550 mt-1 block italic">Note: "{log.note}"</span>}
                    <span className="text-[10px] text-slate-400 mt-1.5 block font-semibold">Modified by {log.changedBy}</span>
                  </div>
                  <span className="text-[9px] font-black text-slate-450 shrink-0 uppercase">
                    {new Date(log.timestamp).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // -------------------------------------------------------------
  // FULL PAGE VIEW: ADD NEW USER
  // -------------------------------------------------------------
  if (showAddPage) {
    return (
      <div className="flex flex-col gap-6 max-w-2xl">
        <div>
          <button
            onClick={() => setShowAddPage(false)}
            className="flex items-center gap-2 text-slate-500 hover:text-indigo-650 font-bold text-sm cursor-pointer transition-colors"
          >
            <ChevronLeft size={16} /> Back to Users Directory
          </button>
        </div>

        <div>
          <h1 className="text-2xl font-extrabold text-slate-800">Register Workspace User</h1>
          <p className="text-slate-500 text-sm mt-1">Configure profile details and assign a tenant workspace mapping.</p>
        </div>

        <div className="bg-white border border-slate-200 shadow-sm rounded-3xl p-8">
          <form onSubmit={handleAddUserSubmit} className="flex flex-col gap-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase flex items-center gap-1">
                  <User size={13} className="text-slate-400" /> Full Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Mahesh Kumar"
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 focus:outline-none focus:border-indigo-600 text-sm font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase flex items-center gap-1">
                  <Mail size={13} className="text-slate-400" /> Email Address
                </label>
                <input
                  type="email"
                  required
                  placeholder="name@company.com"
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 focus:outline-none focus:border-indigo-600 text-sm font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase flex items-center gap-1">
                  <Lock size={13} className="text-slate-400" /> Login Password
                </label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={newUserPass}
                  onChange={(e) => setNewUserPass(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 focus:outline-none focus:border-indigo-600 text-sm font-semibold"
                />
              </div>

              {isGlobalAdmin ? (
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">Assign Workspace (Tenant)</label>
                  <select
                    value={newUserTenantId}
                    onChange={(e) => setNewUserTenantId(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 focus:outline-none focus:border-indigo-650 text-sm font-bold cursor-pointer"
                  >
                    <option value="">None - Global Admin (Platform Scope)</option>
                    {tenants.map((t) => (
                      <option key={t._id} value={t._id}>
                        {t.companyName || t.name}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">User Account Role</label>
                  <select
                    value={newUserRole}
                    onChange={(e) => setNewUserRole(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 focus:outline-none focus:border-indigo-650 text-sm font-bold cursor-pointer"
                  >
                    <option value="Employee">Employee (Normal Member)</option>
                    <option value="Manager">Manager (Supervisory Access)</option>
                    <option value="Support">Support (Chat & Logs Access)</option>
                    <option value="Admin">Admin (Full Workspace Controller)</option>
                  </select>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-6 mt-2">
              <button
                type="button"
                onClick={() => setShowAddPage(false)}
                className="px-5 py-3 rounded-xl text-slate-500 hover:bg-slate-100 text-sm font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold cursor-pointer transition-colors shadow-md shadow-indigo-600/10"
              >
                Save & Create Account
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // FULL PAGE VIEW: EDIT PROFILE / PASSWORD
  // -------------------------------------------------------------
  if (editingUser) {
    return (
      <div className="flex flex-col gap-6 max-w-2xl">
        <div>
          <button
            onClick={() => setEditingUser(null)}
            className="flex items-center gap-2 text-slate-500 hover:text-indigo-650 font-bold text-sm cursor-pointer transition-colors"
          >
            <ChevronLeft size={16} /> Back to Users Directory
          </button>
        </div>

        <div>
          <h1 className="text-2xl font-extrabold text-slate-800">Reset Credentials</h1>
          <p className="text-slate-500 text-sm mt-1">Configure forced login updates for user <strong className="text-slate-750">{editingUser.name}</strong>.</p>
        </div>

        <div className="bg-white border border-slate-200 shadow-sm rounded-3xl p-8">
          <form onSubmit={handleEditUserSubmit} className="flex flex-col gap-6">
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase flex items-center gap-1">
                <Lock size={13} className="text-slate-400" /> New Account Password
              </label>
              <input
                type="password"
                required
                placeholder="Enter new secure password to reset..."
                value={editPassword}
                onChange={(e) => setEditPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 focus:outline-none focus:border-indigo-600 text-sm font-semibold"
              />
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-6 mt-2">
              <button
                type="button"
                onClick={() => {
                  setEditingUser(null);
                  setEditPassword('');
                }}
                className="px-5 py-3 rounded-xl text-slate-500 hover:bg-slate-100 text-sm font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold cursor-pointer transition-colors shadow-md shadow-indigo-600/10"
              >
                Update Password
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // FULL PAGE VIEW: USAGE TRACKING & PLAN ASSIGNMENT
  // -------------------------------------------------------------
  if (trackUser) {
    const daysRemaining = trackUsage?.tenant?.planExpiresAt
      ? Math.ceil((new Date(trackUsage.tenant.planExpiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
      : 0;

    return (
      <div className="flex flex-col gap-6 w-full max-w-none">
        <div>
          <button
            onClick={() => setTrackUser(null)}
            className="flex items-center gap-2 text-slate-500 hover:text-indigo-650 font-bold text-sm cursor-pointer transition-colors"
          >
            <ChevronLeft size={16} /> Back to Users Directory
          </button>
        </div>

        <div>
          <h1 className="text-2xl font-extrabold text-slate-800 flex items-center gap-2">
            <Activity size={24} className="text-indigo-600" /> Workspace Subscription & Limits Setup
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Real-time limits, active subscription calendar management, and plan parameters for <strong className="text-slate-700">{trackUser.tenantId?.companyName || trackUser.tenantId?.name}</strong>.
          </p>
        </div>

        {trackLoading ? (
          <div className="bg-white border border-slate-200 rounded-3xl p-16 flex justify-center items-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent"></div>
          </div>
        ) : trackUsage ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            
            {/* Left Column: Analytics metrics cards + Subscription Status Card */}
            <div className="lg:col-span-2 flex flex-col gap-6">
              
              {/* Subscription Status Banner */}
              <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Active Subscription Tier</span>
                  <div className="flex items-center gap-2.5 mt-1">
                    <span className="text-xl font-black text-indigo-750 uppercase">
                      {trackUsage.tenant?.plan || 'trial'} Plan
                    </span>
                    {daysRemaining > 0 ? (
                      <span className="px-2.5 py-1 text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-full">
                        {daysRemaining} Days Remaining
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 text-xs font-bold bg-red-50 text-red-655 border border-red-100 rounded-full">
                        Expired
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-xs text-slate-500 font-semibold mt-3">
                    <div>
                      <span className="text-slate-400">Start Date:</span>{' '}
                      {trackUsage.tenant?.planStartDate ? new Date(trackUsage.tenant.planStartDate).toLocaleDateString() : 'N/A'}
                    </div>
                    <div>
                      <span className="text-slate-400">Expiry Date:</span>{' '}
                      {trackUsage.tenant?.planExpiresAt ? new Date(trackUsage.tenant.planExpiresAt).toLocaleDateString() : 'N/A'}
                    </div>
                  </div>
                </div>

                <div className="text-left sm:text-right">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Status Code</span>
                  <span className={`inline-block px-3 py-1 rounded-xl text-xs font-bold mt-1.5 uppercase ${
                    trackUsage.tenant?.status === 'active' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                  }`}>
                    {trackUsage.tenant?.status || 'trial'}
                  </span>
                </div>
              </div>

              {/* Usage Cards Grid */}
              <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col gap-6">
                <h3 className="font-extrabold text-slate-800 text-sm border-b border-slate-100 pb-3 flex items-center gap-1.5">
                  <Sparkles size={16} className="text-indigo-600" /> Usage Resource Allocations
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Daily messages */}
                  <div className="p-4.5 rounded-2xl bg-slate-50 border border-slate-200">
                    <span className="text-[10px] font-black text-slate-450 uppercase block">Daily Messages Usage</span>
                    <span className="text-2xl font-black text-slate-800 block mt-1.5">
                      {trackUsage.usage?.sentToday || 0} <span className="text-xs font-semibold text-slate-400">/ {trackUsage.tenant?.limits?.dailyMessageLimit || 100} limit</span>
                    </span>
                    <div className="w-full bg-slate-200 h-2 rounded-full mt-3 overflow-hidden">
                      <div
                        className="bg-indigo-650 h-full transition-all"
                        style={{ width: `${Math.min(100, ((trackUsage.usage?.sentToday || 0) / (trackUsage.tenant?.limits?.dailyMessageLimit || 100)) * 100)}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Monthly limit */}
                  <div className="p-4.5 rounded-2xl bg-slate-50 border border-slate-200">
                    <span className="text-[10px] font-black text-slate-450 uppercase block">Monthly Messages Limit</span>
                    <span className="text-2xl font-black text-slate-800 block mt-1.5">
                      {trackUsage.usage?.sentThisMonth || 0} <span className="text-xs font-semibold text-slate-400">/ {trackUsage.tenant?.limits?.maxMessagesPerMonth || 500} limit</span>
                    </span>
                    <div className="w-full bg-slate-200 h-2 rounded-full mt-3 overflow-hidden">
                      <div
                        className="bg-emerald-600 h-full transition-all"
                        style={{ width: `${Math.min(100, ((trackUsage.usage?.sentThisMonth || 0) / (trackUsage.tenant?.limits?.maxMessagesPerMonth || 500)) * 100)}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Contacts limit */}
                  <div className="p-4.5 rounded-2xl bg-slate-50 border border-slate-200">
                    <span className="text-[10px] font-black text-slate-450 uppercase block">Imported Contacts</span>
                    <span className="text-2xl font-black text-slate-800 block mt-1.5">
                      {trackUsage.usage?.contactsCount || 0} <span className="text-xs font-semibold text-slate-400">/ {trackUsage.tenant?.limits?.maxStorageMb || 1000} capacity</span>
                    </span>
                    <div className="w-full bg-slate-200 h-2 rounded-full mt-3 overflow-hidden">
                      <div
                        className="bg-indigo-600 h-full transition-all"
                        style={{ width: `${Math.min(100, ((trackUsage.usage?.contactsCount || 0) / (trackUsage.tenant?.limits?.maxStorageMb || 1000)) * 100)}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* WhatsApp Devices */}
                  <div className="p-4.5 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col justify-between">
                    <div>
                      <span className="text-[10px] font-black text-slate-450 uppercase block">WhatsApp Device Limit</span>
                      <span className="text-xl font-black text-slate-800 block mt-1.5 flex items-center gap-1.5">
                        <Smartphone size={18} className="text-indigo-650" /> {trackUsage.usage?.activeDevices || 0} connected / {trackUsage.tenant?.limits?.maxDevices || 1} allowed
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-500 font-bold mt-3.5 flex items-center gap-1 bg-white border border-slate-100 p-2 rounded-xl">
                      <Clock size={12} className="text-indigo-650" /> Default Delay Interval: {trackUsage.tenant?.limits?.defaultDelaySeconds || 5} seconds spacing
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Pricing Plan Assignment & Date boundaries */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col h-fit gap-6">
              <div>
                <h3 className="font-extrabold text-slate-800 text-sm border-b border-slate-100 pb-3 flex items-center gap-1.5">
                  <Settings size={16} className="text-indigo-600" /> Subscription & Period Config
                </h3>
                <p className="text-xs text-slate-400 mt-2 font-semibold leading-relaxed">
                  Select pricing plan, set precise start and end validity periods, or extend the user's active days.
                </p>

                <form onSubmit={handleAssignPlanSubmit} className="flex flex-col gap-4 mt-5">
                  <div>
                    <label className="block text-[10px] font-black text-slate-450 mb-1.5 uppercase">Pricing Tier Plan</label>
                    <select
                      required
                      value={selectedPlanId}
                      onChange={(e) => handlePlanChange(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 focus:outline-none focus:border-indigo-655 text-sm font-bold cursor-pointer"
                    >
                      <option value="">Choose plan...</option>
                      {plansList.map((pl) => (
                        <option key={pl._id} value={pl._id}>
                          {pl.name.toUpperCase()} (${pl.price}/mo)
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-slate-450 mb-1.5 uppercase">Plan Start Date & Time</label>
                    <input
                      type="datetime-local"
                      required
                      value={planStartDateInput}
                      onChange={(e) => handleStartDateChange(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 focus:outline-none focus:border-indigo-650 text-sm font-semibold cursor-pointer"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-slate-450 mb-1.5 uppercase">Plan Expiry Date & Time</label>
                    <input
                      type="datetime-local"
                      required
                      value={planExpiresAtInput}
                      onChange={(e) => setPlanExpiresAtInput(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 focus:outline-none focus:border-indigo-650 text-sm font-semibold cursor-pointer"
                    />
                  </div>

                  <div className="border-t border-slate-100 pt-3">
                    <span className="block text-[10px] font-black text-slate-450 uppercase mb-3">Custom Resource Limits Override</span>
                    <div className="grid grid-cols-2 gap-3.5">
                      <div>
                        <label className="block text-[9px] font-bold text-slate-500 mb-1">Device Limit</label>
                        <input
                          type="number"
                          value={customMaxDevices}
                          onChange={(e) => setCustomMaxDevices(parseInt(e.target.value) || 1)}
                          className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-800 text-xs font-semibold"
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] font-bold text-slate-500 mb-1">Daily Msg Limit</label>
                        <input
                          type="number"
                          value={customDailyMessageLimit}
                          onChange={(e) => setCustomDailyMessageLimit(parseInt(e.target.value) || 0)}
                          className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-800 text-xs font-semibold"
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] font-bold text-slate-500 mb-1">Monthly Msg Limit</label>
                        <input
                          type="number"
                          value={customMaxMessagesPerMonth}
                          onChange={(e) => setCustomMaxMessagesPerMonth(parseInt(e.target.value) || 0)}
                          className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-800 text-xs font-semibold"
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] font-bold text-slate-500 mb-1">Contacts Capacity</label>
                        <input
                          type="number"
                          value={customMaxStorageMb}
                          onChange={(e) => setCustomMaxStorageMb(parseInt(e.target.value) || 0)}
                          className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-800 text-xs font-semibold"
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] font-bold text-slate-500 mb-1">AI Credits Quota</label>
                        <input
                          type="number"
                          value={customMaxAiCredits}
                          onChange={(e) => setCustomMaxAiCredits(parseInt(e.target.value) || 0)}
                          className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-800 text-xs font-semibold"
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] font-bold text-slate-500 mb-1">Delay Interval (s)</label>
                        <input
                          type="number"
                          value={customDefaultDelaySeconds}
                          onChange={(e) => setCustomDefaultDelaySeconds(parseInt(e.target.value) || 5)}
                          className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-800 text-xs font-semibold"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-slate-100 pt-3">
                    <label className="block text-[10px] font-black text-indigo-650 mb-1.5 uppercase">Add Extra Days / Extend Plan</label>
                    <input
                      type="number"
                      placeholder="e.g. 7 (days to append)"
                      value={extraDaysInput}
                      onChange={(e) => setExtraDaysInput(parseInt(e.target.value) || 0)}
                      className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-indigo-150 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-650 text-sm font-semibold"
                    />
                    <p className="text-[10px] text-slate-400 mt-1 font-semibold">
                      This will automatically add the specified number of days to the expiration date.
                    </p>
                  </div>

                  <div className="flex flex-col gap-2">
                    <button
                      type="submit"
                      className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black cursor-pointer transition-all flex items-center justify-center gap-1.5 shadow-md shadow-indigo-600/10"
                    >
                      <Check size={14} /> Update Plan & Expiry
                    </button>
                    
                    <button
                      type="button"
                      onClick={handleExpirePlanImmediately}
                      className="w-full py-3 rounded-xl bg-rose-50 border border-rose-200 hover:bg-rose-100 text-rose-700 text-xs font-black cursor-pointer transition-all flex items-center justify-center gap-1.5 shadow-sm"
                    >
                      <XCircle size={14} /> Expire Plan Immediately
                    </button>
                  </div>
                </form>
              </div>

              <div className="border-t border-slate-100 pt-4 flex items-center gap-2 text-[10px] text-slate-400 font-bold uppercase tracking-wider select-none">
                <Calendar size={13} /> Member Since: {new Date(trackUser.createdAt).toLocaleDateString()}
              </div>
            </div>

          </div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-3xl p-16 text-center text-red-500 font-semibold">
            Unable to retrieve workspace metrics.
          </div>
        )}
      </div>
    );
  }

  // -------------------------------------------------------------
  // DEFAULT CATALOG LISTING VIEW
  // -------------------------------------------------------------
  const totalUsersCount = users.length;
  const allowedUsersCount = users.filter(u => u.isActive).length;
  const bannedUsersCount = users.filter(u => !u.isActive).length;
  const adminUsersCount = users.filter(u => u.role === 'Admin' || !u.tenantId).length;

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-800">
            {isGlobalAdmin ? 'Global Users Directory' : 'Workspace Team Members'}
          </h1>
          <p className="text-slate-500 text-sm mt-1 font-semibold">
            {isGlobalAdmin
              ? 'Manage administrative credentials, check registration logs, and trace usage metrics.'
              : 'Add team members, configure feature access rules, and manage credentials.'}
          </p>
        </div>
        <button
          onClick={() => setShowAddPage(true)}
          className="px-4.5 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-750 text-white text-sm font-black flex items-center gap-2 cursor-pointer transition-all hover:shadow-lg shadow-md shadow-indigo-650/10"
        >
          <UserPlus size={16} /> {isGlobalAdmin ? 'Add New User' : 'Invite Team Member'}
        </button>
      </div>

      {error && (
        <div className="p-3.5 rounded-xl border border-red-200 bg-red-50 text-red-655 text-sm font-semibold">
          {error}
        </div>
      )}

      {success && (
        <div className="p-3.5 rounded-xl border border-emerald-250 bg-emerald-50 text-emerald-700 text-sm font-semibold">
          {success}
        </div>
      )}

      {/* Premium Statistics Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Card 1: Total Users */}
        <div className="relative overflow-hidden bg-white border border-slate-200/80 rounded-3xl p-5 shadow-sm transition-all hover:shadow-md hover:border-slate-300">
          <div className="flex justify-between items-start">
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Total Accounts</span>
              <span className="text-2xl font-black text-slate-850">{totalUsersCount}</span>
            </div>
            <div className="p-3 rounded-2xl bg-indigo-50 text-indigo-600">
              <Users size={20} />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-1.5 text-[10px] font-black text-indigo-650 uppercase">
            Platform registrations
          </div>
          <div className="absolute -bottom-6 -right-6 w-24 h-24 bg-indigo-50/40 rounded-full blur-2xl"></div>
        </div>

        {/* Card 2: Allowed Accounts */}
        <div className="relative overflow-hidden bg-white border border-slate-200/80 rounded-3xl p-5 shadow-sm transition-all hover:shadow-md hover:border-slate-300">
          <div className="flex justify-between items-start">
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Allowed Access</span>
              <span className="text-2xl font-black text-emerald-600">{allowedUsersCount}</span>
            </div>
            <div className="p-3 rounded-2xl bg-emerald-50 text-emerald-600">
              <Shield size={20} />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-1.5 text-[10px] font-black text-emerald-650 uppercase">
            Active Gateway Verified
          </div>
          <div className="absolute -bottom-6 -right-6 w-24 h-24 bg-emerald-50/40 rounded-full blur-2xl"></div>
        </div>

        {/* Card 3: Suspended Accounts */}
        <div className="relative overflow-hidden bg-white border border-slate-200/80 rounded-3xl p-5 shadow-sm transition-all hover:shadow-md hover:border-slate-300">
          <div className="flex justify-between items-start">
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Suspended</span>
              <span className="text-2xl font-black text-rose-600">{bannedUsersCount}</span>
            </div>
            <div className="p-3 rounded-2xl bg-rose-50 text-rose-555">
              <ShieldAlert size={20} />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-1.5 text-[10px] font-black text-rose-500 uppercase">
            Suspended Profiles
          </div>
          <div className="absolute -bottom-6 -right-6 w-24 h-24 bg-rose-50/40 rounded-full blur-2xl"></div>
        </div>

        {/* Card 4: Administrative Roles */}
        <div className="relative overflow-hidden bg-white border border-slate-200/80 rounded-3xl p-5 shadow-sm transition-all hover:shadow-md hover:border-slate-300">
          <div className="flex justify-between items-start">
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Admin Status</span>
              <span className="text-2xl font-black text-amber-500">{adminUsersCount}</span>
            </div>
            <div className="p-3 rounded-2xl bg-amber-50 text-amber-600">
              <KeyRound size={20} />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-1.5 text-[10px] font-black text-amber-600 uppercase">
            Privileged Users
          </div>
          <div className="absolute -bottom-6 -right-6 w-24 h-24 bg-amber-50/40 rounded-full blur-2xl"></div>
        </div>
      </div>

      {/* Directory Table */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col gap-6">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 border-b border-slate-100 pb-5">
          {/* Quick Filters */}
          <div className="flex flex-wrap items-center gap-2">
            {[
              { id: 'All', label: 'All Users', count: totalUsersCount },
              { id: 'Allowed', label: 'Allowed Only', count: allowedUsersCount },
              { id: 'Banned', label: 'Suspended Only', count: bannedUsersCount },
              { id: 'Admins', label: 'Administrators', count: adminUsersCount },
              { id: 'Members', label: 'Standard Users', count: totalUsersCount - adminUsersCount }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id)}
                className={`px-4 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                  statusFilter === tab.id
                    ? 'bg-slate-800 text-white shadow-sm'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-slate-800 border border-slate-200/60'
                }`}
              >
                {tab.label} ({tab.count})
              </button>
            ))}
          </div>

          <div className="relative w-full lg:w-80">
            <Search className="absolute left-3.5 top-3 text-slate-400" size={16} />
            <input
              type="text"
              placeholder="Search by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl bg-slate-50 border border-slate-200 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-650 font-semibold"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400 font-bold text-xs uppercase tracking-wider">
                <th className="pb-3.5">User Profile Details</th>
                {isGlobalAdmin && <th className="pb-3.5">Workspace Organization</th>}
                <th className="pb-3.5">Role rank</th>
                <th className="pb-3.5">Joined On</th>
                <th className="pb-3.5">Account access</th>
                <th className="pb-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={isGlobalAdmin ? 6 : 5} className="py-12 text-center text-slate-400 font-bold">
                    No registry matches found under the selected filters.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((member) => {
                  const initial = (member.name || member.email || 'U').charAt(0).toUpperCase();
                  const avatarColor = getAvatarColor(member.name);
                  return (
                    <tr key={member._id} className="text-slate-700 hover:bg-slate-50/40 transition-colors group">
                      <td className="py-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-2xl bg-gradient-to-br ${avatarColor} text-white flex items-center justify-center font-black text-sm shadow-sm`}>
                            {initial}
                          </div>
                          <div>
                            <div className="font-extrabold text-slate-800 text-sm group-hover:text-indigo-600 transition-colors">{member.name}</div>
                            <div className="text-xs text-slate-400 font-semibold">{member.email}</div>
                          </div>
                        </div>
                      </td>
                      {isGlobalAdmin && (
                        <td className="py-4">
                          <span className="font-bold text-indigo-650 bg-indigo-50 border border-indigo-100 px-2.5 py-1 rounded-xl text-xs">
                            {member.tenantId?.companyName || member.tenantId?.name || 'Global Admin Platform'}
                          </span>
                        </td>
                      )}
                      <td className="py-4">
                        <span className={`inline-flex items-center gap-1 text-[10px] font-black uppercase px-2 py-0.5 rounded-lg border ${
                          !member.tenantId 
                            ? 'bg-purple-50 text-purple-700 border-purple-100'
                            : member.role === 'Admin'
                            ? 'bg-indigo-50 text-indigo-700 border-indigo-100'
                            : 'bg-slate-100 text-slate-700 border-slate-200'
                        }`}>
                          {!member.tenantId ? 'Platform Admin' : member.role === 'Admin' ? 'Workspace Admin' : 'Staff Employee'}
                        </span>
                      </td>
                      <td className="py-4 text-xs font-bold text-slate-500">
                        <div className="flex items-center gap-1 text-slate-500">
                          <Calendar size={13} className="text-slate-400" />
                          {member.createdAt ? new Date(member.createdAt).toLocaleDateString() : 'N/A'}
                        </div>
                      </td>
                      <td className="py-4">
                        <button
                          onClick={() => handleToggleUserActive(member._id, member.isActive)}
                          className={`inline-flex items-center gap-1.5 cursor-pointer font-black text-[10px] uppercase px-3 py-1.5 rounded-full border transition-all ${
                            member.isActive 
                              ? 'bg-emerald-50 border-emerald-150 text-emerald-700 hover:bg-emerald-100 shadow-sm' 
                              : 'bg-rose-50 border-rose-150 text-rose-700 hover:bg-rose-100 shadow-sm'
                          }`}
                        >
                          {member.isActive ? <CheckCircle size={13} /> : <XCircle size={13} />}
                          {member.isActive ? 'ALLOWED' : 'BANNED'}
                        </button>
                      </td>
                      <td className="py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {member.tenantId && (
                            <button
                              onClick={() => handleOpenTrackPage(member)}
                              className="px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-600 border border-indigo-150 text-indigo-700 hover:text-white text-xs font-black flex items-center gap-1.5 cursor-pointer transition-all shadow-sm"
                            >
                              <Activity size={13} /> Track Report
                            </button>
                          )}
                          <button
                            onClick={() => handleOpenPermissions(member)}
                            className="p-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-650 hover:text-slate-800 border border-slate-200 cursor-pointer transition-all"
                            title="Configure Access Permissions"
                          >
                            <Settings size={13} />
                          </button>
                          <button
                            onClick={() => {
                              setEditingUser(member);
                            }}
                            className="p-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-650 hover:text-slate-800 border border-slate-200 cursor-pointer transition-all"
                            title="Edit Credentials"
                          >
                            <Edit2 size={13} />
                          </button>
                          <button
                            onClick={() => handleDeleteUser(member._id)}
                            className="p-2 rounded-xl bg-rose-50 hover:bg-rose-500 text-rose-600 hover:text-white border border-rose-200 cursor-pointer transition-all"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default WorkspaceUsers;
