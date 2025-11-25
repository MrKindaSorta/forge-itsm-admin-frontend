import React, { useState, useEffect, useCallback } from 'react';
import { TrendingUp, Eye, AlertCircle, Download, RefreshCw, Activity, Clock } from 'lucide-react';
import api from '../lib/api';
import { Button } from '../components/Button';
import { FunnelWidget } from '../components/FunnelWidget';
import { ErrorTrackingWidget, type SignupError, type ErrorStats } from '../components/ErrorTrackingWidget';
import { formatDate, getDateRangeForTimezone, getTimezoneName } from '../lib/utils';

// Interfaces
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

interface PageVisitsData {
  pages: Array<{ page_name: string; unique_visitors: number; total_pageviews: number }>;
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

// Hero Metric Card Component
interface HeroMetricProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: { change: number; isPositive: boolean };
  colorClass: string;
  subtitle?: string;
}

function HeroMetric({ title, value, icon, trend, colorClass, subtitle }: HeroMetricProps) {
  return (
    <div className="bg-card rounded-xl border border-default p-6 transition-all hover:shadow-lg">
      <div className="flex items-start justify-between mb-4">
        <div className={`p-3 rounded-lg ${colorClass}`}>
          {icon}
        </div>
        {trend && (
          <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
            trend.isPositive
              ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
              : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
          }`}>
            <span>{trend.isPositive ? '↗' : '↘'}</span>
            <span>{trend.change.toFixed(1)}%</span>
          </div>
        )}
      </div>
      <div>
        <p className="text-sm font-medium text-secondary mb-2">{title}</p>
        <p className="text-4xl font-bold text-primary mb-1">
          {typeof value === 'number' ? value.toLocaleString() : value}
        </p>
        {subtitle && (
          <p className="text-xs text-secondary">{subtitle}</p>
        )}
      </div>
    </div>
  );
}

export const AnalyticsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'overview' | 'sessions'>('overview');
  const [funnelData, setFunnelData] = useState<FunnelData | null>(null);
  const [previousFunnelData, setPreviousFunnelData] = useState<FunnelData | null>(null);
  const [pageVisitsData, setPageVisitsData] = useState<PageVisitsData | null>(null);
  const [timingData, setTimingData] = useState<TimingData | null>(null);
  const [abandonedUsers, setAbandonedUsers] = useState<AbandonedUsersData | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 50, total: 0, totalPages: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [dateRange, setDateRange] = useState(0); // Default to "Today"
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [error, setError] = useState('');

  // Error tracking state
  const [errorData, setErrorData] = useState<{ errors: SignupError[]; stats: ErrorStats } | null>(null);

  // Date range options - 0 = Today
  const dateRangeOptions = [
    { value: 0, label: 'Today' },
    { value: 7, label: '7 Days' },
    { value: 30, label: '30 Days' },
    { value: 90, label: '90 Days' },
  ];

  // Build query params with timezone-aware date range
  const buildDateParams = useCallback((additionalParams?: Record<string, string>): URLSearchParams => {
    const { startDate, endDate } = getDateRangeForTimezone(dateRange);
    const params = new URLSearchParams({
      startDate,
      endDate,
      timezone: getTimezoneName(),
      ...additionalParams,
    });
    return params;
  }, [dateRange]);

  useEffect(() => {
    if (activeTab === 'overview') {
      fetchAnalytics();
      fetchPageVisits();
      fetchTimingData();
      fetchAbandonedUsers();
      fetchPreviousPeriodData();
      fetchErrorData();
    } else {
      fetchSessions();
    }
  }, [activeTab, dateRange, pagination.page]);

  const fetchAnalytics = async () => {
    try {
      setIsLoading(true);
      const params = buildDateParams();
      const response = await api.get(`/api/admin/analytics/funnel?${params}`);
      setFunnelData(response.data);
      setLastUpdated(new Date());
      setError('');
    } catch (err) {
      console.error('Failed to fetch analytics:', err);
      setError('Failed to load analytics data');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchPreviousPeriodData = async () => {
    try {
      // Get previous period (e.g., if today, get yesterday; if 7 days, get previous 7 days)
      const daysForPrevious = dateRange === 0 ? 1 : dateRange;
      const now = new Date();
      
      // Calculate previous period
      const prevEndDate = new Date(now);
      if (dateRange === 0) {
        // Yesterday
        prevEndDate.setDate(prevEndDate.getDate() - 1);
        prevEndDate.setHours(23, 59, 59, 999);
      } else {
        prevEndDate.setDate(prevEndDate.getDate() - dateRange);
        prevEndDate.setHours(23, 59, 59, 999);
      }
      
      const prevStartDate = new Date(prevEndDate);
      prevStartDate.setDate(prevStartDate.getDate() - daysForPrevious + 1);
      prevStartDate.setHours(0, 0, 0, 0);
      
      const params = new URLSearchParams({
        startDate: prevStartDate.toISOString(),
        endDate: prevEndDate.toISOString(),
        timezone: getTimezoneName(),
      });
      
      const response = await api.get(`/api/admin/analytics/funnel?${params}`);
      setPreviousFunnelData(response.data);
    } catch (err) {
      console.error('Failed to fetch previous period data:', err);
    }
  };

  const fetchPageVisits = async () => {
    try {
      const params = buildDateParams();
      const response = await api.get<PageVisitsData>(`/api/admin/analytics/page-visits?${params}`);
      setPageVisitsData(response.data);
    } catch (err) {
      console.error('Failed to fetch page visits:', err);
    }
  };

  const fetchTimingData = async () => {
    try {
      const params = buildDateParams();
      const response = await api.get<TimingData>(`/api/admin/analytics/timing?${params}`);
      setTimingData(response.data);
    } catch (err) {
      console.error('Failed to fetch timing data:', err);
    }
  };

  const fetchAbandonedUsers = async () => {
    try {
      const params = buildDateParams({ minStage: 'step3_completed' });
      const response = await api.get<AbandonedUsersData>(`/api/admin/analytics/abandoned-users?${params}`);
      setAbandonedUsers(response.data);
    } catch (err) {
      console.error('Failed to fetch abandoned users:', err);
    }
  };

  const fetchErrorData = async () => {
    try {
      const params = buildDateParams();
      const response = await api.get(`/api/admin/analytics/signup-errors?${params}`);
      setErrorData(response.data);
    } catch (err) {
      console.error('Failed to fetch error data:', err);
      // Set empty data if endpoint doesn't exist yet
      setErrorData({ errors: [], stats: { total: 0, unresolved: 0, byType: {} } });
    }
  };

  const fetchSessions = useCallback(async () => {
    try {
      setIsLoading(true);
      const params = buildDateParams({
        page: String(pagination.page),
        limit: String(pagination.limit),
      });

      const response = await api.get<SessionsResponse>(`/api/admin/analytics/sessions?${params}`);
      setSessions(response.data.sessions);
      setPagination(response.data.pagination);
      setError('');
    } catch (err) {
      console.error('Failed to fetch sessions:', err);
      setError('Failed to load sessions data');
    } finally {
      setIsLoading(false);
    }
  }, [pagination.page, pagination.limit, buildDateParams]);

  const calculateTrend = useCallback((current: number, previous: number | undefined): { change: number; isPositive: boolean } => {
    if (!previous || previous === 0) return { change: 0, isPositive: current > 0 };
    const percentChange = ((current - previous) / previous) * 100;
    return {
      change: Math.abs(percentChange),
      isPositive: percentChange > 0,
    };
  }, []);

  const formatDuration = (seconds: number): string => {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) {
      const minutes = Math.floor(seconds / 60);
      return `${minutes}m`;
    }
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  };

  const getTimeAgo = (date: Date): string => {
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    return formatDate(date.toISOString());
  };

  // Get friendly date range label for display
  const getDateRangeLabel = (): string => {
    const { startDate, endDate } = getDateRangeForTimezone(dateRange);
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    const formatShortDate = (d: Date) => d.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    });
    
    if (dateRange === 0) {
      return `Today (${formatShortDate(start)})`;
    }
    return `${formatShortDate(start)} - ${formatShortDate(end)}`;
  };

  const handleRefreshData = () => {
    if (activeTab === 'overview') {
      fetchAnalytics();
      fetchPageVisits();
      fetchTimingData();
      fetchAbandonedUsers();
      fetchPreviousPeriodData();
      fetchErrorData();
    } else {
      fetchSessions();
    }
  };

  const exportAsCSV = (data: any[], filename: string) => {
    if (data.length === 0) return;

    const csv = [
      Object.keys(data[0]).join(','),
      ...data.map(row => Object.values(row).map(v => `"${v}"`).join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  const truncateSessionId = (sessionId: string) => {
    if (sessionId.length <= 20) return sessionId;
    return `${sessionId.substring(0, 10)}...${sessionId.substring(sessionId.length - 7)}`;
  };

  // Loading state
  if (isLoading && !funnelData && sessions.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin text-primary mx-auto mb-3" />
          <p className="text-sm text-secondary">Loading analytics...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error && !funnelData && sessions.length === 0) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
        <div className="flex items-center">
          <AlertCircle className="h-6 w-6 text-red-600 dark:text-red-400 mr-3" />
          <p className="text-red-800 dark:text-red-300 font-medium">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-primary">Analytics Dashboard</h1>
          <p className="text-secondary mt-1 text-sm">Monitor your signup funnel and system health</p>
        </div>

        {activeTab === 'overview' && (
          <div className="flex flex-wrap gap-2">
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
            <Button
              onClick={handleRefreshData}
              variant="secondary"
              size="sm"
              title="Refresh data"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="border-b border-default">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('overview')}
            className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'overview'
                ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                : 'border-transparent text-secondary hover:text-primary hover:border-gray-300 dark:hover:border-gray-600'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('sessions')}
            className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'sessions'
                ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                : 'border-transparent text-secondary hover:text-primary hover:border-gray-300 dark:hover:border-gray-600'
            }`}
          >
            Sessions
          </button>
        </nav>
      </div>

      {/* Data freshness and timezone indicator */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-2 text-xs text-secondary">
        <span>Updated {getTimeAgo(lastUpdated)}</span>
        <span className="hidden sm:inline">•</span>
        <span className="flex items-center gap-1">
          <Clock className="h-3 w-3" />
          {getDateRangeLabel()} ({getTimezoneName()})
        </span>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && funnelData && (
        <div className="space-y-6">
          {/* Hero Metrics - 3 Large Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <HeroMetric
              title="Conversion Rate"
              value={`${funnelData.summary.conversionRate}%`}
              subtitle={`${funnelData.summary.totalConversions} of ${funnelData.summary.totalClicks} converted`}
              icon={<TrendingUp className="h-7 w-7 text-blue-600 dark:text-blue-400" />}
              trend={calculateTrend(funnelData.summary.conversionRate, previousFunnelData?.summary.conversionRate)}
              colorClass="bg-blue-100 dark:bg-blue-900/30"
            />

            {pageVisitsData && (
              <HeroMetric
                title="Site Visitors"
                value={pageVisitsData.totals.unique_visitors}
                subtitle={`${pageVisitsData.totals.total_pageviews.toLocaleString()} total pageviews`}
                icon={<Eye className="h-7 w-7 text-cyan-600 dark:text-cyan-400" />}
                colorClass="bg-cyan-100 dark:bg-cyan-900/30"
              />
            )}

            {errorData && (
              <HeroMetric
                title="System Health"
                value={errorData.stats.unresolved === 0 ? 'Healthy' : `${errorData.stats.unresolved} Errors`}
                subtitle={errorData.stats.unresolved === 0 ? 'All systems operational' : 'Action required'}
                icon={<Activity className={`h-7 w-7 ${errorData.stats.unresolved === 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`} />}
                colorClass={errorData.stats.unresolved === 0 ? 'bg-green-100 dark:bg-green-900/30' : 'bg-red-100 dark:bg-red-900/30'}
              />
            )}
          </div>

          {/* System Health & Errors */}
          {errorData && (
            <ErrorTrackingWidget
              errors={errorData.errors}
              stats={errorData.stats}
              onRefresh={fetchErrorData}
              isLoading={isLoading}
            />
          )}

          {/* Conversion Funnel */}
          <FunnelWidget stages={funnelData.stages} />

          {/* Abandoned Users Recovery - Simplified */}
          {abandonedUsers && abandonedUsers.stats.highIntent > 0 && (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border-2 border-yellow-400 dark:border-yellow-600 rounded-lg p-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
                <div>
                  <h3 className="text-lg font-bold text-yellow-900 dark:text-yellow-100 flex items-center gap-2">
                    <AlertCircle className="h-5 w-5" />
                    {abandonedUsers.stats.highIntent} High-Intent Abandoned Signups
                  </h3>
                  <p className="text-sm text-yellow-800 dark:text-yellow-300 mt-1">
                    Users who completed Step 3 but didn't finish payment - high conversion potential!
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => exportAsCSV(abandonedUsers.users, `abandoned-users-${dateRange === 0 ? 'today' : dateRange + 'days'}.csv`)}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export CSV
                </Button>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
                <div className="bg-white dark:bg-gray-800 rounded-lg p-4 text-center">
                  <p className="text-xs text-secondary mb-1">High Intent</p>
                  <p className="text-3xl font-bold text-primary">{abandonedUsers.stats.highIntent}</p>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-lg p-4 text-center">
                  <p className="text-xs text-secondary mb-1">With Email</p>
                  <p className="text-3xl font-bold text-primary">{abandonedUsers.stats.withEmail}</p>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-lg p-4 text-center">
                  <p className="text-xs text-secondary mb-1">Total Abandoned</p>
                  <p className="text-3xl font-bold text-primary">{abandonedUsers.stats.totalAbandoned}</p>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-lg p-4 text-center">
                  <p className="text-xs text-secondary mb-1">Recovery Rate</p>
                  <p className="text-3xl font-bold text-green-600 dark:text-green-400">
                    ~{Math.round((abandonedUsers.stats.highIntent / Math.max(abandonedUsers.stats.totalAbandoned, 1)) * 30)}%
                  </p>
                </div>
              </div>

              {/* Simplified Table - Top 5 only */}
              <div className="bg-white dark:bg-gray-800 rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead className="bg-gray-50 dark:bg-gray-900 border-b border-default">
                      <tr>
                        <th className="text-left py-3 px-4 font-medium text-secondary text-xs">Email</th>
                        <th className="text-left py-3 px-4 font-medium text-secondary text-xs">Company</th>
                        <th className="text-left py-3 px-4 font-medium text-secondary text-xs">Subdomain</th>
                        <th className="text-left py-3 px-4 font-medium text-secondary text-xs">Plan</th>
                        <th className="text-left py-3 px-4 font-medium text-secondary text-xs">Hours Ago</th>
                      </tr>
                    </thead>
                    <tbody>
                      {abandonedUsers.users.slice(0, 5).map((user) => (
                        <tr key={user.session_id} className="border-b border-default last:border-0 hover:bg-yellow-50 dark:hover:bg-yellow-900/10">
                          <td className="py-3 px-4 text-xs">
                            {user.email ? (
                              <a href={`mailto:${user.email}`} className="text-primary-600 dark:text-primary-400 hover:underline font-medium">
                                {user.email}
                              </a>
                            ) : '-'}
                          </td>
                          <td className="py-3 px-4 text-xs text-secondary">{user.company_name || '-'}</td>
                          <td className="py-3 px-4 text-xs">
                            <span className="font-mono text-purple-600 dark:text-purple-400">{user.subdomain || '-'}</span>
                          </td>
                          <td className="py-3 px-4 text-xs">
                            <span className="px-2 py-1 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 font-medium">
                              {user.selected_plan || 'None'}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-xs">
                            <span className={`px-2 py-1 rounded font-medium ${
                              user.hours_since_update < 6
                                ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                                : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300'
                            }`}>
                              {user.hours_since_update.toFixed(1)}h
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {abandonedUsers.users.length > 5 && (
                  <div className="p-3 bg-gray-50 dark:bg-gray-900 text-center text-xs text-secondary">
                    Showing 5 of {abandonedUsers.users.length} abandoned users • Export CSV for full list
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Simplified Supporting Sections - Side by Side */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Traffic Sources */}
            {funnelData.sourceAttribution.length > 0 && (
              <div className="bg-card rounded-lg border border-default p-6">
                <h3 className="text-lg font-semibold text-primary mb-4">Top Traffic Sources</h3>
                <div className="space-y-3">
                  {funnelData.sourceAttribution.slice(0, 5).map((source, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-elevated dark:bg-elevated/50 rounded-lg">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-primary truncate">{source.first_button || 'Direct'}</p>
                        <p className="text-xs text-secondary truncate">{source.first_page || 'Unknown page'}</p>
                      </div>
                      <div className="text-right ml-4">
                        <p className="text-lg font-bold text-primary">{source.conversion_rate.toFixed(1)}%</p>
                        <p className="text-xs text-secondary">{source.conversions}/{source.sessions}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Timing Analytics - Simplified */}
            {timingData && (
              <div className="bg-card rounded-lg border border-default p-6">
                <h3 className="text-lg font-semibold text-primary mb-4">Average Timing</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-elevated dark:bg-elevated/50 rounded-lg">
                    <span className="text-sm text-secondary">To Stripe Checkout</span>
                    <span className="text-lg font-bold text-primary">{formatDuration(timingData.averageTimes.toStripe)}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-elevated dark:bg-elevated/50 rounded-lg">
                    <span className="text-sm text-secondary">Provisioning Time</span>
                    <span className="text-lg font-bold text-primary">{formatDuration(timingData.averageTimes.provisioning)}</span>
                  </div>
                  {timingData.medianConversionMinutes && (
                    <div className="flex items-center justify-between p-3 bg-elevated dark:bg-elevated/50 rounded-lg">
                      <span className="text-sm text-secondary">Median Conversion Time</span>
                      <span className="text-lg font-bold text-primary">{formatDuration(timingData.medianConversionMinutes * 60)}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Sessions Tab */}
      {activeTab === 'sessions' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <h2 className="text-xl font-bold text-primary">All Signup Sessions</h2>
            <div className="flex flex-wrap gap-2">
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
              <Button
                size="sm"
                variant="secondary"
                onClick={() => exportAsCSV(sessions, `sessions-${dateRange === 0 ? 'today' : dateRange + 'days'}.csv`)}
              >
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
            </div>
          </div>

          {/* Sessions Table */}
          <div className="bg-card rounded-lg border border-default overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-900 border-b border-default">
                  <tr>
                    <th className="text-left py-3 px-4 font-medium text-secondary text-xs">Session ID</th>
                    <th className="text-left py-3 px-4 font-medium text-secondary text-xs">Email</th>
                    <th className="text-left py-3 px-4 font-medium text-secondary text-xs">Subdomain</th>
                    <th className="text-left py-3 px-4 font-medium text-secondary text-xs">Status</th>
                    <th className="text-left py-3 px-4 font-medium text-secondary text-xs">Stage</th>
                    <th className="text-left py-3 px-4 font-medium text-secondary text-xs">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {sessions.map((session) => (
                    <tr key={session.session_id} className="border-b border-default last:border-0 hover:bg-elevated/50 dark:hover:bg-elevated/30">
                      <td className="py-3 px-4 text-xs font-mono text-secondary">{truncateSessionId(session.session_id)}</td>
                      <td className="py-3 px-4 text-xs text-primary">{session.email || '-'}</td>
                      <td className="py-3 px-4 text-xs font-mono text-purple-600 dark:text-purple-400">{session.subdomain || '-'}</td>
                      <td className="py-3 px-4 text-xs">
                        <span className={`px-2 py-1 rounded-full font-medium ${
                          session.status === 'converted'
                            ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                            : session.status === 'in_progress'
                            ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300'
                        }`}>
                          {session.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-xs text-secondary">{session.current_stage.replace(/_/g, ' ')}</td>
                      <td className="py-3 px-4 text-xs text-secondary">{formatDate(session.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="p-4 border-t border-default flex items-center justify-between">
                <p className="text-xs text-secondary">
                  Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
                </p>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                    disabled={pagination.page === 1}
                  >
                    Previous
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                    disabled={pagination.page === pagination.totalPages}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
