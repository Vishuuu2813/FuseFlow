import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { Lock, Mail, ShieldAlert, ArrowLeft } from 'lucide-react';

const AdminLogin = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { fetchProfile } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { data } = await api.post('/auth/admin/login', { email, password });
      
      // Store token and update profile context
      localStorage.setItem('accessToken', data.accessToken);
      await fetchProfile();
      
      navigate('/dashboard/admin');
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid administrative credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6 relative overflow-hidden font-sans">
      {/* Background decoration */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full bg-indigo-600/10 blur-[120px] pointer-events-none"></div>

      <div className="w-full max-w-md backdrop-blur-xl bg-slate-900/40 border border-white/5 shadow-2xl rounded-3xl p-8 flex flex-col gap-6 relative z-10">
        
        {/* Back Link */}
        <Link to="/" className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-300 text-xs transition-colors w-fit">
          <ArrowLeft size={14} /> Back to Home
        </Link>

        {/* Brand */}
        <div className="text-center">
          <div className="inline-flex p-3 rounded-2xl bg-amber-500/10 text-amber-400 mb-4 border border-amber-500/25">
            <Lock size={24} />
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">Admin Console</h1>
          <p className="text-slate-400 text-xs mt-1">Authenticate to access system metrics and configurations.</p>
        </div>

        {error && (
          <div className="p-3 rounded-xl border border-red-500/20 bg-red-500/5 text-red-400 text-xs font-semibold flex items-center gap-2">
            <ShieldAlert size={16} />
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="flex flex-col gap-4">
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 text-slate-500" size={16} />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@whatsflow.com"
                className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-950/50 border border-white/5 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-amber-500 text-xs transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 text-slate-500" size={16} />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-950/50 border border-white/5 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-amber-500 text-xs transition-colors"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:bg-amber-500/50 text-slate-950 text-xs font-extrabold transition-all duration-200 shadow-lg shadow-amber-500/10 cursor-pointer mt-2"
          >
            {loading ? 'Authenticating...' : 'Sign In as Admin'}
          </button>
        </form>

        <div className="text-center text-xs text-slate-500">
          Want to register a new admin?{' '}
          <Link to="/admin-register" className="text-amber-400 hover:text-amber-300 font-semibold underline">
            Register Admin
          </Link>
        </div>

      </div>
    </div>
  );
};

export default AdminLogin;
