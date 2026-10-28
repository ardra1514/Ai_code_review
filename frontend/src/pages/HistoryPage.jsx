import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import reviewService from '../services/reviewService';
import toast from 'react-hot-toast';
import { History, Code2, Download, Share2, ChevronRight } from 'lucide-react';

const ScoreBadge = ({ score }) => {
  const color = score >= 80
    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
    : score >= 50
    ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
    : 'bg-red-500/10 text-red-400 border-red-500/30';

  return (
    <span className={`text-sm font-bold px-3 py-1 rounded-lg border ${color}`}>
      {score}/100
    </span>
  );
};

const HistoryPage = () => {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [exportingId, setExportingId] = useState(null);
  const [sharingId, setSharingId] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const res = await reviewService.getHistory();
        setReviews(res.data.data);
      } catch {
        toast.error('Failed to load history');
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, []);

  const handleExportPdf = async (e, id) => {
    e.stopPropagation();
    setExportingId(id);
    try {
      const res = await reviewService.exportPdf(id);
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `review-${id}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('PDF downloaded!');
    } catch {
      toast.error('Failed to export PDF');
    } finally {
      setExportingId(null);
    }
  };

  const handleShare = async (e, id) => {
    e.stopPropagation();
    setSharingId(id);
    try {
      const res = await reviewService.generateShareLink(id);
      navigator.clipboard.writeText(res.data.share_url);
      toast.success('Share link copied to clipboard!');
    } catch {
      toast.error('Failed to generate share link');
    } finally {
      setSharingId(null);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-full bg-gray-950">
      <div className="w-8 h-8 border-4 border-violet-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="bg-gray-950 min-h-full p-6">

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Review History</h1>
        <p className="text-gray-400 text-sm mt-1">All your past code reviews</p>
      </div>

      {/* Empty state */}
      {reviews.length === 0 && (
        <div className="flex flex-col items-center justify-center h-64">
          <History className="w-12 h-12 text-gray-600 mb-4" />
          <p className="text-white font-medium">No reviews yet</p>
          <p className="text-gray-400 text-sm mt-1">Submit your first code review to see it here</p>
          <button
            onClick={() => navigate('/review')}
            className="mt-4 bg-violet-600 hover:bg-violet-700 text-white text-sm px-5 py-2 rounded-lg transition-colors"
          >
            Start Reviewing
          </button>
        </div>
      )}

      {/* Reviews list */}
      <div className="space-y-3">
        {reviews.map((review) => (
          <div
            key={review.id}
            onClick={() => navigate(`/review?id=${review.id}`)}
            className="bg-gray-900 border border-gray-800 rounded-xl p-5 hover:border-violet-500/30 transition-colors cursor-pointer group"
          >
            <div className="flex items-center justify-between">

              {/* Left */}
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-gray-800 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Code2 className="w-5 h-5 text-violet-400" />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-white font-medium capitalize">{review.language}</span>
                    <ScoreBadge score={review.score} />
                  </div>
                  <p className="text-gray-400 text-sm line-clamp-1">{review.summary}</p>
                  <p className="text-gray-600 text-xs mt-1">
                    {new Date(review.created_at).toLocaleDateString('en-US', {
                      year: 'numeric', month: 'short', day: 'numeric',
                      hour: '2-digit', minute: '2-digit'
                    })}
                  </p>
                </div>
              </div>

              {/* Right */}
              <div className="flex items-center gap-2">

                {/* Issue counts */}
                <div className="hidden md:flex items-center gap-2 mr-4">
                  {review.issues?.filter(i => i.severity === 'critical').length > 0 && (
                    <span className="text-xs bg-red-500/10 text-red-400 border border-red-500/30 px-2 py-0.5 rounded-md">
                      {review.issues.filter(i => i.severity === 'critical').length} critical
                    </span>
                  )}
                  {review.issues?.filter(i => i.severity === 'warning').length > 0 && (
                    <span className="text-xs bg-amber-500/10 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded-md">
                      {review.issues.filter(i => i.severity === 'warning').length} warnings
                    </span>
                  )}
                </div>

                {/* Action buttons */}
                <button
                  onClick={(e) => handleShare(e, review.id)}
                  disabled={sharingId === review.id}
                  className="w-8 h-8 bg-gray-800 hover:bg-gray-700 rounded-lg flex items-center justify-center transition-colors disabled:opacity-50"
                  title="Share"
                >
                  <Share2 className="w-4 h-4 text-gray-400" />
                </button>
                <button
                  onClick={(e) => handleExportPdf(e, review.id)}
                  disabled={exportingId === review.id}
                  className="w-8 h-8 bg-gray-800 hover:bg-gray-700 rounded-lg flex items-center justify-center transition-colors disabled:opacity-50"
                  title="Export PDF"
                >
                  <Download className="w-4 h-4 text-gray-400" />
                </button>
                <ChevronRight className="w-4 h-4 text-gray-600 group-hover:text-violet-400 transition-colors" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default HistoryPage;