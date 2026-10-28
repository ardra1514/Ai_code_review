import { API } from './authService';

const reviewService = {
  reviewCode: (code, language) => API.post('/review/', { code, language }),
  reviewGitBranch: (GitBranch_url) => API.post('/review/GitBranch', { GitBranch_url }),
  getHistory: () => API.get('/review/history'),
  getReviewById: (id) => API.get(`/review/${id}`),
  getStats: () => API.get('/review/stats'),
  generateShareLink: (id) => API.post(`/review/${id}/share`),
  getSharedReview: (token) => API.get(`/review/shared/${token}`),
  exportPdf: (id) => API.get(`/review/${id}/pdf`, { responseType: 'blob' }),
};

export default reviewService;