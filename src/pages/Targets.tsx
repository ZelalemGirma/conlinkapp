import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useSalesTargets, useMyTargets, useCreateTarget, useUpdateTarget } from '@/hooks/useSalesTargets';
import { useProfiles } from '@/hooks/useProfiles';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Target, Phone, Users, ClipboardList, TrendingUp } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';

const TARGET_TYPE_CONFIG = {
  leads: { label: 'Leads', icon: ClipboardList, color: 'bg-info/10 text-info' },
  calls: { label: 'Calls', icon: Phone, color: 'bg-warning/10 text-warning' },
  meetings: { label: 'Meetings', icon: Users, color: 'bg-primary/10 text-primary' },
  conversions: { label: 'Conversions', icon: TrendingUp, color: 'bg-success/10 text-success' },
} as const;

type TargetType = keyof typeof TARGET_TYPE_CONFIG;

const Targets = () => {
  const { role, user } = useAuth();
  const isManagerOrAdmin = role === 'admin' || role === 'manager';

  // Reps see only their targets; admin/manager see all
  const { data: allTargets, isLoading: allLoading } = useSalesTargets();
  const { data: myTargets, isLoading: myLoading } = useMyTargets();

  const targets = isManagerOrAdmin ? allTargets : myTargets;
  const isLoading = isManagerOrAdmin ? allLoading : myLoading;

  const { data: profiles } = useProfiles();
  const createTarget = useCreateTarget();
  const updateTarget = useUpdateTarget();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [repId, setRepId] = useState('');
  const [targetType, setTargetType] = useState<TargetType>('leads');
  const [targetCount, setTargetCount] = useState('');
  const [periodStart, setPeriodStart] = useState('');
  const [periodEnd, setPeriodEnd] = useState('');
  const [activeTab, setActiveTab] = useState<string>('all');

  const profileMap = Object.fromEntries((profiles || []).map(p => [p.user_id, p.full_name]));

  const filteredTargets = activeTab === 'all'
    ? targets
    : targets?.filter(t => (t as any).target_type === activeTab);

  const handleCreate = () => {
    if (!repId || !targetCount || !periodStart || !periodEnd) return;
    createTarget.mutate(
      {
        rep_id: repId,
        target_count: parseInt(targetCount),
        period_start: periodStart,
        period_end: periodEnd,
        target_type: targetType,
      },
      {
        onSuccess: () => {
          setDialogOpen(false);
          setRepId('');
          setTargetCount('');
          setPeriodStart('');
          setPeriodEnd('');
          setTargetType('leads');
        },
      }
    );
  };

  // Summary cards — show relevant targets
  const summaryTargets = targets ?? [];
  const typeSummary = Object.keys(TARGET_TYPE_CONFIG).map(type => {
    const typeTargets = summaryTargets.filter(t => (t as any).target_type === type);
    const totalTarget = typeTargets.reduce((s, t) => s + t.target_count, 0);
    const totalActual = typeTargets.reduce((s, t) => s + t.actual_count, 0);
    return { type: type as TargetType, count: typeTargets.length, totalTarget, totalActual };
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-secondary">
            {isManagerOrAdmin ? 'Sales Targets' : 'My Targets'}
          </h1>
          <p className="text-muted-foreground">
            {isManagerOrAdmin ? 'Set and track team targets by type' : 'View your assigned targets and progress'}
          </p>
        </div>
        {isManagerOrAdmin && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="mr-2 h-4 w-4" />Set Target</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Set Target</DialogTitle></DialogHeader>
              <div className="space-y-4 pt-4">
                <div>
                  <Label>Rep</Label>
                  <Select value={repId} onValueChange={setRepId}>
                    <SelectTrigger><SelectValue placeholder="Select Rep" /></SelectTrigger>
                    <SelectContent>
                      {profiles?.map(p => (
                        <SelectItem key={p.user_id} value={p.user_id}>{p.full_name || p.user_id}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Target Type</Label>
                  <Select value={targetType} onValueChange={(v) => setTargetType(v as TargetType)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(TARGET_TYPE_CONFIG).map(([key, cfg]) => (
                        <SelectItem key={key} value={key}>{cfg.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Target Count</Label>
                  <Input type="number" placeholder="e.g. 20" value={targetCount} onChange={e => setTargetCount(e.target.value)} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Start Date</Label>
                    <Input type="date" value={periodStart} onChange={e => setPeriodStart(e.target.value)} />
                  </div>
                  <div>
                    <Label>End Date</Label>
                    <Input type="date" value={periodEnd} onChange={e => setPeriodEnd(e.target.value)} />
                  </div>
                </div>
                <Button onClick={handleCreate} disabled={createTarget.isPending} className="w-full">
                  {createTarget.isPending ? 'Creating...' : 'Create Target'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {typeSummary.map(({ type, totalTarget, totalActual }) => {
          const cfg = TARGET_TYPE_CONFIG[type];
          const Icon = cfg.icon;
          const pct = totalTarget > 0 ? Math.round((totalActual / totalTarget) * 100) : 0;
          return (
            <Card key={type} className="cursor-pointer hover:ring-2 ring-primary/20 transition-all" onClick={() => setActiveTab(type)}>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className={`rounded-lg p-1.5 ${cfg.color}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <span className="text-sm font-medium">{cfg.label}</span>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-bold">{totalActual}</span>
                  <span className="text-sm text-muted-foreground">/ {totalTarget}</span>
                </div>
                <Progress value={Math.min(pct, 100)} className="h-1.5 mt-2" />
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Achievement Bar Chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Target Achievement</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={typeSummary.map(s => ({
              name: TARGET_TYPE_CONFIG[s.type].label,
              Target: s.totalTarget,
              Actual: s.totalActual,
            }))} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="name" className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
              <YAxis className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  color: 'hsl(var(--foreground))',
                }}
              />
              <Legend />
              <Bar dataKey="Target" fill="hsl(var(--muted-foreground))" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Actual" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Table with tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          {Object.entries(TARGET_TYPE_CONFIG).map(([key, cfg]) => (
            <TabsTrigger key={key} value={key} className="gap-1">
              <cfg.icon className="h-3.5 w-3.5" /> {cfg.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <Card className="mt-4">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {isManagerOrAdmin && <TableHead>Rep</TableHead>}
                    <TableHead>Type</TableHead>
                    <TableHead>Period</TableHead>
                    <TableHead>Target</TableHead>
                    <TableHead>Actual</TableHead>
                    <TableHead>Progress</TableHead>
                    {isManagerOrAdmin && <TableHead>Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    Array.from({ length: 3 }).map((_, i) => (
                      <TableRow key={i}>{Array.from({ length: 6 }).map((_, j) => <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>)}</TableRow>
                    ))
                  ) : !filteredTargets?.length ? (
                    <TableRow>
                      <TableCell colSpan={isManagerOrAdmin ? 7 : 5} className="text-center py-12 text-muted-foreground">
                        {isManagerOrAdmin ? 'No targets set yet.' : 'No targets assigned to you yet.'}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredTargets.map(t => {
                      const tt = (t as any).target_type as TargetType || 'leads';
                      const cfg = TARGET_TYPE_CONFIG[tt];
                      const Icon = cfg.icon;
                      const pct = Math.min(100, Math.round((t.actual_count / Math.max(1, t.target_count)) * 100));
                      return (
                        <TableRow key={t.id}>
                          {isManagerOrAdmin && (
                            <TableCell className="font-medium">{profileMap[t.rep_id] || 'Unknown'}</TableCell>
                          )}
                          <TableCell>
                            <Badge variant="outline" className={`gap-1 ${cfg.color}`}>
                              <Icon className="h-3 w-3" /> {cfg.label}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm">
                            {new Date(t.period_start).toLocaleDateString()} – {new Date(t.period_end).toLocaleDateString()}
                          </TableCell>
                          <TableCell>{t.target_count}</TableCell>
                          <TableCell>{t.actual_count}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2 min-w-[120px]">
                              <Progress value={pct} className="h-2 flex-1" />
                              <span className="text-xs font-medium w-10 text-right">{pct}%</span>
                            </div>
                          </TableCell>
                          {isManagerOrAdmin && (
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => updateTarget.mutate({ id: t.id, actual_count: t.actual_count + 1 })}
                              >
                                +1
                              </Button>
                            </TableCell>
                          )}
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </Tabs>
    </div>
  );
};

export default Targets;
