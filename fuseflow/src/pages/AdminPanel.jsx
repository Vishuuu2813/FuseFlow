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
  Trash2,
  Edit2,
  Lock,
  UserPlus,
  Plus,
  Coins,
  Settings
} from 'lucide-react';

const AdminPanel = () => {
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalTenants: 0,
    totalSessions: 0,
    totalMessages: 0
  });

  const [activeTab, setActiveTab] = useState('stats'); // 'stats', 'users', 'tenants', 'plans'
  const [users, setUsers] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [plans, setPlans] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  // User Modals / States
  const [editingUser, setEditingUser] = useState(null);
  const [newUserRole, setNewUserRole] = useState('Employee');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [showCreateUserModal, setShowCreateUserModal] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPass, setNewUserPass] = useState('');
  const [newUserRoleField, setNewUserRoleField] = useState('Employee');
  const [newUserTenantId, setNewUserTenantId] = useState('');

  // Tenant Plan Assignment Modal / States
  const [assigningTenant, setAssigningTenant] = useState(null);
  const [selectedPlanId, setSelectedPlanId] = useState('');

  // Plan Modals / States
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

      const usersRes = await api.get('/admin/users');
      setUsers(usersRes.data);

      const tenantsRes = await api.get('/admin/tenants');
      setTenants(tenantsRes.data);

      const plansRes = await api.get('/admin/plans');
      setPlans(plansRes.data);
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

  const handleCreateUserSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      const { data } = await api.post('/admin/users', {
        name: newUserName,
        email: newUserEmail,
        password: newUserPass,
        role: newUserRoleField,
        tenantId: newUserTenantId || null
      });

      setUsers((prev) => [data, ...prev]);
      
      setNewUserName('');
      setNewUserEmail('');
      setNewUserPass('');
      setNewUserRoleField('Employee');
      setNewUserTenantId('');
      
      setShowCreateUserModal(false);
      setSuccess('New user account created successfully.');
      
      const statsRes = await api.get('/admin/stats');
      setStats(statsRes.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create user account.');
    }
  };

  // Plan actions
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

  const handleAssignPlanSubmit = async (e) => {
    e.preventDefault();
    if (!selectedPlanId || !assigningTenant) return;
    try {
      const { data } = await api.put(`/admin/tenants/${assigningTenant._id}/plan`, { planId: selectedPlanId });
      setTenants((prev) => prev.map((t) => (t._id === assigningTenant._id ? data : t)));
      setAssigningTenant(null);
      setSuccess('Plan assigned and tenant limits updated successfully.');
    } catch (err) {
      setError('Failed to assign plan to tenant.');
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
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">Admin Command Center</h1>
          <p className="text-slate-400 text-sm mt-1">Global platform metrics, tenant plans, user management, and plan creation.</p>
        </div>
        <div className="flex items-center gap-2">
          {activeTab === 'users' && (
            <button
              onClick={() => setShowCreateUserModal(true)}
              className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 text-xs font-bold flex items-center gap-2 cursor-pointer shadow-lg shadow-emerald-500/20 transition-all hover:scale-[1.02]"
            >
              <UserPlus size={14} /> Create User Account
            </button>
          )}
          {activeTab === 'plans' && (
            <button
              onClick={() => setShowCreatePlanModal(true)}
              className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 text-xs font-bold flex items-center gap-2 cursor-pointer shadow-lg shadow-emerald-500/20 transition-all hover:scale-[1.02]"
            >
              <Plus size={14} /> Create Plan
            </button>
          )}
        </div>
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

      {/* Tabs Menu */}
      <div className="flex gap-2 border-b border-white/5 pb-2">
        <button
          onClick={() => setActiveTab('stats')}
          className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all ${
            activeTab === 'stats' ? 'bg-slate-800 text-white' : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          Overview & Security
        </button>
        <button
          onClick={() => setActiveTab('tenants')}
          className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all ${
            activeTab === 'tenants' ? 'bg-slate-800 text-white' : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          Workspaces (Tenants)
        </button>
        <button
          onClick={() => setActiveTab('users')}
          className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all ${
            activeTab === 'users' ? 'bg-slate-800 text-white' : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          System Users
        </button>
        <button
          onClick={() => setActiveTab('plans')}
          className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all ${
            activeTab === 'plans' ? 'bg-slate-800 text-white' : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          Pricing Plans
        </button>
      </div>

      {/* Tab: Overview & Security */}
      {activeTab === 'stats' && (
        <div className="flex flex-col gap-8">
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

          <div className="max-w-md backdrop-blur-md bg-slate-900/20 border border-white/5 rounded-3xl p-6 flex flex-col gap-4">
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
                className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold cursor-pointer transition-colors mt-2"
              >
                Change Admin Password
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Tab: Tenants */}
      {activeTab === 'tenants' && (
        <div className="backdrop-blur-md bg-slate-900/20 border border-white/5 rounded-3xl p-6 flex flex-col gap-4">
          <h2 className="text-base font-bold text-slate-200">Active Workspaces (Tenants)</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {tenants.map((t) => (
              <div key={t._id} className="p-5 rounded-2xl bg-slate-950/40 border border-white/5 flex flex-col justify-between gap-4">
                <div>
                  <h4 className="font-bold text-slate-200 text-sm">{t.companyName || t.name}</h4>
                  <span className="inline-block px-2.5 py-0.5 rounded-full text-[9px] font-extrabold uppercase bg-emerald-500/10 text-emerald-400 mt-2">
                    {t.plan || 'Free'} Plan
                  </span>
                  
                  <div className="mt-4 flex flex-col gap-1.5 text-xs text-slate-400">
                    <div className="flex justify-between border-b border-white/5 pb-1">
                      <span>WhatsApp Devices Limit:</span>
                      <span className="font-semibold text-slate-200">{t.limits?.maxDevices || 1}</span>
                    </div>
                    <div className="flex justify-between border-b border-white/5 pb-1">
                      <span>Monthly Messages limit:</span>
                      <span className="font-semibold text-slate-200">{t.limits?.maxMessagesPerMonth || 500}</span>
                    </div>
                    <div className="flex justify-between border-b border-white/5 pb-1">
                      <span>AI Credits Limit:</span>
                      <span className="font-semibold text-slate-200">{t.limits?.maxAiCredits || 50}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Storage Allocation:</span>
                      <span className="font-semibold text-slate-200">{t.limits?.maxStorageMb || 100} MB</span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setAssigningTenant(t);
                    setSelectedPlanId('');
                  }}
                  className="w-full py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-colors"
                >
                  <Settings size={14} /> Assign / Change Plan
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab: Users */}
      {activeTab === 'users' && (
        <div className="backdrop-blur-md bg-slate-900/20 border border-white/5 rounded-3xl p-6 flex flex-col gap-6">
          <div className="flex justify-between items-center">
            <h2 className="text-base font-bold text-slate-200">Global Users Directory</h2>
            <div className="relative w-64">
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
                  <th className="pb-3 font-semibold">Tenant Name</th>
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
                      {user.tenantId?.companyName || user.tenantId?.name || 'Global Admin'}
                    </td>
                    <td className="py-4">
                      <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
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
      )}

      {/* Tab: Plans */}
      {activeTab === 'plans' && (
        <div className="backdrop-blur-md bg-slate-900/20 border border-white/5 rounded-3xl p-6 flex flex-col gap-4">
          <h2 className="text-base font-bold text-slate-200">Subscription Plans Catalog</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {plans.map((p) => (
              <div key={p._id} className="p-5 rounded-2xl bg-slate-950/40 border border-white/5 flex flex-col justify-between gap-4">
                <div>
                  <h4 className="font-bold text-slate-200 text-base">{p.name}</h4>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className="text-xl font-extrabold text-indigo-400">${p.price}</span>
                    <span className="text-[10px] text-slate-500">/ month</span>
                  </div>
                  
                  <div className="mt-4 flex flex-col gap-1.5 text-xs text-slate-400">
                    <div className="flex justify-between border-b border-white/5 pb-1">
                      <span>WhatsApp Devices Limit:</span>
                      <span className="font-semibold text-slate-200">{p.deviceLimit}</span>
                    </div>
                    <div className="flex justify-between border-b border-white/5 pb-1">
                      <span>Monthly Messages limit:</span>
                      <span className="font-semibold text-slate-200">{p.maxMessagesPerMonth}</span>
                    </div>
                    <div className="flex justify-between border-b border-white/5 pb-1">
                      <span>AI Credits Limit:</span>
                      <span className="font-semibold text-slate-200">{p.maxAiCredits}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Storage Allocation:</span>
                      <span className="font-semibold text-slate-200">{p.maxStorageMb} MB</span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => handleDeletePlan(p._id)}
                  className="w-full py-2 rounded-xl bg-red-500/5 hover:bg-red-500/10 border border-red-500/10 text-red-500 font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-colors"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <form onSubmit={handleCreatePlanSubmit} className="w-full max-w-md backdrop-blur-xl bg-slate-900 border border-white/5 shadow-2xl rounded-3xl p-6 flex flex-col gap-5">
            <div>
              <h3 className="text-base font-bold text-slate-200">Create Pricing Plan</h3>
              <p className="text-slate-500 text-xs mt-1">Configure name, monthly price, limits and allowances.</p>
            </div>

            <div className="grid grid-cols-2 gap-3.5">
              <div className="col-span-2">
                <label className="block text-xs font-semibold text-slate-400 mb-1">Plan Name</label>
                <input
                  type="text"
                  required
                  placeholder="Enterprise Pro"
                  value={planName}
                  onChange={(e) => setPlanName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950/50 border border-white/5 text-slate-200 focus:outline-none focus:border-emerald-500 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Price (USD)</label>
                <input
                  type="number"
                  required
                  value={planPrice}
                  onChange={(e) => setPlanPrice(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950/50 border border-white/5 text-slate-200 focus:outline-none focus:border-emerald-500 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">WhatsApp Devices</label>
                <input
                  type="number"
                  required
                  value={planDeviceLimit}
                  onChange={(e) => setPlanDeviceLimit(parseInt(e.target.value) || 1)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950/50 border border-white/5 text-slate-200 focus:outline-none focus:border-emerald-500 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Max Contacts</label>
                <input
                  type="number"
                  required
                  value={planMaxContacts}
                  onChange={(e) => setPlanMaxContacts(parseInt(e.target.value) || 1000)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950/50 border border-white/5 text-slate-200 focus:outline-none focus:border-emerald-500 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Messages / Month</label>
                <input
                  type="number"
                  required
                  value={planMaxMessages}
                  onChange={(e) => setPlanMaxMessages(parseInt(e.target.value) || 500)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950/50 border border-white/5 text-slate-200 focus:outline-none focus:border-emerald-500 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">AI Credits / Month</label>
                <input
                  type="number"
                  required
                  value={planMaxAi}
                  onChange={(e) => setPlanMaxAi(parseInt(e.target.value) || 50)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950/50 border border-white/5 text-slate-200 focus:outline-none focus:border-emerald-500 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Storage Allocation (MB)</label>
                <input
                  type="number"
                  required
                  value={planMaxStorage}
                  onChange={(e) => setPlanMaxStorage(parseInt(e.target.value) || 100)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950/50 border border-white/5 text-slate-200 focus:outline-none focus:border-emerald-500 text-xs"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 mt-2">
              <button
                type="button"
                onClick={() => setShowCreatePlanModal(false)}
                className="px-4 py-2 rounded-xl text-slate-400 hover:bg-slate-800 text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 text-xs font-bold cursor-pointer transition-all"
              >
                Save Plan
              </button>
            </div>
          </form>
        </div>
      )}

      {/* PLAN ASSIGNMENT MODAL */}
      {assigningTenant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <form onSubmit={handleAssignPlanSubmit} className="w-full max-w-md backdrop-blur-xl bg-slate-900 border border-white/5 shadow-2xl rounded-3xl p-6 flex flex-col gap-5">
            <div>
              <h3 className="text-base font-bold text-slate-200">Assign Subscription Plan</h3>
              <p className="text-slate-500 text-xs mt-1">Select a custom package to apply to {assigningTenant.companyName || assigningTenant.name}.</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">Select Plan</label>
              <select
                required
                value={selectedPlanId}
                onChange={(e) => setSelectedPlanId(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-slate-950/50 border border-white/5 text-slate-300 focus:outline-none text-xs"
              >
                <option value="">-- Choose Plan --</option>
                {plans.map((p) => (
                  <option key={p._id} value={p._id}>
                    {p.name} (${p.price}/mo)
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center justify-end gap-3 mt-2">
              <button
                type="button"
                onClick={() => setAssigningTenant(null)}
                className="px-4 py-2 rounded-xl text-slate-400 hover:bg-slate-800 text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 text-xs font-bold cursor-pointer transition-all"
              >
                Assign Plan
              </button>
            </div>
          </form>
        </div>
      )}

      {/* CREATE USER MODAL */}
      {showCreateUserModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <form onSubmit={handleCreateUserSubmit} className="w-full max-w-md backdrop-blur-xl bg-slate-900 border border-white/5 shadow-2xl rounded-3xl p-6 flex flex-col gap-5">
            <div>
              <h3 className="text-base font-bold text-slate-200">Create New Account</h3>
              <p className="text-slate-500 text-xs mt-1">Register a new user or administrative role directly.</p>
            </div>

            <div className="flex flex-col gap-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="John Doe"
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950/50 border border-white/5 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-emerald-500 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  placeholder="john@example.com"
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950/50 border border-white/5 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-emerald-500 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Secure Password</label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={newUserPass}
                  onChange={(e) => setNewUserPass(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950/50 border border-white/5 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-emerald-500 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">System Role</label>
                <select
                  value={newUserRoleField}
                  onChange={(e) => setNewUserRoleField(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950/50 border border-white/5 text-slate-400 focus:outline-none text-xs"
                >
                  <option value="Employee">Employee</option>
                  <option value="Manager">Manager</option>
                  <option value="Admin">Admin</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Assign Workspace (Tenant)</label>
                <select
                  value={newUserTenantId}
                  onChange={(e) => setNewUserTenantId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950/50 border border-white/5 text-slate-400 focus:outline-none text-xs"
                >
                  <option value="">None - Global Admin (Manage All)</option>
                  {tenants.map((t) => (
                    <option key={t._id} value={t._id}>
                      {t.companyName || t.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 mt-2">
              <button
                type="button"
                onClick={() => setShowCreateUserModal(false)}
                className="px-4 py-2 rounded-xl text-slate-400 hover:bg-slate-800 text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 text-xs font-bold cursor-pointer transition-all"
              >
                Create Account
              </button>
            </div>
          </form>
        </div>
      )}

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
    </div>
  );
};

export default AdminPanel;
