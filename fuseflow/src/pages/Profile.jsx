import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { Shield, Key, FileText, CheckCircle, AlertCircle, Calendar, User, Mail, Layers, Smartphone, RefreshCw } from 'lucide-react';

const Profile = () => {
  const { user, tenant } = useAuth();
  
  // Password state
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);

  // Stats state
  const [todaySentCount, setTodaySentCount] = useState(0);
  const [statsLoading, setStatsLoading] = useState(true);

  const fetchDailyStats = async () => {
    setStatsLoading(true);
    try {
      const { data } = await api.get('/sessions/logs');
      // Filter logs sent today (local time)
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);

      const count = data.filter((log) => {
        const sentDate = new Date(log.sentAt || log.createdAt);
        return sentDate >= startOfToday;
      }).length;

      setTodaySentCount(count);
    } catch (err) {
      console.error('Failed to load daily stats', err);
    } finally {
      setStatsLoading(false);
    }
  };

  useEffect(() => {
    if (user?.tenantId) {
      fetchDailyStats();
    }
  }, [user]);

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match.');
      return;
    }

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    setPasswordLoading(true);
    try {
      const { data } = await api.post('/auth/change-password', {
        oldPassword,
        newPassword
      });
      setSuccess('Your password has been changed successfully.');
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to change password. Make sure current password is correct.');
    } finally {
      setPasswordLoading(false);
    }
  };

  // Limit constants
  const dailyLimit = tenant?.limits?.dailyMessageLimit || 100;
  const percentUsed = Math.min(Math.round((todaySentCount / dailyLimit) * 100), 100);

  return (
    <div className="flex flex-col gap-8 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-slate-800">My Profile & Settings</h1>
        <p className="text-slate-500 text-sm mt-1">Manage user security, monitor daily quotas, and inspect workspace plan limits.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Column: Profile Card & Plan Info */}
        <div className="md:col-span-1 flex flex-col gap-6">
          {/* User Details */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col items-center text-center">
            <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-indigo-500 to-indigo-650 flex items-center justify-center text-white text-3xl font-black shadow-md border-4 border-indigo-50 mb-4 uppercase">
              {user?.name ? user.name.charAt(0) : 'U'}
            </div>
            <h2 className="text-lg font-extrabold text-slate-800">{user?.name}</h2>
            <span className="mt-1 px-3 py-1 bg-indigo-50 text-indigo-700 border border-indigo-100 rounded-full text-[10px] font-black uppercase tracking-wider">
              {user?.role || 'Member'}
            </span>

            <div className="w-full border-t border-slate-100 pt-5 mt-5 flex flex-col gap-3.5 text-left text-xs font-semibold text-slate-505">
              <div className="flex items-center gap-2">
                <Mail size={14} className="text-slate-400" />
                <span className="text-slate-700 truncate">{user?.email}</span>
              </div>
              <div className="flex items-center gap-2">
                <Layers size={14} className="text-slate-400" />
                <span className="text-slate-700 truncate">{tenant?.name || 'Admin Console'}</span>
              </div>
            </div>
          </div>

          {/* Workspace Plan Card */}
          {tenant && (
            <div className="bg-white border border-slate-205 rounded-3xl p-6 shadow-sm">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Subscription Overview</h3>
              <div className="p-3.5 rounded-2xl bg-indigo-50/50 border border-indigo-100 flex items-center justify-between mb-4">
                <span className="text-xs font-extrabold text-indigo-850 uppercase">Active Plan</span>
                <span className="px-2.5 py-1 bg-indigo-600 text-white rounded-lg text-[10px] font-black uppercase tracking-wider">
                  {tenant.plan}
                </span>
              </div>

              <div className="flex flex-col gap-3 text-xs font-medium text-slate-500">
                <div className="flex justify-between">
                  <span>WhatsApp Devices:</span>
                  <span className="font-bold text-slate-800">{tenant.limits.maxDevices} max</span>
                </div>
                <div className="flex justify-between">
                  <span>Monthly Messages:</span>
                  <span className="font-bold text-slate-800">{tenant.limits.maxMessagesPerMonth} msgs</span>
                </div>
                <div className="flex justify-between">
                  <span>AI Credits:</span>
                  <span className="font-bold text-slate-800">{tenant.limits.maxAiCredits} quota</span>
                </div>
                <div className="flex justify-between">
                  <span>Storage:</span>
                  <span className="font-bold text-slate-800">{tenant.limits.maxStorageMb} MB</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Reports & Security */}
        <div className="md:col-span-2 flex flex-col gap-6">
          {/* Daily Usage Report */}
          {user?.tenantId && (
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
              <div className="flex justify-between items-center mb-5">
                <div>
                  <h3 className="text-base font-extrabold text-slate-800 flex items-center gap-1.5">
                    <FileText size={18} className="text-indigo-600" />
                    Daily Messaging Report
                  </h3>
                  <p className="text-slate-500 text-xs mt-0.5 font-medium">Your plan's reset schedule applies daily at midnight UTC.</p>
                </div>
                <button
                  onClick={fetchDailyStats}
                  disabled={statsLoading}
                  className="p-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-500 hover:text-indigo-600 disabled:opacity-50 cursor-pointer transition-colors"
                  title="Refresh usage stats"
                >
                  <RefreshCw size={14} className={statsLoading ? 'animate-spin' : ''} />
                </button>
              </div>

              {statsLoading ? (
                <div className="flex justify-center items-center py-6">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent"></div>
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  <div className="flex justify-between items-baseline">
                    <span className="text-3xl font-black text-slate-800">{todaySentCount} <span className="text-xs text-slate-400 font-bold">sent today</span></span>
                    <span className="text-sm font-bold text-slate-500">Quota: {dailyLimit} / day</span>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full bg-slate-100 h-3.5 rounded-full overflow-hidden relative">
                    <div
                      style={{ width: `${percentUsed}%` }}
                      className={`h-full transition-all duration-500 rounded-full bg-gradient-to-r ${
                        percentUsed > 85 ? 'from-amber-500 to-red-500' : 'from-indigo-500 to-indigo-600'
                      }`}
                    ></div>
                  </div>

                  <div className="flex justify-between text-xs text-slate-400 font-semibold mt-1">
                    <span>{percentUsed}% Quota Consumed</span>
                    <span>{dailyLimit - todaySentCount} messages remaining</span>
                  </div>

                  {percentUsed >= 100 && (
                    <div className="p-3.5 rounded-2xl border border-red-200 bg-red-50 text-red-655 text-xs font-semibold flex items-center gap-2 mt-2">
                      <AlertCircle size={16} /> Daily quota limit has been exhausted. System is locking messaging until the daily reset.
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* API & Webhooks Integration */}
          {tenant && (
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
              <h3 className="text-base font-extrabold text-slate-800 flex items-center gap-1.5 mb-2">
                <Shield size={18} className="text-indigo-600" />
                Developer API & Webhooks
              </h3>
              <p className="text-slate-500 text-xs font-semibold mb-5">
                Integrate external platforms (Shopify, Zapier) to automate WhatsApp flows.
              </p>

              <div className="flex flex-col gap-4">
                {/* API Key */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">API Key / Token</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      readOnly
                      value={tenant.apiKey || 'No API Key generated.'}
                      className="flex-1 px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 text-xs font-mono font-bold focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(tenant.apiKey || '');
                        alert('API Key copied to clipboard!');
                      }}
                      className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold border border-slate-200 cursor-pointer"
                    >
                      Copy
                    </button>
                  </div>
                </div>

                {/* Webhook Endpoint */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">Trigger Webhook URL</label>
                  <input
                    type="text"
                    readOnly
                    value={`${window.location.origin.replace(':3000', ':5000')}/api/webhooks/trigger?apiKey=${tenant.apiKey || ''}`}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 text-xs font-mono font-bold focus:outline-none"
                  />
                </div>

                {/* Sample payload */}
                <div className="bg-slate-950 rounded-2xl p-4 text-[10px] font-mono text-emerald-400 overflow-x-auto">
                  <span className="text-slate-500 block mb-1">// POST request body schema:</span>
                  {JSON.stringify({
                    phone: "1234567890",
                    name: "John Doe",
                    flowId: "FLOW_ID_HERE",
                    variables: {
                      order_id: "1001",
                      item: "Laptop"
                    }
                  }, null, 2)}
                </div>
              </div>
            </div>
          )}

          {/* Change Password Portal */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
            <h3 className="text-base font-extrabold text-slate-800 flex items-center gap-1.5 mb-5">
              <Key size={18} className="text-indigo-600" />
              Change Password Portal
            </h3>

            {error && (
              <div className="p-3.5 rounded-xl border border-red-200 bg-red-50 text-red-655 text-xs font-semibold flex items-center gap-2 mb-4">
                <AlertCircle size={16} /> {error}
              </div>
            )}

            {success && (
              <div className="p-3.5 rounded-xl border border-emerald-250 bg-emerald-50 text-emerald-700 text-xs font-semibold flex items-center gap-2 mb-4">
                <CheckCircle size={16} /> {success}
              </div>
            )}

            <form onSubmit={handleChangePassword} className="flex flex-col gap-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">Current Password</label>
                  <input
                    type="password"
                    required
                    value={oldPassword}
                    onChange={(e) => setOldPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 focus:outline-none focus:border-indigo-600 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">New Password</label>
                  <input
                    type="password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 focus:outline-none focus:border-indigo-600 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">Confirm New Password</label>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 focus:outline-none focus:border-indigo-600 text-sm"
                />
              </div>

              <div className="flex items-center justify-end mt-2">
                <button
                  type="submit"
                  disabled={passwordLoading}
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 text-white text-xs font-bold flex items-center gap-2 cursor-pointer transition-colors shadow-md shadow-indigo-600/10"
                >
                  {passwordLoading ? 'Saving changes...' : 'Save New Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
