import React, { useEffect, useState, useCallback } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Activity,
  Bell,
  Building2,
  ChevronDown,
  Clock,
  Contact,
  Database,
  FileText,
  LayoutDashboard,
  Lock,
  LogOut,
  Mail,
  Menu,
  MessageSquare,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  Send,
  Settings,
  Shield,
  Smartphone,
  Sun,
  Tag,
  User,
  Users,
  Wifi,
  Workflow,
  X,
  Zap
} from 'lucide-react';
import brandLogo from '../assets/Icon.png';
import CommandPalette from './CommandPalette';

const workspaceLinks = [
  {
    label: 'Command Center',
    items: [
      { to: '/dashboard', icon: LayoutDashboard, label: 'Overview', end: true },
      { to: '/dashboard/analytics', icon: Activity, label: 'Analytics' }
    ]
  },
  {
    label: 'Messaging',
    items: [
      { to: '/dashboard/sessions', icon: Smartphone, label: 'Connection' },
      { to: '/dashboard/live-chat', icon: MessageSquare, label: 'Live Chat' },
      { to: '/dashboard/send-message', icon: Mail, label: 'Send Message', permissionKey: 'sendMessage' },
      { to: '/dashboard/smart-broadcast', icon: Zap, label: 'Smart Campaign', gate: 'bulkScheduling', permissionKey: 'smartBroadcast' },
      { to: '/dashboard/templates', icon: FileText, label: 'Message Templates' },
      { to: '/dashboard/flows', icon: Workflow, label: 'Flow Builder', gate: 'flowBuilder', permissionKey: 'flowBuilder' },
      { to: '/dashboard/autoreply', icon: MessageSquare, label: 'Auto Reply', gate: 'aiAutoReply', permissionKey: 'aiAutoReply' },
      { to: '/dashboard/message-logs', icon: FileText, label: 'Message Log', permissionKey: 'messageLogs' }
    ]
  },
  {
    label: 'Workspace',
    items: [
      { to: '/dashboard/contacts', icon: Contact, label: 'CRM Contacts', permissionKey: 'contacts' },
      { to: '/dashboard/kb', icon: Database, label: 'Knowledge Base', permissionKey: 'kb' },
      { to: '/dashboard/profile', icon: User, label: 'My Profile' },
      { to: '/dashboard/billing', icon: Tag, label: 'My Plan' }
    ]
  }
];

const adminLinks = [
  {
    label: 'Admin Console',
    items: [
      { to: '/dashboard/admin', icon: Shield, label: 'Overview', end: true },
      { to: '/dashboard/admin/workspaces', icon: Building2, label: 'Workspaces' },
      { to: '/dashboard/users', icon: Users, label: 'Users' },
      { to: '/dashboard/plans', icon: Tag, label: 'Pricing Plans' },
      { to: '/dashboard/admin/billing', icon: Tag, label: 'Admin Billing' },
      { to: '/dashboard/admin/config', icon: Settings, label: 'Global Config' },
      { to: '/dashboard/admin/logs', icon: Clock, label: 'Audit Logs' },
      { to: '/dashboard/admin/security', icon: Lock, label: 'Admin Security' }
    ]
  }
];

const allLinks = [...workspaceLinks, ...adminLinks].flatMap((section) => section.items);

const isLocked = (tenant, user, item) => {
  // Plan/Tenant level limit lock
  if (item.gate && tenant?.limits?.[item.gate] === false) {
    return 'plan';
  }
  // Individual User permission level lock
  if (item.permissionKey && user?.permissions?.[item.permissionKey] === false) {
    return 'user';
  }
  return null;
};

