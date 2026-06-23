import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { authorAPI, userAPI } from '../services/api.js';
import { User, Award, Quote, BookOpen, Hash, Loader2, UserCheck, UserPlus, Users } from 'lucide-react';

export const AuthorProfile = () => {
  const { id } = useParams();
  const { isAuthenticated } = useSelector((state) => state.auth);

  const [author, setAuthor] = useState(null);
  const [publications, setPublications] = useState([]);
  const [collabs, setCollabs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);

  const fetchAuthorProfile = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await authorAPI.getAuthorById(id);
      setAuthor(res.author);
      setPublications(res.publications || []);
      setCollabs(res.collaborationHistory || []);

      // Check if user is following this author
      if (isAuthenticated) {
        const profile = await userAPI.getProfile();
        const followedIds = (profile.user?.followedAuthors || []).map((a) => a._id);
        setIsFollowing(followedIds.includes(res.author?._id));
      }
    } catch (err) {
      setError(err.message || 'Failed to load researcher profile');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAuthorProfile();
  }, [id, isAuthenticated]);

  const handleFollowToggle = async () => {
    if (!isAuthenticated) {
      alert('Please log in to follow researchers.');
      return;
    }

    try {
      setFollowLoading(true);
      const res = await userAPI.followAuthor(author._id);
      setIsFollowing(res.isFollowing);
    } catch (err) {
      alert(err.message || 'Follow action failed');
    } finally {
      setFollowLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32">
        <Loader2 size={44} className="text-brand-primary animate-spin mb-4" />
        <p className="text-sm text-brand-textMuted font-medium">Extracting researcher citation indexes...</p>
      </div>
    );
  }

  if (error || !author) {
    return (
      <div className="glass-card rounded-2xl p-10 text-center border border-red-500/20 max-w-lg mx-auto mt-10">
        <p className="text-sm text-red-300 font-semibold mb-4">{error || 'Author not found.'}</p>
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

      {/* Author Details Card */}
      <div className="glass-card rounded-3xl p-6 md:p-8 border border-brand-border flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center space-x-5">
          <div className="w-16 h-16 rounded-2xl bg-brand-success/10 border border-brand-success/20 flex items-center justify-center text-brand-success brand-glow">
            <User size={36} />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-brand-text tracking-tight flex items-center gap-2">
              <span>{author.name}</span>
            </h1>
            <p className="text-xs text-brand-textMuted mt-1">
              ORCID:{' '}
              <span className="text-brand-accent font-mono font-semibold">
                {author.orcid || 'Not available'}
              </span>
            </p>
            {author.institutions?.length > 0 && (
              <p className="text-xs text-brand-textMuted mt-1">
                Affiliation: <span className="text-brand-text font-semibold">{author.institutions[0].name}</span>
              </p>
            )}
          </div>
        </div>

        {/* Follow Button */}
        <div>
          <button
            onClick={handleFollowToggle}
            disabled={followLoading}
            className={`px-5 py-2.5 rounded-xl text-xs font-bold flex items-center space-x-1.5 cursor-pointer transition-all ${
              isFollowing
                ? 'bg-brand-success/10 border border-brand-success text-brand-success hover:bg-brand-success/20'
                : 'bg-brand-primary hover:bg-brand-primary/80 text-white shadow-md shadow-brand-primary/20'
            }`}
          >
            {isFollowing ? <UserCheck size={14} /> : <UserPlus size={14} />}
            <span>{isFollowing ? 'Following' : 'Follow Author'}</span>
          </button>
        </div>
      </div>

      {/* Grid of stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div className="glass-card rounded-2xl p-5 border border-brand-border flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs text-brand-textMuted font-medium block">Total Citations</span>
            <span className="text-2xl font-extrabold text-brand-text block tracking-tight">
              {author.citations}
            </span>
            <span className="text-[10px] text-brand-textMuted/60 block">H-index weight equivalent</span>
          </div>
          <div className="p-3 rounded-xl border bg-brand-accent/10 border-brand-accent/20 text-brand-accent">
            <Quote size={20} className="rotate-180" />
          </div>
        </div>

        <div className="glass-card rounded-2xl p-5 border border-brand-border flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs text-brand-textMuted font-medium block">Publications Indexed</span>
            <span className="text-2xl font-extrabold text-brand-text block tracking-tight">
              {publications.length}
            </span>
            <span className="text-[10px] text-brand-textMuted/60 block">Aggregated research articles</span>
          </div>
          <div className="p-3 rounded-xl border bg-brand-primary/10 border-brand-primary/20 text-brand-primary">
            <BookOpen size={20} />
          </div>
        </div>
      </div>

      {/* Main content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Publications List */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-sm font-bold text-brand-text uppercase tracking-wider pl-1">
            Research Publications ({publications.length})
          </h2>

          {publications.length === 0 ? (
            <div className="glass-card rounded-2xl p-10 text-center text-brand-textMuted">
              <p className="text-sm font-semibold">No publications indexed for this author yet.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {publications.map((pub) => (
                <div key={pub._id} className="glass-card rounded-2xl p-5 border border-brand-border flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between text-xs text-brand-textMuted mb-2">
                      <span className="px-2 py-0.5 text-[9px] font-semibold text-brand-accent bg-brand-accent/10 border border-brand-accent/20 rounded-md uppercase">
                        {pub.source}
                      </span>
                      <span>{new Date(pub.publicationDate).getFullYear()}</span>
                    </div>
                    <Link to={`/papers/${pub._id}`} className="block text-sm font-bold text-brand-text hover:text-brand-accent transition-colors leading-snug">
                      {pub.title}
                    </Link>
                    <p className="text-xs text-brand-textMuted mt-2 line-clamp-2">{pub.abstract}</p>
                  </div>
                  <div className="flex items-center justify-between border-t border-brand-border/40 mt-4 pt-3 text-[10px] text-brand-textMuted">
                    <span>Citations: {pub.citationCount}</span>
                    <Link to={`/papers/${pub._id}`} className="font-bold text-brand-accent hover:underline flex items-center space-x-1">
                      <span>Full abstract</span>
                      <span>&rarr;</span>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Collaboration History */}
        <div className="lg:col-span-1 space-y-4">
          <h2 className="text-sm font-bold text-brand-text uppercase tracking-wider pl-1 flex items-center gap-1.5">
            <Users size={16} className="text-brand-success" />
            <span>Collaboration network</span>
          </h2>

          {collabs.length === 0 ? (
            <div className="glass-card rounded-2xl p-8 text-center text-brand-textMuted italic text-xs">
              No frequent co-authors listed.
            </div>
          ) : (
            <div className="glass-card rounded-2xl p-5 border border-brand-border space-y-4">
              {collabs.map((collab, index) => (
                <div key={collab.authorId || index} className="flex items-center justify-between text-xs border-b border-brand-border/30 pb-3 last:border-0 last:pb-0">
                  <div className="space-y-0.5">
                    {collab.authorId ? (
                      <Link to={`/authors/${collab.authorId}`} className="font-bold text-brand-text hover:text-brand-accent hover:underline block">
                        {collab.name}
                      </Link>
                    ) : (
                      <span className="font-bold text-brand-text block">{collab.name}</span>
                    )}
                    <span className="text-[10px] text-brand-textMuted">Collaborator</span>
                  </div>
                  <span className="px-2.5 py-1 bg-brand-bg/60 border border-brand-border rounded-lg text-brand-accent font-bold text-[10px]">
                    {collab.count} {collab.count === 1 ? 'paper' : 'papers'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AuthorProfile;
