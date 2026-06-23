import React, { useState, useEffect } from 'react';
import { analyticsAPI } from '../services/api.js';
import { Link } from 'react-router-dom';
import { Quote, TrendingUp, Award, BarChart3, Zap } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from 'recharts';

const COLORS = ['#6366f1', '#8b5cf6', '#a78bfa', '#c4b5fd', '#ddd6fe', '#818cf8', '#6d28d9', '#4f46e5', '#4338ca', '#3730a3'];

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-brand-card border border-brand-border rounded-xl p-3 text-xs shadow-xl">
      <p className="font-bold text-brand-text mb-1 max-w-[200px] truncate">{label}</p>
      {payload.map(p => <p key={p.dataKey} style={{ color: p.color }}>{p.name}: <span className="font-bold">{p.value?.toLocaleString()}</span></p>)}
    </div>
  );
};

export default function CitationDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    analyticsAPI.getCitations()
      .then(d => setData(d))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const catChartData = (data?.citationByCategory || []).slice(0, 10).map(c => ({
    name: c._id?.length > 22 ? c._id.slice(0, 22) + '…' : c._id,
    fullName: c._id,
    citations: c.totalCitations,
    avg: Math.round(c.avgCitations || 0),
  }));

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-32 space-y-3">
      <div className="w-12 h-12 border-2 border-brand-primary border-t-transparent rounded-full animate-spin" />
      <p className="text-brand-textMuted text-sm">Loading citation intelligence…</p>
    </div>
  );

  if (error) return <div className="glass-card rounded-2xl p-6 border border-red-500/20 text-red-400">{error}</div>;

  const summary = data?.summary || {};

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-brand-text flex items-center gap-2">
          <Quote className="text-brand-primary rotate-180" size={26} /> Citation Intelligence Dashboard
        </h1>
        <p className="text-sm text-brand-textMuted mt-1">Track citation velocity, impact, and the most influential research papers</p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Citations', value: (summary.totalCitations || 0).toLocaleString(), color: 'text-brand-primary', icon: <Quote size={18} /> },
          { label: 'Total Papers', value: (summary.paperCount || 0).toLocaleString(), color: 'text-blue-600', icon: <BarChart3 size={18} /> },
          { label: 'Avg Citations/Paper', value: (summary.avgCitations || 0).toFixed(1), color: 'text-brand-success', icon: <TrendingUp size={18} /> },
          { label: 'Peak Citations', value: (summary.maxCitations || 0).toLocaleString(), color: 'text-amber-500', icon: <Zap size={18} /> },
        ].map(s => (
          <div key={s.label} className="glass-card rounded-2xl p-4 border border-brand-border">
            <div className={`${s.color} mb-2`}>{s.icon}</div>
            <p className="text-xs text-brand-textMuted">{s.label}</p>
            <p className={`text-2xl font-extrabold mt-1 ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Citations by Category */}
      <div className="glass-card rounded-3xl p-6 border border-brand-border">
        <h2 className="text-base font-bold text-brand-text mb-4 flex items-center gap-2"><BarChart3 size={18} className="text-brand-primary" />Citations by Research Category</h2>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={catChartData} margin={{ top: 0, right: 10, left: 10, bottom: 70 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#ABA2EB" />
            <XAxis dataKey="name" tick={{ fill: '#5D539F', fontSize: 10 }} angle={-40} textAnchor="end" interval={0} />
            <YAxis tick={{ fill: '#5D539F', fontSize: 11 }} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="citations" name="Total Citations" radius={[4, 4, 0, 0]}>
              {catChartData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Two column layout: Most Cited + Fastest Growing */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Most Cited */}
        <div className="glass-card rounded-3xl p-6 border border-brand-border">
          <h2 className="text-base font-bold text-brand-text mb-4 flex items-center gap-2">
            <Award size={18} className="text-amber-500" /> Most Cited Papers
          </h2>
          <div className="space-y-3">
            {(data?.mostCited || []).slice(0, 8).map((p, i) => (
              <div key={p._id} className="flex items-start gap-3 p-3 bg-brand-border/20 rounded-xl hover:bg-brand-border/40 transition-all">
                <span className="text-xs font-black text-brand-textMuted w-5 mt-0.5 shrink-0">#{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <Link to={`/papers/${p._id}`} className="text-xs font-bold text-brand-text hover:text-brand-accent line-clamp-2 transition-colors">{p.title}</Link>
                  <p className="text-[10px] text-brand-textMuted mt-0.5">{p.authors?.[0]?.name} · {p.source}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-black text-brand-primary">{p.citationCount?.toLocaleString()}</p>
                  <p className="text-[10px] text-brand-textMuted">citations</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Fastest Growing */}
        <div className="glass-card rounded-3xl p-6 border border-brand-border">
          <h2 className="text-base font-bold text-brand-text mb-4 flex items-center gap-2">
            <TrendingUp size={18} className="text-brand-success" /> Fastest Growing This Week
          </h2>
          <div className="space-y-3">
            {(data?.fastestGrowing || []).slice(0, 8).map((p, i) => (
              <div key={p._id} className="flex items-start gap-3 p-3 bg-brand-border/20 rounded-xl hover:bg-brand-border/40 transition-all">
                <span className="text-xs font-black text-brand-textMuted w-5 mt-0.5 shrink-0">#{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <Link to={`/papers/${p._id}`} className="text-xs font-bold text-brand-text hover:text-brand-accent line-clamp-2 transition-colors">{p.title}</Link>
                  <p className="text-[10px] text-brand-textMuted mt-0.5">{new Date(p.publicationDate).toLocaleDateString()}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-black text-brand-success">{p.citationCount?.toLocaleString()}</p>
                  <p className="text-[10px] text-brand-textMuted">citations</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
