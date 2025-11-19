import { AlertCircle, TrendingDown } from 'lucide-react';
import { useState, useEffect } from 'react';

interface FunnelStage {
  name: string;
  count: number;
  percentage: number;
  dropoff?: number;
}

interface FunnelWidgetProps {
  stages: FunnelStage[];
  previousStages?: FunnelStage[];
}

// Stage descriptions for user clarity (simplified)
const STAGE_DESCRIPTIONS: Record<string, string> = {
  'Button Clicks': 'Clicked signup button',
  'Plan Selected': 'Selected pricing plan',
  'Account Setup': 'Completed account info',
  'Stripe Checkout': 'Completed payment',
  'Provisioned': 'Account created',
};

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
  const [animationComplete, setAnimationComplete] = useState(false);

  useEffect(() => {
    // Trigger cascade animation
    const timer = setTimeout(() => setAnimationComplete(true), 100);
    return () => clearTimeout(timer);
  }, [stages]);

  if (!stages || stages.length === 0) {
    return (
      <div className="bg-card rounded-lg border border-default p-4">
        <h3 className="text-lg font-semibold text-primary mb-2">Conversion Funnel</h3>
        <p className="text-sm text-secondary">No funnel data available</p>
      </div>
    );
  }

  const consolidatedStages = consolidateStages(stages);
  const firstStage = consolidatedStages[0];
  const lastStage = consolidatedStages[consolidatedStages.length - 1];
  const overallRate = lastStage.percentage;

  // Get health color based on percentage
  const getHealthColor = (percentage: number): string => {
    if (percentage >= 70) return 'text-green-600 dark:text-green-400';
    if (percentage >= 40) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  // Get background color based on percentage
  const getBgColor = (percentage: number): string => {
    if (percentage >= 70) return 'bg-green-50 dark:bg-green-900/20';
    if (percentage >= 40) return 'bg-yellow-50 dark:bg-yellow-900/20';
    return 'bg-red-50 dark:bg-red-900/20';
  };

  return (
    <div className="bg-card rounded-lg border border-default p-4 lg:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-6">
        <h3 className="text-lg font-semibold text-primary">Conversion Funnel</h3>
        <div className="text-sm">
          <span className="text-secondary">Overall: </span>
          <span className={`font-bold text-lg ${getHealthColor(overallRate)}`}>
            {overallRate.toFixed(1)}%
          </span>
          <span className="text-secondary text-xs ml-1">
            ({lastStage.count} of {firstStage.count})
          </span>
        </div>
      </div>

      {/* Simplified Funnel Stages - Vertical List */}
      <div className="space-y-3">
        {consolidatedStages.map((stage, index) => {
          const isLast = index === consolidatedStages.length - 1;
          const dropoffCount = stage.dropoff || 0;
          const dropoffRate = index > 0 && consolidatedStages[index - 1].count > 0
            ? ((dropoffCount / consolidatedStages[index - 1].count) * 100)
            : 0;
          const isHighDropoff = dropoffRate > 30;

          return (
            <div
              key={stage.name}
              className={`transform transition-all duration-500 ${
                animationComplete ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
              }`}
              style={{ transitionDelay: `${index * 80}ms` }}
            >
              {/* Stage Card */}
              <div className={`p-4 rounded-lg border ${getBgColor(stage.percentage)} ${isHighDropoff && !isLast ? 'border-red-300 dark:border-red-800' : 'border-default'}`}>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  {/* Left: Stage Name & Description */}
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-primary text-base mb-1">
                      {stage.name}
                    </h4>
                    <p className="text-xs text-secondary">
                      {STAGE_DESCRIPTIONS[stage.name] || 'Signup stage'}
                    </p>
                  </div>

                  {/* Right: Key Numbers */}
                  <div className="flex items-center gap-4 sm:gap-6 flex-shrink-0">
                    {/* Count */}
                    <div className="text-center">
                      <p className="text-xs text-secondary mb-1">Users</p>
                      <p className="text-2xl font-bold text-primary">
                        {stage.count.toLocaleString()}
                      </p>
                    </div>

                    {/* Percentage of Total */}
                    <div className="text-center">
                      <p className="text-xs text-secondary mb-1">% of Total</p>
                      <p className={`text-2xl font-bold ${getHealthColor(stage.percentage)}`}>
                        {stage.percentage.toFixed(0)}%
                      </p>
                    </div>

                    {/* Drop-off */}
                    {!isLast && (
                      <div className="text-center">
                        <p className="text-xs text-secondary mb-1">Dropped</p>
                        <p className={`text-2xl font-bold ${dropoffRate > 30 ? 'text-red-600 dark:text-red-400' : 'text-yellow-600 dark:text-yellow-400'}`}>
                          {dropoffRate.toFixed(0)}%
                        </p>
                        <p className="text-[10px] text-secondary mt-0.5">
                          ({dropoffCount.toLocaleString()} users)
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* High Drop-off Warning */}
                {isHighDropoff && !isLast && (
                  <div className="mt-3 pt-3 border-t border-red-200 dark:border-red-800 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400 flex-shrink-0" />
                    <p className="text-xs text-red-700 dark:text-red-300 font-medium">
                      High drop-off detected - {dropoffCount.toLocaleString()} users lost at this stage
                    </p>
                  </div>
                )}
              </div>

              {/* Connector Arrow */}
              {!isLast && (
                <div className="flex items-center justify-center py-2">
                  <TrendingDown className={`h-5 w-5 ${isHighDropoff ? 'text-red-500' : 'text-gray-400'}`} />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Health Legend */}
      <div className="mt-6 pt-4 border-t border-default flex flex-wrap gap-4 text-xs">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-green-500"></div>
          <span className="text-secondary">Healthy (70%+)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
          <span className="text-secondary">Warning (40-70%)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-red-500"></div>
          <span className="text-secondary">Critical (&lt;40%)</span>
        </div>
      </div>
    </div>
  );
}
