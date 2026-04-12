import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useTeamPerformance } from '@/hooks/useDashboardStats';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';
import { Users } from 'lucide-react';

const TeamPerformanceChart: React.FC = () => {
  const { data: team, isLoading } = useTeamPerformance();

  if (isLoading) return <Card><CardContent className="p-6"><Skeleton className="h-64 w-full" /></CardContent></Card>;

  const chartData = (team || []).slice(0, 10).map(r => ({
    name: r.fullName.split(' ')[0] || 'Unknown',
    'Deals Closed': r.dealsClosed,
    'Total Leads': r.totalLeads,
    'Interactions': r.interactionCount,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Users className="h-5 w-5 text-primary" />
          Team Performance
        </CardTitle>
      </CardHeader>
      <CardContent>
        {chartData.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">No team data yet.</p>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Legend />
              <Bar dataKey="Deals Closed" fill="hsl(var(--success))" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Total Leads" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Interactions" fill="hsl(var(--info))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
};

export default TeamPerformanceChart;
