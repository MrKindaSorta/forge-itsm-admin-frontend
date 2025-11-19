import { AlertCircle, AlertTriangle, XCircle, ChevronDown, ChevronUp, RefreshCw } from 'lucide-react';
import { useState } from 'react';
import { formatDate } from '../lib/utils';

export interface SignupError {
  id: string;
  session_id: string;
  email: string | null;
  subdomain: string | null;
  error_type: 'provisioning' | 'stripe' | 'validation' | 'database' | 'network' | 'unknown';
  error_message: string;
  error_stack: string | null;
  created_at: string;
  resolved: boolean;
}

export interface ErrorStats {
  total: number;
  unresolved: number;
  byType: Record<string, number>;
}

interface ErrorTrackingWidgetProps {
  errors: SignupError[];
  stats: ErrorStats;
  onRefresh?: () => void;
  isLoading?: boolean;
}

const ERROR_TYPE_CONFIG = {
  provisioning: {
    label: 'Provisioning Failed',
    icon: AlertCircle,
    color: 'text-red-600 dark:text-red-400',
    bgColor: 'bg-red-50 dark:bg-red-900/20',
    borderColor: 'border-red-200 dark:border-red-800',
    description: 'Failed to create tenant database or initialize resources'
  },
  stripe: {
    label: 'Payment Failed',
    icon: AlertTriangle,
    color: 'text-orange-600 dark:text-orange-400',
    bgColor: 'bg-orange-50 dark:bg-orange-900/20',
    borderColor: 'border-orange-200 dark:border-orange-800',
    description: 'Stripe checkout or webhook processing error'
  },
  validation: {
    label: 'Validation Error',
    icon: XCircle,
    color: 'text-yellow-600 dark:text-yellow-400',
    bgColor: 'bg-yellow-50 dark:bg-yellow-900/20',
    borderColor: 'border-yellow-200 dark:border-yellow-800',
    description: 'Invalid input data or business rule violation'
  },
  database: {
    label: 'Database Error',
    icon: AlertCircle,
    color: 'text-purple-600 dark:text-purple-400',
    bgColor: 'bg-purple-50 dark:bg-purple-900/20',
    borderColor: 'border-purple-200 dark:border-purple-800',
    description: 'Database connection or query failure'
  },
  network: {
    label: 'Network Error',
    icon: AlertTriangle,
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-50 dark:bg-blue-900/20',
    borderColor: 'border-blue-200 dark:border-blue-800',
    description: 'API timeout or connection issue'
  },
  unknown: {
    label: 'Unknown Error',
    icon: XCircle,
    color: 'text-gray-600 dark:text-gray-400',
    bgColor: 'bg-gray-50 dark:bg-gray-900/20',
    borderColor: 'border-gray-200 dark:border-gray-800',
    description: 'Unclassified error type'
  }
};

