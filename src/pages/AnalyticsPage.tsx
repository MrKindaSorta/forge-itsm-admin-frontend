import React, { useState, useEffect, useMemo, useCallback, memo } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis } from 'recharts';
import { TrendingUp, Users, MousePointerClick, AlertCircle, Clock, Trash2, Eye, Download, X, Copy, CheckCircle } from 'lucide-react';
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

// Loading Skeleton Components
const SkeletonCard = memo(() => (
  <div className="bg-card rounded-lg border border-default p-3 animate-pulse">
    <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-1/3 mb-3"></div>
    <div className="h-8 bg-gray-300 dark:bg-gray-600 rounded w-1/2 mb-2"></div>
    <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-2/3"></div>
  </div>
));

const SkeletonTable = memo(() => (
  <div className="space-y-2 animate-pulse">
    {[...Array(5)].map((_, i) => (
      <div key={i} className="h-12 bg-gray-200 dark:bg-gray-700 rounded"></div>
    ))}
  </div>
));

// Mini Sparkline Component
interface SparklineProps {
  data: number[];
  color?: string;
}

const MiniSparkline = memo(({ data, color = 'bg-primary-500' }: SparklineProps) => {
  if (!data || data.length === 0) return null;

  const max = Math.max(...data, 1);
  const heights = data.map(d => (d / max) * 20);

  return (
    <div className="flex gap-0.5 items-end h-6 mt-2">
      {heights.map((h, i) => (
        <div
          key={i}
          className={`flex-1 ${color} rounded-t opacity-70 hover:opacity-100 transition-opacity`}
          style={{ height: `${h}px`, minHeight: '2px' }}
        />
      ))}
    </div>
  );
});

// KPI Card Component
interface KPICardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: { change: number; isPositive: boolean };
  sparklineData?: number[];
  colorClass: string;
  index: number;
}

const KPICard = memo(({ title, value, icon, trend, sparklineData, colorClass, index }: KPICardProps) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), index * 100);
    return () => clearTimeout(timer);
  }, [index]);

  return (
    <div className={`bg-card rounded-lg border border-default p-3 transition-all duration-500 hover:shadow-md ${
      isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
    } ${trend && Math.abs(trend.change) > 10 ? 'ring-2 ring-offset-1 ' + (trend.isPositive ? 'ring-green-200 dark:ring-green-900/30' : 'ring-red-200 dark:ring-red-900/30') : ''}`}>
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-xs font-medium text-secondary">{title}</p>
          <p className="text-xl font-bold text-primary mt-0.5">
            {typeof value === 'number' ? value.toLocaleString() : value}
          </p>
          {trend && (
            <div className={`flex items-center gap-1 text-xs mt-1 font-medium transition-colors duration-200 ${
              trend.isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
            }`}>
              <span>{trend.isPositive ? '↗' : '↘'}</span>
              <span>{trend.change.toFixed(1)}%</span>
              <span className="text-secondary">vs prev</span>
            </div>
          )}
          {sparklineData && sparklineData.length > 0 && (
            <MiniSparkline data={sparklineData} color={colorClass.includes('purple') ? 'bg-purple-500' : colorClass.includes('green') ? 'bg-green-500' : colorClass.includes('blue') ? 'bg-blue-500' : 'bg-cyan-500'} />
          )}
        </div>
        <div className={`h-10 w-10 ${colorClass} rounded-lg flex items-center justify-center flex-shrink-0`}>
          {icon}
        </div>
      </div>
    </div>
  );
});

