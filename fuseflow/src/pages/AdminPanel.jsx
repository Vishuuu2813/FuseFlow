import React, { useEffect, useState } from 'react';
import api from '../services/api';
import {
  Users,
  Shield,
  Layers,
  Database,
  Trash2,
  Lock,
  Plus,
  Settings
} from 'lucide-react';

const AdminPanel = () => {
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalTenants: 0,
    totalSessions: 0,
    totalMessages: 0
  });

  const [activeTab, setActiveTab] = useState('stats'); // 'stats', 'plans'
  const [plans, setPlans] = useState([]);
  
  // Plan creation modal states
  const [showCreatePlanModal, setShowCreatePlanModal] = useState(false);
  const [planName, setPlanName] = useState('');
  const [planPrice, setPlanPrice] = useState(0);
  const [planDeviceLimit, setPlanDeviceLimit] = useState(1);
  const [planMaxContacts, setPlanMaxContacts] = useState(1000);
  const [planMaxMessages, setPlanMaxMessages] = useState(500);
  const [planMaxAi, setPlanMaxAi] = useState(50);
  const [planMaxStorage, setPlanMaxStorage] = useState(100);

  // Admin Self password change state
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchAdminData = async () => {
    try {
      const statsRes = await api.get('/admin/stats');
      setStats(statsRes.data);

      const plansRes = await api.get('/admin/plans');
      setPlans(plansRes.data);
    } catch (err) {
      setError('Access Denied or failed to load administrative records.');
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, []);

  const handleCreatePlanSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      const { data } = await api.post('/admin/plans', {
        name: planName,
        price: planPrice,
        deviceLimit: planDeviceLimit,
        maxContacts: planMaxContacts,
        maxMessagesPerMonth: planMaxMessages,
        maxAiCredits: planMaxAi,
        maxStorageMb: planMaxStorage
      });

      setPlans((prev) => [data, ...prev]);
      setPlanName('');
      setPlanPrice(0);
      setPlanDeviceLimit(1);
      setPlanMaxContacts(1000);
      setPlanMaxMessages(500);
      setPlanMaxAi(50);
      setPlanMaxStorage(100);
      setShowCreatePlanModal(false);
      setSuccess('Pricing plan created successfully.');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create plan.');
    }
  };

  const handleDeletePlan = async (planId) => {
    if (!window.confirm('Are you sure you want to delete this pricing plan?')) return;
    try {
      await api.delete(`/admin/plans/${planId}`);
      setPlans((prev) => prev.filter((p) => p._id !== planId));
      setSuccess('Plan deleted successfully.');
    } catch (err) {
      setError('Failed to delete plan.');
    }
  };

  const handleAdminChangePassword = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setError('New passwords do not match.');
      return;
    }

    try {
      await api.put('/admin/change-password', { oldPassword, newPassword });
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setSuccess('Your password has been changed successfully.');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to change admin password.');
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-800">Admin Control Center</h1>
          <p className="text-slate-500 text-sm mt-1">Configure security credentials and dynamic platform pricing tiers.</p>
        </div>
        <div className="flex items-center gap-2">
          {activeTab === 'plans' && (
            <button
              onClick={() => setShowCreatePlanModal(true)}
              className="px-4.5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold flex items-center gap-2 cursor-pointer shadow-md shadow-emerald-600/10 transition-all hover:scale-[1.01]"
            >
              <Plus size={15} /> Create Plan
            </button>
          )}
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

      {/* Tabs Menu */}
      <div className="flex gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab('stats')}
          className={`px-4.5 py-2.5 text-sm font-bold rounded-lg transition-all ${
            activeTab === 'stats' ? 'bg-slate-200 text-slate-800' : 'text-slate-500 hover:text-slate-705'
          }`}
        >
          Security & Overview
        </button>
        <button
          onClick={() => setActiveTab('plans')}
          className={`px-4.5 py-2.5 text-sm font-bold rounded-lg transition-all ${
            activeTab === 'plans' ? 'bg-slate-200 text-slate-800' : 'text-slate-500 hover:text-slate-705'
          }`}
        >
          Pricing Packages
        </button>
      </div>

      {/* Tab: Overview & Security */}
      {activeTab === 'stats' && (
        <div className="flex flex-col gap-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white border border-slate-200 p-6 rounded-2xl flex items-center justify-between shadow-sm">
              <div>
                <span className="text-[11px] uppercase font-bold text-slate-400 tracking-wider">Total Users</span>
                <p className="text-2xl font-extrabold text-slate-800 mt-1">{stats.totalUsers}</p>
              </div>
              <div className="p-3 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100"><Users size={20} /></div>
            </div>

            <div className="bg-white border border-slate-200 p-6 rounded-2xl flex items-center justify-between shadow-sm">
              <div>
                <span className="text-[11px] uppercase font-bold text-slate-400 tracking-wider">Total Tenants</span>
                <p className="text-2xl font-extrabold text-slate-800 mt-1">{stats.totalTenants}</p>
              </div>
              <div className="p-3 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100"><Layers size={20} /></div>
            </div>

            <div className="bg-white border border-slate-200 p-6 rounded-2xl flex items-center justify-between shadow-sm">
              <div>
                <span className="text-[11px] uppercase font-bold text-slate-400 tracking-wider">WhatsApp Devices</span>
                <p className="text-2xl font-extrabold text-slate-800 mt-1">{stats.totalSessions}</p>
              </div>
              <div className="p-3 rounded-xl bg-amber-50 text-amber-600 border border-amber-100"><Shield size={20} /></div>
            </div>

            <div className="bg-white border border-slate-200 p-6 rounded-2xl flex items-center justify-between shadow-sm">
              <div>
                <span className="text-[11px] uppercase font-bold text-slate-400 tracking-wider">Messages Logged</span>
                <p className="text-2xl font-extrabold text-slate-800 mt-1">{stats.totalMessages}</p>
              </div>
              <div className="p-3 rounded-xl bg-purple-50 text-purple-600 border border-purple-100"><Database size={20} /></div>
            </div>
          </div>

          <div className="max-w-md bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col gap-4">
            <h2 className="text-base font-bold text-slate-850 flex items-center gap-2">
              <Lock size={16} className="text-amber-500" /> Security Settings
            </h2>
            <p className="text-slate-500 text-sm leading-relaxed">Update your administrator password here regularly.</p>
            
            <form onSubmit={handleAdminChangePassword} className="flex flex-col gap-3.5 mt-2">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Current Password</label>
                <input
                  type="password"
                  required
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-xl bg-slate-50 border border-slate-200 text-slate-700 focus:outline-none focus:border-emerald-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">New Password</label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-xl bg-slate-50 border border-slate-200 text-slate-700 focus:outline-none focus:border-emerald-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Confirm New Password</label>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-xl bg-slate-50 border border-slate-200 text-slate-700 focus:outline-none focus:border-emerald-600"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold cursor-pointer transition-colors mt-2"
              >
                Change Admin Password
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Tab: Plans */}
      {activeTab === 'plans' && (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col gap-4">
          <h2 className="text-base font-bold text-slate-800">Subscription Plans Catalog</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {plans.map((p) => (
              <div key={p._id} className="p-5 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col justify-between gap-4">
                <div>
                  <h4 className="font-extrabold text-slate-800 text-base">{p.name}</h4>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className="text-xl font-extrabold text-emerald-700">${p.price}</span>
                    <span className="text-xs text-slate-400 font-medium">/ month</span>
                  </div>
                  
                  <div className="mt-4 flex flex-col gap-1.5 text-xs text-slate-500 font-semibold">
                    <div className="flex justify-between border-b border-slate-100 pb-1.5">
                      <span>WhatsApp Devices Limit:</span>
                      <span className="text-slate-800">{p.deviceLimit}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-100 pb-1.5">
                      <span>Monthly Messages limit:</span>
                      <span className="text-slate-800">{p.maxMessagesPerMonth}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-100 pb-1.5">
                      <span>AI Credits Limit:</span>
                      <span className="text-slate-800">{p.maxAiCredits}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Storage Allocation:</span>
                      <span className="text-slate-800">{p.maxStorageMb} MB</span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => handleDeletePlan(p._id)}
                  className="w-full py-2.5 rounded-xl bg-red-50 hover:bg-red-100 border border-red-200 text-red-650 font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-colors"
                >
                  <Trash2 size={14} /> Delete Plan
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CREATE PLAN MODAL */}
      {showCreatePlanModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-sm p-4">
          <form onSubmit={handleCreatePlanSubmit} className="w-full max-w-md bg-white border border-slate-200 shadow-2xl rounded-3xl p-6 flex flex-col gap-5">
            <div>
              <h3 className="text-lg font-bold text-slate-850">Create Subscription Plan</h3>
              <p className="text-slate-500 text-sm mt-1">Configure pricing tier features and monthly system limits.</p>
            </div>

            <div className="grid grid-cols-2 gap-3.5">
              <div className="col-span-2">
                <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Plan Name</label>
                <input
                  type="text"
                  required
                  placeholder="Enterprise Plan"
                  value={planName}
                  onChange={(e) => setPlanName(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-xl bg-slate-50 border border-slate-200 text-slate-700 focus:outline-none focus:border-emerald-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Price (USD)</label>
                <input
                  type="number"
                  required
                  value={planPrice}
                  onChange={(e) => setPlanPrice(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 text-sm rounded-xl bg-slate-50 border border-slate-200 text-slate-700 focus:outline-none focus:border-emerald-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">WhatsApp Devices</label>
                <input
                  type="number"
                  required
                  value={planDeviceLimit}
                  onChange={(e) => setPlanDeviceLimit(parseInt(e.target.value) || 1)}
                  className="w-full px-3 py-2 text-sm rounded-xl bg-slate-50 border border-slate-200 text-slate-700 focus:outline-none focus:border-emerald-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Max Contacts</label>
                <input
                  type="number"
                  required
                  value={planMaxContacts}
                  onChange={(e) => setPlanMaxContacts(parseInt(e.target.value) || 1000)}
                  className="w-full px-3 py-2 text-sm rounded-xl bg-slate-50 border border-slate-200 text-slate-700 focus:outline-none focus:border-emerald-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Messages / Month</label>
                <input
                  type="number"
                  required
                  value={planMaxMessages}
                  onChange={(e) => setPlanMaxMessages(parseInt(e.target.value) || 500)}
                  className="w-full px-3 py-2 text-sm rounded-xl bg-slate-50 border border-slate-200 text-slate-700 focus:outline-none focus:border-emerald-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">AI Credits / Month</label>
                <input
                  type="number"
                  required
                  value={planMaxAi}
                  onChange={(e) => setPlanMaxAi(parseInt(e.target.value) || 50)}
                  className="w-full px-3 py-2 text-sm rounded-xl bg-slate-50 border border-slate-200 text-slate-700 focus:outline-none focus:border-emerald-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Storage Allocation (MB)</label>
                <input
                  type="number"
                  required
                  value={planMaxStorage}
                  onChange={(e) => setPlanMaxStorage(parseInt(e.target.value) || 100)}
                  className="w-full px-3 py-2 text-sm rounded-xl bg-slate-50 border border-slate-200 text-slate-700 focus:outline-none focus:border-emerald-600"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 mt-2">
              <button
                type="button"
                onClick={() => setShowCreatePlanModal(false)}
                className="px-4 py-2 rounded-xl text-slate-500 hover:bg-slate-100 text-sm font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold cursor-pointer transition-colors"
              >
                Save Plan
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;
