import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { searchAPI, userAPI, paperAPI } from '../services/api.js';
import PaperCard from '../components/PaperCard.jsx';
import { Search as SearchIcon, SlidersHorizontal, Loader2, ArrowLeft, ArrowRight, ListFilter, Database, RefreshCw } from 'lucide-react';

export const Search = () => {
  const { isAuthenticated } = useSelector((state) => state.auth);
  const [searchParams, setSearchParams] = useSearchParams();
  const [papers, setPapers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showFilters, setShowFilters] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [seedMessage, setSeedMessage] = useState('');

  // Saved paper IDs for optimization
  const [savedIds, setSavedIds] = useState(new Set());

  // Pagination states
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  // Search input and filter states synced with URL search params
  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [author, setAuthor] = useState(searchParams.get('author') || '');
  const [institution, setInstitution] = useState(searchParams.get('institution') || '');
  const [topic, setTopic] = useState(searchParams.get('topic') || '');
  const [source, setSource] = useState(searchParams.get('source') || '');
  const [citations, setCitations] = useState(searchParams.get('citations') || '');
  const [yearMin, setYearMin] = useState(searchParams.get('yearMin') || '');
  const [yearMax, setYearMax] = useState(searchParams.get('yearMax') || '');
  const [sortBy, setSortBy] = useState(searchParams.get('sortBy') || 'relevance');

  // Trigger search when searchParams change or page change
  const executeSearch = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = {
        page,
        limit: 10,
        q: searchParams.get('q') || undefined,
        author: searchParams.get('author') || undefined,
        institution: searchParams.get('institution') || undefined,
        topic: searchParams.get('topic') || undefined,
        source: searchParams.get('source') || undefined,
        citations: searchParams.get('citations') || undefined,
        yearMin: searchParams.get('yearMin') || undefined,
        yearMax: searchParams.get('yearMax') || undefined,
        sortBy: searchParams.get('sortBy') || undefined,
      };

      const result = await searchAPI.search(params);
      setPapers(result.papers || []);
      setTotalPages(result.pages || 1);
      setTotalItems(result.total || 0);
    } catch (err) {
      setError(err.message || 'Failed to complete search inquiry.');
    } finally {
      setLoading(false);
    }
  };

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

  useEffect(() => {
    executeSearch();
    fetchSavedIds();
  }, [searchParams, page, isAuthenticated]);

  // Sync state if searchParams changes from outside (e.g. Navbar quick search)
  useEffect(() => {
    setQuery(searchParams.get('q') || '');
    setTopic(searchParams.get('topic') || '');
  }, [searchParams]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1); // reset to page 1

    const newParams = {};
    if (query.trim()) newParams.q = query;
    if (author.trim()) newParams.author = author;
    if (institution.trim()) newParams.institution = institution;
    if (topic.trim()) newParams.topic = topic;
    if (source) newParams.source = source;
    if (citations) newParams.citations = citations;
    if (yearMin) newParams.yearMin = yearMin;
    if (yearMax) newParams.yearMax = yearMax;
    if (sortBy) newParams.sortBy = sortBy;

    setSearchParams(newParams);
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setPage(newPage);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleReset = () => {
    setQuery('');
    setAuthor('');
    setInstitution('');
    setTopic('');
    setSource('');
    setCitations('');
    setYearMin('');
    setYearMax('');
    setSortBy('relevance');
    setSearchParams({});
    setPage(1);
  };

  const handleSeedDatabase = async () => {
    setSeeding(true);
    setSeedMessage('');
    try {
      const result = await paperAPI.seedDatabase();
      setSeedMessage(result.message || 'Seeding started! Results will appear in 2–5 minutes.');
      // Re-run search after 5 seconds
      setTimeout(() => executeSearch(), 5000);
    } catch (e) {
      setSeedMessage('Failed to start seeding: ' + e.message);
    } finally {
      setSeeding(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Search bar */}
      <form onSubmit={handleSearchSubmit} className="glass-card rounded-2xl p-5 border border-brand-border space-y-4">
        <div className="flex items-center gap-3">
          <div className="flex-grow flex items-center relative">
            <SearchIcon size={20} className="absolute left-4 text-brand-textMuted" />
            <input
              type="text"
              placeholder="Search research title, abstract keywords, DOI, categories..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full bg-brand-bg/60 border border-brand-border rounded-xl pl-12 pr-4 py-3 text-brand-text placeholder-brand-textMuted focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary transition-all"
            />
          </div>
          <button
            type="button"
            onClick={() => setShowFilters(!showFilters)}
            className={`p-3 border rounded-xl flex items-center justify-center transition-colors cursor-pointer ${
              showFilters ? 'bg-brand-primary/10 border-brand-primary text-brand-primary' : 'border-brand-border text-brand-textMuted hover:text-brand-text'
            }`}
            title="Toggle Advanced Filters"
          >
            <SlidersHorizontal size={20} />
          </button>
          <button
            type="submit"
            className="bg-brand-primary hover:bg-brand-primary/80 text-white font-bold px-6 py-3 rounded-xl shadow-lg shadow-brand-primary/15 transition-all cursor-pointer"
          >
            Search
          </button>
        </div>

        {/* Expandable Advanced Filters Panel */}
        {showFilters && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-brand-border/40 animate-fade-in">
            {/* Author */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold uppercase text-brand-textMuted tracking-wider">Author Name</label>
              <input
                type="text"
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                placeholder="e.g. Geoffrey Hinton"
                className="w-full bg-brand-bg/60 border border-brand-border rounded-lg px-3 py-1.5 text-xs text-brand-text focus:outline-none focus:border-brand-accent"
              />
            </div>

            {/* Institution */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold uppercase text-brand-textMuted tracking-wider">Institution</label>
              <input
                type="text"
                value={institution}
                onChange={(e) => setInstitution(e.target.value)}
                placeholder="e.g. Stanford"
                className="w-full bg-brand-bg/60 border border-brand-border rounded-lg px-3 py-1.5 text-xs text-brand-text focus:outline-none focus:border-brand-accent"
              />
            </div>

            {/* Topic tag */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold uppercase text-brand-textMuted tracking-wider">Category / Topic</label>
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g. Quantum Computing"
                className="w-full bg-brand-bg/60 border border-brand-border rounded-lg px-3 py-1.5 text-xs text-brand-text focus:outline-none focus:border-brand-accent"
              />
            </div>

            {/* Ingestion Source */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold uppercase text-brand-textMuted tracking-wider">Source Registry</label>
              <select
                value={source}
                onChange={(e) => setSource(e.target.value)}
                className="w-full bg-brand-bg/60 border border-brand-border rounded-lg px-3 py-1.5 text-xs text-brand-text focus:outline-none focus:border-brand-accent"
              >
                <option value="">All Registries</option>
                <option value="arXiv">arXiv</option>
                <option value="OpenAlex">OpenAlex</option>
                <option value="Crossref">Crossref</option>
                <option value="Semantic Scholar">Semantic Scholar</option>
                <option value="PubMed">PubMed</option>
              </select>
            </div>

            {/* Min Citations */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold uppercase text-brand-textMuted tracking-wider">Minimum Citations</label>
              <select
                value={citations}
                onChange={(e) => setCitations(e.target.value)}
                className="w-full bg-brand-bg/60 border border-brand-border rounded-lg px-3 py-1.5 text-xs text-brand-text focus:outline-none focus:border-brand-accent"
              >
                <option value="">Any citations</option>
                <option value="5">5+ citations</option>
                <option value="20">20+ citations</option>
                <option value="50">50+ citations</option>
                <option value="100">100+ citations</option>
              </select>
            </div>

            {/* Year Min */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold uppercase text-brand-textMuted tracking-wider">From Year</label>
              <input
                type="number"
                value={yearMin}
                onChange={(e) => setYearMin(e.target.value)}
                placeholder="YYYY"
                className="w-full bg-brand-bg/60 border border-brand-border rounded-lg px-3 py-1.5 text-xs text-brand-text focus:outline-none focus:border-brand-accent"
              />
            </div>

            {/* Year Max */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold uppercase text-brand-textMuted tracking-wider">To Year</label>
              <input
                type="number"
                value={yearMax}
                onChange={(e) => setYearMax(e.target.value)}
                placeholder="YYYY"
                className="w-full bg-brand-bg/60 border border-brand-border rounded-lg px-3 py-1.5 text-xs text-brand-text focus:outline-none focus:border-brand-accent"
              />
            </div>

            {/* Sort Order */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold uppercase text-brand-textMuted tracking-wider">Sort Result By</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full bg-brand-bg/60 border border-brand-border rounded-lg px-3 py-1.5 text-xs text-brand-text focus:outline-none focus:border-brand-accent"
              >
                <option value="relevance">Relevance score</option>
                <option value="newest">Newest Published</option>
                <option value="citations">Citation Count</option>
              </select>
            </div>
          </div>
        )}

        {showFilters && (
          <div className="flex justify-end gap-3 pt-3">
            <button
              type="button"
              onClick={handleReset}
              className="text-xs text-brand-textMuted hover:text-brand-text px-4 py-2 border border-brand-border hover:bg-brand-border/60 rounded-xl transition-colors cursor-pointer"
            >
              Reset Filters
            </button>
          </div>
        )}
      </form>

      {/* Search results banner */}
      <div className="flex items-center justify-between px-1">
        <h2 className="text-sm font-bold text-brand-text uppercase tracking-wider flex items-center space-x-2">
          <ListFilter size={16} className="text-brand-accent" />
          <span>Results index ({totalItems} records found)</span>
        </h2>
      </div>

      {/* Results grid */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-24">
          <Loader2 size={44} className="text-brand-primary animate-spin mb-4" />
          <p className="text-sm text-brand-textMuted font-medium">Scanning index database...</p>
        </div>
      ) : error ? (
        <div className="glass-card rounded-2xl p-10 text-center border border-red-500/20">
          <p className="text-sm font-semibold text-red-300">{error}</p>
        </div>
      ) : papers.length === 0 ? (
        <div className="glass-card rounded-2xl p-10 text-center border border-brand-border space-y-4">
          <Database size={40} className="text-brand-textMuted mx-auto" />
          <p className="text-sm font-semibold text-brand-text">No papers match your search.</p>
          <p className="text-xs text-brand-textMuted/70">
            The database may not yet have papers indexed for this topic.
            Click below to seed the database with papers from arXiv, OpenAlex, Semantic Scholar, Crossref, and PubMed.
          </p>
          {seedMessage && (
            <p className="text-xs text-emerald-400 font-medium bg-emerald-400/10 border border-emerald-400/20 rounded-xl px-4 py-2">{seedMessage}</p>
          )}
          <button
            onClick={handleSeedDatabase}
            disabled={seeding}
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-brand-primary hover:bg-brand-primary/80 text-white text-sm font-bold rounded-xl transition-all shadow-lg shadow-brand-primary/20 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {seeding ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
            {seeding ? 'Seeding in progress...' : 'Seed Database with Research Papers'}
          </button>
          <p className="text-[10px] text-brand-textMuted/50">This fetches papers from 5 real academic sources across 15 major topics.</p>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {papers.map((paper) => (
              <PaperCard
                key={paper._id}
                paper={paper}
                isSaved={savedIds.has(paper._id)}
                onBookmarkToggle={handleBookmarkToggle}
              />
            ))}
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-4 pt-6">
              <button
                onClick={() => handlePageChange(page - 1)}
                disabled={page === 1}
                className="p-2.5 bg-brand-card border border-brand-border text-brand-textMuted hover:text-brand-text hover:border-brand-primary rounded-xl cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                <ArrowLeft size={16} />
              </button>

              <span className="text-xs font-semibold text-brand-textMuted">
                Page <span className="text-brand-text font-bold">{page}</span> of{' '}
                <span className="text-brand-text font-bold">{totalPages}</span>
              </span>

              <button
                onClick={() => handlePageChange(page + 1)}
                disabled={page === totalPages}
                className="p-2.5 bg-brand-card border border-brand-border text-brand-textMuted hover:text-brand-text hover:border-brand-primary rounded-xl cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                <ArrowRight size={16} />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Search;
