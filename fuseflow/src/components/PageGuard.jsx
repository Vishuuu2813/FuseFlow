import React from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ArrowLeft, KeyRound, Sparkles, AlertCircle, Clock } from 'lucide-react';

const PageGuard = ({ children, gate, permissionKey }) => {
  const { user, tenant, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // 1. Check plan limit
  const planLocked = Boolean(gate && tenant?.limits?.[gate] === false);
  
  // 2. Check user-level permission & expiry date scheduler
  let permissionLocked = false;
  let customNote = '';
  let isExpired = false;

  if (permissionKey) {
    const isAllowed = user?.permissions?.[permissionKey] !== false;
    const expiryDateStr = user?.permissions?.[`${permissionKey}ExpiresAt`];
    const expiry = expiryDateStr ? new Date(expiryDateStr) : null;
    isExpired = expiry && expiry.getTime() < Date.now();

    if (!isAllowed || isExpired) {
      permissionLocked = true;
      customNote = user?.permissions?.[`${permissionKey}Note`] || '';
    }
  }

  if (planLocked) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 text-center max-w-xl mx-auto">
        <div className="relative mb-6">
          <div className="absolute inset-0 rounded-full bg-indigo-500/20 blur-xl animate-pulse" />
          <div className="relative h-20 w-20 bg-indigo-50 border border-indigo-100 rounded-3xl flex items-center justify-center text-indigo-650 shadow-md">
            <Sparkles size={36} className="animate-bounce" />
          </div>
        </div>
        
        <h2 className="text-2xl font-black text-slate-800 tracking-tight">Upgrade Required</h2>
        <p className="text-slate-500 text-sm mt-3 font-semibold leading-relaxed">
          The requested feature is a premium add-on and is currently disabled for your workspace's active tier plan.
        </p>

        <div className="mt-8 flex flex-col sm:flex-row gap-3 w-full justify-center">
          <Link
            to="/dashboard"
            className="px-5 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 text-sm font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <ArrowLeft size={16} /> Return Home
          </Link>
          {user.role === 'Admin' && (
            <button
              onClick={() => alert('Please contact global admins or support to upgrade.')}
              className="px-5 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold flex items-center justify-center gap-2 transition-colors shadow-md shadow-indigo-600/10 cursor-pointer"
            >
              Request Upgrade
            </button>
          )}
        </div>
      </div>
    );
  }

  if (permissionLocked) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 text-center max-w-xl mx-auto">
        <div className="relative mb-6">
          <div className="absolute inset-0 rounded-full bg-rose-500/20 blur-xl" />
          <div className="relative h-20 w-20 bg-rose-50 border border-rose-100 rounded-3xl flex items-center justify-center text-rose-600 shadow-md">
            <KeyRound size={36} className="animate-pulse" />
          </div>
        </div>
        
        <h2 className="text-2xl font-black text-slate-850 tracking-tight">
          {isExpired ? 'Access Expirations Lock' : 'Access Locked'}
        </h2>
        <p className="text-slate-500 text-sm mt-3 font-semibold leading-relaxed">
          {isExpired 
            ? 'Your temporary scheduling access to this module has reached its expiry schedule.'
            : 'Your account permissions do not allow viewing this page. Workspace administrators have disabled access to this specific automation module.'}
        </p>

        {/* CUSTOM MESSAGE FROM ADMIN */}
        {customNote && (
          <div className="mt-6 w-full p-5 bg-amber-50 border border-amber-200/80 rounded-2xl flex items-start gap-3.5 text-left shadow-sm">
            <AlertCircle className="text-amber-600 mt-0.5 shrink-0" size={18} />
            <div>
              <span className="block text-xs font-black text-amber-800 uppercase tracking-wider">Message from Workspace Admin:</span>
              <p className="text-amber-700 text-sm font-medium mt-1 leading-relaxed">{customNote}</p>
            </div>
          </div>
        )}

        <div className="mt-8 flex justify-center w-full">
          <Link
            to="/dashboard"
            className="px-5 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-650 text-sm font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <ArrowLeft size={16} /> Return to Safety
          </Link>
        </div>
      </div>
    );
  }

  return children;
};

export default PageGuard;
