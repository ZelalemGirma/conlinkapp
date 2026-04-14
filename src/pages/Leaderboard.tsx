import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useProfiles } from '@/hooks/useProfiles';
import { useCampaignFilter } from '@/hooks/useCampaignFilter';
import { LEAD_CATEGORIES, LOCATION_ZONES, LEAD_STATUS_CONFIG } from '@/types';
import type { LeadStatus } from '@/types';
import type { Database } from '@/integrations/supabase/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import MultiSelectFilter from '@/components/reports/MultiSelectFilter';
import { Trophy, Award, Star, MapPin, Phone, Briefcase, TrendingUp } from 'lucide-react';
import { format } from 'date-fns';

type LeadRow = Database['public']['Tables']['leads']['Row'];
type InteractionRow = Database['public']['Tables']['interaction_logs']['Row'];
type MeetingRow = Database['public']['Tables']['meetings']['Row'];

const ALL_STATUSES = Object.keys(LEAD_STATUS_CONFIG) as LeadStatus[];

const Leaderboard: React.FC = () => {
  const { role } = useAuth();
  const { data: profiles } = useProfiles();
  const { campaignId } = useCampaignFilter();

  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedZones, setSelectedZones] = useState<string[]>([]);
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [campaignFilter, setCampaignFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const { data: allLeads = [] } = useQuery({
    queryKey: ['leaderboard-leads', campaignId],
    queryFn: async () => {
      let q = supabase.from('leads').select('*');
      if (campaignId) q = q.eq('campaign_id', campaignId);
      const { data, error } = await q;
      if (error) throw error;
      return data as LeadRow[];
    },
  });

  const { data: allInteractions = [] } = useQuery({
    queryKey: ['leaderboard-interactions', campaignId],
    queryFn: async () => {
      let q = supabase.from('interaction_logs').select('*');
      if (campaignId) q = q.eq('campaign_id', campaignId);
      const { data, error } = await q;
      if (error) throw error;
      return data as InteractionRow[];
    },
  });

  const { data: allMeetings = [] } = useQuery({
    queryKey: ['leaderboard-meetings', campaignId],
    queryFn: async () => {
      let q = supabase.from('meetings').select('*');
      if (campaignId) q = q.eq('campaign_id', campaignId);
      const { data, error } = await q;
      if (error) throw error;
      return data as MeetingRow[];
    },
  });

  const { data: reps = [] } = useQuery({
    queryKey: ['leaderboard-reps'],
    queryFn: async () => {
      const { data, error } = await supabase.from('user_roles').select('user_id, role');
      if (error) throw error;
      return data ?? [];
    },
  });

  const repUserIds = useMemo(() => reps.map(r => r.user_id), [reps]);

  const getRepName = (userId: string) => {
    const p = (profiles ?? []).find(pr => pr.user_id === userId);
    return p?.full_name || 'Unknown';
  };

  // Apply filters to leads
  const filteredLeads = useMemo(() => {
    let leads = allLeads;
    if (selectedCategories.length > 0) leads = leads.filter(l => selectedCategories.includes(l.category));
    if (selectedZones.length > 0) leads = leads.filter(l => l.location_zone && selectedZones.includes(l.location_zone));
    if (selectedStatuses.length > 0) leads = leads.filter(l => selectedStatuses.includes(l.status));
    if (campaignFilter.trim()) {
      const tag = campaignFilter.trim().toLowerCase();
      leads = leads.filter(l => l.campaign_tag?.toLowerCase().includes(tag));
    }
    // Date filter
    if (dateFrom) {
      const from = new Date(dateFrom);
      leads = leads.filter(l => new Date(l.created_at) >= from);
    }
    if (dateTo) {
      const to = new Date(dateTo + 'T23:59:59');
      leads = leads.filter(l => new Date(l.created_at) <= to);
    }
    return leads;
  }, [allLeads, selectedCategories, selectedZones, selectedStatuses, campaignFilter, dateFrom, dateTo]);

  const filteredLeadIds = useMemo(() => new Set(filteredLeads.map(l => l.id)), [filteredLeads]);
  const filteredInteractions = useMemo(
    () => allInteractions.filter(i => filteredLeadIds.has(i.lead_id)),
    [allInteractions, filteredLeadIds]
  );
  const filteredMeetings = useMemo(
    () => allMeetings.filter(m => filteredLeadIds.has(m.lead_id)),
    [allMeetings, filteredLeadIds]
  );

  // Calculate weighted scores per rep
  const rankings = useMemo(() => {
    const repMap = new Map<string, {
      deals: number; meetings: number; newLeads: number; totalLeads: number; siteVisits: number; calls: number;
    }>();

    repUserIds.forEach(id => {
      repMap.set(id, { deals: 0, meetings: 0, newLeads: 0, totalLeads: 0, siteVisits: 0, calls: 0 });
    });

    filteredLeads.forEach(l => {
      const repId = l.assigned_rep_id || l.created_by;
      if (!repMap.has(repId)) repMap.set(repId, { deals: 0, meetings: 0, newLeads: 0, totalLeads: 0, siteVisits: 0, calls: 0 });
      const entry = repMap.get(repId)!;
      entry.totalLeads++;
      if (l.status === 'deal_closed') entry.deals++;
      if (l.created_by === repId) entry.newLeads++;
    });

    filteredMeetings.forEach(m => {
      const entry = repMap.get(m.created_by);
      if (entry) entry.meetings++;
    });

    filteredInteractions.forEach(i => {
      const entry = repMap.get(i.created_by);
      if (entry) {
        if (i.type === 'site_visit') entry.siteVisits++;
        if (i.type === 'phone') entry.calls++;
      }
    });

    return Array.from(repMap.entries())
      .map(([userId, stats]) => {
        const accuracy = stats.totalLeads > 0 ? (stats.deals / stats.totalLeads) : 0;
        const score = (stats.deals * 50) + (stats.meetings * 30) + (accuracy * 20 * 100);
        return { userId, name: getRepName(userId), ...stats, accuracy, score };
      })
      .filter(r => r.name !== 'Unknown' && (r.totalLeads > 0 || r.meetings > 0))
      .sort((a, b) => b.score - a.score);
  }, [filteredLeads, filteredMeetings, filteredInteractions, repUserIds, profiles]);

  // Dynamic badges
  const badges = useMemo(() => {
    if (rankings.length === 0) return new Map<string, string[]>();
    const badgeMap = new Map<string, string[]>();
    const addBadge = (userId: string, badge: string) => {
      if (!badgeMap.has(userId)) badgeMap.set(userId, []);
      badgeMap.get(userId)!.push(badge);
    };
    const maxDeals = Math.max(...rankings.map(r => r.deals));
    if (maxDeals > 0) rankings.filter(r => r.deals === maxDeals).forEach(r => addBadge(r.userId, 'Closer'));
    const maxNewLeads = Math.max(...rankings.map(r => r.newLeads));
    if (maxNewLeads > 0) rankings.filter(r => r.newLeads === maxNewLeads).forEach(r => addBadge(r.userId, 'Prospector'));
    const maxVisits = Math.max(...rankings.map(r => r.siteVisits));
    if (maxVisits > 0) rankings.filter(r => r.siteVisits === maxVisits).forEach(r => addBadge(r.userId, 'Road Warrior'));
    const maxCalls = Math.max(...rankings.map(r => r.calls));
    if (maxCalls > 0) rankings.filter(r => r.calls === maxCalls).forEach(r => addBadge(r.userId, 'Top Caller'));
    if (selectedZones.length === 1 && rankings.length > 0) {
      addBadge(rankings[0].userId, `King of ${selectedZones[0]}`);
    }
    return badgeMap;
  }, [rankings, selectedZones]);

  const maxScore = rankings.length > 0 ? rankings[0].score : 1;

  const categoryOptions = LEAD_CATEGORIES.map(c => ({ value: c, label: c }));
  const zoneOptions = LOCATION_ZONES.map(z => ({ value: z, label: z }));
  const statusOptions = ALL_STATUSES.map(s => ({ value: s, label: LEAD_STATUS_CONFIG[s].label }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Trophy className="h-6 w-6 text-primary" /> Leaderboard
        </h1>
        <p className="text-sm text-muted-foreground">
          Rep rankings based on weighted performance: 50% Deal Closures + 30% Meetings + 20% Lead Accuracy
        </p>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Filter Rankings</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div className="space-y-1">
              <Label className="text-xs">Category</Label>
              <MultiSelectFilter label="All Categories" options={categoryOptions} selected={selectedCategories} onChange={setSelectedCategories} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Zone</Label>
              <MultiSelectFilter label="All Zones" options={zoneOptions} selected={selectedZones} onChange={setSelectedZones} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Status</Label>
              <MultiSelectFilter label="All Statuses" options={statusOptions} selected={selectedStatuses} onChange={setSelectedStatuses} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Campaign Tag</Label>
              <Input placeholder="e.g. Edition 13" value={campaignFilter} onChange={e => setCampaignFilter(e.target.value)} className="h-8 text-xs" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">From Date</Label>
              <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="h-8 text-xs" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">To Date</Label>
              <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="h-8 text-xs" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Top 3 Podium */}
      {rankings.length >= 1 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {rankings.slice(0, 3).map((rep, i) => {
            const podiumColors = [
              'bg-gradient-to-br from-amber-50 to-amber-100 border-amber-300 dark:from-amber-950/30 dark:to-amber-900/20 dark:border-amber-700',
              'bg-gradient-to-br from-slate-50 to-slate-100 border-slate-300 dark:from-slate-950/30 dark:to-slate-900/20 dark:border-slate-600',
              'bg-gradient-to-br from-orange-50 to-orange-100 border-orange-300 dark:from-orange-950/30 dark:to-orange-900/20 dark:border-orange-700',
            ];
            const medals = ['🥇', '🥈', '🥉'];
            const repBadges = badges.get(rep.userId) || [];

            return (
              <Card key={rep.userId} className={`${podiumColors[i]} border-2`}>
                <CardContent className="pt-5 pb-4 text-center">
                  <div className="text-3xl mb-1">{medals[i]}</div>
                  <h3 className="font-bold text-lg">{rep.name}</h3>
                  <p className="text-2xl font-bold text-primary mt-1">{Math.round(rep.score)}</p>
                  <p className="text-xs text-muted-foreground">weighted score</p>
                  <div className="grid grid-cols-3 gap-2 mt-3 text-center">
                    <div><p className="text-sm font-semibold">{rep.deals}</p><p className="text-[10px] text-muted-foreground">Deals</p></div>
                    <div><p className="text-sm font-semibold">{rep.meetings}</p><p className="text-[10px] text-muted-foreground">Meetings</p></div>
                    <div><p className="text-sm font-semibold">{(rep.accuracy * 100).toFixed(0)}%</p><p className="text-[10px] text-muted-foreground">Accuracy</p></div>
                  </div>
                  {repBadges.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-3 justify-center">
                      {repBadges.map(b => (
                        <Badge key={b} variant="outline" className="text-[10px]">{b}</Badge>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Full Rankings Table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Full Rankings</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs w-12">#</TableHead>
                <TableHead className="text-xs">Rep</TableHead>
                <TableHead className="text-xs text-center">Score</TableHead>
                <TableHead className="text-xs text-center">Deals</TableHead>
                <TableHead className="text-xs text-center">Meetings</TableHead>
                <TableHead className="text-xs text-center">New Leads</TableHead>
                <TableHead className="text-xs text-center">Accuracy</TableHead>
                <TableHead className="text-xs">Progress</TableHead>
                <TableHead className="text-xs">Badges</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rankings.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">No data available</TableCell>
                </TableRow>
              ) : (
                rankings.map((rep, i) => {
                  const repBadges = badges.get(rep.userId) || [];
                  return (
                    <TableRow key={rep.userId}>
                      <TableCell className="font-bold text-sm">{i + 1}</TableCell>
                      <TableCell className="font-medium text-sm">{rep.name}</TableCell>
                      <TableCell className="text-center font-bold">{Math.round(rep.score)}</TableCell>
                      <TableCell className="text-center text-sm">{rep.deals}</TableCell>
                      <TableCell className="text-center text-sm">{rep.meetings}</TableCell>
                      <TableCell className="text-center text-sm">{rep.newLeads}</TableCell>
                      <TableCell className="text-center text-sm">{(rep.accuracy * 100).toFixed(0)}%</TableCell>
                      <TableCell className="min-w-[100px]">
                        <Progress value={maxScore > 0 ? (rep.score / maxScore) * 100 : 0} className="h-2" />
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {repBadges.map(b => (
                            <Badge key={b} variant="outline" className="text-[10px]">{b}</Badge>
                          ))}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default Leaderboard;
