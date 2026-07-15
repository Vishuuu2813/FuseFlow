import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { motion } from 'framer-motion';
import { 
  CreditCard, 
  Smartphone, 
  Contact, 
  Mail, 
  Cpu, 
  Database, 
  Clock, 
  Calendar, 
  CheckCircle2, 
  Zap, 
  Bot, 
  Send,
  AlertCircle
} from 'lucide-react';

const Billing = () => {
  const { tenant, fetchProfile, user } = useAuth();
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [upgradingId, setUpgradingId] = useState(null);

  const loadPlans = async () => {
    try {
      const { data } = await api.get('/sessions/plans');
      setPlans(data);
    } catch (err) {
      setError('Failed to fetch available subscription plans.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPlans();
  }, []);

  const handleUpgrade = async (planId, planName) => {
    if (tenant?.plan === planName) return;
    
    const confirmUpgrade = window.confirm(`Are you sure you want to change your workspace plan to "${planName.toUpperCase()}"?`);
    if (!confirmUpgrade) return;

    setError('');
    setSuccess('');
    setUpgradingId(planId);

    try {
      await api.post('/sessions/upgrade-plan', { planId });
      setSuccess(`Workspace plan successfully updated to ${planName.toUpperCase()}!`);
      await fetchProfile(); // Refresh global user context to sync sidebar badges and headers
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to upgrade subscription plan.');
    } finally {
      setUpgradingId(null);
    }
  };

  const getValidityDays = () => {
    if (!tenant?.planExpiresAt) return 0;
    const expiry = new Date(tenant.planExpiresAt).getTime();
    const diff = expiry - Date.now();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  };

  const validityDays = getValidityDays();
  const currentPlanName = (tenant?.plan || 'trial').toLowerCase();
  const isTenantAdmin = user?.role === 'Admin';

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Title Header */}
      <div>
        <h1 className="font-display text-2xl font-extrabold text-slate-950">Subscription & Billing</h1>
        <p className="text-sm font-medium text-slate-500">Manage your workspace pricing plan, feature limits, and subscription periods.</p>
      </div>

      {error && (
        <div className="flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
          <AlertCircle size={18} className="shrink-0" />
          {error}
        </div>
      )}

      {success && (
        <div className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-700">
          <CheckCircle2 size={18} className="shrink-0" />
          {success}
        </div>
      )}

      {/* Current Active Plan Overview Card */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="relative overflow-hidden rounded-3xl border border-indigo-100 bg-white p-6 shadow-sm"
      >
        <div className="absolute right-6 top-6 h-28 w-28 rounded-full bg-indigo-50/50 blur-2xl" />
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">Current Workspace Plan</h2>
        
        <div className="mt-4 flex flex-wrap items-baseline justify-between gap-4">
          <div>
            <h3 className="font-display text-3xl font-black uppercase text-indigo-700">
              {tenant?.plan || 'TRIAL'}
            </h3>
            <p className="mt-2 text-sm font-semibold text-slate-500">
              {validityDays > 0 ? (
                <>Expires on <span className="text-slate-800">{new Date(tenant.planExpiresAt).toLocaleDateString('en-US', { dateStyle: 'medium' })}</span> ({validityDays} days left)</>
              ) : (
                <span className="text-red-655 font-bold">Plan Expired</span>
              )}
            </p>
          </div>
          <div className="rounded-2xl bg-indigo-50 px-4 py-2.5 text-center">
            <p className="text-[10px] font-extrabold uppercase tracking-wide text-indigo-700">Billing Cycle</p>
            <p className="text-lg font-black text-indigo-900">Monthly</p>
          </div>
        </div>

        {/* Limits/Usage Progress Rows */}
        <div className="mt-8 border-t border-slate-100 pt-6">
          <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 mb-4">Workspace Resource Allocations</h4>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-4">
              <div className="flex items-center gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-50 text-indigo-650">
                  <Smartphone size={16} />
                </span>
                <div>
                  <p className="text-xs font-semibold text-slate-400">WhatsApp Devices</p>
                  <p className="text-sm font-black text-slate-800">{tenant?.limits?.maxDevices || 1} Allowed</p>
                </div>
              </div>
            </div>
            <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-4">
              <div className="flex items-center gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                  <Contact size={16} />
                </span>
                <div>
                  <p className="text-xs font-semibold text-slate-400">Max Contacts</p>
                  <p className="text-sm font-black text-slate-800">{tenant?.limits?.maxContacts || 1000} Contacts</p>
                </div>
              </div>
            </div>
            <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-4">
              <div className="flex items-center gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                  <Mail size={16} />
                </span>
                <div>
                  <p className="text-xs font-semibold text-slate-400">Monthly Msg Quota</p>
                  <p className="text-sm font-black text-slate-800">{tenant?.limits?.maxMessagesPerMonth || 500} messages</p>
                </div>
              </div>
            </div>
            <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-4">
              <div className="flex items-center gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-violet-50 text-violet-650">
                  <Cpu size={16} />
                </span>
                <div>
                  <p className="text-xs font-semibold text-slate-400">AI Credits</p>
                  <p className="text-sm font-black text-slate-800">{tenant?.limits?.maxAiCredits || 50} Credits</p>
                </div>
              </div>
            </div>
            <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-4">
              <div className="flex items-center gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                  <Database size={16} />
                </span>
                <div>
                  <p className="text-xs font-semibold text-slate-400">Storage Limit</p>
                  <p className="text-sm font-black text-slate-800">{tenant?.limits?.maxStorageMb || 100} MB</p>
                </div>
              </div>
            </div>
            <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-4">
              <div className="flex items-center gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
                  <Clock size={16} />
                </span>
                <div>
                  <p className="text-xs font-semibold text-slate-400">Daily Message Rate</p>
                  <p className="text-sm font-black text-slate-800">{tenant?.limits?.dailyMessageLimit || 100} msgs/day</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Available Plans Catalog Section */}
      <div>
        <h2 className="font-display text-xl font-extrabold text-slate-905">Upgrade / Change Subscription Plans</h2>
        <p className="text-sm font-semibold text-slate-400 mt-1">Select a new plan to unlock higher limits and expand your automation limits.</p>
        {!isTenantAdmin && (
          <p className="mt-2 text-xs font-bold text-red-655 flex items-center gap-1.5">
            <AlertCircle size={13} />
            Only Workspace Administrators can perform self-service plan upgrades.
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {plans.map((p) => {
          const isCurrent = currentPlanName === p.name.toLowerCase();
          
          return (
            <motion.div
              key={p._id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex flex-col justify-between rounded-3xl border bg-white p-6 shadow-sm transition-all hover:shadow-md ${
                isCurrent ? 'border-indigo-600 ring-2 ring-indigo-100' : 'border-slate-200'
              }`}
            >
              <div>
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-extrabold text-slate-800 uppercase flex items-center gap-2">
                    {p.name}
                  </h3>
                  {isCurrent && (
                    <span className="rounded-lg bg-indigo-50 border border-indigo-100 px-2.5 py-0.5 text-[10px] font-black text-indigo-700 uppercase">
                      Active
                    </span>
                  )}
                </div>
                <div className="mt-4 flex items-baseline gap-1">
                  <span className="text-3xl font-black text-indigo-700">${p.price}</span>
                  <span className="text-xs font-semibold text-slate-400">/ month</span>
                </div>

                <div className="mt-6 flex flex-col gap-3 text-xs font-semibold text-slate-500 border-t border-slate-100 pt-5">
                  <div className="flex justify-between border-b border-slate-50 pb-2">
                    <span className="flex items-center gap-2"><Smartphone size={13} /> WhatsApp Devices:</span>
                    <span className="text-slate-800 font-bold">{p.deviceLimit} Devices</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-50 pb-2">
                    <span className="flex items-center gap-2"><Contact size={13} /> CRM Contacts:</span>
                    <span className="text-slate-800 font-bold">{p.maxContacts} Contacts</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-50 pb-2">
                    <span className="flex items-center gap-2"><Mail size={13} /> Monthly Messages:</span>
                    <span className="text-slate-800 font-bold">{p.maxMessagesPerMonth} msgs</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-50 pb-2">
                    <span className="flex items-center gap-2"><Cpu size={13} /> AI Response Credits:</span>
                    <span className="text-slate-800 font-bold">{p.maxAiCredits} credits</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-50 pb-2">
                    <span className="flex items-center gap-2"><Database size={13} /> Storage Allocation:</span>
                    <span className="text-slate-800 font-bold">{p.maxStorageMb} MB</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="flex items-center gap-2"><Calendar size={13} /> Plan Duration:</span>
                    <span className="text-slate-800 font-bold">{p.validityDays || 30} Days</span>
                  </div>
                </div>

                {/* Feature Tags list */}
                <div className="mt-5 flex flex-wrap gap-1.5 border-t border-slate-100 pt-4">
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-bold border ${p.bulkScheduling !== false ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-600 border-red-200'}`}>
                    {p.bulkScheduling !== false ? <Send size={8} /> : null}
                    Broadcast: {p.bulkScheduling !== false ? 'Yes' : 'No'}
                  </span>
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-bold border ${p.flowBuilder !== false ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-600 border-red-200'}`}>
                    {p.flowBuilder !== false ? <Zap size={8} /> : null}
                    Flows: {p.flowBuilder !== false ? 'Yes' : 'No'}
                  </span>
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-bold border ${p.aiAutoReply !== false ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-600 border-red-200'}`}>
                    {p.aiAutoReply !== false ? <Bot size={8} /> : null}
                    AI AutoReply: {p.aiAutoReply !== false ? 'Yes' : 'No'}
                  </span>
                </div>
              </div>

              <div className="mt-8">
                <button
                  onClick={() => handleUpgrade(p._id, p.name)}
                  disabled={isCurrent || !isTenantAdmin || upgradingId === p._id}
                  className={`w-full py-3 rounded-2xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                    isCurrent
                      ? 'bg-slate-50 border border-slate-200 text-slate-400 cursor-not-allowed'
                      : !isTenantAdmin
                      ? 'bg-slate-50 border border-slate-100 text-slate-400 cursor-not-allowed'
                      : upgradingId === p._id
                      ? 'bg-indigo-50 border border-indigo-100 text-indigo-500 cursor-wait'
                      : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/10'
                  }`}
                >
                  {upgradingId === p._id ? (
                    <>
                      <div className="h-3 w-3 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
                      Upgrading...
                    </>
                  ) : isCurrent ? (
                    'Your Current Plan'
                  ) : (
                    'Activate Subscription'
                  )}
                </button>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

export default Billing;
