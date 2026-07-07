import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!email || !password) {
      setError('Please fill in all fields.');
      return;
    }

    setLoading(true);
    const res = await login(email, password);
    setLoading(false);

    if (res.success) {
      navigate('/');
    } else {
      setError(res.error);
    }
  };

  return (
    <div className="flex h-screen items-center justify-center bg-[#0b0f19] px-4 font-sans">
      {/* Background Decorative Gradients */}
      <div className="absolute top-1/4 left-1/4 h-72 w-72 rounded-full bg-emerald-500/10 blur-[100px] pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 h-82 w-82 rounded-full bg-indigo-500/10 blur-[120px] pointer-events-none"></div>

      <div className="w-full max-w-md backdrop-blur-xl bg-slate-900/60 border border-white/5 shadow-2xl rounded-3xl p-8 relative z-10">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-block bg-gradient-to-tr from-emerald-500 to-green-400 p-3 rounded-2xl text-slate-950 font-black text-xl shadow-lg shadow-emerald-500/20 mb-4">
            WF
          </div>
          <h2 className="text-2xl font-bold bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">Welcome back</h2>
          <p className="text-slate-400 text-sm mt-1">Sign in to manage your WhatsApp campaigns</p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl border border-red-500/20 bg-red-500/5 text-red-400 text-xs font-medium text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@company.com"
              className="w-full px-4 py-3 rounded-xl bg-slate-950/50 border border-white/5 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-emerald-500 transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-4 py-3 rounded-xl bg-slate-950/50 border border-white/5 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-emerald-500 transition-colors"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 mt-4 rounded-xl bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600 text-slate-950 font-bold text-sm shadow-lg shadow-emerald-500/10 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {loading ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-950 border-t-transparent"></span>
            ) : (
              'Sign In'
            )}
          </button>
        </form>

        <p className="text-center text-xs text-slate-400 mt-6">
          Don't have an account?{' '}
          <Link to="/signup" className="text-emerald-400 hover:underline font-semibold">
            Create workspace
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Login;
