import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { motion } from 'framer-motion';
import {
  Smartphone,
  Contact,
  Mail,
  Cpu,
  Database,
  ShieldAlert,
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Zap,
  Bot,
  Send,
  Check,
  Calendar,
  Layers,
  ChevronRight
} from 'lucide-react';

const RenewSubscription = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { login } = useAuth();

  const emailParam = searchParams.get('email') || '';
  const isAdminParam = searchParams.get('isAdmin') === 'true';

  const [plans, setPlans] = useState([]);
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(true);
  const [renewLoading, setRenewLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const loadPlans = async () => {
    try {
      const { data } = await api.get('/auth/public-plans');
      setPlans(data);
      if (data.length > 0) {
        setSelectedPlanId(data[0]._id);
      }
    } catch (err) {
      setError('Failed to fetch available subscription plans.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPlans();
  }, []);

  const handleRenewSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!selectedPlanId) {
      setError('Please select a pricing plan to continue.');
      return;
    }

    if (!password) {
      setError('Please enter your password to authorize renewal.');
      return;
    }

    setRenewLoading(true);
    try {
      const res = await api.post('/auth/renew-plan', {
        email: emailParam,
        password,
        planId: selectedPlanId
      });
      setSuccess(res.data.message || 'Subscription renewed successfully!');
      
      // Auto login
      setTimeout(async () => {
        const loginRes = await login(emailParam, password);
        if (loginRes.success) {
          navigate('/dashboard');
        } else {
          navigate('/login');
        }
      }, 1500);

    } catch (err) {
      setError(err.response?.data?.message || 'Failed to renew subscription. Verify credentials.');
    } finally {
      setRenewLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-600 border-t-transparent" />
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Loading Plans...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 p-6 md:p-12 relative overflow-hidden font-sans">
      {/* Background decoration */}
      <div className="absolute top-0 right-0 w-96 h-96 rounded-full bg-emerald-100/30 blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-0 left-0 w-96 h-96 rounded-full bg-indigo-100/30 blur-[120px] pointer-events-none"></div>

      <div className="max-w-6xl mx-auto relative z-10 flex flex-col gap-8">
        
        {/* Back navigation */}
        <Link to="/login" className="inline-flex items-center gap-2 text-slate-450 hover:text-slate-650 text-xs font-semibold transition-colors w-fit">
          <ArrowLeft size={14} /> Return to Login
        </Link>

        {/* Header Hero Section */}
        <div className="flex flex-col gap-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-50 border border-amber-100 text-amber-700 text-[10px] font-black uppercase tracking-wider w-fit">
            <ShieldAlert size={12} /> Action Required: Workspace Expired
          </div>
          <h1 className="font-display text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight">
            Renew Your Workspace Subscription
          </h1>
          <p className="text-slate-500 text-sm max-w-2xl font-medium">
            Your workspace subscription period has concluded. To resume sending campaigns, automation rules, and interacting with customers, please select a plan and renew.
          </p>
        </div>

        {/* Global Error/Success banners */}
        {error && (
          <div className="p-4 rounded-2xl border border-red-200 bg-red-50 text-red-650 text-xs font-bold flex items-center gap-3">
            <AlertTriangle size={18} className="shrink-0" />
            {error}
          </div>
        )}
        {success && (
          <div className="p-4 rounded-2xl border border-emerald-200 bg-emerald-50 text-emerald-700 text-xs font-bold flex items-center gap-3">
            <CheckCircle2 size={18} className="shrink-0" />
            {success}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Detailed Pricing & Benefits Cards */}
          <div className="lg:col-span-2 flex flex-col gap-6">
            <h2 className="text-xs font-black uppercase tracking-wider text-slate-400">Select Subscription Tier</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {plans.map((p) => {
                const isSelected = selectedPlanId === p._id;
                return (
                  <motion.div
                    key={p._id}
                    whileHover={{ y: -4 }}
                    onClick={() => {
                      if (isAdminParam) setSelectedPlanId(p._id);
                    }}
                    className={`flex flex-col justify-between rounded-3xl border bg-white p-6 shadow-sm transition-all cursor-pointer ${
                      isSelected
                        ? 'border-emerald-600 ring-2 ring-emerald-500/10'
                        : 'border-slate-200 hover:border-slate-350 hover:shadow-md'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black uppercase tracking-wider text-slate-800">{p.name}</span>
                        {isSelected && (
                          <span className="rounded-lg bg-emerald-50 border border-emerald-100 px-2.5 py-0.5 text-[9px] font-black text-emerald-700 uppercase">
                            Selected
                          </span>
                        )}
                      </div>
                      <div className="mt-4 flex items-baseline gap-0.5">
                        <span className="text-3xl font-black text-emerald-600">${p.price}</span>
                        <span className="text-xs font-semibold text-slate-400">/ month</span>
                      </div>

                      {/* Resource limits checklist */}
                      <div className="mt-6 flex flex-col gap-3 text-xs font-semibold text-slate-500 border-t border-slate-100 pt-5">
                        <div className="flex justify-between border-b border-slate-50 pb-2">
                          <span className="flex items-center gap-2"><Smartphone size={14} className="text-slate-400" /> WhatsApp Devices:</span>
                          <span className="text-slate-800 font-bold">{p.deviceLimit} Devices</span>
                        </div>
                        <div className="flex justify-between border-b border-slate-50 pb-2">
                          <span className="flex items-center gap-2"><Contact size={14} className="text-slate-400" /> Max CRM Contacts:</span>
                          <span className="text-slate-800 font-bold">{p.maxContacts} Contacts</span>
                        </div>
                        <div className="flex justify-between border-b border-slate-50 pb-2">
                          <span className="flex items-center gap-2"><Mail size={14} className="text-slate-400" /> Monthly Messages:</span>
                          <span className="text-slate-800 font-bold">{p.maxMessagesPerMonth} msgs</span>
                        </div>
                        <div className="flex justify-between border-b border-slate-50 pb-2">
                          <span className="flex items-center gap-2"><Cpu size={14} className="text-slate-400" /> AI Credits:</span>
                          <span className="text-slate-800 font-bold">{p.maxAiCredits} credits</span>
                        </div>
                        <div className="flex justify-between border-b border-slate-50 pb-2">
                          <span className="flex items-center gap-2"><Database size={14} className="text-slate-400" /> Storage limit:</span>
                          <span className="text-slate-800 font-bold">{p.maxStorageMb} MB</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="flex items-center gap-2"><Calendar size={14} className="text-slate-400" /> Plan Validity:</span>
                          <span className="text-slate-800 font-bold">{p.validityDays || 30} Days</span>
                        </div>
                      </div>

                      {/* Included features */}
                      <div className="mt-5 flex flex-wrap gap-1.5 border-t border-slate-100 pt-4">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[9px] font-bold border ${p.bulkScheduling !== false ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-red-50/50 text-red-600 border-red-100'}`}>
                          {p.bulkScheduling !== false ? <Send size={9} /> : null}
                          Campaign Broadcast: {p.bulkScheduling !== false ? 'Yes' : 'No'}
                        </span>
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[9px] font-bold border ${p.flowBuilder !== false ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-red-50/50 text-red-600 border-red-100'}`}>
                          {p.flowBuilder !== false ? <Zap size={9} /> : null}
                          Smart Flows: {p.flowBuilder !== false ? 'Yes' : 'No'}
                        </span>
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[9px] font-bold border ${p.aiAutoReply !== false ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-red-50/50 text-red-600 border-red-100'}`}>
                          {p.aiAutoReply !== false ? <Bot size={9} /> : null}
                          AI AutoReply: {p.aiAutoReply !== false ? 'Yes' : 'No'}
                        </span>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* Comparison / Benefits section */}
            <div className="bg-white rounded-3xl border border-slate-200 p-6 flex flex-col gap-6 shadow-sm mt-2">
              <h3 className="text-sm font-extrabold text-slate-800 flex items-center gap-2">
                <Layers size={16} className="text-emerald-600" /> Plan Comparison & Workspace Benefits
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs text-slate-500 font-semibold leading-relaxed">
                <div className="flex gap-3">
                  <div className="h-6 w-6 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100">
                    <Check size={12} strokeWidth={3} />
                  </div>
                  <div>
                    <h4 className="text-slate-800 font-bold mb-1">Increase Device Connections</h4>
                    <p>Connect and handle messages from multiple WhatsApp accounts simultaneously depending on your chosen subscription tier.</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="h-6 w-6 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100">
                    <Check size={12} strokeWidth={3} />
                  </div>
                  <div>
                    <h4 className="text-slate-800 font-bold mb-1">Advanced Bulk Campaigns</h4>
                    <p>Upgrade to unlock campaign scheduling, delays to prevent bans, and intelligent broadcast delivery queues.</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="h-6 w-6 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100">
                    <Check size={12} strokeWidth={3} />
                  </div>
                  <div>
                    <h4 className="text-slate-800 font-bold mb-1">Intelligent AI Chatbots</h4>
                    <p>Leverage credits to train AI on your custom knowledge base files so it auto-responds to customer queries accurately.</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="h-6 w-6 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100">
                    <Check size={12} strokeWidth={3} />
                  </div>
                  <div>
                    <h4 className="text-slate-800 font-bold mb-1">Interactive Flow Builder</h4>
                    <p>Design complex, visual drag-and-drop chat flows to guide users through automated support menus.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Checkout Box */}
          <div className="flex flex-col gap-6">
            <h2 className="text-xs font-black uppercase tracking-wider text-slate-400">Checkout & Renew</h2>
            
            <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-md flex flex-col gap-6 sticky top-6">
              <div className="flex flex-col gap-1 border-b border-slate-100 pb-4">
                <span className="text-[10px] font-extrabold uppercase text-slate-400">Selected Plan</span>
                <span className="text-lg font-black text-slate-800 uppercase flex items-center gap-1.5">
                  {plans.find(p => p._id === selectedPlanId)?.name || 'None'} Plan
                </span>
                <span className="text-2xl font-black text-emerald-600 mt-1">
                  ${plans.find(p => p._id === selectedPlanId)?.price || 0} <span className="text-xs font-semibold text-slate-400">/ month</span>
                </span>
              </div>

              {isAdminParam ? (
                <form onSubmit={handleRenewSubmit} className="flex flex-col gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-slate-450 uppercase mb-1.5">Workspace Email</label>
                    <input
                      type="email"
                      disabled
                      value={emailParam}
                      className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-150 text-slate-500 font-bold text-xs cursor-not-allowed"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-slate-450 uppercase mb-1.5">Confirm Password</label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-3.5 text-slate-450" size={14} />
                      <input
                        type="password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Enter account password"
                        className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 focus:outline-none focus:border-emerald-600 text-xs font-semibold transition-colors"
                      />
                    </div>
                    <span className="text-[9px] font-semibold text-slate-400 mt-1.5 block leading-normal">
                      Confirming your password securely authorizes and activates this renewal period.
                    </span>
                  </div>

                  <button
                    type="submit"
                    disabled={renewLoading}
                    className="w-full py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-600/50 text-white text-xs font-black transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/10 cursor-pointer mt-3"
                  >
                    {renewLoading ? (
                      <>
                        <div className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        Authorizing Renewal...
                      </>
                    ) : (
                      <>
                        Activate & Login <ChevronRight size={14} />
                      </>
                    )}
                  </button>
                </form>
              ) : (
                /* Non-admin restricted message */
                <div className="flex flex-col gap-4">
                  <div className="p-4 rounded-2xl bg-amber-50 border border-amber-100 flex gap-3 text-amber-800">
                    <ShieldAlert size={18} className="shrink-0 mt-0.5" />
                    <div className="text-xs font-semibold leading-relaxed">
                      <p className="font-black mb-1">Administrator Access Required</p>
                      <p>Only the workspace creator or an Administrator account can perform plan renewals or change billing tiers.</p>
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-450 font-medium leading-relaxed">
                    Please contact the account owner for <span className="font-bold text-slate-600">{emailParam}</span> to complete the subscription reactivation.
                  </p>
                  <Link
                    to="/login"
                    className="w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold transition-all text-center flex items-center justify-center gap-2"
                  >
                    Return to Login
                  </Link>
                </div>
              )}

              <div className="border-t border-slate-100 pt-4 text-center">
                <span className="text-[9px] font-semibold text-slate-400">
                  Secure connection. Data is encrypted using SSL/TLS protocols.
                </span>
              </div>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
};

export default RenewSubscription;
