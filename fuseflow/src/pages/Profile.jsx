import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import {
  User,
  Shield,
  Key,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Mail,
  Layers,
  Smartphone,
  Clock,
  Send,
  Database,
  Trash2,
  Settings,
  Building2,
  Sparkles,
  Code,
  Copy
} from 'lucide-react';

const Profile = () => {
  const { user, tenant, fetchProfile } = useAuth();
  const [activeTab, setActiveTab] = useState('account');

  // General Notification States
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // Tab 1: Password State
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Tab 2 & 3: Workspace settings state
  const [tenantName, setTenantName] = useState('');
  const [timezone, setTimezone] = useState('UTC');
  const [autoReplyDelay, setAutoReplyDelay] = useState(5);
  const [aiEnabled, setAiEnabled] = useState(true);

  // Birthday Reminders
  const [birthdayEnabled, setBirthdayEnabled] = useState(false);
  const [birthdayTemplate, setBirthdayTemplate] = useState('');
  const [birthdayTime, setBirthdayTime] = useState('09:00');

  // Anniversary Reminders
  const [anniversaryEnabled, setAnniversaryEnabled] = useState(false);
  const [anniversaryTemplate, setAnniversaryTemplate] = useState('');
  const [anniversaryTime, setAnniversaryTime] = useState('09:00');

  // Selected WhatsApp Session for automated triggers
  const [reminderSessionId, setReminderSessionId] = useState('');
  const [sessions, setSessions] = useState([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);

  // Tab 4: Sandbox simulation state
  const [sandboxPhone, setSandboxPhone] = useState('');
  const [sandboxMessage, setSandboxMessage] = useState('');
  const [sandboxMediaUrl, setSandboxMediaUrl] = useState('');
  const [sandboxSessionId, setSandboxSessionId] = useState('');
  const [sandboxResult, setSandboxResult] = useState(null);

  // Tab 5: Real-time Quota stats
  const [todaySentCount, setTodaySentCount] = useState(0);
  const [statsLoading, setStatsLoading] = useState(true);

  // Tab 6: Log cleanup retention policy
  const [cleanupDays, setCleanupDays] = useState('30');

  // Load Sessions
  const fetchSessions = async () => {
    setSessionsLoading(true);
    try {
      const { data } = await api.get('/sessions');
      setSessions(data);
      if (data.length > 0 && !sandboxSessionId) {
        setSandboxSessionId(data[0]._id);
      }
    } catch (err) {
      console.error('Failed to load sessions', err);
    } finally {
      setSessionsLoading(false);
    }
  };

  // Load Daily Stats
  const fetchDailyStats = async () => {
    setStatsLoading(true);
    try {
      const { data } = await api.get('/sessions/logs');
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

  // Initialize Settings States
  useEffect(() => {
    if (tenant) {
      setTenantName(tenant.name || '');
      setTimezone(tenant.settings?.timezone || 'UTC');
      setAutoReplyDelay(tenant.settings?.autoReplyDelaySeconds ?? 5);
      setAiEnabled(tenant.settings?.aiEnabled ?? true);

      setBirthdayEnabled(tenant.settings?.birthdayReminderEnabled ?? false);
      setBirthdayTemplate(tenant.settings?.birthdayReminderTemplate || 'Hello {{name}}, wishing you a very Happy Birthday! 🎂🎉');
      setBirthdayTime(tenant.settings?.birthdayReminderTime || '09:00');

      setAnniversaryEnabled(tenant.settings?.anniversaryReminderEnabled ?? false);
      setAnniversaryTemplate(tenant.settings?.anniversaryReminderTemplate || 'Hello {{name}}, congratulations on your anniversary! Wishing you continued success! 🥂✨');
      setAnniversaryTime(tenant.settings?.anniversaryReminderTime || '09:00');

      setReminderSessionId(tenant.settings?.reminderSessionId || '');
    }
    if (user?.tenantId) {
      fetchSessions();
      fetchDailyStats();
    }
  }, [tenant, user]);

  const handleUpdateTenantSettings = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setActionLoading(true);

    try {
      await api.put('/auth/tenant', {
        name: tenantName,
        timezone,
        autoReplyDelaySeconds: autoReplyDelay,
        aiEnabled,
        birthdayReminderEnabled: birthdayEnabled,
        birthdayReminderTemplate: birthdayTemplate,
        birthdayReminderTime: birthdayTime,
        anniversaryReminderEnabled: anniversaryEnabled,
        anniversaryReminderTemplate: anniversaryTemplate,
        anniversaryReminderTime: anniversaryTime,
        reminderSessionId: reminderSessionId || null
      });

      setSuccess('Workspace configurations saved successfully.');
      await fetchProfile();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update tenant configuration.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match.');
      return;
    }

    if (newPassword.length < 8 || !/[a-zA-Z]/.test(newPassword) || !/\d/.test(newPassword)) {
      setError('New password must be at least 8 characters and contain both letters and numbers.');
      return;
    }

    setActionLoading(true);
    try {
      await api.post('/auth/change-password', {
        oldPassword,
        newPassword
      });
      setSuccess('Your password has been changed successfully.');
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update user credentials.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRunSandboxTest = async (e) => {
    e.preventDefault();
    setError('');
    setSandboxResult(null);

    if (!sandboxSessionId) {
      setError('Please select an active WhatsApp session to send the message.');
      return;
    }
    if (!sandboxPhone || !sandboxMessage) {
      setError('Phone number and message text are required.');
      return;
    }

    setActionLoading(true);
    try {
      const { data } = await api.post(`/sessions/${sandboxSessionId}/send-message`, {
        phone: sandboxPhone,
        messageText: sandboxMessage,
        mediaUrl: sandboxMediaUrl || undefined
      });
      setSandboxResult({ success: true, message: data.message || 'Message sent successfully.' });
      setSuccess('Sandbox API trigger processed successfully.');
      fetchDailyStats();
    } catch (err) {
      setSandboxResult({ success: false, error: err.response?.data?.message || 'Failed to deliver message via session.' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleExportContacts = async () => {
    setError('');
    setSuccess('');
    try {
      const { data } = await api.get('/contacts');
      const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(data, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', dataStr);
      downloadAnchor.setAttribute('download', `fuseflow_contacts_${new Date().toISOString().slice(0, 10)}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      setSuccess('CRM Contacts exported successfully.');
    } catch (err) {
      setError('Failed to export CRM contact database records.');
    }
  };

  const handleExportLogs = async () => {
    setError('');
    setSuccess('');
    try {
      const { data } = await api.get('/sessions/logs');
      const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(data, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', dataStr);
      downloadAnchor.setAttribute('download', `fuseflow_message_logs_${new Date().toISOString().slice(0, 10)}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      setSuccess('Message logs database exported successfully.');
    } catch (err) {
      setError('Failed to export message log records.');
    }
  };

  const handlePurgeLogs = async () => {
    if (!window.confirm(`Are you sure you want to permanently clear message logs older than ${cleanupDays} days? This action is irreversible.`)) {
      return;
    }
    setError('');
    setSuccess('');
    setActionLoading(true);
    try {
      const { data } = await api.delete('/sessions/logs/cleanup', {
        data: { days: parseInt(cleanupDays) }
      });
      setSuccess(data.message || 'Logs cleaned up successfully.');
      fetchDailyStats();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to complete database logs cleanup.');
    } finally {
      setActionLoading(false);
    }
  };

  // Limit constants
  const dailyLimit = tenant?.limits?.dailyMessageLimit || 100;
  const percentUsed = Math.min(Math.round((todaySentCount / dailyLimit) * 100), 100);

  return (
    <div className="flex flex-col gap-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-slate-800">Workspace Settings & Profile</h1>
        <p className="text-slate-500 text-sm mt-1">Configure automated triggers, manage developers credentials, monitor quotas, and tune workspace rules.</p>
      </div>

      {/* Main Container Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        {/* Left Navigation Tabs Panel */}
        <div className="lg:col-span-1 bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-4">
          {/* User Brief info */}
          <div className="flex flex-col items-center text-center pb-4 border-b border-slate-100">
            <div className="w-16 h-16 rounded-full bg-indigo-650 flex items-center justify-center text-white text-2xl font-black shadow-sm mb-3 uppercase">
              {user?.name ? user.name.charAt(0) : 'U'}
            </div>
            <h3 className="font-extrabold text-slate-800 text-sm truncate max-w-full">{user?.name}</h3>
            <span className="mt-1 px-2.5 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-100 rounded-full text-[9px] font-black uppercase tracking-wider">
              {user?.role || 'Member'}
            </span>
          </div>

          {/* Navigation Items */}
          <nav className="flex flex-row lg:flex-col overflow-x-auto gap-1 lg:overflow-x-visible pb-2 lg:pb-0">
            <button
              onClick={() => { setActiveTab('account'); setError(''); setSuccess(''); }}
              className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-bold shrink-0 transition-all ${
                activeTab === 'account' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <User size={15} />
              Account Security
            </button>
            {tenant && (
              <>
                <button
                  onClick={() => { setActiveTab('branding'); setError(''); setSuccess(''); }}
                  className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-bold shrink-0 transition-all ${
                    activeTab === 'branding' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <Building2 size={15} />
                  Workspace Details
                </button>
                <button
                  onClick={() => { setActiveTab('reminders'); setError(''); setSuccess(''); }}
                  className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-bold shrink-0 transition-all ${
                    activeTab === 'reminders' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <Clock size={15} />
                  Reminders Trigger
                </button>
                <button
                  onClick={() => { setActiveTab('api'); setError(''); setSuccess(''); }}
                  className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-bold shrink-0 transition-all ${
                    activeTab === 'api' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <Code size={15} />
                  Developer Sandbox
                </button>
                <button
                  onClick={() => { setActiveTab('quota'); setError(''); setSuccess(''); }}
                  className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-bold shrink-0 transition-all ${
                    activeTab === 'quota' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <Layers size={15} />
                  Quotas & Limits
                </button>
                <button
                  onClick={() => { setActiveTab('backups'); setError(''); setSuccess(''); }}
                  className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-bold shrink-0 transition-all ${
                    activeTab === 'backups' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <Database size={15} />
                  Backups & Purges
                </button>
              </>
            )}
          </nav>
        </div>

        {/* Right Details Panel */}
        <div className="lg:col-span-3 flex flex-col gap-5">
          {/* Notification Alerts */}
          {error && (
            <div className="p-3.5 rounded-xl border border-red-200 bg-red-50 text-red-700 text-xs font-semibold flex items-center gap-2">
              <AlertCircle size={15} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="p-3.5 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-700 text-xs font-semibold flex items-center gap-2">
              <CheckCircle size={15} className="shrink-0" />
              <span>{success}</span>
            </div>
          )}

          {/* TAB CONTENT: Account Security */}
          {activeTab === 'account' && (
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col gap-6">
              <div>
                <h3 className="font-extrabold text-slate-800 text-base flex items-center gap-2">
                  <User size={18} className="text-indigo-600" /> Account Security Profile
                </h3>
                <p className="text-slate-500 text-xs mt-0.5 font-medium">Verify login information and reset your credentials.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-4 border-b border-slate-100">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Full Name</label>
                  <div className="px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs font-bold">
                    {user?.name}
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Email Address</label>
                  <div className="px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs font-bold">
                    {user?.email}
                  </div>
                </div>
              </div>

              <form onSubmit={handleChangePassword} className="flex flex-col gap-4">
                <div>
                  <h4 className="font-bold text-slate-700 text-xs uppercase tracking-wider">Update Account Password</h4>
                  <p className="text-[10px] text-slate-400 mt-0.5">We recommend using a strong password with letters, digits, and special signs.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Current Password</label>
                    <input
                      type="password"
                      required
                      value={oldPassword}
                      onChange={(e) => setOldPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 focus:outline-none focus:border-indigo-600 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">New Password</label>
                    <input
                      type="password"
                      required
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 focus:outline-none focus:border-indigo-600 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Confirm New Password</label>
                    <input
                      type="password"
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 focus:outline-none focus:border-indigo-600 text-xs"
                    />
                  </div>
                </div>

                <div className="flex justify-end mt-2">
                  <button
                    type="submit"
                    disabled={actionLoading}
                    className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 text-white text-xs font-bold cursor-pointer transition-colors shadow-md shadow-indigo-600/10"
                  >
                    {actionLoading ? 'Updating credentials...' : 'Save New Password'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* TAB CONTENT: Workspace details */}
          {activeTab === 'branding' && tenant && (
            <form onSubmit={handleUpdateTenantSettings} className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col gap-6">
              <div>
                <h3 className="font-extrabold text-slate-800 text-base flex items-center gap-2">
                  <Building2 size={18} className="text-indigo-600" /> Workspace Settings
                </h3>
                <p className="text-slate-500 text-xs mt-0.5 font-medium">Customize your workspace name, localized timezone, auto-replies delays, and bot configurations.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Workspace/Company Name</label>
                  <input
                    type="text"
                    required
                    value={tenantName}
                    onChange={(e) => setTenantName(e.target.value)}
                    placeholder="e.g. Acme Corporation"
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 focus:outline-none focus:border-indigo-600 text-xs font-bold"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Default Timezone</label>
                  <select
                    value={timezone}
                    onChange={(e) => setTimezone(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 focus:outline-none focus:border-indigo-600 text-xs font-bold cursor-pointer"
                  >
                    <option value="UTC">Coordinated Universal Time (UTC)</option>
                    <option value="Asia/Kolkata">India Standard Time (IST) - Kolkata</option>
                    <option value="America/New_York">Eastern Standard Time (EST) - New York</option>
                    <option value="America/Los_Angeles">Pacific Standard Time (PST) - Los Angeles</option>
                    <option value="Europe/London">Greenwich Mean Time (GMT) - London</option>
                    <option value="Asia/Dubai">Gulf Standard Time (GST) - Dubai</option>
                    <option value="Asia/Singapore">Singapore Standard Time (SST) - Singapore</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Default Auto-Reply Delay (Seconds)</label>
                  <input
                    type="number"
                    min="0"
                    max="60"
                    required
                    value={autoReplyDelay}
                    onChange={(e) => setAutoReplyDelay(parseInt(e.target.value) || 0)}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 focus:outline-none focus:border-indigo-600 text-xs font-bold"
                  />
                </div>
              </div>

              <div className="border-t border-slate-100 pt-5">
                <label className="flex items-center gap-3 p-4 bg-slate-50 border border-slate-200 rounded-2xl cursor-pointer hover:border-indigo-250 transition-colors">
                  <input
                    type="checkbox"
                    checked={aiEnabled}
                    onChange={(e) => setAiEnabled(e.target.checked)}
                    className="rounded text-indigo-600 focus:ring-indigo-500 h-4.5 w-4.5"
                  />
                  <div>
                    <span className="text-xs font-bold text-slate-800 block flex items-center gap-1.5">
                      <Sparkles size={14} className="text-indigo-600" />
                      Enable GPT-Powered Auto Replies
                    </span>
                    <span className="text-[10px] text-slate-400 font-medium">Use AI to analyze incoming screenshots and query the Knowledge Base automatically.</span>
                  </div>
                </label>
              </div>

              <div className="flex justify-end mt-2">
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 text-white text-xs font-bold cursor-pointer transition-colors shadow-md shadow-indigo-600/10"
                >
                  {actionLoading ? 'Saving...' : 'Save Workspace Config'}
                </button>
              </div>
            </form>
          )}

          {/* TAB CONTENT: Reminders Trigger */}
          {activeTab === 'reminders' && tenant && (
            <form onSubmit={handleUpdateTenantSettings} className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col gap-6">
              <div>
                <h3 className="font-extrabold text-slate-800 text-base flex items-center gap-2">
                  <Clock size={18} className="text-indigo-600" /> Automated Birthday & Anniversary Messages
                </h3>
                <p className="text-slate-500 text-xs mt-0.5 font-medium">Schedule automated reminders that dispatch birthday and anniversary greetings to customers automatically.</p>
              </div>

              {/* Session Selector */}
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">WhatsApp Sending Session</label>
                <select
                  value={reminderSessionId}
                  onChange={(e) => setReminderSessionId(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 focus:outline-none focus:border-indigo-600 text-xs font-bold cursor-pointer"
                >
                  <option value="">-- Select Active Session --</option>
                  {sessions.filter(s => s.status === 'CONNECTED').map(s => (
                    <option key={s._id} value={s._id}>
                      {s.sessionName} (+{s.phone || 'Connected'})
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-slate-400 mt-1 font-semibold">Note: Message triggers require a WhatsApp session that is currently CONNECTED.</p>
              </div>

              {/* Birthday Config */}
              <div className="border-t border-slate-100 pt-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-extrabold text-slate-850 block">Birthday Reminder Dispatcher</span>
                    <span className="text-[10px] text-slate-400 font-semibold block">Sends automatic birthday greetings to CRM contacts on their birthday.</span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer select-none shrink-0">
                    <input
                      type="checkbox"
                      checked={birthdayEnabled}
                      onChange={(e) => setBirthdayEnabled(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
                  </label>
                </div>

                {birthdayEnabled && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-50 border border-slate-100 rounded-2xl p-4 transition-all">
                    <div className="sm:col-span-2">
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Birthday Template Message</label>
                      <textarea
                        required
                        rows="3"
                        value={birthdayTemplate}
                        onChange={(e) => setBirthdayTemplate(e.target.value)}
                        placeholder="Use {{name}} placeholder..."
                        className="w-full px-3 py-2 text-xs font-semibold rounded-xl bg-white border border-slate-200 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-600"
                      />
                      <span className="text-[9px] text-slate-400 font-semibold block mt-0.5">Variables allowed: <code>{"{{name}}"}</code></span>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Trigger Time</label>
                      <input
                        type="time"
                        required
                        value={birthdayTime}
                        onChange={(e) => setBirthdayTime(e.target.value)}
                        className="w-full px-3 py-2 text-xs font-semibold rounded-xl bg-white border border-slate-200 text-slate-800 focus:outline-none focus:border-indigo-600 cursor-pointer"
                      />
                      <span className="text-[9px] text-slate-400 font-semibold block mt-0.5">Based on default timezone.</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Anniversary Config */}
              <div className="border-t border-slate-100 pt-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-extrabold text-slate-850 block">Anniversary Reminder Dispatcher</span>
                    <span className="text-[10px] text-slate-400 font-semibold block">Sends automatic wedding or work anniversary messages to CRM contacts.</span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer select-none shrink-0">
                    <input
                      type="checkbox"
                      checked={anniversaryEnabled}
                      onChange={(e) => setAnniversaryEnabled(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
                  </label>
                </div>

                {anniversaryEnabled && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-50 border border-slate-100 rounded-2xl p-4 transition-all">
                    <div className="sm:col-span-2">
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Anniversary Template Message</label>
                      <textarea
                        required
                        rows="3"
                        value={anniversaryTemplate}
                        onChange={(e) => setAnniversaryTemplate(e.target.value)}
                        placeholder="Use {{name}} placeholder..."
                        className="w-full px-3 py-2 text-xs font-semibold rounded-xl bg-white border border-slate-200 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-600"
                      />
                      <span className="text-[9px] text-slate-400 font-semibold block mt-0.5">Variables allowed: <code>{"{{name}}"}</code></span>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Trigger Time</label>
                      <input
                        type="time"
                        required
                        value={anniversaryTime}
                        onChange={(e) => setAnniversaryTime(e.target.value)}
                        className="w-full px-3 py-2 text-xs font-semibold rounded-xl bg-white border border-slate-200 text-slate-800 focus:outline-none focus:border-indigo-600 cursor-pointer"
                      />
                      <span className="text-[9px] text-slate-400 font-semibold block mt-0.5">Based on default timezone.</span>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end mt-2">
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 text-white text-xs font-bold cursor-pointer transition-colors shadow-md shadow-indigo-600/10"
                >
                  {actionLoading ? 'Saving Scheduler...' : 'Save Reminders Settings'}
                </button>
              </div>
            </form>
          )}

          {/* TAB CONTENT: Developer Sandbox */}
          {activeTab === 'api' && tenant && (
            <div className="flex flex-col gap-6">
              {/* Dev Credentials */}
              <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col gap-5">
                <div>
                  <h3 className="font-extrabold text-slate-800 text-base flex items-center gap-2">
                    <Shield size={18} className="text-indigo-600" /> Developer Credentials
                  </h3>
                  <p className="text-slate-500 text-xs mt-0.5 font-medium">Use API tokens to connect CRM platforms (Zapier, Make, custom scripts).</p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">API Key / Token</label>
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
                        className="px-3 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold border border-slate-200 cursor-pointer flex items-center gap-1.5"
                      >
                        <Copy size={13} />
                        Copy
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Trigger Webhook URL</label>
                    <input
                      type="text"
                      readOnly
                      value={`${window.location.origin.replace(':3000', ':5000')}/api/webhooks/trigger?apiKey=${tenant.apiKey || ''}`}
                      className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 text-xs font-mono font-bold focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Sandbox Tester */}
              <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col gap-5">
                <div>
                  <h3 className="font-extrabold text-slate-800 text-base flex items-center gap-2">
                    <Send size={18} className="text-indigo-600" /> API Sandbox Simulator
                  </h3>
                  <p className="text-slate-500 text-xs mt-0.5 font-medium">Test sending single messages through active connected sessions to simulate webhook payloads.</p>
                </div>

                <form onSubmit={handleRunSandboxTest} className="flex flex-col gap-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">WhatsApp Sending Device</label>
                      <select
                        required
                        value={sandboxSessionId}
                        onChange={(e) => setSandboxSessionId(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 focus:outline-none focus:border-indigo-600 text-xs font-bold cursor-pointer"
                      >
                        <option value="">-- Choose Session --</option>
                        {sessions.map(s => (
                          <option key={s._id} value={s._id}>
                            {s.sessionName} ({s.status})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Recipient Phone Number (with Country Code)</label>
                      <input
                        type="text"
                        required
                        value={sandboxPhone}
                        onChange={(e) => setSandboxPhone(e.target.value)}
                        placeholder="e.g. 919876543210"
                        className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 focus:outline-none focus:border-indigo-600 text-xs font-bold"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Message Body</label>
                      <textarea
                        required
                        rows="3"
                        value={sandboxMessage}
                        onChange={(e) => setSandboxMessage(e.target.value)}
                        placeholder="Hello from API sandbox!"
                        className="w-full px-3.5 py-2 text-xs font-semibold rounded-xl bg-slate-50 border border-slate-200 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-600"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Media URL Attachment (Optional)</label>
                      <input
                        type="url"
                        value={sandboxMediaUrl}
                        onChange={(e) => setSandboxMediaUrl(e.target.value)}
                        placeholder="https://example.com/image.jpg"
                        className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 focus:outline-none focus:border-indigo-600 text-xs font-semibold"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={actionLoading}
                      className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 text-white text-xs font-bold cursor-pointer transition-colors shadow-md shadow-indigo-600/10 flex items-center gap-1.5"
                    >
                      <Send size={12} />
                      {actionLoading ? 'Triggering request...' : 'Send Test API Message'}
                    </button>
                  </div>
                </form>

                {sandboxResult && (
                  <div className={`mt-3 p-4 rounded-2xl border text-xs font-mono ${
                    sandboxResult.success ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-red-50 border-red-200 text-red-800'
                  }`}>
                    <span className="block font-bold mb-1">Response Payload:</span>
                    {JSON.stringify(sandboxResult, null, 2)}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB CONTENT: Quotas & Limits */}
          {activeTab === 'quota' && tenant && (
            <div className="flex flex-col gap-6">
              {/* Live Progress Bar */}
              <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col gap-4">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-base font-extrabold text-slate-800 flex items-center gap-2">
                      <Layers size={18} className="text-indigo-600" /> Messaging Daily Quota Limit
                    </h3>
                    <p className="text-slate-500 text-xs mt-0.5 font-medium">Remaining messaging credits reset automatically at midnight UTC daily.</p>
                  </div>
                  <button
                    onClick={fetchDailyStats}
                    disabled={statsLoading}
                    className="p-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-500 hover:text-indigo-600 disabled:opacity-50 cursor-pointer transition-colors"
                  >
                    <RefreshCw size={13} className={statsLoading ? 'animate-spin' : ''} />
                  </button>
                </div>

                {statsLoading ? (
                  <div className="flex justify-center items-center py-6">
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
                  </div>
                ) : (
                  <div className="flex flex-col gap-4">
                    <div className="flex justify-between items-baseline">
                      <span className="text-3xl font-black text-slate-800">{todaySentCount} <span className="text-xs text-slate-400 font-bold">sent today</span></span>
                      <span className="text-xs font-bold text-slate-500">Max limit: {dailyLimit} / day</span>
                    </div>

                    <div className="w-full bg-slate-100 h-3.5 rounded-full overflow-hidden relative">
                      <div
                        style={{ width: `${percentUsed}%` }}
                        className={`h-full transition-all duration-500 rounded-full ${
                          percentUsed > 85 ? 'bg-red-500' : 'bg-indigo-600'
                        }`}
                      />
                    </div>

                    <div className="flex justify-between text-xs text-slate-400 font-semibold">
                      <span>{percentUsed}% Quota consumed</span>
                      <span>{dailyLimit - todaySentCount} messages remaining today</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Plan parameters */}
              <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Workspace Allotment details</h3>
                <div className="p-4 rounded-2xl bg-indigo-50/50 border border-indigo-100 flex items-center justify-between mb-5">
                  <span className="text-xs font-extrabold text-indigo-850 uppercase">Active Subscription tier</span>
                  <span className="px-2.5 py-1 bg-indigo-650 text-white rounded-lg text-[10px] font-black uppercase tracking-wider">
                    {tenant.plan.toUpperCase()}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-semibold text-slate-600">
                  <div className="p-4 border border-slate-100 rounded-2xl flex justify-between items-center">
                    <span className="flex items-center gap-2"><Smartphone size={15} className="text-indigo-550" /> WhatsApp Sessions:</span>
                    <span className="font-extrabold text-slate-800">{tenant.limits?.maxDevices} max</span>
                  </div>
                  <div className="p-4 border border-slate-100 rounded-2xl flex justify-between items-center">
                    <span className="flex items-center gap-2"><Send size={15} className="text-indigo-550" /> Monthly Volume:</span>
                    <span className="font-extrabold text-slate-800">{tenant.limits?.maxMessagesPerMonth} msgs</span>
                  </div>
                  <div className="p-4 border border-slate-100 rounded-2xl flex justify-between items-center">
                    <span className="flex items-center gap-2"><Sparkles size={15} className="text-indigo-550" /> AI Bot Credits:</span>
                    <span className="font-extrabold text-slate-800">{tenant.limits?.maxAiCredits} quota</span>
                  </div>
                  <div className="p-4 border border-slate-100 rounded-2xl flex justify-between items-center">
                    <span className="flex items-center gap-2"><Database size={15} className="text-indigo-550" /> Storage Capacity:</span>
                    <span className="font-extrabold text-slate-800">{tenant.limits?.maxStorageMb} MB</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB CONTENT: Backups & Purges */}
          {activeTab === 'backups' && tenant && (
            <div className="flex flex-col gap-6">
              {/* Backups */}
              <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col gap-5">
                <div>
                  <h3 className="font-extrabold text-slate-800 text-base flex items-center gap-2">
                    <Database size={18} className="text-indigo-600" /> Database Backup & Export
                  </h3>
                  <p className="text-slate-500 text-xs mt-0.5 font-medium">Export raw contact details and message histories to local file backups.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <button
                    onClick={handleExportContacts}
                    className="p-4 border border-slate-200 hover:border-indigo-200 rounded-2xl flex flex-col items-start gap-1 bg-slate-50 hover:bg-indigo-50/20 text-left transition-all cursor-pointer group"
                  >
                    <span className="text-xs font-bold text-slate-850 block group-hover:text-indigo-700">Export CRM Contacts</span>
                    <span className="text-[10px] text-slate-400 font-semibold block">Downloads all customer names, phone numbers, stages, and custom fields in JSON format.</span>
                  </button>

                  <button
                    onClick={handleExportLogs}
                    className="p-4 border border-slate-200 hover:border-indigo-200 rounded-2xl flex flex-col items-start gap-1 bg-slate-50 hover:bg-indigo-50/20 text-left transition-all cursor-pointer group"
                  >
                    <span className="text-xs font-bold text-slate-850 block group-hover:text-indigo-700">Export Message logs</span>
                    <span className="text-[10px] text-slate-400 font-semibold block">Downloads complete transaction logs, timestamps, sending states, and message text details.</span>
                  </button>
                </div>
              </div>

              {/* Data Retention Policies */}
              <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col gap-5">
                <div>
                  <h3 className="font-extrabold text-slate-850 text-base flex items-center gap-2">
                    <Trash2 size={18} className="text-red-650" /> Message Logs Purging & Retention
                  </h3>
                  <p className="text-slate-500 text-xs mt-0.5 font-medium">Clean up database logs periodically to stay within storage limits and optimize performance.</p>
                </div>

                <div className="p-4 bg-red-50/50 border border-red-150 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div>
                    <span className="text-xs font-bold text-red-850 block">Database Clear logs utility</span>
                    <span className="text-[10px] text-slate-500 font-medium block">Select cutoff threshold to purge old records. This action does not delete contacts or sessions.</span>
                  </div>

                  <div className="flex gap-2 w-full sm:w-auto shrink-0">
                    <select
                      value={cleanupDays}
                      onChange={(e) => setCleanupDays(e.target.value)}
                      className="px-3 py-2 rounded-xl bg-white border border-slate-250 text-slate-700 text-xs font-bold cursor-pointer"
                    >
                      <option value="7">Older than 7 days</option>
                      <option value="30">Older than 30 days</option>
                      <option value="90">Older than 90 days</option>
                    </select>

                    <button
                      onClick={handlePurgeLogs}
                      disabled={actionLoading}
                      className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 disabled:bg-slate-200 text-white text-xs font-bold cursor-pointer transition-colors shadow-sm flex items-center gap-1.5"
                    >
                      <Trash2 size={13} />
                      Purge
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Profile;
