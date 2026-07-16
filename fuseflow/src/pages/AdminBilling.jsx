import React, { useEffect, useState } from 'react';
import api from '../services/api';
import {
  Tag,
  Plus,
  Trash2,
  AlertCircle,
  CheckCircle2,
  DollarSign,
  TrendingUp,
  CreditCard,
  Percent,
  Calendar,
  Layers,
  Sparkles,
  Search,
  Clock
} from 'lucide-react';

const AdminBilling = () => {
  const [coupons, setCoupons] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loadingCoupons, setLoadingCoupons] = useState(true);
  const [loadingTrans, setLoadingTrans] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form State for creating Coupon
  const [code, setCode] = useState('');
  const [discountType, setDiscountType] = useState('PERCENTAGE');
  const [discountValue, setDiscountValue] = useState(10);
  const [maxUses, setMaxUses] = useState(100);
  const [expiresAt, setExpiresAt] = useState('');

  // Search/Filters
  const [searchTrans, setSearchTrans] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const fetchCoupons = async () => {
    try {
      const { data } = await api.get('/admin/coupons');
      setCoupons(data);
    } catch (err) {
      setError('Failed to fetch coupons.');
    } finally {
      setLoadingCoupons(false);
    }
  };

  const fetchTransactions = async () => {
    try {
      const { data } = await api.get('/admin/transactions');
      setTransactions(data);
    } catch (err) {
      setError('Failed to load transaction history.');
    } finally {
      setLoadingTrans(false);
    }
  };

  useEffect(() => {
    fetchCoupons();
    fetchTransactions();
  }, []);

  const handleCreateCoupon = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!code.trim()) return setError('Coupon code is required.');
    if (!expiresAt) return setError('Expiry date is required.');

    try {
      const payload = {
        code: code.trim().toUpperCase(),
        discountType,
        discountValue,
        maxUses,
        expiresAt
      };
      const { data } = await api.post('/admin/coupons', payload);
      setSuccess(`Coupon ${data.code} created successfully!`);
      // Reset form
      setCode('');
      setDiscountType('PERCENTAGE');
      setDiscountValue(10);
      setMaxUses(100);
      setExpiresAt('');
      
      fetchCoupons();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create coupon.');
    }
  };

  const handleDeleteCoupon = async (id) => {
    if (!window.confirm('Delete this coupon? This action cannot be undone.')) return;
    setError('');
    setSuccess('');
    try {
      await api.delete(`/admin/coupons/${id}`);
      setSuccess('Coupon deleted successfully.');
      fetchCoupons();
    } catch (err) {
      setError('Failed to delete coupon.');
    }
  };

  const filteredTrans = transactions.filter(t => {
    const tenantName = t.tenantId?.name?.toLowerCase() || '';
    const planName = t.planName?.toLowerCase() || '';
    const invoiceNum = t.invoiceNumber?.toLowerCase() || '';
    const matchesSearch = tenantName.includes(searchTrans.toLowerCase()) || 
                          planName.includes(searchTrans.toLowerCase()) ||
                          invoiceNum.includes(searchTrans.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || t.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Calculate stats
  const totalRev = transactions
    .filter(t => t.status === 'SUCCESS')
    .reduce((sum, t) => sum + (t.amount || 0), 0);

  const timelyPaymentsCount = transactions.filter(t => t.status === 'SUCCESS').length;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="font-display text-2xl font-extrabold text-slate-900">Admin Billings & Coupon Console</h1>
        <p className="text-sm font-medium text-slate-500">Manage platform discount coupons, audit incoming payments, and review workspace renewal statuses.</p>
      </div>

      {error && (
        <div className="p-3.5 rounded-xl border border-red-200 bg-red-50 text-red-650 text-sm font-semibold flex items-center gap-2">
          <AlertCircle size={16} /> {error}
        </div>
      )}

      {success && (
        <div className="p-3.5 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-700 text-sm font-semibold flex items-center gap-2">
          <CheckCircle2 size={16} /> {success}
        </div>
      )}

      {/* KPI Stats Block */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm flex items-center justify-between gap-4">
          <div className="space-y-1.5">
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Total Sales Revenue</span>
            <h3 className="text-2xl font-black text-slate-800">${totalRev.toFixed(2)}</h3>
            <span className="text-[10px] text-emerald-650 font-extrabold flex items-center gap-0.5"><TrendingUp size={10} /> Live payments platform-wide</span>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl shrink-0">
            <DollarSign size={20} />
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm flex items-center justify-between gap-4">
          <div className="space-y-1.5">
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Successful Transactions</span>
            <h3 className="text-2xl font-black text-slate-800">{timelyPaymentsCount}</h3>
            <span className="text-[10px] text-indigo-600 font-extrabold flex items-center gap-0.5"><Clock size={10} /> Processing timely</span>
          </div>
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl shrink-0">
            <CreditCard size={20} />
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm flex items-center justify-between gap-4">
          <div className="space-y-1.5">
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Active Coupons</span>
            <h3 className="text-2xl font-black text-slate-800">{coupons.length}</h3>
            <span className="text-[10px] text-indigo-600 font-extrabold flex items-center gap-0.5"><Tag size={10} /> Active promotional campaigns</span>
          </div>
          <div className="p-3 bg-violet-50 text-violet-600 rounded-2xl shrink-0">
            <Tag size={20} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Create Coupon and Active Coupons */}
        <div className="lg:col-span-1 space-y-6">
          {/* Create Coupon Form */}
          <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-4">
            <h3 className="text-sm font-extrabold text-slate-850 flex items-center gap-1.5 border-b border-slate-100 pb-3">
              <Sparkles size={16} className="text-indigo-650" /> Create Platform Coupon
            </h3>

            <form onSubmit={handleCreateCoupon} className="space-y-3.5">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">Coupon Code Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. SUMMER50"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs focus:outline-none focus:border-indigo-600 font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">Discount Type</label>
                  <select
                    value={discountType}
                    onChange={(e) => setDiscountType(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-700 focus:outline-none"
                  >
                    <option value="PERCENTAGE">Percentage %</option>
                    <option value="FIXED">Fixed Amount $</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">Discount Value</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={discountValue}
                    onChange={(e) => setDiscountValue(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs focus:outline-none focus:border-indigo-600 font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">Max Uses Limit</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={maxUses}
                    onChange={(e) => setMaxUses(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs focus:outline-none focus:border-indigo-600 font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">Expiry Date</label>
                  <input
                    type="date"
                    required
                    value={expiresAt}
                    onChange={(e) => setExpiresAt(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs focus:outline-none focus:border-indigo-600 font-bold text-slate-700"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full mt-2 inline-flex items-center justify-center gap-1.5 py-2.5 px-4 bg-indigo-650 hover:bg-indigo-700 text-white rounded-xl text-xs font-black shadow-md cursor-pointer transition-colors"
              >
                <Plus size={14} /> Generate Code
              </button>
            </form>
          </div>

          {/* List Coupons */}
          <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-4">
            <h3 className="text-sm font-extrabold text-slate-850 flex items-center gap-1.5 border-b border-slate-100 pb-3">
              <Layers size={16} className="text-indigo-650" /> Active Coupons List
            </h3>

            {loadingCoupons ? (
              <div className="flex justify-center py-4">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
              </div>
            ) : coupons.length === 0 ? (
              <p className="text-[10px] text-slate-450 text-center py-4 font-bold">No active coupons available.</p>
            ) : (
              <div className="flex flex-col gap-3">
                {coupons.map((c) => (
                  <div key={c._id} className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-150">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-black text-indigo-700 tracking-wide">{c.code}</span>
                        <span className="text-[9px] font-bold text-slate-400">({c.uses}/{c.maxUses} uses)</span>
                      </div>
                      <p className="text-[10px] font-bold text-slate-500 mt-1">
                        {c.discountType === 'PERCENTAGE' ? `${c.discountValue}% Off` : `$${c.discountValue} Off`} 
                        {' • Exp: '}{new Date(c.expiresAt).toLocaleDateString()}
                      </p>
                    </div>
                    <button
                      onClick={() => handleDeleteCoupon(c._id)}
                      className="p-1.5 rounded-xl hover:bg-red-50 text-slate-400 hover:text-red-650 cursor-pointer transition-colors"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Platform Audit Transactions Logs */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-3xl p-5 shadow-sm flex flex-col justify-between min-h-[460px]">
          <div>
            <h3 className="text-sm font-extrabold text-slate-850 flex items-center gap-1.5 border-b border-slate-100 pb-3">
              <CreditCard size={16} className="text-indigo-650" /> System-wide Payment Audit Logs
            </h3>
            
            {/* Filter controls */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 mt-4">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-2.5 text-slate-400" size={14} />
                <input
                  type="text"
                  placeholder="Search workspace or plan..."
                  value={searchTrans}
                  onChange={(e) => setSearchTrans(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs focus:outline-none focus:border-indigo-600 font-semibold"
                />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-700 focus:outline-none"
              >
                <option value="ALL">All Statuses</option>
                <option value="SUCCESS">Success Only</option>
                <option value="PENDING">Pending Only</option>
                <option value="FAILED">Failed Only</option>
              </select>
            </div>

            {/* List transactions */}
            {loadingTrans ? (
              <div className="flex justify-center py-20">
                <div className="h-7 w-7 animate-spin rounded-full border-3 border-indigo-600 border-t-transparent" />
              </div>
            ) : filteredTrans.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-20">No matching transaction receipts found.</p>
            ) : (
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase">
                      <th className="pb-2">Invoice / ID</th>
                      <th className="pb-2">Tenant Workspace</th>
                      <th className="pb-2">Details</th>
                      <th className="pb-2 text-right">Paid Amount</th>
                      <th className="pb-2 text-center">Renewal Integrity</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTrans.map((t) => {
                      const isTimely = t.status === 'SUCCESS';
                      return (
                        <tr key={t._id} className="border-b border-slate-100 last:border-0 text-xs">
                          <td className="py-3 font-mono font-bold text-slate-600">
                            {t.invoiceNumber || 'N/A'}
                            <div className="text-[9px] text-slate-400 font-medium">{t.paymentId}</div>
                          </td>
                          <td className="py-3 font-extrabold text-slate-800">
                            {t.tenantId?.name || 'Workspace Account'}
                          </td>
                          <td className="py-3">
                            <span className="font-bold text-slate-700">{t.planName}</span>
                            {t.couponCode && (
                              <span className="ml-1.5 px-1.5 py-0.5 rounded bg-indigo-50 text-[9px] font-black text-indigo-700">
                                {t.couponCode}
                              </span>
                            )}
                            <div className="text-[9px] text-slate-450 mt-0.5">Gateway: {t.paymentGateway}</div>
                          </td>
                          <td className="py-3 text-right font-black text-slate-800">
                            ${t.amount?.toFixed(2)}
                            {t.originalAmount > t.amount && (
                              <div className="text-[9px] text-slate-400 line-through">${t.originalAmount?.toFixed(2)}</div>
                            )}
                          </td>
                          <td className="py-3 text-center">
                            <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase ${
                              isTimely ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-rose-50 text-rose-700 border border-rose-100'
                            }`}>
                              {isTimely ? 'Timely' : 'Delayed'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminBilling;
