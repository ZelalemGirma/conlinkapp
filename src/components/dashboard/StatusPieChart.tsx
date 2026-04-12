import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { LEAD_STATUS_CONFIG } from '@/types';
import { BarChart3 } from 'lucide-react';

const COLORS = [
  'hsl(25, 89%, 55%)', 'hsl(210, 60%, 18%)', 'hsl(142, 71%, 45%)',
  'hsl(200, 80%, 50%)', 'hsl(48, 96%, 53%)', 'hsl(0, 84%, 60%)',
  'hsl(280, 60%, 50%)', 'hsl(170, 60%, 45%)',
];

interface Props {
  statusBreakdown: Record<string, number>;
}

const StatusPieChart: React.FC<Props> = ({ statusBreakdown }) => {
  const data = Object.entries(statusBreakdown)
    .filter(([, count]) => count > 0)
    .map(([status, count]) => ({
      name: LEAD_STATUS_CONFIG[status as keyof typeof LEAD_STATUS_CONFIG]?.label || status,
      value: count,
    }));

  if (data.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <BarChart3 className="h-5 w-5 text-primary" />
          Lead Status Distribution
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie data={data} cx="50%" cy="50%" outerRadius={100} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
              {data.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

export default StatusPieChart;
