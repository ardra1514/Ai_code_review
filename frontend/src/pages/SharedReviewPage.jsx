import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import reviewService from '../services/reviewService';
import { Code2 } from 'lucide-react';

const severityConfig = {
  critical: { color: 'border-red-500/30 bg-red-500/10', text: 'text-red-400' },
  warning: { color: 'border-amber-500/30 bg-amber-500/10', text: 'text-amber-400' },
  suggestion: { color: 'border-blue-500/30 bg-blue-500/10', text: 'text-blue-400' },
};

const SharedReviewPage = () => {
  const { token } = useParams();
  const [review, setReview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchReview = async () => {
      try {
        const res = await reviewService.getSharedReview(token);
        setReview(res.data.data);
      } catch {
        setError('Review not found or link has expired.');
      } finally {
        setLoading(false);
      }
    };
    fetchReview();
  }, [token]);

  if (loading) return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-violet-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (error) return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <div className="text-center">
        <p className="text-white font-medium">{error}</p>
      </div>
    </div>
  );

  const scoreColor = review.score >= 80 ? '#22c55e' : review.score >= 50 ? '#f59e0b' : '#ef4444';

  return (
    <div className="min-h-screen bg-gray-950 p-6">
      <div className="max-w-2xl mx-auto">

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-violet-600 rounded-xl flex items-center justify-center">
            <Code2 className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-white font-bold text-lg">Shared Code Review</h1>
            <p className="text-gray-400 text-sm capitalize">{review.language} · {new Date(review.created_at).toLocaleDateString()}</p>
          </div>
        </div>

        {/* Score */}
        <div className="bg-gray-900 rounded-xl p-6 border border-gray-800 mb-4 text-center">
          <p className="text-6xl font-bold" style={{ color: scoreColor }}>{review.score}</p>
          <p className="text-gray-400 text-sm mt-1">Code Quality Score</p>
        </div>

        {/* Summary */}
        <div className="bg-gray-900 rounded-xl p-5 border border-gray-800 mb-4">
          <h2 className="text-gray-400 text-sm font-medium mb-2">Summary</h2>
          <p className="text-white text-sm leading-relaxed">{review.summary}</p>
        </div>

        {/* Issues */}
        <div className="space-y-3">
          <h2 className="text-white font-medium">Issues Found ({review.issues?.length || 0})</h2>
          {review.issues?.map((issue, i) => (
            <div key={i} className={`rounded-xl p-4 border ${severityConfig[issue.severity]?.color}`}>
              <div className="flex items-center justify-between mb-2">
                <span className={`text-xs font-medium uppercase ${severityConfig[issue.severity]?.text}`}>
                  {issue.severity}
                </span>
                {issue.line > 0 && <span className="text-xs text-gray-500">Line {issue.line}</span>}
              </div>
              <p className="text-white text-sm mb-2">{issue.message}</p>
              <div className="bg-black/30 rounded-lg p-3">
                <p className="text-xs text-gray-400 mb-1">Fix:</p>
                <p className="text-xs text-gray-200 font-mono">{issue.fix}</p>
              </div>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
};

export default SharedReviewPage;