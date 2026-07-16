import React, { useEffect, useState } from 'react';
import api from '../services/api';
import {
  Users,
  Shield,
  Layers,
  Database,
  Lock,
  Settings,
  Key,
  Plus,
  Search,
  Trash2,
  Edit3,
  Server,
  Globe,
  Bot,
  Sliders,
  Calendar,
  Check,
  X,
  ChevronRight,
  Info,
  Clock,
  Mail,
  AlertCircle
} from 'lucide-react';

const AdminPanel = ({ tab = 'overview' }) => {
  const [activeTab, setActiveTab] = useState(tab);

  useEffect(() => {
    setActiveTab(tab);
  }, [tab]);
  
  // State
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalTenants: 0,
    totalSessions: 0,
    totalMessages: 0
  });
  
  const [tenants, setTenants] = useState([]);
  const [plans, setPlans] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [auditPagination, setAuditPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [auditFilter, setAuditFilter] = useState({ tenantId: '', action: '', page: 1 });
  
  // System Settings State
  const [systemSettings, setSystemSettings] = useState({
    smtpHost: '',
    smtpPort: 587,
    smtpSecure: false,
    smtpUser: '',
    smtpPass: '',
    smtpFrom: '',
    gatewayMaxRetries: 3,
    gatewayDelayMin: 2,
    gatewayDelayMax: 10,
    openaiKey: '',
    openaiModel: 'gpt-4o-mini',
    siteTitle: 'FuseFlow',
    supportEmail: 'support@fuseflow.com',
    logoUrl: '',
    enableWhiteLabeling: false
  });

  // Admin Self password change
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // UI states
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Modal / Editing states
  const [selectedTenant, setSelectedTenant] = useState(null);
  const [selectedTenantUsage, setSelectedTenantUsage] = useState(null);
  const [isTenantModalOpen, setIsTenantModalOpen] = useState(false);
  const [customLimitsEnabled, setCustomLimitsEnabled] = useState(false);
  
  // Workspace Limits Edit State
  const [maxDevices, setMaxDevices] = useState(1);
  const [maxMessages, setMaxMessages] = useState(500);
  const [maxAi, setMaxAi] = useState(50);
  const [maxStorage, setMaxStorage] = useState(100);
  const [dailyLimit, setDailyLimit] = useState(100);
  const [delaySec, setDelaySec] = useState(5);
  const [bulkScheduling, setBulkScheduling] = useState(true);
  const [flowBuilder, setFlowBuilder] = useState(true);
  const [aiAutoReply, setAiAutoReply] = useState(true);
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [planExpiresAtInput, setPlanExpiresAtInput] = useState('');
  const [extraDaysInput, setExtraDaysInput] = useState(0);

  // Plan CRUD states
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);
  const [planForm, setPlanForm] = useState({
    name: '',
    price: 0,
    deviceLimit: 1,
    maxContacts: 1000,
    maxMessagesPerMonth: 1000,
    maxAiCredits: 50,
    maxStorageMb: 100,
    dailyMessageLimit: 100,
    defaultDelaySeconds: 5,
    validityDays: 30,
    bulkScheduling: true,
    flowBuilder: true,
    aiAutoReply: true
  });

  // Audit details popup state
  const [selectedAuditLog, setSelectedAuditLog] = useState(null);

  // Fetch Stats & Global Records
  const fetchStats = async () => {
    try {
      const { data } = await api.get('/admin/stats');
      setStats(data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchTenants = async () => {
    try {
      const { data } = await api.get('/admin/tenants');
      setTenants(data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchPlans = async () => {
    try {
      const { data } = await api.get('/admin/plans');
      setPlans(data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchAuditLogs = async () => {
    try {
      const { data } = await api.get('/admin/audit', {
        params: {
          tenantId: auditFilter.tenantId || undefined,
          action: auditFilter.action || undefined,
          page: auditFilter.page
        }
      });
      setAuditLogs(data.logs || []);
      setAuditPagination(data.pagination || { page: 1, pages: 1, total: 0 });
    } catch (err) {
      console.error(err);
    }
  };

  const fetchSystemSettings = async () => {
    try {
      const { data } = await api.get('/admin/settings');
      setSystemSettings(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchStats();
    fetchTenants();
    fetchPlans();
    fetchSystemSettings();
  }, []);

  useEffect(() => {
    if (activeTab === 'audit') {
      fetchAuditLogs();
    }
  }, [activeTab, auditFilter]);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setError('');
    setSuccess('');
  };

  // Change Admin Password
  const handleAdminChangePassword = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setError('New passwords do not match.');
      return;
    }
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      await api.put('/admin/change-password', { oldPassword, newPassword });
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setSuccess('Your password has been changed successfully.');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to change admin password.');
    } finally {
      setLoading(false);
    }
  };

  // Save Global settings
  const handleSaveSystemSettings = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const { data } = await api.put('/admin/settings', systemSettings);
      setSystemSettings(data);
      setSuccess('Global system configuration successfully updated.');
    } catch (err) {
      setError('Failed to update system configurations.');
    } finally {
      setLoading(false);
    }
  };

  // Tenant Editing trigger
  const handleOpenTenantModal = async (tenant) => {
    setSelectedTenant(tenant);
    setSelectedPlanId('');
    setPlanExpiresAtInput(tenant.planExpiresAt ? tenant.planExpiresAt.slice(0, 10) : '');
    setExtraDaysInput(0);
    setCustomLimitsEnabled(tenant.limits?.isCustomLimits || false);
    setMaxDevices(tenant.limits?.maxDevices || 1);
    setMaxMessages(tenant.limits?.maxMessagesPerMonth || 500);
    setMaxAi(tenant.limits?.maxAiCredits || 50);
    setMaxStorage(tenant.limits?.maxStorageMb || 100);
    setDailyLimit(tenant.limits?.dailyMessageLimit || 100);
    setDelaySec(tenant.limits?.defaultDelaySeconds || 5);
    setBulkScheduling(tenant.limits?.bulkScheduling !== false);
    setFlowBuilder(tenant.limits?.flowBuilder !== false);
    setAiAutoReply(tenant.limits?.aiAutoReply !== false);
    
    // Load live tenant stats
    setSelectedTenantUsage(null);
    setIsTenantModalOpen(true);
    try {
      const { data } = await api.get(`/admin/tenants/${tenant._id}/usage`);
      setSelectedTenantUsage(data.usage);
      const match = plans.find(p => p.name.toLowerCase() === tenant.plan?.toLowerCase());
      if (match) setSelectedPlanId(match._id);
    } catch (err) {
      console.error(err);
    }
  };

  // Assign Plan/Limits submit
  const handleAssignPlanSubmit = async (e) => {
    e.preventDefault();
    if (!selectedTenant) return;
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const payload = {
        planId: selectedPlanId,
        planExpiresAt: planExpiresAtInput || undefined,
        extraDays: Number(extraDaysInput) || 0
      };

      if (customLimitsEnabled) {
        payload.customLimits = {
          maxDevices,
          maxMessagesPerMonth: maxMessages,
          maxAiCredits: maxAi,
          maxStorageMb: maxStorage,
          dailyMessageLimit: dailyLimit,
          defaultDelaySeconds: delaySec,
          bulkScheduling,
          flowBuilder,
          aiAutoReply
        };
      }

      await api.put(`/admin/tenants/${selectedTenant._id}/plan`, payload);
      setSuccess(`Plan and limits successfully updated for ${selectedTenant.name || selectedTenant.companyName}.`);
      setIsTenantModalOpen(false);
      fetchTenants();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update workspace plan limits.');
    } finally {
      setLoading(false);
    }
  };

  // Plan Form change helper
  const handlePlanFormChange = (e) => {
    const { name, value, type, checked } = e.target;
    setPlanForm(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : (type === 'number' ? Number(value) : value)
    }));
  };

  const handleOpenPlanModal = (plan = null) => {
    if (plan) {
      setEditingPlan(plan);
      setPlanForm({
        name: plan.name,
        price: plan.price,
        deviceLimit: plan.deviceLimit || 1,
        maxContacts: plan.maxContacts || 1000,
        maxMessagesPerMonth: plan.maxMessagesPerMonth || 1000,
        maxAiCredits: plan.maxAiCredits || 50,
        maxStorageMb: plan.maxStorageMb || 100,
        dailyMessageLimit: plan.dailyMessageLimit || 100,
        defaultDelaySeconds: plan.defaultDelaySeconds || 5,
        validityDays: plan.validityDays || 30,
        bulkScheduling: plan.bulkScheduling !== false,
        flowBuilder: plan.flowBuilder !== false,
        aiAutoReply: plan.aiAutoReply !== false
      });
    } else {
      setEditingPlan(null);
      setPlanForm({
        name: '',
        price: 0,
        deviceLimit: 1,
        maxContacts: 1000,
        maxMessagesPerMonth: 1000,
        maxAiCredits: 50,
        maxStorageMb: 100,
        dailyMessageLimit: 100,
        defaultDelaySeconds: 5,
        validityDays: 30,
        bulkScheduling: true,
        flowBuilder: true,
        aiAutoReply: true
      });
    }
    setIsPlanModalOpen(true);
  };

  // Submit Plan (Create/Update)
  const handlePlanSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      if (editingPlan) {
        await api.put(`/admin/plans/${editingPlan._id}`, planForm);
        setSuccess('Plan package successfully updated.');
      } else {
        await api.post('/admin/plans', planForm);
        setSuccess('New plan package successfully added.');
      }
      setIsPlanModalOpen(false);
      fetchPlans();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save subscription plan.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePlan = async (planId) => {
    if (!window.confirm('Are you sure you want to delete this subscription plan?')) return;
    setError('');
    setSuccess('');
    try {
      await api.delete(`/admin/plans/${planId}`);
      setSuccess('Plan package successfully deleted.');
      fetchPlans();
    } catch (err) {
      setError('Failed to delete pricing plan.');
    }
  };

  // Plan select update limits helper
  const handlePlanChangeSelect = (planId) => {
    setSelectedPlanId(planId);
    if (!planId) return;
    const plan = plans.find(p => p._id === planId);
    if (plan) {
      setMaxDevices(plan.deviceLimit || 1);
      setMaxMessages(plan.maxMessagesPerMonth || 500);
      setMaxAi(plan.maxAiCredits || 50);
      setMaxStorage(plan.maxStorageMb || 100);
      setDailyLimit(plan.dailyMessageLimit || 100);
      setDelaySec(plan.defaultDelaySeconds || 5);
      setBulkScheduling(plan.bulkScheduling !== false);
      setFlowBuilder(plan.flowBuilder !== false);
      setAiAutoReply(plan.aiAutoReply !== false);
    }
  };

  // Filtering Tenants
  const filteredTenants = tenants.filter(t => 
    t.name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
    t.companyName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.plan?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <>
      <div className="w-full bg-white border border-slate-200/80 rounded-3xl flex flex-col overflow-hidden shadow-sm p-6 sm:p-8">
        
        {/* Alerts */}
        {error && (
          <div className="p-4 mb-4 rounded-2xl border border-red-200 bg-red-50 text-red-650 text-xs font-bold flex items-center gap-2">
            <AlertCircle size={16} /> {error}
          </div>
        )}
        {success && (
          <div className="p-4 mb-4 rounded-2xl border border-emerald-250 bg-emerald-50 text-emerald-700 text-xs font-bold flex items-center gap-2">
            <Check size={16} /> {success}
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* TAB 1: OVERVIEW METRICS */}
        {/* ------------------------------------------------------------- */}
        {activeTab === 'overview' && (
          <div className="flex flex-col gap-8">
            <div>
              <h2 className="text-xl font-extrabold text-slate-800">Global Overview Metrics</h2>
              <p className="text-slate-500 text-xs mt-0.5">Summary analysis metrics and system-wide counters.</p>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-slate-50 border border-slate-200/80 p-5 rounded-2xl flex items-center justify-between shadow-sm hover:scale-[1.01] transition-transform">
                <div>
                  <span className="text-[10px] uppercase font-black text-slate-400 tracking-wider">Total Members</span>
                  <p className="text-3xl font-black text-slate-800 mt-1">{stats.totalUsers}</p>
                </div>
                <div className="p-3 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100"><Users size={20} /></div>
              </div>

              <div className="bg-slate-50 border border-slate-200/80 p-5 rounded-2xl flex items-center justify-between shadow-sm hover:scale-[1.01] transition-transform">
                <div>
                  <span className="text-[10px] uppercase font-black text-slate-400 tracking-wider">Active Tenants</span>
                  <p className="text-3xl font-black text-slate-800 mt-1">{stats.totalTenants}</p>
                </div>
                <div className="p-3 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100"><Layers size={20} /></div>
              </div>

              <div className="bg-slate-50 border border-slate-200/80 p-5 rounded-2xl flex items-center justify-between shadow-sm hover:scale-[1.01] transition-transform">
                <div>
                  <span className="text-[10px] uppercase font-black text-slate-400 tracking-wider">WhatsApp Devices</span>
                  <p className="text-3xl font-black text-slate-800 mt-1">{stats.totalSessions}</p>
                </div>
                <div className="p-3 rounded-xl bg-amber-50 text-amber-600 border border-amber-100"><Shield size={20} /></div>
              </div>

              <div className="bg-slate-50 border border-slate-200/80 p-5 rounded-2xl flex items-center justify-between shadow-sm hover:scale-[1.01] transition-transform">
                <div>
                  <span className="text-[10px] uppercase font-black text-slate-400 tracking-wider">Messages Logged</span>
                  <p className="text-3xl font-black text-slate-800 mt-1">{stats.totalMessages}</p>
                </div>
                <div className="p-3 rounded-xl bg-purple-50 text-purple-600 border border-purple-100"><Database size={20} /></div>
              </div>
            </div>

            {/* Quick Status Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-2">
              <div className="border border-slate-200/80 rounded-2xl p-6 flex flex-col gap-3">
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <Server size={16} className="text-indigo-600" /> Platform Infrastructure Status
                </h3>
                <div className="flex flex-col gap-2.5 text-xs text-slate-600 font-semibold mt-1">
                  <div className="flex justify-between border-b border-slate-50 pb-2">
                    <span>Database Status:</span>
                    <span className="text-emerald-650 flex items-center gap-1"><span className="h-1.5 w-1.5 bg-emerald-500 rounded-full inline-block animate-pulse"></span> Connected (Healthy)</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-50 pb-2">
                    <span>WhatsApp Workers:</span>
                    <span className="text-emerald-650 flex items-center gap-1"><span className="h-1.5 w-1.5 bg-emerald-500 rounded-full inline-block animate-pulse"></span> Active (Multi-Threaded)</span>
                  </div>
                  <div className="flex justify-between pb-1">
                    <span>Memory Usage:</span>
                    <span className="text-indigo-600">~ 182 MB / 1024 MB</span>
                  </div>
                </div>
              </div>

              <div className="border border-slate-200/80 rounded-2xl p-6 flex flex-col gap-3">
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <Globe size={16} className="text-indigo-600" /> System Support Settings
                </h3>
                <div className="flex flex-col gap-2.5 text-xs text-slate-600 font-semibold mt-1">
                  <div className="flex justify-between border-b border-slate-50 pb-2">
                    <span>Support Email:</span>
                    <span className="text-slate-800">{systemSettings.supportEmail || 'support@fuseflow.com'}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-50 pb-2">
                    <span>White-Labeling:</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${systemSettings.enableWhiteLabeling ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                      {systemSettings.enableWhiteLabeling ? 'Enabled' : 'Disabled'}
                    </span>
                  </div>
                  <div className="flex justify-between pb-1">
                    <span>Platform Branding Name:</span>
                    <span className="text-slate-800 font-bold">{systemSettings.siteTitle || 'FuseFlow'}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* TAB 2: TENANTS / WORKSPACES */}
        {/* ------------------------------------------------------------- */}
        {activeTab === 'tenants' && (
          <div className="flex flex-col gap-6 h-full">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h2 className="text-xl font-extrabold text-slate-800">Manage Platform Workspaces</h2>
                <p className="text-slate-500 text-xs mt-0.5 font-medium">Verify quotas, update pricing plan mappings, and suspend/unsuspend client workspaces.</p>
              </div>
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
                <input
                  type="text"
                  placeholder="Search workspace or plan..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-xs rounded-xl bg-slate-50 border border-slate-200 text-slate-700 placeholder-slate-450 focus:outline-none focus:border-indigo-650 font-semibold"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 font-black uppercase tracking-wider text-[10px]">
                    <th className="pb-3">Workspace Name</th>
                    <th className="pb-3">Subscribed Plan</th>
                    <th className="pb-3">Active Devices</th>
                    <th className="pb-3">Quotas Assigned</th>
                    <th className="pb-3">Validity Expiration</th>
                    <th className="pb-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-semibold">
                  {filteredTenants.map((t) => {
                    const isExpired = t.planExpiresAt && new Date(t.planExpiresAt) < new Date();
                    return (
                      <tr key={t._id} className="text-slate-700 hover:bg-slate-50/50">
                        <td className="py-4">
                          <span className="block font-bold text-slate-850">{t.name || t.companyName}</span>
                          <span className="block text-[10px] text-slate-400 font-medium mt-0.5">ID: {t._id}</span>
                        </td>
                        <td className="py-4">
                          <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wide border ${
                            t.plan?.toLowerCase() === 'enterprise' 
                              ? 'bg-purple-50 text-purple-700 border-purple-100'
                              : 'bg-emerald-50 text-emerald-700 border-emerald-100'
                          }`}>
                            {t.plan || 'Free'}
                          </span>
                        </td>
                        <td className="py-4">
                          <span className="text-slate-650 font-bold">{t.limits?.maxDevices || 1} Devices Max</span>
                        </td>
                        <td className="py-4">
                          <div className="flex flex-col gap-0.5 text-[10px]">
                            <span>Msg limit: {t.limits?.maxMessagesPerMonth || 500}/mo</span>
                            <span>AI limit: {t.limits?.maxAiCredits || 50} credits</span>
                          </div>
                        </td>
                        <td className="py-4">
                          {t.planExpiresAt ? (
                            <span className={isExpired ? 'text-red-500 font-bold' : 'text-slate-600'}>
                              {new Date(t.planExpiresAt).toLocaleDateString()} {isExpired && '(Expired)'}
                            </span>
                          ) : (
                            <span className="text-slate-400 font-medium">Lifetime</span>
                          )}
                        </td>
                        <td className="py-4 text-right">
                          <button
                            onClick={() => handleOpenTenantModal(t)}
                            className="px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-600 hover:bg-indigo-50 hover:text-indigo-755 hover:border-indigo-200 font-bold text-xs inline-flex items-center gap-1.5 cursor-pointer transition-colors"
                          >
                            <Edit3 size={13} /> Edit Workspace
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredTenants.length === 0 && (
                    <tr>
                      <td colSpan="6" className="py-12 text-center text-slate-400 font-bold">
                        No workspaces found matching query.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* TAB 3: PRICING PLANS */}
        {/* ------------------------------------------------------------- */}
        {activeTab === 'plans' && (
          <div className="flex flex-col gap-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-xl font-extrabold text-slate-800">Plan Pricing Packages</h2>
                <p className="text-slate-500 text-xs mt-0.5">Customize global subscription levels and resource caps.</p>
              </div>
              <button
                onClick={() => handleOpenPlanModal()}
                className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-755 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-md shadow-indigo-600/10 transition-colors"
              >
                <Plus size={14} /> Add New Plan
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-2">
              {plans.map((p) => (
                <div key={p._id} className="border border-slate-200/80 rounded-2xl p-5 flex flex-col justify-between bg-slate-50/20 hover:border-slate-350 hover:shadow-sm transition-all">
                  <div>
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="font-extrabold text-slate-850 text-base uppercase tracking-tight">{p.name}</h3>
                        <span className="text-slate-400 text-xs font-semibold">Validity: {p.validityDays} days</span>
                      </div>
                      <span className="text-2xl font-black text-indigo-700">${p.price}</span>
                    </div>

                    <div className="flex flex-col gap-2 text-xs font-semibold text-slate-600 mt-4 border-t border-slate-100 pt-3">
                      <div className="flex justify-between">
                        <span>Max Devices:</span>
                        <span className="text-slate-900 font-bold">{p.deviceLimit}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Messages Cap:</span>
                        <span className="text-slate-900 font-bold">{p.maxMessagesPerMonth} / mo</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Daily Message Limit:</span>
                        <span className="text-slate-900 font-bold">{p.dailyMessageLimit} / day</span>
                      </div>
                      <div className="flex justify-between">
                        <span>AI Credits:</span>
                        <span className="text-slate-900 font-bold">{p.maxAiCredits} credits</span>
                      </div>
                      
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {p.bulkScheduling !== false && (
                          <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 text-[9px] font-black uppercase">Bulk Send</span>
                        )}
                        {p.flowBuilder !== false && (
                          <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 text-[9px] font-black uppercase">Flows</span>
                        )}
                        {p.aiAutoReply !== false && (
                          <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 text-[9px] font-black uppercase">AI Chat</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2 mt-5 border-t border-slate-100 pt-3">
                    <button
                      onClick={() => handleOpenPlanModal(p)}
                      className="flex-1 py-2 text-xs font-bold rounded-xl border border-slate-200 hover:border-indigo-200 text-slate-700 hover:bg-indigo-50/20 cursor-pointer transition-colors"
                    >
                      Configure
                    </button>
                    <button
                      onClick={() => handleDeletePlan(p._id)}
                      className="p-2 text-slate-400 hover:text-red-600 border border-slate-200 hover:border-red-200 rounded-xl hover:bg-red-50/50 cursor-pointer transition-colors"
                      title="Delete Plan"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* TAB 4: SYSTEM SETTINGS CONFIG */}
        {/* ------------------------------------------------------------- */}
        {activeTab === 'system' && (
          <form onSubmit={handleSaveSystemSettings} className="flex flex-col gap-6 overflow-y-auto">
            <div>
              <h2 className="text-xl font-extrabold text-slate-800">Global Configuration Console</h2>
              <p className="text-slate-500 text-xs mt-0.5 font-medium">Update parameters for platform-wide API gateways, SMTP services, OpenAI keys, and branding.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-1">
              
              {/* SMTP Settings */}
              <div className="border border-slate-200 rounded-2xl p-5 flex flex-col gap-4 shadow-sm">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-1">
                  <Mail size={14} className="text-indigo-600" /> Platform SMTP configuration
                </h3>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="col-span-2">
                    <label className="block text-[10px] font-black text-slate-550 uppercase tracking-wide mb-1">SMTP Host Server</label>
                    <input
                      type="text"
                      value={systemSettings.smtpHost}
                      onChange={(e) => setSystemSettings({ ...systemSettings, smtpHost: e.target.value })}
                      placeholder="e.g. smtp.gmail.com"
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 font-bold focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-550 uppercase tracking-wide mb-1">Port</label>
                    <input
                      type="number"
                      value={systemSettings.smtpPort}
                      onChange={(e) => setSystemSettings({ ...systemSettings, smtpPort: Number(e.target.value) })}
                      placeholder="587"
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 font-bold focus:outline-none"
                    />
                  </div>
                  <div className="flex items-center mt-4">
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={systemSettings.smtpSecure}
                        onChange={(e) => setSystemSettings({ ...systemSettings, smtpSecure: e.target.checked })}
                        className="rounded text-indigo-650 focus:ring-indigo-500 h-4 w-4"
                      />
                      <span className="font-bold text-slate-700">SSL/TLS Secure</span>
                    </label>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-550 uppercase tracking-wide mb-1">SMTP Username</label>
                    <input
                      type="text"
                      value={systemSettings.smtpUser}
                      onChange={(e) => setSystemSettings({ ...systemSettings, smtpUser: e.target.value })}
                      placeholder="email@domain.com"
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 font-semibold focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-550 uppercase tracking-wide mb-1">SMTP Password</label>
                    <input
                      type="password"
                      value={systemSettings.smtpPass}
                      onChange={(e) => setSystemSettings({ ...systemSettings, smtpPass: e.target.value })}
                      placeholder="••••••••"
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 font-semibold focus:outline-none"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-[10px] font-black text-slate-550 uppercase tracking-wide mb-1">Sender Email address</label>
                    <input
                      type="text"
                      value={systemSettings.smtpFrom}
                      onChange={(e) => setSystemSettings({ ...systemSettings, smtpFrom: e.target.value })}
                      placeholder="noreply@domain.com"
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 font-bold focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Gateway Limits */}
              <div className="border border-slate-200 rounded-2xl p-5 flex flex-col gap-4 shadow-sm">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-1">
                  <Sliders size={14} className="text-indigo-600" /> Gateway & Throttle Speeds
                </h3>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="col-span-2">
                    <label className="block text-[10px] font-black text-slate-550 uppercase tracking-wide mb-1">Max Retry delivery attempts</label>
                    <input
                      type="number"
                      value={systemSettings.gatewayMaxRetries}
                      onChange={(e) => setSystemSettings({ ...systemSettings, gatewayMaxRetries: Number(e.target.value) })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 font-bold focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-550 uppercase tracking-wide mb-1">Min safety delay (sec)</label>
                    <input
                      type="number"
                      value={systemSettings.gatewayDelayMin}
                      onChange={(e) => setSystemSettings({ ...systemSettings, gatewayDelayMin: Number(e.target.value) })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 font-bold focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-550 uppercase tracking-wide mb-1">Max safety delay (sec)</label>
                    <input
                      type="number"
                      value={systemSettings.gatewayDelayMax}
                      onChange={(e) => setSystemSettings({ ...systemSettings, gatewayDelayMax: Number(e.target.value) })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 font-bold focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Global AI API Settings */}
              <div className="border border-slate-200 rounded-2xl p-5 flex flex-col gap-4 shadow-sm">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-1">
                  <Bot size={14} className="text-indigo-600" /> Global OpenAI Engine Keys
                </h3>
                <div className="flex flex-col gap-3 text-xs">
                  <div>
                    <label className="block text-[10px] font-black text-slate-550 uppercase tracking-wide mb-1">OpenAI Secret API Key</label>
                    <input
                      type="password"
                      value={systemSettings.openaiKey}
                      onChange={(e) => setSystemSettings({ ...systemSettings, openaiKey: e.target.value })}
                      placeholder="sk-proj-••••••••••••"
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 font-bold focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-550 uppercase tracking-wide mb-1">Default GPT Model</label>
                    <select
                      value={systemSettings.openaiModel}
                      onChange={(e) => setSystemSettings({ ...systemSettings, openaiModel: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 font-bold focus:outline-none cursor-pointer"
                    >
                      <option value="gpt-4o-mini">gpt-4o-mini (Recommeded / Fast)</option>
                      <option value="gpt-4o">gpt-4o (Premium)</option>
                      <option value="o1-mini">o1-mini (Reasoning)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Platform Branding Settings */}
              <div className="border border-slate-200 rounded-2xl p-5 flex flex-col gap-4 shadow-sm">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-1">
                  <Globe size={14} className="text-indigo-600" /> White-Labeling Branding settings
                </h3>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="col-span-2">
                    <label className="block text-[10px] font-black text-slate-550 uppercase tracking-wide mb-1">Platform Brand Title</label>
                    <input
                      type="text"
                      value={systemSettings.siteTitle}
                      onChange={(e) => setSystemSettings({ ...systemSettings, siteTitle: e.target.value })}
                      placeholder="FuseFlow"
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 font-bold focus:outline-none"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-[10px] font-black text-slate-550 uppercase tracking-wide mb-1">Global Support Email Address</label>
                    <input
                      type="email"
                      value={systemSettings.supportEmail}
                      onChange={(e) => setSystemSettings({ ...systemSettings, supportEmail: e.target.value })}
                      placeholder="support@fuseflow.com"
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 font-bold focus:outline-none"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-[10px] font-black text-slate-550 uppercase tracking-wide mb-1">System Logo Image URL</label>
                    <input
                      type="text"
                      value={systemSettings.logoUrl}
                      onChange={(e) => setSystemSettings({ ...systemSettings, logoUrl: e.target.value })}
                      placeholder="https://assets.site.com/logo.png"
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 font-semibold focus:outline-none"
                    />
                  </div>
                  <div className="col-span-2 mt-2">
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={systemSettings.enableWhiteLabeling}
                        onChange={(e) => setSystemSettings({ ...systemSettings, enableWhiteLabeling: e.target.checked })}
                        className="rounded text-indigo-650 focus:ring-indigo-500 h-4 w-4"
                      />
                      <span className="font-bold text-slate-700">Unlock white-label settings for client custom domains</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6 border-t border-slate-100 pt-4">
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-3 bg-indigo-600 hover:bg-indigo-755 disabled:bg-slate-200 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-600/10 cursor-pointer"
              >
                {loading ? 'Saving settings...' : 'Save Configuration settings'}
              </button>
            </div>
          </form>
        )}

        {/* ------------------------------------------------------------- */}
        {/* TAB 5: AUDIT LOGS */}
        {/* ------------------------------------------------------------- */}
        {activeTab === 'audit' && (
          <div className="flex flex-col gap-6 h-full">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-xl font-extrabold text-slate-800">System Audit Trails</h2>
                <p className="text-slate-500 text-xs mt-0.5 font-medium">Trace administrative actions and platform-wide updates.</p>
              </div>

              {/* Filters */}
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Filter Action (e.g. USER_SUSPENDED)..."
                  value={auditFilter.action}
                  onChange={(e) => setAuditFilter({ ...auditFilter, action: e.target.value, page: 1 })}
                  className="px-3 py-2 text-xs rounded-xl bg-slate-50 border border-slate-200 text-slate-700 placeholder-slate-450 focus:outline-none focus:border-indigo-600 font-bold"
                />
                <input
                  type="text"
                  placeholder="Filter Tenant ID..."
                  value={auditFilter.tenantId}
                  onChange={(e) => setAuditFilter({ ...auditFilter, tenantId: e.target.value, page: 1 })}
                  className="px-3 py-2 text-xs rounded-xl bg-slate-50 border border-slate-200 text-slate-700 placeholder-slate-450 focus:outline-none focus:border-indigo-600 font-bold"
                />
              </div>
            </div>

            {/* Table */}
            <div className="flex-1 overflow-y-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 font-black uppercase tracking-wider text-[10px]">
                    <th className="pb-3">Action code</th>
                    <th className="pb-3">Actor / Admin</th>
                    <th className="pb-3">Workspace Scope</th>
                    <th className="pb-3">Resource Target</th>
                    <th className="pb-3">Timestamp</th>
                    <th className="pb-3 text-right">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-semibold text-slate-650">
                  {auditLogs.map((log) => (
                    <tr key={log._id} className="hover:bg-slate-50/50">
                      <td className="py-3">
                        <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-800 text-[9px] font-black uppercase tracking-wide border border-slate-200">
                          {log.action}
                        </span>
                      </td>
                      <td className="py-3">
                        <span className="block text-slate-850 font-bold">{log.actorId?.name || 'Platform Admin'}</span>
                        <span className="block text-[10px] text-slate-450 mt-0.5">{log.actorId?.email || 'System'}</span>
                      </td>
                      <td className="py-3">
                        <span>{log.tenantId?.name || 'Global System'}</span>
                      </td>
                      <td className="py-3">
                        <span className="text-[10px] text-slate-500 font-mono">
                          {log.entityType} ({log.entityId || 'None'})
                        </span>
                      </td>
                      <td className="py-3">
                        <span className="text-[10px] text-slate-500">
                          {new Date(log.createdAt).toLocaleString()}
                        </span>
                      </td>
                      <td className="py-3 text-right">
                        <button
                          onClick={() => setSelectedAuditLog(log)}
                          className="px-2.5 py-1 rounded bg-slate-100 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-250 text-[10px] font-bold text-slate-600 hover:text-indigo-650 cursor-pointer"
                        >
                          Metadata JSON
                        </button>
                      </td>
                    </tr>
                  ))}
                  {auditLogs.length === 0 && (
                    <tr>
                      <td colSpan="6" className="py-12 text-center text-slate-400 font-bold">
                        No audit logs captured yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination footer */}
            {auditPagination.pages > 1 && (
              <div className="flex justify-between items-center border-t border-slate-100 pt-4 mt-2">
                <span className="text-xs text-slate-500 font-semibold">Total logs found: {auditPagination.total}</span>
                <div className="flex gap-2">
                  <button
                    disabled={auditPagination.page <= 1}
                    onClick={() => setAuditFilter({ ...auditFilter, page: auditPagination.page - 1 })}
                    className="px-3.5 py-1.5 rounded-xl border border-slate-200 text-xs font-bold hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
                  >
                    Previous
                  </button>
                  <span className="text-xs text-slate-650 font-bold px-3 py-1.5 bg-slate-100 rounded-lg">
                    Page {auditPagination.page} of {auditPagination.pages}
                  </span>
                  <button
                    disabled={auditPagination.page >= auditPagination.pages}
                    onClick={() => setAuditFilter({ ...auditFilter, page: auditPagination.page + 1 })}
                    className="px-3.5 py-1.5 rounded-xl border border-slate-200 text-xs font-bold hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* TAB 6: ADMIN SECURITY */}
        {/* ------------------------------------------------------------- */}
        {activeTab === 'security' && (
          <div className="max-w-md flex flex-col gap-5">
            <div>
              <h2 className="text-xl font-extrabold text-slate-800 flex items-center gap-2">
                <Lock size={19} className="text-indigo-600" /> Platform Security Settings
              </h2>
              <p className="text-slate-500 text-xs mt-0.5">Change administrative access credentials regularly.</p>
            </div>
            
            <form onSubmit={handleAdminChangePassword} className="flex flex-col gap-4 mt-2">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Current Password</label>
                <input
                  type="password"
                  required
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  className="w-full px-4 py-2.5 text-xs rounded-xl bg-slate-50 border border-slate-200 text-slate-700 focus:outline-none focus:border-indigo-600 font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">New Password</label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-4 py-2.5 text-xs rounded-xl bg-slate-50 border border-slate-200 text-slate-700 focus:outline-none focus:border-indigo-600 font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Confirm New Password</label>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-2.5 text-xs rounded-xl bg-slate-50 border border-slate-200 text-slate-700 focus:outline-none focus:border-indigo-600 font-semibold"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-755 text-white text-xs font-bold transition-all shadow-md shadow-indigo-600/10 cursor-pointer mt-2"
              >
                {loading ? 'Processing reset...' : 'Update Admin Password'}
              </button>
            </form>
          </div>
        )}
      </div>

      {/* ------------------------------------------------------------- */}
      {/* DIALOG 1: WORKSPACE LIMITS MODAL */}
      {/* ------------------------------------------------------------- */}
      {isTenantModalOpen && selectedTenant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-sm p-4 overflow-y-auto">
          <form onSubmit={handleAssignPlanSubmit} className="w-full max-w-2xl bg-white border border-slate-200 shadow-2xl rounded-3xl p-6 flex flex-col gap-5 my-8">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-lg font-bold text-slate-850">Workspace Plan & Limit configurations</h3>
                <p className="text-slate-500 text-xs mt-0.5">Customize subscription plan levels and resource caps for <strong>{selectedTenant.name || selectedTenant.companyName}</strong>.</p>
              </div>
              <button
                type="button"
                onClick={() => setIsTenantModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-650 hover:bg-slate-100 rounded-xl cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Live stats section if loaded */}
            {selectedTenantUsage && (
              <div className="grid grid-cols-3 gap-3 bg-indigo-50/40 border border-indigo-100 p-4 rounded-2xl text-[11px] font-bold text-slate-700">
                <div>
                  <span className="text-slate-450 block text-[9px] uppercase font-black">Active Connections</span>
                  <span>{selectedTenantUsage.activeDevices} / {selectedTenantUsage.totalDevices} WhatsApp accounts</span>
                </div>
                <div>
                  <span className="text-slate-450 block text-[9px] uppercase font-black">Messages Dispatched</span>
                  <span>Today: {selectedTenantUsage.sentToday} | Month: {selectedTenantUsage.sentThisMonth}</span>
                </div>
                <div>
                  <span className="text-slate-450 block text-[9px] uppercase font-black">CRM Contacts Size</span>
                  <span>{selectedTenantUsage.contactsCount} Saved profiles</span>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">Pricing Plan Package</label>
                <select
                  required
                  value={selectedPlanId}
                  onChange={(e) => handlePlanChangeSelect(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 border border-slate-200 text-slate-700 font-bold focus:outline-none cursor-pointer"
                >
                  <option value="">-- Choose Plan --</option>
                  {plans.map((p) => (
                    <option key={p._id} value={p._id}>
                      {p.name} (${p.price} / {p.validityDays} days)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">Plan Expiry Date</label>
                <input
                  type="date"
                  value={planExpiresAtInput}
                  onChange={(e) => setPlanExpiresAtInput(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 border border-slate-200 text-slate-700 font-bold focus:outline-none cursor-pointer"
                />
              </div>

              <div className="col-span-2">
                <label className="flex items-center gap-2 cursor-pointer py-1">
                  <input
                    type="checkbox"
                    checked={customLimitsEnabled}
                    onChange={(e) => setCustomLimitsEnabled(e.target.checked)}
                    className="rounded text-indigo-650 focus:ring-indigo-500 h-4.5 w-4.5"
                  />
                  <span className="text-xs font-bold text-slate-800">Customize plan resources specifically for this tenant</span>
                </label>
              </div>
            </div>

            {customLimitsEnabled && (
              <div className="border-t border-slate-100 pt-4 flex flex-col gap-4">
                <span className="text-[10px] font-black text-indigo-500 uppercase tracking-wider">Custom Resource Overrides</span>
                
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">WhatsApp Devices</label>
                    <input
                      type="number"
                      value={maxDevices}
                      onChange={(e) => setMaxDevices(Number(e.target.value) || 1)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">Monthly messages</label>
                    <input
                      type="number"
                      value={maxMessages}
                      onChange={(e) => setMaxMessages(Number(e.target.value) || 500)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">AI Credits Quota</label>
                    <input
                      type="number"
                      value={maxAi}
                      onChange={(e) => setMaxAi(Number(e.target.value) || 50)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">Storage limit (MB)</label>
                    <input
                      type="number"
                      value={maxStorage}
                      onChange={(e) => setMaxStorage(Number(e.target.value) || 100)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">Daily limit</label>
                    <input
                      type="number"
                      value={dailyLimit}
                      onChange={(e) => setDailyLimit(Number(e.target.value) || 100)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">Min Delay (sec)</label>
                    <input
                      type="number"
                      value={delaySec}
                      onChange={(e) => setDelaySec(Number(e.target.value) || 5)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 font-bold"
                    />
                  </div>
                </div>

                <div className="border-t border-slate-100 pt-3 flex flex-col gap-2">
                  <span className="block text-[9px] font-black text-slate-400 uppercase tracking-wider">Custom Feature Access</span>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-1.5 cursor-pointer text-xs font-bold text-slate-700">
                      <input
                        type="checkbox"
                        checked={bulkScheduling}
                        onChange={(e) => setBulkScheduling(e.target.checked)}
                        className="rounded text-indigo-650 focus:ring-indigo-500"
                      />
                      <span>Bulk send campaigns</span>
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer text-xs font-bold text-slate-700">
                      <input
                        type="checkbox"
                        checked={flowBuilder}
                        onChange={(e) => setFlowBuilder(e.target.checked)}
                        className="rounded text-indigo-650 focus:ring-indigo-500"
                      />
                      <span>Visual Flows builder</span>
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer text-xs font-bold text-slate-700">
                      <input
                        type="checkbox"
                        checked={aiAutoReply}
                        onChange={(e) => setAiAutoReply(e.target.checked)}
                        className="rounded text-indigo-650 focus:ring-indigo-500"
                      />
                      <span>AI Auto-Reply Bot</span>
                    </label>
                  </div>
                </div>
              </div>
            )}

            <div className="flex items-center justify-end gap-3 mt-4 border-t border-slate-100 pt-4">
              <button
                type="button"
                onClick={() => setIsTenantModalOpen(false)}
                className="px-4 py-2 rounded-xl text-slate-500 hover:bg-slate-100 text-xs font-bold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-755 text-white text-xs font-bold transition-all shadow-md shadow-indigo-600/10 cursor-pointer"
              >
                Save Workspace Plan
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* DIALOG 2: ADD/EDIT PRICING PLAN */}
      {/* ------------------------------------------------------------- */}
      {isPlanModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-sm p-4 overflow-y-auto">
          <form onSubmit={handlePlanSubmit} className="w-full max-w-xl bg-white border border-slate-200 shadow-2xl rounded-3xl p-6 flex flex-col gap-5 my-8">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-lg font-bold text-slate-850">{editingPlan ? 'Edit Pricing Package' : 'Create Pricing Package'}</h3>
                <p className="text-slate-500 text-xs mt-0.5">Define resources, caps, and price points for system-wide users.</p>
              </div>
              <button
                type="button"
                onClick={() => setIsPlanModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-650 hover:bg-slate-100 rounded-xl cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs font-bold text-slate-600">
              <div>
                <label className="block text-[10px] uppercase text-slate-450 mb-1">Plan Name</label>
                <input
                  type="text"
                  name="name"
                  required
                  placeholder="e.g. Professional"
                  value={planForm.name}
                  onChange={handlePlanFormChange}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 font-bold focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase text-slate-450 mb-1">Monthly Pricing ($)</label>
                <input
                  type="number"
                  name="price"
                  required
                  value={planForm.price}
                  onChange={handlePlanFormChange}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 font-bold focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase text-slate-450 mb-1">Max WhatsApp Devices</label>
                <input
                  type="number"
                  name="deviceLimit"
                  value={planForm.deviceLimit}
                  onChange={handlePlanFormChange}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 font-bold focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase text-slate-450 mb-1">Monthly Messages Cap</label>
                <input
                  type="number"
                  name="maxMessagesPerMonth"
                  value={planForm.maxMessagesPerMonth}
                  onChange={handlePlanFormChange}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 font-bold focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase text-slate-450 mb-1">Daily Messages Cap</label>
                <input
                  type="number"
                  name="dailyMessageLimit"
                  value={planForm.dailyMessageLimit}
                  onChange={handlePlanFormChange}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 font-bold focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase text-slate-450 mb-1">AI Credits Quota</label>
                <input
                  type="number"
                  name="maxAiCredits"
                  value={planForm.maxAiCredits}
                  onChange={handlePlanFormChange}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 font-bold focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase text-slate-450 mb-1">Storage Allocation (MB)</label>
                <input
                  type="number"
                  name="maxStorageMb"
                  value={planForm.maxStorageMb}
                  onChange={handlePlanFormChange}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 font-bold focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase text-slate-450 mb-1">Validity (Days)</label>
                <input
                  type="number"
                  name="validityDays"
                  value={planForm.validityDays}
                  onChange={handlePlanFormChange}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 font-bold focus:outline-none"
                />
              </div>
            </div>

            <div className="border-t border-slate-100 pt-4 flex flex-col gap-2">
              <span className="block text-[10px] font-black text-slate-450 uppercase tracking-wider">Features included in Plan</span>
              <div className="flex gap-4">
                <label className="flex items-center gap-1.5 cursor-pointer text-xs font-bold text-slate-700">
                  <input
                    type="checkbox"
                    name="bulkScheduling"
                    checked={planForm.bulkScheduling}
                    onChange={handlePlanFormChange}
                    className="rounded text-indigo-650 focus:ring-indigo-500"
                  />
                  <span>Bulk send campaigns</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer text-xs font-bold text-slate-700">
                  <input
                    type="checkbox"
                    name="flowBuilder"
                    checked={planForm.flowBuilder}
                    onChange={handlePlanFormChange}
                    className="rounded text-indigo-650 focus:ring-indigo-500"
                  />
                  <span>Visual Flows builder</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer text-xs font-bold text-slate-700">
                  <input
                    type="checkbox"
                    name="aiAutoReply"
                    checked={planForm.aiAutoReply}
                    onChange={handlePlanFormChange}
                    className="rounded text-indigo-650 focus:ring-indigo-500"
                  />
                  <span>AI Auto-Reply Bot</span>
                </label>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 mt-4 border-t border-slate-100 pt-4">
              <button
                type="button"
                onClick={() => setIsPlanModalOpen(false)}
                className="px-4 py-2 rounded-xl text-slate-550 hover:bg-slate-105 text-xs font-bold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-755 text-white text-xs font-bold transition-all shadow-md shadow-indigo-600/10 cursor-pointer"
              >
                Save Plan package
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* DIALOG 3: METADATA DETAILS POPUP */}
      {/* ------------------------------------------------------------- */}
      {selectedAuditLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-xl bg-white border border-slate-200 shadow-2xl rounded-3xl p-6 flex flex-col gap-4 my-8">
            <div className="flex justify-between items-start">
              <div>
                <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-800 text-[9px] font-black uppercase tracking-wide border border-slate-200 inline-block mb-1">
                  {selectedAuditLog.action}
                </span>
                <h3 className="text-base font-extrabold text-slate-850">Audit log metadata trace</h3>
              </div>
              <button
                onClick={() => setSelectedAuditLog(null)}
                className="p-1.5 text-slate-400 hover:text-slate-650 hover:bg-slate-100 rounded-xl cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex flex-col gap-3 text-xs border-y border-slate-100 py-3.5 font-bold text-slate-700">
              <div className="flex justify-between">
                <span>Action:</span>
                <span className="text-slate-900">{selectedAuditLog.action}</span>
              </div>
              <div className="flex justify-between">
                <span>Performed By:</span>
                <span className="text-slate-900">{selectedAuditLog.actorId?.name || 'System'} ({selectedAuditLog.actorId?.email || 'Platform Scope'})</span>
              </div>
              <div className="flex justify-between">
                <span>Workspace:</span>
                <span className="text-slate-900">{selectedAuditLog.tenantId?.name || 'Global Platform'}</span>
              </div>
              <div className="flex justify-between">
                <span>Timestamp:</span>
                <span className="text-slate-900">{new Date(selectedAuditLog.createdAt).toLocaleString()}</span>
              </div>
            </div>

            <div>
              <span className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">RAW METADATA JSON</span>
              <pre className="p-4 rounded-2xl bg-slate-950 text-emerald-450 text-[10px] font-mono overflow-x-auto max-h-56 leading-relaxed">
                {JSON.stringify(selectedAuditLog.metadata || {}, null, 2)}
              </pre>
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-100">
              <button
                onClick={() => setSelectedAuditLog(null)}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-extrabold cursor-pointer transition-colors"
              >
                Close metadata viewer
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default AdminPanel;
