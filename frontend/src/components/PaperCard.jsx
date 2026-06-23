import React from 'react';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { userAPI } from '../services/api.js';
import { Bookmark, BookmarkCheck, Calendar, Quote, ExternalLink, Award } from 'lucide-react';

export const PaperCard = ({ paper, onBookmarkToggle, reasons, score, isSaved: propIsSaved }) => {
  const { isAuthenticated } = useSelector((state) => state.auth);
  const [isSaved, setIsSaved] = React.useState(propIsSaved !== undefined ? propIsSaved : false);
  const [loading, setLoading] = React.useState(false);

  // Check if this paper is already bookmarked
  React.useEffect(() => {
    if (propIsSaved !== undefined) {
      setIsSaved(propIsSaved);
      return;
    }

    const checkBookmarkStatus = async () => {
      if (!isAuthenticated) return;
      try {
        const saved = await userAPI.getSavedPapers();
        const savedIds = saved.map((s) => s.paperId?._id);
        setIsSaved(savedIds.includes(paper._id));
      } catch (err) {
        console.error(err);
      }
    };
    checkBookmarkStatus();
  }, [paper._id, isAuthenticated, propIsSaved]);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!isAuthenticated) {
      alert('Please log in to save papers to your library.');
      return;
    }

    try {
      setLoading(true);
      if (isSaved) {
        await userAPI.deleteSavedPaper(paper._id);
        setIsSaved(false);
      } else {
        await userAPI.savePaper(paper._id, 'Bookmarks');
        setIsSaved(true);
      }
      if (onBookmarkToggle) onBookmarkToggle();
    } catch (err) {
      alert(err.message || 'Action failed');
    } finally {
      setLoading(false);
    }
  };

  const formattedDate = new Date(paper.publicationDate).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  return (
    <div className="glass-card glass-card-hover rounded-2xl p-6 flex flex-col justify-between relative overflow-hidden">
      <div>
        {reasons && reasons.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {reasons.map((r, i) => {
              const labelMap = {
                followed_topic: 'Followed Topic',
                followed_author: 'Followed Author',
                trending: 'Trending',
              };
              return (
                <span key={i} className="px-2 py-0.5 text-[9px] font-bold text-emerald-400 bg-emerald-400/10 border border-emerald-400/30 rounded-md uppercase tracking-wider">
                  {labelMap[r] || r}
                </span>
              );
            })}
            {score && (
              <span className="px-2 py-0.5 text-[9px] font-bold text-brand-accent bg-brand-accent/10 border border-brand-accent/30 rounded-md uppercase tracking-wider">
                Score: {score.toFixed(0)}
              </span>
            )}
          </div>
        )}

        {/* Source Badge and Date */}
        <div className="flex items-center justify-between mb-4">
          <span className="px-3 py-1 text-[11px] font-semibold tracking-wider text-brand-accent bg-brand-accent/10 border border-brand-accent/20 rounded-full uppercase">
            {paper.source}
          </span>
          <div className="flex items-center text-xs text-brand-textMuted space-x-1">
            <Calendar size={12} />
            <span>{formattedDate}</span>
          </div>
        </div>

        {/* Paper Title */}
        <Link to={`/papers/${paper._id}`} className="block group">
          <h3 className="text-lg font-bold text-brand-text leading-snug group-hover:text-brand-accent transition-colors duration-200 line-clamp-2">
            {paper.title}
          </h3>
        </Link>

        {/* Authors List */}
        <div className="flex flex-wrap gap-x-2 gap-y-1 mt-3">
          {paper.authors?.slice(0, 3).map((author, index) => (
            <React.Fragment key={author.authorId || index}>
              {author.authorId ? (
                <Link
                  to={`/authors/${author.authorId}`}
                  className="text-xs text-brand-textMuted hover:text-brand-text hover:underline flex items-center space-x-1"
                >
                  <Award size={10} className="text-brand-success" />
                  <span>{author.name}</span>
                </Link>
              ) : (
                <span className="text-xs text-brand-textMuted">{author.name}</span>
              )}
              {index < Math.min(paper.authors.length, 3) - 1 && <span className="text-brand-textMuted/40 text-xs">•</span>}
            </React.Fragment>
          ))}
          {paper.authors?.length > 3 && (
            <span className="text-xs text-brand-textMuted italic">+{paper.authors.length - 3} more</span>
          )}
        </div>

        {/* Abstract snippet */}
        <p className="text-xs text-brand-textMuted mt-4 leading-relaxed line-clamp-3">
          {paper.abstract}
        </p>

        {/* Categories Tags */}
        <div className="flex flex-wrap gap-1.5 mt-4">
          {paper.categories?.slice(0, 3).map((cat, idx) => (
            <Link
              key={idx}
              to={`/search?topic=${encodeURIComponent(cat)}`}
              className="px-2 py-0.5 text-[10px] font-medium text-brand-textMuted bg-brand-border/40 hover:bg-brand-border hover:text-brand-text rounded-md transition-colors"
            >
              #{cat}
            </Link>
          ))}
        </div>
      </div>

      {/* Footer Metrics & Actions */}
      <div className="flex items-center justify-between border-t border-brand-border/40 mt-6 pt-4">
        <div className="flex items-center text-xs text-brand-textMuted space-x-1" title="Citations count">
          <Quote size={12} className="text-brand-accent rotate-180" />
          <span className="font-semibold text-brand-text">{paper.citationCount}</span>
          <span className="text-[10px]">Citations</span>
        </div>

        <div className="flex items-center space-x-2">
          {/* Bookmark Action */}
          <button
            onClick={handleSave}
            disabled={loading}
            className={`p-2 rounded-xl border transition-all ${
              isSaved
                ? 'bg-brand-primary/10 border-brand-primary text-brand-primary'
                : 'border-brand-border text-brand-textMuted hover:text-brand-text hover:border-brand-border/80'
            }`}
            title={isSaved ? 'Remove Bookmark' : 'Bookmark Paper'}
          >
            {isSaved ? <BookmarkCheck size={16} /> : <Bookmark size={16} />}
          </button>

          {/* Details Action */}
          <Link
            to={`/papers/${paper._id}`}
            className="px-3 py-2 text-xs font-semibold bg-brand-border/40 border border-brand-border hover:bg-brand-border text-brand-text rounded-xl flex items-center space-x-1.5 transition-colors"
          >
            <span>Details</span>
            <ExternalLink size={12} />
          </Link>
        </div>
      </div>
    </div>
  );
};

export default PaperCard;
