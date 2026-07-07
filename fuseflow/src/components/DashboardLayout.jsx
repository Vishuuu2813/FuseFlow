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
  User,
  Shield,
  Layers
} from 'lucide-react';

const SidebarLink = ({ to, icon: Icon, children }) => {
  return (
    <NavLink
      to={to}
      end={to === '/dashboard'}
      className={({ isActive }) =>
        `flex items-center gap-3.5 px-4.5 py-3.5 rounded-xl transition-all duration-200 ${
          isActive
            ? 'bg-emerald-50 text-emerald-700 border-l-4 border-emerald-600 font-bold text-sm shadow-sm'
            : 'text-slate-600 hover:text-emerald-600 hover:bg-slate-100/60 font-semibold text-sm'
        }`
      }
    >
      <Icon size={20} className="shrink-0" />
      <span>{children}</span>
    </NavLink>
  );
};

const DashboardLayout = () => {
  const { user, tenant, logout, loading } = useAuth();
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-emerald-600 border-t-transparent"></div>
      </div>
    );
  }

  if (!user) {
    navigate('/login');
    return null;
  }

  return (
    <div className="flex h-screen bg-slate-100 text-slate-800 overflow-hidden font-sans">
      {/* Sidebar */}
      <aside className="w-68 bg-white border-r border-slate-200/80 flex flex-col justify-between p-5 shrink-0">
        <div>
          {/* Logo */}
          <div className="flex items-center gap-2.5 px-3 py-3 mb-8">
            <div className="bg-gradient-to-tr from-emerald-600 to-teal-500 p-2.5 rounded-xl text-white font-bold text-xl shadow-md shadow-emerald-600/10">
              WF
            </div>
            <div>
              <h1 className="font-extrabold text-xl bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">WhatsFlow</h1>
              <p className="text-[10px] text-slate-400 font-semibold tracking-wider uppercase">ENTERPRISE AUTOMATION</p>
            </div>
          </div>
          
          {/* Navigation Links */}
          <nav className="flex flex-col gap-2">
            {/* If user is Global Admin (no tenantId) */}
            {!user.tenantId ? (
              <>
                <SidebarLink to="/dashboard/admin" icon={Shield}>Admin Panel</SidebarLink>
                <SidebarLink to="/dashboard/tenants" icon={Layers}>Workspaces</SidebarLink>
                <SidebarLink to="/dashboard/users" icon={Users}>Users</SidebarLink>
              </>
            ) : (
              // Workspace-Specific Sidebar Tabs
              <>
                <SidebarLink to="/dashboard" icon={LayoutDashboard}>Overview</SidebarLink>
                <SidebarLink to="/dashboard/sessions" icon={Smartphone}>WhatsApp Devices</SidebarLink>
                <SidebarLink to="/dashboard/contacts" icon={Users}>CRM & Contacts</SidebarLink>
                <SidebarLink to="/dashboard/campaigns" icon={Send}>Campaign Broadcaster</SidebarLink>
                <SidebarLink to="/dashboard/autoreply" icon={MessageSquare}>Auto Reply Rules</SidebarLink>
                <SidebarLink to="/dashboard/kb" icon={Database}>Knowledge Base</SidebarLink>
                <SidebarLink to="/dashboard/users" icon={Users}>Users</SidebarLink>
              </>
            )}
          </nav>
        </div>

        {/* Profile Card & Log Out */}
        <div className="border-t border-slate-100 pt-4">
          <div className="flex items-center gap-3 px-3 py-3 rounded-xl bg-slate-50 border border-slate-200/60 mb-4">
            <div className="h-9 w-9 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600 border border-emerald-100">
              <User size={18} />
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-bold text-slate-800 truncate">{user.name}</p>
              <p className="text-xs text-slate-400 font-medium truncate">{tenant?.name || 'Admin Console'}</p>
            </div>
          </div>

          <button
            onClick={logout}
            className="flex w-full items-center gap-3.5 px-4.5 py-3.5 rounded-xl text-slate-600 hover:text-red-600 hover:bg-red-50 font-bold text-sm cursor-pointer transition-colors"
          >
            <LogOut size={20} className="shrink-0 text-slate-500 hover:text-red-500" />
            <span>Log Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Pane */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto bg-slate-50">
        {/* Top Navbar */}
        <header className="h-16 border-b border-slate-200 bg-white px-8 flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-sm font-bold text-slate-400">Workspace / <span className="text-slate-800 font-extrabold">{tenant?.name || 'Admin Console'}</span></h2>
          </div>
          <div className="flex items-center gap-3">
            <span className="px-3.5 py-1.5 rounded-full text-xs font-bold tracking-wide border border-emerald-200 bg-emerald-50 text-emerald-700">
              {tenant?.plan || 'Admin'} plan
            </span>
          </div>
        </header>

        {/* Dynamic Route Content */}
        <div className="p-8 w-full flex-1">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default DashboardLayout;
