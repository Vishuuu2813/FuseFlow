import React from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Activity,
  Bell,
  Building2,
  ChevronDown,
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

const workspaceLinks = [
  {
    label: 'Command Center',
    items: [{ to: '/dashboard', icon: LayoutDashboard, label: 'Overview', end: true }]
  },
  {
    label: 'Messaging',
    items: [
      { to: '/dashboard/sessions', icon: Smartphone, label: 'Connection' },
      { to: '/dashboard/send-message', icon: Mail, label: 'Send Message', permissionKey: 'sendMessage' },
      { to: '/dashboard/campaigns', icon: Send, label: 'Bulk Send', gate: 'bulkScheduling', permissionKey: 'bulkScheduling' },
      { to: '/dashboard/smart-broadcast', icon: Zap, label: 'Smart Broadcast', gate: 'bulkScheduling', permissionKey: 'smartBroadcast' },
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
      { to: '/dashboard/admin', icon: Shield, label: 'Admin Panel' },
      { to: '/dashboard/users', icon: Users, label: 'Users' },
      { to: '/dashboard/plans', icon: Tag, label: 'Plans' }
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
        className={`group flex w-full items-center rounded-xl text-sm font-semibold text-slate-400 transition-all duration-200 hover:bg-slate-105/80 ${
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
  const { user, tenant, logout, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = React.useState(false);
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [dark, setDark] = React.useState(() => localStorage.getItem('fuseflow-theme') === 'dark');

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
    <div className={`${dark ? 'ff-dark' : ''} min-h-screen bg-[#f5f7fb] text-slate-900`}>
      <div className="flex h-screen overflow-hidden">
        <aside
          className={`hidden shrink-0 border-r border-slate-200/80 bg-[#f9fafc]/95 px-3 py-4 shadow-[1px_0_0_rgba(15,23,42,0.02)] backdrop-blur-xl transition-all duration-300 lg:flex lg:flex-col ${
            collapsed ? 'w-[88px]' : 'w-[288px]'
          }`}
        >
          <div className={`flex items-center ${collapsed ? 'justify-center' : 'justify-between'} px-2`}>
            <div className={`flex min-w-0 items-center gap-3 ${collapsed ? 'justify-center' : ''}`}>
              <img src={brandLogo} alt="FuseFlow" className="h-11 w-11 shrink-0 rounded-2xl object-contain shadow-sm" />
              {!collapsed && (
                <div className="min-w-0">
                  <h1 className="font-display text-xl font-extrabold tracking-tight text-slate-950">FuseFlow</h1>
                  <p className="text-[10px] font-extrabold uppercase tracking-[0.22em] text-indigo-500">Automation OS</p>
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
            <div className="mt-5 rounded-2xl border border-slate-200/80 bg-white p-3 shadow-sm">
              <button type="button" className="flex w-full items-center justify-between gap-3 text-left">
                <span className="flex min-w-0 items-center gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                    <Building2 size={18} />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-extrabold text-slate-900">{tenant?.name || 'Admin Console'}</span>
                    <span className="block truncate text-xs font-semibold text-slate-500">
                      {tenant?.plan || 'Workspace'} plan
                      {validityDays !== null && ` (${validityDays > 0 ? `${validityDays}d left` : validityDays === 0 ? 'today' : 'expired'})`}
                    </span>
                  </span>
                </span>
                <ChevronDown size={16} className="shrink-0 text-slate-400" />
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

          <div className="mt-4 border-t border-slate-200/80 pt-4">
            {!collapsed && (
              <NavLink
                to="/dashboard/profile"
                className="mb-3 flex items-center gap-3 rounded-2xl bg-white p-3 shadow-sm ring-1 ring-slate-200/80 transition hover:ring-indigo-200"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-600 to-emerald-500 text-sm font-extrabold text-white">
                  {user.name?.charAt(0)?.toUpperCase() || 'U'}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-extrabold text-slate-900">{user.name}</span>
                  <span className="block truncate text-xs font-semibold text-slate-500">{user.email || tenant?.name || 'Secure user'}</span>
                </span>
              </NavLink>
            )}
            <button
              type="button"
              onClick={logout}
              className={`flex w-full items-center rounded-xl text-sm font-bold text-slate-500 transition hover:bg-red-50 hover:text-red-600 ${
                collapsed ? 'justify-center p-3' : 'gap-3 px-3 py-2.5'
              }`}
            >
              <LogOut size={18} />
              {!collapsed && <span>Log Out</span>}
            </button>
          </div>
        </aside>

        <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/90 px-4 py-3 backdrop-blur-xl sm:px-6 lg:px-8">
            <div className="flex items-center justify-between gap-4">
              <div className="flex min-w-0 items-center gap-3">
                <button
                  type="button"
                  onClick={() => setMobileOpen(true)}
                  className="rounded-xl border border-slate-200 bg-white p-2 text-slate-500 shadow-sm lg:hidden"
                  aria-label="Open navigation"
                >
                  <Menu size={18} />
                </button>
                <div className="min-w-0">
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">
                    {tenant?.name || 'FuseFlow'}
                  </p>
                  <h2 className="truncate font-display text-xl font-extrabold tracking-tight text-slate-950">
                    {activeLink?.label || 'Workspace'}
                  </h2>
                </div>
              </div>

              <div className="hidden min-w-[280px] max-w-md flex-1 items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-400 shadow-inner xl:flex">
                <Search size={17} />
                <input
                  type="search"
                  placeholder="Search contacts, campaigns, devices..."
                  className="w-full bg-transparent text-sm font-medium text-slate-700 placeholder:text-slate-400 focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-2">
                <span className="hidden items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-extrabold text-emerald-700 sm:flex">
                  <Wifi size={14} />
                  Live
                </span>
                <button
                  type="button"
                  className="rounded-xl border border-slate-200 bg-white p-2.5 text-slate-500 shadow-sm transition hover:border-indigo-200 hover:text-indigo-600"
                  aria-label="Notifications"
                >
                  <Bell size={18} />
                </button>
                <button
                  type="button"
                  onClick={() => setDark((value) => !value)}
                  className="rounded-xl border border-slate-200 bg-white p-2.5 text-slate-500 shadow-sm transition hover:border-indigo-200 hover:text-indigo-600"
                  aria-label={dark ? 'Switch to light theme' : 'Switch to dark theme'}
                >
                  {dark ? <Sun size={18} /> : <Moon size={18} />}
                </button>
                <div className="hidden items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 shadow-sm sm:flex">
                  <Activity size={16} className="text-emerald-600" />
                  <span className="text-xs font-extrabold text-slate-700">
                    {tenant?.plan || 'Admin'}
                    {validityDays !== null && ` (${validityDays > 0 ? `${validityDays}d left` : 'expired'})`}
                  </span>
                </div>
              </div>
            </div>
          </header>

          <div className="flex-1 overflow-y-auto bg-[radial-gradient(circle_at_top_left,rgba(79,70,229,0.08),transparent_30%),linear-gradient(180deg,#f8fafc_0%,#eef2f7_100%)]">
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
          <aside className="relative flex h-full w-[min(88vw,320px)] flex-col border-r border-slate-200 bg-[#f9fafc] px-4 py-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <img src={brandLogo} alt="FuseFlow" className="h-10 w-10 rounded-2xl object-contain shadow-sm" />
                <div>
                  <h1 className="font-display text-lg font-extrabold tracking-tight text-slate-950">FuseFlow</h1>
                  <p className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-indigo-500">Automation OS</p>
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

            <div className="mt-5 rounded-2xl border border-slate-200/80 bg-white p-3 shadow-sm">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                  <Building2 size={18} />
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-extrabold text-slate-900">{tenant?.name || 'Admin Console'}</span>
                  <span className="block truncate text-xs font-semibold text-slate-500">
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
              className="mt-4 flex w-full items-center gap-3 rounded-xl border-t border-slate-200 px-3 py-4 text-sm font-bold text-slate-500 transition hover:bg-red-50 hover:text-red-600"
            >
              <LogOut size={18} />
              <span>Log Out</span>
            </button>
          </aside>
        </div>
      )}
    </div>
  );
};

export default DashboardLayout;
