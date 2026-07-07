import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../services/api';
import { User, Lock, Mail, Key, ShieldCheck, ArrowLeft } from 'lucide-react';

const AdminRegister = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [signupCode, setSignupCode] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const { data } = await api.post('/auth/admin/register', {
        name,
        email,
        password,
        signupCode
      });

      setSuccess(data.message || 'Admin account created successfully!');
      setName('');
      setEmail('');
      setPassword('');
      setSignupCode('');
      
      // Auto-redirect to login after 2 seconds
      setTimeout(() => {
        navigate('/admin-login');
      }, 2000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create administrative account.');
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
          <div className="inline-flex p-3 rounded-2xl bg-indigo-500/10 text-indigo-400 mb-4 border border-indigo-500/25">
            <ShieldCheck size={24} />
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">Admin Registration</h1>
          <p className="text-slate-400 text-xs mt-1">Register a global system administrator account.</p>
        </div>

        {error && (
          <div className="p-3 rounded-xl border border-red-500/20 bg-red-500/5 text-red-400 text-xs font-semibold">
            {error}
          </div>
        )}

        {success && (
          <div className="p-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 text-emerald-400 text-xs font-semibold">
            {success}
          </div>
        )}

        <form onSubmit={handleRegister} className="flex flex-col gap-4">
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Full Name</label>
            <div className="relative">
              <User className="absolute left-3 top-3 text-slate-500" size={16} />
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="John Doe"
                className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-950/50 border border-white/5 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500 text-xs transition-colors"
              />
            </div>
          </div>

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
                className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-950/50 border border-white/5 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500 text-xs transition-colors"
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
                className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-950/50 border border-white/5 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500 text-xs transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Admin Signup Code</label>
            <div className="relative">
              <Key className="absolute left-3 top-3 text-slate-500" size={16} />
              <input
                type="text"
                required
                value={signupCode}
                onChange={(e) => setSignupCode(e.target.value)}
                placeholder="Enter secret register code..."
                className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-950/50 border border-white/5 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500 text-xs transition-colors"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-xl bg-indigo-500 hover:bg-indigo-600 disabled:bg-indigo-500/50 text-slate-950 text-xs font-extrabold transition-all duration-200 shadow-lg shadow-indigo-500/10 cursor-pointer mt-2"
          >
            {loading ? 'Creating Account...' : 'Register as Admin'}
          </button>
        </form>

        <div className="text-center text-xs text-slate-500">
          Already registered?{' '}
          <Link to="/admin-login" className="text-indigo-400 hover:text-indigo-300 font-semibold underline">
            Admin Log In
          </Link>
        </div>

      </div>
    </div>
  );
};

export default AdminRegister;
