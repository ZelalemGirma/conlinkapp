import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { useDashboardStats, useSpotlightRep } from '@/hooks/useDashboardStats';
import { ClipboardList, TrendingUp, Calendar, AlertTriangle, Star } from 'lucide-react';
import RepKPICards from '@/components/dashboard/RepKPICards';
import TeamPerformanceChart from '@/components/dashboard/TeamPerformanceChart';
import StatusPieChart from '@/components/dashboard/StatusPieChart';
import GoldenSpotlightControl from '@/components/dashboard/GoldenSpotlightControl';
import MotivationBoard from '@/components/dashboard/MotivationBoard';
import { Skeleton } from '@/components/ui/skeleton';

const StatCard = ({ title, value, subtitle, icon: Icon, color }: {
  title: string; value: string | number; subtitle?: string; icon: React.ElementType; color?: string;
}) => (
  <Card>
    <CardHeader className="flex flex-row items-center justify-between pb-2">
      <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
      <Icon className={`h-5 w-5 ${color || 'text-primary'}`} />
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold">{value}</div>
      {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
    </CardContent>
  </Card>
);

const Dashboard = () => {
  const { role, user } = useAuth();
  const { data: stats, isLoading } = useDashboardStats();
  const { data: spotlight } = useSpotlightRep();

  return (
    <div className="space-y-6">
      {/* Motivation Board pop-up on login */}
      {role === 'rep' && <MotivationBoard />}

      {/* Golden Sales Spotlight Banner */}
      {spotlight && (
        <div className="overflow-hidden rounded-lg bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10 border border-primary/20">
          <div className="flex items-center gap-3 px-6 py-3">
            <Star className="h-5 w-5 text-primary fill-primary" />
            <p className="text-sm font-medium text-secondary">
              🏆 Golden Sales Spotlight: <strong>{spotlight.fullName}</strong> — {spotlight.dealsClosed} deals closed! Keep it up!
            </p>
          </div>
        </div>
      )}

      <div>
        <h1 className="text-2xl font-bold text-secondary">
          {role === 'admin' ? 'Admin Dashboard' : role === 'manager' ? 'Manager Dashboard' : 'My Dashboard'}
        </h1>
        <p className="text-muted-foreground">Welcome back, {user?.user_metadata?.full_name || user?.email}</p>
      </div>

      {/* Stats Cards */}
      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard title="Total Leads" value={stats?.totalLeads ?? 0} subtitle={`+${stats?.leadsThisWeek ?? 0} this week`} icon={ClipboardList} />
          <StatCard title="Deals Closed" value={stats?.dealsClosed ?? 0} subtitle="All time" icon={TrendingUp} color="text-success" />
          <StatCard title="Meetings Today" value={stats?.meetingsToday ?? 0} icon={Calendar} color="text-info" />
          <StatCard title="Follow-ups Due" value={stats?.followupsDue ?? 0} subtitle={`${stats?.overdueCount ?? 0} overdue (3+ days)`} icon={AlertTriangle} color="text-destructive" />
        </div>
      )}

      {/* Rep KPI */}
      {role === 'rep' && <RepKPICards />}

      {/* Charts */}
      <div className="grid gap-4 md:grid-cols-2">
        {stats?.statusBreakdown && <StatusPieChart statusBreakdown={stats.statusBreakdown} />}
        {(role === 'admin' || role === 'manager') && <TeamPerformanceChart />}
      </div>

      {/* Admin: Spotlight Control */}
      {role === 'admin' && (
        <div className="grid gap-4 md:grid-cols-2">
          <GoldenSpotlightControl />
        </div>
      )}
    </div>
  );
};

export default Dashboard;
