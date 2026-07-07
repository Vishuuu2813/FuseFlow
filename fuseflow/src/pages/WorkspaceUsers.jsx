import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  Users,
  Search,
  CheckCircle,
  XCircle,
  Trash2,
  Edit2,
  UserPlus,
  Wifi,
  WifiOff,
  Briefcase
} from 'lucide-react';

const WorkspaceUsers = () => {
  const { user: currentUser } = useAuth();
  const isGlobalAdmin = !currentUser?.tenantId;

  const [users, setUsers] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modals / forms
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPass, setNewUserPass] = useState('');
  const [newUserRole, setNewUserRole] = useState('Employee');
  const [newUserTenantId, setNewUserTenantId] = useState('');

  // Editing values
  const [editRole, setEditRole] = useState('Employee');
  const [editTenantId, setEditTenantId] = useState('');
  const [editPassword, setEditPassword] = useState('');
  
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchUsersData = async () => {
    try {
      if (isGlobalAdmin) {
        // Global Admin fetches all users and tenants
        const usersRes = await api.get('/admin/users');
        setUsers(usersRes.data);

        const tenantsRes = await api.get('/admin/tenants');
        setTenants(tenantsRes.data);
      } else {
        // Workspace admin fetches local users and active WhatsApp sessions
        const usersRes = await api.get('/auth/users');
        setUsers(usersRes.data);

        const sessionsRes = await api.get('/sessions');
        setSessions(sessionsRes.data);
      }
    } catch (err) {
      setError('Failed to retrieve directory records.');
    }
  };

  useEffect(() => {
    fetchUsersData();
  }, [isGlobalAdmin]);

  const handleToggleUserActive = async (userId, currentStatus) => {
    try {
      const endpoint = isGlobalAdmin ? `/admin/users/${userId}/status` : `/auth/users/${userId}`;
      const { data } = await api.put(endpoint, { isActive: !currentStatus });
      setUsers((prev) => prev.map((u) => (u._id === userId ? { ...u, isActive: data.isActive } : u)));
      setSuccess('User active state updated successfully.');
    } catch (err) {
      setError('Failed to update user active state.');
    }
  };

  const handleEditUserSubmit = async (e) => {
    e.preventDefault();
    if (!editingUser) return;
    setError('');
    setSuccess('');
    try {
      if (isGlobalAdmin) {
        // Global admin update: Role, Workspace alignment, and optional password force change
        await api.put(`/admin/users/${editingUser._id}/role`, { role: editRole });
        
        // Note: Global admin can assign workspace by changing the user's tenantId directly on User model
        // Let's call the status update endpoint to align or we can update the role.
        // If password is set, force reset it
        if (editPassword) {
          await api.put(`/admin/users/${editingUser._id}/password`, { password: editPassword });
        }

        setSuccess('User updated successfully.');
      } else {
        // Local Workspace Admin update: Role only
        await api.put(`/auth/users/${editingUser._id}`, { role: editRole });
        setSuccess('Team member role updated.');
      }

      setEditingUser(null);
      setEditPassword('');
      fetchUsersData();
    } catch (err) {
      setError('Failed to update user profile.');
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm('Are you sure you want to delete this user from the system?')) return;
    try {
      const endpoint = isGlobalAdmin ? `/admin/users/${userId}` : `/auth/users/${userId}`;
      await api.delete(endpoint);
      setUsers((prev) => prev.filter((u) => u._id !== userId));
      setSuccess('User successfully deleted.');
    } catch (err) {
      setError('Failed to delete user.');
    }
  };

  const handleAddUserSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      let data;
      if (isGlobalAdmin) {
        const res = await api.post('/admin/users', {
          name: newUserName,
          email: newUserEmail,
          password: newUserPass,
          role: newUserRole,
          tenantId: newUserTenantId || null
        });
        data = res.data;
      } else {
        const res = await api.post('/auth/users', {
          name: newUserName,
          email: newUserEmail,
          password: newUserPass,
          role: newUserRole
        });
        data = res.data;
      }

      setUsers((prev) => [data, ...prev]);
      
      setNewUserName('');
      setNewUserEmail('');
      setNewUserPass('');
      setNewUserRole('Employee');
      setNewUserTenantId('');
      
      setShowAddModal(false);
      setSuccess('User added successfully.');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to register user.');
    }
  };

  // Get live WhatsApp connectivity status for local workspace users
  const getUserConnectionStatus = (userEmail) => {
    const userSessions = sessions.filter(s => s.phoneNumber && s.status === 'CONNECTED');
    if (userSessions.length > 0) {
      return { connected: true, label: `${userSessions.length} Online` };
    }
    return { connected: false, label: 'Offline' };
  };

  const filteredUsers = users.filter(
    (u) =>
      u.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-800">
            {isGlobalAdmin ? 'Global Users Directory' : 'Team Members'}
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            {isGlobalAdmin
              ? 'Manage all administrative accounts, workspace members, access bans, and passwords.'
              : 'Collaborate with colleagues, define local role profiles, and check active devices.'}
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="px-4.5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold flex items-center gap-2 cursor-pointer transition-colors shadow-md shadow-emerald-600/10"
        >
          <UserPlus size={16} /> Add New User
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

      {/* Directory Table */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col gap-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h2 className="text-base font-bold text-slate-850">Registered Directory</h2>
          
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
            <input
              type="text"
              placeholder="Search users..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm rounded-xl bg-slate-50 border border-slate-200 text-slate-700 placeholder-slate-400 focus:outline-none focus:border-emerald-600"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400 font-bold text-xs uppercase tracking-wider">
                <th className="pb-3">User Details</th>
                {isGlobalAdmin && <th className="pb-3">Workspace (Tenant)</th>}
                <th className="pb-3">Security Role</th>
                {!isGlobalAdmin && <th className="pb-3">WA Device Connection</th>}
                <th className="pb-3">Account access</th>
                <th className="pb-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredUsers.map((member) => {
                const conn = getUserConnectionStatus(member.email);
                return (
                  <tr key={member._id} className="text-slate-700 hover:bg-slate-50/50">
                    <td className="py-4">
                      <div className="font-bold text-slate-850">{member.name}</div>
                      <div className="text-xs text-slate-400 font-medium">{member.email}</div>
                    </td>
                    {isGlobalAdmin && (
                      <td className="py-4 font-semibold text-slate-500">
                        {member.tenantId?.companyName || member.tenantId?.name || 'Global Admin'}
                      </td>
                    )}
                    <td className="py-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                        member.role === 'Admin' ? 'bg-indigo-50 text-indigo-700 border border-indigo-100' : 'bg-slate-100 text-slate-600 border border-slate-200'
                      }`}>
                        {member.role}
                      </span>
                    </td>
                    {!isGlobalAdmin && (
                      <td className="py-4">
                        <div className={`flex items-center gap-1.5 font-bold ${conn.connected ? 'text-emerald-650' : 'text-slate-400'}`}>
                          {conn.connected ? <Wifi size={15} /> : <WifiOff size={15} />}
                          {conn.label}
                        </div>
                      </td>
                    )}
                    <td className="py-4">
                      <button
                        onClick={() => handleToggleUserActive(member._id, member.isActive)}
                        className={`flex items-center gap-1.5 cursor-pointer font-bold text-xs ${
                          member.isActive ? 'text-emerald-600 hover:text-emerald-700' : 'text-red-500 hover:text-red-600'
                        }`}
                      >
                        {member.isActive ? <CheckCircle size={15} /> : <XCircle size={15} />}
                        {member.isActive ? 'ALLOWED' : 'BANNED'}
                      </button>
                    </td>
                    <td className="py-4 text-right">
                      <div className="flex items-center justify-end gap-2.5">
                        <button
                          onClick={() => {
                            setEditingUser(member);
                            setEditRole(member.role);
                            setEditTenantId(member.tenantId?._id || '');
                          }}
                          className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-800 border border-slate-200 cursor-pointer"
                        >
                          <Edit2 size={13} />
                        </button>
                        <button
                          onClick={() => handleDeleteUser(member._id)}
                          className="p-2 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 cursor-pointer"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ADD MEMBER MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-sm p-4">
          <form onSubmit={handleAddUserSubmit} className="w-full max-w-md bg-white border border-slate-200 shadow-2xl rounded-3xl p-6 flex flex-col gap-4.5">
            <div>
              <h3 className="text-lg font-bold text-slate-850">Create User Profile</h3>
              <p className="text-slate-500 text-sm mt-1">Fill credentials to register a user on the system.</p>
            </div>

            <div className="flex flex-col gap-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="Enter full name"
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-xl bg-slate-50 border border-slate-200 text-slate-700 focus:outline-none focus:border-emerald-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Email Address</label>
                <input
                  type="email"
                  required
                  placeholder="user@whatsflow.com"
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-xl bg-slate-50 border border-slate-200 text-slate-700 focus:outline-none focus:border-emerald-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Login Password</label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={newUserPass}
                  onChange={(e) => setNewUserPass(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-xl bg-slate-50 border border-slate-200 text-slate-700 focus:outline-none focus:border-emerald-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Permission Role</label>
                <select
                  value={newUserRole}
                  onChange={(e) => setNewUserRole(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-xl bg-slate-50 border border-slate-200 text-slate-700 focus:outline-none"
                >
                  <option value="Employee">Employee</option>
                  <option value="Manager">Manager</option>
                  <option value="Admin">Admin</option>
                </select>
              </div>

              {isGlobalAdmin && (
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Assign Workspace (Tenant)</label>
                  <select
                    value={newUserTenantId}
                    onChange={(e) => setNewUserTenantId(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-xl bg-slate-50 border border-slate-200 text-slate-700 focus:outline-none"
                  >
                    <option value="">None - Global Admin (Platform Scope)</option>
                    {tenants.map((t) => (
                      <option key={t._id} value={t._id}>
                        {t.companyName || t.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 mt-2">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 rounded-xl text-slate-500 hover:bg-slate-100 text-sm font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold cursor-pointer transition-colors"
              >
                Create Account
              </button>
            </div>
          </form>
        </div>
      )}

      {/* EDIT USER PROFILE MODAL */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-sm p-4">
          <form onSubmit={handleEditUserSubmit} className="w-full max-w-md bg-white border border-slate-200 shadow-2xl rounded-3xl p-6 flex flex-col gap-4.5">
            <div>
              <h3 className="text-lg font-bold text-slate-850">Edit Profile: {editingUser.name}</h3>
              <p className="text-slate-500 text-sm mt-1">Configure role permissions and force credential changes.</p>
            </div>

            <div className="flex flex-col gap-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Permission Role</label>
                <select
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-xl bg-slate-50 border border-slate-200 text-slate-700 focus:outline-none"
                >
                  <option value="Employee">Employee</option>
                  <option value="Manager">Manager</option>
                  <option value="Admin">Admin</option>
                </select>
              </div>

              {isGlobalAdmin && (
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1 uppercase font-mono text-[10px]">Change Password (Optional)</label>
                  <input
                    type="password"
                    placeholder="Enter new secure password to reset..."
                    value={editPassword}
                    onChange={(e) => setEditPassword(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-xl bg-slate-50 border border-slate-200 text-slate-700 focus:outline-none focus:border-emerald-600"
                  />
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 mt-2">
              <button
                type="button"
                onClick={() => {
                  setEditingUser(null);
                  setEditPassword('');
                }}
                className="px-4 py-2 rounded-xl text-slate-500 hover:bg-slate-100 text-sm font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold cursor-pointer transition-colors"
              >
                Save Profile
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default WorkspaceUsers;
