import { AlertCircle } from 'lucide-react';

interface FunnelStage {
  name: string;
  count: number;
  percentage: number;
  dropoff?: number;
}

interface FunnelWidgetProps {
  stages: FunnelStage[];
}

// Consolidate 7 stages into 5 for cleaner display
function consolidateStages(stages: FunnelStage[]): FunnelStage[] {
  // Stage mapping for consolidation
  const stageMapping: Record<string, string> = {
    'Button Clicks': 'Button Clicks',
    'Started': 'Plan Selected',
    'Plan Selected': 'Plan Selected',
    'Account Created': 'Account Setup',
    'Company Info': 'Account Setup',
    'Stripe Redirect': 'Stripe Checkout',
    'Provisioned': 'Provisioned',
  };

  const consolidated: Record<string, FunnelStage> = {};

  stages.forEach((stage) => {
    // Find matching mapping key
    let mappedName = stageMapping[stage.name];

    // If no exact match, try partial matching
    if (!mappedName) {
      for (const [key, value] of Object.entries(stageMapping)) {
        if (stage.name.includes(key) || key.includes(stage.name)) {
          mappedName = value;
          break;
        }
      }
    }

    // Fallback to original name if no mapping found
    const newName = mappedName || stage.name;

    if (consolidated[newName]) {
      // Keep the higher count (represents completion of that phase)
      if (stage.count > consolidated[newName].count) {
        consolidated[newName] = { ...stage, name: newName };
      }
    } else {
      consolidated[newName] = { ...stage, name: newName };
    }
  });

  // Convert to array and sort by percentage descending
  const result = Object.values(consolidated).sort((a, b) => b.percentage - a.percentage);

  // Recalculate dropoffs between consolidated stages
  result.forEach((stage, i) => {
    if (i > 0) {
      stage.dropoff = result[i - 1].count - stage.count;
    } else {
      stage.dropoff = 0;
    }
  });

  return result;
}

export function FunnelWidget({ stages }: FunnelWidgetProps) {
  if (!stages || stages.length === 0) {
    return (
      <div className="bg-card rounded-lg border border-default p-4">
        <h3 className="text-base font-semibold text-primary mb-2">Conversion Funnel</h3>
        <p className="text-sm text-secondary">No funnel data available</p>
      </div>
    );
  }

  const consolidatedStages = consolidateStages(stages);
  const firstStage = consolidatedStages[0];
  const lastStage = consolidatedStages[consolidatedStages.length - 1];
  const overallRate = lastStage.percentage;

  return (
    <div className="bg-card rounded-lg border border-default p-4">
      {/* Header with summary */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
        <h3 className="text-base font-semibold text-primary">Conversion Funnel</h3>
        <span className="text-sm text-secondary">
          {firstStage.count.toLocaleString()} → {lastStage.count.toLocaleString()} ({overallRate.toFixed(1)}% converted)
        </span>
      </div>

      {/* Funnel stages as list */}
      <div className="space-y-0">
        {consolidatedStages.map((stage, index) => {
          const isLast = index === consolidatedStages.length - 1;

          // Calculate drop-off rate to next stage
          const dropoffCount = stage.dropoff || 0;
          const dropoffRate = stage.count > 0 ? ((dropoffCount / stage.count) * 100) : 0;
          const isSignificantDrop = dropoffRate > 25;
          const isCriticalDrop = dropoffRate > 40;

          return (
            <div key={stage.name}>
              {/* Stage row */}
              <div className="flex items-center justify-between py-2 px-1">
                {/* Left side: Circle + Name */}
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="w-3 h-3 rounded-full bg-primary-600 dark:bg-primary-500 flex-shrink-0" />
                  <span className="font-medium text-sm text-primary truncate">
                    {stage.name}
                  </span>
                </div>

                {/* Right side: Count + Percentage + Dropoff */}
                <div className="flex items-center gap-3 sm:gap-4 flex-shrink-0 text-sm">
                  <span className="font-semibold text-primary">
                    {stage.count.toLocaleString()}
                  </span>
                  <span className="text-secondary w-12 text-right">
                    {stage.percentage.toFixed(0)}%
                  </span>
                  {!isLast && dropoffRate > 0 && (
                    <span className="text-red-600 dark:text-red-400 w-16 text-right font-medium">
                      ↓{dropoffRate.toFixed(0)}%
                    </span>
                  )}
                </div>
              </div>

              {/* Connector line + warning (if not last stage) */}
              {!isLast && (
                <div className="flex items-center gap-3 py-1 px-1">
                  {/* Connector line */}
                  <div className="w-3 flex justify-center">
                    <div
                      className={`w-0.5 h-4 ${
                        isCriticalDrop
                          ? 'bg-red-600 dark:bg-red-500'
                          : isSignificantDrop
                          ? 'bg-orange-500 dark:bg-orange-400'
                          : 'bg-gray-300 dark:bg-gray-600'
                      }`}
                    />
                  </div>

                  {/* Warning label */}
                  {isSignificantDrop && (
                    <div className="flex items-center gap-2 text-xs">
                      {isCriticalDrop ? (
                        <>
                          <AlertCircle className="h-3.5 w-3.5 text-red-600 dark:text-red-400" />
                          <span className="text-red-600 dark:text-red-400 font-medium">
                            Critical drop-off
                          </span>
                        </>
                      ) : (
                        <>
                          <span className="text-orange-600 dark:text-orange-400">⚠️</span>
                          <span className="text-orange-600 dark:text-orange-400 font-medium">
                            Significant drop-off
                          </span>
                        </>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
