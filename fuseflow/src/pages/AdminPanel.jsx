import React, { useEffect, useState } from 'react';
import api from '../services/api';
import {
  Users,
  Shield,
  Layers,
  Database,
  Search,
  CheckCircle,
  XCircle,
  Key,
  Trash2,
  Edit2,
  Lock,
  UserPlus
} from 'lucide-react';
import { motion } from 'framer-motion';

const AdminPanel = () => {
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalTenants: 0,
    totalSessions: 0,
    totalMessages: 0
  });

  const [users, setUsers] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modals / Selection states
  const [editingUser, setEditingUser] = useState(null);
  const [editingTenant, setEditingTenant] = useState(null);
  const [newUserRole, setNewUserRole] = useState('Employee');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [tenantDeviceLimit, setTenantDeviceLimit] = useState(3);
  const [tenantMaxContacts, setTenantMaxContacts] = useState(10000);
  const [tenantPlan, setTenantPlan] = useState('Professional');
  
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

      const usersRes = await api.get('/admin/users');
      setUsers(usersRes.data);

      const tenantsRes = await api.get('/admin/tenants');
      setTenants(tenantsRes.data);
    } catch (err) {
      setError('Access Denied or failed to load administrative records.');
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, []);

  const handleToggleUserActive = async (userId, currentStatus) => {
    try {
      const { data } = await api.put(`/admin/users/${userId}/status`, { isActive: !currentStatus });
      setUsers((prev) => prev.map((u) => (u._id === userId ? { ...u, isActive: data.isActive } : u)));
      setSuccess('User status updated successfully.');
    } catch (err) {
      setError('Failed to update user status.');
    }
  };

  const handleUpdateRole = async (userId) => {
    try {
      const { data } = await api.put(`/admin/users/${userId}/role`, { role: newUserRole });
      setUsers((prev) => prev.map((u) => (u._id === userId ? { ...u, role: data.role } : u)));
      setEditingUser(null);
      setSuccess('User role updated successfully.');
    } catch (err) {
      setError('Failed to update user role.');
    }
  };

  const handleChangeUserPassword = async (userId) => {
    if (!newUserPassword) return;
    try {
      await api.put(`/admin/users/${userId}/password`, { password: newUserPassword });
      setNewUserPassword('');
      setEditingUser(null);
      setSuccess('User password changed successfully.');
    } catch (err) {
      setError('Failed to change user password.');
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm('Are you sure you want to delete this user? This cannot be undone.')) return;
    try {
      await api.delete(`/admin/users/${userId}`);
      setUsers((prev) => prev.filter((u) => u._id !== userId));
      setSuccess('User deleted successfully.');
    } catch (err) {
      setError('Failed to delete user.');
    }
  };

  const handleUpdateTenantLimits = async (tenantId) => {
    try {
      const { data } = await api.put(`/admin/tenants/${tenantId}/limits`, {
        deviceLimit: tenantDeviceLimit,
        maxContacts: tenantMaxContacts,
        plan: tenantPlan
      });
      setTenants((prev) => prev.map((t) => (t._id === tenantId ? data : t)));
      setEditingTenant(null);
      setSuccess('Tenant limits and plan updated successfully.');
    } catch (err) {
      setError('Failed to update tenant limits.');
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

  const filteredUsers = users.filter(
    (u) =>
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex flex-col gap-8 pb-12">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">Admin Command Center</h1>
        <p className="text-slate-400 text-sm mt-1">Global platform metrics, tenant limits, roles management, and access controls.</p>
      </div>

      {error && (
        <div className="p-3 rounded-xl border border-red-500/20 bg-red-500/5 text-red-400 text-xs font-medium">
          {error}
        </div>
      )}

      {success && (
        <div className="p-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 text-emerald-400 text-xs font-medium">
          {success}
        </div>
      )}

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="backdrop-blur-md bg-slate-900/40 border border-white/5 p-6 rounded-2xl flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Registered Users</span>
            <p className="text-2xl font-bold text-slate-200 mt-1">{stats.totalUsers}</p>
          </div>
          <div className="p-3 rounded-xl bg-indigo-500/10 text-indigo-400"><Users size={20} /></div>
        </div>

        <div className="backdrop-blur-md bg-slate-900/40 border border-white/5 p-6 rounded-2xl flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Active Tenants</span>
            <p className="text-2xl font-bold text-slate-200 mt-1">{stats.totalTenants}</p>
          </div>
          <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-400"><Layers size={20} /></div>
        </div>

        <div className="backdrop-blur-md bg-slate-900/40 border border-white/5 p-6 rounded-2xl flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">WhatsApp Devices</span>
            <p className="text-2xl font-bold text-slate-200 mt-1">{stats.totalSessions}</p>
          </div>
          <div className="p-3 rounded-xl bg-amber-500/10 text-amber-400"><Shield size={20} /></div>
        </div>

        <div className="backdrop-blur-md bg-slate-900/40 border border-white/5 p-6 rounded-2xl flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Messages Logged</span>
            <p className="text-2xl font-bold text-slate-200 mt-1">{stats.totalMessages}</p>
          </div>
          <div className="p-3 rounded-xl bg-purple-500/10 text-purple-400"><Database size={20} /></div>
        </div>
      </div>

      {/* Main Tabs Container */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        
        {/* Users & Roles Section (2 columns width) */}
        <div className="xl:col-span-2 backdrop-blur-md bg-slate-900/20 border border-white/5 rounded-3xl p-6 flex flex-col gap-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <h2 className="text-base font-bold text-slate-200">Global Users Directory</h2>
            
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-2.5 text-slate-500" size={16} />
              <input
                type="text"
                placeholder="Search name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-950/50 border border-white/5 text-slate-300 placeholder-slate-500 focus:outline-none focus:border-emerald-500 text-xs"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-white/5 text-slate-500">
                  <th className="pb-3 font-semibold">User Details</th>
                  <th className="pb-3 font-semibold">Tenant ID</th>
                  <th className="pb-3 font-semibold">Role</th>
                  <th className="pb-3 font-semibold">Access</th>
                  <th className="pb-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredUsers.map((user) => (
                  <tr key={user._id} className="text-slate-300">
                    <td className="py-4">
                      <div className="font-semibold text-slate-200">{user.name}</div>
                      <div className="text-[10px] text-slate-500">{user.email}</div>
                    </td>
                    <td className="py-4 font-mono text-[10px] text-slate-400">
                      {user.tenantId?._id || user.tenantId || 'Super Admin'}
                    </td>
                    <td className="py-4">
                      <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                        user.role === 'Super Admin' ? 'bg-purple-500/10 text-purple-400' :
                        user.role === 'Admin' ? 'bg-indigo-500/10 text-indigo-400' : 'bg-slate-800 text-slate-400'
                      }`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="py-4">
                      <button
                        onClick={() => handleToggleUserActive(user._id, user.isActive)}
                        className={`flex items-center gap-1.5 cursor-pointer font-medium ${
                          user.isActive ? 'text-emerald-400' : 'text-red-400'
                        }`}
                      >
                        {user.isActive ? <CheckCircle size={14} /> : <XCircle size={14} />}
                        {user.isActive ? 'Active' : 'Banned'}
                      </button>
                    </td>
                    <td className="py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => {
                            setEditingUser(user);
                            setNewUserRole(user.role);
                          }}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
                        >
                          <Edit2 size={12} />
                        </button>
                        <button
                          onClick={() => handleDeleteUser(user._id)}
                          className="p-1.5 rounded-lg bg-red-500/5 hover:bg-red-500/10 border border-red-500/10 text-red-500 cursor-pointer"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Admin Self & Tenant Plans Config Column */}
        <div className="flex flex-col gap-8">
          
          {/* Admin Password Change Form */}
          <div className="backdrop-blur-md bg-slate-900/20 border border-white/5 rounded-3xl p-6 flex flex-col gap-4">
            <h2 className="text-base font-bold text-slate-200 flex items-center gap-2">
              <Lock size={16} className="text-amber-400" /> Security Settings
            </h2>
            <p className="text-slate-500 text-xs leading-relaxed">Update your administrator password here regularly.</p>
            
            <form onSubmit={handleAdminChangePassword} className="flex flex-col gap-3.5 mt-2">
              <div>
                <label className="block text-[10px] font-semibold text-slate-500 mb-1">Current Password</label>
                <input
                  type="password"
                  required
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950/50 border border-white/5 text-slate-300 focus:outline-none focus:border-emerald-500 text-xs"
                />
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-slate-500 mb-1">New Password</label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950/50 border border-white/5 text-slate-300 focus:outline-none focus:border-emerald-500 text-xs"
                />
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-slate-500 mb-1">Confirm New Password</label>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950/50 border border-white/5 text-slate-300 focus:outline-none focus:border-emerald-500 text-xs"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold cursor-pointer transition-colors mt-2"
              >
                Change Admin Password
              </button>
            </form>
          </div>

          {/* Tenants Subscription Lists */}
          <div className="backdrop-blur-md bg-slate-900/20 border border-white/5 rounded-3xl p-6 flex flex-col gap-4">
            <h2 className="text-base font-bold text-slate-200">Subscription Plans</h2>
            <div className="flex flex-col gap-4 mt-2">
              {tenants.map((tenant) => (
                <div key={tenant._id} className="p-4 rounded-2xl bg-slate-950/40 border border-white/5 flex items-center justify-between">
                  <div>
                    <h4 className="font-semibold text-slate-300 text-xs">{tenant.companyName || 'Business Organization'}</h4>
                    <span className="text-[9px] uppercase tracking-wider font-bold text-indigo-400 mt-1 block">
                      {tenant.plan || 'Free'} Plan
                    </span>
                    <span className="text-[10px] text-slate-500 mt-1 block">
                      Devices: {tenant.deviceLimit} | Max Contacts: {tenant.maxContacts}
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      setEditingTenant(tenant);
                      setTenantDeviceLimit(tenant.deviceLimit);
                      setTenantMaxContacts(tenant.maxContacts);
                      setTenantPlan(tenant.plan || 'Professional');
                    }}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
                  >
                    <Edit2 size={12} />
                  </button>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>

      {/* User Editing Modal */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md backdrop-blur-xl bg-slate-900 border border-white/5 shadow-2xl rounded-3xl p-6 flex flex-col gap-6">
            <div>
              <h3 className="text-base font-bold text-slate-200">Edit Credentials: {editingUser.name}</h3>
              <p className="text-slate-500 text-xs mt-1">Change user role or reset password directly.</p>
            </div>

            <div className="flex flex-col gap-4">
              {/* Role setting */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">User System Role</label>
                <select
                  value={newUserRole}
                  onChange={(e) => setNewUserRole(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950/50 border border-white/5 text-slate-400 focus:outline-none focus:border-emerald-500 text-xs"
                >
                  <option value="Employee">Employee</option>
                  <option value="Manager">Manager</option>
                  <option value="Admin">Admin</option>
                  <option value="Super Admin">Super Admin</option>
                </select>
                <button
                  onClick={() => handleUpdateRole(editingUser._id)}
                  className="mt-2.5 px-4 py-2 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-slate-950 text-xs font-bold cursor-pointer transition-colors"
                >
                  Update Role
                </button>
              </div>

              <hr className="border-white/5 my-1" />

              {/* Password Setting */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">Force Password Reset</label>
                <input
                  type="password"
                  placeholder="Enter new secure password..."
                  value={newUserPassword}
                  onChange={(e) => setNewUserPassword(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950/50 border border-white/5 text-slate-300 focus:outline-none focus:border-emerald-500 text-xs"
                />
                <button
                  onClick={() => handleChangeUserPassword(editingUser._id)}
                  className="mt-2.5 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 text-xs font-bold cursor-pointer transition-colors"
                >
                  Change Password
                </button>
              </div>
            </div>

            <button
              onClick={() => setEditingUser(null)}
              className="text-center text-xs text-slate-500 hover:text-slate-300 mt-2 cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Tenant Editing Modal */}
      {editingTenant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md backdrop-blur-xl bg-slate-900 border border-white/5 shadow-2xl rounded-3xl p-6 flex flex-col gap-6">
            <div>
              <h3 className="text-base font-bold text-slate-200">Edit Tier: {editingTenant.companyName}</h3>
              <p className="text-slate-500 text-xs mt-1">Configure maximum active devices and limits.</p>
            </div>

            <div className="flex flex-col gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">Subscription Plan</label>
                <select
                  value={tenantPlan}
                  onChange={(e) => setTenantPlan(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950/50 border border-white/5 text-slate-400 focus:outline-none text-xs"
                >
                  <option value="Basic">Basic</option>
                  <option value="Professional">Professional</option>
                  <option value="Enterprise">Enterprise</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">Device Limit (Active Sessions)</label>
                <input
                  type="number"
                  value={tenantDeviceLimit}
                  onChange={(e) => setTenantDeviceLimit(parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950/50 border border-white/5 text-slate-300 focus:outline-none text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">Max Contact Records Allowed</label>
                <input
                  type="number"
                  value={tenantMaxContacts}
                  onChange={(e) => setTenantMaxContacts(parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950/50 border border-white/5 text-slate-300 focus:outline-none text-xs"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 mt-4">
              <button
                onClick={() => setEditingTenant(null)}
                className="px-4 py-2 rounded-xl text-slate-400 hover:bg-slate-800 text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => handleUpdateTenantLimits(editingTenant._id)}
                className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 text-xs font-bold cursor-pointer transition-all"
              >
                Save Limits
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;
