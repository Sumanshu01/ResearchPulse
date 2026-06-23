import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

export const CategoryChart = ({ papers = [] }) => {
  // Aggregate category counts
  const categoryCounts = {};
  papers.forEach((p) => {
    (p.categories || []).forEach((c) => {
      categoryCounts[c] = (categoryCounts[c] || 0) + 1;
    });
  });

  // Sort and take top 5
  const chartData = Object.entries(categoryCounts)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-brand-card border border-brand-border p-2.5 rounded-xl shadow-xl">
          <p className="text-xs font-semibold text-brand-text">{payload[0].name}</p>
          <p className="text-xs text-brand-accent mt-0.5">{payload[0].value} Papers</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="glass-card rounded-2xl p-5 border border-brand-border h-[300px] flex flex-col">
      <h3 className="text-xs font-bold text-brand-text uppercase tracking-wider mb-4">
        Top Research Categories
      </h3>
      {chartData.length === 0 ? (
        <div className="flex-grow flex items-center justify-center text-xs text-brand-textMuted italic">
          No category data available
        </div>
      ) : (
        <div className="flex-grow w-full h-full text-xs">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#ABA2EB" opacity={0.4} />
              <XAxis dataKey="name" stroke="#5D539F" tickLine={false} />
              <YAxis stroke="#5D539F" tickLine={false} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(99,102,241,0.05)' }} />
              <Bar dataKey="value" fill="#4F46E5" radius={[4, 4, 0, 0]} barSize={25}>
                {/* Visual accents */}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
};

export default CategoryChart;
