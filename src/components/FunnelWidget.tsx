import { AlertCircle, Info, ChevronDown, ChevronUp } from 'lucide-react';
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

// Stage descriptions for user clarity
const STAGE_DESCRIPTIONS: Record<string, string> = {
  'Button Clicks': 'User clicked a "Get Started" or signup CTA button on the marketing website',
  'Step 1 Started': 'User landed on the signup form and began the process',
  'Step 1 Completed': 'User selected a pricing plan (Starter/Professional/Business)',
  'Plan Selected': 'User selected a pricing plan (Starter/Professional/Business)',
  'Step 2 Completed': 'User entered their name, email, and password',
  'Account Created': 'User entered their name, email, and password',
  'Step 3 Completed': 'User entered company name and chose their subdomain',
  'Company Info': 'User entered company name and chose their subdomain',
  'Account Setup': 'User completed account details and company information',
  'Stripe Redirect': 'User was redirected to Stripe checkout page for payment',
  'Stripe Checkout': 'User was sent to Stripe and completed payment/trial signup',
  'Provisioned': 'System automatically created their database and ITSM instance',
};

// Industry benchmarks (for comparison)
const STAGE_BENCHMARKS: Record<string, number> = {
  'Button Clicks': 100,
  'Plan Selected': 75,
  'Account Setup': 60,
  'Stripe Checkout': 50,
  'Provisioned': 45,
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

export function FunnelWidget({ stages, previousStages }: FunnelWidgetProps) {
  const [expandedStage, setExpandedStage] = useState<string | null>(null);
  const [animationComplete, setAnimationComplete] = useState(false);

  useEffect(() => {
    // Trigger cascade animation
    const timer = setTimeout(() => setAnimationComplete(true), 100);
    return () => clearTimeout(timer);
  }, [stages]);

  if (!stages || stages.length === 0) {
    return (
      <div className="bg-card rounded-lg border border-default p-4">
        <h3 className="text-base font-semibold text-primary mb-2">Conversion Funnel</h3>
        <p className="text-sm text-secondary">No funnel data available</p>
      </div>
    );
  }

  const consolidatedStages = consolidateStages(stages);
  const previousConsolidated = previousStages ? consolidateStages(previousStages) : undefined;
  const firstStage = consolidatedStages[0];
  const lastStage = consolidatedStages[consolidatedStages.length - 1];
  const overallRate = lastStage.percentage;

  // Calculate stage-to-stage conversion rate
  const getStageConversionRate = (currentStage: FunnelStage, prevStageIndex: number): number => {
    if (prevStageIndex < 0) return 100;
    const prevStage = consolidatedStages[prevStageIndex];
    return prevStage.count > 0 ? (currentStage.count / prevStage.count) * 100 : 0;
  };

  // Get percentage change from previous period
  const getStageChange = (current: FunnelStage): { change: number; isImprovement: boolean } | null => {
    if (!previousConsolidated) return null;
    const previous = previousConsolidated.find(s => s.name === current.name);
    if (!previous) return null;
    const change = ((current.count - previous.count) / previous.count) * 100;
    return { change: Math.abs(change), isImprovement: change > 0 };
  };

  // Get gradient color based on percentage
  const getGradientColor = (percentage: number): string => {
    if (percentage >= 80) return 'from-green-500 to-green-400';
    if (percentage >= 60) return 'from-blue-500 to-blue-400';
    if (percentage >= 40) return 'from-yellow-500 to-yellow-400';
    if (percentage >= 20) return 'from-orange-500 to-orange-400';
    return 'from-red-500 to-red-400';
  };

  // Compare against benchmark
  const getBenchmarkComparison = (stageName: string, percentage: number): { diff: number; isGood: boolean } | null => {
    const benchmark = STAGE_BENCHMARKS[stageName];
    if (!benchmark) return null;
    const diff = percentage - benchmark;
    return { diff: Math.abs(diff), isGood: diff >= 0 };
  };

  return (
    <div className="bg-card rounded-lg border border-default p-4 transition-all hover:shadow-md">
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
          const isExpanded = expandedStage === stage.name;

          // Calculate drop-off rate to next stage
          const dropoffCount = stage.dropoff || 0;
          const dropoffRate = stage.count > 0 ? ((dropoffCount / stage.count) * 100) : 0;
          const isSignificantDrop = dropoffRate > 25;
          const isCriticalDrop = dropoffRate > 40;

          // Stage-to-stage conversion
          const stageConversionRate = getStageConversionRate(stage, index - 1);

          // Change from previous period
          const stageChange = getStageChange(stage);

          // Benchmark comparison
          const benchmarkComp = getBenchmarkComparison(stage.name, stage.percentage);

          return (
            <div
              key={stage.name}
              className={`transform transition-all duration-500 ${
                animationComplete
                  ? 'opacity-100 translate-x-0'
                  : 'opacity-0 -translate-x-8'
              }`}
              style={{ transitionDelay: `${index * 100}ms` }}
            >
              {/* Stage row */}
              <div
                className="flex items-center justify-between py-2 px-2 rounded hover:bg-elevated/50 dark:hover:bg-elevated/30 cursor-pointer transition-all"
                onClick={() => setExpandedStage(isExpanded ? null : stage.name)}
              >
                {/* Left side: Progress bar + Name + Info tooltip */}
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  {/* Enhanced gradient progress bar */}
                  <div className="relative w-32 h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden flex-shrink-0">
                    <div
                      className={`h-full bg-gradient-to-r ${getGradientColor(stage.percentage)} transition-all duration-500`}
                      style={{
                        width: `${stage.percentage}%`,
                      }}
                    />
                    {/* Benchmark indicator line */}
                    {benchmarkComp && STAGE_BENCHMARKS[stage.name] && (
                      <div
                        className="absolute top-0 bottom-0 w-0.5 bg-white opacity-60"
                        style={{ left: `${STAGE_BENCHMARKS[stage.name]}%` }}
                        title={`Benchmark: ${STAGE_BENCHMARKS[stage.name]}%`}
                      />
                    )}
                  </div>

                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <span className="font-medium text-sm text-primary truncate">
                      {stage.name}
                    </span>
                    {STAGE_DESCRIPTIONS[stage.name] && (
                      <div className="group relative flex-shrink-0">
                        <Info className="h-3.5 w-3.5 text-secondary hover:text-primary cursor-help transition-colors" />
                        <div className="absolute left-0 top-5 z-50 hidden group-hover:block w-64 p-2 bg-elevated border border-default rounded-lg shadow-lg">
                          <p className="text-xs text-secondary leading-relaxed">
                            {STAGE_DESCRIPTIONS[stage.name]}
                          </p>
                        </div>
                      </div>
                    )}
                    {isExpanded ? (
                      <ChevronUp className="h-4 w-4 text-secondary flex-shrink-0" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-secondary flex-shrink-0" />
                    )}
                  </div>
                </div>

                {/* Right side: Count + Percentage + Dropoff + Change */}
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
                  {stageChange && (
                    <span className={`text-xs w-12 text-right ${stageChange.isImprovement ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                      {stageChange.isImprovement ? '↗' : '↘'} {stageChange.change.toFixed(0)}%
                    </span>
                  )}
                </div>
              </div>

              {/* Expanded details */}
              {isExpanded && (
                <div className="mt-2 mb-3 p-3 bg-elevated dark:bg-elevated/50 rounded border border-default space-y-3 text-xs animate-in slide-in-from-top duration-200">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div>
                      <p className="text-secondary mb-1">Users at Stage</p>
                      <p className="font-bold text-primary text-lg">{stage.count.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-secondary mb-1">Completion Rate</p>
                      <p className="font-bold text-primary text-lg">{stage.percentage.toFixed(1)}%</p>
                    </div>
                    {!isLast && (
                      <>
                        <div>
                          <p className="text-secondary mb-1">Drop-off Count</p>
                          <p className="font-bold text-red-600 dark:text-red-400 text-lg">{dropoffCount.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-secondary mb-1">Drop-off Rate</p>
                          <p className="font-bold text-red-600 dark:text-red-400 text-lg">{dropoffRate.toFixed(1)}%</p>
                        </div>
                      </>
                    )}
                  </div>

                  {benchmarkComp && (
                    <div className="pt-2 border-t border-default">
                      <div className="flex items-center justify-between">
                        <span className="text-secondary">vs Industry Benchmark:</span>
                        <span className={`font-medium ${benchmarkComp.isGood ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                          {benchmarkComp.isGood ? '↗' : '↘'} {benchmarkComp.diff.toFixed(1)}% {benchmarkComp.isGood ? 'above' : 'below'}
                        </span>
                      </div>
                    </div>
                  )}

                  {stageChange && (
                    <div className="pt-2 border-t border-default">
                      <div className="flex items-center justify-between">
                        <span className="text-secondary">Change from Previous Period:</span>
                        <span className={`font-medium ${stageChange.isImprovement ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                          {stageChange.isImprovement ? '↗' : '↘'} {stageChange.change.toFixed(1)}% ({stageChange.isImprovement ? 'Improving' : 'Declining'})
                        </span>
                      </div>
                    </div>
                  )}

                  {index > 0 && (
                    <div className="pt-2 border-t border-default">
                      <div className="flex items-center justify-between">
                        <span className="text-secondary">Stage-to-Stage Conversion:</span>
                        <span className={`font-medium ${stageConversionRate >= 70 ? 'text-green-600 dark:text-green-400' : stageConversionRate >= 50 ? 'text-yellow-600 dark:text-yellow-400' : 'text-red-600 dark:text-red-400'}`}>
                          {stageConversionRate.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Connector line + warning (if not last stage) */}
              {!isLast && (
                <div className="flex items-center gap-3 py-1 px-2">
                  {/* Connector line */}
                  <div className="w-32 flex justify-center">
                    <div
                      className={`w-0.5 h-4 transition-colors ${
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
                            Critical drop-off - {dropoffCount.toLocaleString()} users lost
                          </span>
                        </>
                      ) : (
                        <>
                          <span className="text-orange-600 dark:text-orange-400">⚠️</span>
                          <span className="text-orange-600 dark:text-orange-400 font-medium">
                            Significant drop-off - {dropoffCount.toLocaleString()} users lost
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

      {/* Legend */}
      <div className="mt-4 pt-3 border-t border-default flex flex-wrap gap-4 text-xs text-secondary">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-gradient-to-r from-green-500 to-green-400"></div>
          <span>Excellent (80%+)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-gradient-to-r from-blue-500 to-blue-400"></div>
          <span>Good (60-80%)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-gradient-to-r from-yellow-500 to-yellow-400"></div>
          <span>Fair (40-60%)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-gradient-to-r from-red-500 to-red-400"></div>
          <span>Needs Improvement (<40%)</span>
        </div>
      </div>
    </div>
  );
}
