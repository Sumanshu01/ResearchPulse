import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { userAPI } from '../services/api.js';
import PaperCard from '../components/PaperCard.jsx';
import { BookMarked, Loader2, Folder, Library, Trash2, ExternalLink } from 'lucide-react';

export const SavedPapers = () => {
  const [saved, setSaved] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('All');

  const fetchSavedList = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await userAPI.getSavedPapers();
      setSaved(res || []);
    } catch (err) {
      setError(err.message || 'Failed to load library bookmarks');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSavedList();
  }, []);

  // Filter bookmarked papers by collection tab
  const collectionsList = ['All', ...new Set(saved.map((item) => item.collectionName || 'Bookmarks'))];
  
  const filteredSaved = activeTab === 'All'
    ? saved
    : saved.filter((item) => item.collectionName === activeTab);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32">
        <Loader2 size={44} className="text-brand-primary animate-spin mb-4" />
        <p className="text-sm text-brand-textMuted font-medium">Extracting library bookmarks...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header banner */}
      <div className="glass-card rounded-2xl p-6 border border-brand-border flex items-center justify-between">
        <div className="flex items-center space-x-3.5">
          <div className="p-2 bg-brand-primary/10 border border-brand-primary/20 rounded-xl text-brand-primary brand-glow">
            <Library size={24} />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-brand-text">My Academic Library</h1>
            <p className="text-xs text-brand-textMuted mt-0.5">Manage your bookmarked papers and customize reading directories.</p>
          </div>
        </div>
      </div>

      {/* Tabs list */}
      {saved.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 border-b border-brand-border/40 pb-2">
          {collectionsList.map((col) => (
            <button
              key={col}
              onClick={() => setActiveTab(col)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-xl border transition-all cursor-pointer ${
                activeTab === col
                  ? 'bg-brand-primary border-brand-primary text-white'
                  : 'bg-brand-card border-brand-border text-brand-textMuted hover:text-brand-text hover:border-brand-primary'
              }`}
            >
              {col}
            </button>
          ))}
        </div>
      )}

      {/* Empty State */}
      {saved.length === 0 ? (
        <div className="glass-card rounded-2xl p-16 text-center text-brand-textMuted max-w-xl mx-auto mt-6">
          <BookMarked size={48} className="mx-auto text-brand-textMuted/40 mb-4" />
          <p className="text-sm font-semibold">Your library is empty.</p>
          <p className="text-xs text-brand-textMuted/60 mt-1 mb-5">
            Save papers from the dashboard or search index to populate your reading desk.
          </p>
          <Link
            to="/search"
            className="px-5 py-2.5 bg-brand-primary hover:bg-brand-primary/80 text-white font-bold text-xs rounded-xl shadow-md shadow-brand-primary/20 transition-all inline-block"
          >
            Explore Search Index
          </Link>
        </div>
      ) : filteredSaved.length === 0 ? (
        <p className="text-xs text-brand-textMuted italic">No bookmarks under this collection.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filteredSaved.map((item) => {
            if (!item.paperId) return null;
            return (
              <PaperCard
                key={item._id}
                paper={item.paperId}
                isSaved={true}
                onBookmarkToggle={fetchSavedList}
              />
            );
          })}
        </div>
      )}
    </div>
  );
};

export default SavedPapers;