export const AnalyticsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'overview' | 'sessions'>('overview');
  const [funnelData, setFunnelData] = useState<FunnelData | null>(null);
  const [previousFunnelData, setPreviousFunnelData] = useState<FunnelData | null>(null);
  const [pageVisitsData, setPageVisitsData] = useState<PageVisitsData | null>(null);
  const [timingData, setTimingData] = useState<TimingData | null>(null);
  const [previousTimingData, setPreviousTimingData] = useState<TimingData | null>(null);
  const [abandonedUsers, setAbandonedUsers] = useState<AbandonedUsersData | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 50, total: 0, totalPages: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [dateRange, setDateRange] = useState(30);
  const [showPageBreakdown, setShowPageBreakdown] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [selectedEmails, setSelectedEmails] = useState<Set<string>>(new Set());
  const [emailsCopied, setEmailsCopied] = useState(false);
  const [selectedAbandonmentStages, setSelectedAbandonmentStages] = useState<Set<string>>(new Set());
  const [quickFilters, setQuickFilters] = useState<{ status?: string; stage?: string }>({});
  const [selectedSessions, setSelectedSessions] = useState<Set<string>>(new Set());
  const [dismissedInsights, setDismissedInsights] = useState<Set<string>>(new Set());

  const dateRangeOptions = [
    { value: 1, label: 'Today' },
    { value: 7, label: '7 Days' },
    { value: 30, label: '30 Days' },
    { value: 90, label: '90 Days' },
  ];
  const [error, setError] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // Load dismissed insights from localStorage
  useEffect(() => {
    const dismissed = localStorage.getItem('dismissedInsights');
    if (dismissed) {
      setDismissedInsights(new Set(JSON.parse(dismissed)));
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'overview') {
      fetchAnalytics();
      fetchPageVisits();
      fetchTimingData();
      fetchAbandonedUsers();
      fetchPreviousPeriodData();
    } else {
      fetchSessions();
    }
  }, [activeTab, dateRange, pagination.page, quickFilters]);

  const fetchAnalytics = async () => {
    try {
      setIsLoading(true);
      const response = await api.get(`/api/admin/analytics/funnel?days=${dateRange}`);
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
      // Fetch previous period for trends
      const response = await api.get(`/api/admin/analytics/funnel?days=${dateRange}`);
      setPreviousFunnelData(response.data);

      const timingResponse = await api.get(`/api/admin/analytics/timing?days=${dateRange}`);
      setPreviousTimingData(timingResponse.data);
    } catch (err) {
      console.error('Failed to fetch previous period data:', err);
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
      const response = await api.get<AbandonedUsersData>(`/api/admin/analytics/abandoned-users?minStage=step3_completed&days=${dateRange}`);
      setAbandonedUsers(response.data);
    } catch (err) {
      console.error('Failed to fetch abandoned users:', err);
    }
  };

  const fetchSessions = useCallback(async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams({
        page: String(pagination.page),
        limit: String(pagination.limit),
        days: String(dateRange),
      });

      if (quickFilters.status) params.append('status', quickFilters.status);
      if (quickFilters.stage) params.append('stage', quickFilters.stage);

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
  }, [pagination.page, pagination.limit, dateRange, quickFilters]);

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

  const handleBulkDelete = async () => {
    if (!confirm(`Delete ${selectedSessions.size} sessions?`)) return;

    try {
      await Promise.all(
        Array.from(selectedSessions).map(id => api.delete(`/api/admin/analytics/session/${id}`))
      );
      setSelectedSessions(new Set());
      fetchSessions();
    } catch (err) {
      console.error('Failed to bulk delete sessions:', err);
      alert('Failed to delete some sessions. Please try again.');
    }
  };

  const truncateSessionId = (sessionId: string) => {
    if (sessionId.length <= 20) return sessionId;
    return `${sessionId.substring(0, 10)}...${sessionId.substring(sessionId.length - 7)}`;
  };

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

  const timingBenchmarks = {
    toStep1: 60,
    inStep1: 45,
    inStep2: 60,
    inStep3: 90,
    toStripe: 30,
    provisioning: 90
  };

  const getPerformanceColor = (actual: number, benchmark: number): string => {
    const ratio = actual / benchmark;
    if (ratio <= 1) return 'text-green-600 dark:text-green-400';
    if (ratio <= 1.5) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  const getPerformanceBadge = (actual: number, benchmark: number): string => {
    const ratio = actual / benchmark;
    if (ratio <= 1) return '✓';
    if (ratio <= 1.5) return '⚠';
    return '✗';
  };

  const getProgressBarColor = (actual: number, benchmark: number): string => {
    const ratio = actual / benchmark;
    if (ratio <= 1) return 'from-green-500 to-green-400';
    if (ratio <= 1.5) return 'from-yellow-500 to-yellow-400';
    return 'from-red-500 to-red-400';
  };

  const getRowBg = (actual: number, benchmark: number): string => {
    const ratio = actual / benchmark;
    if (ratio <= 1) return 'bg-green-50 dark:bg-green-900/10';
    if (ratio <= 1.5) return 'bg-yellow-50 dark:bg-yellow-900/10';
    return 'bg-red-50 dark:bg-red-900/10';
  };

  const calculatePerformanceScore = useMemo(() => {
    if (!timingData) return 0;

    const stages = ['toStep1', 'inStep1', 'inStep2', 'inStep3', 'toStripe', 'provisioning'] as const;
    let score = 0;

    stages.forEach(stage => {
      const actual = timingData.averageTimes[stage];
      const benchmark = timingBenchmarks[stage];
      const ratio = actual / benchmark;

      if (ratio <= 1) score += 100 / stages.length;
      else if (ratio <= 1.5) score += (100 / stages.length) * (1 - (ratio - 1) / 0.5);
    });

    return Math.round(score);
  }, [timingData]);

  const calculateTrend = useCallback((current: number, previous: number | undefined): { change: number; isPositive: boolean } => {
    if (!previous || previous === 0) return { change: 0, isPositive: current > 0 };
    const percentChange = ((current - previous) / previous) * 100;
    return {
      change: Math.abs(percentChange),
      isPositive: percentChange > 0,
    };
  }, []);

  const copySelectedEmails = () => {
    const emails = Array.from(selectedEmails).join(', ');
    navigator.clipboard.writeText(emails);
    setEmailsCopied(true);
    setTimeout(() => setEmailsCopied(false), 2000);
  };

  const getHourColor = (hours: number): string => {
    if (hours < 6) return 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border border-red-300 dark:border-red-700';
    if (hours < 12) return 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 border border-orange-300 dark:border-orange-700';
    if (hours < 24) return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 border border-yellow-300 dark:border-yellow-700';
    if (hours < 48) return 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-300 dark:border-blue-700';
    return 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300';
  };

  const getPlanStyle = (plan: string): { bg: string; text: string; badge: string } => {
    const planMap: Record<string, { bg: string; text: string; badge: string }> = {
      'Professional': { bg: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-800 dark:text-purple-300', badge: '★' },
      'Business': { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-800 dark:text-blue-300', badge: '★★' },
      'Starter': { bg: 'bg-gray-100 dark:bg-gray-700', text: 'text-gray-800 dark:text-gray-300', badge: '' },
    };
    return planMap[plan] || planMap['Starter'];
  };

  const planPrices: Record<string, number> = {
    'Starter': 59.99,
    'Professional': 79.99,
    'Business': 119.99,
  };

  const totalRevenueAtRisk = useMemo(() => {
    if (!abandonedUsers) return 0;
    return abandonedUsers.users.reduce((sum, user) => sum + (planPrices[user.selected_plan] || 0), 0);
  }, [abandonedUsers]);

  const getTimeAgo = (date: Date): string => {
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return formatDate(date.toISOString());
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

  const dismissInsight = (insightId: string) => {
    const newDismissed = new Set(dismissedInsights);
    newDismissed.add(insightId);
    setDismissedInsights(newDismissed);
    localStorage.setItem('dismissedInsights', JSON.stringify(Array.from(newDismissed)));
  };

  const handleRefreshData = () => {
    if (activeTab === 'overview') {
      fetchAnalytics();
      fetchPageVisits();
      fetchTimingData();
      fetchAbandonedUsers();
      fetchPreviousPeriodData();
    } else {
      fetchSessions();
    }
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'e') {
        e.preventDefault();
        if (activeTab === 'sessions') {
          exportAsCSV(sessions, `sessions-${dateRange}days.csv`);
        }
      }
      if (e.key === 'r' || e.key === 'R') {
        if (!e.ctrlKey && !e.metaKey && document.activeElement?.tagName !== 'INPUT') {
          e.preventDefault();
          handleRefreshData();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeTab, sessions, dateRange]);

  if (isLoading && !funnelData && sessions.length === 0) {
    return (
      <div className="space-y-3">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
        <SkeletonTable />
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

  const filteredAbandonmentData = selectedAbandonmentStages.size > 0
    ? abandonmentData.filter(item => selectedAbandonmentStages.has(item.name))
    : abandonmentData;

  const trafficChartData = pageVisitsData?.pages.slice(0, 5).map(page => ({
    name: page.page_name.length > 10 ? page.page_name.substring(0, 10) + '...' : page.page_name,
    visitors: page.unique_visitors,
  })) || [];

  // Generate mock sparkline data (in production, fetch from API)
  const mockSparklineData = {
    clicks: [85, 92, 88, 95, 90, 98, 100],
    conversions: [12, 15, 13, 18, 16, 20, 22],
    conversionRate: [14, 16, 15, 19, 18, 20, 22],
    visitors: [120, 135, 128, 145, 140, 150, 160],
  };

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
              className={`whitespace-nowrap py-2.5 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'overview'
                  ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                  : 'border-transparent text-secondary hover:text-primary hover:border-gray-300 dark:hover:border-gray-600'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab('sessions')}
              className={`whitespace-nowrap py-2.5 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'sessions'
                  ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                  : 'border-transparent text-secondary hover:text-primary hover:border-gray-300 dark:hover:border-gray-600'
              }`}
            >
              Sessions
            </button>
          </nav>
        </div>

        {/* Data freshness indicator */}
        <div className="flex items-center justify-between text-xs text-secondary mt-2">
          <span>Updated {getTimeAgo(lastUpdated)}</span>
          <button
            onClick={handleRefreshData}
            className="hover:text-primary transition-colors"
            title="Refresh data (R)"
          >
            🔄 Refresh
          </button>
        </div>
      </div>

      {/* Overview Tab Content */}
      {activeTab === 'overview' && funnelData && (
        <>
          {/* Enhanced KPI Summary Row */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <KPICard
              title="Clicks"
              value={funnelData.summary.totalClicks}
              icon={<MousePointerClick className="h-5 w-5 text-purple-600 dark:text-purple-400" />}
              trend={calculateTrend(funnelData.summary.totalClicks, previousFunnelData?.summary.totalClicks)}
              sparklineData={mockSparklineData.clicks}
              colorClass="bg-purple-100 dark:bg-purple-900/30"
              index={0}
            />

            <KPICard
              title="Conversions"
              value={funnelData.summary.totalConversions}
              icon={<Users className="h-5 w-5 text-green-600 dark:text-green-400" />}
              trend={calculateTrend(funnelData.summary.totalConversions, previousFunnelData?.summary.totalConversions)}
              sparklineData={mockSparklineData.conversions}
              colorClass="bg-green-100 dark:bg-green-900/30"
              index={1}
            />

            <KPICard
              title="Conv. Rate"
              value={`${funnelData.summary.conversionRate}%`}
              icon={<TrendingUp className="h-5 w-5 text-blue-600 dark:text-blue-400" />}
              trend={calculateTrend(funnelData.summary.conversionRate, previousFunnelData?.summary.conversionRate)}
              sparklineData={mockSparklineData.conversionRate}
              colorClass="bg-blue-100 dark:bg-blue-900/30"
              index={2}
            />

            {pageVisitsData && (
              <KPICard
                title="Visitors"
                value={pageVisitsData.totals.unique_visitors}
                icon={<Eye className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />}
                sparklineData={mockSparklineData.visitors}
                colorClass="bg-cyan-100 dark:bg-cyan-900/30"
                index={3}
              />
            )}
          </div>

          {/* Enhanced Abandoned User Recovery Dashboard */}
          {abandonedUsers && abandonedUsers.stats.highIntent > 0 && (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border-2 border-yellow-400 dark:border-yellow-600 rounded-lg p-4 transition-all hover:shadow-md">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="text-base font-bold text-yellow-900 dark:text-yellow-100">
                    ⚠️ {abandonedUsers.stats.highIntent} High-Intent Abandoned Signups
                  </h3>
                  <p className="text-sm text-yellow-800 dark:text-yellow-300 mt-1">
                    These users completed Step 3 (company name + subdomain) but didn't finish payment. They're highly likely to convert with a reminder email!
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => exportAsCSV(abandonedUsers.users, `abandoned-users-${dateRange}days.csv`)}
                  className="flex-shrink-0"
                >
                  <Download className="h-4 w-4 mr-1" />
                  Export
                </Button>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                <div className="bg-white dark:bg-gray-800 rounded p-3 text-center">
                  <p className="text-xs text-secondary">High Intent</p>
                  <p className="text-2xl font-bold text-primary">{abandonedUsers.stats.highIntent}</p>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded p-3 text-center">
                  <p className="text-xs text-secondary">With Email</p>
                  <p className="text-2xl font-bold text-primary">{abandonedUsers.stats.withEmail}</p>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded p-3 text-center">
                  <p className="text-xs text-secondary">Est. Recovery Rate</p>
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                    ~{Math.round((abandonedUsers.stats.highIntent / Math.max(abandonedUsers.stats.totalAbandoned, 1)) * 30)}%
                  </p>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded p-3 text-center">
                  <p className="text-xs text-secondary">Revenue at Risk</p>
                  <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                    ${totalRevenueAtRisk.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto bg-white dark:bg-gray-800 rounded">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-900">
                    <tr className="border-b border-default">
                      <th className="text-left py-2 px-3 font-medium text-secondary text-xs w-8">
                        <input
                          type="checkbox"
                          checked={selectedEmails.size === abandonedUsers.users.slice(0, 10).filter(u => u.email).length}
                          onChange={(e) => {
                            if (e.target.checked) {
                              const emails = new Set(abandonedUsers.users.slice(0, 10).map(u => u.email).filter(Boolean) as string[]);
                              setSelectedEmails(emails);
                            } else {
                              setSelectedEmails(new Set());
                            }
                          }}
                          className="rounded cursor-pointer"
                        />
                      </th>
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
                    {abandonedUsers.users.slice(0, 10).map((user) => {
                      const planStyle = getPlanStyle(user.selected_plan);
                      return (
                        <tr
                          key={user.session_id}
                          className="border-b border-default last:border-0 hover:bg-yellow-50 dark:hover:bg-yellow-900/10 transition-colors"
                          title={`${user.company_name} - Last seen ${user.hours_since_update.toFixed(1)}h ago`}
                        >
                          <td className="py-2 px-3">
                            <input
                              type="checkbox"
                              checked={selectedEmails.has(user.email || '')}
                              onChange={(e) => {
                                const newEmails = new Set(selectedEmails);
                                if (e.target.checked && user.email) {
                                  newEmails.add(user.email);
                                } else if (user.email) {
                                  newEmails.delete(user.email);
                                }
                                setSelectedEmails(newEmails);
                              }}
                              className="rounded cursor-pointer"
                            />
                          </td>
                          <td className="py-2 px-3 text-xs">
                            {user.email ? (
                              <a
                                href={`mailto:${user.email}`}
                                className="text-primary-600 dark:text-primary-400 hover:underline font-medium transition-colors"
                              >
                                {user.email}
                              </a>
                            ) : '-'}
                          </td>
                          <td className="py-2 px-3 text-xs text-secondary">{user.company_name || '-'}</td>
                          <td className="py-2 px-3 text-xs">
                            <span className="font-mono text-purple-600 dark:text-purple-400">
                              {user.subdomain || '-'}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-xs">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-bold ${planStyle.bg} ${planStyle.text}`}>
                              {planStyle.badge && <span>{planStyle.badge}</span>}
                              {user.selected_plan || 'None'}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-xs text-secondary">{user.current_stage.replace(/_/g, ' ')}</td>
                          <td className="py-2 px-3">
                            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-bold ${getHourColor(user.hours_since_update)}`}>
                              {user.hours_since_update < 12 && <span>🔥</span>}
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
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {selectedEmails.size > 0 && (
                <div className="mt-3 bg-white dark:bg-gray-800 border-2 border-yellow-300 dark:border-yellow-600 rounded p-3 flex items-center justify-between">
                  <span className="text-sm font-medium text-primary">
                    {selectedEmails.size} email{selectedEmails.size !== 1 ? 's' : ''} selected
                  </span>
                  <Button
                    size="sm"
                    onClick={copySelectedEmails}
                    className="bg-yellow-600 hover:bg-yellow-700 text-white"
                  >
                    {emailsCopied ? (
                      <>
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4 mr-1" />
                        Copy {selectedEmails.size} Email{selectedEmails.size !== 1 ? 's' : ''}
                      </>
                    )}
                  </Button>
                </div>
              )}

              {abandonedUsers.users.length > 10 && (
                <div className="mt-3 text-xs text-center text-secondary">
                  Showing 10 of {abandonedUsers.users.length} abandoned users
                </div>
              )}

              <div className="mt-3 p-2 bg-white dark:bg-gray-800 rounded text-xs text-secondary">
                💡 <strong>Tip:</strong> Export this list for email retargeting campaigns. Focus on users abandoned within 6-12 hours for best results.
              </div>
            </div>
          )}

          {/* Enhanced Funnel Widget */}
          <FunnelWidget stages={funnelData.stages} previousStages={previousFunnelData?.stages} />

          {/* Enhanced Time-Based Metrics Section */}
          {timingData && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              {/* Performance Score Card */}
              <div className="bg-card rounded-lg border border-default p-3">
                <div className="mb-4 p-3 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-secondary mb-1">Overall Performance Score</p>
                      <p className="text-4xl font-bold text-primary">{calculatePerformanceScore}<span className="text-lg text-secondary">/100</span></p>
                    </div>
                    <div className="relative h-20 w-20">
                      <svg className="transform -rotate-90 h-20 w-20">
                        <circle
                          cx="40"
                          cy="40"
                          r="32"
                          stroke="currentColor"
                          strokeWidth="6"
                          fill="transparent"
                          className="text-gray-200 dark:text-gray-700"
                        />
                        <circle
                          cx="40"
                          cy="40"
                          r="32"
                          stroke="currentColor"
                          strokeWidth="6"
                          fill="transparent"
                          strokeDasharray={`${(calculatePerformanceScore / 100) * 201} 201`}
                          className={
                            calculatePerformanceScore >= 80
                              ? 'text-green-500'
                              : calculatePerformanceScore >= 60
                              ? 'text-yellow-500'
                              : 'text-red-500'
                          }
                        />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-xs font-bold text-primary">{calculatePerformanceScore}%</span>
                      </div>
                    </div>
                  </div>
                </div>

                <h3 className="text-sm font-semibold text-primary mb-3">Average Time Per Stage</h3>
                <div className="space-y-3">
                  {[
                    { key: 'toStep1' as const, label: 'To Step 1 (Plan Selection)' },
                    { key: 'inStep1' as const, label: 'In Step 1 (Selecting Plan)' },
                    { key: 'inStep2' as const, label: 'In Step 2 (Account Details)' },
                    { key: 'inStep3' as const, label: 'In Step 3 (Company Info)' },
                    { key: 'toStripe' as const, label: 'To Stripe Checkout' },
                    { key: 'provisioning' as const, label: 'Provisioning Time' },
                  ].map(({ key, label }) => (
                    <div key={key} className={`px-2 py-2 rounded transition-all ${getRowBg(timingData.averageTimes[key], timingBenchmarks[key])}`}>
                      <div className="flex items-center justify-between text-xs mb-2">
                        <span className="text-secondary font-medium">{label}</span>
                        <div className="flex items-center gap-2">
                          <span className={`font-bold ${getPerformanceColor(timingData.averageTimes[key], timingBenchmarks[key])}`}>
                            {formatDuration(timingData.averageTimes[key])}
                          </span>
                          <span className="text-xs">{getPerformanceBadge(timingData.averageTimes[key], timingBenchmarks[key])}</span>
                          <span className="text-xs text-secondary">/ {formatDuration(timingBenchmarks[key])}</span>
                        </div>
                      </div>
                      <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div
                          className={`h-full bg-gradient-to-r ${getProgressBarColor(timingData.averageTimes[key], timingBenchmarks[key])} transition-all duration-500`}
                          style={{
                            width: `${Math.min(100, (timingData.averageTimes[key] / timingBenchmarks[key]) * 100)}%`,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-3 text-xs text-secondary">
                  ✓ = At/below target  |  ⚠ = Within 50%  |  ✗ = Over 50% slow
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
                      <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all duration-500"
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

          {/* Enhanced 3-Column Compact Widgets Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
            {/* Enhanced Abandonment Widget */}
            {abandonmentData.length > 0 && (
              <div className="bg-card rounded-lg border border-default p-3 transition-all hover:shadow-md">
                <h3 className="text-sm font-semibold text-primary mb-2">Abandonment by Stage</h3>

                {/* Filter buttons */}
                <div className="flex flex-wrap gap-1 mb-3">
                  <button
                    onClick={() => setSelectedAbandonmentStages(new Set())}
                    className={`text-xs px-2 py-1 rounded transition-colors ${
                      selectedAbandonmentStages.size === 0
                        ? 'bg-primary-600 text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    All
                  </button>
                  {abandonmentData.slice(0, 3).map((item) => (
                    <button
                      key={item.name}
                      onClick={() => {
                        const newStages = new Set(selectedAbandonmentStages);
                        if (newStages.has(item.name)) {
                          newStages.delete(item.name);
                        } else {
                          newStages.clear();
                          newStages.add(item.name);
                        }
                        setSelectedAbandonmentStages(newStages);
                      }}
                      className={`text-xs px-2 py-1 rounded transition-colors ${
                        selectedAbandonmentStages.has(item.name)
                          ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-800 dark:text-primary-300 border border-primary-300'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                      }`}
                    >
                      {item.name.length > 12 ? item.name.substring(0, 12) + '...' : item.name}
                    </button>
                  ))}
                </div>

                <ResponsiveContainer width="100%" height={140}>
                  <PieChart>
                    <Pie
                      data={filteredAbandonmentData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={60}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {filteredAbandonmentData.map((_entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'rgba(255, 255, 255, 0.95)',
                        border: '1px solid rgba(0, 0, 0, 0.1)',
                        borderRadius: '0.5rem',
                        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                        padding: '0.5rem',
                      }}
                      formatter={(value: number) => {
                        const total = filteredAbandonmentData.reduce((sum, item) => sum + item.value, 0);
                        const percentage = ((value / total) * 100).toFixed(1);
                        return [`${value.toLocaleString()} (${percentage}%)`, ''];
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="mt-2 space-y-1">
                  {filteredAbandonmentData.slice(0, 3).map((item, index) => (
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

            {/* Enhanced Top Sources Widget */}
            <div className="bg-card rounded-lg border border-default p-3 transition-all hover:shadow-md">
              <h3 className="text-sm font-semibold text-primary mb-2">Top Sources</h3>
              <div className="space-y-2">
                {funnelData.sourceAttribution.slice(0, 3).map((source, index) => {
                  const maxSessions = Math.max(...funnelData.sourceAttribution.slice(0, 3).map(s => s.sessions));
                  const convRate = source.conversion_rate;
                  const rateColor = convRate >= 15 ? 'text-green-600 dark:text-green-400' : convRate >= 10 ? 'text-yellow-600 dark:text-yellow-400' : 'text-red-600 dark:text-red-400';

                  return (
                    <div key={index} className="p-2 bg-elevated rounded border border-default hover:shadow-sm transition-all">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-medium text-primary truncate">{source.first_page}</p>
                          <p className="text-xs text-secondary truncate">{source.first_button}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-sm font-bold text-primary">{source.sessions}</p>
                          <p className={`text-xs font-medium ${rateColor}`}>{source.conversion_rate}%</p>
                        </div>
                      </div>
                      <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-primary-400 to-primary-600 transition-all duration-500"
                          style={{ width: `${(source.sessions / maxSessions) * 100}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Enhanced Traffic Widget */}
            {pageVisitsData && (
              <div className="bg-card rounded-lg border border-default p-3 transition-all hover:shadow-md">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold text-primary">Traffic</h3>
                  <button
                    onClick={() => setShowPageBreakdown(!showPageBreakdown)}
                    className="text-xs text-primary-600 dark:text-primary-400 hover:underline transition-colors"
                  >
                    {showPageBreakdown ? 'Chart' : 'Details'}
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
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'rgba(255, 255, 255, 0.95)',
                          border: '1px solid rgba(0, 0, 0, 0.1)',
                          borderRadius: '0.5rem',
                          padding: '0.5rem',
                        }}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                )}
                {showPageBreakdown && pageVisitsData.pages.length > 0 && (
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {pageVisitsData.pages.map((page, index) => {
                      const percentage = ((page.unique_visitors / pageVisitsData.totals.unique_visitors) * 100).toFixed(1);
                      return (
                        <div key={index} className="flex items-center justify-between text-xs border-b border-default last:border-0 py-1">
                          <span className="text-secondary truncate flex-1" title={page.page_name}>{page.page_name}</span>
                          <div className="flex items-center gap-2 ml-2 flex-shrink-0">
                            <span className="font-medium text-primary">{page.unique_visitors}</span>
                            <span className="text-secondary">({percentage}%)</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Enhanced Insights Panel */}
          <ExpandableSection title="Insights & Recommendations" defaultExpanded={false}>
            <div className="space-y-3">
              {funnelData.summary.conversionRate < 10 && !dismissedInsights.has('low-conversion') && (
                <div className="flex items-start gap-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded transition-all hover:shadow-sm">
                  <span className="text-lg flex-shrink-0">🚨</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <p className="text-sm font-bold text-red-900 dark:text-red-100">
                          Overall conversion rate is critically low at {funnelData.summary.conversionRate}%
                        </p>
                        <p className="text-xs text-red-800 dark:text-red-300 mt-1">
                          <strong>Impact:</strong> Fixing could double revenue • <strong>Priority:</strong> Critical • <strong>Fix Type:</strong> Long Term (1-2 weeks)
                        </p>
                        <p className="text-xs text-red-800 dark:text-red-300 mt-1">
                          <strong>Action:</strong> A/B test landing pages, simplify signup flow, add social proof
                        </p>
                      </div>
                      <button
                        onClick={() => dismissInsight('low-conversion')}
                        className="text-red-400 hover:text-red-600 dark:hover:text-red-300 flex-shrink-0 p-1 transition-colors"
                        title="Dismiss"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {funnelData.stages[1] && funnelData.stages[1].percentage < 80 && !dismissedInsights.has('step1-drop') && (
                <div className="flex items-start gap-3 p-3 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded transition-all hover:shadow-sm">
                  <span className="text-lg flex-shrink-0">⚠️</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <p className="text-sm font-bold text-orange-900 dark:text-orange-100">
                          High dropoff at Step 1 - {(100 - funnelData.stages[1].percentage).toFixed(0)}% abandonment
                        </p>
                        <p className="text-xs text-orange-800 dark:text-orange-300 mt-1">
                          <strong>Impact:</strong> Could recover ~{Math.round(funnelData.stages[0].count * 0.1)} signups • <strong>Priority:</strong> High • <strong>Fix Type:</strong> Quick Fix (2-3 days)
                        </p>
                        <p className="text-xs text-orange-800 dark:text-orange-300 mt-1">
                          <strong>Action:</strong> Simplify plan selection or add comparison table
                        </p>
                      </div>
                      <button
                        onClick={() => dismissInsight('step1-drop')}
                        className="text-orange-400 hover:text-orange-600 dark:hover:text-orange-300 flex-shrink-0 p-1 transition-colors"
                        title="Dismiss"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {funnelData.stages[2] && funnelData.stages[2].percentage < 70 && !dismissedInsights.has('step2-drop') && (
                <div className="flex items-start gap-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded transition-all hover:shadow-sm">
                  <span className="text-lg flex-shrink-0">💡</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <p className="text-sm font-bold text-yellow-900 dark:text-yellow-100">
                          Significant dropoff at Step 2 - form fields may be too complex
                        </p>
                        <p className="text-xs text-yellow-800 dark:text-yellow-300 mt-1">
                          <strong>Impact:</strong> Could improve conversion by ~{Math.round((100 - funnelData.stages[2].percentage) * 0.15)}% • <strong>Priority:</strong> Medium • <strong>Fix Type:</strong> Quick Fix (1-2 days)
                        </p>
                        <p className="text-xs text-yellow-800 dark:text-yellow-300 mt-1">
                          <strong>Action:</strong> Reduce form fields or add trust badges
                        </p>
                      </div>
                      <button
                        onClick={() => dismissInsight('step2-drop')}
                        className="text-yellow-400 hover:text-yellow-600 dark:hover:text-yellow-300 flex-shrink-0 p-1 transition-colors"
                        title="Dismiss"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {abandonmentData.length > 0 && !dismissedInsights.has('abandonment-stage') && (
                <div className="flex items-start gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded transition-all hover:shadow-sm">
                  <span className="text-lg flex-shrink-0">ℹ️</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <p className="text-sm font-bold text-blue-900 dark:text-blue-100">
                          {abandonmentData[0]?.value || 0} users abandoned at {abandonmentData[0]?.name || 'unknown'} stage
                        </p>
                        <p className="text-xs text-blue-800 dark:text-blue-300 mt-1">
                          <strong>Priority:</strong> Low • <strong>Fix Type:</strong> Investigation
                        </p>
                        <p className="text-xs text-blue-800 dark:text-blue-300 mt-1">
                          <strong>Action:</strong> Analyze user behavior and exit surveys for this stage
                        </p>
                      </div>
                      <button
                        onClick={() => dismissInsight('abandonment-stage')}
                        className="text-blue-400 hover:text-blue-600 dark:hover:text-blue-300 flex-shrink-0 p-1 transition-colors"
                        title="Dismiss"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {funnelData.sourceAttribution.length > 0 && !dismissedInsights.has('best-source') && (
                <div className="flex items-start gap-3 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded transition-all hover:shadow-sm">
                  <span className="text-lg flex-shrink-0">✅</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <p className="text-sm font-bold text-green-900 dark:text-green-100">
                          Best performing: {funnelData.sourceAttribution[0]?.first_page} - {funnelData.sourceAttribution[0]?.first_button} ({funnelData.sourceAttribution[0]?.conversion_rate}%)
                        </p>
                        <p className="text-xs text-green-800 dark:text-green-300 mt-1">
                          <strong>Impact:</strong> Double down on this source • <strong>Priority:</strong> Low • <strong>Fix Type:</strong> Quick Win
                        </p>
                        <p className="text-xs text-green-800 dark:text-green-300 mt-1">
                          <strong>Action:</strong> Increase marketing budget for this channel
                        </p>
                      </div>
                      <button
                        onClick={() => dismissInsight('best-source')}
                        className="text-green-400 hover:text-green-600 dark:hover:text-green-300 flex-shrink-0 p-1 transition-colors"
                        title="Dismiss"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </ExpandableSection>

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
              className="mt-3 text-sm text-primary-600 dark:text-primary-400 hover:underline transition-colors"
            >
              View All {pagination.total} Sessions →
            </button>
          </ExpandableSection>
        </>
      )}

      {/* Enhanced Sessions Tab Content */}
      {activeTab === 'sessions' && (
        <div className="bg-card rounded-lg border border-default">
          <div className="px-4 py-3 border-b border-default">
            <h2 className="text-base font-semibold text-primary">All Signup Sessions</h2>
            <p className="text-sm text-secondary mt-1">
              Showing {sessions.length} of {pagination.total} sessions
            </p>
          </div>

          {/* Quick Filter Buttons */}
          <div className="px-4 py-3 border-b border-default flex flex-wrap gap-2">
            <button
              onClick={() => setQuickFilters({})}
              className={`text-xs px-3 py-1.5 rounded transition-all ${
                Object.keys(quickFilters).length === 0
                  ? 'bg-primary-600 text-white shadow-sm'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              All Sessions
            </button>
            <button
              onClick={() => setQuickFilters({ status: 'completed' })}
              className={`text-xs px-3 py-1.5 rounded transition-all ${
                quickFilters.status === 'completed'
                  ? 'bg-green-600 text-white shadow-sm'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              ✓ Converted
            </button>
            <button
              onClick={() => setQuickFilters({ status: 'active' })}
              className={`text-xs px-3 py-1.5 rounded transition-all ${
                quickFilters.status === 'active'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              ◐ In Progress
            </button>
            <button
              onClick={() => setQuickFilters({ status: 'abandoned' })}
              className={`text-xs px-3 py-1.5 rounded transition-all ${
                quickFilters.status === 'abandoned'
                  ? 'bg-orange-600 text-white shadow-sm'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              ✗ Abandoned
            </button>
            <div className="flex-1"></div>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => exportAsCSV(sessions, `sessions-${dateRange}days.csv`)}
            >
              <Download className="h-4 w-4 mr-1" />
              Export CSV
            </Button>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-800 sticky top-0 z-10">
                <tr>
                  <th className="px-3 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider w-8">
                    <input
                      type="checkbox"
                      checked={selectedSessions.size === sessions.length && sessions.length > 0}
                      onChange={() => {
                        if (selectedSessions.size === sessions.length) {
                          setSelectedSessions(new Set());
                        } else {
                          setSelectedSessions(new Set(sessions.map(s => s.session_id)));
                        }
                      }}
                      className="rounded cursor-pointer"
                    />
                  </th>
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
                  <tr
                    key={session.session_id}
                    className={`transition-colors ${
                      session.status === 'completed'
                        ? 'bg-green-50 dark:bg-green-900/10 hover:bg-green-100 dark:hover:bg-green-900/20'
                        : 'hover:bg-gray-50 dark:hover:bg-gray-700'
                    }`}
                  >
                    <td className="px-3 py-4 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={selectedSessions.has(session.session_id)}
                        onChange={() => {
                          const newSelected = new Set(selectedSessions);
                          if (newSelected.has(session.session_id)) {
                            newSelected.delete(session.session_id);
                          } else {
                            newSelected.add(session.session_id);
                          }
                          setSelectedSessions(newSelected);
                        }}
                        className="rounded cursor-pointer"
                      />
                    </td>
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
                            ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 border border-green-300 dark:border-green-700'
                            : session.status === 'active'
                            ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 border border-blue-300 dark:border-blue-700'
                            : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 border border-yellow-300 dark:border-yellow-700'
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
                            className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 transition-colors"
                          >
                            Confirm
                          </button>
                          <button
                            onClick={() => setDeleteConfirm(null)}
                            className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-300 transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setDeleteConfirm(session.session_id)}
                          className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 p-1 transition-colors"
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

          {/* Bulk Actions Bar */}
          {selectedSessions.size > 0 && (
            <div className="sticky bottom-0 left-0 right-0 bg-blue-50 dark:bg-blue-900/20 border-t-2 border-blue-300 dark:border-blue-700 px-6 py-3 flex items-center justify-between z-10 shadow-lg">
              <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
                {selectedSessions.size} session{selectedSessions.size !== 1 ? 's' : ''} selected
              </span>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="danger"
                  onClick={handleBulkDelete}
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Delete ({selectedSessions.size})
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => setSelectedSessions(new Set())}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}

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

          {/* Keyboard shortcuts hint */}
          <div className="px-6 py-3 bg-gray-50 dark:bg-gray-800 text-xs text-secondary border-t border-default">
            💡 <strong>Keyboard shortcuts:</strong> Ctrl+E to export • R to refresh (Cmd on Mac)
          </div>
        </div>
      )}
    </div>
  );
};
