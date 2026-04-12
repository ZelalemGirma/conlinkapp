import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useSalesTargets, useCreateTarget, useUpdateTarget } from '@/hooks/useSalesTargets';
import { useProfiles } from '@/hooks/useProfiles';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Target } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

const Targets = () => {
  const { role } = useAuth();
  const { data: targets, isLoading } = useSalesTargets();
  const { data: profiles } = useProfiles();
  const createTarget = useCreateTarget();
  const updateTarget = useUpdateTarget();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [repId, setRepId] = useState('');
  const [targetCount, setTargetCount] = useState('');
  const [periodStart, setPeriodStart] = useState('');
  const [periodEnd, setPeriodEnd] = useState('');

  const profileMap = Object.fromEntries((profiles || []).map(p => [p.user_id, p.full_name]));
  const isManagerOrAdmin = role === 'admin' || role === 'manager';

  const handleCreate = () => {
    if (!repId || !targetCount || !periodStart || !periodEnd) return;
    createTarget.mutate(
      { rep_id: repId, target_count: parseInt(targetCount), period_start: periodStart, period_end: periodEnd },
      { onSuccess: () => { setDialogOpen(false); setRepId(''); setTargetCount(''); setPeriodStart(''); setPeriodEnd(''); } }
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-secondary">Sales Targets</h1>
          <p className="text-muted-foreground">Set and track team sales targets</p>
        </div>
        {isManagerOrAdmin && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="mr-2 h-4 w-4" />Set Target</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Set Sales Target</DialogTitle></DialogHeader>
              <div className="space-y-4 pt-4">
                <Select value={repId} onValueChange={setRepId}>
                  <SelectTrigger><SelectValue placeholder="Select Rep" /></SelectTrigger>
                  <SelectContent>
                    {profiles?.map(p => (
                      <SelectItem key={p.user_id} value={p.user_id}>{p.full_name || p.user_id}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input type="number" placeholder="Target count" value={targetCount} onChange={e => setTargetCount(e.target.value)} />
                <div className="grid grid-cols-2 gap-3">
                  <Input type="date" value={periodStart} onChange={e => setPeriodStart(e.target.value)} />
                  <Input type="date" value={periodEnd} onChange={e => setPeriodEnd(e.target.value)} />
                </div>
                <Button onClick={handleCreate} disabled={createTarget.isPending} className="w-full">
                  {createTarget.isPending ? 'Creating...' : 'Create Target'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Rep</TableHead>
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
                    <TableRow key={i}>{Array.from({ length: 5 }).map((_, j) => <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>)}</TableRow>
                  ))
                ) : targets?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                      No targets set yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  targets?.map(t => {
                    const pct = Math.min(100, Math.round((t.actual_count / Math.max(1, t.target_count)) * 100));
                    return (
                      <TableRow key={t.id}>
                        <TableCell className="font-medium">{profileMap[t.rep_id] || 'Unknown'}</TableCell>
                        <TableCell className="text-sm">{new Date(t.period_start).toLocaleDateString()} – {new Date(t.period_end).toLocaleDateString()}</TableCell>
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
                              +1 Actual
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
    </div>
  );
};

export default Targets;
