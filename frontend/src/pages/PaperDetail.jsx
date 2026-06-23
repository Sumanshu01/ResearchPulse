import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { paperAPI, userAPI, aiAPI } from '../services/api.js';
import {
  Calendar, Quote, Bookmark, BookmarkCheck, ExternalLink, Hash,
  Loader2, Award, FileText, Brain, Sparkles, ChevronRight,
  Lightbulb, FlaskConical, AlertTriangle, Rocket, Target, RefreshCw
} from 'lucide-react';

// ── AI Summary Section ──────────────────────────────────────────
const AiSummarySection = ({ paperId }) => {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [regenerating, setRegenerating] = useState(false);
  const { isAuthenticated } = useSelector((state) => state.auth);

  const fetchSummary = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await aiAPI.getSummary(paperId);
      setSummary(res.summary);
    } catch (err) {
      setError(err.message || 'Failed to generate AI summary');
    } finally {
      setLoading(false);
    }
  };

  const handleRegenerate = async () => {
    if (!isAuthenticated) return;
    try {
      setRegenerating(true);
      const res = await aiAPI.regenerateSummary(paperId);
      setSummary(res.summary);
    } catch (err) {
      setError(err.message || 'Failed to regenerate summary');
    } finally {
      setRegenerating(false);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, [paperId]);

  if (loading) {
    return (
      <div className="glass-card rounded-3xl p-6 border border-brand-border">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-brand-primary/10 border border-brand-primary/20 rounded-xl">
            <Brain size={20} className="text-brand-primary animate-pulse" />
          </div>
          <div>
            <h2 className="text-base font-bold text-brand-text">Gemini AI Analysis</h2>
            <p className="text-xs text-brand-textMuted">Generating structured intelligence...</p>
          </div>
        </div>
        <div className="space-y-3">
          {[1,2,3,4].map(i => (
            <div key={i} className="h-4 bg-brand-border/40 rounded-lg animate-pulse" style={{width: `${85 - i*10}%`}} />
          ))}
        </div>
      </div>
    );
  }

  if (error || !summary) {
    return (
      <div className="glass-card rounded-3xl p-6 border border-red-500/20">
        <div className="flex items-center gap-2 text-red-400 text-sm">
          <AlertTriangle size={16} />
          <span>{error || 'AI summary unavailable'}</span>
        </div>
      </div>
    );
  }

  const sections = [
    { icon: Target, color: 'text-brand-primary', bg: 'bg-brand-primary/10 border-brand-primary/20', label: 'Executive Summary', content: summary.executiveSummary, type: 'text' },
    { icon: Lightbulb, color: 'text-yellow-400', bg: 'bg-yellow-400/10 border-yellow-400/20', label: 'Key Contributions', content: summary.keyContributions, type: 'list' },
    { icon: FlaskConical, color: 'text-cyan-400', bg: 'bg-cyan-400/10 border-cyan-400/20', label: 'Methodology', content: summary.methodology, type: 'text' },
    { icon: Sparkles, color: 'text-emerald-400', bg: 'bg-emerald-400/10 border-emerald-400/20', label: 'Main Findings', content: summary.mainFindings, type: 'list' },
    { icon: AlertTriangle, color: 'text-orange-400', bg: 'bg-orange-400/10 border-orange-400/20', label: 'Limitations', content: summary.limitations, type: 'list' },
    { icon: Rocket, color: 'text-purple-400', bg: 'bg-purple-400/10 border-purple-400/20', label: 'Future Directions', content: summary.futureWork, type: 'list' },
  ];

  return (
    <div className="glass-card rounded-3xl p-6 border border-brand-primary/20 shadow-lg shadow-brand-primary/5">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-brand-primary/10 border border-brand-primary/20 rounded-xl">
            <Brain size={20} className="text-brand-primary" />
          </div>
          <div>
            <h2 className="text-base font-bold text-brand-text flex items-center gap-2">
              Gemini AI Analysis
              <span className="px-2 py-0.5 text-[9px] font-bold text-brand-primary bg-brand-primary/10 border border-brand-primary/20 rounded-full uppercase tracking-wider">
                {summary.model === 'mock' ? 'Demo Mode' : 'AI Generated'}
              </span>
            </h2>
            <p className="text-xs text-brand-textMuted">Structured intelligence from Gemini 1.5 Flash</p>
          </div>
        </div>
        {isAuthenticated && (
          <button
            onClick={handleFollowTopic ? handleRegenerate : undefined}
            disabled={regenerating}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-brand-textMuted hover:text-brand-text border border-brand-border hover:border-brand-primary bg-brand-border/40 rounded-xl transition-all"
          >
            <RefreshCw size={12} className={regenerating ? 'animate-spin' : ''} />
            {regenerating ? 'Regenerating…' : 'Regenerate'}
          </button>
        )}
      </div>

      {/* Sections Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {sections.map(({ icon: Icon, color, bg, label, content, type }) => {
          if (!content || (Array.isArray(content) && content.length === 0)) return null;
          return (
            <div key={label} className={`p-4 rounded-2xl border bg-gradient-to-br ${bg} to-transparent`}>
              <div className={`flex items-center gap-2 mb-2 ${color}`}>
                <Icon size={15} />
                <p className="text-xs font-bold uppercase tracking-wider">{label}</p>
              </div>
              {type === 'text' ? (
                <p className="text-xs text-brand-text leading-relaxed">{content}</p>
              ) : (
                <ul className="space-y-1.5">
                  {(content || []).map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-brand-text">
                      <ChevronRight size={11} className={`${color} mt-0.5 shrink-0`} />
                      <span className="leading-relaxed">{item}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ── Similar Papers Section ──────────────────────────────────────
const SimilarPapersSection = ({ paperId }) => {
  const [papers, setPapers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    aiAPI.getSimilarPapers(paperId, 6)
      .then(res => setPapers(res.papers || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [paperId]);

  if (loading) {
    return (
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-brand-text tracking-tight flex items-center gap-2">
          <Brain size={18} className="text-brand-accent" />
          Semantically Similar Papers
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[1,2,3,4].map(i => (
            <div key={i} className="glass-card rounded-2xl p-5 border border-brand-border h-28 animate-pulse bg-brand-border/20" />
          ))}
        </div>
      </div>
    );
  }

  if (!papers.length) return null;

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold text-brand-text tracking-tight flex items-center gap-2">
        <Brain size={18} className="text-brand-accent" />
        Semantically Similar Papers
        <span className="text-xs font-normal text-brand-textMuted">(AI Powered)</span>
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {papers.map((p) => {
          const simPct = p.similarity != null ? Math.round(p.similarity * 100) : null;
          return (
            <div key={p._id} className="glass-card rounded-2xl p-5 border border-brand-border hover:border-brand-accent/30 transition-all group">
              <div className="flex items-start justify-between gap-2 mb-2">
                <span className="px-2 py-0.5 text-[9px] font-semibold text-brand-accent bg-brand-accent/10 border border-brand-accent/20 rounded-md uppercase">
                  {p.source}
                </span>
                {simPct != null && (
                  <span className={`px-2 py-0.5 text-[9px] font-bold rounded-md uppercase tracking-wider ${
                    simPct >= 80 ? 'text-emerald-600 bg-emerald-400/10 border border-emerald-400/30' :
                    simPct >= 60 ? 'text-yellow-600 bg-yellow-400/10 border border-yellow-400/30' :
                    'text-brand-textMuted bg-brand-border/40 border border-brand-border'
                  }`}>
                    {simPct}% match
                  </span>
                )}
              </div>
              <Link to={`/papers/${p._id}`} className="block text-sm font-bold text-brand-text hover:text-brand-accent transition-colors leading-snug line-clamp-2 group-hover:text-brand-accent">
                {p.title}
              </Link>
              <div className="flex items-center justify-between border-t border-brand-border/40 mt-3 pt-2.5">
                <span className="text-[10px] text-brand-textMuted">
                  {p.authors?.[0]?.name || 'Unknown'} · {p.citationCount} citations
                </span>
                <Link to={`/papers/${p._id}`} className="text-[11px] font-bold text-brand-accent hover:underline flex items-center gap-1">
                  <span>Read</span>
                  <ExternalLink size={10} />
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};


// ── Main PaperDetail Page ───────────────────────────────────────
export const PaperDetail = () => {
  const { id } = useParams();
  const { isAuthenticated } = useSelector((state) => state.auth);
  const navigate = useNavigate();
  
  const [paper, setPaper] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isSaved, setIsSaved] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchPaper = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await paperAPI.getPaperById(id);
      setPaper(data);

      if (isAuthenticated) {
        const saved = await userAPI.getSavedPapers();
        const savedIds = saved.map((s) => s.paperId?._id);
        setIsSaved(savedIds.includes(data._id));
      }
    } catch (err) {
      setError(err.message || 'Failed to load paper details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPaper();
  }, [id, isAuthenticated]);

  const handleSave = async () => {
    if (!isAuthenticated) {
      alert('Please log in to save papers to your library.');
      return;
    }
    try {
      setActionLoading(true);
      if (isSaved) {
        await userAPI.deleteSavedPaper(paper._id);
        setIsSaved(false);
      } else {
        await userAPI.savePaper(paper._id, 'Bookmarks');
        setIsSaved(true);
      }
    } catch (err) {
      alert(err.message || 'Action failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleFollowTopic = async (topicName) => {
    if (!isAuthenticated) {
      alert('Please log in to follow research topics.');
      return;
    }
    try {
      const res = await userAPI.followTopic(topicName);
      alert(res.message);
    } catch (err) {
      alert(err.message || 'Action failed');
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32">
        <Loader2 size={44} className="text-brand-primary animate-spin mb-4" />
        <p className="text-sm text-brand-textMuted font-medium">Extracting paper metadata details...</p>
      </div>
    );
  }

  if (error || !paper) {
    return (
      <div className="glass-card rounded-2xl p-12 text-center border border-red-500/20 max-w-2xl mx-auto mt-10">
        <p className="text-sm font-semibold text-red-300 mb-4">{error || 'Paper not found.'}</p>
        <Link to="/" className="px-4 py-2 bg-brand-primary text-xs font-bold text-white rounded-xl hover:bg-brand-primary/80 transition-colors">
          Return to Dashboard
        </Link>
      </div>
    );
  }

  const formattedDate = new Date(paper.publicationDate).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  });

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Back link */}
      <div>
        <button
          onClick={() => navigate(-1)}
          className="text-xs text-brand-textMuted hover:text-brand-text flex items-center space-x-1 w-fit transition-colors bg-transparent border-none p-0 cursor-pointer"
        >
          <span>&larr; Go Back</span>
        </button>
      </div>

      {/* Main Metadata panel */}
      <div className="glass-card rounded-3xl p-6 md:p-8 border border-brand-border space-y-6 relative overflow-hidden">
        {/* Source Badge & Date */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <span className="px-3.5 py-1 text-[11px] font-bold tracking-wider text-brand-accent bg-brand-accent/10 border border-brand-accent/20 rounded-full uppercase">
            {paper.source}
          </span>
          <div className="flex items-center text-xs text-brand-textMuted space-x-2">
            <Calendar size={14} />
            <span>Published: {formattedDate}</span>
          </div>
        </div>

        {/* Paper Title */}
        <h1 className="text-2xl md:text-3xl font-extrabold text-brand-text leading-tight">
          {paper.title}
        </h1>

        {/* Authors */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-b border-brand-border/40 py-4">
          <span className="text-xs font-semibold text-brand-textMuted uppercase tracking-wider">Authors:</span>
          {paper.authors?.map((author, index) => (
            <div key={author.authorId || index} className="flex items-center space-x-1 text-sm">
              {author.authorId ? (
                <Link to={`/authors/${author.authorId}`} className="font-medium text-brand-text hover:text-brand-accent hover:underline flex items-center space-x-1">
                  <Award size={13} className="text-brand-success" />
                  <span>{author.name}</span>
                </Link>
              ) : (
                <span className="text-brand-textMuted font-medium">{author.name}</span>
              )}
              {index < paper.authors.length - 1 && <span className="text-brand-textMuted/40 pl-1">•</span>}
            </div>
          ))}
        </div>

        {/* Abstract */}
        <div className="space-y-3">
          <h2 className="text-base font-bold text-brand-text tracking-tight uppercase">Abstract</h2>
          <p className="text-sm text-brand-text leading-relaxed font-sans text-justify">
            {paper.abstract}
          </p>
        </div>

        {/* Categories */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold text-brand-textMuted uppercase tracking-wider">Research Categories (Click to Follow)</h3>
          <div className="flex flex-wrap gap-2">
            {paper.categories?.map((cat, idx) => (
              <button
                key={idx}
                onClick={() => handleFollowTopic(cat)}
                className="px-3 py-1.5 text-xs font-semibold text-brand-textMuted bg-brand-border/20 hover:bg-brand-accent/10 hover:border-brand-accent/40 border border-brand-border rounded-xl flex items-center space-x-1.5 transition-all cursor-pointer"
              >
                <Hash size={12} className="text-brand-accent" />
                <span>{cat}</span>
              </button>
            ))}
          </div>
        </div>

        {/* External Links & Citations & Save */}
        <div className="flex flex-wrap items-center justify-between gap-5 border-t border-brand-border/40 pt-6 mt-6">
          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-2 text-sm text-brand-textMuted">
              <Quote size={14} className="text-brand-accent rotate-180" />
              <span className="font-bold text-brand-text text-lg leading-none">{paper.citationCount}</span>
              <span>Citations</span>
            </div>

            {paper.doi && (
              <div className="text-xs text-brand-textMuted">
                <span className="font-semibold uppercase mr-1">DOI:</span>
                <a href={`https://doi.org/${paper.doi}`} target="_blank" rel="noopener noreferrer"
                  className="hover:underline hover:text-brand-text text-brand-accent">
                  {paper.doi}
                </a>
              </div>
            )}
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={handleSave}
              disabled={actionLoading}
              className={`px-4 py-2.5 rounded-xl border font-bold text-xs flex items-center space-x-1.5 cursor-pointer transition-all ${
                isSaved
                  ? 'bg-brand-primary/10 border-brand-primary text-brand-primary hover:bg-brand-primary/20'
                  : 'border-brand-border text-brand-textMuted hover:text-brand-text hover:border-brand-primary'
              }`}
            >
              {isSaved ? <BookmarkCheck size={14} /> : <Bookmark size={14} />}
              <span>{isSaved ? 'Bookmarked' : 'Add to Library'}</span>
            </button>

            {paper.url && (
              <a href={paper.url} target="_blank" rel="noopener noreferrer"
                className="px-4 py-2.5 bg-brand-primary hover:bg-brand-primary/80 text-white font-bold text-xs rounded-xl flex items-center space-x-1.5 transition-all shadow-md shadow-brand-primary/20">
                <span>Read Full Paper</span>
                <ExternalLink size={14} />
              </a>
            )}

            {paper.pdfUrl && (
              <a href={paper.pdfUrl} target="_blank" rel="noopener noreferrer"
                className="p-2.5 bg-brand-border/40 border border-brand-border hover:bg-brand-border text-red-600 rounded-xl transition-all"
                title="View PDF Document">
                <FileText size={16} />
              </a>
            )}
          </div>
        </div>
      </div>

      {/* ── AI Summary Section ── */}
      <AiSummarySection paperId={id} />

      {/* ── Semantically Similar Papers ── */}
      <SimilarPapersSection paperId={id} />

      {/* ── Related Papers (category-based from DB) ── */}
      {paper.relatedPapers?.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-brand-text tracking-tight uppercase">Related Papers</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {paper.relatedPapers.map((rel) => (
              <div key={rel._id} className="glass-card rounded-2xl p-5 border border-brand-border flex flex-col justify-between">
                <div>
                  <span className="px-2 py-0.5 text-[9px] font-semibold text-brand-accent bg-brand-accent/10 border border-brand-accent/20 rounded-md uppercase">
                    {rel.source}
                  </span>
                  <Link to={`/papers/${rel._id}`} className="block text-sm font-bold text-brand-text hover:text-brand-accent mt-2 leading-snug">
                    {rel.title}
                  </Link>
                  <p className="text-[10px] text-brand-textMuted mt-1">
                    Citations: {rel.citationCount} • Published: {new Date(rel.publicationDate).getFullYear()}
                  </p>
                </div>
                <div className="flex justify-end mt-4 pt-3 border-t border-brand-border/40">
                  <Link to={`/papers/${rel._id}`} className="text-[11px] font-bold text-brand-accent hover:underline flex items-center space-x-1">
                    <span>Explore details</span>
                    <ExternalLink size={10} />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default PaperDetail;
