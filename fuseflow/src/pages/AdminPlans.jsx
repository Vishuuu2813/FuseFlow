import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { Plus, Trash2, Tag, Database, Cpu, Smartphone, Coins } from 'lucide-react';

const AdminPlans = () => {
  const [plans, setPlans] = useState([]);
  const [showCreatePlanModal, setShowCreatePlanModal] = useState(false);
  
  // Plan creation fields
  const [planName, setPlanName] = useState('');
  const [planPrice, setPlanPrice] = useState(0);
  const [planDeviceLimit, setPlanDeviceLimit] = useState(1);
  const [planMaxContacts, setPlanMaxContacts] = useState(1000);
  const [planMaxMessages, setPlanMaxMessages] = useState(500);
  const [planMaxAi, setPlanMaxAi] = useState(50);
  const [planMaxStorage, setPlanMaxStorage] = useState(100);

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchPlans = async () => {
    try {
      const { data } = await api.get('/admin/plans');
      setPlans(data);
    } catch (err) {
      setError('Failed to retrieve system subscription plans.');
    }
  };

  useEffect(() => {
    fetchPlans();
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
      
      // Reset form
      setPlanName('');
      setPlanPrice(0);
      setPlanDeviceLimit(1);
      setPlanMaxContacts(1000);
      setPlanMaxMessages(500);
      setPlanMaxAi(50);
      setPlanMaxStorage(100);
      
      setShowCreatePlanModal(false);
      setSuccess('Subscription pricing plan created successfully.');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create subscription plan.');
    }
  };

  const handleDeletePlan = async (planId) => {
    if (!window.confirm('Are you sure you want to permanently delete this pricing plan?')) return;
    setError('');
    setSuccess('');
    try {
      await api.delete(`/admin/plans/${planId}`);
      setPlans((prev) => prev.filter((p) => p._id !== planId));
      setSuccess('Plan deleted successfully.');
    } catch (err) {
      setError('Failed to delete pricing plan.');
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-800">Subscription Pricing Plans</h1>
          <p className="text-slate-500 text-sm mt-1">Configure pricing plans, message rates, AI credit allotments, and WhatsApp device limits.</p>
        </div>
        <button
          onClick={() => setShowCreatePlanModal(true)}
          className="px-4.5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold flex items-center gap-2 cursor-pointer transition-colors shadow-md shadow-emerald-600/10"
        >
          <Plus size={16} /> Create Pricing Plan
        </button>
      </div>

      {error && (
        <div className="p-3.5 rounded-xl border border-red-200 bg-red-50 text-red-605 text-sm font-semibold">
          {error}
        </div>
      )}

      {success && (
        <div className="p-3.5 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-700 text-sm font-semibold">
          {success}
        </div>
      )}

      {/* Plans Catalog Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {plans.map((p) => (
          <div key={p._id} className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col justify-between gap-5 transition-all hover:shadow-md">
            <div>
              <div className="flex items-center justify-between">
                <h4 className="font-extrabold text-slate-800 text-lg flex items-center gap-2">
                  <Tag size={16} className="text-emerald-600 animate-pulse" />
                  {p.name}
                </h4>
              </div>
              <div className="flex items-baseline gap-1 mt-2.5">
                <span className="text-2xl font-extrabold text-emerald-700">${p.price}</span>
                <span className="text-xs text-slate-400 font-semibold">/ month</span>
              </div>
              
              <div className="mt-5 flex flex-col gap-2.5 text-sm text-slate-600 font-medium">
                <div className="flex justify-between border-b border-slate-100 pb-2">
                  <span className="flex items-center gap-2 text-slate-500"><Smartphone size={14} /> WhatsApp Devices:</span>
                  <span className="text-slate-850 font-bold">{p.deviceLimit} Devices</span>
                </div>
                <div className="flex justify-between border-b border-slate-100 pb-2">
                  <span className="flex items-center gap-2 text-slate-500"><Tag size={14} /> Max Contacts:</span>
                  <span className="text-slate-850 font-bold">{p.maxContacts} Contacts</span>
                </div>
                <div className="flex justify-between border-b border-slate-100 pb-2">
                  <span className="flex items-center gap-2 text-slate-500"><Coins size={14} /> Monthly Messages:</span>
                  <span className="text-slate-850 font-bold">{p.maxMessagesPerMonth} msgs</span>
                </div>
                <div className="flex justify-between border-b border-slate-100 pb-2">
                  <span className="flex items-center gap-2 text-slate-500"><Cpu size={14} /> AI Credits quota:</span>
                  <span className="text-slate-850 font-bold">{p.maxAiCredits} Credits</span>
                </div>
                <div className="flex justify-between">
                  <span className="flex items-center gap-2 text-slate-500"><Database size={14} /> Storage capacity:</span>
                  <span className="text-slate-850 font-bold">{p.maxStorageMb} MB</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => handleDeletePlan(p._id)}
              className="w-full py-2.5 rounded-xl bg-red-50 hover:bg-red-100 border border-red-200 text-red-600 font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-colors"
            >
              <Trash2 size={14} /> Remove Pricing Plan
            </button>
          </div>
        ))}
      </div>

      {/* CREATE PLAN DIALOG MODAL */}
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
                Create Plan
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default AdminPlans;
