import { useState } from 'react';
import { ChevronDown, ChevronUp, TrendingDown } from 'lucide-react';

interface FunnelStage {
  name: string;
  count: number;
  percentage: number;
  dropoff?: number;
}

interface FunnelWidgetProps {
  stages: FunnelStage[];
}

export function FunnelWidget({ stages }: FunnelWidgetProps) {
  const [showDetails, setShowDetails] = useState(false);

  // Calculate width percentages for visual funnel (relative to first stage)
  const maxCount = stages[0]?.count || 1;

  return (
    <div className="bg-card rounded-lg border border-default p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-base font-semibold text-primary">Conversion Funnel</h3>
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="text-xs text-primary-600 dark:text-primary-400 hover:underline flex items-center gap-1"
        >
          {showDetails ? (
            <>
              Hide Details <ChevronUp className="h-3 w-3" />
            </>
          ) : (
            <>
              Show Details <ChevronDown className="h-3 w-3" />
            </>
          )}
        </button>
      </div>

      {/* Integrated Funnel Visualization */}
      <div className="space-y-2">
        {stages.map((stage) => {
          const width = (stage.count / maxCount) * 100;
          const conversionColor =
            stage.percentage >= 75 ? 'bg-green-500' :
            stage.percentage >= 50 ? 'bg-yellow-500' :
            'bg-red-500';

          return (
            <div key={stage.name} className="space-y-1">
              {/* Funnel bar with stats */}
              <div className="flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div
                    className="relative h-12 bg-primary-100 dark:bg-primary-900/20 rounded-lg overflow-hidden transition-all"
                    style={{ width: `${Math.max(width, 20)}%` }}
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-primary-500 to-primary-600 opacity-80"></div>
                    <div className="relative h-full px-3 flex items-center justify-between text-white">
                      <span className="text-sm font-medium truncate">{stage.name}</span>
                      <span className="text-sm font-bold">{stage.count.toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-xs shrink-0">
                  <span className={`px-2 py-1 rounded font-medium text-white ${conversionColor}`}>
                    {stage.percentage.toFixed(1)}%
                  </span>
                  {stage.dropoff !== undefined && stage.dropoff > 0 && (
                    <span className="text-red-600 dark:text-red-400 flex items-center gap-1">
                      <TrendingDown className="h-3 w-3" />
                      {stage.dropoff}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Detailed Table (Expandable) */}
      {showDetails && (
        <div className="mt-4 pt-4 border-t border-default">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-default">
                  <th className="text-left py-2 px-3 font-medium text-secondary">Stage</th>
                  <th className="text-right py-2 px-3 font-medium text-secondary">Users</th>
                  <th className="text-right py-2 px-3 font-medium text-secondary">Conversion Rate</th>
                  <th className="text-right py-2 px-3 font-medium text-secondary">Dropoff</th>
                </tr>
              </thead>
              <tbody>
                {stages.map((stage) => {
                  const conversionColor =
                    stage.percentage >= 75 ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' :
                    stage.percentage >= 50 ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300' :
                    'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';

                  return (
                    <tr key={stage.name} className="border-b border-default last:border-0">
                      <td className="py-2 px-3 font-medium text-primary">{stage.name}</td>
                      <td className="py-2 px-3 text-right text-primary">{stage.count.toLocaleString()}</td>
                      <td className="py-2 px-3 text-right">
                        <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${conversionColor}`}>
                          {stage.percentage.toFixed(1)}%
                        </span>
                      </td>
                      <td className="py-2 px-3 text-right">
                        {stage.dropoff !== undefined && stage.dropoff > 0 ? (
                          <span className="text-red-600 dark:text-red-400 font-medium">
                            -{stage.dropoff.toLocaleString()}
                          </span>
                        ) : (
                          <span className="text-secondary">-</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
