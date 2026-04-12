import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface ActivityVolumeChartProps {
  data: { rep: string; calls: number; visits: number; meetings: number; emails: number; telegrams: number }[];
}

const ActivityVolumeChart: React.FC<ActivityVolumeChartProps> = ({ data }) => {
  if (data.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Activity Volume by Rep</CardTitle></CardHeader>
        <CardContent><p className="text-sm text-muted-foreground text-center py-8">No activity data</p></CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Activity Volume by Rep</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={data} margin={{ left: 0, right: 10 }}>
            <XAxis dataKey="rep" fontSize={10} interval={0} angle={-20} textAnchor="end" height={50} />
            <YAxis fontSize={11} />
            <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Bar dataKey="calls" stackId="a" fill="hsl(var(--primary))" name="Calls" />
            <Bar dataKey="visits" stackId="a" fill="hsl(var(--info))" name="Visits" />
            <Bar dataKey="meetings" stackId="a" fill="hsl(var(--success))" name="Meetings" />
            <Bar dataKey="emails" stackId="a" fill="hsl(var(--warning))" name="Emails" />
            <Bar dataKey="telegrams" stackId="a" fill="hsl(var(--muted-foreground))" name="Telegram" />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

export default ActivityVolumeChart;
