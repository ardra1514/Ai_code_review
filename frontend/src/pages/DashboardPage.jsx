import { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar } from 'recharts';
import reviewService from '../services/reviewService';
import toast from 'react-hot-toast';
import { TrendingUp, Code2, AlertTriangle, CheckCircle } from 'lucide-react';

const COLORS = ['#7C3AED', '#06B6D4', '#10B981', '#F59E0B', '#EF4444'];

const StatCard = ({ label, value, icon: Icon, color }) => (
  <div className="bg-gray-900 rounded-xl p-5 border border-gray-800">
    <div className="flex items-center justify-between mb-3">
      <span className="text-gray-400 text-sm">{label}</span>
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${color}`}>
        <Icon className="w-4 h-4 text-white" />
      </div>
    </div>
    <p className="text-3xl font-bold text-white">{value}</p>
  </div>
);

const DashboardPage = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await reviewService.getStats();
        setStats(res.data.data);
      } catch {
        toast.error('Failed to load stats');
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center h-full bg-gray-950">
      <div className="w-8 h-8 border-4 border-violet-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!stats || stats.totalReviews === 0) return (
    <div className="flex items-center justify-center h-full bg-gray-950">
      <div className="text-center">
        <TrendingUp className="w-12 h-12 text-gray-600 mx-auto mb-4" />
        <p className="text-white font-medium">No reviews yet</p>
        <p className="text-gray-400 text-sm mt-1">Submit your first code review to see stats</p>
      </div>
    </div>
  );

  // Prepare chart data
  const languageData = Object.entries(stats.languagesUsed).map(([name, value]) => ({ name, value }));
  const issueData = [
    { name: 'Critical', value: stats.commonIssues.critical, color: '#EF4444' },
    { name: 'Warning', value: stats.commonIssues.warning, color: '#F59E0B' },
    { name: 'Suggestion', value: stats.commonIssues.suggestion, color: '#3B82F6' },
  ];

  return (
    <div className="bg-gray-950 min-h-full p-6 space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <p className="text-gray-400 text-sm mt-1">Your code review statistics</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total Reviews" value={stats.totalReviews} icon={Code2} color="bg-violet-600" />
        <StatCard label="Average Score" value={`${stats.averageScore}/100`} icon={TrendingUp} color="bg-emerald-600" />
        <StatCard label="Total Issues" value={Object.values(stats.commonIssues).reduce((a, b) => a + b, 0)} icon={AlertTriangle} color="bg-amber-600" />
        <StatCard label="Best Score" value={`${stats.bestReview?.score}/100`} icon={CheckCircle} color="bg-blue-600" />
      </div>

      {/* Score Over Time */}
      <div className="bg-gray-900 rounded-xl p-5 border border-gray-800">
        <h2 className="text-white font-medium mb-4">Score Over Time</h2>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={stats.scoreOverTime}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
            <XAxis dataKey="date" stroke="#6b7280" tick={{ fontSize: 11 }} />
            <YAxis domain={[0, 100]} stroke="#6b7280" tick={{ fontSize: 11 }} />
            <Tooltip
              contentStyle={{ backgroundColor: '#111827', border: '1px solid #374151', borderRadius: '8px' }}
              labelStyle={{ color: '#9ca3af' }}
              itemStyle={{ color: '#7C3AED' }}
            />
            <Line type="monotone" dataKey="score" stroke="#7C3AED" strokeWidth={2} dot={{ fill: '#7C3AED', r: 4 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Bottom charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* Languages */}
        <div className="bg-gray-900 rounded-xl p-5 border border-gray-800">
          <h2 className="text-white font-medium mb-4">Languages Used</h2>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie data={languageData} cx="50%" cy="50%" outerRadius={70}
                dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                labelLine={false}>
                {languageData.map((_, index) => (
                  <Cell key={index} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ backgroundColor: '#111827', border: '1px solid #374151', borderRadius: '8px' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Issues breakdown */}
        <div className="bg-gray-900 rounded-xl p-5 border border-gray-800">
          <h2 className="text-white font-medium mb-4">Issues Breakdown</h2>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={issueData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
              <XAxis dataKey="name" stroke="#6b7280" tick={{ fontSize: 11 }} />
              <YAxis stroke="#6b7280" tick={{ fontSize: 11 }} />
              <Tooltip contentStyle={{ backgroundColor: '#111827', border: '1px solid #374151', borderRadius: '8px' }} />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {issueData.map((entry, index) => (
                  <Cell key={index} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Best and Worst */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-gray-900 rounded-xl p-5 border border-emerald-500/20">
          <h3 className="text-emerald-400 text-sm font-medium mb-2">🏆 Best Review</h3>
          <p className="text-3xl font-bold text-white">{stats.bestReview?.score}<span className="text-gray-400 text-lg">/100</span></p>
          <p className="text-gray-400 text-sm mt-1">{stats.bestReview?.language} · {stats.bestReview?.date}</p>
        </div>
        <div className="bg-gray-900 rounded-xl p-5 border border-red-500/20">
          <h3 className="text-red-400 text-sm font-medium mb-2">📉 Needs Most Work</h3>
          <p className="text-3xl font-bold text-white">{stats.worstReview?.score}<span className="text-gray-400 text-lg">/100</span></p>
          <p className="text-gray-400 text-sm mt-1">{stats.worstReview?.language} · {stats.worstReview?.date}</p>
        </div>
      </div>

    </div>
  );
};

export default DashboardPage;