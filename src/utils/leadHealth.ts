import type { LeadStatus } from '@/types';

const TERMINAL_STATUSES: LeadStatus[] = ['deal_closed', 'company_closed', 'rejected_phone', 'rejected_spot', 'wrong_number'];

export interface LeadHealth {
  score: number; // 0-100
  label: string;
  color: string;
  isOverdue: boolean;
  daysSinceUpdate: number;
}

export const calculateLeadHealth = (updatedAt: string, status: LeadStatus): LeadHealth => {
  if (TERMINAL_STATUSES.includes(status)) {
    return { score: 100, label: 'Complete', color: 'text-muted-foreground', isOverdue: false, daysSinceUpdate: 0 };
  }

  const now = new Date();
  const updated = new Date(updatedAt);
  const diffMs = now.getTime() - updated.getTime();
  const daysSinceUpdate = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (daysSinceUpdate <= 1) {
    return { score: 100, label: 'Fresh', color: 'text-success', isOverdue: false, daysSinceUpdate };
  }
  if (daysSinceUpdate <= 2) {
    return { score: 75, label: 'Good', color: 'text-info', isOverdue: false, daysSinceUpdate };
  }
  if (daysSinceUpdate <= 3) {
    return { score: 50, label: 'Aging', color: 'text-warning', isOverdue: false, daysSinceUpdate };
  }
  // 3+ days = overdue
  const score = Math.max(0, 25 - (daysSinceUpdate - 3) * 5);
  return { score, label: 'Overdue', color: 'text-destructive', isOverdue: true, daysSinceUpdate };
};
