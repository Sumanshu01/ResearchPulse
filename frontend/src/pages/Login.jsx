import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { setAuth } from '../store/authSlice.js';
import { authAPI } from '../services/api.js';
import { Activity, Mail, Lock, Loader2, ArrowRight } from 'lucide-react';

export const Login = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const data = await authAPI.login({ email, password });
      dispatch(setAuth({ user: { username: data.username, email: data.email, role: data.role, _id: data._id }, token: data.token }));
      navigate('/');
    } catch (err) {
      setError(err.message || 'Login failed. Verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[70vh] flex items-center justify-center py-10 px-4">
      <div className="glass-card rounded-3xl p-6 md:p-8 border border-brand-border w-full max-w-md space-y-6 shadow-2xl relative">
        
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-brand-primary to-brand-accent flex items-center justify-center text-white mx-auto brand-glow">
            <Activity size={24} />
          </div>
          <h2 className="text-xl font-extrabold text-brand-text tracking-tight">Welcome Back</h2>
          <p className="text-xs text-brand-textMuted">Access the real-time research intelligence console</p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-3 bg-red-100 border border-red-200 text-red-700 text-xs rounded-xl text-center font-medium">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-[11px] font-bold uppercase text-brand-textMuted tracking-wider">Email Address</label>
            <div className="relative flex items-center">
              <Mail size={16} className="absolute left-3 text-brand-textMuted" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="researcher@pulse.org"
                className="w-full bg-brand-bg/60 border border-brand-border rounded-xl pl-10 pr-4 py-2.5 text-xs text-brand-text placeholder-brand-textMuted focus:outline-none focus:border-brand-primary"
              />
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold uppercase text-brand-textMuted tracking-wider">Password</label>
            </div>
            <div className="relative flex items-center">
              <Lock size={16} className="absolute left-3 text-brand-textMuted" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-brand-bg/60 border border-brand-border rounded-xl pl-10 pr-4 py-2.5 text-xs text-brand-text placeholder-brand-textMuted focus:outline-none focus:border-brand-primary"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-brand-primary hover:bg-brand-primary/80 text-white font-bold py-2.5 rounded-xl text-xs flex items-center justify-center space-x-2 transition-all cursor-pointer shadow-md shadow-brand-primary/10 disabled:opacity-50"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <span>Sign In</span>}
            {!loading && <ArrowRight size={14} />}
          </button>
        </form>

        <div className="text-center pt-2 border-t border-brand-border/30">
          <p className="text-xs text-brand-textMuted">
            New researcher?{' '}
            <Link to="/register" className="text-brand-accent hover:underline font-semibold">
              Create an account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
