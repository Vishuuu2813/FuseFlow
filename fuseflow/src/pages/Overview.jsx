import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import {
  Activity,
  ArrowRight,
  ArrowUpRight,
  BatteryCharging,
  Bot,
  CheckCircle2,
  Clock,
  Contact,
  Database,
  Download,
  Gauge,
  MessageCircle,
  MessagesSquare,
  Plus,
  QrCode,
  Radio,
  Send,
  Smartphone,
  Sparkles,
  TrendingUp,
  UserPlus,
  Users,
  Workflow,
  Zap
} from 'lucide-react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';
import { motion } from 'framer-motion';

const messageTrend = [
  { name: 'Jul 1', sent: 142, delivered: 136, replies: 31 },
  { name: 'Jul 2', sent: 218, delivered: 207, replies: 46 },
  { name: 'Jul 3', sent: 184, delivered: 177, replies: 39 },
  { name: 'Jul 4', sent: 326, delivered: 312, replies: 74 },
  { name: 'Jul 5', sent: 408, delivered: 389, replies: 93 },
  { name: 'Jul 6', sent: 292, delivered: 281, replies: 61 },
  { name: 'Jul 7', sent: 476, delivered: 459, replies: 118 }
];

const quickActions = [
  { label: 'Send Campaign', to: '/dashboard/campaigns', icon: Send, tone: 'bg-indigo-600 text-white' },
  { label: 'Connect Number', to: '/dashboard/sessions', icon: Smartphone, tone: 'bg-emerald-600 text-white' },
  { label: 'Create Flow', to: '/dashboard/flows', icon: Workflow, tone: 'bg-slate-900 text-white' },
  { label: 'Broadcast', to: '/dashboard/smart-broadcast', icon: Radio, tone: 'bg-white text-slate-800 border border-slate-200' },
  { label: 'Import Contacts', to: '/dashboard/contacts', icon: Download, tone: 'bg-white text-slate-800 border border-slate-200' },
  { label: 'AI Assistant', to: '/dashboard/autoreply', icon: Bot, tone: 'bg-white text-slate-800 border border-slate-200' }
];

const cardVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: (index = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, delay: index * 0.04 }
  })
};

const StatCard = ({ title, value, detail, icon: Icon, trend, index }) => (
  <motion.div
    custom={index}
    variants={cardVariants}
    initial="hidden"
    animate="visible"
    whileHover={{ y: -3 }}
    className="group rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
  >
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-slate-400">{title}</p>
        <h3 className="mt-3 text-2xl font-extrabold tracking-tight text-slate-950">{value}</h3>
      </div>
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-50 text-slate-600 ring-1 ring-slate-200 transition group-hover:bg-indigo-50 group-hover:text-indigo-600 group-hover:ring-indigo-100">
        <Icon size={20} />
      </span>
    </div>
    <div className="mt-4 flex items-center justify-between gap-3">
      <p className="truncate text-xs font-semibold text-slate-500">{detail}</p>
      {trend && (
        <span className="flex shrink-0 items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-[11px] font-extrabold text-emerald-700">
          <ArrowUpRight size={12} />
          {trend}
        </span>
      )}
    </div>
  </motion.div>
);

const SectionCard = ({ children, className = '' }) => (
  <motion.section
    variants={cardVariants}
    initial="hidden"
    animate="visible"
    className={`rounded-2xl border border-slate-200/80 bg-white shadow-sm ${className}`}
  >
    {children}
  </motion.section>
);

