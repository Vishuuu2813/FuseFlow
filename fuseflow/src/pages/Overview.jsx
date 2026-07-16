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
  UserPlus,
  Workflow,
  Zap
} from 'lucide-react';
import {
  Area,
  AreaChart,
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

const messageTrendDefault = [
  { name: 'Jul 1', sent: 142, delivered: 136, replies: 31 },
  { name: 'Jul 2', sent: 218, delivered: 207, replies: 46 },
  { name: 'Jul 3', sent: 184, delivered: 177, replies: 39 },
  { name: 'Jul 4', sent: 326, delivered: 312, replies: 74 },
  { name: 'Jul 5', sent: 408, delivered: 389, replies: 93 },
  { name: 'Jul 6', sent: 292, delivered: 281, replies: 61 },
  { name: 'Jul 7', sent: 476, delivered: 459, replies: 118 }
];

const quickActions = [
  { label: 'Send Campaign', to: '/dashboard/campaigns', icon: Send, tone: 'bg-indigo-600 text-white border-transparent' },
  { label: 'Connect Number', to: '/dashboard/sessions', icon: Smartphone, tone: 'bg-emerald-600 text-white border-transparent' },
  { label: 'Create Flow', to: '/dashboard/flows', icon: Workflow, tone: 'bg-slate-800 text-white border-transparent' },
  { label: 'Broadcast', to: '/dashboard/smart-broadcast', icon: Radio, tone: 'bg-transparent text-slate-400 border border-slate-700' },
  { label: 'Import Contacts', to: '/dashboard/contacts', icon: Download, tone: 'bg-transparent text-slate-400 border border-slate-700' },
  { label: 'AI Assistant', to: '/dashboard/autoreply', icon: Bot, tone: 'bg-transparent text-slate-400 border border-slate-700' }
];

const cardVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: (index = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, delay: index * 0.04 }
  })
};

