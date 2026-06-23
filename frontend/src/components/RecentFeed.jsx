import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import useSocket from '../hooks/useSocket.js';
import { Rss, Sparkles, Calendar, ChevronRight, Activity } from 'lucide-react';

export const RecentFeed = () => {
  const [livePapers, setLivePapers] = useState([]);
  const [newCount, setNewCount] = useState(0);

  // Hook up Socket.IO
  useSocket((newPaper) => {
    setLivePapers((prev) => {
      // Avoid duplicates
      if (prev.find((p) => p._id === newPaper._id)) return prev;
      return [newPaper, ...prev].slice(0, 5); // Keep last 5
    });
    setNewCount((c) => c + 1);
  });

  const handleClearBadge = () => {
    setNewCount(0);
  };

  return (
    <div className="glass-card rounded-2xl p-5 border border-brand-border h-full flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center space-x-2.5">
            <div className="p-1.5 bg-brand-accent/10 border border-brand-accent/20 rounded-lg text-brand-accent animate-pulse-slow">
              <Rss size={16} />
            </div>
            <h3 className="text-sm font-bold text-brand-text uppercase tracking-wider">
              Real-time Ingestion Feed
            </h3>
          </div>
          {newCount > 0 && (
            <button
              onClick={handleClearBadge}
              className="flex items-center space-x-1.5 bg-brand-accent/20 border border-brand-accent/30 text-[10px] font-bold text-brand-accent px-2 py-0.5 rounded-full animate-bounce"
            >
              <Sparkles size={10} />
              <span>{newCount} New</span>
            </button>
          )}
        </div>

        {livePapers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Activity size={32} className="text-brand-textMuted/40 animate-pulse mb-3" />
            <p className="text-xs text-brand-textMuted font-medium">Listening for incoming papers...</p>
            <p className="text-[10px] text-brand-textMuted/50 max-w-[200px] mt-1">
              New papers harvested hourly will stream live here.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {livePapers.map((paper, index) => {
              const date = new Date(paper.publicationDate).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
              });

              return (
                <div
                  key={paper._id || index}
                  className="p-3 bg-brand-card/60 border border-brand-border/40 rounded-xl hover:border-brand-primary/30 transition-colors animate-slide-up"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <span className="px-2 py-0.5 text-[9px] font-semibold text-brand-accent bg-brand-accent/10 border border-brand-accent/20 rounded-md uppercase">
                    {paper.source}
                  </span>
                  <Link
                    to={`/papers/${paper._id}`}
                    className="block text-xs font-bold text-brand-text hover:text-brand-accent mt-1.5 leading-snug line-clamp-2"
                  >
                    {paper.title}
                  </Link>
                  <div className="flex items-center justify-between mt-2.5 text-[10px] text-brand-textMuted">
                    <span className="truncate max-w-[120px]">
                      {paper.authors?.[0]?.name || 'Unknown Author'}
                    </span>
                    <span className="flex items-center">
                      <Calendar size={10} className="mr-1" />
                      {date}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {livePapers.length > 0 && (
        <div className="mt-4 pt-3 border-t border-brand-border/30 flex justify-end">
          <Link
            to="/search"
            className="text-[10px] font-bold text-brand-accent hover:underline flex items-center space-x-1"
          >
            <span>Search Full Index</span>
            <ChevronRight size={12} />
          </Link>
        </div>
      )}
    </div>
  );
};

export default RecentFeed;