const SidebarLink = ({ item, tenant, user, collapsed, onLockedClick }) => {
  const lockType = isLocked(tenant, user, item);
  const locked = Boolean(lockType);
  const Icon = item.icon;

  if (locked) {
    return (
      <button
        type="button"
        onClick={() => onLockedClick(lockType)}
        title={collapsed ? item.label : undefined}
        className={`group flex w-full items-center rounded-xl text-sm font-semibold text-slate-400 transition-all duration-200 hover:bg-slate-500/5 ${
          collapsed ? 'justify-center px-0 py-3' : 'justify-between px-3 py-2.5'
        }`}
      >
        <span className={`flex items-center ${collapsed ? 'justify-center' : 'gap-3'}`}>
          <Icon size={18} className="shrink-0 opacity-60" />
          {!collapsed && <span className="truncate">{item.label}</span>}
        </span>
        {!collapsed && <Lock size={13} className="shrink-0 opacity-60" />}
      </button>
    );
  }

  return (
    <NavLink
      to={item.to}
      end={item.end}
      title={collapsed ? item.label : undefined}
      className={({ isActive }) =>
        `group relative flex items-center rounded-xl text-sm font-semibold transition-all duration-200 ${
          collapsed ? 'justify-center px-0 py-3' : 'gap-3 px-3 py-2.5'
        } ${
          isActive
            ? 'bg-white text-indigo-700 shadow-sm ring-1 ring-indigo-100'
            : 'text-slate-600 hover:bg-white/80 hover:text-slate-950'
        }`
      }
    >
      {({ isActive }) => (
        <>
          <span
            className={`absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-indigo-600 transition-opacity ${
              isActive ? 'opacity-100' : 'opacity-0'
            }`}
          />
          <Icon size={18} className="shrink-0" />
          {!collapsed && <span className="truncate">{item.label}</span>}
        </>
      )}
    </NavLink>
  );
};

