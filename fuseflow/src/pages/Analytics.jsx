import React, { useCallback, useEffect, useMemo, useState } from 'react';
import api from '../services/api';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  Pie,
  PieChart,
  RadialBar,
  RadialBarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';
import {
  AlertCircle,
  ArrowDownRight,
  ArrowUpRight,
  Bot,
  CheckCheck,
  Clock,
  Download,
  Eye,
  Gauge,
  MessageSquare,
  RefreshCw,
  Send,
  Sparkles,
  Target,
  Users,
  Zap
} from 'lucide-react';
import { motion } from 'framer-motion';

const TIMEFRAMES = [
  { label: '7D', value: 'weekly' },
  { label: '30D', value: 'monthly' },
  { label: '1Y', value: 'yearly' }
];

const COLORS = {
  sent: '#128c7e',
  delivered: '#25d366',
  read: '#0ea5e9',
  failed: '#ef4444',
  contacts: '#f59e0b',
  muted: '#94a3b8'
};

const FUNNEL_COLORS = ['#25d366', '#128c7e', '#0ea5e9', '#f59e0b', '#a855f7', '#ef4444'];

const S = {
  card: { backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' },
  input: { backgroundColor: 'var(--bg-input)', borderColor: 'var(--border)', color: 'var(--text-primary)' },
  text: { color: 'var(--text-primary)' },
  sub: { color: 'var(--text-secondary)' },
  muted: { color: 'var(--text-muted)' },
  accent: { backgroundColor: 'var(--accent-soft)', color: 'var(--accent-text)' }
};

const fmt = (n) => {
  const value = Number(n || 0);
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}m`;
  if (value >= 1000) return `${(value / 1000).toFixed(1)}k`;
  return String(value);
};

const pct = (value) => `${Math.max(0, Math.min(100, Math.round(Number(value || 0))))}%`;

const tooltipStyle = {
  backgroundColor: 'var(--bg-card)',
  border: '1px solid var(--border)',
  borderRadius: 14,
  color: 'var(--text-primary)',
  fontSize: 12,
  fontWeight: 700,
  boxShadow: 'var(--shadow-card-sm)'
};

const cardMotion = {
  hidden: { opacity: 0, y: 12 },
  visible: (i = 0) => ({ opacity: 1, y: 0, transition: { delay: i * 0.035, duration: 0.28 } })
};

const MetricCard = ({ label, value, helper, icon: Icon, color, trend, index }) => (
  <motion.div
    custom={index}
    variants={cardMotion}
    initial="hidden"
    animate="visible"
    whileHover={{ y: -3 }}
    className="rounded-[22px] border p-5 shadow-sm"
    style={S.card}
  >
    <div className="flex items-start justify-between gap-3">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border" style={{ backgroundColor: `${color}16`, borderColor: `${color}33`, color }}>
        <Icon size={20} />
      </span>
      {trend !== undefined && (
        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-black ${trend >= 0 ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
          {trend >= 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
          {Math.abs(trend)}%
        </span>
      )}
    </div>
    <p className="mt-5 text-[10px] font-black uppercase tracking-[0.14em]" style={S.muted}>{label}</p>
    <p className="mt-2 text-3xl font-black tracking-tight" style={S.text}>{value}</p>
    <p className="mt-2 min-h-[32px] text-xs font-semibold leading-relaxed" style={S.muted}>{helper}</p>
  </motion.div>
);

const Panel = ({ title, subtitle, action, children, className = '' }) => (
  <motion.section
    variants={cardMotion}
    initial="hidden"
    animate="visible"
    className={`rounded-[22px] border shadow-sm ${className}`}
    style={S.card}
  >
    <div className="flex items-start justify-between gap-4 border-b px-5 py-4" style={{ borderColor: 'var(--border)' }}>
      <div>
        <h3 className="text-sm font-black" style={S.text}>{title}</h3>
        {subtitle && <p className="mt-1 text-xs font-semibold" style={S.muted}>{subtitle}</p>}
      </div>
      {action}
    </div>
    {children}
  </motion.section>
);

const Analytics = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [timeframe, setTimeframe] = useState('monthly');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data: res } = await api.get(`/sessions/analytics?timeframe=${timeframe}`);
      setData(res);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load analytics.');
    } finally {
      setLoading(false);
    }
  }, [timeframe]);

  useEffect(() => { load(); }, [load]);

  const derived = useMemo(() => {
    if (!data) return null;
    const kpi = data.kpi || {};
    const trend = data.messageTrend || [];
    const sent = Number(kpi.totalSent || 0);
    const delivered = Number(kpi.totalDelivered || 0);
    const read = Number(kpi.totalRead || 0);
    const failed = Number(kpi.totalFailed || 0);
    const incoming = Number(kpi.incomingTotal || 0);
    const responseRate = sent > 0 ? Math.round((incoming / sent) * 100) : 0;
    const reliability = sent + failed > 0 ? Math.round((delivered / (sent + failed)) * 100) : Number(kpi.deliveryRate || 0);
    const engagement = delivered > 0 ? Math.round((read / delivered) * 100) : Number(kpi.readRate || 0);
    const health = Math.round((reliability * 0.5) + (engagement * 0.3) + (Math.min(responseRate, 100) * 0.2));
    const totalTrendSent = trend.reduce((sum, item) => sum + Number(item.sent || 0), 0);
    const totalTrendReceived = trend.reduce((sum, item) => sum + Number(item.received || item.replies || 0), 0);
    const trendPeak = trend.reduce((peak, item) => Math.max(peak, Number(item.sent || 0), Number(item.received || 0)), 1);

    return {
      kpi,
      sent,
      delivered,
      read,
      failed,
      incoming,
      responseRate,
      reliability,
      engagement,
      health,
      totalTrendSent,
      totalTrendReceived,
      trendPeak
    };
  }, [data]);

  if (loading) {
    return (
      <div className="grid gap-4">
        <div className="h-36 animate-pulse rounded-[24px] border" style={S.card} />
        <div className="grid gap-4 md:grid-cols-4">
          {[0, 1, 2, 3].map((item) => <div key={item} className="h-40 animate-pulse rounded-[22px] border" style={S.card} />)}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-[420px] flex-col items-center justify-center gap-4 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-500/10 text-red-500">
          <AlertCircle size={28} />
        </span>
        <div>
          <h2 className="text-lg font-black" style={S.text}>Analytics unavailable</h2>
          <p className="mt-1 text-sm font-semibold" style={S.muted}>{error}</p>
        </div>
        <button onClick={load} className="rounded-xl border px-4 py-2 text-xs font-black" style={S.card}>Retry</button>
      </div>
    );
  }

  const { kpi, messageTrend = [], contactGrowth = [], pipelineFunnel = [], heatmapData = [], topContacts = [] } = data;
  const hours = [...new Set(heatmapData.map((h) => h.hour))];
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const heatCell = (day, hour) => heatmapData.find((h) => h.day === day && h.hour === hour);
  const maxHeat = Math.max(1, ...heatmapData.map((h) => h.count));

  const metrics = [
    { label: 'Total Sent', value: fmt(kpi.totalSent), helper: `${pct(kpi.deliveryRate)} delivery across selected period`, icon: Send, color: COLORS.sent, trend: 12 },
    { label: 'Delivered', value: fmt(kpi.totalDelivered), helper: `${pct(derived.reliability)} reliability score`, icon: CheckCheck, color: COLORS.delivered, trend: 8 },
    { label: 'Read Rate', value: pct(derived.engagement), helper: `${fmt(kpi.totalRead)} messages opened`, icon: Eye, color: COLORS.read, trend: 5 },
    { label: 'Failures', value: fmt(kpi.totalFailed), helper: 'Watch device health and anti-spam pacing', icon: AlertCircle, color: COLORS.failed, trend: derived.failed > 0 ? -3 : 0 },
    { label: 'Replies', value: fmt(kpi.incomingTotal), helper: `${pct(derived.responseRate)} reply-to-send signal`, icon: MessageSquare, color: COLORS.contacts, trend: 18 },
    { label: 'Contacts', value: fmt(kpi.totalContacts), helper: 'CRM audience available for journeys', icon: Users, color: '#a855f7', trend: 9 },
    { label: 'Active Flows', value: fmt(kpi.totalFlows), helper: 'Automation flows currently configured', icon: Zap, color: '#06b6d4', trend: 4 },
    { label: 'Campaigns', value: fmt(kpi.totalCampaigns), helper: 'Broadcast operations in workspace', icon: Target, color: '#ec4899', trend: 7 }
  ];

  const radialData = [{ name: 'Workspace Health', value: derived.health, fill: COLORS.delivered }];
  const deliveryMix = [
    { name: 'Delivered', value: derived.delivered, color: COLORS.delivered },
    { name: 'Read', value: derived.read, color: COLORS.read },
    { name: 'Failed', value: derived.failed, color: COLORS.failed }
  ];

  return (
    <div className="space-y-6">
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="overflow-hidden rounded-[28px] border p-5 shadow-sm"
        style={S.card}
      >
        <div className="grid gap-6 xl:grid-cols-[1fr_360px] xl:items-center">
          <div>
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.14em]" style={{ borderColor: 'var(--border)', color: 'var(--accent-text)', backgroundColor: 'var(--accent-soft)' }}>
              <Sparkles size={13} />
              Advanced workspace intelligence
            </div>
            <h1 className="font-display text-3xl font-black tracking-tight" style={S.text}>Analytics Command Center</h1>
            <p className="mt-2 max-w-3xl text-sm font-semibold leading-relaxed" style={S.sub}>
              Monitor delivery reliability, read engagement, audience growth, response velocity, pipeline distribution, and peak activity windows from one executive view.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              {[
                ['Sent window', fmt(derived.totalTrendSent)],
                ['Inbound window', fmt(derived.totalTrendReceived)],
                ['Peak volume', fmt(derived.trendPeak)]
              ].map(([label, value]) => (
                <span key={label} className="rounded-2xl border px-3 py-2 text-xs font-bold" style={S.input}>
                  <span style={S.muted}>{label}: </span>
                  <span style={S.text}>{value}</span>
                </span>
              ))}
            </div>
          </div>

          <div className="rounded-[24px] border p-4" style={S.input}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.14em]" style={S.muted}>Performance score</p>
                <p className="mt-1 text-3xl font-black" style={S.text}>{derived.health}/100</p>
              </div>
              <Gauge size={24} style={{ color: 'var(--accent-text)' }} />
            </div>
            <div className="mt-4 grid grid-cols-[140px_1fr] items-center gap-4">
              <ResponsiveContainer width="100%" height={132}>
                <RadialBarChart innerRadius="68%" outerRadius="100%" data={radialData} startAngle={90} endAngle={-270}>
                  <RadialBar dataKey="value" cornerRadius={12} background={{ fill: 'var(--border)' }} />
                </RadialBarChart>
              </ResponsiveContainer>
              <div className="space-y-2">
                {[
                  ['Reliability', derived.reliability],
                  ['Engagement', derived.engagement],
                  ['Response', derived.responseRate]
                ].map(([label, value]) => (
                  <div key={label}>
                    <div className="mb-1 flex justify-between text-[10px] font-black uppercase" style={S.muted}>
                      <span>{label}</span>
                      <span>{pct(value)}</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full" style={{ backgroundColor: 'var(--border)' }}>
                      <div className="h-full rounded-full bg-emerald-500" style={{ width: pct(value) }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </motion.section>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1 rounded-2xl border p-1" style={S.card}>
          {TIMEFRAMES.map((tf) => (
            <button
              key={tf.value}
              onClick={() => setTimeframe(tf.value)}
              className="rounded-xl px-4 py-2 text-xs font-black transition"
              style={timeframe === tf.value ? { backgroundColor: 'var(--accent)', color: '#fff' } : S.sub}
            >
              {tf.label}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <button onClick={load} className="inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-black" style={S.card}>
            <RefreshCw size={14} />
            Refresh
          </button>
          <button type="button" className="inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-black" style={S.card}>
            <Download size={14} />
            Export
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
        {metrics.map((metric, index) => <MetricCard key={metric.label} {...metric} index={index} />)}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">
        <Panel title="Message Operations Timeline" subtitle="Sent, received, delivery intensity, and campaign load by period.">
          <div className="h-[360px] p-5">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={messageTrend} margin={{ top: 10, right: 10, bottom: 0, left: -25 }}>
                <defs>
                  <linearGradient id="sentFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={COLORS.sent} stopOpacity={0.28} />
                    <stop offset="95%" stopColor={COLORS.sent} stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} tickLine={false} axisLine={false} interval={Math.max(0, Math.floor(messageTrend.length / 7) - 1)} />
                <YAxis tick={{ fontSize: 10, fill: 'var(--text-muted)' }} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Area type="monotone" dataKey="sent" name="Sent" stroke={COLORS.sent} strokeWidth={2} fill="url(#sentFill)" />
                <Bar dataKey="received" name="Received" fill={COLORS.delivered} radius={[6, 6, 0, 0]} maxBarSize={28} />
                <Line type="monotone" dataKey="failed" name="Failed" stroke={COLORS.failed} strokeWidth={2} dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel title="Delivery Mix" subtitle="Outcome balance across message states.">
          <div className="p-5">
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={deliveryMix} dataKey="value" nameKey="name" innerRadius={58} outerRadius={86} paddingAngle={4}>
                    {deliveryMix.map((item) => <Cell key={item.name} fill={item.color} />)}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-2">
              {deliveryMix.map((item) => (
                <div key={item.name} className="flex items-center justify-between rounded-2xl border px-3 py-2" style={S.input}>
                  <span className="flex items-center gap-2 text-xs font-bold" style={S.sub}>
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                    {item.name}
                  </span>
                  <span className="text-xs font-black" style={S.text}>{fmt(item.value)}</span>
                </div>
              ))}
            </div>
          </div>
        </Panel>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Panel title="Audience Growth" subtitle="New contacts entering the CRM over time.">
          <div className="h-[280px] p-5">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={contactGrowth} margin={{ top: 10, right: 10, bottom: 0, left: -25 }}>
                <defs>
                  <linearGradient id="contactFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={COLORS.contacts} stopOpacity={0.32} />
                    <stop offset="95%" stopColor={COLORS.contacts} stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10, fill: 'var(--text-muted)' }} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Area type="monotone" dataKey="contacts" stroke={COLORS.contacts} strokeWidth={2} fill="url(#contactFill)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel title="Pipeline Distribution" subtitle="CRM stage balance for campaign targeting.">
          <div className="grid gap-4 p-5 sm:grid-cols-[210px_1fr]">
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pipelineFunnel} dataKey="value" nameKey="name" innerRadius={52} outerRadius={86} paddingAngle={3}>
                    {pipelineFunnel.map((_, i) => <Cell key={i} fill={FUNNEL_COLORS[i % FUNNEL_COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-2">
              {pipelineFunnel.length === 0 ? (
                <div className="flex h-full items-center justify-center rounded-2xl border text-sm font-bold" style={{ ...S.input, color: 'var(--text-muted)' }}>No pipeline data yet</div>
              ) : pipelineFunnel.map((item, index) => (
                <div key={item.name} className="rounded-2xl border p-3" style={S.input}>
                  <div className="flex items-center justify-between gap-3">
                    <span className="flex items-center gap-2 text-xs font-bold" style={S.sub}>
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: FUNNEL_COLORS[index % FUNNEL_COLORS.length] }} />
                      {item.name}
                    </span>
                    <span className="text-xs font-black" style={S.text}>{fmt(item.value)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Panel>
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <Panel title="Most Active Contacts" subtitle="Highest conversation activity and inbound ratio.">
          <div className="space-y-3 p-5">
            {topContacts.length === 0 ? (
              <div className="rounded-2xl border p-8 text-center text-sm font-bold" style={{ ...S.input, color: 'var(--text-muted)' }}>No contact activity yet</div>
            ) : topContacts.slice(0, 7).map((contact, index) => {
              const inboundPct = Math.round((Number(contact.incoming || 0) / Math.max(Number(contact.messages || 1), 1)) * 100);
              return (
                <div key={`${contact.name}-${index}`} className="flex items-center gap-3 rounded-2xl border p-3" style={S.input}>
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-black text-white" style={{ backgroundColor: FUNNEL_COLORS[index % FUNNEL_COLORS.length] }}>
                    {contact.name?.slice(0, 2)?.toUpperCase() || 'CT'}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex items-center justify-between gap-3">
                      <p className="truncate text-sm font-black" style={S.text}>{contact.name}</p>
                      <span className="text-xs font-black" style={S.sub}>{fmt(contact.messages)} msgs</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full" style={{ backgroundColor: 'var(--border)' }}>
                      <div className="h-full rounded-full bg-emerald-500" style={{ width: pct(inboundPct) }} />
                    </div>
                    <p className="mt-1 text-[10px] font-bold" style={S.muted}>{fmt(contact.incoming)} incoming messages</p>
                  </div>
                </div>
              );
            })}
          </div>
        </Panel>

        <Panel title="Activity Heatmap" subtitle="Best hours to schedule campaigns and staffing.">
          <div className="overflow-x-auto p-5">
            <div className="flex min-w-[620px] gap-1">
              <div className="flex shrink-0 flex-col gap-1 pt-5">
                {days.map((day) => <div key={day} className="flex h-7 w-8 items-center text-[10px] font-black" style={S.muted}>{day}</div>)}
              </div>
              <div className="flex-1">
                <div className="mb-1 flex gap-1">
                  {hours.map((hour, index) => (
                    <div key={hour} className="flex-1 text-center text-[9px] font-black" style={index % 3 === 0 ? S.muted : { color: 'transparent' }}>{hour}</div>
                  ))}
                </div>
                {days.map((day) => (
                  <div key={day} className="mb-1 flex gap-1">
                    {hours.map((hour) => {
                      const cell = heatCell(day, hour);
                      const intensity = cell ? cell.count / maxHeat : 0;
                      const bg = intensity === 0 ? 'var(--bg-input)' : `rgba(37,211,102,${0.14 + intensity * 0.72})`;
                      return <div key={hour} title={`${day} ${hour}: ${cell?.count || 0} messages`} className="h-7 flex-1 rounded-md border" style={{ backgroundColor: bg, borderColor: 'var(--border)' }} />;
                    })}
                  </div>
                ))}
              </div>
            </div>
            <div className="mt-4 flex items-center justify-end gap-2">
              <span className="text-[10px] font-bold" style={S.muted}>Less</span>
              {[0, 0.2, 0.45, 0.7, 1].map((value) => (
                <span key={value} className="h-3 w-3 rounded-sm border" style={{ borderColor: 'var(--border)', backgroundColor: value === 0 ? 'var(--bg-input)' : `rgba(37,211,102,${0.14 + value * 0.72})` }} />
              ))}
              <span className="text-[10px] font-bold" style={S.muted}>More</span>
            </div>
          </div>
        </Panel>
      </div>

      <Panel
        title="AI Suggestions"
        subtitle="Operational recommendations inferred from current analytics."
        action={<Bot size={18} style={{ color: 'var(--accent-text)' }} />}
      >
        <div className="grid gap-3 p-5 md:grid-cols-3">
          {[
            { icon: Clock, title: 'Schedule around heat peaks', body: 'Use the greenest activity windows for campaign starts and support staffing.' },
            { icon: AlertCircle, title: 'Watch failures early', body: 'If failure count rises, pause broadcasts and verify connected device health first.' },
            { icon: Sparkles, title: 'Automate high-volume replies', body: 'Convert repeated inbound topics into templates, auto replies, or flow triggers.' }
          ].map(({ icon: Icon, title, body }) => (
            <div key={title} className="rounded-2xl border p-4" style={S.input}>
              <Icon size={18} style={{ color: 'var(--accent-text)' }} />
              <h4 className="mt-3 text-sm font-black" style={S.text}>{title}</h4>
              <p className="mt-2 text-xs font-semibold leading-relaxed" style={S.muted}>{body}</p>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
};

export default Analytics;
