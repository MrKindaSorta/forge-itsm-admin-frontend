import React, { useState, useEffect } from 'react';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, Users, MousePointerClick, AlertCircle, Clock, Trash2 } from 'lucide-react';
import api from '../lib/api';
import { Button } from '../components/Button';

interface FunnelStage {
  name: string;
  count: number;
  percentage: number;
  dropoff: number;
}

interface SourceAttribution {
  first_page: string;
  first_button: string;
  sessions: number;
  conversions: number;
  conversion_rate: number;
}

interface FunnelData {
  stages: FunnelStage[];
  abandonment: Array<{ current_stage: string; count: number }>;
  sourceAttribution: SourceAttribution[];
  summary: {
    totalClicks: number;
    totalConversions: number;
    conversionRate: number;
  };
}

interface Session {
  session_id: string;
  first_page: string | null;
  first_button: string | null;
  current_stage: string;
  status: string;
  created_at: string;
  email: string | null;
  subdomain: string | null;
}

interface SessionsResponse {
  sessions: Session[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

interface PageVisit {
  page_name: string;
  unique_visitors: number;
  total_pageviews: number;
}

interface PageVisitsData {
  pages: PageVisit[];
  totals: {
    unique_visitors: number;
    total_pageviews: number;
  };
}

export const AnalyticsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'overview' | 'sessions'>('overview');
  const [funnelData, setFunnelData] = useState<FunnelData | null>(null);
  const [pageVisitsData, setPageVisitsData] = useState<PageVisitsData | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 50, total: 0, totalPages: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [dateRange, setDateRange] = useState(30);

  const dateRangeOptions = [
    { value: 1, label: 'Today' },
    { value: 7, label: '7 Days' },
    { value: 30, label: '30 Days' },
    { value: 90, label: '90 Days' },
  ];
  const [error, setError] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  useEffect(() => {
    if (activeTab === 'overview') {
      fetchAnalytics();
      fetchPageVisits();
    } else {
      fetchSessions();
    }
  }, [activeTab, dateRange, pagination.page]);

  const fetchAnalytics = async () => {
    try {
      setIsLoading(true);
      const response = await api.get(`/api/admin/analytics/funnel?days=${dateRange}`);
      setFunnelData(response.data);
      setError('');
    } catch (err) {
      console.error('Failed to fetch analytics:', err);
      setError('Failed to load analytics data');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchPageVisits = async () => {
    try {
      const response = await api.get<PageVisitsData>(`/api/admin/analytics/page-visits?days=${dateRange}`);
      setPageVisitsData(response.data);
    } catch (err) {
      console.error('Failed to fetch page visits:', err);
      // Don't set error state here, let funnel data load anyway
    }
  };

  const fetchSessions = async () => {
    try {
      setIsLoading(true);
      const response = await api.get<SessionsResponse>(
        `/api/admin/analytics/sessions?page=${pagination.page}&limit=${pagination.limit}`
      );
      setSessions(response.data.sessions);
      setPagination(response.data.pagination);
      setError('');
    } catch (err) {
      console.error('Failed to fetch sessions:', err);
      setError('Failed to load sessions data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteSession = async (sessionId: string) => {
    try {
      await api.delete(`/api/admin/analytics/session/${sessionId}`);
      setDeleteConfirm(null);
      fetchSessions(); // Refresh the list
    } catch (err) {
      console.error('Failed to delete session:', err);
      alert('Failed to delete session. Please try again.');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const truncateSessionId = (sessionId: string) => {
    if (sessionId.length <= 20) return sessionId;
    return `${sessionId.substring(0, 10)}...${sessionId.substring(sessionId.length - 7)}`;
  };

  if (isLoading && !funnelData && sessions.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-secondary">Loading analytics...</div>
      </div>
    );
  }

  if (error && !funnelData && sessions.length === 0) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
        <div className="flex items-center">
          <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 mr-2" />
          <p className="text-red-800 dark:text-red-300">{error}</p>
        </div>
      </div>
    );
  }

  // Colors for charts
  const COLORS = ['#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444'];

  // Prepare abandonment data for pie chart
  const abandonmentData = funnelData?.abandonment.map((item) => ({
    name: item.current_stage.replace(/_/g, ' ').toUpperCase(),
    value: item.count,
  })) || [];

  return (
    <div className="space-y-4">
      {/* Header with Tabs */}
      <div>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
          <div>
            <h1 className="text-xl font-bold text-primary">Signup Funnel Analytics</h1>
            <p className="text-secondary mt-1 text-sm">Track conversion metrics and user behavior</p>
          </div>

          {/* Date Range Selector - Only show on Overview tab */}
          {activeTab === 'overview' && (
            <>
              {/* Desktop: Buttons */}
              <div className="hidden sm:flex gap-2">
                {dateRangeOptions.map((option) => (
                  <Button
                    key={option.value}
                    onClick={() => setDateRange(option.value)}
                    variant={dateRange === option.value ? 'primary' : 'secondary'}
                    size="sm"
                  >
                    {option.label}
                  </Button>
                ))}
              </div>

              {/* Mobile: Dropdown */}
              <select
                value={dateRange}
                onChange={(e) => setDateRange(Number(e.target.value))}
                className="sm:hidden px-3 py-2 text-sm border border-default rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none bg-card text-primary"
              >
                {dateRangeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </>
          )}
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-default">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('overview')}
              className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'overview'
                  ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                  : 'border-transparent text-secondary hover:text-primary hover:border-gray-300 dark:hover:border-gray-600'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab('sessions')}
              className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'sessions'
                  ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                  : 'border-transparent text-secondary hover:text-primary hover:border-gray-300 dark:hover:border-gray-600'
              }`}
            >
              Sessions
            </button>
          </nav>
        </div>
      </div>

      {/* Overview Tab Content */}
      {activeTab === 'overview' && funnelData && (
        <>
          {/* Summary Metrics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-card rounded-lg border border-default p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex-1">
                  <p className="text-sm font-medium text-secondary">Total Clicks</p>
                  <p className="text-2xl font-bold text-primary mt-1">
                    {funnelData.summary.totalClicks.toLocaleString()}
                  </p>
                </div>
                <div className="h-12 w-12 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
                  <MousePointerClick className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                </div>
              </div>
              <p className="text-xs text-secondary">Users who clicked "Get Started" buttons</p>
            </div>

            <div className="bg-card rounded-lg border border-default p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex-1">
                  <p className="text-sm font-medium text-secondary">Conversions</p>
                  <p className="text-2xl font-bold text-primary mt-1">
                    {funnelData.summary.totalConversions.toLocaleString()}
                  </p>
                </div>
                <div className="h-12 w-12 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Users className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
              </div>
              <p className="text-xs text-secondary">Users who completed signup successfully</p>
            </div>

            <div className="bg-card rounded-lg border border-default p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex-1">
                  <p className="text-sm font-medium text-secondary">Conversion Rate</p>
                  <p className="text-2xl font-bold text-primary mt-1">
                    {funnelData.summary.conversionRate}%
                  </p>
                </div>
                <div className="h-12 w-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
                  <TrendingUp className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
              <p className="text-xs text-secondary">Percentage of clicks that became customers</p>
            </div>
          </div>

          {/* Funnel Visualization */}
          <div className="bg-card rounded-lg border border-default p-4">
            <h2 className="text-base font-semibold text-primary mb-3">Conversion Funnel</h2>
            <p className="text-xs text-secondary mb-4">Visual breakdown of user drop-off at each signup stage</p>
            <ResponsiveContainer width="100%" height={350}>
              <BarChart
                data={funnelData.stages}
                layout="vertical"
                margin={{ top: 20, right: 30, left: 120, bottom: 20 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-gray-200 dark:text-gray-700" />
                <XAxis type="number" stroke="currentColor" className="text-gray-600 dark:text-gray-400" />
                <YAxis dataKey="name" type="category" width={100} stroke="currentColor" className="text-gray-600 dark:text-gray-400" />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload as FunnelStage;
                      return (
                        <div className="bg-card border border-default rounded-lg p-3 shadow-lg">
                          <p className="font-semibold text-primary">{data.name}</p>
                          <p className="text-sm text-secondary">Count: {data.count.toLocaleString()}</p>
                          <p className="text-sm text-secondary">Rate: {data.percentage}%</p>
                          {data.dropoff > 0 && (
                            <p className="text-sm text-red-600 dark:text-red-400">Dropoff: {data.dropoff.toLocaleString()}</p>
                          )}
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Legend wrapperStyle={{ color: 'currentColor' }} className="text-secondary" />
                <Bar dataKey="count" fill="#8b5cf6" name="Users" />
              </BarChart>
            </ResponsiveContainer>

            {/* Funnel Stats Table */}
            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">
                      Stage
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">
                      Users
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">
                      Conversion Rate
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">
                      Dropoff
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-card divide-y divide-gray-200 dark:divide-gray-700">
                  {funnelData.stages.map((stage, index) => (
                    <tr key={index}>
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-primary">
                        {stage.name}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-secondary">
                        {stage.count.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-secondary">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                            stage.percentage >= 75
                              ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                              : stage.percentage >= 50
                              ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300'
                              : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300'
                          }`}
                        >
                          {stage.percentage}%
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-secondary">
                        {stage.dropoff > 0 ? (
                          <span className="text-red-600 dark:text-red-400">-{stage.dropoff.toLocaleString()}</span>
                        ) : (
                          '-'
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Abandonment Analysis & Source Attribution */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Abandonment Pie Chart */}
            {abandonmentData.length > 0 && (
              <div className="bg-card rounded-lg border border-default p-4">
                <h2 className="text-base font-semibold text-primary mb-3">Abandonment Breakdown</h2>
                <p className="text-xs text-secondary mb-4">Where users drop off in the signup process</p>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={abandonmentData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${((percent || 0) * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {abandonmentData.map((_entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="mt-4 space-y-2">
                  {abandonmentData.map((item, index) => (
                    <div key={index} className="flex items-center justify-between text-sm">
                      <div className="flex items-center">
                        <div
                          className="w-3 h-3 rounded-full mr-2"
                          style={{ backgroundColor: COLORS[index % COLORS.length] }}
                        />
                        <span className="text-secondary">{item.name}</span>
                      </div>
                      <span className="font-medium text-primary">{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Source Attribution */}
            <div className="bg-card rounded-lg border border-default p-4">
              <h2 className="text-base font-semibold text-primary mb-3">Top Performing Sources</h2>
              <p className="text-xs text-secondary mb-4">Best converting entry points and CTA buttons</p>
              <div className="space-y-3">
                {funnelData.sourceAttribution.slice(0, 5).map((source, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-elevated rounded-lg">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-primary">{source.first_page}</p>
                      <p className="text-xs text-secondary">{source.first_button}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-primary">{source.conversions} conversions</p>
                      <p className="text-xs text-secondary">
                        {source.conversion_rate}% rate ({source.sessions} sessions)
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Insights & Recommendations */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <div className="flex items-start">
              <Clock className="h-6 w-6 text-blue-600 dark:text-blue-400 mr-3 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="text-base font-semibold text-blue-900 dark:text-blue-200 mb-2">Insights</h3>
                <ul className="space-y-2 text-sm text-blue-800 dark:text-blue-300">
                  {funnelData.summary.conversionRate < 10 && (
                    <li>• Overall conversion rate is below 10% - consider A/B testing landing pages</li>
                  )}
                  {funnelData.stages[1] && funnelData.stages[1].percentage < 80 && (
                    <li>• High dropoff at Step 1 - simplify plan selection or add social proof</li>
                  )}
                  {funnelData.stages[2] && funnelData.stages[2].percentage < 70 && (
                    <li>• Significant dropoff at Step 2 - reduce form fields or add trust badges</li>
                  )}
                  {abandonmentData.length > 0 && (
                    <li>• {abandonmentData[0]?.value || 0} users abandoned at {abandonmentData[0]?.name || 'unknown'} stage - review UX friction points</li>
                  )}
                  {funnelData.sourceAttribution.length > 0 && (
                    <li>
                      • Best performing source: {funnelData.sourceAttribution[0]?.first_page} - {funnelData.sourceAttribution[0]?.first_button} with{' '}
                      {funnelData.sourceAttribution[0]?.conversion_rate}% conversion rate
                    </li>
                  )}
                </ul>
              </div>
            </div>
          </div>

          {/* Website Traffic Section */}
          {pageVisitsData && (
            <div className="bg-card rounded-lg border border-default p-4">
              <h2 className="text-base font-semibold text-primary mb-3">Website Traffic</h2>
              <p className="text-xs text-secondary mb-4">Page visit statistics for your marketing website</p>

              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-3">
                  <p className="text-xs font-medium text-purple-600 dark:text-purple-400 uppercase tracking-wider">Unique Visitors</p>
                  <p className="text-xl font-bold text-purple-900 dark:text-purple-200 mt-1">
                    {pageVisitsData.totals.unique_visitors.toLocaleString()}
                  </p>
                  <p className="text-xs text-purple-600 dark:text-purple-400 mt-1">Total distinct visitors</p>
                </div>
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                  <p className="text-xs font-medium text-blue-600 dark:text-blue-400 uppercase tracking-wider">Total Pageviews</p>
                  <p className="text-xl font-bold text-blue-900 dark:text-blue-200 mt-1">
                    {pageVisitsData.totals.total_pageviews.toLocaleString()}
                  </p>
                  <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">All page views combined</p>
                </div>
              </div>

              {/* Page Visit Table */}
              {pageVisitsData.pages.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-800">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">
                          Page Name
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">
                          Unique Visitors
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">
                          Total Pageviews
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">
                          Avg. Views per Visitor
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-card divide-y divide-gray-200 dark:divide-gray-700">
                      {pageVisitsData.pages.map((page, index) => (
                        <tr key={index}>
                          <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-primary">
                            {page.page_name}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-secondary">
                            {page.unique_visitors.toLocaleString()}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-secondary">
                            {page.total_pageviews.toLocaleString()}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-secondary">
                            {(page.total_pageviews / (page.unique_visitors || 1)).toFixed(1)}
                          </td>
                        </tr>
                      ))}
                      {/* Totals Row */}
                      <tr className="bg-gray-50 dark:bg-gray-800 font-semibold">
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-primary">
                          TOTAL
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-primary">
                          {pageVisitsData.totals.unique_visitors.toLocaleString()}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-primary">
                          {pageVisitsData.totals.total_pageviews.toLocaleString()}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-primary">
                          {(pageVisitsData.totals.total_pageviews / (pageVisitsData.totals.unique_visitors || 1)).toFixed(1)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8 text-secondary">
                  No page visits tracked yet. Data will appear here once visitors browse the marketing website.
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Sessions Tab Content */}
      {activeTab === 'sessions' && (
        <>
          <div className="bg-card rounded-lg border border-default">
            <div className="px-4 py-3 border-b border-default">
              <h2 className="text-base font-semibold text-primary">All Signup Sessions</h2>
              <p className="text-sm text-secondary mt-1">
                Showing {sessions.length} of {pagination.total} sessions
              </p>
            </div>

            {/* Sessions Table */}
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">
                      Session ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">
                      First Page
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">
                      First Button
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">
                      Current Stage
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">
                      Created
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-card divide-y divide-gray-200 dark:divide-gray-700">
                  {sessions.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-8 text-center text-secondary">
                        No sessions found. Sessions will appear here when users click "Get Started" buttons.
                      </td>
                    </tr>
                  ) : (
                    sessions.map((session) => (
                      <tr key={session.session_id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-primary">
                          {truncateSessionId(session.session_id)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary">
                          {session.first_page || '-'}
                        </td>
                        <td className="px-6 py-4 text-sm text-secondary">
                          {session.first_button || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300">
                            {session.current_stage.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                              session.status === 'completed'
                                ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                                : session.status === 'active'
                                ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300'
                                : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300'
                            }`}
                          >
                            {session.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary">
                          {formatDate(session.created_at)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary">
                          {deleteConfirm === session.session_id ? (
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleDeleteSession(session.session_id)}
                                className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 font-medium"
                              >
                                Confirm
                              </button>
                              <button
                                onClick={() => setDeleteConfirm(null)}
                                className="text-secondary hover:text-primary"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setDeleteConfirm(session.session_id)}
                              className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300"
                              title="Delete session"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="px-4 py-3 border-t border-default flex items-center justify-between">
                <div className="text-sm text-secondary">
                  Page {pagination.page} of {pagination.totalPages}
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={() => setPagination({ ...pagination, page: pagination.page - 1 })}
                    disabled={pagination.page === 1}
                    variant="secondary"
                    size="sm"
                  >
                    Previous
                  </Button>
                  <Button
                    onClick={() => setPagination({ ...pagination, page: pagination.page + 1 })}
                    disabled={pagination.page === pagination.totalPages}
                    variant="secondary"
                    size="sm"
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};
