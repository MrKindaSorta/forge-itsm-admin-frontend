import React, { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis } from 'recharts';
import { TrendingUp, Users, MousePointerClick, AlertCircle, Clock, Trash2, Eye } from 'lucide-react';
import api from '../lib/api';
import { Button } from '../components/Button';
import { ExpandableSection } from '../components/ExpandableSection';
import { FunnelWidget } from '../components/FunnelWidget';
import { formatDate } from '../lib/utils';

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

interface TimingData {
  averageTimes: {
    toStep1: number;
    inStep1: number;
    inStep2: number;
    inStep3: number;
    toStripe: number;
    provisioning: number;
  };
  conversionTimeDistribution: Array<{ time_bucket: string; count: number }>;
  medianConversionMinutes: number | null;
}

interface AbandonedUser {
  session_id: string;
  email: string;
  company_name: string;
  subdomain: string;
  selected_plan: string;
  current_stage: string;
  first_page: string;
  first_button: string;
  button_clicked_at: string;
  step3_completed_at: string;
  updated_at: string;
  created_at: string;
  hours_since_update: number;
}

interface AbandonedUsersData {
  users: AbandonedUser[];
  stats: {
    totalAbandoned: number;
    highIntent: number;
    mediumIntent: number;
    withEmail: number;
  };
}

