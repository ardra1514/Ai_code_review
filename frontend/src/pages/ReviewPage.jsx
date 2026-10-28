import { useState } from 'react';
import Editor from '@monaco-editor/react';
import reviewService from '../services/reviewService';
import toast from 'react-hot-toast';
import { Code2, GitBranch, Loader2 } from 'lucide-react';

const LANGUAGES = ['python', 'javascript', 'typescript', 'java', 'cpp', 'go', 'rust'];

const severityConfig = {
  critical: { color: 'border-red-500/30 bg-red-500/10', text: 'text-red-400', label: 'Critical' },
  warning: { color: 'border-amber-500/30 bg-amber-500/10', text: 'text-amber-400', label: 'Warning' },
  suggestion: { color: 'border-blue-500/30 bg-blue-500/10', text: 'text-blue-400', label: 'Suggestion' },
};

const ScoreRing = ({ score }) => {
  const color = score >= 80 ? '#22c55e' : score >= 50 ? '#f59e0b' : '#ef4444';
  return (
    <div className="flex flex-col items-center py-6">
      <svg width="100" height="100" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="42" fill="none" stroke="#1f2937" strokeWidth="10" />
        <circle cx="50" cy="50" r="42" fill="none" stroke={color} strokeWidth="10"
          strokeDasharray={`${(score / 100) * 264} 264`} strokeLinecap="round"
          transform="rotate(-90 50 50)" />
        <text x="50" y="50" textAnchor="middle" dominantBaseline="central"
          fill={color} fontSize="22" fontWeight="bold">{score}</text>
      </svg>
      <p className="text-gray-400 text-sm mt-2">Code Quality Score</p>
    </div>
  );
};