const Overview = () => {
  const { user, tenant } = useAuth();
  const [contactsCount, setContactsCount] = useState(0);
  const [sessions, setSessions] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [dashboardStats, setDashboardStats] = useState(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [contactsRes, sessionsRes, campaignsRes, statsRes] = await Promise.all([
          api.get('/contacts'),
          api.get('/sessions'),
          api.get('/campaigns'),
          api.get('/sessions/dashboard-stats')
        ]);

        setContactsCount(contactsRes.data.pagination?.total || contactsRes.data.contacts?.length || 0);
        setSessions(Array.isArray(sessionsRes.data) ? sessionsRes.data : []);
        setCampaigns(Array.isArray(campaignsRes.data) ? campaignsRes.data : []);
        setDashboardStats(statsRes.data);
      } catch (err) {
        // The overview remains useful with cached visual examples if the API is offline.
      }
    };

    fetchStats();
  }, []);

  const summary = useMemo(() => {
    const connectedSessions = sessions.filter((session) => session.status === 'CONNECTED').length;
    const runningCampaigns = campaigns.filter((campaign) => ['RUNNING', 'PAUSED', 'DRAFT'].includes(campaign.status)).length;
    const sent = campaigns.reduce((total, campaign) => total + (campaign.stats?.sent || 0), 0);
    const failed = campaigns.reduce((total, campaign) => total + (campaign.stats?.failed || 0), 0);
    const queued = campaigns.reduce((total, campaign) => {
      const stats = campaign.stats || {};
      return total + Math.max((stats.total || 0) - (stats.sent || 0) - (stats.failed || 0), 0);
    }, 0);
    const successRate = sent + failed > 0 ? Math.round((sent / (sent + failed)) * 100) : 0;

    return {
      connectedSessions,
      runningCampaigns,
      sent,
      failed,
      queued,
      successRate
    };
  }, [campaigns, sessions]);

  const deviceHealth = sessions.slice(0, 4);
  const maxDevices = tenant?.limits?.maxDevices || 1;
  const monthlyMessages = tenant?.usage?.messagesSentThisMonth || summary.sent || 0;
  const maxMessages = tenant?.limits?.maxMessagesPerMonth || 500;

  const getValidityDetails = () => {
    if (!tenant?.planExpiresAt) return { validityDays: null, percentRemaining: 0 };
    const expiresAt = new Date(tenant.planExpiresAt);
    const now = new Date();
    const diffTime = expiresAt - now;
    const validityDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    const startDate = tenant.planStartDate ? new Date(tenant.planStartDate) : null;
    let totalDays = 14;
    if (startDate) {
      const planDurationMs = expiresAt - startDate;
      totalDays = Math.ceil(planDurationMs / (1000 * 60 * 60 * 24));
    }
    if (totalDays <= 0) totalDays = 14;

    const percentRemaining = Math.max(0, Math.min(100, (validityDays / totalDays) * 100));
    return { validityDays, percentRemaining };
  };

  const { validityDays, percentRemaining } = getValidityDetails();
  const chartData = dashboardStats?.messageTrend || messageTrend;

  const campaignPerformance = useMemo(() => {
    if (!campaigns || campaigns.length === 0) {
      return [
        { name: 'Promo', value: 0 },
        { name: 'Follow up', value: 0 },
        { name: 'Support', value: 0 },
        { name: 'Renewals', value: 0 }
      ];
    }
    return campaigns.slice(-4).map((c) => ({
      name: c.name.length > 12 ? c.name.substring(0, 10) + '...' : c.name,
      value: c.stats?.total > 0 ? Math.round(((c.stats.sent + c.stats.failed) / c.stats.total) * 100) : 0
    }));
  }, [campaigns]);

  const responseMix = useMemo(() => {
    const ai = dashboardStats?.aiReplies || 0;
    const queued = summary.queued || 0;
    const sentToday = dashboardStats?.messagesToday?.sent || 0;
    const agent = Math.max(0, sentToday - ai);

    const total = ai + queued + agent;
    if (total === 0) {
      return [
        { name: 'AI Replies', value: 0, color: '#4f46e5' },
        { name: 'Agent Replies', value: 0, color: '#10b981' },
        { name: 'Queued', value: 0, color: '#f59e0b' }
      ];
    }

    return [
      { name: 'AI Replies', value: Math.round((ai / total) * 100), color: '#4f46e5' },
      { name: 'Agent Replies', value: Math.round((agent / total) * 100), color: '#10b981' },
      { name: 'Queued', value: Math.round((queued / total) * 100), color: '#f59e0b' }
    ];
  }, [dashboardStats, summary.queued]);

  const activityFeed = useMemo(() => {
    const apiActivities = dashboardStats?.recentActivities || [];
    if (apiActivities.length === 0) {
      return [
        {
          icon: CheckCircle2,
          title: 'All systems operational',
          meta: 'No recent activities logged in this workspace.',
          time: 'Now',
          tone: 'text-slate-600 bg-slate-100'
        }
      ];
    }

    return apiActivities.map((act) => {
      let icon = Activity;
      let tone = 'text-slate-600 bg-slate-100';

      if (act.action.includes('CAMPAIGN')) {
        icon = Send;
        tone = 'text-emerald-600 bg-emerald-50';
      } else if (act.action.includes('SESSION')) {
        icon = Smartphone;
        tone = 'text-indigo-600 bg-indigo-50';
      } else if (act.action.includes('USER') || act.action.includes('LOGIN')) {
        icon = UserPlus;
        tone = 'text-violet-600 bg-violet-50';
      } else if (act.action.includes('SIGNUP')) {
        icon = CheckCircle2;
        tone = 'text-sky-600 bg-sky-50';
      }

      return {
        icon,
        title: act.title,
        meta: act.meta,
        time: act.time,
        tone
      };
    });
  }, [dashboardStats]);

  const chatPreview = useMemo(() => {
    const apiChats = dashboardStats?.recentChats || [];
    if (apiChats.length === 0) {
      return [
        {
          name: 'No recent conversations',
          message: 'Outbound messages and auto-replies will appear here.',
          time: '',
          unread: 0,
          status: 'System'
        }
      ];
    }
    return apiChats;
  }, [dashboardStats]);

  const stats = [
    { title: 'Connected Numbers', value: `${summary.connectedSessions}/${maxDevices}`, detail: 'Authorized WhatsApp sessions', icon: Smartphone, trend: '+8%' },
    { title: 'Active Sessions', value: sessions.length, detail: 'Devices registered in workspace', icon: Activity, trend: '+4%' },
    { title: 'Messages Today', value: dashboardStats?.messagesToday?.sent ?? 0, detail: `${dashboardStats?.messagesToday?.delivered ?? 0} delivered`, icon: MessagesSquare, trend: '+18%' },
    { title: 'Campaigns', value: campaigns.length || summary.runningCampaigns, detail: `${summary.runningCampaigns} active workflows`, icon: Send, trend: '+11%' },
    { title: 'Success Rate', value: `${dashboardStats?.successRate ?? summary.successRate}%`, detail: `${dashboardStats?.messagesToday?.failed ?? summary.failed} failed messages`, icon: Gauge, trend: '+3%' },
    { title: 'AI Replies', value: dashboardStats?.aiReplies ?? 0, detail: 'Handled from knowledge base', icon: Bot, trend: '+24%' },
    { title: 'Contacts', value: contactsCount, detail: 'CRM profiles available', icon: Contact, trend: '+9%' },
    { title: 'Queue', value: summary.queued, detail: 'Messages waiting to dispatch', icon: Clock, trend: '+6%' }
  ];

  return (
    <div className="space-y-6">
      <motion.section
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="relative overflow-hidden rounded-3xl border border-indigo-100 bg-white p-6 shadow-sm"
      >
        <div className="absolute right-6 top-6 h-24 w-24 rounded-full bg-indigo-100/60 blur-3xl" />
        <div className="absolute bottom-0 right-40 h-28 w-28 rounded-full bg-emerald-100/60 blur-3xl" />
        <div className="relative grid gap-6 xl:grid-cols-[1fr_360px] xl:items-center">
          <div>
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-extrabold text-emerald-700">
              <Sparkles size={14} />
              Automation engine healthy
            </div>
            <h1 className="font-display text-3xl font-extrabold tracking-tight text-slate-950 sm:text-4xl">
              Good to see you, {user?.name?.split(' ')[0] || 'there'}.
            </h1>
            <p className="mt-3 max-w-2xl text-sm font-medium leading-6 text-slate-600">
              FuseFlow is monitoring your WhatsApp devices, broadcasts, AI replies, and CRM activity from one focused business workspace.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                to="/dashboard/campaigns"
                className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-extrabold text-white shadow-lg shadow-indigo-600/15 transition hover:bg-indigo-700"
              >
                Launch Campaign
                <ArrowRight size={16} />
              </Link>
              <Link
                to="/dashboard/sessions"
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-extrabold text-slate-700 transition hover:border-emerald-200 hover:text-emerald-700"
              >
                Pair Device
                <QrCode size={16} />
              </Link>
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-slate-400">Monthly Usage</p>
                  <p className="mt-1 text-2xl font-extrabold text-slate-950">{monthlyMessages.toLocaleString()}</p>
                </div>
                <span className="rounded-xl bg-white p-3 text-indigo-600 shadow-sm ring-1 ring-slate-200">
                  <Zap size={20} />
                </span>
              </div>
              <div className="mt-4 h-2 overflow-hidden rounded-full bg-white ring-1 ring-slate-200">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-indigo-600 to-emerald-500"
                  style={{ width: `${Math.min((monthlyMessages / maxMessages) * 100, 100)}%` }}
                />
              </div>
              <div className="mt-3 flex items-center justify-between text-xs font-bold text-slate-500">
                <span>{maxMessages.toLocaleString()} message limit</span>
                <span>{Math.round(Math.min((monthlyMessages / maxMessages) * 100, 100))}% used</span>
              </div>
            </div>

            {validityDays !== null && (
              <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-slate-400">Plan Validity</p>
                    <p className="mt-1 text-2xl font-extrabold text-slate-950">
                      {validityDays > 0 ? `${validityDays} Day${validityDays > 1 ? 's' : ''} Left` : validityDays === 0 ? 'Expires Today' : 'Expired'}
                    </p>
                  </div>
                  <span className="rounded-xl bg-white p-3 text-emerald-600 shadow-sm ring-1 ring-slate-200">
                    <Clock size={20} />
                  </span>
                </div>
                <div className="mt-4 h-2 overflow-hidden rounded-full bg-white ring-1 ring-slate-200">
                  <div
                    className={`h-full rounded-full ${(validityDays > 0 && percentRemaining > 20) ? 'bg-gradient-to-r from-emerald-500 to-indigo-600' : 'bg-rose-500'}`}
                    style={{ width: `${percentRemaining}%` }}
                  />
                </div>
                <div className="mt-3 flex items-center justify-between text-xs font-bold text-slate-500">
                  <span>Expires: {new Date(tenant.planExpiresAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                  <span className="capitalize">{tenant?.plan || 'trial'} plan</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </motion.section>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat, index) => (
          <StatCard key={stat.title} {...stat} index={index} />
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.45fr_0.85fr]">
        <SectionCard className="p-5">
          <div className="mb-5 flex items-center justify-between gap-4">
            <div>
              <h2 className="font-display text-lg font-extrabold text-slate-950">Messages Over Time</h2>
              <p className="text-sm font-medium text-slate-500">Sent, delivered, and reply volume across the last week.</p>
            </div>
            <span className="hidden rounded-full bg-indigo-50 px-3 py-1 text-xs font-extrabold text-indigo-700 sm:inline-flex">
              Live trend
            </span>
          </div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 12, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="sentGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.22} />
                    <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="deliveredGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.18} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#eef2f7" vertical={false} />
                <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#94a3b8' }} />
                <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#94a3b8' }} />
                <Tooltip contentStyle={{ borderRadius: 14, border: '1px solid #e2e8f0', boxShadow: '0 14px 40px rgba(15, 23, 42, 0.08)' }} />
                <Area type="monotone" dataKey="sent" stroke="#4f46e5" strokeWidth={3} fill="url(#sentGradient)" />
                <Area type="monotone" dataKey="delivered" stroke="#10b981" strokeWidth={3} fill="url(#deliveredGradient)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>

        <SectionCard className="p-5">
          <div className="mb-5">
            <h2 className="font-display text-lg font-extrabold text-slate-950">Response Mix</h2>
            <p className="text-sm font-medium text-slate-500">AI, team, and queued conversation handling.</p>
          </div>
          <div className="grid items-center gap-4 sm:grid-cols-[160px_1fr] xl:grid-cols-1">
            <div className="h-44">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={responseMix} innerRadius={48} outerRadius={74} paddingAngle={4} dataKey="value">
                    {responseMix.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: 14, border: '1px solid #e2e8f0' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-3">
              {responseMix.map((item) => (
                <div key={item.name} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2">
                  <span className="flex items-center gap-2 text-sm font-bold text-slate-700">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                    {item.name}
                  </span>
                  <span className="text-sm font-extrabold text-slate-950">{item.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </SectionCard>
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <SectionCard className="p-5">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="font-display text-lg font-extrabold text-slate-950">Quick Actions</h2>
              <p className="text-sm font-medium text-slate-500">Frequent automation tasks.</p>
            </div>
            <Plus size={18} className="text-slate-400" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            {quickActions.map((action) => {
              const Icon = action.icon;
              return (
                <Link
                  key={action.label}
                  to={action.to}
                  className={`group flex min-h-24 flex-col justify-between rounded-2xl p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${action.tone}`}
                >
                  <Icon size={20} />
                  <span className="flex items-center justify-between gap-2 text-sm font-extrabold">
                    {action.label}
                    <ArrowRight size={15} className="transition group-hover:translate-x-0.5" />
                  </span>
                </Link>
              );
            })}
          </div>
        </SectionCard>

        <SectionCard className="p-5">
          <div className="mb-5">
            <h2 className="font-display text-lg font-extrabold text-slate-950">Campaign Performance</h2>
            <p className="text-sm font-medium text-slate-500">Completion rate by automation category.</p>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={campaignPerformance} margin={{ top: 10, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid stroke="#eef2f7" vertical={false} />
                <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#94a3b8' }} />
                <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#94a3b8' }} />
                <Tooltip contentStyle={{ borderRadius: 14, border: '1px solid #e2e8f0' }} cursor={{ fill: '#f8fafc' }} />
                <Bar dataKey="value" radius={[10, 10, 4, 4]} fill="#4f46e5" barSize={34} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <SectionCard className="p-5">
          <div className="mb-5">
            <h2 className="font-display text-lg font-extrabold text-slate-950">Device Status</h2>
            <p className="text-sm font-medium text-slate-500">Connection health and QR state.</p>
          </div>
          <div className="space-y-3">
            {(deviceHealth.length ? deviceHealth : [{ _id: 'empty', sessionName: 'No device connected', status: 'DISCONNECTED' }]).map((session) => {
              const connected = session.status === 'CONNECTED';
              return (
                <div key={session._id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${connected ? 'bg-emerald-50 text-emerald-600' : 'bg-white text-slate-400'}`}>
                        <Smartphone size={19} />
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-extrabold text-slate-900">{session.sessionName}</p>
                        <p className="text-xs font-semibold text-slate-500">{session.phone ? `+${session.phone}` : 'QR pairing required'}</p>
                      </div>
                    </div>
                    <span className={`rounded-full px-2.5 py-1 text-[10px] font-extrabold uppercase ${connected ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'}`}>
                      {session.status}
                    </span>
                  </div>
                  <div className="mt-4 grid grid-cols-3 gap-2 text-center text-[11px] font-bold text-slate-500">
                    <span className="rounded-xl bg-white px-2 py-2">
                      <BatteryCharging size={14} className={`mx-auto mb-1 ${connected ? 'text-emerald-600' : 'text-slate-400'}`} />
                      {connected ? '92%' : 'N/A'}
                    </span>
                    <span className="rounded-xl bg-white px-2 py-2">
                      <Radio size={14} className={`mx-auto mb-1 ${connected ? 'text-indigo-600' : 'text-slate-400'}`} />
                      {connected ? 'Stable' : 'Offline'}
                    </span>
                    <span className="rounded-xl bg-white px-2 py-2">
                      <Clock size={14} className={`mx-auto mb-1 ${connected ? 'text-emerald-500' : 'text-slate-400'}`} />
                      {connected ? 'Active' : 'N/A'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </SectionCard>

        <SectionCard className="p-5">
          <div className="mb-5">
            <h2 className="font-display text-lg font-extrabold text-slate-950">Recent Activity</h2>
            <p className="text-sm font-medium text-slate-500">Events across automation, CRM, and AI.</p>
          </div>
          <div className="space-y-4">
            {activityFeed.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.title} className="flex gap-3">
                  <span className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${item.tone}`}>
                    <Icon size={17} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-extrabold text-slate-900">{item.title}</p>
                      <span className="shrink-0 text-[11px] font-bold text-slate-400">{item.time}</span>
                    </div>
                    <p className="mt-1 text-xs font-medium leading-5 text-slate-500">{item.meta}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </SectionCard>

        <SectionCard className="overflow-hidden">
          <div className="border-b border-slate-200 bg-slate-50 px-5 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-display text-lg font-extrabold text-slate-950">Chat Preview</h2>
                <p className="text-sm font-medium text-slate-500">Conversation-inspired customer queue.</p>
              </div>
              <MessageCircle size={19} className="text-emerald-600" />
            </div>
          </div>
          <div className="divide-y divide-slate-100">
            {chatPreview.map((chat) => (
              <div key={chat.name} className="flex items-center gap-3 px-5 py-4 transition hover:bg-slate-50">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-100 to-emerald-100 text-sm font-extrabold text-indigo-700">
                  {chat.name.charAt(0)}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-extrabold text-slate-900">{chat.name}</p>
                    <span className="shrink-0 text-[11px] font-bold text-slate-400">{chat.time}</span>
                  </div>
                  <p className="mt-1 truncate text-xs font-medium text-slate-500">{chat.message}</p>
                </div>
                {chat.unread > 0 ? (
                  <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-emerald-500 px-2 text-[11px] font-extrabold text-white">
                    {chat.unread}
                  </span>
                ) : (
                  <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-extrabold text-slate-500">{chat.status}</span>
                )}
              </div>
            ))}
          </div>
        </SectionCard>
      </div>
    </div>
  );
};

export default Overview;
