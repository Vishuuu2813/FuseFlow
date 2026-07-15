import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { Plus, Trash2, Tag, Database, Cpu, Smartphone, Coins, ChevronLeft, Edit3, Clock, Calendar } from 'lucide-react';

const AdminPlans = () => {
  const [plans, setPlans] = useState([]);
  const [showCreatePlanModal, setShowCreatePlanModal] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);
  
  // Plan creation fields
  const [planName, setPlanName] = useState('');
  const [planPrice, setPlanPrice] = useState(0);
  const [planDeviceLimit, setPlanDeviceLimit] = useState(1);
  const [planMaxContacts, setPlanMaxContacts] = useState(1000);
  const [planMaxMessages, setPlanMaxMessages] = useState(500);
  const [planMaxAi, setPlanMaxAi] = useState(50);
  const [planMaxStorage, setPlanMaxStorage] = useState(100);
  const [planDailyMessageLimit, setPlanDailyMessageLimit] = useState(100);
  const [planDefaultDelay, setPlanDefaultDelay] = useState(5);
  const [planValidityDays, setPlanValidityDays] = useState(30);
  const [planBulkScheduling, setPlanBulkScheduling] = useState(true);
  const [planFlowBuilder, setPlanFlowBuilder] = useState(true);
  const [planAiAutoReply, setPlanAiAutoReply] = useState(true);

  // Plan editing fields
  const [editName, setEditName] = useState('');
  const [editPrice, setEditPrice] = useState(0);
  const [editDeviceLimit, setEditDeviceLimit] = useState(1);
  const [editMaxContacts, setEditMaxContacts] = useState(1000);
  const [editMaxMessages, setEditMaxMessages] = useState(500);
  const [editMaxAi, setEditMaxAi] = useState(50);
  const [editMaxStorage, setEditMaxStorage] = useState(100);
  const [editDailyMessageLimit, setEditDailyMessageLimit] = useState(100);
  const [editDefaultDelay, setEditDefaultDelay] = useState(5);
  const [editValidityDays, setEditValidityDays] = useState(30);
  const [editBulkScheduling, setEditBulkScheduling] = useState(true);
  const [editFlowBuilder, setEditFlowBuilder] = useState(true);
  const [editAiAutoReply, setEditAiAutoReply] = useState(true);

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchPlans = async () => {
    try {
      const { data } = await api.get('/admin/plans');
      
      // Ensure the default trial plan always exists in the UI
      const hasTrial = data.some(p => p.name.toLowerCase() === 'trial');
      
      if (!hasTrial) {
        const defaultTrial = {
          _id: 'virtual-trial-id',
          name: 'trial',
          price: 0,
          deviceLimit: 1,
          maxContacts: 1000,
          maxMessagesPerMonth: 500,
          maxAiCredits: 50,
          maxStorageMb: 100,
          dailyMessageLimit: 100,
          defaultDelaySeconds: 5,
          validityDays: 14,
          isVirtual: true
        };
        setPlans([defaultTrial, ...data]);
      } else {
        setPlans(data);
      }
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
        maxStorageMb: planMaxStorage,
        dailyMessageLimit: planDailyMessageLimit,
        defaultDelaySeconds: planDefaultDelay,
        validityDays: planValidityDays,
        bulkScheduling: planBulkScheduling,
        flowBuilder: planFlowBuilder,
        aiAutoReply: planAiAutoReply
      });

      setPlans((prev) => {
        // Remove virtual trial if it is at the front, let fetchPlans handle clean sort
        const cleanList = prev.filter(p => p._id !== 'virtual-trial-id');
        return [data, ...cleanList];
      });
      
      // Reset form
      setPlanName('');
      setPlanPrice(0);
      setPlanDeviceLimit(1);
      setPlanMaxContacts(1000);
      setPlanMaxMessages(500);
      setPlanMaxAi(50);
      setPlanMaxStorage(100);
      setPlanDailyMessageLimit(100);
      setPlanDefaultDelay(5);
      setPlanValidityDays(30);
      setPlanBulkScheduling(true);
      setPlanFlowBuilder(true);
      setPlanAiAutoReply(true);
      
      setShowCreatePlanModal(false);
      setSuccess('Subscription pricing plan created successfully.');
      fetchPlans();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create subscription plan.');
    }
  };

  const handleEditPlanSubmit = async (e) => {
    e.preventDefault();
    if (!editingPlan) return;
    setError('');
    setSuccess('');

    try {
      // If it is the virtual trial plan and hasn't been saved in DB yet, create it.
      if (editingPlan.isVirtual) {
        await api.post('/admin/plans', {
          name: 'trial',
          price: 0,
          deviceLimit: editDeviceLimit,
          maxContacts: editMaxContacts,
          maxMessagesPerMonth: editMaxMessages,
          maxAiCredits: editMaxAi,
          maxStorageMb: editMaxStorage,
          dailyMessageLimit: editDailyMessageLimit,
          defaultDelaySeconds: editDefaultDelay,
          validityDays: editValidityDays,
          bulkScheduling: editBulkScheduling,
          flowBuilder: editFlowBuilder,
          aiAutoReply: editAiAutoReply
        });
      } else {
        // Edit existing plan
        await api.put(`/admin/plans/${editingPlan._id}`, {
          name: editName,
          price: editPrice,
          deviceLimit: editDeviceLimit,
          maxContacts: editMaxContacts,
          maxMessagesPerMonth: editMaxMessages,
          maxAiCredits: editMaxAi,
          maxStorageMb: editMaxStorage,
          dailyMessageLimit: editDailyMessageLimit,
          defaultDelaySeconds: editDefaultDelay,
          validityDays: editValidityDays,
          bulkScheduling: editBulkScheduling,
          flowBuilder: editFlowBuilder,
          aiAutoReply: editAiAutoReply
        });
      }

      setSuccess('Plan limits and specifications updated successfully.');
      setEditingPlan(null);
      fetchPlans();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update subscription limits.');
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
      fetchPlans();
    } catch (err) {
      setError('Failed to delete pricing plan.');
    }
  };

  const startEditing = (plan) => {
    setEditingPlan(plan);
    setEditName(plan.name);
    setEditPrice(plan.price);
    setEditDeviceLimit(plan.deviceLimit);
    setEditMaxContacts(plan.maxContacts);
    setEditMaxMessages(plan.maxMessagesPerMonth);
    setEditMaxAi(plan.maxAiCredits);
    setEditMaxStorage(plan.maxStorageMb);
    setEditDailyMessageLimit(plan.dailyMessageLimit || 100);
    setEditDefaultDelay(plan.defaultDelaySeconds || 5);
    setEditValidityDays(plan.validityDays || 30);
    setEditBulkScheduling(plan.bulkScheduling !== false);
    setEditFlowBuilder(plan.flowBuilder !== false);
    setEditAiAutoReply(plan.aiAutoReply !== false);
  };

  // FULL PAGE PLAN CREATION VIEW
  if (showCreatePlanModal) {
    return (
      <div className="flex flex-col gap-6 max-w-4xl">
        <div>
          <button
            onClick={() => setShowCreatePlanModal(false)}
            className="flex items-center gap-2 text-slate-500 hover:text-indigo-650 font-bold text-sm cursor-pointer transition-colors"
          >
            <ChevronLeft size={16} /> Back to Pricing Plans
          </button>
        </div>

        <div>
          <h1 className="text-2xl font-extrabold text-slate-800">Create Pricing Plan</h1>
          <p className="text-slate-500 text-sm mt-1">Configure pricing tier features, limits, and resource allocations for custom subscription accounts.</p>
        </div>

        {error && (
          <div className="p-3.5 rounded-xl border border-red-200 bg-red-50 text-red-655 text-sm font-semibold">
            {error}
          </div>
        )}

        <div className="bg-white border border-slate-200 shadow-sm rounded-3xl p-8">
          <form onSubmit={handleCreatePlanSubmit} className="flex flex-col gap-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">Plan Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Pro Developer Plan"
                  value={planName}
                  onChange={(e) => setPlanName(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-805 focus:outline-none focus:border-indigo-600 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">Price (USD / month)</label>
                <input
                  type="number"
                  required
                  value={planPrice}
                  onChange={(e) => setPlanPrice(parseFloat(e.target.value) || 0)}
                  className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 focus:outline-none focus:border-indigo-600 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">WhatsApp Devices Limit</label>
                <input
                  type="number"
                  required
                  value={planDeviceLimit}
                  onChange={(e) => setPlanDeviceLimit(parseInt(e.target.value) || 1)}
                  className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-805 focus:outline-none focus:border-indigo-600 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">Maximum CRM Contacts</label>
                <input
                  type="number"
                  required
                  value={planMaxContacts}
                  onChange={(e) => setPlanMaxContacts(parseInt(e.target.value) || 1000)}
                  className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-805 focus:outline-none focus:border-indigo-600 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">Monthly Messages Limit</label>
                <input
                  type="number"
                  required
                  value={planMaxMessages}
                  onChange={(e) => setPlanMaxMessages(parseInt(e.target.value) || 500)}
                  className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-805 focus:outline-none focus:border-indigo-600 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">AI Credits Quota</label>
                <input
                  type="number"
                  required
                  value={planMaxAi}
                  onChange={(e) => setPlanMaxAi(parseInt(e.target.value) || 50)}
                  className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-805 focus:outline-none focus:border-indigo-600 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">Storage Capacity Allocation (MB)</label>
                <input
                  type="number"
                  required
                  value={planMaxStorage}
                  onChange={(e) => setPlanMaxStorage(parseInt(e.target.value) || 100)}
                  className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-850 focus:outline-none focus:border-indigo-600 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">Daily Messages Limit</label>
                <input
                  type="number"
                  required
                  value={planDailyMessageLimit}
                  onChange={(e) => setPlanDailyMessageLimit(parseInt(e.target.value) || 100)}
                  className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-850 focus:outline-none focus:border-indigo-600 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">Default Message Delay (Seconds)</label>
                <input
                  type="number"
                  required
                  value={planDefaultDelay}
                  onChange={(e) => setPlanDefaultDelay(parseInt(e.target.value) || 5)}
                  className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-850 focus:outline-none focus:border-indigo-600 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">Subscription Duration (Days)</label>
                <input
                  type="number"
                  required
                  value={planValidityDays}
                  onChange={(e) => setPlanValidityDays(parseInt(e.target.value) || 30)}
                  className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-850 focus:outline-none focus:border-indigo-600 text-sm"
                />
              </div>
            </div>

            {/* Feature Access Controls */}
            <div className="border-t border-slate-100 pt-5">
              <label className="block text-xs font-bold text-slate-550 mb-3 uppercase tracking-wider">Feature Access Settings</label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <label className="flex items-center gap-3 p-3.5 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer hover:border-indigo-200 transition-colors">
                  <input
                    type="checkbox"
                    checked={planBulkScheduling}
                    onChange={(e) => setPlanBulkScheduling(e.target.checked)}
                    className="rounded text-indigo-650 focus:ring-indigo-500 h-4.5 w-4.5"
                  />
                  <div>
                    <span className="text-xs font-bold text-slate-755 block">Bulk Broadcast</span>
                    <span className="text-[10px] text-slate-400 font-medium">Scheduled marketing campaigns</span>
                  </div>
                </label>
                <label className="flex items-center gap-3 p-3.5 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer hover:border-indigo-200 transition-colors">
                  <input
                    type="checkbox"
                    checked={planFlowBuilder}
                    onChange={(e) => setPlanFlowBuilder(e.target.checked)}
                    className="rounded text-indigo-655 focus:ring-indigo-500 h-4.5 w-4.5"
                  />
                  <div>
                    <span className="text-xs font-bold text-slate-755 block">Flow Builder</span>
                    <span className="text-[10px] text-slate-400 font-medium">Automated sequential paths</span>
                  </div>
                </label>
                <label className="flex items-center gap-3 p-3.5 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer hover:border-indigo-200 transition-colors">
                  <input
                    type="checkbox"
                    checked={planAiAutoReply}
                    onChange={(e) => setPlanAiAutoReply(e.target.checked)}
                    className="rounded text-indigo-655 focus:ring-indigo-500 h-4.5 w-4.5"
                  />
                  <div>
                    <span className="text-xs font-bold text-slate-755 block">AI Auto Reply</span>
                    <span className="text-[10px] text-slate-400 font-medium">Auto-replies & AI Chat bot</span>
                  </div>
                </label>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-6 mt-2">
              <button
                type="button"
                onClick={() => setShowCreatePlanModal(false)}
                className="px-5 py-3 rounded-xl text-slate-500 hover:bg-slate-100 text-sm font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold cursor-pointer transition-colors shadow-md shadow-indigo-600/10"
              >
                Save & Create Plan
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // FULL PAGE PLAN EDITING VIEW
  if (editingPlan) {
    return (
      <div className="flex flex-col gap-6 max-w-4xl">
        <div>
          <button
            onClick={() => setEditingPlan(null)}
            className="flex items-center gap-2 text-slate-500 hover:text-indigo-650 font-bold text-sm cursor-pointer transition-colors"
          >
            <ChevronLeft size={16} /> Back to Pricing Plans
          </button>
        </div>

        <div>
          <h1 className="text-2xl font-extrabold text-slate-800">
            Configure {editingPlan.name.toUpperCase()} Plan limits
          </h1>
          <p className="text-slate-500 text-sm mt-1">Modify device connections and resource access allocations for the selected plan tier.</p>
        </div>

        {error && (
          <div className="p-3.5 rounded-xl border border-red-200 bg-red-50 text-red-655 text-sm font-semibold">
            {error}
          </div>
        )}

        <div className="bg-white border border-slate-200 shadow-sm rounded-3xl p-8">
          <form onSubmit={handleEditPlanSubmit} className="flex flex-col gap-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">Plan Name</label>
                <input
                  type="text"
                  required
                  disabled={editingPlan.name.toLowerCase() === 'trial'}
                  placeholder="e.g. Pro Developer Plan"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 focus:outline-none focus:border-indigo-605 text-sm disabled:opacity-60"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">Price (USD / month)</label>
                <input
                  type="number"
                  required
                  disabled={editingPlan.name.toLowerCase() === 'trial'}
                  value={editPrice}
                  onChange={(e) => setEditPrice(parseFloat(e.target.value) || 0)}
                  className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 focus:outline-none focus:border-indigo-605 text-sm disabled:opacity-60"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">WhatsApp Devices Limit</label>
                <input
                  type="number"
                  required
                  value={editDeviceLimit}
                  onChange={(e) => setEditDeviceLimit(parseInt(e.target.value) || 1)}
                  className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-805 focus:outline-none focus:border-indigo-606 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">Maximum CRM Contacts</label>
                <input
                  type="number"
                  required
                  value={editMaxContacts}
                  onChange={(e) => setEditMaxContacts(parseInt(e.target.value) || 1000)}
                  className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-805 focus:outline-none focus:border-indigo-607 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">Monthly Messages Limit</label>
                <input
                  type="number"
                  required
                  value={editMaxMessages}
                  onChange={(e) => setEditMaxMessages(parseInt(e.target.value) || 500)}
                  className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-805 focus:outline-none focus:border-indigo-608 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">AI Credits Quota</label>
                <input
                  type="number"
                  required
                  value={editMaxAi}
                  onChange={(e) => setEditMaxAi(parseInt(e.target.value) || 50)}
                  className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-805 focus:outline-none focus:border-indigo-609 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">Storage Capacity Allocation (MB)</label>
                <input
                  type="number"
                  required
                  value={editMaxStorage}
                  onChange={(e) => setEditMaxStorage(parseInt(e.target.value) || 100)}
                  className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-850 focus:outline-none focus:border-indigo-610 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">Daily Messages Limit</label>
                <input
                  type="number"
                  required
                  value={editDailyMessageLimit}
                  onChange={(e) => setEditDailyMessageLimit(parseInt(e.target.value) || 100)}
                  className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-850 focus:outline-none focus:border-indigo-610 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">Default Message Delay (Seconds)</label>
                <input
                  type="number"
                  required
                  value={editDefaultDelay}
                  onChange={(e) => setEditDefaultDelay(parseInt(e.target.value) || 5)}
                  className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-850 focus:outline-none focus:border-indigo-610 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">Subscription Duration (Days)</label>
                <input
                  type="number"
                  required
                  value={editValidityDays}
                  onChange={(e) => setEditValidityDays(parseInt(e.target.value) || 30)}
                  className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-850 focus:outline-none focus:border-indigo-610 text-sm"
                />
              </div>
            </div>

            {/* Feature Access Controls */}
            <div className="border-t border-slate-100 pt-5">
              <label className="block text-xs font-bold text-slate-550 mb-3 uppercase tracking-wider">Feature Access Settings</label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <label className="flex items-center gap-3 p-3.5 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer hover:border-indigo-200 transition-colors">
                  <input
                    type="checkbox"
                    checked={editBulkScheduling}
                    onChange={(e) => setEditBulkScheduling(e.target.checked)}
                    className="rounded text-indigo-650 focus:ring-indigo-500 h-4.5 w-4.5"
                  />
                  <div>
                    <span className="text-xs font-bold text-slate-755 block">Bulk Broadcast</span>
                    <span className="text-[10px] text-slate-400 font-medium">Scheduled marketing campaigns</span>
                  </div>
                </label>
                <label className="flex items-center gap-3 p-3.5 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer hover:border-indigo-200 transition-colors">
                  <input
                    type="checkbox"
                    checked={editFlowBuilder}
                    onChange={(e) => setEditFlowBuilder(e.target.checked)}
                    className="rounded text-indigo-655 focus:ring-indigo-500 h-4.5 w-4.5"
                  />
                  <div>
                    <span className="text-xs font-bold text-slate-755 block">Flow Builder</span>
                    <span className="text-[10px] text-slate-400 font-medium">Automated sequential paths</span>
                  </div>
                </label>
                <label className="flex items-center gap-3 p-3.5 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer hover:border-indigo-200 transition-colors">
                  <input
                    type="checkbox"
                    checked={editAiAutoReply}
                    onChange={(e) => setEditAiAutoReply(e.target.checked)}
                    className="rounded text-indigo-655 focus:ring-indigo-500 h-4.5 w-4.5"
                  />
                  <div>
                    <span className="text-xs font-bold text-slate-755 block">AI Auto Reply</span>
                    <span className="text-[10px] text-slate-400 font-medium">Auto-replies & AI Chat bot</span>
                  </div>
                </label>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-6 mt-2">
              <button
                type="button"
                onClick={() => setEditingPlan(null)}
                className="px-5 py-3 rounded-xl text-slate-500 hover:bg-slate-100 text-sm font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold cursor-pointer transition-colors shadow-md shadow-indigo-600/10"
              >
                Save Limits Configuration
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // CATALOG MAIN VIEW
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-800">Subscription Pricing Plans</h1>
          <p className="text-slate-500 text-sm mt-1">Configure pricing plans, message rates, AI credit allotments, and WhatsApp device limits.</p>
        </div>
        <button
          onClick={() => setShowCreatePlanModal(true)}
          className="px-4.5 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold flex items-center gap-2 cursor-pointer transition-colors shadow-md shadow-indigo-600/10"
        >
          <Plus size={16} /> Create Pricing Plan
        </button>
      </div>

      {error && (
        <div className="p-3.5 rounded-xl border border-red-200 bg-red-50 text-red-655 text-sm font-semibold">
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
                  <Tag size={16} className="text-indigo-600" />
                  {p.name.toUpperCase()}
                </h4>
                {p.name.toLowerCase() === 'trial' && (
                  <span className="px-2 py-0.5 bg-indigo-50 border border-indigo-100 rounded-lg text-[9px] font-extrabold text-indigo-700 uppercase">
                    Default
                  </span>
                )}
              </div>
              <div className="flex items-baseline gap-1 mt-2.5">
                <span className="text-2xl font-extrabold text-indigo-700">${p.price}</span>
                <span className="text-xs text-slate-400 font-semibold">/ month</span>
              </div>
              
              <div className="mt-5 flex flex-col gap-2.5 text-sm text-slate-655 font-medium">
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
                <div className="flex justify-between border-b border-slate-100 pb-2">
                  <span className="flex items-center gap-2 text-slate-500"><Database size={14} /> Storage capacity:</span>
                  <span className="text-slate-850 font-bold">{p.maxStorageMb} MB</span>
                </div>
                <div className="flex justify-between border-b border-slate-100 pb-2">
                  <span className="flex items-center gap-2 text-slate-500"><Coins size={14} /> Daily Message Limit:</span>
                  <span className="text-slate-850 font-bold">{p.dailyMessageLimit || 100} msgs/day</span>
                </div>
                <div className="flex justify-between border-b border-slate-100 pb-2">
                  <span className="flex items-center gap-2 text-slate-500"><Clock size={14} /> Spacing Delay:</span>
                  <span className="text-slate-850 font-bold">{p.defaultDelaySeconds || 5} seconds</span>
                </div>
                <div className="flex justify-between">
                  <span className="flex items-center gap-2 text-slate-500"><Calendar size={14} /> Plan Validity:</span>
                  <span className="text-slate-850 font-bold">{p.validityDays || 30} Days</span>
                </div>

                <div className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t border-slate-100">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${p.bulkScheduling !== false ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-600 border-red-200'}`}>
                    Bulk Send: {p.bulkScheduling !== false ? 'Yes' : 'No'}
                  </span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${p.flowBuilder !== false ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-600 border-red-200'}`}>
                    Flows: {p.flowBuilder !== false ? 'Yes' : 'No'}
                  </span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${p.aiAutoReply !== false ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-600 border-red-200'}`}>
                    AI/Reply: {p.aiAutoReply !== false ? 'Yes' : 'No'}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2.5">
              <button
                onClick={() => startEditing(p)}
                className="w-full py-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-colors"
              >
                <Edit3 size={14} /> Edit Plan Quotas
              </button>

              {p.name.toLowerCase() === 'trial' ? (
                <span className="text-[10px] text-slate-400 font-extrabold uppercase bg-slate-50 border border-slate-100 rounded-xl py-2 text-center select-none block w-full">
                  System Default (Not Removable)
                </span>
              ) : (
                <button
                  onClick={() => handleDeletePlan(p._id)}
                  className="w-full py-2.5 rounded-xl bg-red-50 hover:bg-red-100 border border-red-200 text-red-655 font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-colors"
                >
                  <Trash2 size={14} /> Remove Pricing Plan
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdminPlans;