const S = {
  card: { backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' },
  header: { backgroundColor: 'var(--bg-header)', borderColor: 'var(--border)' },
  input: { backgroundColor: 'var(--bg-input)', borderColor: 'var(--border)', color: 'var(--text-primary)' },
  base: { backgroundColor: 'var(--bg-base)' },
  text: { color: 'var(--text-primary)' },
  sub: { color: 'var(--text-secondary)' },
  muted: { color: 'var(--text-muted)' },
  border: { borderColor: 'var(--border)' },
  accent: { backgroundColor: 'var(--accent-soft)', color: 'var(--accent-text)' }
};

const StatCard = ({ title, value, detail, icon: Icon, trend, index }) => (
  <motion.div
    custom={index}
    variants={cardVariants}
    initial="hidden"
    animate="visible"
    whileHover={{ y: -3 }}
    className="group rounded-2xl border p-5 shadow-sm transition-all"
    style={S.card}
  >
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <p className="text-[10px] font-black uppercase tracking-[0.14em]" style={S.muted}>{title}</p>
        <h3 className="mt-3 text-2xl font-extrabold tracking-tight" style={S.text}>{value}</h3>
      </div>
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border text-slate-400 transition group-hover:text-indigo-400"
        style={{ ...S.border, backgroundColor: 'var(--bg-input)' }}>
        <Icon size={18} />
      </span>
    </div>
    <div className="mt-4 flex items-center justify-between gap-3">
      <p className="truncate text-xs font-semibold" style={S.muted}>{detail}</p>
      {trend && (
        <span className="flex shrink-0 items-center gap-0.5 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-extrabold text-emerald-500">
          <ArrowUpRight size={11} />
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
    className={`rounded-2xl border shadow-sm ${className}`}
    style={S.card}
  >
    {children}
  </motion.section>
);

const customTooltipStyle = {
  backgroundColor: 'var(--bg-card)',
  border: '1px solid var(--border)',
  borderRadius: 12,
  color: 'var(--text-primary)',
  fontSize: 11,
  fontWeight: 700,
};

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
        // Fallback handled
      }
    };
    fetchStats();
  }, []);

  const summary = useMemo(() => {
    const connectedSessions = sessions.filter((session) => session.status === 'CONNECTED').length;
    const runningCampaigns = campaigns.filter((campaign) => ['RUNNING', 'PAUSED', 'DRAFT'].includes(campaign.status)).length;
    const sent = campaigns.reduce((total, campaign) => total + (campaign.stats?.sent || 0), 0);
    const failed = campaigns.reduce((total, campaign) => total + (campaign.stats?.failed || 0), 0);
    const successRate = sent + failed > 0 ? Math.round((sent / (sent + failed)) * 100) : 0;
    const queued = campaigns.reduce((total, campaign) => {
      const stats = campaign.stats || {};
      return total + Math.max((stats.total || 0) - (stats.sent || 0) - (stats.failed || 0), 0);
    }, 0);

    return { connectedSessions, runningCampaigns, sent, failed, queued, successRate };
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
  const chartData = dashboardStats?.messageTrend || messageTrendDefault;

  const responseMix = useMemo(() => {
    const ai = dashboardStats?.aiReplies || 0;
    const queued = summary.queued || 0;
    const sentToday = dashboardStats?.messagesToday?.sent || 0;
    const agent = Math.max(0, sentToday - ai);

    const total = ai + queued + agent;
    if (total === 0) {
      return [
        { name: 'AI Replies', value: 0, color: '#6366f1' },
        { name: 'Agent Replies', value: 0, color: '#10b981' },
        { name: 'Queued', value: 0, color: '#f59e0b' }
      ];
    }
    return [
      { name: 'AI Replies', value: Math.round((ai / total) * 100), color: '#6366f1' },
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
          tone: 'text-slate-400'
        }
      ];
    }

    return apiActivities.map((act) => {
      let icon = Activity;
      let tone = 'text-slate-400';

      if (act.action.includes('CAMPAIGN')) {
        icon = Send;
        tone = 'text-emerald-500';
      } else if (act.action.includes('SESSION')) {
        icon = Smartphone;
        tone = 'text-indigo-400';
      } else if (act.action.includes('USER') || act.action.includes('LOGIN')) {
        icon = UserPlus;
        tone = 'text-purple-400';
      } else if (act.action.includes('SIGNUP')) {
        icon = CheckCircle2;
        tone = 'text-sky-400';
      }

      return { icon, title: act.title, meta: act.meta, time: act.time, tone };
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
        className="relative overflow-hidden rounded-3xl border p-6 shadow-sm"
        style={S.card}
      >
        <div className="relative grid gap-6 xl:grid-cols-[1fr_360px] xl:items-center">
          <div>
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 text-[10px] font-black text-emerald-500 uppercase tracking-wider">
              <Sparkles size={13} />
              Automation engine healthy
            </div>
            <h1 className="font-display text-2xl font-extrabold tracking-tight sm:text-3xl" style={S.text}>
              Good to see you, {user?.name?.split(' ')[0] || 'there'}.
            </h1>
            <p className="mt-2.5 max-w-2xl text-sm font-semibold leading-relaxed" style={S.sub}>
              FuseFlow is monitoring your WhatsApp devices, broadcasts, AI replies, and CRM activity from one focused business workspace.
            </p>
            <div className="mt-5 flex flex-wrap gap-2.5">
              <Link
                to="/dashboard/campaigns"
                className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-black text-white shadow-lg shadow-indigo-600/15 transition hover:bg-indigo-700"
              >
                Launch Campaign
                <ArrowRight size={14} />
              </Link>
              <Link
                to="/dashboard/sessions"
                className="inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-xs font-black transition"
                style={{ ...S.border, ...S.sub, backgroundColor: 'transparent' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.color = '#fff'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
              >
                Pair Device
                <QrCode size={14} />
              </Link>
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-2xl border p-4" style={{ ...S.border, backgroundColor: 'var(--bg-input)' }}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-wider" style={S.muted}>Monthly Usage</p>
                  <p className="mt-1 text-xl font-black" style={S.text}>{monthlyMessages.toLocaleString()}</p>
                </div>
                <span className="rounded-xl border p-2.5 shadow-sm text-indigo-400" style={S.border}>
                  <Zap size={18} />
                </span>
              </div>
              <div className="mt-3.5 h-1.5 overflow-hidden rounded-full border" style={S.border}>
                <div
                  className="h-full rounded-full bg-indigo-500"
                  style={{ width: `${Math.min((monthlyMessages / maxMessages) * 100, 100)}%` }}
                />
              </div>
              <div className="mt-2.5 flex items-center justify-between text-[10px] font-black uppercase tracking-wider" style={S.muted}>
                <span>{maxMessages.toLocaleString()} limit</span>
                <span>{Math.round(Math.min((monthlyMessages / maxMessages) * 100, 100))}% used</span>
              </div>
            </div>

            {validityDays !== null && (
              <div className="rounded-2xl border p-4" style={{ ...S.border, backgroundColor: 'var(--bg-input)' }}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-wider" style={S.muted}>Plan Validity</p>
                    <p className="mt-1 text-xl font-black" style={S.text}>
                      {validityDays > 0 ? `${validityDays} Day${validityDays > 1 ? 's' : ''} Left` : validityDays === 0 ? 'Expires Today' : 'Expired'}
                    </p>
                  </div>
                  <span className="rounded-xl border p-2.5 shadow-sm text-emerald-500" style={S.border}>
                    <Clock size={18} />
                  </span>
                </div>
                <div className="mt-3.5 h-1.5 overflow-hidden rounded-full border" style={S.border}>
                  <div
                    className={`h-full rounded-full ${(validityDays > 0 && percentRemaining > 20) ? 'bg-emerald-500' : 'bg-red-500'}`}
                    style={{ width: `${percentRemaining}%` }}
                  />
                </div>
                <div className="mt-2.5 flex items-center justify-between text-[10px] font-black uppercase tracking-wider" style={S.muted}>
                  <span>Expires: {new Date(tenant.planExpiresAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                  <span className="capitalize">{tenant?.plan || 'trial'} plan</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </motion.section>

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
        {stats.map((stat, index) => (
          <StatCard key={stat.title} {...stat} index={index} />
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.45fr_0.85fr]">
        <SectionCard className="p-5">
          <div className="mb-5 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-extrabold" style={S.text}>Messages Over Time</h2>
              <p className="text-xs font-semibold mt-0.5" style={S.muted}>Sent and delivered volume across the last week.</p>
            </div>
            <span className="hidden rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-indigo-400 sm:inline-flex" style={S.border}>
              Live trend
            </span>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 12, right: 10, left: -25, bottom: 0 }}>
                <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: 'var(--text-muted)' }} />
                <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: 'var(--text-muted)' }} />
                <Tooltip contentStyle={customTooltipStyle} />
                <Area type="monotone" dataKey="sent" stroke="#6366f1" strokeWidth={2} fill="rgba(99,102,241,0.1)" name="Sent" />
                <Area type="monotone" dataKey="delivered" stroke="#10b981" strokeWidth={2} fill="rgba(16,185,129,0.1)" name="Delivered" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>

        <SectionCard className="p-5">
          <div className="mb-5">
            <h2 className="text-base font-extrabold" style={S.text}>Response Mix</h2>
            <p className="text-xs font-semibold mt-0.5" style={S.muted}>AI, team, and queued conversation handling.</p>
          </div>
          <div className="grid items-center gap-4 sm:grid-cols-[160px_1fr] xl:grid-cols-1">
            <div className="h-40">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={responseMix} innerRadius={42} outerRadius={68} paddingAngle={4} dataKey="value">
                    {responseMix.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={customTooltipStyle} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-2">
              {responseMix.map((item) => (
                <div key={item.name} className="flex items-center justify-between rounded-xl px-3 py-2 border" style={{ ...S.border, backgroundColor: 'var(--bg-input)' }}>
                  <span className="flex items-center gap-2 text-xs font-bold" style={S.sub}>
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} />
                    {item.name}
                  </span>
                  <span className="text-xs font-extrabold" style={S.text}>{item.value}%</span>
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
              <h2 className="text-base font-extrabold" style={S.text}>Quick Actions</h2>
              <p className="text-xs font-semibold mt-0.5" style={S.muted}>Frequent automation tasks.</p>
            </div>
            <Plus size={16} style={S.muted} />
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            {quickActions.map((action) => {
              const Icon = action.icon;
              return (
                <Link
                  key={action.label}
                  to={action.to}
                  className={`group flex min-h-[80px] flex-col justify-between rounded-2xl p-4 transition-all hover:-translate-y-0.5 ${action.tone}`}
                >
                  <Icon size={18} />
                  <span className="flex items-center justify-between gap-2 text-xs font-black uppercase tracking-wider">
                    {action.label}
                    <ArrowRight size={14} className="transition group-hover:translate-x-0.5" />
                  </span>
                </Link>
              );
            })}
          </div>
        </SectionCard>

        <SectionCard className="p-5">
          <div className="mb-5">
            <h2 className="text-base font-extrabold" style={S.text}>Device Status</h2>
            <p className="text-xs font-semibold mt-0.5" style={S.muted}>Connection health and status.</p>
          </div>
          <div className="space-y-3">
            {(deviceHealth.length ? deviceHealth : [{ _id: 'empty', sessionName: 'No device connected', status: 'DISCONNECTED' }]).map((session) => {
              const connected = session.status === 'CONNECTED';
              return (
                <div key={session._id} className="rounded-2xl border p-4" style={{ ...S.border, backgroundColor: 'var(--bg-input)' }}>
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${connected ? 'text-emerald-500' : 'text-slate-400'}`} style={S.border}>
                        <Smartphone size={18} />
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold" style={S.text}>{session.sessionName}</p>
                        <p className="text-xs font-semibold" style={S.muted}>{session.phone ? `+${session.phone}` : 'QR pairing required'}</p>
                      </div>
                    </div>
                    <span className={`rounded-full px-2 py-0.5 text-[9px] font-black uppercase ${connected ? 'bg-emerald-500/10 text-emerald-500' : 'bg-slate-500/10 text-slate-400'}`}>
                      {session.status}
                    </span>
                  </div>
                  <div className="mt-3.5 grid grid-cols-3 gap-2 text-center text-[10px] font-black uppercase tracking-wider" style={S.muted}>
                    <span className="rounded-xl border py-2" style={S.card}>
                      <BatteryCharging size={12} className={`mx-auto mb-1 ${connected ? 'text-emerald-500' : 'text-slate-400'}`} />
                      {connected ? '92%' : 'N/A'}
                    </span>
                    <span className="rounded-xl border py-2" style={S.card}>
                      <Radio size={12} className={`mx-auto mb-1 ${connected ? 'text-indigo-400' : 'text-slate-400'}`} />
                      {connected ? 'Stable' : 'Offline'}
                    </span>
                    <span className="rounded-xl border py-2" style={S.card}>
                      <Clock size={12} className={`mx-auto mb-1 ${connected ? 'text-emerald-500' : 'text-slate-400'}`} />
                      {connected ? 'Active' : 'N/A'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </SectionCard>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <SectionCard className="p-5">
          <div className="mb-5">
            <h2 className="text-base font-extrabold" style={S.text}>Recent Activity</h2>
            <p className="text-xs font-semibold mt-0.5" style={S.muted}>Events across automation, CRM, and AI.</p>
          </div>
          <div className="space-y-4">
            {activityFeed.map((item, index) => {
              const Icon = item.icon;
              return (
                <div key={`${item.title}-${index}`} className="flex gap-3">
                  <span className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${item.tone}`} style={S.border}>
                    <Icon size={16} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-bold" style={S.text}>{item.title}</p>
                      <span className="shrink-0 text-[10px] font-bold" style={S.muted}>{item.time}</span>
                    </div>
                    <p className="mt-1 text-xs font-medium leading-relaxed" style={S.muted}>{item.meta}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </SectionCard>

        <SectionCard className="overflow-hidden">
          <div className="px-5 py-4 border-b flex items-center justify-between" style={S.header}>
            <div>
              <h2 className="text-base font-extrabold" style={S.text}>Chat Preview</h2>
              <p className="text-xs font-semibold mt-0.5" style={S.muted}>Recent conversations from your active queue.</p>
            </div>
            <MessageCircle size={18} className="text-emerald-500" />
          </div>
          <div className="divide-y" style={S.border}>
            {chatPreview.slice(0, 5).map((chat, index) => (
              <div key={`${chat.name}-${index}`} className="flex items-center gap-3 px-5 py-3.5 transition hover:bg-slate-500/5">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-black"
                  style={{ backgroundColor: 'var(--accent-soft)', color: 'var(--accent-text)' }}>
                  {chat.name.charAt(0).toUpperCase()}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-bold" style={S.text}>{chat.name}</p>
                    <span className="shrink-0 text-[10px] font-bold" style={S.muted}>{chat.time}</span>
                  </div>
                  <p className="mt-0.5 truncate text-xs font-medium" style={S.muted}>{chat.message}</p>
                </div>
                {chat.unread > 0 ? (
                  <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-emerald-500 px-1.5 text-[9px] font-black text-white">
                    {chat.unread}
                  </span>
                ) : (
                  <span className="rounded-full px-2 py-0.5 text-[9px] font-black uppercase border" style={S.border}>{chat.status}</span>
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
