import axios from 'axios';

const api = axios.create({
  baseURL: '',
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
}, (error) => Promise.reject(error));

const getError = (error) =>
  error.response?.data?.message || error.message || 'Server connection failed';

let savedPapersPromise = null;
let savedPapersCache = null;

export const clearSavedPapersCache = () => {
  savedPapersCache = null;
  savedPapersPromise = null;
};

// ── Auth ──────────────────────────────────────────
export const authAPI = {
  login: async (credentials) => { try { clearSavedPapersCache(); return (await api.post('/api/auth/login', credentials)).data; } catch (e) { throw new Error(getError(e)); } },
  register: async (userData) => { try { clearSavedPapersCache(); return (await api.post('/api/auth/register', userData)).data; } catch (e) { throw new Error(getError(e)); } },
  getMe: async () => { try { return (await api.get('/api/auth/me')).data; } catch (e) { throw new Error(getError(e)); } },
  logout: async () => { try { clearSavedPapersCache(); return (await api.post('/api/auth/logout')).data; } catch (e) { throw new Error(getError(e)); } },
};

// ── Papers ────────────────────────────────────────
export const paperAPI = {
  getPapers: async (params = {}) => { try { return (await api.get('/api/papers', { params })).data; } catch (e) { throw new Error(getError(e)); } },
  getPaperById: async (id) => { try { return (await api.get(`/api/papers/${id}`)).data; } catch (e) { throw new Error(getError(e)); } },
  triggerIngestion: async () => { try { return (await api.post('/api/papers/ingest')).data; } catch (e) { throw new Error(getError(e)); } },
  seedDatabase: async () => { try { return (await api.post('/api/papers/seed')).data; } catch (e) { throw new Error(getError(e)); } },
};


// ── Authors ───────────────────────────────────────
export const authorAPI = {
  getAuthors: async (params = {}) => { try { return (await api.get('/api/authors', { params })).data; } catch (e) { throw new Error(getError(e)); } },
  getAuthorById: async (id) => { try { return (await api.get(`/api/authors/${id}`)).data; } catch (e) { throw new Error(getError(e)); } },
};

// ── Institutions ──────────────────────────────────
export const institutionAPI = {
  getInstitutions: async (params = {}) => { try { return (await api.get('/api/institutions', { params })).data; } catch (e) { throw new Error(getError(e)); } },
  getInstitutionById: async (id) => { try { return (await api.get(`/api/institutions/${id}`)).data; } catch (e) { throw new Error(getError(e)); } },
};

// ── Search ────────────────────────────────────────
export const searchAPI = {
  search: async (params = {}) => { try { return (await api.get('/api/search', { params })).data; } catch (e) { throw new Error(getError(e)); } },
};

// ── User ──────────────────────────────────────────
export const userAPI = {
  getSavedPapers: async (bypassCache = false) => {
    try {
      if (!bypassCache && savedPapersCache) {
        return savedPapersCache;
      }
      if (!bypassCache && savedPapersPromise) {
        return savedPapersPromise;
      }
      savedPapersPromise = api.get('/api/users/saved').then(res => {
        savedPapersCache = res.data;
        savedPapersPromise = null;
        return savedPapersCache;
      }).catch(err => {
        savedPapersPromise = null;
        throw err;
      });
      return await savedPapersPromise;
    } catch (e) {
      throw new Error(getError(e));
    }
  },
  savePaper: async (paperId, collectionName) => {
    try {
      clearSavedPapersCache();
      return (await api.post('/api/users/saved', { paperId, collectionName })).data;
    } catch (e) {
      throw new Error(getError(e));
    }
  },
  deleteSavedPaper: async (paperId, collectionName) => {
    try {
      clearSavedPapersCache();
      return (await api.delete(`/api/users/saved/${paperId}`, { params: collectionName ? { collectionName } : {} })).data;
    } catch (e) {
      throw new Error(getError(e));
    }
  },
  followTopic: async (topicName) => { try { return (await api.post('/api/users/follow-topic', { topicName })).data; } catch (e) { throw new Error(getError(e)); } },
  followAuthor: async (authorId) => { try { return (await api.post('/api/users/follow-author', { authorId })).data; } catch (e) { throw new Error(getError(e)); } },
  getProfile: async () => { try { return (await api.get('/api/users/profile')).data; } catch (e) { throw new Error(getError(e)); } },
};

