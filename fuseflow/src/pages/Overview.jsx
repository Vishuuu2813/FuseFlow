import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import {
  Users,
  Send,
  MessageSquare,
  Activity,
  ArrowUpRight
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { motion } from 'framer-motion';

const chartData = [
  { name: 'Jul 1', sent: 120, delivered: 115 },
  { name: 'Jul 2', sent: 230, delivered: 220 },
  { name: 'Jul 3', sent: 180, delivered: 175 },
  { name: 'Jul 4', sent: 340, delivered: 330 },
  { name: 'Jul 5', sent: 405, delivered: 390 },
  { name: 'Jul 6', sent: 290, delivered: 285 },
  { name: 'Jul 7', sent: 480, delivered: 470 },
];

const MetricCard = ({ title, value, subtext, icon: Icon, color }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="backdrop-blur-md bg-slate-900/40 border border-white/5 shadow-xl rounded-2xl p-6 relative overflow-hidden group"
    >
      <div className="absolute top-0 right-0 h-24 w-24 rounded-full bg-emerald-500/5 blur-2xl group-hover:bg-emerald-500/10 transition-colors duration-300"></div>
      
      <div className="flex justify-between items-start">
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{title}</p>
          <h3 className="text-3xl font-bold text-slate-100 mt-2">{value}</h3>
          <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
            <span className="text-emerald-400 font-medium flex items-center"><ArrowUpRight size={12} /> +12%</span> {subtext}
          </p>
        </div>
        <div className={`p-3 rounded-xl bg-slate-800/40 text-slate-300 group-hover:text-emerald-400 transition-colors duration-200`}>
          <Icon size={22} />
        </div>
      </div>
    </motion.div>
  );
};

const Overview = () => {
  const { tenant } = useAuth();
  const [contactsCount, setContactsCount] = useState(0);
  const [sessionsCount, setSessionsCount] = useState(0);
  const [campaignsCount, setCampaignsCount] = useState(0);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const cRes = await api.get('/contacts');
        setContactsCount(cRes.data.pagination.total || 0);

        const sRes = await api.get('/sessions');
        setSessionsCount(sRes.data.length || 0);

        const campRes = await api.get('/campaigns');
        setCampaignsCount(campRes.data.length || 0);
      } catch (err) {
        // fail silent
      }
    };
    fetchStats();
  }, []);

  return (
    <div className="flex flex-col gap-8">
      {/* Welcome Banner */}
      <div>
        <h1 className="text-2xl font-bold bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">Overview Dashboard</h1>
        <p className="text-slate-400 text-sm mt-1">Real-time summaries of your workspace automation engines.</p>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Total Contacts"
          value={contactsCount}
          subtext="from imports & API"
          icon={Users}
        />
        <MetricCard
          title="Active Campaigns"
          value={campaignsCount}
          subtext="scheduled broadcasts"
          icon={Send}
        />
        <MetricCard
          title="WhatsApp Devices"
          value={`${sessionsCount} / ${tenant?.limits?.maxDevices || 1}`}
          subtext="connected sockets"
          icon={Activity}
        />
        <MetricCard
          title="Monthly Messages"
          value={`${tenant?.usage?.messagesSentThisMonth || 0} / ${tenant?.limits?.maxMessagesPerMonth || 500}`}
          subtext="usage limits"
          icon={MessageSquare}
        />
      </div>

      {/* Chart Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="backdrop-blur-md bg-slate-900/40 border border-white/5 shadow-xl rounded-2xl p-6"
      >
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3 className="text-base font-semibold text-slate-200">Delivery Metrics</h3>
            <p className="text-xs text-slate-500 mt-0.5">Showing daily dispatch volumes over the past week.</p>
          </div>
        </div>

        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorSent" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorDelivered" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2}/>
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
              <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} />
              <YAxis stroke="#64748b" fontSize={11} tickLine={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0f172a',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: '12px',
                  color: '#f8fafc',
                  fontSize: '12px'
                }}
              />
              <Area type="monotone" dataKey="sent" stroke="#10b981" fillOpacity={1} fill="url(#colorSent)" strokeWidth={2} />
              <Area type="monotone" dataKey="delivered" stroke="#3b82f6" fillOpacity={1} fill="url(#colorDelivered)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </motion.div>
    </div>
  );
};

export default Overview;
