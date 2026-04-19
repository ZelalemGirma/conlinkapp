import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useProfiles } from '@/hooks/useProfiles';
import { LEAD_CATEGORIES, LOCATION_ZONES, LEAD_STATUS_CONFIG } from '@/types';
import type { LeadStatus } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { format, differenceInDays } from 'date-fns';
import { CalendarIcon, Download, FileText, RotateCcw } from 'lucide-react';
import type { Database } from '@/integrations/supabase/types';

import MultiSelectFilter from '@/components/reports/MultiSelectFilter';
import ReportKPICards from '@/components/reports/ReportKPICards';
import ConversionFunnel from '@/components/reports/ConversionFunnel';
import ActivityVolumeChart from '@/components/reports/ActivityVolumeChart';
import RepSuccessTable from '@/components/reports/RepSuccessTable';
import DateRangePresets from '@/components/reports/DateRangePresets';

type LeadRow = Database['public']['Tables']['leads']['Row'];
type InteractionRow = Database['public']['Tables']['interaction_logs']['Row'];

const ALL_STATUSES = Object.keys(LEAD_STATUS_CONFIG) as LeadStatus[];

const Reports: React.FC = () => {
  const { user, role } = useAuth();
  const { data: profiles } = useProfiles();
  const isRepOnly = role === 'rep';

  // Multi-select filters
  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [dateTo, setDateTo] = useState<Date | undefined>();
  const [selectedReps, setSelectedReps] = useState<string[]>([]);
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedZones, setSelectedZones] = useState<string[]>([]);
  const [campaignFilter, setCampaignFilter] = useState('');

  // Fetch all leads (RLS scopes to permitted rows; reps further filtered below)
  const { data: allLeadsRaw = [], isLoading: leadsLoading } = useQuery({
    queryKey: ['reports-leads', user?.id, role],
    queryFn: async () => {
      const { data, error } = await supabase.from('leads').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data as LeadRow[];
    },
  });

  const allLeads = useMemo(() => {
    if (!isRepOnly || !user) return allLeadsRaw;
    return allLeadsRaw.filter(
      (l) =>
        l.created_by === user.id ||
        (l.assigned_rep_id === user.id && l.status !== 'draft' && l.status !== 'pending')
    );
  }, [allLeadsRaw, isRepOnly, user]);

  // Fetch all interactions
  const { data: allInteractions = [], isLoading: interactionsLoading } = useQuery({
    queryKey: ['reports-interactions'],
    queryFn: async () => {
      const { data, error } = await supabase.from('interaction_logs').select('*');
      if (error) throw error;
      return data as InteractionRow[];
    },
  });

  // Fetch reps
  const { data: reps = [] } = useQuery({
    queryKey: ['reports-reps'],
    queryFn: async () => {
      const { data: roles, error } = await supabase.from('user_roles').select('user_id, role');
      if (error) throw error;
      return roles ?? [];
    },
  });

  const repProfiles = useMemo(() => {
    const repUserIds = reps.map(r => r.user_id);
    return (profiles ?? []).filter(p => repUserIds.includes(p.user_id));
  }, [reps, profiles]);

  const getRepName = (userId: string) => {
    const p = (profiles ?? []).find(pr => pr.user_id === userId);
    return p?.full_name || 'Unknown';
  };

  // Filter options
  const statusOptions = ALL_STATUSES.map(s => ({ value: s, label: LEAD_STATUS_CONFIG[s].label }));
  const categoryOptions = LEAD_CATEGORIES.map(c => ({ value: c, label: c }));
  const zoneOptions = LOCATION_ZONES.map(z => ({ value: z, label: z }));
  const repOptions = repProfiles.map(r => ({ value: r.user_id, label: r.full_name || 'Unnamed' }));

  // Apply filters
  const filteredLeads = useMemo(() => {
    let leads = allLeads;

    if (isRepOnly && user) {
      leads = leads.filter(l => l.created_by === user.id || l.assigned_rep_id === user.id);
    }
    if (dateFrom) {
      leads = leads.filter(l => new Date(l.created_at) >= dateFrom);
    }
    if (dateTo) {
      const end = new Date(dateTo);
      end.setHours(23, 59, 59, 999);
      leads = leads.filter(l => new Date(l.created_at) <= end);
    }
    if (selectedReps.length > 0) {
      leads = leads.filter(l => selectedReps.includes(l.created_by) || (l.assigned_rep_id && selectedReps.includes(l.assigned_rep_id)));
    }
    if (selectedStatuses.length > 0) {
      leads = leads.filter(l => selectedStatuses.includes(l.status));
    }
    if (selectedCategories.length > 0) {
      leads = leads.filter(l => selectedCategories.includes(l.category));
    }
    if (selectedZones.length > 0) {
      leads = leads.filter(l => l.location_zone && selectedZones.includes(l.location_zone));
    }
    if (campaignFilter.trim()) {
      const tag = campaignFilter.trim().toLowerCase();
      leads = leads.filter(l => l.campaign_tag?.toLowerCase().includes(tag));
    }

    return leads;
  }, [allLeads, isRepOnly, user, dateFrom, dateTo, selectedReps, selectedStatuses, selectedCategories, selectedZones, campaignFilter]);

  // Computed KPIs
  const filteredLeadIds = useMemo(() => new Set(filteredLeads.map(l => l.id)), [filteredLeads]);
  const filteredInteractions = useMemo(
    () => allInteractions.filter(i => filteredLeadIds.has(i.lead_id)),
    [allInteractions, filteredLeadIds]
  );

  const totalLeads = filteredLeads.length;
  const closedDeals = filteredLeads.filter(l => l.status === 'deal_closed').length;
  const conversionRate = totalLeads > 0 ? ((closedDeals / totalLeads) * 100).toFixed(1) : '0.0';

  // Success rate: deals closed / total assigned (non-draft, non-pending)
  const assignedLeads = filteredLeads.filter(l => !['draft', 'pending'].includes(l.status));
  const successRate = assignedLeads.length > 0
    ? ((closedDeals / assignedLeads.length) * 100).toFixed(1)
    : '0.0';

  // Avg approval time: leads that went from created → approved
  const avgApprovalDays = useMemo(() => {
    const approved = filteredLeads.filter(l => !['draft', 'pending'].includes(l.status));
    if (approved.length === 0) return '—';
    const totalDays = approved.reduce((sum, l) => {
      const created = new Date(l.created_at);
      const updated = new Date(l.updated_at);
      return sum + Math.max(0, differenceInDays(updated, created));
    }, 0);
    return (totalDays / approved.length).toFixed(1);
  }, [filteredLeads]);

  // Conversion funnel
  const funnelData = useMemo(() => {
    const total = filteredLeads.length;
    const approved = filteredLeads.filter(l => !['draft', 'pending'].includes(l.status)).length;
    const contacted = filteredLeads.filter(l =>
      ['meeting_scheduled', 'profile_sent', 'needs_followup', 'call_me_back', 'deal_closed'].includes(l.status)
    ).length;
    const closed = closedDeals;
    return [
      { stage: 'New Leads', count: total, color: 'hsl(var(--primary))' },
      { stage: 'Approved', count: approved, color: 'hsl(var(--info))' },
      { stage: 'Contacted', count: contacted, color: 'hsl(var(--warning))' },
      { stage: 'Deal Closed', count: closed, color: 'hsl(var(--success))' },
    ];
  }, [filteredLeads, closedDeals]);

  // Activity volume per rep
  const activityData = useMemo(() => {
    const repMap = new Map<string, { calls: number; visits: number; meetings: number; emails: number; telegrams: number }>();
    filteredInteractions.forEach(i => {
      const name = getRepName(i.created_by);
      if (!repMap.has(name)) repMap.set(name, { calls: 0, visits: 0, meetings: 0, emails: 0, telegrams: 0 });
      const entry = repMap.get(name)!;
      if (i.type === 'phone') entry.calls++;
      else if (i.type === 'site_visit') entry.visits++;
      else if (i.type === 'meeting') entry.meetings++;
      else if (i.type === 'email') entry.emails++;
      else if (i.type === 'telegram') entry.telegrams++;
    });
    return Array.from(repMap.entries()).map(([rep, counts]) => ({ rep, ...counts }));
  }, [filteredInteractions, profiles]);

  // Rep success table
  const repSuccessData = useMemo(() => {
    const repMap = new Map<string, { assigned: number; closed: number }>();
    filteredLeads.forEach(l => {
      const repId = l.assigned_rep_id || l.created_by;
      const name = getRepName(repId);
      if (!repMap.has(name)) repMap.set(name, { assigned: 0, closed: 0 });
      const entry = repMap.get(name)!;
      if (!['draft', 'pending'].includes(l.status)) entry.assigned++;
      if (l.status === 'deal_closed') entry.closed++;
    });
    return Array.from(repMap.entries())
      .map(([rep, { assigned, closed }]) => ({
        rep,
        assigned,
        closed,
        rate: assigned > 0 ? (closed / assigned) * 100 : 0,
      }))
      .sort((a, b) => b.rate - a.rate);
  }, [filteredLeads, profiles]);

  const resetFilters = () => {
    setDateFrom(undefined);
    setDateTo(undefined);
    setSelectedReps([]);
    setSelectedStatuses([]);
    setSelectedCategories([]);
    setSelectedZones([]);
    setCampaignFilter('');
  };

  const hasFilters = dateFrom || dateTo || selectedReps.length || selectedStatuses.length || selectedCategories.length || selectedZones.length || campaignFilter;

  // Export CSV
  const exportCSV = () => {
    const headers = ['Company', 'Contact', 'Phone', 'Email', 'Category', 'Status', 'Zone', 'Campaign', 'Created', 'Rep'];
    const rows = filteredLeads.map(l => [
      l.company_name, l.contact_person, l.phone ?? '', l.email ?? '', l.category,
      LEAD_STATUS_CONFIG[l.status as LeadStatus]?.label ?? l.status,
      l.location_zone ?? '', l.campaign_tag ?? '',
      format(new Date(l.created_at), 'yyyy-MM-dd'), getRepName(l.created_by),
    ]);
    const csv = [headers, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `conlink-report-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Export PDF
  const exportPDF = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    const tableRows = filteredLeads.map(l =>
      `<tr><td>${l.company_name}</td><td>${l.contact_person}</td><td>${l.category}</td><td>${LEAD_STATUS_CONFIG[l.status as LeadStatus]?.label ?? l.status}</td><td>${l.location_zone ?? ''}</td><td>${format(new Date(l.created_at), 'MMM dd, yyyy')}</td></tr>`
    ).join('');
    printWindow.document.write(`<!DOCTYPE html><html><head><title>Conlink Report</title>
      <style>body{font-family:Arial,sans-serif;padding:20px}table{width:100%;border-collapse:collapse;margin-top:16px}th,td{border:1px solid #ddd;padding:8px;text-align:left;font-size:12px}th{background:#1A2E44;color:#fff}.summary{display:flex;gap:24px;margin:12px 0}.card{background:#f5f5f5;padding:12px 20px;border-radius:8px}h1{color:#1A2E44;font-size:20px}</style>
    </head><body>
      <h1>Conlink CRM — Report</h1>
      <p>Generated: ${format(new Date(), 'PPP')}</p>
      <div class="summary"><div class="card"><strong>Total Leads:</strong> ${totalLeads}</div><div class="card"><strong>Conversion:</strong> ${conversionRate}%</div><div class="card"><strong>Interactions:</strong> ${filteredInteractions.length}</div><div class="card"><strong>Success Rate:</strong> ${successRate}%</div></div>
      <table><thead><tr><th>Company</th><th>Contact</th><th>Category</th><th>Status</th><th>Zone</th><th>Created</th></tr></thead><tbody>${tableRows}</tbody></table>
    </body></html>`);
    printWindow.document.close();
    printWindow.print();
  };

  const isLoading = leadsLoading || interactionsLoading;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{isRepOnly ? 'My Reports' : 'Global Reports'}</h1>
          <p className="text-sm text-muted-foreground">
            {isRepOnly ? 'Your personal lead analytics' : 'Team-wide lead analytics & reporting'}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={exportCSV} disabled={!filteredLeads.length}>
            <Download className="mr-2 h-4 w-4" /> CSV
          </Button>
          <Button variant="outline" size="sm" onClick={exportPDF} disabled={!filteredLeads.length}>
            <FileText className="mr-2 h-4 w-4" /> PDF
          </Button>
        </div>
      </div>

      {/* Multi-Select Filters */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Filters</CardTitle>
            {hasFilters && (
              <Button variant="ghost" size="sm" onClick={resetFilters}>
                <RotateCcw className="mr-1 h-3 w-3" /> Reset
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-3">
            <Label className="text-xs mb-1.5 block">Quick Select</Label>
            <DateRangePresets onSelect={(from, to) => { setDateFrom(from); setDateTo(to); }} />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {/* Date From */}
            <div className="space-y-1">
              <Label className="text-xs">From</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className={cn('w-full justify-start text-left font-normal text-xs', !dateFrom && 'text-muted-foreground')}>
                    <CalendarIcon className="mr-1 h-3 w-3" />
                    {dateFrom ? format(dateFrom, 'MMM dd, yyyy') : 'Start date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={dateFrom} onSelect={setDateFrom} className="p-3 pointer-events-auto" />
                </PopoverContent>
              </Popover>
            </div>

            {/* Date To */}
            <div className="space-y-1">
              <Label className="text-xs">To</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className={cn('w-full justify-start text-left font-normal text-xs', !dateTo && 'text-muted-foreground')}>
                    <CalendarIcon className="mr-1 h-3 w-3" />
                    {dateTo ? format(dateTo, 'MMM dd, yyyy') : 'End date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={dateTo} onSelect={setDateTo} className="p-3 pointer-events-auto" />
                </PopoverContent>
              </Popover>
            </div>

            {/* Multi-select: Status */}
            <div className="space-y-1">
              <Label className="text-xs">Status</Label>
              <MultiSelectFilter
                label="All Statuses"
                options={statusOptions}
                selected={selectedStatuses}
                onChange={setSelectedStatuses}
              />
            </div>

            {/* Multi-select: Category */}
            <div className="space-y-1">
              <Label className="text-xs">Category</Label>
              <MultiSelectFilter
                label="All Categories"
                options={categoryOptions}
                selected={selectedCategories}
                onChange={setSelectedCategories}
              />
            </div>

            {/* Multi-select: Reps (admin/manager only) */}
            {!isRepOnly && (
              <div className="space-y-1">
                <Label className="text-xs">Sales Rep</Label>
                <MultiSelectFilter
                  label="All Reps"
                  options={repOptions}
                  selected={selectedReps}
                  onChange={setSelectedReps}
                />
              </div>
            )}

            {/* Multi-select: Zone */}
            <div className="space-y-1">
              <Label className="text-xs">Zone</Label>
              <MultiSelectFilter
                label="All Zones"
                options={zoneOptions}
                selected={selectedZones}
                onChange={setSelectedZones}
              />
            </div>

            {/* Campaign tag */}
            <div className="space-y-1">
              <Label className="text-xs">Campaign Tag</Label>
              <Input
                placeholder="e.g. Edition 13"
                value={campaignFilter}
                onChange={e => setCampaignFilter(e.target.value)}
                className="h-8 text-xs"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* KPI Cards */}
      <ReportKPICards
        totalLeads={totalLeads}
        conversionRate={conversionRate}
        interactionCount={filteredInteractions.length}
        avgApprovalDays={avgApprovalDays}
        successRate={successRate}
        isLoading={isLoading}
      />

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ConversionFunnel data={funnelData} />
        <ActivityVolumeChart data={activityData} />
      </div>

      {/* Success Rate Table */}
      {!isRepOnly && <RepSuccessTable data={repSuccessData} />}

      {/* Data Table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Filtered Results ({filteredLeads.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-auto max-h-[400px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Company</TableHead>
                  <TableHead className="text-xs">Contact</TableHead>
                  <TableHead className="text-xs">Category</TableHead>
                  <TableHead className="text-xs">Status</TableHead>
                  <TableHead className="text-xs">Zone</TableHead>
                  <TableHead className="text-xs">Campaign</TableHead>
                  <TableHead className="text-xs">Created</TableHead>
                  {!isRepOnly && <TableHead className="text-xs">Rep</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={isRepOnly ? 7 : 8} className="text-center py-8 text-muted-foreground">Loading…</TableCell></TableRow>
                ) : filteredLeads.length === 0 ? (
                  <TableRow><TableCell colSpan={isRepOnly ? 7 : 8} className="text-center py-8 text-muted-foreground">No leads match filters</TableCell></TableRow>
                ) : (
                  filteredLeads.slice(0, 100).map(lead => (
                    <TableRow key={lead.id}>
                      <TableCell className="font-medium text-xs">{lead.company_name}</TableCell>
                      <TableCell className="text-xs">{lead.contact_person}</TableCell>
                      <TableCell className="text-xs">{lead.category}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={cn('text-[10px]', LEAD_STATUS_CONFIG[lead.status as LeadStatus]?.color)}>
                          {LEAD_STATUS_CONFIG[lead.status as LeadStatus]?.label ?? lead.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs">{lead.location_zone ?? '—'}</TableCell>
                      <TableCell className="text-xs">{lead.campaign_tag || '—'}</TableCell>
                      <TableCell className="text-xs">{format(new Date(lead.created_at), 'MMM dd, yyyy')}</TableCell>
                      {!isRepOnly && <TableCell className="text-xs">{getRepName(lead.created_by)}</TableCell>}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          {filteredLeads.length > 100 && (
            <p className="text-xs text-muted-foreground text-center py-2">Showing first 100 of {filteredLeads.length} results. Export to see all.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Reports;
