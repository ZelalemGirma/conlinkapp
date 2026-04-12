import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { useMyTargets } from '@/hooks/useSalesTargets';
import { useDashboardStats } from '@/hooks/useDashboardStats';
import { Trophy, Target, TrendingUp } from 'lucide-react';

const MotivationBoard: React.FC = () => {
  const [open, setOpen] = useState(false);
  const { data: targets } = useMyTargets();
  const { data: stats } = useDashboardStats();

  useEffect(() => {
    const shown = sessionStorage.getItem('motivation_shown');
    if (!shown && stats) {
      setOpen(true);
      sessionStorage.setItem('motivation_shown', 'true');
    }
  }, [stats]);

  const currentTarget = targets?.[0];
  const progress = currentTarget
    ? Math.min(100, Math.round((currentTarget.actual_count / Math.max(1, currentTarget.target_count)) * 100))
    : 0;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-primary">
            <Trophy className="h-5 w-5" />
            Daily Motivation
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-6 py-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-secondary">{stats?.totalLeads || 0}</p>
            <p className="text-sm text-muted-foreground">Total Leads</p>
          </div>

          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-xl font-bold text-success">{stats?.dealsClosed || 0}</p>
              <p className="text-xs text-muted-foreground">Deals Closed</p>
            </div>
            <div>
              <p className="text-xl font-bold text-info">{stats?.meetingsToday || 0}</p>
              <p className="text-xs text-muted-foreground">Meetings Today</p>
            </div>
            <div>
              <p className="text-xl font-bold text-warning">{stats?.followupsDue || 0}</p>
              <p className="text-xs text-muted-foreground">Follow-ups</p>
            </div>
          </div>

          {currentTarget && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-1">
                  <Target className="h-4 w-4 text-primary" />
                  Current Target
                </span>
                <span className="font-medium">
                  {currentTarget.actual_count} / {currentTarget.target_count}
                </span>
              </div>
              <Progress value={progress} className="h-3" />
              <p className="text-xs text-center text-muted-foreground">
                {progress >= 100 ? '🎉 Target achieved! Amazing!' :
                  progress >= 75 ? '🔥 Almost there! Keep pushing!' :
                    progress >= 50 ? '💪 Halfway! Stay focused!' :
                      '🚀 Let\'s get it done today!'}
              </p>
            </div>
          )}

          {!currentTarget && (
            <div className="text-center text-sm text-muted-foreground">
              <TrendingUp className="h-8 w-8 mx-auto mb-2 text-primary/50" />
              No active target set. Ask your manager!
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default MotivationBoard;
