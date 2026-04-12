import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useMyTargets } from '@/hooks/useSalesTargets';
import { useDashboardStats } from '@/hooks/useDashboardStats';
import { Target, TrendingUp, Phone, Calendar } from 'lucide-react';

const RepKPICards: React.FC = () => {
  const { data: targets } = useMyTargets();
  const { data: stats } = useDashboardStats();

  const currentTarget = targets?.[0];
  const progress = currentTarget
    ? Math.min(100, Math.round((currentTarget.actual_count / Math.max(1, currentTarget.target_count)) * 100))
    : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Target className="h-5 w-5 text-primary" />
          My KPI Progress
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {currentTarget ? (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Target Progress</span>
              <span className="font-medium">{currentTarget.actual_count} / {currentTarget.target_count}</span>
            </div>
            <Progress value={progress} className="h-3" />
            <p className="text-xs text-muted-foreground">
              Period: {new Date(currentTarget.period_start).toLocaleDateString()} – {new Date(currentTarget.period_end).toLocaleDateString()}
            </p>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No active targets set.</p>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-lg border p-3 text-center">
            <TrendingUp className="h-5 w-5 mx-auto text-success mb-1" />
            <p className="text-xl font-bold">{stats?.dealsClosed || 0}</p>
            <p className="text-xs text-muted-foreground">Deals Closed</p>
          </div>
          <div className="rounded-lg border p-3 text-center">
            <Calendar className="h-5 w-5 mx-auto text-info mb-1" />
            <p className="text-xl font-bold">{stats?.meetingsToday || 0}</p>
            <p className="text-xs text-muted-foreground">Meetings Today</p>
          </div>
          <div className="rounded-lg border p-3 text-center">
            <Phone className="h-5 w-5 mx-auto text-warning mb-1" />
            <p className="text-xl font-bold">{stats?.followupsDue || 0}</p>
            <p className="text-xs text-muted-foreground">Follow-ups Due</p>
          </div>
          <div className="rounded-lg border p-3 text-center">
            <TrendingUp className="h-5 w-5 mx-auto text-primary mb-1" />
            <p className="text-xl font-bold">{stats?.leadsThisWeek || 0}</p>
            <p className="text-xs text-muted-foreground">Leads This Week</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default RepKPICards;