const DashboardLayout = () => {
  const { user, tenant, logout, loading, stopImpersonating } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [dark, setDark] = useState(() => localStorage.getItem('fuseflow-theme') !== 'light');
  const [showCommandPalette, setShowCommandPalette] = useState(false);

  const toggleCommandPalette = useCallback(() => {
    setShowCommandPalette((prev) => !prev);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e) => {
      // ⌘K or Ctrl+K
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        toggleCommandPalette();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleCommandPalette]);

  const getValidityDays = () => {
    if (!tenant?.planExpiresAt) return null;
    const expiresAt = new Date(tenant.planExpiresAt);
    const now = new Date();
    const diffTime = expiresAt - now;
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };
  const validityDays = getValidityDays();

  React.useEffect(() => {
    if (!loading && !user) {
      navigate('/login');
    }
  }, [user, loading, navigate]);

  React.useEffect(() => {
    localStorage.setItem('fuseflow-theme', dark ? 'dark' : 'light');
  }, [dark]);

  React.useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  let navSections = [];
  if (!user?.tenantId) {
    navSections = adminLinks;
  } else {
    navSections = workspaceLinks;
  }

  const activeLink = allLinks.find((item) => {
    if (item.end) return location.pathname === item.to;
    return location.pathname.startsWith(item.to);
  });

  const handleLockedClick = (lockType) => {
    if (lockType === 'plan') {
      alert('This premium feature is disabled on your current plan. Please upgrade your subscription plan to unlock it.');
    } else {
      alert('Access Denied: You do not have permission to access this page. Please contact your system administrator.');
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#f6f7fb]">
        <div className="h-11 w-11 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className={`${dark ? 'ff-dark' : ''} ff-shell min-h-screen text-slate-900 flex flex-col`} style={{ backgroundColor: 'var(--bg-base)', color: 'var(--text-primary)' }}>
      {user?.isImpersonated && (
        <div className="bg-amber-600 text-white px-6 py-3 flex items-center justify-between text-xs font-bold shrink-0 shadow-md">
          <span className="flex items-center gap-2">
            ⚠️ Impersonating workspace: <strong className="underline">{tenant?.name || 'Client Workspace'}</strong> ({user.email})
          </span>
          <button
            onClick={stopImpersonating}
            className="bg-white text-amber-700 px-3.5 py-1.5 rounded-xl font-black hover:bg-amber-50 transition cursor-pointer"
          >
            Return to Super Admin
          </button>
        </div>
      )}
      <div className="flex flex-1 h-0 overflow-hidden">
        <aside
          style={{ backgroundColor: 'var(--bg-sidebar)', borderColor: 'var(--border)' }}
          className={`hidden shrink-0 border-r px-3 py-4 backdrop-blur-xl transition-all duration-300 lg:flex lg:flex-col ${
            collapsed ? 'w-[88px]' : 'w-[288px]'
          }`}
        >
          <div className={`flex items-center ${collapsed ? 'justify-center' : 'justify-between'} px-2`}>
            <div className={`flex min-w-0 items-center gap-3 ${collapsed ? 'justify-center' : ''}`}>
              <img src={brandLogo} alt="FuseFlow" className="h-11 w-11 shrink-0 rounded-2xl object-contain shadow-sm" />
              {!collapsed && (
                <div className="min-w-0">
                  <h1 className="font-display text-xl font-extrabold tracking-tight text-slate-950">FuseFlow</h1>
                  <p className="text-[10px] font-extrabold uppercase tracking-[0.22em] text-indigo-500">Messaging OS</p>
                </div>
              )}
            </div>
            {!collapsed && (
              <button
                type="button"
                onClick={() => setCollapsed(true)}
                className="rounded-xl p-2 text-slate-400 transition hover:bg-white hover:text-slate-700"
                aria-label="Collapse sidebar"
              >
                <PanelLeftClose size={18} />
              </button>
            )}
          </div>

          {collapsed && (
            <button
              type="button"
              onClick={() => setCollapsed(false)}
              className="mx-auto mt-4 rounded-xl p-2 text-slate-400 transition hover:bg-white hover:text-slate-700"
              aria-label="Expand sidebar"
            >
              <PanelLeftOpen size={18} />
            </button>
          )}

          {!collapsed && (
            <div className="mt-5 rounded-2xl border p-3" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}>
              <button type="button" className="flex w-full items-center justify-between gap-3 text-left">
                <span className="flex min-w-0 items-center gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" style={{ backgroundColor: 'var(--accent-soft)', color: 'var(--accent-text)' }}>
                    <Building2 size={18} />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-extrabold" style={{ color: 'var(--text-primary)' }}>{tenant?.name || 'Admin Console'}</span>
                    <span className="block truncate text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>
                      {tenant?.plan || 'Workspace'} plan
                      {validityDays !== null && ` (${validityDays > 0 ? `${validityDays}d left` : validityDays === 0 ? 'today' : 'expired'})`}
                    </span>
                  </span>
                </span>
                <ChevronDown size={16} style={{ color: 'var(--text-muted)' }} />
              </button>
            </div>
          )}

          <nav className="mt-5 flex-1 space-y-5 overflow-y-auto pr-1">
            {navSections.map((section) => (
              <div key={section.label}>
                {!collapsed && (
                  <p className="mb-2 px-3 text-[10px] font-extrabold uppercase tracking-[0.2em] text-slate-400">
                    {section.label}
                  </p>
                )}
                <div className="space-y-1">
                  {section.items.map((item) => (
                    <SidebarLink
                      key={item.to}
                      item={item}
                      tenant={tenant}
                      user={user}
                      collapsed={collapsed}
                      onLockedClick={handleLockedClick}
                    />
                  ))}
                </div>
              </div>
            ))}
          </nav>

          <div className="mt-4 border-t pt-4" style={{ borderColor: 'var(--border)' }}>
            {!collapsed && (
              <NavLink
                to="/dashboard/profile"
                className="mb-3 flex items-center gap-3 rounded-2xl border p-3 transition"
                style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-sm font-extrabold text-white">
                  {user.name?.charAt(0)?.toUpperCase() || 'U'}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-extrabold" style={{ color: 'var(--text-primary)' }}>{user.name}</span>
                  <span className="block truncate text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>{user.email || tenant?.name || 'Secure user'}</span>
                </span>
              </NavLink>
            )}
            <button
              type="button"
              onClick={logout}
              className={`flex w-full items-center rounded-xl text-sm font-bold transition ${
                collapsed ? 'justify-center p-3' : 'gap-3 px-3 py-2.5'
              }`}
              style={{ color: 'var(--text-secondary)' }}
              onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'var(--danger-soft)'; e.currentTarget.style.color = 'var(--danger-text)'; }}
              onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
            >
              <LogOut size={18} />
              {!collapsed && <span>Log Out</span>}
            </button>
          </div>
        </aside>

        <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <header className="sticky top-0 z-30 border-b px-4 py-3 backdrop-blur-xl sm:px-6 lg:px-8" style={{ backgroundColor: 'var(--bg-header)', borderColor: 'var(--border)' }}>
            <div className="flex items-center justify-between gap-4">
              <div className="flex min-w-0 items-center gap-3">
                <button
                  type="button"
                  onClick={() => setMobileOpen(true)}
                  className="rounded-xl border p-2 shadow-sm lg:hidden"
                  style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
                  aria-label="Open navigation"
                >
                  <Menu size={18} />
                </button>
                <div className="min-w-0">
                  <p className="text-xs font-bold uppercase tracking-[0.16em]" style={{ color: 'var(--text-muted)' }}>
                    {tenant?.name || 'FuseFlow'}
                  </p>
                  <h2 className="truncate font-display text-xl font-extrabold tracking-tight" style={{ color: 'var(--text-primary)' }}>
                    {activeLink?.label || 'Workspace'}
                  </h2>
                </div>
              </div>

              <button
                type="button"
                onClick={toggleCommandPalette}
                className="hidden min-w-[280px] max-w-md flex-1 items-center justify-between gap-2 rounded-2xl border px-3 py-2 xl:flex cursor-pointer transition-colors"
                style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border)', color: 'var(--text-muted)' }}
              >
                <div className="flex items-center gap-2">
                  <Search size={17} />
                  <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                    Search or type a command...
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="px-1.5 py-0.5 rounded border text-[10px] font-bold" style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
                    Ctrl K
                  </span>
                </div>
              </button>

              <div className="flex items-center gap-2">
                <span className="hidden items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-extrabold sm:flex" style={{ borderColor: 'var(--success-text)', backgroundColor: 'var(--success-soft)', color: 'var(--success-text)' }}>
                  <Wifi size={14} />
                  Live
                </span>
                <button
                  type="button"
                  className="rounded-xl border p-2.5 transition"
                  style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
                  aria-label="Notifications"
                >
                  <Bell size={18} />
                </button>
                <button
                  type="button"
                  onClick={() => setDark((value) => !value)}
                  className="rounded-xl border p-2.5 transition"
                  style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
                  aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
                >
                  {dark ? <Sun size={18} /> : <Moon size={18} />}
                </button>
                <div className="hidden items-center gap-2 rounded-2xl border px-3 py-2 sm:flex" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}>
                  <Activity size={16} style={{ color: 'var(--success-text)' }} />
                  <span className="text-xs font-extrabold" style={{ color: 'var(--text-primary)' }}>
                    {tenant?.plan || 'Admin'}
                    {validityDays !== null && ` (${validityDays > 0 ? `${validityDays}d left` : 'expired'})`}
                  </span>
                </div>
              </div>
            </div>
          </header>

          <div className="main-content-area flex-1 overflow-y-auto" style={{ backgroundColor: 'var(--bg-base)' }}>
            <div className="mx-auto w-full max-w-[1500px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
              <Outlet />
            </div>
          </div>
        </main>
      </div>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-slate-950/35 backdrop-blur-sm"
            aria-label="Close navigation"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="relative flex h-full w-[min(88vw,320px)] flex-col border-r px-4 py-4 shadow-2xl" style={{ backgroundColor: 'var(--bg-sidebar)', borderColor: 'var(--border)' }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <img src={brandLogo} alt="FuseFlow" className="h-10 w-10 rounded-2xl object-contain shadow-sm" />
                <div>
                  <h1 className="font-display text-lg font-extrabold tracking-tight text-slate-950">FuseFlow</h1>
                  <p className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-indigo-500">Messaging OS</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                className="rounded-xl p-2 text-slate-400 transition hover:bg-white hover:text-slate-700"
                aria-label="Close navigation"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mt-5 rounded-2xl border p-3" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}>
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" style={{ backgroundColor: 'var(--accent-soft)', color: 'var(--accent-text)' }}>
                  <Building2 size={18} />
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-extrabold" style={{ color: 'var(--text-primary)' }}>{tenant?.name || 'Admin Console'}</span>
                  <span className="block truncate text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>
                    {tenant?.plan || 'Workspace'} plan
                    {validityDays !== null && ` (${validityDays > 0 ? `${validityDays}d left` : validityDays === 0 ? 'today' : 'expired'})`}
                  </span>
                </span>
              </div>
            </div>

            <nav className="mt-5 flex-1 space-y-5 overflow-y-auto">
              {navSections.map((section) => (
                <div key={section.label}>
                  <p className="mb-2 px-3 text-[10px] font-extrabold uppercase tracking-[0.2em] text-slate-400">
                    {section.label}
                  </p>
                  <div className="space-y-1">
                    {section.items.map((item) => (
                      <SidebarLink
                        key={item.to}
                        item={item}
                        tenant={tenant}
                        user={user}
                        collapsed={false}
                        onLockedClick={handleLockedClick}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </nav>

            <button
              type="button"
              onClick={logout}
              className="mt-4 flex w-full items-center gap-3 rounded-xl border-t px-3 py-4 text-sm font-bold transition"
              style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
              onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'var(--danger-soft)'; e.currentTarget.style.color = 'var(--danger-text)'; }}
              onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
            >
              <LogOut size={18} />
              <span>Log Out</span>
            </button>
          </aside>
        </div>
      )}
      <CommandPalette
        isOpen={showCommandPalette}
        onClose={() => setShowCommandPalette(false)}
        dark={dark}
        setDark={setDark}
      />
    </div>
  );
};

export default DashboardLayout;
