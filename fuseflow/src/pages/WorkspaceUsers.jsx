import React, { useEffect, useState } from 'react';
import api from '../services/api';
import {
  Users,
  Search,
  CheckCircle,
  XCircle,
  Trash2,
  Edit2,
  UserPlus,
  Wifi,
  WifiOff
} from 'lucide-react';

const WorkspaceUsers = () => {
  const [users, setUsers] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modals / forms
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPass, setNewUserPass] = useState('');
  const [newUserRole, setNewUserRole] = useState('Employee');

  const [editRole, setEditRole] = useState('Employee');
  
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchWorkspaceData = async () => {
    try {
      const usersRes = await api.get('/auth/users');
      setUsers(usersRes.data);

      const sessionsRes = await api.get('/sessions');
      setSessions(sessionsRes.data);
    } catch (err) {
      setError('Failed to load team data.');
    }
  };

  useEffect(() => {
    fetchWorkspaceData();
  }, []);

  const handleToggleUserActive = async (userId, currentStatus) => {
    try {
      const { data } = await api.put(`/auth/users/${userId}`, { isActive: !currentStatus });
      setUsers((prev) => prev.map((u) => (u._id === userId ? { ...u, isActive: data.isActive } : u)));
      setSuccess('User access updated.');
    } catch (err) {
      setError('Failed to update user access.');
    }
  };

  const handleUpdateRole = async (e) => {
    e.preventDefault();
    if (!editingUser) return;
    try {
      const { data } = await api.put(`/auth/users/${editingUser._id}`, { role: editRole });
      setUsers((prev) => prev.map((u) => (u._id === editingUser._id ? { ...u, role: data.role } : u)));
      setEditingUser(null);
      setSuccess('User role updated successfully.');
    } catch (err) {
      setError('Failed to update user role.');
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm('Are you sure you want to remove this user from your workspace?')) return;
    try {
      await api.delete(`/auth/users/${userId}`);
      setUsers((prev) => prev.filter((u) => u._id !== userId));
      setSuccess('User removed successfully.');
    } catch (err) {
      setError('Failed to remove user.');
    }
  };

  const handleAddUserSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      const { data } = await api.post('/auth/users', {
        name: newUserName,
        email: newUserEmail,
        password: newUserPass,
        role: newUserRole
      });

      setUsers((prev) => [data, ...prev]);
      
      setNewUserName('');
      setNewUserEmail('');
      setNewUserPass('');
      setNewUserRole('Employee');
      
      setShowAddModal(false);
      setSuccess('Team member added successfully.');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to add team member.');
    }
  };

  // Check user connection status by looking at their sessions status
  const getUserConnectionStatus = (userEmail) => {
    // If there is any connected session associated with this email
    const userSessions = sessions.filter(s => s.phoneNumber && s.status === 'CONNECTED');
    if (userSessions.length > 0) {
      return { connected: true, label: `${userSessions.length} Connected` };
    }
    return { connected: false, label: 'Disconnected' };
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
          <h1 className="text-2xl font-bold bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">Team Management</h1>
          <p className="text-slate-400 text-sm mt-1">Manage workspace users, roles, permissions, and live WhatsApp connections.</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 text-xs font-bold flex items-center gap-2 cursor-pointer transition-all hover:scale-[1.02]"
        >
          <UserPlus size={14} /> Add Team Member
        </button>
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

      {/* Directory Table */}
      <div className="backdrop-blur-md bg-slate-900/20 border border-white/5 rounded-3xl p-6 flex flex-col gap-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h2 className="text-base font-bold text-slate-200">Workspace Directory</h2>
          
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-2.5 text-slate-500" size={16} />
            <input
              type="text"
              placeholder="Search by name or email..."
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
                <th className="pb-3 font-semibold">User details</th>
                <th className="pb-3 font-semibold">Workspace Role</th>
                <th className="pb-3 font-semibold">WhatsApp Devices</th>
                <th className="pb-3 font-semibold">Account access</th>
                <th className="pb-3 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredUsers.map((member) => {
                const conn = getUserConnectionStatus(member.email);
                return (
                  <tr key={member._id} className="text-slate-300">
                    <td className="py-4">
                      <div className="font-semibold text-slate-200">{member.name}</div>
                      <div className="text-[10px] text-slate-500">{member.email}</div>
                    </td>
                    <td className="py-4">
                      <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                        member.role === 'Admin' ? 'bg-indigo-500/10 text-indigo-400' : 'bg-slate-800 text-slate-400'
                      }`}>
                        {member.role}
                      </span>
                    </td>
                    <td className="py-4">
                      <div className={`flex items-center gap-1.5 font-medium ${conn.connected ? 'text-emerald-400' : 'text-slate-500'}`}>
                        {conn.connected ? <Wifi size={14} /> : <WifiOff size={14} />}
                        {conn.label}
                      </div>
                    </td>
                    <td className="py-4">
                      <button
                        onClick={() => handleToggleUserActive(member._id, member.isActive)}
                        className={`flex items-center gap-1.5 cursor-pointer font-medium ${
                          member.isActive ? 'text-emerald-400' : 'text-red-400'
                        }`}
                      >
                        {member.isActive ? <CheckCircle size={14} /> : <XCircle size={14} />}
                        {member.isActive ? 'Allowed' : 'Suspended'}
                      </button>
                    </td>
                    <td className="py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => {
                            setEditingUser(member);
                            setEditRole(member.role);
                          }}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
                        >
                          <Edit2 size={12} />
                        </button>
                        <button
                          onClick={() => handleDeleteUser(member._id)}
                          className="p-1.5 rounded-lg bg-red-500/5 hover:bg-red-500/10 border border-red-500/10 text-red-500 cursor-pointer"
                        >
                          <Trash2 size={12} />
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <form onSubmit={handleAddUserSubmit} className="w-full max-w-md backdrop-blur-xl bg-slate-900 border border-white/5 shadow-2xl rounded-3xl p-6 flex flex-col gap-5">
            <div>
              <h3 className="text-base font-bold text-slate-200">Add Team Member</h3>
              <p className="text-slate-500 text-xs mt-1">Register a new user to collaborate in this workspace.</p>
            </div>

            <div className="flex flex-col gap-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="Employee Name"
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
                  placeholder="employee@company.com"
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950/50 border border-white/5 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-emerald-500 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Temporary Password</label>
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
                <label className="block text-xs font-semibold text-slate-400 mb-1">Workspace Role</label>
                <select
                  value={newUserRole}
                  onChange={(e) => setNewUserRole(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950/50 border border-white/5 text-slate-400 focus:outline-none text-xs"
                >
                  <option value="Employee">Employee</option>
                  <option value="Manager">Manager</option>
                  <option value="Admin">Admin</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 mt-2">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 rounded-xl text-slate-400 hover:bg-slate-800 text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 text-xs font-bold cursor-pointer transition-all"
              >
                Add Member
              </button>
            </div>
          </form>
        </div>
      )}

      {/* EDIT ROLE MODAL */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <form onSubmit={handleUpdateRole} className="w-full max-w-md backdrop-blur-xl bg-slate-900 border border-white/5 shadow-2xl rounded-3xl p-6 flex flex-col gap-5">
            <div>
              <h3 className="text-base font-bold text-slate-200">Edit Workspace Role</h3>
              <p className="text-slate-500 text-xs mt-1">Change {editingUser.name}'s permission level.</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">Workspace Role</label>
              <select
                value={editRole}
                onChange={(e) => setEditRole(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950/50 border border-white/5 text-slate-400 focus:outline-none text-xs"
              >
                <option value="Employee">Employee</option>
                <option value="Manager">Manager</option>
                <option value="Admin">Admin</option>
              </select>
            </div>

            <div className="flex items-center justify-end gap-3 mt-2">
              <button
                type="button"
                onClick={() => setEditingUser(null)}
                className="px-4 py-2 rounded-xl text-slate-400 hover:bg-slate-800 text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 text-xs font-bold cursor-pointer transition-all"
              >
                Save Changes
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default WorkspaceUsers;
