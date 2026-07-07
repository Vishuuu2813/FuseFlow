import React, { useEffect, useState } from 'react';
import api from '../services/api';
import {
  Users,
  Shield,
  Layers,
  Database,
  Lock
} from 'lucide-react';

const AdminPanel = () => {
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalTenants: 0,
    totalSessions: 0,
    totalMessages: 0
  });

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
    } catch (err) {
      setError('Access Denied or failed to load administrative records.');
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, []);

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
          <p className="text-slate-500 text-sm mt-1">Global platform metrics and security credential settings.</p>
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

      <div className="flex flex-col gap-8">
        {/* Global Statistics Grid */}
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

        {/* Security Settings Section */}
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
    </div>
  );
};

export default AdminPanel;
