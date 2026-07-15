import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
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

  const { user } = useAuth();
  const navigate = useNavigate();

  // Redirect if already authenticated
  useEffect(() => {
    if (user) {
      if (user.role === 'Admin' && !user.tenantId) {
        navigate('/dashboard/admin');
      } else {
        navigate('/dashboard');
      }
    }
  }, [user, navigate]);

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
    <div className="min-h-screen bg-slate-50 text-slate-800 flex items-center justify-center p-6 relative overflow-hidden font-sans">
      {/* Background decoration */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full bg-emerald-100/50 blur-[100px] pointer-events-none"></div>

      <div className="w-full max-w-md bg-white border border-slate-200 shadow-2xl rounded-3xl p-8 flex flex-col gap-6 relative z-10">
        
        {/* Back Link */}
        <Link to="/" className="inline-flex items-center gap-2 text-slate-400 hover:text-slate-655 text-xs font-semibold transition-colors w-fit">
          <ArrowLeft size={14} /> Back to Home
        </Link>

        {/* Brand */}
        <div className="text-center">
          <div className="inline-flex p-3 rounded-2xl bg-emerald-50 text-emerald-600 mb-4 border border-emerald-100">
            <ShieldCheck size={24} />
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-800">Admin Registration</h1>
          <p className="text-slate-550 text-xs mt-1">Register a global system administrator account.</p>
        </div>

        {error && (
          <div className="p-3.5 rounded-xl border border-red-200 bg-red-50 text-red-650 text-xs font-bold">
            {error}
          </div>
        )}

        {success && (
          <div className="p-3.5 rounded-xl border border-emerald-250 bg-emerald-50 text-emerald-700 text-xs font-bold">
            {success}
          </div>
        )}

        <form onSubmit={handleRegister} className="flex flex-col gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Full Name</label>
            <div className="relative">
              <User className="absolute left-3 top-3 text-slate-400" size={16} />
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="John Doe"
                className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-emerald-600 text-xs transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 text-slate-400" size={16} />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@whatsflow.com"
                className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-emerald-600 text-xs transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 text-slate-400" size={16} />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-emerald-600 text-xs transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Admin Signup Code</label>
            <div className="relative">
              <Key className="absolute left-3 top-3 text-slate-400" size={16} />
              <input
                type="text"
                required
                value={signupCode}
                onChange={(e) => setSignupCode(e.target.value)}
                placeholder="Enter secret register code..."
                className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-emerald-600 text-xs transition-colors"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-600/50 text-white text-xs font-extrabold transition-all duration-200 shadow-lg shadow-emerald-600/10 cursor-pointer mt-2"
          >
            {loading ? 'Creating Account...' : 'Register as Admin'}
          </button>
        </form>

        <div className="text-center text-xs text-slate-500">
          Already registered?{' '}
          <Link to="/admin-login" className="text-emerald-600 hover:text-emerald-705 font-semibold underline">
            Admin Log In
          </Link>
        </div>

      </div>
    </div>
  );
};

export default AdminRegister;
