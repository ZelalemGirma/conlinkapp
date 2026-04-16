import React, { useState, useMemo } from 'react';
import { useLeads, useDeleteLeads } from '@/hooks/useLeads';
import { useAuth } from '@/contexts/AuthContext';
import { LEAD_CATEGORIES, LOCATION_ZONES, LEAD_STATUS_CONFIG, LEAD_SOURCES } from '@/types';
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
import { Card, CardContent } from '@/components/ui/card';
import { Plus, Search, Phone, Mail, X, Download, FileText, Merge, Globe, ArrowUpDown, ArrowUp, ArrowDown, Trash2, Pencil, ChevronLeft, ChevronRight } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import { exportLeadsCSV, exportLeadsPDF } from '@/utils/exportLeads';
import MergeLeadsDialog from '@/components/leads/MergeLeadsDialog';
import FetchLeadsDialog from '@/components/leads/FetchLeadsDialog';
import VettingQueue from '@/components/leads/VettingQueue';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

type SortField = 'company_name' | 'contact_person' | 'category' | 'location_zone' | 'status' | 'updated_at' | 'campaign_tag';
type SortDir = 'asc' | 'desc';

const Leads = () => {
  const { role } = useAuth();
  const isAdmin = role === 'admin';
  const isManagerOrAdmin = role === 'admin' || role === 'manager';
  const [formOpen, setFormOpen] = useState(false);
  const [mergeOpen, setMergeOpen] = useState(false);
  const [fetchOpen, setFetchOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<LeadRow | null>(null);
  const [editLead, setEditLead] = useState<LeadRow | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [zoneFilter, setZoneFilter] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [sortField, setSortField] = useState<SortField>('updated_at');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 25;

  const deleteLeads = useDeleteLeads();

  const { data: leads, isLoading } = useLeads({
    search: search || undefined,
    category: categoryFilter || undefined,
    status: statusFilter || undefined,
    zone: zoneFilter || undefined,
    source: sourceFilter || undefined,
  });

  const sortedLeads = useMemo(() => {
    if (!leads) return [];
    return [...leads].sort((a, b) => {
      const av = (a[sortField] ?? '') as string;
      const bv = (b[sortField] ?? '') as string;
      const cmp = av.localeCompare(bv, undefined, { sensitivity: 'base' });
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [leads, sortField, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sortedLeads.length / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const paginatedLeads = sortedLeads.slice((safeCurrentPage - 1) * pageSize, safeCurrentPage * pageSize);

  const hasFilters = search || categoryFilter || statusFilter || zoneFilter || sourceFilter;
  const clearFilters = () => {
    setSearch('');
    setCategoryFilter('');
    setStatusFilter('');
    setZoneFilter('');
    setSourceFilter('');
    setCurrentPage(1);
  };

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="h-3 w-3 ml-1 opacity-40" />;
    return sortDir === 'asc' ? <ArrowUp className="h-3 w-3 ml-1" /> : <ArrowDown className="h-3 w-3 ml-1" />;
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (!paginatedLeads.length) return;
    const pageIds = paginatedLeads.map(l => l.id);
    const allSelected = pageIds.every(id => selectedIds.has(id));
    if (allSelected) {
      setSelectedIds(prev => { const next = new Set(prev); pageIds.forEach(id => next.delete(id)); return next; });
    } else {
      setSelectedIds(prev => { const next = new Set(prev); pageIds.forEach(id => next.add(id)); return next; });
    }
  };

  const handleBulkDelete = () => {
    deleteLeads.mutate([...selectedIds], {
      onSuccess: () => {
        setSelectedIds(new Set());
        setDeleteConfirmOpen(false);
      },
    });
  };

  const handleEditSelected = () => {
    if (selectedIds.size !== 1) return;
    const lead = (leads || []).find(l => selectedIds.has(l.id));
    if (lead) {
      setEditLead(lead);
      setFormOpen(true);
    }
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
          {isManagerOrAdmin && (
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
          <Button onClick={() => { setEditLead(null); setFormOpen(true); }}>
            <Plus className="mr-2 h-4 w-4" />
            New Lead
          </Button>
        </div>
      </div>

      {/* Bulk Actions Bar */}
      {isAdmin && selectedIds.size > 0 && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="py-3 flex items-center gap-3 flex-wrap">
            <span className="text-sm font-medium">{selectedIds.size} selected</span>
            {selectedIds.size === 1 && (
              <Button variant="outline" size="sm" onClick={handleEditSelected}>
                <Pencil className="mr-1 h-3.5 w-3.5" /> Edit
              </Button>
            )}
            <Button variant="destructive" size="sm" onClick={() => setDeleteConfirmOpen(true)}>
              <Trash2 className="mr-1 h-3.5 w-3.5" /> Delete ({selectedIds.size})
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setSelectedIds(new Set())}>
              <X className="mr-1 h-3 w-3" /> Clear
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="pt-4 pb-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
            <div className="relative lg:col-span-2">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search company, contact, phone..."
                value={search}
                onChange={e => { setSearch(e.target.value); setCurrentPage(1); }}
                className="pl-9"
              />
            </div>
            <Select value={categoryFilter} onValueChange={v => { setCategoryFilter(v === 'all' ? '' : v); setCurrentPage(1); }}>
              <SelectTrigger><SelectValue placeholder="Category" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {LEAD_CATEGORIES.map(c => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={v => { setStatusFilter(v === 'all' ? '' : v); setCurrentPage(1); }}>
              <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {Object.entries(LEAD_STATUS_CONFIG).map(([key, val]) => (
                  <SelectItem key={key} value={key}>{val.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={zoneFilter} onValueChange={v => { setZoneFilter(v === 'all' ? '' : v); setCurrentPage(1); }}>
              <SelectTrigger><SelectValue placeholder="Zone" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Zones</SelectItem>
                {LOCATION_ZONES.map(z => (
                  <SelectItem key={z} value={z}>{z}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={sourceFilter} onValueChange={v => { setSourceFilter(v === 'all' ? '' : v); setCurrentPage(1); }}>
              <SelectTrigger><SelectValue placeholder="Source" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sources</SelectItem>
                {LEAD_SOURCES.map(s => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
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
                  {isAdmin && (
                    <TableHead className="w-10">
                      <Checkbox
                        checked={paginatedLeads.length > 0 && paginatedLeads.every(l => selectedIds.has(l.id))}
                        onCheckedChange={toggleSelectAll}
                      />
                    </TableHead>
                  )}
                  <TableHead className="cursor-pointer select-none" onClick={() => toggleSort('company_name')}>
                    <span className="inline-flex items-center">Company <SortIcon field="company_name" /></span>
                  </TableHead>
                  <TableHead className="cursor-pointer select-none" onClick={() => toggleSort('contact_person')}>
                    <span className="inline-flex items-center">Contact <SortIcon field="contact_person" /></span>
                  </TableHead>
                  <TableHead className="cursor-pointer select-none" onClick={() => toggleSort('category')}>
                    <span className="inline-flex items-center">Category <SortIcon field="category" /></span>
                  </TableHead>
                  <TableHead className="cursor-pointer select-none" onClick={() => toggleSort('location_zone')}>
                    <span className="inline-flex items-center">Zone <SortIcon field="location_zone" /></span>
                  </TableHead>
                  <TableHead className="cursor-pointer select-none" onClick={() => toggleSort('status')}>
                    <span className="inline-flex items-center">Status <SortIcon field="status" /></span>
                  </TableHead>
                  <TableHead>Health</TableHead>
                  <TableHead className="cursor-pointer select-none" onClick={() => toggleSort('campaign_tag')}>
                    <span className="inline-flex items-center">Campaign <SortIcon field="campaign_tag" /></span>
                  </TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: isAdmin ? 9 : 8 }).map((_, j) => (
                        <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : paginatedLeads.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={isAdmin ? 9 : 8} className="text-center py-12 text-muted-foreground">
                      {hasFilters ? 'No leads match your filters.' : 'No leads yet. Click "New Lead" to create one.'}
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedLeads.map(lead => (
                    <TableRow key={lead.id} className="group cursor-pointer hover:bg-muted/50" onClick={() => { setSelectedLead(lead); setDetailOpen(true); }}>
                      {isAdmin && (
                        <TableCell onClick={e => e.stopPropagation()}>
                          <Checkbox
                            checked={selectedIds.has(lead.id)}
                            onCheckedChange={() => toggleSelect(lead.id)}
                          />
                        </TableCell>
                      )}
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
                      <TableCell className="text-right" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          {isAdmin && (
                            <Button variant="ghost" size="sm" className="text-xs" onClick={() => { setEditLead(lead); setFormOpen(true); }}>
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          <Button variant="ghost" size="sm" className="text-xs" onClick={() => { setSelectedLead(lead); setDetailOpen(true); }}>View</Button>
                        </div>
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
        ) : paginatedLeads.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              {hasFilters ? 'No leads match your filters.' : 'No leads yet. Click "New Lead" to create one.'}
            </CardContent>
          </Card>
        ) : (
          paginatedLeads.map(lead => (
            <Card
              key={lead.id}
              className="cursor-pointer hover:bg-muted/50 transition-colors"
              onClick={() => { setSelectedLead(lead); setDetailOpen(true); }}
            >
              <CardContent className="p-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2 min-w-0">
                    {isAdmin && (
                      <div onClick={e => e.stopPropagation()} className="pt-0.5">
                        <Checkbox
                          checked={selectedIds.has(lead.id)}
                          onCheckedChange={() => toggleSelect(lead.id)}
                        />
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="font-medium truncate">{lead.company_name}</div>
                      {lead.contact_person && <div className="text-sm text-muted-foreground">{lead.contact_person}</div>}
                    </div>
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

      {/* Pagination */}
      {sortedLeads.length > pageSize && (
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <span className="text-sm text-muted-foreground">
            Showing {(safeCurrentPage - 1) * pageSize + 1}–{Math.min(safeCurrentPage * pageSize, sortedLeads.length)} of {sortedLeads.length}
          </span>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="sm" disabled={safeCurrentPage <= 1} onClick={() => setCurrentPage(p => p - 1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(p => p === 1 || p === totalPages || Math.abs(p - safeCurrentPage) <= 1)
              .reduce<(number | 'ellipsis')[]>((acc, p, idx, arr) => {
                if (idx > 0 && p - (arr[idx - 1]) > 1) acc.push('ellipsis');
                acc.push(p);
                return acc;
              }, [])
              .map((item, idx) =>
                item === 'ellipsis' ? (
                  <span key={`e${idx}`} className="px-2 text-muted-foreground">…</span>
                ) : (
                  <Button key={item} variant={item === safeCurrentPage ? 'default' : 'outline'} size="sm" className="w-9" onClick={() => setCurrentPage(item as number)}>
                    {item}
                  </Button>
                )
              )}
            <Button variant="outline" size="sm" disabled={safeCurrentPage >= totalPages} onClick={() => setCurrentPage(p => p + 1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Vetting Queue - admin/manager only */}
      {isManagerOrAdmin && <VettingQueue />}

      <LeadFormDialog open={formOpen} onOpenChange={setFormOpen} editLead={editLead} />
      <LeadDetailDialog lead={selectedLead} open={detailOpen} onOpenChange={setDetailOpen} />
      <MergeLeadsDialog open={mergeOpen} onOpenChange={setMergeOpen} />
      <FetchLeadsDialog open={fetchOpen} onOpenChange={setFetchOpen} />

      {/* Delete Confirmation */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedIds.size} lead(s)?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. All associated interactions and meetings will remain but will be unlinked.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleBulkDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deleteLeads.isPending ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Leads;
