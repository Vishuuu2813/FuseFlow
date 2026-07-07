import React from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  Smartphone,
  Users,
  Send,
  MessageSquare,
  Database,
  LogOut,
  User
} from 'lucide-react';
import { motion } from 'framer-motion';

const SidebarLink = ({ to, icon: Icon, children }) => {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
          isActive
            ? 'bg-emerald-500/10 text-emerald-400 border-l-4 border-emerald-500 font-medium'
            : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
        }`
      }
    >
      <Icon size={20} />
      <span className="text-sm">{children}</span>
    </NavLink>
  );
};

const DashboardLayout = () => {
  const { user, tenant, logout, loading } = useAuth();
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#0b0f19]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent"></div>
      </div>
    );
  }

  if (!user) {
    navigate('/login');
    return null;
  }

  return (
    <div className="flex h-screen bg-[#0b0f19] text-slate-100 overflow-hidden font-sans">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900/40 backdrop-blur-xl border-r border-white/5 flex flex-col justify-between p-4 shrink-0">
        <div>
          {/* Logo */}
          <div className="flex items-center gap-2 px-4 py-4 mb-8">
            <div className="bg-gradient-to-tr from-emerald-500 to-green-400 p-2 rounded-xl text-slate-950 font-bold text-lg shadow-lg shadow-emerald-500/20">
              WF
            </div>
            <div>
              <h1 className="font-semibold text-lg bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">WhatsFlow</h1>
              <p className="text-[10px] text-slate-500 font-medium tracking-wide">ENTERPRISE AUTOMATION</p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="flex flex-col gap-1.5">
            <SidebarLink to="/" icon={LayoutDashboard}>Overview</SidebarLink>
            <SidebarLink to="/sessions" icon={Smartphone}>WhatsApp Devices</SidebarLink>
            <SidebarLink to="/contacts" icon={Users}>CRM & Contacts</SidebarLink>
            <SidebarLink to="/campaigns" icon={Send}>Campaign Broadcaster</SidebarLink>
            <SidebarLink to="/autoreply" icon={MessageSquare}>Auto Reply Rules</SidebarLink>
            <SidebarLink to="/kb" icon={Database}>Knowledge Base</SidebarLink>
          </nav>
        </div>

        {/* Profile Card & Log Out */}
        <div className="border-t border-white/5 pt-4">
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-slate-800/20 border border-white/5 mb-3">
            <div className="h-8 w-8 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-400">
              <User size={16} />
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-semibold text-slate-200 truncate">{user.name}</p>
              <p className="text-[10px] text-slate-500 truncate">{tenant?.name || 'Workspace'}</p>
            </div>
          </div>

          <button
            onClick={logout}
            className="flex w-full items-center gap-3 px-4 py-3 rounded-xl text-slate-400 hover:text-red-400 hover:bg-red-500/5 transition-all duration-200"
          >
            <LogOut size={20} />
            <span className="text-sm font-medium">Log Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Pane */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto bg-gradient-to-b from-slate-950 via-[#0b0f19] to-[#0a0d17]">
        {/* Top Navbar */}
        <header className="h-16 border-b border-white/5 px-8 flex items-center justify-between shrink-0 bg-slate-900/10 backdrop-blur-sm">
          <div>
            <h2 className="text-sm font-medium text-slate-400">Workspace / <span className="text-slate-100 font-semibold">{tenant?.name}</span></h2>
          </div>
          <div className="flex items-center gap-3">
            <span className="px-3 py-1 rounded-full text-[10px] font-semibold tracking-wider uppercase border border-emerald-500/20 bg-emerald-500/5 text-emerald-400">
              {tenant?.plan} plan
            </span>
          </div>
        </header>

        {/* Dynamic Route Content */}
        <div className="p-8 max-w-7xl w-full mx-auto flex-1">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default DashboardLayout;
