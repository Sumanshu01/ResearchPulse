import React from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

export const CitationChart = ({ papers = [] }) => {
  // Aggregate citation counts by year
  const citationsByYear = {};
  papers.forEach((p) => {
    if (p.publicationDate) {
      const year = new Date(p.publicationDate).getFullYear();
      if (!isNaN(year)) {
        citationsByYear[year] = (citationsByYear[year] || 0) + (p.citationCount || 0);
      }
    }
  });

  // Sort chronologically
  const chartData = Object.entries(citationsByYear)
    .map(([year, citations]) => ({ name: year, citations }))
    .sort((a, b) => parseInt(a.name) - parseInt(b.name));

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-brand-card border border-brand-border p-2.5 rounded-xl shadow-xl">
          <p className="text-xs font-semibold text-brand-text">Year: {payload[0].payload.name}</p>
          <p className="text-xs text-brand-success mt-0.5">{payload[0].value} Citations</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="glass-card rounded-2xl p-5 border border-brand-border h-[300px] flex flex-col">
      <h3 className="text-xs font-bold text-brand-text uppercase tracking-wider mb-4">
        Citations by Publication Year
      </h3>
      {chartData.length === 0 ? (
        <div className="flex-grow flex items-center justify-center text-xs text-brand-textMuted italic">
          No citation timeline data available
        </div>
      ) : (
        <div className="flex-grow w-full h-full text-xs">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorCitations" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#06B6D4" stopOpacity={0.4}/>
                  <stop offset="95%" stopColor="#06B6D4" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#ABA2EB" opacity={0.4} />
              <XAxis dataKey="name" stroke="#5D539F" tickLine={false} />
              <YAxis stroke="#5D539F" tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="citations" stroke="#06B6D4" strokeWidth={2} fillOpacity={1} fill="url(#colorCitations)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
};

export default CitationChart;