export function ErrorTrackingWidget({ errors, stats, onRefresh, isLoading }: ErrorTrackingWidgetProps) {
  const [expandedError, setExpandedError] = useState<string | null>(null);

  const errorRate = stats.total > 0 ? ((stats.unresolved / stats.total) * 100).toFixed(1) : '0.0';
  const hasErrors = stats.unresolved > 0;

  return (
    <div className={`bg-card rounded-lg border ${hasErrors ? 'border-red-300 dark:border-red-800' : 'border-default'} p-4 transition-all ${hasErrors ? 'shadow-lg' : ''}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <AlertCircle className={`h-5 w-5 ${hasErrors ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`} />
          <h3 className="text-base font-semibold text-primary">System Health & Errors</h3>
        </div>
        {onRefresh && (
          <button
            onClick={onRefresh}
            disabled={isLoading}
            className="p-1.5 hover:bg-elevated rounded transition-colors"
            title="Refresh error data"
          >
            <RefreshCw className={`h-4 w-4 text-secondary ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        )}
      </div>

      {/* Status Banner */}
      {hasErrors ? (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <div className="flex items-center gap-2 mb-1">
            <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
            <span className="font-semibold text-red-900 dark:text-red-200">
              {stats.unresolved} Active Error{stats.unresolved !== 1 ? 's' : ''} Detected
            </span>
          </div>
          <p className="text-xs text-red-700 dark:text-red-300">
            Some signups are failing. Check errors below and take action to restore service.
          </p>
        </div>
      ) : (
        <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="font-medium text-green-900 dark:text-green-200">
              All Systems Operational
            </span>
          </div>
          <p className="text-xs text-green-700 dark:text-green-300 mt-1">
            No signup errors detected. Platform is functioning normally.
          </p>
        </div>
      )}

      {/* Error Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <div className="bg-elevated dark:bg-elevated/50 rounded-lg p-3">
          <p className="text-xs text-secondary mb-1">Total Errors</p>
          <p className="text-2xl font-bold text-primary">{stats.total}</p>
        </div>
        <div className="bg-elevated dark:bg-elevated/50 rounded-lg p-3">
          <p className="text-xs text-secondary mb-1">Unresolved</p>
          <p className={`text-2xl font-bold ${hasErrors ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
            {stats.unresolved}
          </p>
        </div>
        <div className="bg-elevated dark:bg-elevated/50 rounded-lg p-3">
          <p className="text-xs text-secondary mb-1">Error Rate</p>
          <p className="text-2xl font-bold text-primary">{errorRate}%</p>
        </div>
        <div className="bg-elevated dark:bg-elevated/50 rounded-lg p-3">
          <p className="text-xs text-secondary mb-1">Most Common</p>
          <p className="text-sm font-semibold text-primary truncate">
            {Object.entries(stats.byType).sort((a, b) => b[1] - a[1])[0]?.[0] || 'None'}
          </p>
        </div>
      </div>

      {/* Error Type Breakdown */}
      {Object.keys(stats.byType).length > 0 && (
        <div className="mb-4">
          <p className="text-xs font-medium text-secondary mb-2">Error Types</p>
          <div className="space-y-2">
            {Object.entries(stats.byType)
              .sort((a, b) => b[1] - a[1])
              .map(([type, count]) => {
                const config = ERROR_TYPE_CONFIG[type as keyof typeof ERROR_TYPE_CONFIG] || ERROR_TYPE_CONFIG.unknown;
                const Icon = config.icon;
                const percentage = ((count / stats.total) * 100).toFixed(0);

                return (
                  <div key={type} className="flex items-center gap-3">
                    <div className={`p-1.5 rounded ${config.bgColor}`}>
                      <Icon className={`h-3.5 w-3.5 ${config.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium text-primary">{config.label}</span>
                        <span className="text-xs text-secondary">{count} ({percentage}%)</span>
                      </div>
                      <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${config.bgColor} ${config.borderColor} border-l-2`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* Recent Errors List */}
      {errors.length > 0 && (
        <div>
          <p className="text-xs font-medium text-secondary mb-2">Recent Errors ({errors.length})</p>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {errors.map((error) => {
              const config = ERROR_TYPE_CONFIG[error.error_type] || ERROR_TYPE_CONFIG.unknown;
              const Icon = config.icon;
              const isExpanded = expandedError === error.id;

              return (
                <div
                  key={error.id}
                  className={`border rounded-lg ${config.borderColor} ${config.bgColor} overflow-hidden transition-all`}
                >
                  {/* Error Header */}
                  <div
                    className="p-3 cursor-pointer hover:opacity-80 transition-opacity"
                    onClick={() => setExpandedError(isExpanded ? null : error.id)}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-2 flex-1 min-w-0">
                        <Icon className={`h-4 w-4 ${config.color} flex-shrink-0 mt-0.5`} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`text-xs font-semibold ${config.color}`}>
                              {config.label}
                            </span>
                            {!error.resolved && (
                              <span className="text-[10px] px-1.5 py-0.5 bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 rounded font-medium">
                                ACTIVE
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-primary font-medium truncate" title={error.error_message}>
                            {error.error_message}
                          </p>
                          <div className="flex flex-wrap gap-3 mt-2 text-[10px] text-secondary">
                            {error.email && (
                              <span className="flex items-center gap-1">
                                <span className="font-medium">User:</span> {error.email}
                              </span>
                            )}
                            {error.subdomain && (
                              <span className="flex items-center gap-1">
                                <span className="font-medium">Subdomain:</span> {error.subdomain}
                              </span>
                            )}
                            <span className="flex items-center gap-1">
                              <span className="font-medium">Time:</span> {formatDate(error.created_at)}
                            </span>
                          </div>
                        </div>
                      </div>
                      <button className="flex-shrink-0 p-1">
                        {isExpanded ? (
                          <ChevronUp className="h-4 w-4 text-secondary" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-secondary" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Expanded Details */}
                  {isExpanded && (
                    <div className="px-3 pb-3 border-t border-default/50 pt-2 animate-in slide-in-from-top duration-200">
                      <div className="space-y-2">
                        <div>
                          <p className="text-[10px] font-medium text-secondary mb-1">Session ID</p>
                          <p className="text-xs font-mono text-primary bg-white/50 dark:bg-black/20 px-2 py-1 rounded">
                            {error.session_id}
                          </p>
                        </div>
                        {error.error_stack && (
                          <div>
                            <p className="text-[10px] font-medium text-secondary mb-1">Stack Trace</p>
                            <pre className="text-[10px] font-mono text-primary bg-white/50 dark:bg-black/20 px-2 py-1 rounded overflow-x-auto max-h-32 overflow-y-auto">
                              {error.error_stack}
                            </pre>
                          </div>
                        )}
                        <div>
                          <p className="text-[10px] font-medium text-secondary mb-1">Description</p>
                          <p className="text-xs text-secondary">{config.description}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Empty State */}
      {errors.length === 0 && stats.total === 0 && (
        <div className="text-center py-8">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-full mb-3">
            <AlertCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
          </div>
          <p className="text-sm font-medium text-primary mb-1">No Errors Detected</p>
          <p className="text-xs text-secondary">All signups are processing successfully</p>
        </div>
      )}
    </div>
  );
}
