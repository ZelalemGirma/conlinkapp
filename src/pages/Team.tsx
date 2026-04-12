import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Users, TrendingUp, ClipboardList, Phone } from 'lucide-react';

interface RepStats {
  user_id: string;
  full_name: string;
  total_leads: number;
  active_leads: number;
  closed_deals: number;
  interactions: number;
  target_count: number;
  actual_count: number;
}

const Team = () => {
  const { role } = useAuth();

  const { data: repStats = [], isLoading } = useQuery({
    queryKey: ['team_stats'],
    queryFn: async () => {
      // Get all reps
      const { data: roles } = await supabase
        .from('user_roles')
        .select('user_id, role')
        .eq('role', 'rep');
      if (!roles?.length) return [];

      const repIds = roles.map(r => r.user_id);

      // Parallel fetches
      const [profilesRes, leadsRes, interactionsRes, targetsRes] = await Promise.all([
        supabase.from('profiles').select('user_id, full_name').in('user_id', repIds),
        supabase.from('leads').select('id, status, created_by, assigned_rep_id'),
        supabase.from('interaction_logs').select('id, created_by'),
        supabase.from('sales_targets').select('rep_id, target_count, actual_count').order('period_start', { ascending: false }),
      ]);

      const profiles = profilesRes.data ?? [];
      const leads = leadsRes.data ?? [];
      const interactions = interactionsRes.data ?? [];
      const targets = targetsRes.data ?? [];

      return repIds.map(uid => {
        const profile = profiles.find(p => p.user_id === uid);
        const repLeads = leads.filter(l => l.created_by === uid || l.assigned_rep_id === uid);
        const closedStatuses = ['deal_closed'];
        const terminalStatuses = ['deal_closed', 'company_closed', 'rejected_phone', 'rejected_spot', 'wrong_number'];

        const latestTarget = targets.find(t => t.rep_id === uid);

        return {
          user_id: uid,
          full_name: profile?.full_name || 'Unknown',
          total_leads: repLeads.length,
          active_leads: repLeads.filter(l => !terminalStatuses.includes(l.status)).length,
          closed_deals: repLeads.filter(l => closedStatuses.includes(l.status)).length,
          interactions: interactions.filter(i => i.created_by === uid).length,
          target_count: latestTarget?.target_count ?? 0,
          actual_count: latestTarget?.actual_count ?? 0,
        } as RepStats;
      });
    },
  });

  if (role !== 'admin' && role !== 'manager') {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-secondary">Team</h1>
        <p className="text-muted-foreground">You don't have permission to view this page.</p>
      </div>
    );
  }

  const totalLeads = repStats.reduce((s, r) => s + r.total_leads, 0);
  const totalDeals = repStats.reduce((s, r) => s + r.closed_deals, 0);
  const totalInteractions = repStats.reduce((s, r) => s + r.interactions, 0);

  const getInitials = (name: string) =>
    name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-secondary">Team Overview</h1>
        <p className="text-muted-foreground">Monitor your team's workload and performance</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="rounded-lg p-2 bg-primary/10 text-primary">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold">{repStats.length}</p>
              <p className="text-xs text-muted-foreground">Total Reps</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="rounded-lg p-2 bg-info/10 text-info">
              <ClipboardList className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold">{totalLeads}</p>
              <p className="text-xs text-muted-foreground">Total Leads</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="rounded-lg p-2 bg-success/10 text-success">
              <TrendingUp className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold">{totalDeals}</p>
              <p className="text-xs text-muted-foreground">Closed Deals</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="rounded-lg p-2 bg-warning/10 text-warning">
              <Phone className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold">{totalInteractions}</p>
              <p className="text-xs text-muted-foreground">Interactions</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" /> Rep Performance
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground text-center py-8">Loading team data…</p>
          ) : repStats.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No reps found</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Rep</TableHead>
                  <TableHead className="text-center">Leads</TableHead>
                  <TableHead className="text-center">Active</TableHead>
                  <TableHead className="text-center">Deals</TableHead>
                  <TableHead className="text-center">Interactions</TableHead>
                  <TableHead>Target Progress</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {repStats.map(rep => {
                  const progress = rep.target_count > 0
                    ? Math.round((rep.actual_count / rep.target_count) * 100)
                    : 0;
                  return (
                    <TableRow key={rep.user_id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="text-xs bg-secondary/10 text-secondary">
                              {getInitials(rep.full_name)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="font-medium text-sm">{rep.full_name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline">{rep.total_leads}</Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="secondary">{rep.active_leads}</Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge className="bg-success/10 text-success border-success/20" variant="outline">
                          {rep.closed_deals}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">{rep.interactions}</TableCell>
                      <TableCell>
                        {rep.target_count > 0 ? (
                          <div className="flex items-center gap-2 min-w-[120px]">
                            <Progress value={Math.min(progress, 100)} className="h-2 flex-1" />
                            <span className="text-xs text-muted-foreground w-10 text-right">
                              {progress}%
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">No target</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Team;
