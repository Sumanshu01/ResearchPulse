import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { institutionAPI } from '../services/api.js';
import { Building, MapPin, Loader2, Award, Quote, BookOpen } from 'lucide-react';

export const InstitutionProfile = () => {
  const { id } = useParams();
  
  const [inst, setInst] = useState(null);
  const [topAuthors, setTopAuthors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await institutionAPI.getInstitutionById(id);
      setInst(res.institution);
      setTopAuthors(res.topAuthors || []);
    } catch (err) {
      setError(err.message || 'Failed to load institution details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, [id]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32">
        <Loader2 size={44} className="text-brand-primary animate-spin mb-4" />
        <p className="text-sm text-brand-textMuted font-medium">Extracting institution profile directories...</p>
      </div>
    );
  }

  if (error || !inst) {
    return (
      <div className="glass-card rounded-2xl p-10 text-center border border-red-500/20 max-w-lg mx-auto mt-10">
        <p className="text-sm text-red-300 font-semibold mb-4">{error || 'Institution profile not found.'}</p>
        <Link to="/" className="px-4 py-2 bg-brand-primary text-xs text-white rounded-xl hover:bg-brand-primary/80 transition-colors">
          Return to Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back button */}
      <div>
        <Link to={-1} className="text-xs text-brand-textMuted hover:text-brand-primary flex items-center space-x-1 w-fit">
          <span>&larr; Go Back</span>
        </Link>
      </div>

      {/* Institution header */}
      <div className="glass-card rounded-3xl p-6 md:p-8 border border-brand-border flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center space-x-5">
          <div className="w-16 h-16 rounded-2xl bg-brand-primary/10 border border-brand-primary/20 flex items-center justify-center text-brand-primary brand-glow">
            <Building size={36} />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-brand-text tracking-tight">
              {inst.name}
            </h1>
            <div className="flex items-center text-xs text-brand-textMuted mt-2 space-x-1">
              <MapPin size={14} className="text-brand-accent" />
              <span className="font-medium">{inst.location || 'Global Headquarters'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Statistics widgets */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div className="glass-card rounded-2xl p-5 border border-brand-border flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs text-brand-textMuted font-medium block">Total Affiliated Citations</span>
            <span className="text-2xl font-extrabold text-brand-text block tracking-tight">
              {inst.citations}
            </span>
            <span className="text-[10px] text-brand-textMuted/60 block">Aggregated author impact</span>
          </div>
          <div className="p-3 rounded-xl border bg-brand-accent/10 border-brand-accent/20 text-brand-accent">
            <Quote size={20} className="rotate-180" />
          </div>
        </div>

        <div className="glass-card rounded-2xl p-5 border border-brand-border flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs text-brand-textMuted font-medium block">Publications Harvested</span>
            <span className="text-2xl font-extrabold text-brand-text block tracking-tight">
              {inst.publicationCount}
            </span>
            <span className="text-[10px] text-brand-textMuted/60 block">Published research count</span>
          </div>
          <div className="p-3 rounded-xl border bg-brand-primary/10 border-brand-primary/20 text-brand-primary">
            <BookOpen size={20} />
          </div>
        </div>
      </div>

      {/* Affiliated researchers listing */}
      <div className="space-y-4">
        <h2 className="text-sm font-bold text-brand-text uppercase tracking-wider pl-1">
          Top Affiliated Researchers ({topAuthors.length})
        </h2>

        {topAuthors.length === 0 ? (
          <p className="text-xs text-brand-textMuted italic pl-1">No registered authors affiliated yet.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
            {topAuthors.map((author) => (
              <div key={author._id} className="glass-card rounded-2xl p-5 border border-brand-border flex flex-col justify-between">
                <div>
                  <h3 className="font-bold text-brand-text text-sm truncate">{author.name}</h3>
                  <p className="text-[10px] text-brand-textMuted mt-1">
                    Citations: <span className="text-brand-text font-semibold">{author.citations}</span> • Publications: <span className="text-brand-text font-semibold">{author.publicationsCount}</span>
                  </p>
                </div>
                <div className="flex justify-end mt-4 pt-3 border-t border-brand-border/40">
                  <Link
                    to={`/authors/${author._id}`}
                    className="text-[11px] font-bold text-brand-accent hover:underline flex items-center space-x-1"
                  >
                    <span>View profile</span>
                    <Award size={10} className="text-brand-success" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default InstitutionProfile;
