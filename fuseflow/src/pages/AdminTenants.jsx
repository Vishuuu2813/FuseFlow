import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { Layers, Settings, Search, Edit3 } from 'lucide-react';

const AdminTenants = () => {
  const [tenants, setTenants] = useState([]);
  const [plans, setPlans] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [assigningTenant, setAssigningTenant] = useState(null);
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

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

  const handleAssignPlanSubmit = async (e) => {
    e.preventDefault();
    if (!selectedPlanId || !assigningTenant) return;
    try {
      const { data } = await api.put(`/admin/tenants/${assigningTenant._id}/plan`, { planId: selectedPlanId });
      setTenants((prev) => prev.map((t) => (t._id === assigningTenant._id ? data : t)));
      setAssigningTenant(null);
      setSuccess('Plan updated and limits successfully synced.');
    } catch (err) {
      setError('Failed to update workspace plan.');
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
        <div className="p-3.5 rounded-xl border border-red-200 bg-red-50 text-red-600 text-sm font-semibold">
          {error}
        </div>
      )}

      {success && (
        <div className="p-3.5 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-700 text-sm font-semibold">
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
                    <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-55 text-emerald-700 uppercase tracking-wide border border-emerald-100">
                      {t.plan || 'Free'}
                    </span>
                  </td>
                  <td className="py-4 font-semibold text-slate-600">{t.limits?.maxDevices || 1} Device(s)</td>
                  <td className="py-4 font-semibold text-slate-600">{t.limits?.maxMessagesPerMonth || 500} / mo</td>
                  <td className="py-4 font-semibold text-slate-600">{t.limits?.maxAiCredits || 50} Credits</td>
                  <td className="py-4 text-right">
                    <button
                      onClick={() => {
                        setAssigningTenant(t);
                        setSelectedPlanId('');
                      }}
                      className="px-3.5 py-1.5 rounded-lg bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 border border-slate-200 hover:border-emerald-250 font-bold text-xs flex items-center gap-1.5 ml-auto cursor-pointer transition-colors"
                    >
                      <Settings size={13} /> Change Plan
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* PLAN ASSIGNMENT DIALOG */}
      {assigningTenant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-sm p-4">
          <form onSubmit={handleAssignPlanSubmit} className="w-full max-w-md bg-white border border-slate-200 shadow-2xl rounded-3xl p-6 flex flex-col gap-5">
            <div>
              <h3 className="text-lg font-bold text-slate-850">Assign Subscription Package</h3>
              <p className="text-slate-550 text-sm mt-1">Select pricing tier to apply to {assigningTenant.name}.</p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">Select Plan</label>
              <select
                required
                value={selectedPlanId}
                onChange={(e) => setSelectedPlanId(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 text-sm focus:outline-none focus:border-emerald-600"
              >
                <option value="">-- Select custom plan --</option>
                {plans.map((p) => (
                  <option key={p._id} value={p._id}>
                    {p.name} (${p.price}/mo)
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center justify-end gap-3 mt-2">
              <button
                type="button"
                onClick={() => setAssigningTenant(null)}
                className="px-4 py-2 rounded-xl text-slate-500 hover:bg-slate-100 text-sm font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold cursor-pointer transition-colors"
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
