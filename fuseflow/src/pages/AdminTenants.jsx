import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { Layers, Settings, Search, Edit3, UserCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const AdminTenants = () => {
  const { impersonate } = useAuth();
  const [tenants, setTenants] = useState([]);
  const [plans, setPlans] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [assigningTenant, setAssigningTenant] = useState(null);
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [customLimitsEnabled, setCustomLimitsEnabled] = useState(false);
  const [maxDevices, setMaxDevices] = useState(1);
  const [maxMessages, setMaxMessages] = useState(500);
  const [maxAi, setMaxAi] = useState(50);
  const [maxStorage, setMaxStorage] = useState(100);
  const [dailyLimit, setDailyLimit] = useState(100);
  const [delaySec, setDelaySec] = useState(5);
  const [bulkScheduling, setBulkScheduling] = useState(true);
  const [flowBuilder, setFlowBuilder] = useState(true);
  const [aiAutoReply, setAiAutoReply] = useState(true);

  const fetchTenantsData = async () => {
    try {
      const tenantsRes = await api.get('/admin/tenants');
      setTenants(tenantsRes.data);

      const plansRes = await api.get('/admin/plans');
      setPlans(plansRes.data);
    } catch (err) {
      setError('Failed to load workspaces.');
    }
  };

  useEffect(() => {
    fetchTenantsData();
  }, []);

  const handlePlanChange = (planId) => {
    setSelectedPlanId(planId);
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

  const handleAssignPlanSubmit = async (e) => {
    e.preventDefault();
    if (!selectedPlanId || !assigningTenant) return;
    try {
      const payload = { planId: selectedPlanId };
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

      const { data } = await api.put(`/admin/tenants/${assigningTenant._id}/plan`, payload);
      setTenants((prev) => prev.map((t) => (t._id === assigningTenant._id ? data : t)));
      setAssigningTenant(null);
      setCustomLimitsEnabled(false);
      setSuccess('Plan updated and limits successfully synced.');
    } catch (err) {
      setError('Failed to update workspace plan.');
    }
  };

  const handleImpersonate = async (tenantId) => {
    if (!window.confirm('Are you sure you want to impersonate this workspace? You will be logged in as their administrator.')) return;
    try {
      setError('');
      setSuccess('');
      const { data } = await api.post(`/admin/tenants/${tenantId}/impersonate`);
      await impersonate(data.accessToken, data.user);
      window.location.href = '/dashboard';
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to impersonate tenant.');
    }
  };

  const filteredTenants = tenants.filter(
    (t) =>
      t.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.companyName?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-800">Active Workspaces (Tenants)</h1>
          <p className="text-slate-500 text-sm mt-1">Audit active client accounts, inspect quota allocations, and configure plans.</p>
        </div>
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

      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col gap-6">
        <div className="flex justify-between items-center">
          <h2 className="text-base font-bold text-slate-800">Tenant Directory</h2>
          <div className="relative w-72">
            <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
            <input
              type="text"
              placeholder="Search company or workspace..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm rounded-xl bg-slate-50 border border-slate-200 text-slate-700 placeholder-slate-400 focus:outline-none focus:border-emerald-600"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400 font-bold text-xs uppercase tracking-wider">
                <th className="pb-3">Workspace Name</th>
                <th className="pb-3">Subscribed Plan</th>
                <th className="pb-3">Device Quota</th>
                <th className="pb-3">Message Quota</th>
                <th className="pb-3">AI Credits</th>
                <th className="pb-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredTenants.map((t) => (
                <tr key={t._id} className="text-slate-700 hover:bg-slate-50/50">
                  <td className="py-4 font-bold text-slate-850">{t.name || t.companyName}</td>
                  <td className="py-4">
                    <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 uppercase tracking-wide border border-emerald-100">
                      {t.plan || 'Free'}
                    </span>
                  </td>
                  <td className="py-4 font-semibold text-slate-600">{t.limits?.maxDevices || 1} Device(s)</td>
                  <td className="py-4 font-semibold text-slate-600">{t.limits?.maxMessagesPerMonth || 500} / mo</td>
                  <td className="py-4 font-semibold text-slate-600">{t.limits?.maxAiCredits || 50} Credits</td>
                  <td className="py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => handleImpersonate(t._id)}
                        className="px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-105 hover:text-indigo-800 font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-colors"
                      >
                        <UserCheck size={13} /> Impersonate
                      </button>
                      <button
                        onClick={() => {
                          setAssigningTenant(t);
                          setSelectedPlanId('');
                          setCustomLimitsEnabled(false);
                        }}
                        className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 border border-slate-200 hover:border-emerald-250 font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-colors"
                      >
                        <Settings size={13} /> Change Plan
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* PLAN ASSIGNMENT DIALOG */}
      {assigningTenant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-sm p-4 overflow-y-auto">
          <form onSubmit={handleAssignPlanSubmit} className="w-full max-w-lg bg-white border border-slate-200 shadow-2xl rounded-3xl p-6 flex flex-col gap-5 my-8">
            <div>
              <h3 className="text-lg font-bold text-slate-850">Assign Subscription Package</h3>
              <p className="text-slate-550 text-sm mt-1">Select pricing tier to apply to {assigningTenant.name}.</p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">Select Plan</label>
              <select
                required
                value={selectedPlanId}
                onChange={(e) => handlePlanChange(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 text-sm focus:outline-none focus:border-emerald-600 font-semibold cursor-pointer"
              >
                <option value="">-- Select custom plan --</option>
                {plans.map((p) => (
                  <option key={p._id} value={p._id}>
                    {p.name} (${p.price}/mo)
                  </option>
                ))}
              </select>
            </div>

            {selectedPlanId && (
              <div className="flex flex-col gap-3">
                <label className="flex items-center gap-2 cursor-pointer py-1">
                  <input
                    type="checkbox"
                    checked={customLimitsEnabled}
                    onChange={(e) => setCustomLimitsEnabled(e.target.checked)}
                    className="rounded text-emerald-600 focus:ring-emerald-500 h-4.5 w-4.5"
                  />
                  <span className="text-xs font-bold text-slate-700">Customize plan features & limits for this tenant</span>
                </label>

                {customLimitsEnabled && (
                  <div className="border-t border-slate-100 pt-4 flex flex-col gap-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">Devices Limit</label>
                        <input
                          type="number"
                          value={maxDevices}
                          onChange={(e) => setMaxDevices(parseInt(e.target.value) || 1)}
                          className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 border border-slate-200 font-semibold"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">Monthly Messages</label>
                        <input
                          type="number"
                          value={maxMessages}
                          onChange={(e) => setMaxMessages(parseInt(e.target.value) || 500)}
                          className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 border border-slate-200 font-semibold"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">AI Credits Quota</label>
                        <input
                          type="number"
                          value={maxAi}
                          onChange={(e) => setMaxAi(parseInt(e.target.value) || 50)}
                          className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 border border-slate-200 font-semibold"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">Storage (MB)</label>
                        <input
                          type="number"
                          value={maxStorage}
                          onChange={(e) => setMaxStorage(parseInt(e.target.value) || 100)}
                          className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 border border-slate-200 font-semibold"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">Daily Messages Limit</label>
                        <input
                          type="number"
                          value={dailyLimit}
                          onChange={(e) => setDailyLimit(parseInt(e.target.value) || 100)}
                          className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 border border-slate-200 font-semibold"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">Default Delay (Sec)</label>
                        <input
                          type="number"
                          value={delaySec}
                          onChange={(e) => setDelaySec(parseInt(e.target.value) || 5)}
                          className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 border border-slate-200 font-semibold"
                        />
                      </div>
                    </div>

                    <div className="border-t border-slate-100 pt-3">
                      <span className="block text-[10px] font-bold text-slate-500 mb-2 uppercase">Custom Feature Access</span>
                      <div className="grid grid-cols-3 gap-2">
                        <label className="flex items-center gap-1.5 cursor-pointer p-2 bg-slate-50 rounded-lg border border-slate-200 text-[10px] font-bold text-slate-650 hover:bg-slate-100">
                          <input
                            type="checkbox"
                            checked={bulkScheduling}
                            onChange={(e) => setBulkScheduling(e.target.checked)}
                            className="rounded text-emerald-600 focus:ring-emerald-500"
                          />
                          <span>Bulk Send</span>
                        </label>
                        <label className="flex items-center gap-1.5 cursor-pointer p-2 bg-slate-50 rounded-lg border border-slate-200 text-[10px] font-bold text-slate-650 hover:bg-slate-100">
                          <input
                            type="checkbox"
                            checked={flowBuilder}
                            onChange={(e) => setFlowBuilder(e.target.checked)}
                            className="rounded text-emerald-600 focus:ring-emerald-500"
                          />
                          <span>Flows</span>
                        </label>
                        <label className="flex items-center gap-1.5 cursor-pointer p-2 bg-slate-50 rounded-lg border border-slate-200 text-[10px] font-bold text-slate-650 hover:bg-slate-100">
                          <input
                            type="checkbox"
                            checked={aiAutoReply}
                            onChange={(e) => setAiAutoReply(e.target.checked)}
                            className="rounded text-emerald-600 focus:ring-emerald-500"
                          />
                          <span>AI Chat</span>
                        </label>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="flex items-center justify-end gap-3 mt-2 border-t border-slate-100 pt-4">
              <button
                type="button"
                onClick={() => setAssigningTenant(null)}
                className="px-4 py-2 rounded-xl text-slate-550 hover:bg-slate-100 text-sm font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold cursor-pointer transition-colors shadow-md shadow-emerald-600/10"
              >
                Assign Plan
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default AdminTenants;