const ReviewPanel = ({ review }) => {
  const [shareUrl, setShareUrl] = useState('');
  const [sharing, setSharing] = useState(false);
  const [exporting, setExporting] = useState(false);

  const counts = {
    critical: review.issues.filter(i => i.severity === 'critical').length,
    warning: review.issues.filter(i => i.severity === 'warning').length,
    suggestion: review.issues.filter(i => i.severity === 'suggestion').length,
  };

  const handleShare = async () => {
    setSharing(true);
    try {
      const res = await reviewService.generateShareLink(review.id);
      setShareUrl(res.data.share_url);
      navigator.clipboard.writeText(res.data.share_url);
      toast.success('Share link copied to clipboard!');
    } catch {
      toast.error('Failed to generate share link');
    } finally {
      setSharing(false);
    }
  };

  const handleExportPdf = async () => {
    setExporting(true);
    try {
      const res = await reviewService.exportPdf(review.id);
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `review-${review.id}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('PDF downloaded!');
    } catch {
      toast.error('Failed to export PDF');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <ScoreRing score={review.score} />

      {/* Action buttons */}
      <div className="flex gap-3">
        <button onClick={handleShare} disabled={sharing}
          className="flex-1 bg-gray-800 hover:bg-gray-700 text-white text-sm py-2 rounded-lg transition-colors disabled:opacity-50">
          {sharing ? 'Generating...' : '🔗 Share'}
        </button>
        <button onClick={handleExportPdf} disabled={exporting}
          className="flex-1 bg-gray-800 hover:bg-gray-700 text-white text-sm py-2 rounded-lg transition-colors disabled:opacity-50">
          {exporting ? 'Exporting...' : '📄 Export PDF'}
        </button>
      </div>

      {shareUrl && (
        <div className="bg-gray-800 rounded-lg p-3 text-xs text-violet-400 break-all">
          {shareUrl}
        </div>
      )}

      {/* Summary */}
      <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
        <h3 className="text-sm font-medium text-gray-400 mb-2">Summary</h3>
        <p className="text-white text-sm leading-relaxed">{review.summary}</p>
      </div>

      {/* Issue counts */}
      <div className="grid grid-cols-3 gap-3">
        {Object.entries(counts).map(([type, count]) => (
          <div key={type} className={`rounded-xl p-3 border text-center ${severityConfig[type].color}`}>
            <p className={`text-2xl font-bold ${severityConfig[type].text}`}>{count}</p>
            <p className={`text-xs mt-1 ${severityConfig[type].text}`}>{type}</p>
          </div>
        ))}
      </div>

      {/* Static metrics */}
      {review.static_metrics && Object.keys(review.static_metrics).length > 0 && (
        <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
          <h3 className="text-sm font-medium text-gray-400 mb-3">Code Metrics</h3>
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(review.static_metrics).map(([key, value]) => (
              <div key={key} className="bg-gray-800 rounded-lg p-2">
                <p className="text-xs text-gray-400 capitalize">{key.replace(/_/g, ' ')}</p>
                <p className="text-white font-medium text-sm">{value}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Issues */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-gray-400">Issues Found</h3>
        {review.issues.length === 0 && (
          <p className="text-green-400 text-sm">No issues found. Great code!</p>
        )}
        {review.issues.map((issue, i) => (
          <div key={i} className={`rounded-xl p-4 border ${severityConfig[issue.severity]?.color || severityConfig.suggestion.color}`}>
            <div className="flex items-center justify-between mb-2">
              <span className={`text-xs font-medium uppercase ${severityConfig[issue.severity]?.text || severityConfig.suggestion.text}`}>
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
  );
};

const ReviewPage = () => {
  const [code, setCode] = useState('# Paste your code here\n');
  const [language, setLanguage] = useState('python');
  const [GitBranchUrl, setGitBranchUrl] = useState('');
  const [review, setReview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('editor');

  const handleReview = async () => {
    if (!code.trim() || code.trim() === '# Paste your code here') {
      return toast.error('Please enter some code');
    }
    setLoading(true);
    setReview(null);
    try {
      const res = await reviewService.reviewCode(code, language);
      setReview(res.data.data);
      toast.success('Review complete!');
    } catch {
      toast.error('Review failed. Try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGitBranchReview = async () => {
    if (!GitBranchUrl.trim()) return toast.error('Please enter a GitBranch URL');
    setLoading(true);
    setReview(null);
    try {
      const res = await reviewService.reviewGitBranch(GitBranchUrl);
      setReview(res.data.data);
      setCode(res.data.data.code);
      setLanguage(res.data.data.language);
      toast.success(`Reviewed ${res.data.filename}!`);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'GitBranch review failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen bg-gray-950">
      {/* Left panel */}
      <div className="flex flex-col w-1/2 border-r border-gray-800">

        {/* Tabs */}
        <div className="flex border-b border-gray-800 bg-gray-900">
          <button onClick={() => setActiveTab('editor')}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${activeTab === 'editor' ? 'text-violet-400 border-b-2 border-violet-400' : 'text-gray-400 hover:text-white'}`}>
            <Code2 className="w-4 h-4" /> Code Editor
          </button>
          <button onClick={() => setActiveTab('GitBranch')}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${activeTab === 'GitBranch' ? 'text-violet-400 border-b-2 border-violet-400' : 'text-gray-400 hover:text-white'}`}>
            <GitBranch className="w-4 h-4" /> GitBranch URL
          </button>
        </div>

        {activeTab === 'editor' ? (
          <>
            {/* Toolbar */}
            <div className="flex items-center justify-between px-4 py-3 bg-gray-900 border-b border-gray-800">
              <select value={language} onChange={(e) => setLanguage(e.target.value)}
                className="bg-gray-800 text-white text-sm px-3 py-1.5 rounded-lg border border-gray-700">
                {LANGUAGES.map(l => <option key={l} value={l}>{l}</option>)}
              </select>
              <button onClick={handleReview} disabled={loading}
                className="bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white text-sm font-medium px-5 py-1.5 rounded-lg transition-colors flex items-center gap-2">
                {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Reviewing...</> : 'Review Code'}
              </button>
            </div>
            <Editor height="100%" language={language} value={code}
              onChange={(val) => setCode(val || '')} theme="vs-dark"
              options={{ fontSize: 14, minimap: { enabled: false }, padding: { top: 16 } }} />
          </>
        ) : (
          <div className="flex-1 p-6">
            <p className="text-gray-400 text-sm mb-3">Paste a GitBranch file URL to review it directly</p>
            <input type="text" value={GitBranchUrl} onChange={(e) => setGitBranchUrl(e.target.value)}
              placeholder="https://GitBranch.com/user/repo/blob/main/file.py"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-violet-500 mb-4" />
            <button onClick={handleGitBranchReview} disabled={loading}
              className="w-full bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white font-medium py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2">
              {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Fetching & Reviewing...</> : <><GitBranch className="w-4 h-4" /> Review GitBranch File</>}
            </button>
            <p className="text-gray-500 text-xs mt-4">
              Works with public repos. For private repos, make sure GitBranch_TOKEN is set in your backend .env
            </p>
          </div>
        )}
      </div>

      {/* Right panel */}
      <div className="w-1/2 overflow-y-auto bg-gray-950">
        {loading && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <Loader2 className="w-10 h-10 text-violet-500 animate-spin mx-auto mb-4" />
              <p className="text-gray-400 text-sm">AI is reviewing your code...</p>
            </div>
          </div>
        )}
        {!loading && !review && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-gray-600 px-8">
              <Code2 className="w-12 h-12 mx-auto mb-4 opacity-30" />
              <p className="text-lg font-medium">Paste your code and click Review</p>
              <p className="text-sm mt-1">AI will check for bugs, security issues, and improvements</p>
            </div>
          </div>
        )}
        {!loading && review && <ReviewPanel review={review} />}
      </div>
    </div>
  );
};

export default ReviewPage;