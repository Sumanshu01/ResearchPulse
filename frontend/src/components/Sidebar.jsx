import React, { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { userAPI } from '../services/api.js';
import { Home, Search, BookMarked, Hash, Award, RefreshCw, Database, TrendingUp, Layers, Quote, BarChart3 } from 'lucide-react';

export const Sidebar = () => {
  const { isAuthenticated, user } = useSelector((state) => state.auth);
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchProfileSummary = async () => {
    if (!isAuthenticated) return;
    try {
      setLoading(true);
      const data = await userAPI.getProfile();
      setProfileData(data);
    } catch (err) {
      console.error('Failed to load sidebar profile summaries:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfileSummary();
    
    // Refresh sidebar on bookmark/follow actions (we can hook listeners or interval)
    const interval = setInterval(fetchProfileSummary, 30000);
    return () => clearInterval(interval);
  }, [isAuthenticated]);

  const navItems = [
    { to: '/', label: 'Dashboard', icon: Home },
    { to: '/search', label: 'Advanced Search', icon: Search },
    { to: '/saved', label: 'My Library', icon: BookMarked, requiresAuth: true },
  ];

  const insightItems = [
    { to: '/trends', label: 'Trend Radar', icon: TrendingUp },
    { to: '/topics', label: 'Topic Explorer', icon: Layers },
    { to: '/citations', label: 'Citation Intelligence', icon: Quote },
    { to: '/analytics', label: 'System Metrics', icon: BarChart3 },
  ];

  return (
    <aside className="w-64 glass-card border-r border-brand-border p-5 flex flex-col h-[calc(100vh-80px)] sticky top-[80px] overflow-y-auto">
      {/* Navigation Links */}
      <div className="space-y-1">
        <p className="text-[10px] uppercase font-bold text-brand-textMuted tracking-widest pl-3 mb-2">
          Discover
        </p>
        {navItems.map((item) => {
          if (item.requiresAuth && !isAuthenticated) return null;
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center space-x-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-brand-primary text-white shadow-lg shadow-brand-primary/20'
                    : 'text-brand-textMuted hover:bg-brand-border/60 hover:text-brand-text'
                }`
              }
            >
              <Icon size={18} />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </div>

      {/* Research Insights Links */}
      <div className="space-y-1 mt-6">
        <p className="text-[10px] uppercase font-bold text-brand-textMuted tracking-widest pl-3 mb-2">
          Research Insights
        </p>
        {insightItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center space-x-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-brand-primary text-white shadow-lg shadow-brand-primary/20'
                    : 'text-brand-textMuted hover:bg-brand-border/60 hover:text-brand-text'
                }`
              }
            >
              <Icon size={18} className={item.to === '/citations' ? 'rotate-180' : ''} />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </div>


      {/* Followed Academic Topics */}
      {isAuthenticated && (
        <div className="mt-8 flex-grow">
          <div className="flex items-center justify-between pl-3 mb-3">
            <p className="text-[10px] uppercase font-bold text-brand-textMuted tracking-widest">
              Followed Topics
            </p>
            <button 
              onClick={fetchProfileSummary} 
              className="text-brand-textMuted hover:text-brand-text transition-colors"
              title="Refresh"
            >
              <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
          {profileData?.user?.followedTopics?.length > 0 ? (
            <div className="space-y-1">
              {profileData.user.followedTopics.map((topic) => (
                <NavLink
                  key={topic._id}
                  to={`/search?topic=${encodeURIComponent(topic.name)}`}
                  className="flex items-center space-x-2.5 px-3 py-1.5 rounded-lg text-xs text-brand-textMuted hover:bg-brand-border/40 hover:text-brand-text transition-colors"
                >
                  <Hash size={13} className="text-brand-accent" />
                  <span className="truncate">{topic.name}</span>
                </NavLink>
              ))}
            </div>
          ) : (
            <p className="text-xs text-brand-textMuted/60 pl-3 italic">No topics followed yet.</p>
          )}

          {/* Followed Authors */}
          <div className="mt-8">
            <p className="text-[10px] uppercase font-bold text-brand-textMuted tracking-widest pl-3 mb-3">
              Followed Authors
            </p>
            {profileData?.user?.followedAuthors?.length > 0 ? (
              <div className="space-y-1">
                {profileData.user.followedAuthors.map((author) => (
                  <NavLink
                    key={author._id}
                    to={`/authors/${author._id}`}
                    className="flex items-center space-x-2.5 px-3 py-1.5 rounded-lg text-xs text-brand-textMuted hover:bg-brand-border/40 hover:text-brand-text transition-colors"
                  >
                    <Award size={13} className="text-brand-success" />
                    <span className="truncate">{author.name}</span>
                  </NavLink>
                ))}
              </div>
            ) : (
              <p className="text-xs text-brand-textMuted/60 pl-3 italic">No authors followed yet.</p>
            )}
          </div>
        </div>
      )}

      {/* Admin Panel Link */}
      {isAuthenticated && user?.role === 'admin' && (
        <div className="mt-auto border-t border-brand-border pt-4">
          <p className="text-[10px] uppercase font-bold text-brand-textMuted tracking-widest pl-3 mb-2">
            System
          </p>
          <div className="flex items-center space-x-2.5 px-3 py-2 text-xs text-brand-accent bg-brand-accent/5 border border-brand-accent/20 rounded-xl">
            <Database size={14} />
            <span className="font-semibold font-sans">Admin privileges active</span>
          </div>
        </div>
      )}
    </aside>
  );
};

export default Sidebar;
