import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { ClipboardList, TrendingUp, Calendar, Star } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

const StatCard = ({ title, value, subtitle, icon: Icon, color }: {
  title: string; value: string; subtitle?: string; icon: React.ElementType; color?: string;
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

  return (
    <div className="space-y-6">
      {/* Golden Sales Spotlight */}
      <div className="overflow-hidden rounded-lg bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10 border border-primary/20">
        <div className="flex items-center gap-3 px-6 py-3">
          <Star className="h-5 w-5 text-primary fill-primary" />
          <p className="animate-marquee whitespace-nowrap text-sm font-medium text-secondary">
            🏆 Golden Sales Spotlight: <strong>Abebe Kebede</strong> — 47 deals closed this month! Keep it up!
          </p>
        </div>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-secondary">
          {role === 'admin' ? 'Admin Dashboard' : role === 'manager' ? 'Manager Dashboard' : 'My Dashboard'}
        </h1>
        <p className="text-muted-foreground">Welcome back, {user?.user_metadata?.full_name || user?.email}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total Leads" value="127" subtitle="+12 this week" icon={ClipboardList} />
        <StatCard title="Deals Closed" value="23" subtitle="This month" icon={TrendingUp} color="text-success" />
        <StatCard title="Meetings Today" value="5" subtitle="Next at 2:30 PM" icon={Calendar} color="text-info" />
        <StatCard title="Follow-ups Due" value="8" subtitle="3 overdue" icon={ClipboardList} color="text-destructive" />
      </div>

      {role === 'rep' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">My Target Progress</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>Leads Contacted</span>
                <span className="font-medium">34 / 50</span>
              </div>
              <Progress value={68} className="h-2" />
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>Deals Closed</span>
                <span className="font-medium">7 / 15</span>
              </div>
              <Progress value={47} className="h-2" />
            </div>
          </CardContent>
        </Card>
      )}

      {(role === 'admin' || role === 'manager') && (
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Team Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-sm">Team analytics will be populated with live data in Phase 5.</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-sm">Live activity feed coming in Phase 3.</p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
