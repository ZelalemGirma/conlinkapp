import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Users, TrendingUp, MessageSquare, Clock } from 'lucide-react';

interface ReportKPICardsProps {
  totalLeads: number;
  conversionRate: string;
  interactionCount: number;
  avgApprovalDays: string;
  successRate: string;
  isLoading: boolean;
}

const ReportKPICards: React.FC<ReportKPICardsProps> = ({
  totalLeads,
  conversionRate,
  interactionCount,
  avgApprovalDays,
  successRate,
  isLoading,
}) => {
  const cards = [
    { label: 'Total Leads', value: isLoading ? '—' : String(totalLeads), icon: Users, color: 'bg-primary/10 text-primary' },
    { label: 'Conversion Rate', value: isLoading ? '—' : `${conversionRate}%`, icon: TrendingUp, color: 'bg-success/10 text-success' },
    { label: 'Interactions', value: isLoading ? '—' : String(interactionCount), icon: MessageSquare, color: 'bg-info/10 text-info' },
    { label: 'Avg. Approval Time', value: isLoading ? '—' : `${avgApprovalDays}d`, icon: Clock, color: 'bg-warning/10 text-warning' },
    { label: 'Success Rate', value: isLoading ? '—' : `${successRate}%`, icon: TrendingUp, color: 'bg-success/10 text-success' },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
      {cards.map(c => (
        <Card key={c.label}>
          <CardContent className="pt-4 pb-4 flex items-center gap-3">
            <div className={`h-10 w-10 rounded-lg flex items-center justify-center shrink-0 ${c.color.split(' ')[0]}`}>
              <c.icon className={`h-5 w-5 ${c.color.split(' ')[1]}`} />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground truncate">{c.label}</p>
              <p className="text-xl font-bold">{c.value}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default ReportKPICards;
