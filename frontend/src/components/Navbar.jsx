import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { logout } from '../store/authSlice.js';
import { Activity, LogOut, User as UserIcon, Search, Bell } from 'lucide-react';

export const Navbar = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { user, isAuthenticated } = useSelector((state) => state.auth);
  const [quickSearch, setQuickSearch] = React.useState('');

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (quickSearch.trim()) {
      navigate(`/search?q=${encodeURIComponent(quickSearch)}`);
      setQuickSearch('');
    }
  };

  return (
    <nav className="glass-card sticky top-0 z-50 border-b border-brand-border px-6 py-4 flex items-center justify-between">
      {/* Brand Logo */}
      <Link to="/" className="flex items-center space-x-3 text-2xl font-bold tracking-tight text-brand-text select-none">
        <div className="p-2 bg-gradient-to-tr from-brand-primary to-brand-accent rounded-xl text-white brand-glow">
          <Activity size={24} />
        </div>
        <span className="bg-gradient-to-r from-brand-primary to-brand-accent bg-clip-text text-transparent font-extrabold font-sans">
          ResearchPulse
        </span>
      </Link>

      {/* Quick Search */}
      <form onSubmit={handleSearchSubmit} className="hidden md:flex items-center relative w-1/3">
        <Search size={18} className="absolute left-3 text-brand-textMuted" />
        <input
          type="text"
          placeholder="Quick search papers, authors, categories..."
          value={quickSearch}
          onChange={(e) => setQuickSearch(e.target.value)}
          className="w-full bg-brand-bg/60 border border-brand-border rounded-xl pl-10 pr-4 py-2 text-sm text-brand-text placeholder-brand-textMuted/70 focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary transition-all duration-300"
        />
      </form>

      {/* User Actions */}
      <div className="flex items-center space-x-4">
        {isAuthenticated ? (
          <>
            <div className="p-2 hover:bg-brand-border/40 rounded-lg text-brand-textMuted hover:text-brand-text cursor-pointer transition-colors relative">
              <Bell size={20} />
              <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-brand-accent rounded-full animate-ping"></span>
            </div>

            <div className="flex items-center space-x-3 pl-2 border-l border-brand-border">
              <div className="flex flex-col text-right">
                <span className="text-sm font-semibold text-brand-text">{user.username}</span>
                <span className="text-[10px] uppercase tracking-wider text-brand-primary font-bold">
                  {user.role === 'admin' ? 'Administrator' : 'Researcher'}
                </span>
              </div>
              <Link to="/saved" className="w-8 h-8 rounded-full bg-brand-primary flex items-center justify-center text-white font-bold select-none hover:scale-105 transition-transform duration-200">
                {user.username.charAt(0).toUpperCase()}
              </Link>
              <button
                onClick={handleLogout}
                className="p-2 hover:bg-red-100 rounded-lg text-red-500 hover:text-red-600 transition-colors"
                title="Sign Out"
              >
                <LogOut size={18} />
              </button>
            </div>
          </>
        ) : (
          <div className="flex items-center space-x-3">
            <Link
              to="/login"
              className="text-sm font-medium text-brand-textMuted hover:text-brand-text px-4 py-2 rounded-xl transition-colors"
            >
              Sign In
            </Link>
            <Link
              to="/register"
              className="text-sm font-medium bg-brand-primary hover:bg-brand-primary/80 text-white px-5 py-2.5 rounded-xl transition-all shadow-md shadow-brand-primary/20 hover:shadow-brand-primary/30"
            >
              Register
            </Link>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
