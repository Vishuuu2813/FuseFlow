import React, { useEffect, useState, useCallback } from 'react';
import api from '../services/api';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, PieChart, Pie, Cell, Legend
} from 'recharts';
import {
  Send, Users, CheckCheck, Eye, TrendingUp, TrendingDown,
  RefreshCw, MessageSquare, Zap, Target, Clock, BarChart2, AlertCircle
} from 'lucide-react';

const TIMEFRAMES = [
  { label: '7 Days', value: 'weekly' },
  { label: '30 Days', value: 'monthly' },
  { label: '1 Year', value: 'yearly' },
];

const FUNNEL_COLORS = ['#6366f1','#0ea5e9','#f59e0b','#a855f7','#22c55e','#ef4444'];

const S = {
  card: { backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' },
  text: { color: 'var(--text-primary)' },
  sub: { color: 'var(--text-secondary)' },
  muted: { color: 'var(--text-muted)' },
  input: { backgroundColor: 'var(--bg-input)', borderColor: 'var(--border)', color: 'var(--text-primary)' },
};

const fmt = (n) => n >= 1000 ? `${(n/1000).toFixed(1)}k` : String(n ?? 0);

const KpiCard = ({ icon: Icon, label, value, sub, color = '#6366f1', trend }) => (
  <div className="rounded-2xl border p-5 flex flex-col gap-3" style={S.card}>
    <div className="flex items-center justify-between">
      <div className="h-10 w-10 rounded-xl flex items-center justify-center"
        style={{ backgroundColor: color + '22', color }}>
        <Icon size={20} />
      </div>
      {trend !== undefined && (
        <span className={`text-xs font-bold flex items-center gap-1 ${trend >= 0 ? 'text-emerald-500' : 'text-red-400'}`}>
          {trend >= 0 ? <TrendingUp size={12}/> : <TrendingDown size={12}/>} {Math.abs(trend)}%
        </span>
      )}
    </div>
    <div>
      <p className="text-2xl font-extrabold" style={S.text}>{fmt(value)}</p>
      <p className="text-xs font-semibold mt-0.5" style={S.muted}>{label}</p>
      {sub && <p className="text-[11px] mt-1 font-bold" style={{ color }}>{sub}</p>}
    </div>
  </div>
);

const SectionTitle = ({ children }) => (
  <h3 className="text-sm font-black uppercase tracking-wider mb-4" style={S.muted}>{children}</h3>
);

const customTooltipStyle = {
  backgroundColor: 'var(--bg-card)',
  border: '1px solid var(--border)',
  borderRadius: 12,
  color: 'var(--text-primary)',
  fontSize: 11,
  fontWeight: 700,
};

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

  if (loading) return (
    <div className="flex items-center justify-center h-80">
      <div className="h-9 w-9 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent"/>
    </div>
  );

  if (error) return (
    <div className="flex flex-col items-center justify-center h-60 gap-3">
      <AlertCircle size={32} className="text-red-400"/>
      <p className="text-sm font-bold text-red-400">{error}</p>
      <button onClick={load} className="px-4 py-2 rounded-xl text-xs font-bold border" style={S.card}>Retry</button>
    </div>
  );

  const { kpi, messageTrend, contactGrowth, pipelineFunnel, heatmapData, topContacts } = data;

  // Heatmap helpers
  const hours = [...new Set(heatmapData.map(h => h.hour))];
  const days = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
  const heatCell = (day, hour) => heatmapData.find(h => h.day===day && h.hour===hour);
  const maxHeat = Math.max(1, ...heatmapData.map(h=>h.count));

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="font-display text-2xl font-extrabold tracking-tight" style={S.text}>Analytics</h2>
          <p className="text-sm mt-0.5" style={S.muted}>Real-time insights from your workspace</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex gap-1 p-1 rounded-xl border" style={S.card}>
            {TIMEFRAMES.map(tf => (
              <button key={tf.value} onClick={() => setTimeframe(tf.value)}
                className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
                style={timeframe===tf.value ? { backgroundColor:'var(--accent)', color:'#fff' } : S.sub}>
                {tf.label}
              </button>
            ))}
          </div>
          <button onClick={load} className="p-2.5 rounded-xl border transition-colors" style={S.card} title="Refresh">
            <RefreshCw size={15} style={S.sub}/>
          </button>
        </div>
      </div>

      {/* KPI Grid */}
      <div>
        <SectionTitle>Key Metrics</SectionTitle>
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
          <KpiCard icon={Send} label="Messages Sent" value={kpi.totalSent} color="#6366f1" sub={`${kpi.deliveryRate}% delivery rate`}/>
          <KpiCard icon={CheckCheck} label="Delivered" value={kpi.totalDelivered} color="#22c55e" sub={`${kpi.readRate}% read rate`}/>
          <KpiCard icon={Eye} label="Read" value={kpi.totalRead} color="#0ea5e9"/>
          <KpiCard icon={AlertCircle} label="Failed" value={kpi.totalFailed} color="#ef4444"/>
          <KpiCard icon={MessageSquare} label="Incoming Replies" value={kpi.incomingTotal} color="#f59e0b"/>
          <KpiCard icon={Users} label="Total Contacts" value={kpi.totalContacts} color="#a855f7"/>
          <KpiCard icon={Zap} label="Active Flows" value={kpi.totalFlows} color="#06b6d4"/>
          <KpiCard icon={Target} label="Campaigns" value={kpi.totalCampaigns} color="#ec4899"/>
        </div>
      </div>

      {/* Trend + Growth charts */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Message Trend */}
        <div className="rounded-2xl border p-5" style={S.card}>
          <SectionTitle>Message Volume</SectionTitle>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={messageTrend} margin={{top:0,right:8,bottom:0,left:-20}}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)"/>
              <XAxis dataKey="name" tick={{fontSize:10, fill:'var(--text-muted)'}} tickLine={false} axisLine={false}
                interval={Math.max(0, Math.floor(messageTrend.length/6)-1)}/>
              <YAxis tick={{fontSize:10, fill:'var(--text-muted)'}} tickLine={false} axisLine={false}/>
              <Tooltip contentStyle={customTooltipStyle}/>
              <Line type="monotone" dataKey="sent" stroke="#6366f1" strokeWidth={2} dot={false} name="Sent"/>
              <Line type="monotone" dataKey="received" stroke="#22c55e" strokeWidth={2} dot={false} name="Received"/>
              <Legend wrapperStyle={{fontSize:11,color:'var(--text-secondary)'}}/>
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Contact Growth */}
        <div className="rounded-2xl border p-5" style={S.card}>
          <SectionTitle>New Contacts per Day</SectionTitle>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={contactGrowth} margin={{top:0,right:8,bottom:0,left:-20}}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)"/>
              <XAxis dataKey="name" tick={{fontSize:10, fill:'var(--text-muted)'}} tickLine={false} axisLine={false}/>
              <YAxis tick={{fontSize:10, fill:'var(--text-muted)'}} tickLine={false} axisLine={false} allowDecimals={false}/>
              <Tooltip contentStyle={customTooltipStyle}/>
              <Bar dataKey="contacts" fill="#a855f7" radius={[4,4,0,0]} name="New Contacts"/>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Funnel + Top Contacts */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Pipeline Funnel */}
        <div className="rounded-2xl border p-5" style={S.card}>
          <SectionTitle>Contact Pipeline</SectionTitle>
          {pipelineFunnel.length === 0 ? (
            <p className="text-sm text-center py-12" style={S.muted}>No contacts yet</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={pipelineFunnel} dataKey="value" nameKey="name" cx="50%" cy="50%"
                  outerRadius={85} innerRadius={45} paddingAngle={3} label={({name,percent})=>`${name} ${(percent*100).toFixed(0)}%`}
                  labelLine={false}>
                  {pipelineFunnel.map((_, i) => <Cell key={i} fill={FUNNEL_COLORS[i%FUNNEL_COLORS.length]}/>)}
                </Pie>
                <Tooltip contentStyle={customTooltipStyle}/>
                <Legend wrapperStyle={{fontSize:11,color:'var(--text-secondary)'}}/>
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Top Contacts */}
        <div className="rounded-2xl border p-5" style={S.card}>
          <SectionTitle>Most Active Contacts</SectionTitle>
          {topContacts.length === 0 ? (
            <p className="text-sm text-center py-12" style={S.muted}>No message data yet</p>
          ) : (
            <div className="flex flex-col gap-3">
              {topContacts.map((c, i) => {
                const pct = Math.round((c.incoming / (c.messages||1)) * 100);
                return (
                  <div key={i} className="flex items-center gap-3">
                    <span className="h-8 w-8 rounded-full flex items-center justify-center text-white font-black text-xs shrink-0"
                      style={{ backgroundColor: FUNNEL_COLORS[i%FUNNEL_COLORS.length] }}>
                      {c.name.slice(0,2).toUpperCase()}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm font-bold truncate" style={S.text}>{c.name}</span>
                        <span className="text-xs font-bold ml-2 shrink-0" style={S.sub}>{c.messages} msgs</span>
                      </div>
                      <div className="h-1.5 rounded-full" style={{ backgroundColor:'var(--border)' }}>
                        <div className="h-1.5 rounded-full transition-all" style={{ width:`${pct}%`, backgroundColor: FUNNEL_COLORS[i%FUNNEL_COLORS.length] }}/>
                      </div>
                      <p className="text-[10px] mt-0.5" style={S.muted}>{c.incoming} incoming · {c.messages - c.incoming} outgoing</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Activity Heatmap */}
      <div className="rounded-2xl border p-5 overflow-x-auto" style={S.card}>
        <SectionTitle>Message Activity Heatmap (last 28 days)</SectionTitle>
        <div className="flex gap-1 min-w-[560px]">
          {/* Y-axis labels */}
          <div className="flex flex-col gap-1 pt-5 shrink-0">
            {days.map(d => (
              <div key={d} className="h-6 flex items-center text-[10px] font-bold w-7" style={S.muted}>{d}</div>
            ))}
          </div>
          <div className="flex-1">
            {/* X-axis labels */}
            <div className="flex gap-1 mb-1">
              {hours.filter((_,i)=>i%3===0).map(h => (
                <div key={h} className="text-[10px] font-bold flex-1 text-center" style={S.muted}>{h}</div>
              ))}
            </div>
            {/* Grid */}
            {days.map(day => (
              <div key={day} className="flex gap-1 mb-1">
                {hours.map(hour => {
                  const cell = heatCell(day, hour);
                  const intensity = cell ? cell.count / maxHeat : 0;
                  const bg = intensity === 0
                    ? 'var(--bg-input)'
                    : `rgba(99,102,241,${0.15 + intensity * 0.85})`;
                  return (
                    <div key={hour} title={`${day} ${hour}: ${cell?.count||0} msgs`}
                      className="h-6 flex-1 rounded cursor-default transition-colors"
                      style={{ backgroundColor: bg }}/>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2 mt-3 justify-end">
          <span className="text-[10px]" style={S.muted}>Less</span>
          {[0,0.2,0.4,0.7,1].map((v,i)=>(
            <div key={i} className="h-3 w-3 rounded-sm" style={{ backgroundColor: v===0 ? 'var(--bg-input)' : `rgba(99,102,241,${0.15+v*0.85})` }}/>
          ))}
          <span className="text-[10px]" style={S.muted}>More</span>
        </div>
      </div>
    </div>
  );
};

export default Analytics;
