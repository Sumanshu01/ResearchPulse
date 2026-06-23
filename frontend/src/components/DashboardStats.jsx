import React from 'react';
import { Database, Quote, Bookmark, Globe } from 'lucide-react';

export const DashboardStats = ({ papers = [] }) => {
  // Compute metrics dynamically from fetched papers
  const totalPapers = papers.length;
  const totalCitations = papers.reduce((sum, p) => sum + (p.citationCount || 0), 0);

  // Compute top category
  const categoriesCount = {};
  papers.forEach((p) => {
    (p.categories || []).forEach((c) => {
      categoriesCount[c] = (categoriesCount[c] || 0) + 1;
    });
  });

  let topCategory = 'N/A';
  let maxCount = 0;
  Object.entries(categoriesCount).forEach(([cat, count]) => {
    if (count > maxCount) {
      maxCount = count;
      topCategory = cat;
    }
  });

  // Compute active sources
  const sources = new Set(papers.map((p) => p.source));
  const activeSources = sources.size;

  const stats = [
    {
      label: 'Ingested Papers',
      value: totalPapers,
      subtext: 'Indexed items',
      icon: Database,
      color: 'text-brand-accent',
      bgColor: 'bg-brand-accent/10 border-brand-accent/20',
    },
    {
      label: 'Total Citations',
      value: totalCitations,
      subtext: 'Accumulated index',
      icon: Quote,
      color: 'text-brand-primary',
      bgColor: 'bg-brand-primary/10 border-brand-primary/20',
    },
    {
      label: 'Dominant Category',
      value: topCategory,
      subtext: maxCount > 0 ? `${maxCount} papers` : 'No categories',
      icon: Bookmark,
      color: 'text-brand-success',
      bgColor: 'bg-brand-success/10 border-brand-success/20',
    },
    {
      label: 'API Sources',
      value: `${activeSources}/5`,
      subtext: 'arXiv, OpenAlex, etc.',
      icon: Globe,
      color: 'text-amber-500',
      bgColor: 'bg-amber-500/10 border-amber-500/20',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
      {stats.map((stat, idx) => {
        const Icon = stat.icon;
        return (
          <div key={idx} className="glass-card rounded-2xl p-5 border border-brand-border flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs text-brand-textMuted font-medium block">{stat.label}</span>
              <span className="text-xl font-extrabold text-brand-text block tracking-tight truncate max-w-[150px]" title={stat.value}>
                {stat.value}
              </span>
              <span className="text-[10px] text-brand-textMuted/60 block">{stat.subtext}</span>
            </div>
            <div className={`p-3 rounded-xl border ${stat.bgColor} ${stat.color}`}>
              <Icon size={20} />
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default DashboardStats;