// ── AI ────────────────────────────────────────────
export const aiAPI = {
  getSummary: async (paperId) => { try { return (await api.get(`/api/ai/summary/${paperId}`)).data; } catch (e) { throw new Error(getError(e)); } },
  regenerateSummary: async (paperId) => { try { return (await api.post(`/api/ai/summary/${paperId}/generate`)).data; } catch (e) { throw new Error(getError(e)); } },
  getSimilarPapers: async (paperId, limit = 6) => { try { return (await api.get(`/api/ai/similar/${paperId}`, { params: { limit } })).data; } catch (e) { throw new Error(getError(e)); } },
  getResearchGaps: async () => { try { return (await api.get('/api/ai/gaps')).data; } catch (e) { throw new Error(getError(e)); } },
  getRecommendations: async (params = {}) => { try { return (await api.get('/api/ai/recommendations', { params })).data; } catch (e) { throw new Error(getError(e)); } },
  refreshRecommendations: async () => { try { return (await api.post('/api/ai/recommendations/refresh')).data; } catch (e) { throw new Error(getError(e)); } },
  getPredictions: async (topic, horizon = 6) => { try { return (await api.get('/api/ai/predictions', { params: { topic, horizon } })).data; } catch (e) { throw new Error(getError(e)); } },
};

// ── Analytics ─────────────────────────────────────
export const analyticsAPI = {
  getTrends: async (period = 'weekly', limit = 15) => { try { return (await api.get('/api/analytics/trends', { params: { period, limit } })).data; } catch (e) { throw new Error(getError(e)); } },
  getCitations: async () => { try { return (await api.get('/api/analytics/citations')).data; } catch (e) { throw new Error(getError(e)); } },
  getTopicClusters: async () => { try { return (await api.get('/api/analytics/topics')).data; } catch (e) { throw new Error(getError(e)); } },
  getAuthorRankings: async (limit = 20) => { try { return (await api.get('/api/analytics/authors/rankings', { params: { limit } })).data; } catch (e) { throw new Error(getError(e)); } },
  getInstitutionRankings: async (limit = 20) => { try { return (await api.get('/api/analytics/institutions/rankings', { params: { limit } })).data; } catch (e) { throw new Error(getError(e)); } },
  getDashboard: async () => { try { return (await api.get('/api/analytics/dashboard')).data; } catch (e) { throw new Error(getError(e)); } },
  getEmerging: async () => { try { return (await api.get('/api/analytics/emerging')).data; } catch (e) { throw new Error(getError(e)); } },
  getTimeSeries: async (topic, months = 6) => { try { return (await api.get('/api/analytics/timeseries', { params: { topic, months } })).data; } catch (e) { throw new Error(getError(e)); } },
  computeTrends: async (period) => { try { return (await api.post('/api/analytics/trends/compute', { period })).data; } catch (e) { throw new Error(getError(e)); } },
};

// ── Alerts ────────────────────────────────────────
export const alertAPI = {
  getAlerts: async (params = {}) => { try { return (await api.get('/api/alerts', { params })).data; } catch (e) { throw new Error(getError(e)); } },
  markRead: async (id) => { try { return (await api.put(`/api/alerts/${id}/read`)).data; } catch (e) { throw new Error(getError(e)); } },
  markAllRead: async () => { try { return (await api.put('/api/alerts/read-all')).data; } catch (e) { throw new Error(getError(e)); } },
  subscribe: async (type, refName) => { try { return (await api.post('/api/alerts/subscribe', { type, refName })).data; } catch (e) { throw new Error(getError(e)); } },
  unsubscribe: async (refName) => { try { return (await api.delete(`/api/alerts/subscribe/${encodeURIComponent(refName)}`)).data; } catch (e) { throw new Error(getError(e)); } },
};

// ── Admin ─────────────────────────────────────────
export const adminAPI = {
  getStats: async () => { try { return (await api.get('/api/admin/stats')).data; } catch (e) { throw new Error(getError(e)); } },
  getDashboard: async () => { try { return (await api.get('/api/admin/dashboard')).data; } catch (e) { throw new Error(getError(e)); } },
  refreshAnalytics: async () => { try { return (await api.post('/api/admin/analytics/refresh')).data; } catch (e) { throw new Error(getError(e)); } },
  queueSummaries: async (limit = 10) => { try { return (await api.post('/api/admin/ai/queue-summaries', { limit })).data; } catch (e) { throw new Error(getError(e)); } },
  clearCache: async () => { try { return (await api.delete('/api/admin/cache/clear')).data; } catch (e) { throw new Error(getError(e)); } },
};

export default api;
