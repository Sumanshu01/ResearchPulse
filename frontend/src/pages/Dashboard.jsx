import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { paperAPI, aiAPI, userAPI } from '../services/api.js';
import DashboardStats from '../components/DashboardStats.jsx';
import RecentFeed from '../components/RecentFeed.jsx';
import PaperCard from '../components/PaperCard.jsx';
import CategoryChart from '../components/CategoryChart.jsx';
import CitationChart from '../components/CitationChart.jsx';
import { Play, Loader2, Sparkles, AlertCircle } from 'lucide-react';

export const Dashboard = () => {
  const { user, isAuthenticated } = useSelector((state) => state.auth);
  const [papers, setPapers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Saved paper IDs for optimization
  const [savedIds, setSavedIds] = useState(new Set());
  
  // Recommendations state
  const [feedType, setFeedType] = useState('featured');
  const [recommendations, setRecommendations] = useState([]);
  const [recLoading, setRecLoading] = useState(false);

  // Admin ingestion state
  const [ingesting, setIngesting] = useState(false);
  const [ingestMessage, setIngestMessage] = useState(null);

  const fetchSavedIds = async () => {
    if (!isAuthenticated) {
      setSavedIds(new Set());
      return;
    }
    try {
      const saved = await userAPI.getSavedPapers();
      setSavedIds(new Set(saved.map((s) => s.paperId?._id).filter(Boolean)));
    } catch (err) {
      console.error('Failed to fetch saved papers:', err);
    }
  };

  const handleBookmarkToggle = () => {
    fetchSavedIds();
  };

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      // Fetch newest papers for initial load
      const data = await paperAPI.getPapers({ limit: 12, sortBy: 'newest' });
      setPapers(data.papers || []);
    } catch (err) {
      setError(err.message || 'Failed to load research papers.');
    } finally {
      setLoading(false);
    }
  };

  const fetchRecommendations = async () => {
    try {
      setRecLoading(true);
      setError(null);
      const res = await aiAPI.getRecommendations({ limit: 12 });
      setRecommendations(res.recommendations || []);
    } catch (err) {
      setError(err.message || 'Failed to load personalized recommendations.');
    } finally {
      setRecLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    fetchSavedIds();
  }, [isAuthenticated]);

  useEffect(() => {
    if (feedType === 'recommended' && isAuthenticated) {
      fetchRecommendations();
    }
  }, [feedType, isAuthenticated]);

  const handleManualIngest = async () => {
    try {
      setIngesting(true);
      setIngestMessage(null);
      const res = await paperAPI.triggerIngestion();
      setIngestMessage({ type: 'success', text: res.message || 'Ingestion triggered!' });
      
      // Refresh dashboard after a short delay
      setTimeout(() => {
        if (feedType === 'featured') {
          fetchDashboardData();
        } else {
          fetchRecommendations();
        }
        setIngestMessage(null);
      }, 5000);
    } catch (err) {
      setIngestMessage({ type: 'error', text: err.message || 'Failed to trigger ingestion' });
    } finally {
      setIngesting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Panel */}
      <div className="glass-card rounded-2xl p-6 border border-brand-border flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-brand-text tracking-tight flex items-center space-x-2">
            <span>Research Intelligence Feed</span>
            <Sparkles className="text-brand-accent animate-pulse-slow" size={24} />
          </h1>
          <p className="text-sm text-brand-textMuted mt-1 max-w-xl">
            Real-time ingestion, indexing, and analysis of academic works. Monitor metrics and explore papers.
          </p>
        </div>

        {/* Admin manual controls */}
        {isAuthenticated && user?.role === 'admin' && (
          <div className="flex flex-col items-end gap-2">
            <button
              onClick={handleManualIngest}
              disabled={ingesting}
              className="flex items-center space-x-2 bg-brand-accent hover:bg-brand-accent/80 text-white font-bold px-4 py-2.5 rounded-xl transition-all shadow-md shadow-brand-accent/20 cursor-pointer disabled:opacity-50"
            >
              {ingesting ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />}
              <span>Harvest Papers Now</span>
            </button>
            {ingestMessage && (
              <span className={`text-[10px] font-bold ${ingestMessage.type === 'success' ? 'text-brand-success' : 'text-red-600'}`}>
                {ingestMessage.text}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Stats Cards Grid */}
      <DashboardStats papers={papers} />

      {/* Main Split Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Side: General Feed and Charts */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Feed Filter Header */}
          <div className="flex items-center justify-between">
            {isAuthenticated ? (
              <div className="flex bg-brand-bg border border-brand-border rounded-xl p-1">
                <button
                  onClick={() => setFeedType('featured')}
                  className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    feedType === 'featured'
                      ? 'bg-brand-primary text-white shadow-md'
                      : 'text-brand-textMuted hover:text-brand-text'
                  }`}
                >
                  Featured Papers
                </button>
                <button
                  onClick={() => setFeedType('recommended')}
                  className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    feedType === 'recommended'
                      ? 'bg-brand-primary text-white shadow-md'
                      : 'text-brand-textMuted hover:text-brand-text'
                  }`}
                >
                  For You (AI Recs)
                </button>
              </div>
            ) : (
              <h2 className="text-lg font-bold text-brand-text tracking-tight">Featured Papers</h2>
            )}
            <button
              onClick={feedType === 'featured' ? fetchDashboardData : fetchRecommendations}
              className="text-xs font-semibold text-brand-accent hover:underline cursor-pointer"
            >
              Refresh
            </button>
          </div>

          {/* Feed Content */}
          {feedType === 'featured' ? (
            loading ? (
              <div className="flex flex-col items-center justify-center py-20">
                <Loader2 size={40} className="text-brand-primary animate-spin mb-4" />
                <p className="text-sm text-brand-textMuted font-medium">Gathering scientific database...</p>
              </div>
            ) : error ? (
              <div className="glass-card rounded-2xl p-8 border border-red-500/20 text-center flex flex-col items-center justify-center">
                <AlertCircle size={32} className="text-red-400 mb-3" />
                <p className="text-sm text-red-600 font-semibold">{error}</p>
                <button
                  onClick={fetchDashboardData}
                  className="mt-4 px-4 py-2 bg-brand-border/60 border border-brand-border text-xs text-brand-text rounded-xl hover:bg-brand-border transition-colors"
                >
                  Try Again
                </button>
              </div>
            ) : papers.length === 0 ? (
              <div className="glass-card rounded-2xl p-12 text-center text-brand-textMuted">
                <p className="text-sm font-semibold">No research papers found in database.</p>
                <p className="text-xs text-brand-textMuted/60 mt-1">
                  Ingestion tasks run hourly. If you are an administrator, use the harvest button to pull records.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {papers.slice(0, 6).map((paper) => (
                  <PaperCard
                    key={paper._id}
                    paper={paper}
                    isSaved={savedIds.has(paper._id)}
                    onBookmarkToggle={handleBookmarkToggle}
                  />
                ))}
              </div>
            )
          ) : (
            recLoading ? (
              <div className="flex flex-col items-center justify-center py-20">
                <Loader2 size={40} className="text-brand-primary animate-spin mb-4" />
                <p className="text-sm text-brand-textMuted font-medium">Analyzing reading profile & generating recommendations...</p>
              </div>
            ) : error ? (
              <div className="glass-card rounded-2xl p-8 border border-red-500/20 text-center flex flex-col items-center justify-center">
                <AlertCircle size={32} className="text-red-400 mb-3" />
                <p className="text-sm text-red-600 font-semibold">{error}</p>
                <button
                  onClick={fetchRecommendations}
                  className="mt-4 px-4 py-2 bg-brand-border/60 border border-brand-border text-xs text-brand-text rounded-xl hover:bg-brand-border transition-colors"
                >
                  Try Again
                </button>
              </div>
            ) : recommendations.length === 0 ? (
              <div className="glass-card rounded-2xl p-12 text-center text-brand-textMuted">
                <p className="text-sm font-semibold">No personalized recommendations yet.</p>
                <p className="text-xs text-brand-textMuted/60 mt-1">
                  Follow academic topics (click categories on papers) or follow researchers to build your interest profile!
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {recommendations.slice(0, 6).map((rec) => (
                  <PaperCard
                    key={rec._id}
                    paper={rec.paperId}
                    reasons={rec.reasons}
                    score={rec.score}
                    isSaved={rec.paperId?._id ? savedIds.has(rec.paperId._id) : false}
                    onBookmarkToggle={() => {
                      handleBookmarkToggle();
                      fetchRecommendations();
                    }}
                  />
                ))}
              </div>
            )
          )}

          {/* Charts Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <CategoryChart papers={papers} />
            <CitationChart papers={papers} />
          </div>
        </div>

        {/* Right Side: Live Feed */}
        <div className="lg:col-span-1">
          <RecentFeed />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