export const AnalyticsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'overview' | 'sessions'>('overview');
  const [funnelData, setFunnelData] = useState<FunnelData | null>(null);
  const [pageVisitsData, setPageVisitsData] = useState<PageVisitsData | null>(null);
  const [timingData, setTimingData] = useState<TimingData | null>(null);
  const [abandonedUsers, setAbandonedUsers] = useState<AbandonedUsersData | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 50, total: 0, totalPages: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [dateRange, setDateRange] = useState(30);
  const [showPageBreakdown, setShowPageBreakdown] = useState(false);

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
      fetchTimingData();
      fetchAbandonedUsers();
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
    }
  };

  const fetchTimingData = async () => {
    try {
      const response = await api.get<TimingData>(`/api/admin/analytics/timing?days=${dateRange}`);
      setTimingData(response.data);
    } catch (err) {
      console.error('Failed to fetch timing data:', err);
    }
  };

  const fetchAbandonedUsers = async () => {
    try {
      const response = await api.get<AbandonedUsersData>('/api/admin/analytics/abandoned-users?minStage=step3_completed');
      setAbandonedUsers(response.data);
    } catch (err) {
      console.error('Failed to fetch abandoned users:', err);
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
      fetchSessions();
    } catch (err) {
      console.error('Failed to delete session:', err);
      alert('Failed to delete session. Please try again.');
    }
  };

  const truncateSessionId = (sessionId: string) => {
    if (sessionId.length <= 20) return sessionId;
    return `${sessionId.substring(0, 10)}...${sessionId.substring(sessionId.length - 7)}`;
  };

  // Format seconds into human-readable time
  const formatDuration = (seconds: number): string => {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) {
      const minutes = Math.floor(seconds / 60);
      const secs = seconds % 60;
      return secs > 0 ? `${minutes}m ${secs}s` : `${minutes}m`;
    }
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
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

  const COLORS = ['#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444'];
  const abandonmentData = funnelData?.abandonment.map((item) => ({
    name: item.current_stage.replace(/_/g, ' ').toUpperCase(),
    value: item.count,
  })) || [];

  // Prepare chart data for traffic widget
  const trafficChartData = pageVisitsData?.pages.slice(0, 5).map(page => ({
    name: page.page_name.length > 10 ? page.page_name.substring(0, 10) + '...' : page.page_name,
    visitors: page.unique_visitors,
  })) || [];

  return (
    <div className="space-y-3">
      {/* Header with Tabs */}
      <div>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-3">
          <div>
            <h1 className="text-lg font-bold text-primary">Analytics Dashboard</h1>
            <p className="text-secondary mt-0.5 text-xs">Track conversion metrics and user behavior</p>
          </div>

          {activeTab === 'overview' && (
            <>
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

        <div className="border-b border-default">
          <nav className="-mb-px flex space-x-6">
            <button
              onClick={() => setActiveTab('overview')}
              className={`whitespace-nowrap py-2.5 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'overview'
                  ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                  : 'border-transparent text-secondary hover:text-primary hover:border-gray-300 dark:hover:border-gray-600'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab('sessions')}
              className={`whitespace-nowrap py-2.5 px-1 border-b-2 font-medium text-sm ${
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
          {/* Compact KPI Summary Row */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="bg-card rounded-lg border border-default p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-secondary">Clicks</p>
                  <p className="text-xl font-bold text-primary mt-0.5">
                    {funnelData.summary.totalClicks.toLocaleString()}
                  </p>
                </div>
                <div className="h-10 w-10 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
                  <MousePointerClick className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                </div>
              </div>
            </div>

            <div className="bg-card rounded-lg border border-default p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-secondary">Conversions</p>
                  <p className="text-xl font-bold text-primary mt-0.5">
                    {funnelData.summary.totalConversions.toLocaleString()}
                  </p>
                </div>
                <div className="h-10 w-10 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                  <Users className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
              </div>
            </div>

            <div className="bg-card rounded-lg border border-default p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-secondary">Conv. Rate</p>
                  <p className="text-xl font-bold text-primary mt-0.5">
                    {funnelData.summary.conversionRate}%
                  </p>
                </div>
                <div className="h-10 w-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                  <TrendingUp className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
            </div>

            {pageVisitsData && (
              <div className="bg-card rounded-lg border border-default p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-secondary">Visitors</p>
                    <p className="text-xl font-bold text-primary mt-0.5">
                      {pageVisitsData.totals.unique_visitors.toLocaleString()}
                    </p>
                  </div>
                  <div className="h-10 w-10 bg-cyan-100 dark:bg-cyan-900/30 rounded-lg flex items-center justify-center">
                    <Eye className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Integrated Funnel Widget */}
          <FunnelWidget stages={funnelData.stages} />

          {/* Time-Based Metrics Section */}
          {timingData && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              {/* Average Time Per Stage */}
              <div className="bg-card rounded-lg border border-default p-3">
                <h3 className="text-sm font-semibold text-primary mb-3">Average Time Per Stage</h3>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-secondary">To Step 1 (Plan Selection)</span>
                    <span className="font-medium text-primary">{formatDuration(timingData.averageTimes.toStep1)}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-secondary">In Step 1 (Selecting Plan)</span>
                    <span className="font-medium text-primary">{formatDuration(timingData.averageTimes.inStep1)}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-secondary">In Step 2 (Account Details)</span>
                    <span className="font-medium text-primary">{formatDuration(timingData.averageTimes.inStep2)}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-secondary">In Step 3 (Company Info)</span>
                    <span className="font-medium text-primary">{formatDuration(timingData.averageTimes.inStep3)}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-secondary">To Stripe Checkout</span>
                    <span className="font-medium text-primary">{formatDuration(timingData.averageTimes.toStripe)}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs border-t border-default pt-2 mt-2">
                    <span className="text-secondary font-medium">Provisioning Time</span>
                    <span className="font-bold text-primary">{formatDuration(timingData.averageTimes.provisioning)}</span>
                  </div>
                </div>
              </div>

              {/* Time-to-Conversion Distribution */}
              <div className="bg-card rounded-lg border border-default p-3">
                <h3 className="text-sm font-semibold text-primary mb-3">Time to Conversion</h3>
                {timingData.medianConversionMinutes !== null && (
                  <div className="mb-3 p-2 bg-blue-50 dark:bg-blue-900/20 rounded">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-blue-600 dark:text-blue-400">Median Time</span>
                      <span className="text-lg font-bold text-blue-900 dark:text-blue-200">
                        {timingData.medianConversionMinutes < 60
                          ? `${timingData.medianConversionMinutes}m`
                          : `${Math.floor(timingData.medianConversionMinutes / 60)}h ${timingData.medianConversionMinutes % 60}m`}
                      </span>
                    </div>
                  </div>
                )}
                <div className="space-y-2">
                  {timingData.conversionTimeDistribution.map((bucket, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <span className="text-xs text-secondary w-24 flex-shrink-0">{bucket.time_bucket}</span>
                      <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div
                          className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full"
                          style={{
                            width: `${Math.min(
                              100,
                              (bucket.count /
                                Math.max(...timingData.conversionTimeDistribution.map(b => b.count))) *
                                100
                            )}%`,
                          }}
                        />
                      </div>
                      <span className="text-xs font-medium text-primary w-8 text-right">{bucket.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* 3-Column Compact Widgets Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
            {/* Compact Abandonment Widget */}
            {abandonmentData.length > 0 && (
              <div className="bg-card rounded-lg border border-default p-3">
                <h3 className="text-sm font-semibold text-primary mb-2">Abandonment</h3>
                <ResponsiveContainer width="100%" height={140}>
                  <PieChart>
                    <Pie
                      data={abandonmentData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={60}
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
                <div className="mt-2 space-y-1">
                  {abandonmentData.slice(0, 3).map((item, index) => (
                    <div key={index} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5">
                        <div
                          className="w-2.5 h-2.5 rounded-full"
                          style={{ backgroundColor: COLORS[index % COLORS.length] }}
                        />
                        <span className="text-secondary truncate">{item.name}</span>
                      </div>
                      <span className="font-medium text-primary">{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Compact Top Sources Widget */}
            <div className="bg-card rounded-lg border border-default p-3">
              <h3 className="text-sm font-semibold text-primary mb-2">Top Sources</h3>
              <div className="space-y-2">
                {funnelData.sourceAttribution.slice(0, 3).map((source, index) => (
                  <div key={index} className="p-2 bg-elevated rounded border border-default">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium text-primary truncate">{source.first_page}</p>
                        <p className="text-xs text-secondary truncate">{source.first_button}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-bold text-primary">{source.conversions}</p>
                        <p className="text-xs text-secondary">{source.conversion_rate}%</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Compact Traffic Widget */}
            {pageVisitsData && (
              <div className="bg-card rounded-lg border border-default p-3">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold text-primary">Traffic</h3>
                  <button
                    onClick={() => setShowPageBreakdown(!showPageBreakdown)}
                    className="text-xs text-primary-600 dark:text-primary-400 hover:underline"
                  >
                    {showPageBreakdown ? 'Hide' : 'Details'}
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2 mb-2">
                  <div className="p-2 bg-purple-50 dark:bg-purple-900/20 rounded">
                    <p className="text-xs text-purple-600 dark:text-purple-400">Visitors</p>
                    <p className="text-lg font-bold text-purple-900 dark:text-purple-200">
                      {pageVisitsData.totals.unique_visitors.toLocaleString()}
                    </p>
                  </div>
                  <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded">
                    <p className="text-xs text-blue-600 dark:text-blue-400">Pageviews</p>
                    <p className="text-lg font-bold text-blue-900 dark:text-blue-200">
                      {pageVisitsData.totals.total_pageviews.toLocaleString()}
                    </p>
                  </div>
                </div>
                {!showPageBreakdown && trafficChartData.length > 0 && (
                  <ResponsiveContainer width="100%" height={90}>
                    <BarChart data={trafficChartData}>
                      <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                      <Bar dataKey="visitors" fill="#8b5cf6" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
                {showPageBreakdown && pageVisitsData.pages.length > 0 && (
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {pageVisitsData.pages.map((page, index) => (
                      <div key={index} className="flex items-center justify-between text-xs border-b border-default last:border-0 py-1">
                        <span className="text-secondary truncate flex-1">{page.page_name}</span>
                        <span className="font-medium text-primary ml-2">{page.unique_visitors}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Collapsible Insights Panel */}
          <ExpandableSection title="Insights & Recommendations" defaultExpanded={false}>
            <div className="flex items-start gap-3">
              <Clock className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
              <ul className="space-y-1.5 text-sm text-blue-800 dark:text-blue-300">
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
                  <li>• {abandonmentData[0]?.value || 0} users abandoned at {abandonmentData[0]?.name || 'unknown'} stage</li>
                )}
                {funnelData.sourceAttribution.length > 0 && (
                  <li>
                    • Best performing: {funnelData.sourceAttribution[0]?.first_page} - {funnelData.sourceAttribution[0]?.first_button} ({funnelData.sourceAttribution[0]?.conversion_rate}%)
                  </li>
                )}
              </ul>
            </div>
          </ExpandableSection>

          {/* Abandoned User Recovery Dashboard */}
          {abandonedUsers && abandonedUsers.stats.highIntent > 0 && (
            <ExpandableSection
              title="High-Intent Abandoned Signups"
              defaultExpanded={false}
              badge={abandonedUsers.stats.highIntent}
            >
              <div className="mb-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded">
                <p className="text-sm text-yellow-800 dark:text-yellow-300 mb-2">
                  These users completed Step 3 (company name + subdomain) but didn't finish payment. They're highly likely to convert with a reminder email!
                </p>
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div>
                    <p className="text-xs text-secondary">High Intent</p>
                    <p className="text-lg font-bold text-primary">{abandonedUsers.stats.highIntent}</p>
                  </div>
                  <div>
                    <p className="text-xs text-secondary">With Email</p>
                    <p className="text-lg font-bold text-primary">{abandonedUsers.stats.withEmail}</p>
                  </div>
                  <div>
                    <p className="text-xs text-secondary">Recovery Rate</p>
                    <p className="text-lg font-bold text-green-600 dark:text-green-400">
                      ~{Math.round((abandonedUsers.stats.highIntent / Math.max(abandonedUsers.stats.totalAbandoned, 1)) * 30)}%
                    </p>
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b border-default">
                      <th className="text-left py-2 px-3 font-medium text-secondary text-xs">Email</th>
                      <th className="text-left py-2 px-3 font-medium text-secondary text-xs">Company</th>
                      <th className="text-left py-2 px-3 font-medium text-secondary text-xs">Subdomain</th>
                      <th className="text-left py-2 px-3 font-medium text-secondary text-xs">Plan</th>
                      <th className="text-left py-2 px-3 font-medium text-secondary text-xs">Last Stage</th>
                      <th className="text-left py-2 px-3 font-medium text-secondary text-xs">Hours Ago</th>
                      <th className="text-left py-2 px-3 font-medium text-secondary text-xs">Source</th>
                    </tr>
                  </thead>
                  <tbody>
                    {abandonedUsers.users.map((user) => (
                      <tr key={user.session_id} className="border-b border-default last:border-0 hover:bg-elevated">
                        <td className="py-2 px-3 text-xs text-primary font-medium">{user.email || '-'}</td>
                        <td className="py-2 px-3 text-xs text-secondary">{user.company_name || '-'}</td>
                        <td className="py-2 px-3 text-xs">
                          <span className="font-mono text-purple-600 dark:text-purple-400">
                            {user.subdomain || '-'}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-xs">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300">
                            {user.selected_plan || 'None'}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-xs text-secondary">{user.current_stage.replace(/_/g, ' ')}</td>
                        <td className="py-2 px-3 text-xs">
                          <span className={`font-medium ${user.hours_since_update < 24 ? 'text-red-600 dark:text-red-400' : 'text-orange-600 dark:text-orange-400'}`}>
                            {user.hours_since_update.toFixed(1)}h
                          </span>
                        </td>
                        <td className="py-2 px-3 text-xs text-secondary">
                          {user.first_page && user.first_button ? (
                            <div className="max-w-32 truncate" title={`${user.first_page} - ${user.first_button}`}>
                              {user.first_button}
                            </div>
                          ) : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {abandonedUsers.users.length > 0 && (
                <div className="mt-3 p-2 bg-gray-50 dark:bg-gray-800 rounded text-xs text-secondary">
                  💡 <strong>Tip:</strong> Export this list for email retargeting campaigns. Focus on users abandoned within 24-48 hours for best results.
                </div>
              )}
            </ExpandableSection>
          )}

          {/* Expandable Sessions Preview */}
          <ExpandableSection
            title="Recent Sessions"
            defaultExpanded={false}
            badge={pagination.total}
          >
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-default">
                    <th className="text-left py-2 px-3 font-medium text-secondary text-xs">Session ID</th>
                    <th className="text-left py-2 px-3 font-medium text-secondary text-xs">Stage</th>
                    <th className="text-left py-2 px-3 font-medium text-secondary text-xs">Status</th>
                    <th className="text-left py-2 px-3 font-medium text-secondary text-xs">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {sessions.slice(0, 5).map((session) => (
                    <tr key={session.session_id} className="border-b border-default last:border-0">
                      <td className="py-2 px-3 text-xs font-mono text-secondary">{truncateSessionId(session.session_id)}</td>
                      <td className="py-2 px-3 text-xs text-secondary">{session.current_stage}</td>
                      <td className="py-2 px-3">
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
                      <td className="py-2 px-3 text-xs text-secondary">{formatDate(session.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button
              onClick={() => setActiveTab('sessions')}
              className="mt-3 text-sm text-primary-600 dark:text-primary-400 hover:underline"
            >
              View All {pagination.total} Sessions →
            </button>
          </ExpandableSection>
        </>
      )}

      {/* Sessions Tab Content */}
      {activeTab === 'sessions' && (
        <div className="bg-card rounded-lg border border-default">
          <div className="px-4 py-3 border-b border-default">
            <h2 className="text-base font-semibold text-primary">All Signup Sessions</h2>
            <p className="text-sm text-secondary mt-1">
              Showing {sessions.length} of {pagination.total} sessions
            </p>
          </div>

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
                {sessions.map((session) => (
                  <tr key={session.session_id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-secondary">
                      {truncateSessionId(session.session_id)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary">
                      {session.first_page || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary">
                      {session.first_button || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary">
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300">
                        {session.current_stage}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span
                        className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
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
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      {deleteConfirm === session.session_id ? (
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleDeleteSession(session.session_id)}
                            className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                          >
                            Confirm
                          </button>
                          <button
                            onClick={() => setDeleteConfirm(null)}
                            className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-300"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setDeleteConfirm(session.session_id)}
                          className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 p-1"
                          title="Delete"
                        >
                          <Trash2 size={18} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="px-6 py-4 border-t border-default flex items-center justify-between">
              <p className="text-sm text-secondary">
                Page {pagination.page} of {pagination.totalPages}
              </p>
              <div className="flex space-x-2">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => setPagination({ ...pagination, page: pagination.page - 1 })}
                  disabled={pagination.page === 1}
                >
                  Previous
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => setPagination({ ...pagination, page: pagination.page + 1 })}
                  disabled={pagination.page === pagination.totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
