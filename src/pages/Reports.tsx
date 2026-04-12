import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useProfiles } from '@/hooks/useProfiles';
import { LEAD_CATEGORIES, LOCATION_ZONES, LEAD_STATUS_CONFIG } from '@/types';
import type { LeadStatus, LeadCategory } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { CalendarIcon, Download, FileText, Users, TrendingUp, MessageSquare, RotateCcw } from 'lucide-react';
import type { Database } from '@/integrations/supabase/types';

type LeadRow = Database['public']['Tables']['leads']['Row'];
type InteractionRow = Database['public']['Tables']['interaction_logs']['Row'];

const ALL_STATUSES = Object.keys(LEAD_STATUS_CONFIG) as LeadStatus[];

const Reports: React.FC = () => {
  const { user, role } = useAuth();
  const { data: profiles } = useProfiles();
  const isRepOnly = role === 'rep';

  // Filters
  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [dateTo, setDateTo] = useState<Date | undefined>();
  const [repFilter, setRepFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [zoneFilter, setZoneFilter] = useState<string>('all');
  const [campaignFilter, setCampaignFilter] = useState<string>('');

  // Fetch all leads
  const { data: allLeads = [], isLoading: leadsLoading } = useQuery({
    queryKey: ['reports-leads'],
    queryFn: async () => {
      const { data, error } = await supabase.from('leads').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data as LeadRow[];
    },
  });

  // Fetch all interactions
  const { data: allInteractions = [], isLoading: interactionsLoading } = useQuery({
    queryKey: ['reports-interactions'],
    queryFn: async () => {
      const { data, error } = await supabase.from('interaction_logs').select('*');
      if (error) throw error;
      return data as InteractionRow[];
    },
  });

  // Fetch all reps for filter dropdown
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

  // Apply role-based + filter logic
  const filteredLeads = useMemo(() => {
    let leads = allLeads;

    // Role-based: reps only see their own
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
    if (repFilter !== 'all') {
      leads = leads.filter(l => l.created_by === repFilter || l.assigned_rep_id === repFilter);
    }
    if (statusFilter !== 'all') {
      leads = leads.filter(l => l.status === statusFilter);
    }
    if (categoryFilter !== 'all') {
      leads = leads.filter(l => l.category === categoryFilter);
    }
    if (zoneFilter !== 'all') {
      leads = leads.filter(l => l.location_zone === zoneFilter);
    }
    if (campaignFilter.trim()) {
      const tag = campaignFilter.trim().toLowerCase();
      leads = leads.filter(l => l.campaign_tag?.toLowerCase().includes(tag));
    }

    return leads;
  }, [allLeads, isRepOnly, user, dateFrom, dateTo, repFilter, statusFilter, categoryFilter, zoneFilter, campaignFilter]);

  // Filtered interaction count
  const filteredLeadIds = useMemo(() => new Set(filteredLeads.map(l => l.id)), [filteredLeads]);
  const filteredInteractionCount = useMemo(
    () => allInteractions.filter(i => filteredLeadIds.has(i.lead_id)).length,
    [allInteractions, filteredLeadIds]
  );

  // Summary stats
  const totalLeads = filteredLeads.length;
  const conversions = filteredLeads.filter(l => l.status === 'deal_closed').length;
  const conversionRate = totalLeads > 0 ? ((conversions / totalLeads) * 100).toFixed(1) : '0.0';

  const getRepName = (userId: string) => {
    const p = (profiles ?? []).find(p => p.user_id === userId);
    return p?.full_name || 'Unknown';
  };

  const resetFilters = () => {
    setDateFrom(undefined);
    setDateTo(undefined);
    setRepFilter('all');
    setStatusFilter('all');
    setCategoryFilter('all');
    setZoneFilter('all');
    setCampaignFilter('');
  };

  // Export CSV
  const exportCSV = () => {
    const headers = ['Company', 'Contact', 'Phone', 'Email', 'Category', 'Status', 'Zone', 'Campaign', 'Created', 'Rep'];
    const rows = filteredLeads.map(l => [
      l.company_name,
      l.contact_person,
      l.phone ?? '',
      l.email ?? '',
      l.category,
      LEAD_STATUS_CONFIG[l.status as LeadStatus]?.label ?? l.status,
      l.location_zone ?? '',
      l.campaign_tag ?? '',
      format(new Date(l.created_at), 'yyyy-MM-dd'),
      getRepName(l.created_by),
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

  // Export PDF (simple print-based)
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
      <div class="summary"><div class="card"><strong>Total Leads:</strong> ${totalLeads}</div><div class="card"><strong>Conversion Rate:</strong> ${conversionRate}%</div><div class="card"><strong>Interactions:</strong> ${filteredInteractionCount}</div></div>
      <table><thead><tr><th>Company</th><th>Contact</th><th>Category</th><th>Status</th><th>Zone</th><th>Created</th></tr></thead><tbody>${tableRows}</tbody></table>
    </body></html>`);
    printWindow.document.close();
    printWindow.print();
  };

  const isLoading = leadsLoading || interactionsLoading;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Global Reports</h1>
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

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Filters</CardTitle>
            <Button variant="ghost" size="sm" onClick={resetFilters}>
              <RotateCcw className="mr-1 h-3 w-3" /> Reset
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {/* Date From */}
            <div className="space-y-1">
              <Label className="text-xs">From</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className={cn('w-full justify-start text-left font-normal text-xs', !dateFrom && 'text-muted-foreground')}>
                    <CalendarIcon className="mr-1 h-3 w-3" />
                    {dateFrom ? format(dateFrom, 'MMM dd') : 'Start'}
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
                    {dateTo ? format(dateTo, 'MMM dd') : 'End'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={dateTo} onSelect={setDateTo} className="p-3 pointer-events-auto" />
                </PopoverContent>
              </Popover>
            </div>
            {/* Sales Rep */}
            {!isRepOnly && (
              <div className="space-y-1">
                <Label className="text-xs">Sales Rep</Label>
                <Select value={repFilter} onValueChange={setRepFilter}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Reps</SelectItem>
                    {repProfiles.map(r => (
                      <SelectItem key={r.user_id} value={r.user_id}>{r.full_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {/* Status */}
            <div className="space-y-1">
              <Label className="text-xs">Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  {ALL_STATUSES.map(s => (
                    <SelectItem key={s} value={s}>{LEAD_STATUS_CONFIG[s].label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {/* Category */}
            <div className="space-y-1">
              <Label className="text-xs">Category</Label>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {LEAD_CATEGORIES.map(c => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {/* Zone */}
            <div className="space-y-1">
              <Label className="text-xs">Zone</Label>
              <Select value={zoneFilter} onValueChange={setZoneFilter}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Zones</SelectItem>
                  {LOCATION_ZONES.map(z => (
                    <SelectItem key={z} value={z}>{z}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          {/* Campaign tag */}
          <div className="mt-3 max-w-xs">
            <Label className="text-xs">Campaign Tag</Label>
            <Input
              placeholder="e.g. Edition 13"
              value={campaignFilter}
              onChange={e => setCampaignFilter(e.target.value)}
              className="h-8 text-xs"
            />
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6 flex items-center gap-4">
            <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
              <Users className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Leads</p>
              <p className="text-2xl font-bold">{isLoading ? '—' : totalLeads}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 flex items-center gap-4">
            <div className="h-12 w-12 rounded-lg bg-success/10 flex items-center justify-center">
              <TrendingUp className="h-6 w-6 text-success" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Conversion Rate</p>
              <p className="text-2xl font-bold">{isLoading ? '—' : `${conversionRate}%`}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 flex items-center gap-4">
            <div className="h-12 w-12 rounded-lg bg-info/10 flex items-center justify-center">
              <MessageSquare className="h-6 w-6 text-info" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Interactions</p>
              <p className="text-2xl font-bold">{isLoading ? '—' : filteredInteractionCount}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Data Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Filtered Results ({filteredLeads.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-auto max-h-[400px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Company</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Zone</TableHead>
                  <TableHead>Campaign</TableHead>
                  <TableHead>Created</TableHead>
                  {!isRepOnly && <TableHead>Rep</TableHead>}
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
                      <TableCell className="font-medium">{lead.company_name}</TableCell>
                      <TableCell>{lead.contact_person}</TableCell>
                      <TableCell className="text-xs">{lead.category}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={cn('text-xs', LEAD_STATUS_CONFIG[lead.status as LeadStatus]?.color)}>
                          {LEAD_STATUS_CONFIG[lead.status as LeadStatus]?.label ?? lead.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{lead.location_zone ?? '—'}</TableCell>
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
