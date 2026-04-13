import React, { useState } from 'react';
import { useLeads } from '@/hooks/useLeads';
import { useAuth } from '@/contexts/AuthContext';
import { LEAD_CATEGORIES, LOCATION_ZONES, LEAD_STATUS_CONFIG } from '@/types';
import LeadFormDialog from '@/components/leads/LeadFormDialog';
import LeadDetailDialog from '@/components/leads/LeadDetailDialog';
import LeadStatusBadge from '@/components/leads/LeadStatusBadge';
import LeadHealthIndicator from '@/components/leads/LeadHealthIndicator';
import { Button } from '@/components/ui/button';
import type { Database } from '@/integrations/supabase/types';

type LeadRow = Database['public']['Tables']['leads']['Row'];
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Search, Phone, Mail, X, Download, FileText, Merge, Globe } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { exportLeadsCSV, exportLeadsPDF } from '@/utils/exportLeads';
import MergeLeadsDialog from '@/components/leads/MergeLeadsDialog';
import FetchLeadsDialog from '@/components/leads/FetchLeadsDialog';
import VettingQueue from '@/components/leads/VettingQueue';

const Leads = () => {
  const { role } = useAuth();
  const [formOpen, setFormOpen] = useState(false);
  const [mergeOpen, setMergeOpen] = useState(false);
  const [fetchOpen, setFetchOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<LeadRow | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [zoneFilter, setZoneFilter] = useState('');

  const { data: leads, isLoading } = useLeads({
    search: search || undefined,
    category: categoryFilter || undefined,
    status: statusFilter || undefined,
    zone: zoneFilter || undefined,
  });

  const hasFilters = search || categoryFilter || statusFilter || zoneFilter;
  const clearFilters = () => {
    setSearch('');
    setCategoryFilter('');
    setStatusFilter('');
    setZoneFilter('');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-secondary">Leads</h1>
          <p className="text-muted-foreground">
            {leads?.length ?? 0} lead{leads?.length !== 1 ? 's' : ''} total
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {(role === 'admin' || role === 'manager') && (
            <>
              <Button variant="outline" size="sm" onClick={() => setFetchOpen(true)}>
                <Globe className="mr-1 h-4 w-4" />Fetch from URL
              </Button>
              <Button variant="outline" size="sm" onClick={() => setMergeOpen(true)}>
                <Merge className="mr-1 h-4 w-4" />Merge
              </Button>
            </>
          )}
          <Button variant="outline" size="sm" onClick={() => leads && exportLeadsCSV(leads)} disabled={!leads?.length}>
            <Download className="mr-1 h-4 w-4" />CSV
          </Button>
          <Button variant="outline" size="sm" onClick={() => leads && exportLeadsPDF(leads)} disabled={!leads?.length}>
            <FileText className="mr-1 h-4 w-4" />PDF
          </Button>
          <Button onClick={() => setFormOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            New Lead
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4 pb-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <div className="relative lg:col-span-2">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search company, contact, phone..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={categoryFilter} onValueChange={v => setCategoryFilter(v === 'all' ? '' : v)}>
              <SelectTrigger><SelectValue placeholder="Category" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {LEAD_CATEGORIES.map(c => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={v => setStatusFilter(v === 'all' ? '' : v)}>
              <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {Object.entries(LEAD_STATUS_CONFIG).map(([key, val]) => (
                  <SelectItem key={key} value={key}>{val.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={zoneFilter} onValueChange={v => setZoneFilter(v === 'all' ? '' : v)}>
              <SelectTrigger><SelectValue placeholder="Zone" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Zones</SelectItem>
                {LOCATION_ZONES.map(z => (
                  <SelectItem key={z} value={z}>{z}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {hasFilters && (
            <Button variant="ghost" size="sm" className="mt-2 text-xs" onClick={clearFilters}>
              <X className="mr-1 h-3 w-3" /> Clear filters
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Table - Desktop */}
      <Card className="hidden lg:block">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Company</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Zone</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Health</TableHead>
                  <TableHead>Campaign</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 8 }).map((_, j) => (
                        <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : leads?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                      {hasFilters ? 'No leads match your filters.' : 'No leads yet. Click "New Lead" to create one.'}
                    </TableCell>
                  </TableRow>
                ) : (
                  leads?.map(lead => (
                    <TableRow key={lead.id} className="group cursor-pointer hover:bg-muted/50" onClick={() => { setSelectedLead(lead); setDetailOpen(true); }}>
                      <TableCell>
                        <div className="font-medium">{lead.company_name}</div>
                        {lead.specific_address && (
                          <div className="text-xs text-muted-foreground truncate max-w-[200px]">
                            {lead.specific_address}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div>{lead.contact_person}</div>
                        <div className="flex items-center gap-2 mt-0.5">
                          {lead.phone && (
                            <a href={`tel:${lead.phone}`} onClick={e => e.stopPropagation()} className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                              <Phone className="h-3 w-3" />{lead.phone}
                            </a>
                          )}
                          {lead.email && (
                            <a href={`mailto:${lead.email}`} onClick={e => e.stopPropagation()} className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary">
                              <Mail className="h-3 w-3" />
                            </a>
                          )}
                        </div>
                      </TableCell>
                      <TableCell><span className="text-xs">{lead.category}</span></TableCell>
                      <TableCell><span className="text-sm">{lead.location_zone || '—'}</span></TableCell>
                      <TableCell><LeadStatusBadge status={lead.status} /></TableCell>
                      <TableCell><LeadHealthIndicator updatedAt={lead.updated_at} status={lead.status} /></TableCell>
                      <TableCell><span className="text-xs text-muted-foreground">{lead.campaign_tag || '—'}</span></TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" className="text-xs">View</Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Card list - Tablet & Mobile */}
      <div className="lg:hidden space-y-3">
        {isLoading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <Card key={i}><CardContent className="p-4"><Skeleton className="h-16 w-full" /></CardContent></Card>
          ))
        ) : leads?.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              {hasFilters ? 'No leads match your filters.' : 'No leads yet. Click "New Lead" to create one.'}
            </CardContent>
          </Card>
        ) : (
          leads?.map(lead => (
            <Card
              key={lead.id}
              className="cursor-pointer hover:bg-muted/50 transition-colors"
              onClick={() => { setSelectedLead(lead); setDetailOpen(true); }}
            >
              <CardContent className="p-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-medium truncate">{lead.company_name}</div>
                    {lead.contact_person && <div className="text-sm text-muted-foreground">{lead.contact_person}</div>}
                  </div>
                  <LeadStatusBadge status={lead.status} />
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="text-muted-foreground">{lead.category}</span>
                  {lead.location_zone && <span className="text-muted-foreground">• {lead.location_zone}</span>}
                  <LeadHealthIndicator updatedAt={lead.updated_at} status={lead.status} />
                </div>
                <div className="flex flex-wrap items-center gap-3 text-xs">
                  {lead.phone && (
                    <a href={`tel:${lead.phone}`} onClick={e => e.stopPropagation()} className="inline-flex items-center gap-1 text-primary hover:underline">
                      <Phone className="h-3 w-3" />{lead.phone}
                    </a>
                  )}
                  {lead.email && (
                    <a href={`mailto:${lead.email}`} onClick={e => e.stopPropagation()} className="inline-flex items-center gap-1 text-muted-foreground hover:text-primary">
                      <Mail className="h-3 w-3" />{lead.email}
                    </a>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Vetting Queue - admin/manager only */}
      {(role === 'admin' || role === 'manager') && <VettingQueue />}

      <LeadFormDialog open={formOpen} onOpenChange={setFormOpen} />
      <LeadDetailDialog lead={selectedLead} open={detailOpen} onOpenChange={setDetailOpen} />
      <MergeLeadsDialog open={mergeOpen} onOpenChange={setMergeOpen} />
      <FetchLeadsDialog open={fetchOpen} onOpenChange={setFetchOpen} />
    </div>
  );
};

export default Leads;
