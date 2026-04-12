import React from 'react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { calculateLeadHealth } from '@/utils/leadHealth';
import type { LeadStatus } from '@/types';
import { AlertCircle, CheckCircle2, Clock, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  updatedAt: string;
  status: string;
}

const iconMap = {
  Fresh: CheckCircle2,
  Good: CheckCircle2,
  Aging: Clock,
  Overdue: AlertCircle,
  Complete: CheckCircle2,
};

const LeadHealthIndicator: React.FC<Props> = ({ updatedAt, status }) => {
  const health = calculateLeadHealth(updatedAt, status as LeadStatus);
  const Icon = iconMap[health.label as keyof typeof iconMap] || AlertTriangle;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className={cn('inline-flex items-center gap-1', health.color)}>
          <Icon className="h-4 w-4" />
          {health.isOverdue && (
            <span className="text-[10px] font-bold bg-destructive text-destructive-foreground px-1.5 py-0.5 rounded-full">
              {health.daysSinceUpdate}d
            </span>
          )}
        </span>
      </TooltipTrigger>
      <TooltipContent>
        <p className="text-xs">
          {health.label} — {health.daysSinceUpdate} day{health.daysSinceUpdate !== 1 ? 's' : ''} since last update
          {health.isOverdue && ' ⚠️ Needs attention!'}
        </p>
      </TooltipContent>
    </Tooltip>
  );
};

export default LeadHealthIndicator;
