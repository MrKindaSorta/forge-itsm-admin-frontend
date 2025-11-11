import { useState } from 'react';
import type { ReactNode } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface ExpandableSectionProps {
  title: string;
  children: ReactNode;
  defaultExpanded?: boolean;
  badge?: string | number;
}

export function ExpandableSection({
  title,
  children,
  defaultExpanded = false,
  badge
}: ExpandableSectionProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  return (
    <div className="bg-card rounded-lg border border-default">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-elevated transition-colors"
      >
        <div className="flex items-center gap-2">
          <h3 className="text-base font-semibold text-primary">{title}</h3>
          {badge !== undefined && (
            <span className="px-2 py-0.5 text-xs font-medium bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 rounded-full">
              {badge}
            </span>
          )}
        </div>
        {isExpanded ? (
          <ChevronUp className="h-4 w-4 text-secondary" />
        ) : (
          <ChevronDown className="h-4 w-4 text-secondary" />
        )}
      </button>

      {isExpanded && (
        <div className="px-4 pb-4 pt-2 border-t border-default">
          {children}
        </div>
      )}
    </div>
  );
}
