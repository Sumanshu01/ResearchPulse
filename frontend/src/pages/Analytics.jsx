import React, { useState, useEffect } from 'react';
import { analyticsAPI } from '../services/api.js';
import { Link } from 'react-router-dom';
import {
  BarChart3, TrendingUp, Users, Building2, Award, Calendar,
  BookOpen, Quote, Zap, RefreshCw
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell
} from 'recharts';

const COLORS = ['#6366f1','#8b5cf6','#06b6d4','#10b981','#f59e0b','#ef4444'];
const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-brand-card border border-brand-border rounded-xl p-3 text-xs shadow-xl">
      <p className="font-bold text-brand-text mb-1">{label}</p>
      {payload.map(p => <p key={p.dataKey} style={{ color: p.color || '#fff' }}>{p.name}: <span className="font-bold">{typeof p.value === 'number' ? p.value.toLocaleString() : p.value}</span></p>)}
    </div>
  );
};

export default function Analytics() {
  const [data, setData] = useState(null);
  const [authors, setAuthors] = useState([]);
  const [institutions, setInstitutions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    try {
      const [dash, auth, inst] = await Promise.all([
        analyticsAPI.getDashboard(),
        analyticsAPI.getAuthorRankings(10),
        analyticsAPI.getInstitutionRankings(10),
      ]);
      setData(dash);
      setAuthors(auth.authors || []);
      setInstitutions(inst.institutions || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const pubTrend = (data?.publicationTrend || []).map(d => ({ date: d._id, papers: d.count }));
  const trendChartData = (data?.weeklyTrends || []).slice(0, 8).map(t => ({
    name: t.topicName?.length > 18 ? t.topicName.slice(0, 18) + '…' : t.topicName,
    growth: parseFloat((t.growthPercent || 0).toFixed(1)),
    papers: t.publicationCount,
  }));

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-32 space-y-3">
      <div className="w-12 h-12 border-2 border-brand-primary border-t-transparent rounded-full animate-spin" />
      <p className="text-brand-textMuted text-sm">Loading analytics…</p>
    </div>
  );

  const summary = data?.summary || {};

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-extrabold text-brand-text flex items-center gap-2">
            <BarChart3 className="text-brand-primary" size={26} /> Analytics Dashboard
          </h1>
          <p className="text-sm text-brand-textMuted mt-1">Comprehensive research intelligence and platform metrics</p>
        </div>
        <button onClick={handleRefresh} disabled={refreshing}
          className="flex items-center gap-2 px-4 py-2 bg-brand-bg border border-brand-border rounded-xl text-xs font-bold text-brand-textMuted hover:text-brand-text transition-all">
          <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />Refresh
        </button>
      </div>

      {/* Summary Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Papers', value: (summary.totalPapers || 0).toLocaleString(), icon: <BookOpen size={20} />, color: 'text-brand-primary', bg: 'from-brand-primary/20 to-transparent' },
          { label: 'Total Authors', value: (summary.totalAuthors || 0).toLocaleString(), icon: <Users size={20} />, color: 'text-blue-600', bg: 'from-blue-600/20 to-transparent' },
          { label: 'Research Topics', value: (summary.totalTopics || 0).toLocaleString(), icon: <BarChart3 size={20} />, color: 'text-purple-600', bg: 'from-purple-600/20 to-transparent' },
          { label: 'Total Citations', value: (summary.totalCitations || 0).toLocaleString(), icon: <Quote size={20} />, color: 'text-brand-success', bg: 'from-brand-success/20 to-transparent' },
        ].map(s => (
          <div key={s.label} className={`glass-card rounded-2xl p-5 border border-brand-border bg-gradient-to-br ${s.bg}`}>
            <div className={`${s.color} mb-3`}>{s.icon}</div>
            <p className="text-xs text-brand-textMuted font-medium">{s.label}</p>
            <p className={`text-3xl font-black mt-1 ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Publication Trend */}
      <div className="glass-card rounded-3xl p-6 border border-brand-border">
        <h2 className="text-base font-bold text-brand-text mb-4 flex items-center gap-2"><Calendar size={18} className="text-brand-primary" />Publication Trend (Last 30 Days)</h2>
        {pubTrend.length > 0 ? (
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={pubTrend}>
              <defs>
                <linearGradient id="pubGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#ABA2EB" />
              <XAxis dataKey="date" tick={{ fill: '#5D539F', fontSize: 10 }} tickFormatter={v => v?.slice(5)} />
              <YAxis tick={{ fill: '#5D539F', fontSize: 11 }} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="papers" name="Papers" stroke="#6366f1" fill="url(#pubGrad)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-48 flex items-center justify-center text-brand-textMuted text-sm">No publication data available yet</div>
        )}
      </div>

      {/* Topic Growth + Rankings */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Topic Growth */}
        <div className="glass-card rounded-3xl p-6 border border-brand-border">
          <h2 className="text-base font-bold text-brand-text mb-4 flex items-center gap-2"><TrendingUp size={18} className="text-brand-success" />Top Growing Topics</h2>
          {trendChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={trendChartData} layout="vertical" margin={{ left: 10, right: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ABA2EB" />
                <XAxis type="number" tick={{ fill: '#5D539F', fontSize: 10 }} unit="%" />
                <YAxis dataKey="name" type="category" tick={{ fill: '#5D539F', fontSize: 10 }} width={100} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="growth" name="Growth %" radius={[0, 4, 4, 0]}>
                  {trendChartData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : <div className="h-48 flex items-center justify-center text-brand-textMuted text-sm">Run trend computation first</div>}
        </div>

        {/* Top Authors */}
        <div className="glass-card rounded-3xl p-6 border border-brand-border">
          <h2 className="text-base font-bold text-brand-text mb-4 flex items-center gap-2"><Award size={18} className="text-amber-500" />Top Authors by Impact</h2>
          <div className="space-y-2">
            {authors.slice(0, 8).map((a, i) => (
              <Link key={a._id} to={`/authors/${a._id}`}
                className="flex items-center gap-3 p-2.5 bg-brand-border/20 rounded-xl hover:bg-brand-border/40 transition-all group">
                <span className="text-xs font-black text-brand-textMuted w-5 shrink-0">#{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-brand-text group-hover:text-brand-accent truncate transition-colors">{a.name}</p>
                  <p className="text-[10px] text-brand-textMuted">{a.publicationsCount} papers</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs font-bold text-brand-primary">{(a.citations || 0).toLocaleString()}</p>
                  <p className="text-[10px] text-brand-textMuted">citations</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Institution Rankings */}
      <div className="glass-card rounded-3xl p-6 border border-brand-border">
        <h2 className="text-base font-bold text-brand-text mb-4 flex items-center gap-2"><Building2 size={18} className="text-brand-primary" />Institution Rankings</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {institutions.slice(0, 10).map((inst, i) => (
            <Link key={inst._id} to={`/institutions/${inst._id}`}
              className="flex items-center gap-3 p-3 bg-brand-border/20 rounded-xl hover:bg-brand-border/40 transition-all group">
              <span className="text-xs font-black text-brand-textMuted w-5 shrink-0">#{i + 1}</span>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-brand-text group-hover:text-brand-accent truncate transition-colors">{inst.name}</p>
                <p className="text-[10px] text-brand-textMuted">{inst.location}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-xs font-bold text-brand-primary">{(inst.publicationCount || 0).toLocaleString()}</p>
                <p className="text-[10px] text-brand-textMuted">papers</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
