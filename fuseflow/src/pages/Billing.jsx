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
  AlertCircle,
  Tag,
  Printer,
  Sparkles,
  ShieldCheck,
  X
} from 'lucide-react';

const Billing = () => {
  const { tenant, fetchProfile, user } = useAuth();
  const [plans, setPlans] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Checkout Modal State
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [couponCode, setCouponCode] = useState('');
  const [validCoupon, setValidCoupon] = useState(null);
  const [couponError, setCouponError] = useState('');
  const [gateway, setGateway] = useState('Stripe');
  const [processingPayment, setProcessingPayment] = useState(false);

  const loadPlans = async () => {
    try {
      const { data } = await api.get('/sessions/plans');
      setPlans(data);
    } catch (err) {
      setError('Failed to fetch available subscription plans.');
    }
  };

  const loadInvoices = async () => {
    try {
      const { data } = await api.get('/sessions/invoices');
      setInvoices(data);
    } catch (err) {
      console.error('Failed to load transaction history.');
    }
  };

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await Promise.all([loadPlans(), loadInvoices()]);
      setLoading(false);
    };
    init();
  }, []);

  const handleValidateCoupon = async () => {
    setCouponError('');
    setValidCoupon(null);
    if (!couponCode.trim()) return;

    try {
      const { data } = await api.post('/sessions/validate-coupon', { code: couponCode });
      setValidCoupon(data);
      setSuccess('Coupon code applied successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setCouponError(err.response?.data?.message || 'Invalid coupon code.');
    }
  };

  const handleOpenCheckout = (plan) => {
    if (tenant?.plan === plan.name) return;
    setSelectedPlan(plan);
    setCouponCode('');
    setValidCoupon(null);
    setCouponError('');
    setGateway('Stripe');
  };

  const handleCheckoutSubmit = async (e) => {
    e.preventDefault();
    if (!selectedPlan) return;

    setError('');
    setSuccess('');
    setProcessingPayment(true);

    try {
      // Simulate API payment checkout processing delay
      await new Promise((res) => setTimeout(res, 1800));

      const payload = {
        planId: selectedPlan._id,
        gateway,
        couponCode: validCoupon ? validCoupon.code : undefined
      };

      const { data } = await api.post('/sessions/checkout', payload);
      setSuccess(data.message || 'Payment successfully processed!');
      setSelectedPlan(null);
      
      // Refresh info
      await fetchProfile();
      await loadInvoices();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to complete transaction.');
    } finally {
      setProcessingPayment(false);
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-extrabold text-slate-950">Subscription & Billing</h1>
          <p className="text-sm font-medium text-slate-500">Manage your workspace pricing plan, feature limits, and payment invoice history.</p>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-705">
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
        <div className="absolute right-6 top-6 h-28 w-28 rounded-full bg-indigo-50/50 blur-2xl pointer-events-none" />
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

        {/* Resource meters progress layout */}
        <div className="mt-8 border-t border-slate-100 pt-6">
          <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 mb-4">Workspace Resource Allocations</h4>
          
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-4 space-y-3">
              <div className="flex items-center gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-50 text-indigo-650 shrink-0">
                  <Smartphone size={16} />
                </span>
                <div>
                  <p className="text-xs font-semibold text-slate-400">WhatsApp Devices</p>
                  <p className="text-sm font-black text-slate-800">{tenant?.limits?.maxDevices || 1} Allowed</p>
                </div>
              </div>
              <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                <div className="h-full bg-indigo-600 rounded-full" style={{ width: `${Math.min(100, (1 / (tenant?.limits?.maxDevices || 1)) * 100)}%` }} />
              </div>
            </div>

            <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-4 space-y-3">
              <div className="flex items-center gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 shrink-0">
                  <Contact size={16} />
                </span>
                <div>
                  <p className="text-xs font-semibold text-slate-400">Max Contacts</p>
                  <p className="text-sm font-black text-slate-800">{tenant?.limits?.maxContacts || 1000} Contacts</p>
                </div>
              </div>
              <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-555 rounded-full" style={{ width: '45%' }} />
              </div>
            </div>

            <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-4 space-y-3">
              <div className="flex items-center gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-50 text-amber-600 shrink-0">
                  <Mail size={16} />
                </span>
                <div>
                  <p className="text-xs font-semibold text-slate-400">Monthly Msg Quota</p>
                  <p className="text-sm font-black text-slate-800">{tenant?.limits?.maxMessagesPerMonth || 500} messages</p>
                </div>
              </div>
              <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                <div className="h-full bg-amber-500 rounded-full" style={{ width: '28%' }} />
              </div>
            </div>

            <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-4 space-y-3">
              <div className="flex items-center gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-violet-50 text-violet-650 shrink-0">
                  <Cpu size={16} />
                </span>
                <div>
                  <p className="text-xs font-semibold text-slate-400">AI Credits</p>
                  <p className="text-sm font-black text-slate-800">{tenant?.limits?.maxAiCredits || 50} Credits</p>
                </div>
              </div>
              <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                <div className="h-full bg-violet-600 rounded-full" style={{ width: '15%' }} />
              </div>
            </div>

            <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-4 space-y-3">
              <div className="flex items-center gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-50 text-blue-600 shrink-0">
                  <Database size={16} />
                </span>
                <div>
                  <p className="text-xs font-semibold text-slate-400">Storage Limit</p>
                  <p className="text-sm font-black text-slate-800">{tenant?.limits?.maxStorageMb || 100} MB</p>
                </div>
              </div>
              <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                <div className="h-full bg-blue-600 rounded-full" style={{ width: '8%' }} />
              </div>
            </div>

            <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-4 space-y-3">
              <div className="flex items-center gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-rose-50 text-rose-600 shrink-0">
                  <Clock size={16} />
                </span>
                <div>
                  <p className="text-xs font-semibold text-slate-400">Daily Message Rate</p>
                  <p className="text-sm font-black text-slate-800">{tenant?.limits?.dailyMessageLimit || 100} msgs/day</p>
                </div>
              </div>
              <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                <div className="h-full bg-rose-600 rounded-full" style={{ width: '35%' }} />
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Available Plans Catalog Section */}
      <div>
        <h2 className="font-display text-lg font-extrabold text-slate-900">Upgrade / Renew Plan</h2>
        <p className="text-xs font-bold text-slate-400 mt-1">Select a new plan to instantly unlock premium quotas and messaging features.</p>
        {!isTenantAdmin && (
          <p className="mt-2 text-xs font-bold text-red-655 flex items-center gap-1.5">
            <AlertCircle size={13} />
            Only Workspace Administrators can change or renew subscription plans.
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
                  <h3 className="text-sm font-extrabold text-slate-800 uppercase flex items-center gap-2">
                    {p.name}
                  </h3>
                  {isCurrent && (
                    <span className="rounded-lg bg-indigo-50 border border-indigo-100 px-2.5 py-0.5 text-[9px] font-black text-indigo-700 uppercase">
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

                <div className="mt-5 flex flex-wrap gap-1.5 border-t border-slate-100 pt-4">
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-bold border ${p.bulkScheduling !== false ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-650 border-red-200'}`}>
                    Broadcast: {p.bulkScheduling !== false ? 'Yes' : 'No'}
                  </span>
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-bold border ${p.flowBuilder !== false ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-650 border-red-200'}`}>
                    Flows: {p.flowBuilder !== false ? 'Yes' : 'No'}
                  </span>
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-bold border ${p.aiAutoReply !== false ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-650 border-red-200'}`}>
                    AI AutoReply: {p.aiAutoReply !== false ? 'Yes' : 'No'}
                  </span>
                </div>
              </div>

              <div className="mt-8">
                <button
                  onClick={() => handleOpenCheckout(p)}
                  disabled={isCurrent || !isTenantAdmin}
                  className={`w-full py-3 rounded-2xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                    isCurrent
                      ? 'bg-slate-50 border border-slate-200 text-slate-400 cursor-not-allowed'
                      : !isTenantAdmin
                      ? 'bg-slate-50 border border-slate-100 text-slate-400 cursor-not-allowed'
                      : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/10'
                  }`}
                >
                  {isCurrent ? 'Your Active Plan' : 'Select & Pay'}
                </button>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Transaction & Invoices Table */}
      <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-4">
        <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
          <CreditCard size={16} className="text-indigo-650" /> Invoice Payment Receipts
        </h3>

        {invoices.length === 0 ? (
          <p className="text-xs text-slate-450 text-center py-6">No historical invoice payment transactions recorded.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase">
                  <th className="pb-2">Invoice #</th>
                  <th className="pb-2">Plan</th>
                  <th className="pb-2">Paid Price</th>
                  <th className="pb-2">Date</th>
                  <th className="pb-2">Status</th>
                  <th className="pb-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv) => (
                  <tr key={inv._id} className="border-b border-slate-100 last:border-0">
                    <td className="py-3 font-mono font-bold text-slate-600">{inv.invoiceNumber}</td>
                    <td className="py-3 font-extrabold text-slate-800">{inv.planName}</td>
                    <td className="py-3 font-black text-slate-805">
                      ${inv.amount.toFixed(2)}
                      {inv.originalAmount > inv.amount && (
                        <span className="ml-1 text-[9px] text-slate-400 line-through">${inv.originalAmount.toFixed(2)}</span>
                      )}
                    </td>
                    <td className="py-3 font-semibold text-slate-500">{new Date(inv.createdAt).toLocaleDateString()}</td>
                    <td className="py-3">
                      <span className="px-2 py-0.5 rounded bg-emerald-50 border border-emerald-100 text-[9px] font-bold text-emerald-700 uppercase">
                        {inv.status}
                      </span>
                    </td>
                    <td className="py-3 text-right">
                      <button 
                        onClick={() => window.print()}
                        className="p-1.5 rounded-lg hover:bg-slate-50 text-slate-450 hover:text-slate-700 cursor-pointer"
                        title="Print Receipt"
                      >
                        <Printer size={13} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Checkout Processing Overlay Modal */}
      {selectedPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col">
            <div className="px-5 py-4 border-b border-slate-150 flex items-center justify-between bg-slate-50/50">
              <h2 className="font-display text-sm font-extrabold text-slate-900 flex items-center gap-1.5">
                <Sparkles size={15} className="text-indigo-600" /> Complete Secure Upgrade
              </h2>
              <button
                onClick={() => setSelectedPlan(null)}
                className="p-1.5 rounded-xl hover:bg-slate-200 text-slate-450 cursor-pointer"
                disabled={processingPayment}
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCheckoutSubmit} className="p-6 space-y-4">
              <div>
                <p className="text-xs text-slate-450 uppercase font-black tracking-wider">Plan Selected</p>
                <div className="flex justify-between items-baseline mt-1">
                  <h3 className="text-lg font-black text-slate-800 uppercase">{selectedPlan.name} Plan</h3>
                  <span className="text-lg font-black text-indigo-700">${selectedPlan.price} / month</span>
                </div>
              </div>

              {/* Coupon input field */}
              <div className="pt-2 border-t border-slate-100">
                <label className="block text-[10px] font-bold text-slate-500 mb-1.5 uppercase">Apply Discount Coupon</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="e.g. SAVE30"
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                    className="flex-1 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs focus:outline-none focus:border-indigo-650 font-bold"
                    disabled={processingPayment || !!validCoupon}
                  />
                  <button
                    type="button"
                    onClick={handleValidateCoupon}
                    className="px-4 py-1.5 bg-indigo-50 border border-indigo-200 text-indigo-700 rounded-xl text-xs font-black hover:bg-indigo-100 transition-colors cursor-pointer"
                    disabled={processingPayment || !!validCoupon}
                  >
                    Apply
                  </button>
                </div>
                {couponError && <p className="text-[10px] text-red-650 font-bold mt-1">{couponError}</p>}
                {validCoupon && (
                  <div className="mt-2 flex items-center justify-between bg-emerald-50 border border-emerald-100 p-2 rounded-xl text-[10px] font-bold text-emerald-700">
                    <span>Discount applied ({validCoupon.code}): {validCoupon.discountType === 'PERCENTAGE' ? `${validCoupon.discountValue}% Off` : `$${validCoupon.discountValue} Off`}</span>
                    <button type="button" onClick={() => setValidCoupon(null)} className="underline font-bold text-emerald-800">Remove</button>
                  </div>
                )}
              </div>

              {/* Gateway selection */}
              <div className="pt-2 border-t border-slate-100">
                <label className="block text-[10px] font-bold text-slate-500 mb-1.5 uppercase">Choose Payment Gateway</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setGateway('Stripe')}
                    className={`py-2 px-3.5 border rounded-xl flex items-center justify-center gap-1.5 cursor-pointer text-xs font-bold transition-all ${
                      gateway === 'Stripe' ? 'border-indigo-600 bg-indigo-50/50 text-indigo-850 ring-1 ring-indigo-150' : 'border-slate-200 text-slate-500'
                    }`}
                  >
                    <CreditCard size={14} /> Stripe Checkout
                  </button>
                  <button
                    type="button"
                    onClick={() => setGateway('Razorpay')}
                    className={`py-2 px-3.5 border rounded-xl flex items-center justify-center gap-1.5 cursor-pointer text-xs font-bold transition-all ${
                      gateway === 'Razorpay' ? 'border-indigo-600 bg-indigo-50/50 text-indigo-850 ring-1 ring-indigo-150' : 'border-slate-200 text-slate-500'
                    }`}
                  >
                    <ShieldCheck size={14} /> Razorpay Portal
                  </button>
                </div>
              </div>

              {/* Final totals calculation */}
              <div className="pt-3 border-t border-slate-100 space-y-1 text-xs">
                <div className="flex justify-between font-medium text-slate-500">
                  <span>Subtotal Amount</span>
                  <span>${selectedPlan.price.toFixed(2)}</span>
                </div>
                {validCoupon && (
                  <div className="flex justify-between font-semibold text-emerald-750">
                    <span>Discount Code Applied</span>
                    <span>
                      -{validCoupon.discountType === 'PERCENTAGE' 
                        ? `$${((selectedPlan.price * validCoupon.discountValue) / 100).toFixed(2)}`
                        : `$${validCoupon.discountValue.toFixed(2)}`}
                    </span>
                  </div>
                )}
                <div className="flex justify-between font-black text-slate-850 text-sm pt-1.5">
                  <span>Total Payable Amount</span>
                  <span>
                    ${(validCoupon
                      ? Math.max(0, validCoupon.discountType === 'PERCENTAGE' 
                          ? selectedPlan.price - (selectedPlan.price * validCoupon.discountValue) / 100
                          : selectedPlan.price - validCoupon.discountValue)
                      : selectedPlan.price).toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Submit Payment button */}
              <button
                type="submit"
                disabled={processingPayment}
                className="w-full mt-4 py-3 bg-indigo-650 hover:bg-indigo-705 text-white rounded-2xl text-xs font-black shadow-md shadow-indigo-600/10 cursor-pointer flex items-center justify-center gap-2"
              >
                {processingPayment ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Simulating Payment Auth...
                  </>
                ) : (
                  `Pay Now via ${gateway}`
                )}
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default Billing;
