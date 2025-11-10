import React, { useState, useEffect } from 'react';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, Users, MousePointerClick, AlertCircle, Clock } from 'lucide-react';
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

export const AnalyticsPage: React.FC = () => {
  const [funnelData, setFunnelData] = useState<FunnelData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [dateRange, setDateRange] = useState(30); // Default: last 30 days
  const [error, setError] = useState('');

  useEffect(() => {
    fetchAnalytics();
  }, [dateRange]);

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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-600">Loading analytics...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center">
          <AlertCircle className="h-5 w-5 text-red-600 mr-2" />
          <p className="text-red-800">{error}</p>
        </div>
      </div>
    );
  }

  if (!funnelData) {
    return <div>No data available</div>;
  }

  // Colors for charts
  const COLORS = ['#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444'];

  // Prepare abandonment data for pie chart
  const abandonmentData = funnelData.abandonment.map((item) => ({
    name: item.current_stage.replace(/_/g, ' ').toUpperCase(),
    value: item.count,
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Signup Funnel Analytics</h1>
          <p className="text-gray-600 mt-1">Track conversion metrics and user behavior</p>
        </div>

        {/* Date Range Selector */}
        <div className="flex gap-2">
          {[7, 30, 90].map((days) => (
            <Button
              key={days}
              onClick={() => setDateRange(days)}
              variant={dateRange === days ? 'primary' : 'secondary'}
              size="sm"
            >
              {days} Days
            </Button>
          ))}
        </div>
      </div>

      {/* Summary Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Clicks</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">
                {funnelData.summary.totalClicks.toLocaleString()}
              </p>
            </div>
            <div className="h-12 w-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <MousePointerClick className="h-6 w-6 text-purple-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Conversions</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">
                {funnelData.summary.totalConversions.toLocaleString()}
              </p>
            </div>
            <div className="h-12 w-12 bg-green-100 rounded-lg flex items-center justify-center">
              <Users className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Conversion Rate</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">
                {funnelData.summary.conversionRate}%
              </p>
            </div>
            <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Funnel Visualization */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Conversion Funnel</h2>
        <ResponsiveContainer width="100%" height={400}>
          <BarChart
            data={funnelData.stages}
            layout="vertical"
            margin={{ top: 20, right: 30, left: 120, bottom: 20 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" />
            <YAxis dataKey="name" type="category" width={100} />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload as FunnelStage;
                  return (
                    <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-lg">
                      <p className="font-semibold text-gray-900">{data.name}</p>
                      <p className="text-sm text-gray-600">Count: {data.count.toLocaleString()}</p>
                      <p className="text-sm text-gray-600">Rate: {data.percentage}%</p>
                      {data.dropoff > 0 && (
                        <p className="text-sm text-red-600">Dropoff: {data.dropoff.toLocaleString()}</p>
                      )}
                    </div>
                  );
                }
                return null;
              }}
            />
            <Legend />
            <Bar dataKey="count" fill="#8b5cf6" name="Users" />
          </BarChart>
        </ResponsiveContainer>

        {/* Funnel Stats Table */}
        <div className="mt-6 overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Stage
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Users
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Conversion Rate
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Dropoff
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {funnelData.stages.map((stage, index) => (
                <tr key={index}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {stage.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {stage.count.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        stage.percentage >= 75
                          ? 'bg-green-100 text-green-800'
                          : stage.percentage >= 50
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {stage.percentage}%
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {stage.dropoff > 0 ? (
                      <span className="text-red-600">-{stage.dropoff.toLocaleString()}</span>
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
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Abandonment Breakdown</h2>
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
                    <span className="text-gray-700">{item.name}</span>
                  </div>
                  <span className="font-medium text-gray-900">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Source Attribution */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Top Performing Sources</h2>
          <div className="space-y-3">
            {funnelData.sourceAttribution.slice(0, 5).map((source, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">{source.first_page}</p>
                  <p className="text-xs text-gray-500">{source.first_button}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-gray-900">{source.conversions} conversions</p>
                  <p className="text-xs text-gray-500">
                    {source.conversion_rate}% rate ({source.sessions} sessions)
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Insights & Recommendations */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <div className="flex items-start">
          <Clock className="h-6 w-6 text-blue-600 mr-3 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="text-lg font-semibold text-blue-900 mb-2">Insights</h3>
            <ul className="space-y-2 text-sm text-blue-800">
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
    </div>
  );
};
