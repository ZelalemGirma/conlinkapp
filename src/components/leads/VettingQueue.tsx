import React, { useState } from 'react';
import {
  useSourcingQueue,
  useApproveQueueItem,
  useDeleteQueueItem,
  useBulkDeleteQueueItems,
  useUpdateQueueItem,
  type SourcingQueueItem,
} from '@/hooks/useSourcingQueue';
import { useProfiles } from '@/hooks/useProfiles';
import { LEAD_CATEGORIES } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from '@/components/ui/tooltip';
import { Check, Trash2, Pencil, AlertTriangle, ExternalLink, Brain, Sparkles } from 'lucide-react';

const RelevanceBadge: React.FC<{ score: number }> = ({ score }) => {
  const color = score >= 60 ? 'bg-success/20 text-success' : score >= 30 ? 'bg-warning/20 text-warning' : 'bg-destructive/20 text-destructive';
  return (
    <div className="flex items-center gap-2">
      <Badge variant="outline" className={`text-xs ${color}`}>{score}</Badge>
      <Progress value={score} className="w-16 h-1.5" />
    </div>
  );
};

const QueueTable: React.FC<{
  items: SourcingQueueItem[];
  onEdit: (item: SourcingQueueItem) => void;
  onApprove: (item: SourcingQueueItem) => void;
  onDelete: (id: string) => void;
  showBulkDelete?: boolean;
  onBulkDelete?: (ids: string[]) => void;
}> = ({ items, onEdit, onApprove, onDelete, showBulkDelete, onBulkDelete }) => {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedIds.size === items.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(items.map(i => i.id)));
    }
  };

  return (
    <>
      {showBulkDelete && selectedIds.size > 0 && (
        <div className="p-3 border-b flex items-center gap-3 bg-destructive/5">
          <span className="text-sm font-medium">{selectedIds.size} selected</span>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => {
              onBulkDelete?.(Array.from(selectedIds));
              setSelectedIds(new Set());
            }}
          >
            <Trash2 className="mr-1 h-3 w-3" />Delete Selected
          </Button>
        </div>
      )}
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              {showBulkDelete && (
                <TableHead className="w-10">
                  <input type="checkbox" checked={selectedIds.size === items.length && items.length > 0} onChange={toggleAll} className="rounded" />
                </TableHead>
              )}
              <TableHead>Company</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Relevance</TableHead>
              <TableHead>AI Reasoning</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={showBulkDelete ? 10 : 9} className="text-center py-8 text-muted-foreground">
                  No items in this tab.
                </TableCell>
              </TableRow>
            ) : (
              items.map(item => (
                <TableRow key={item.id} className={item.is_duplicate ? 'bg-destructive/10' : ''}>
                  {showBulkDelete && (
                    <TableCell>
                      <input type="checkbox" checked={selectedIds.has(item.id)} onChange={() => toggleSelect(item.id)} className="rounded" />
                    </TableCell>
                  )}
                  <TableCell>
                    <div className="font-medium">{item.company_name || '—'}</div>
                    {item.contact_person && (
                      <div className="text-xs text-muted-foreground">{item.contact_person}</div>
                    )}
                    {item.address && (
                      <div className="text-xs text-muted-foreground truncate max-w-[180px]">{item.address}</div>
                    )}
                  </TableCell>
                  <TableCell>
                    <span className={item.is_duplicate ? 'text-destructive font-semibold' : ''}>
                      {item.phone || '—'}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm">{item.email || '—'}</TableCell>
                  <TableCell className="text-xs">{item.category || '—'}</TableCell>
                  <TableCell>
                    <RelevanceBadge score={item.relevance_score} />
                  </TableCell>
                  <TableCell>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="flex items-start gap-1 max-w-[200px]">
                            <Brain className="h-3 w-3 mt-0.5 text-primary shrink-0" />
                            <span className="text-xs text-muted-foreground line-clamp-2">{item.ai_reasoning || '—'}</span>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent side="bottom" className="max-w-sm">
                          <p className="text-sm">{item.ai_reasoning}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </TableCell>
                  <TableCell>
                    {item.is_duplicate ? (
                      <Badge variant="destructive" className="text-xs">
                        <AlertTriangle className="mr-1 h-3 w-3" />Duplicate
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-xs">Pending</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="sm" onClick={() => onEdit(item)} title="Edit">
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost" size="sm"
                        onClick={() => onApprove(item)}
                        disabled={item.is_duplicate}
                        title={item.is_duplicate ? 'Cannot approve duplicate' : 'Approve & Assign'}
                        className="text-success hover:text-success"
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost" size="sm"
                        onClick={() => onDelete(item.id)}
                        title="Purge"
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </>
  );
};

const VettingQueue: React.FC = () => {
  const { data: highQueue, isLoading: loadingHigh } = useSourcingQueue('high');
  const { data: mediumQueue, isLoading: loadingMed } = useSourcingQueue('medium');
  const { data: lowQueue, isLoading: loadingLow } = useSourcingQueue('low');
  const { data: profiles } = useProfiles();
  const approveMutation = useApproveQueueItem();
  const deleteMutation = useDeleteQueueItem();
  const bulkDeleteMutation = useBulkDeleteQueueItems();
  const updateMutation = useUpdateQueueItem();

  const [editItem, setEditItem] = useState<SourcingQueueItem | null>(null);
  const [editForm, setEditForm] = useState<Partial<SourcingQueueItem>>({});
  const [approveItem, setApproveItem] = useState<SourcingQueueItem | null>(null);
  const [assignRepId, setAssignRepId] = useState('');
  const [assignCategory, setAssignCategory] = useState('');

  const handleEdit = (item: SourcingQueueItem) => {
    setEditItem(item);
    setEditForm({
      company_name: item.company_name,
      contact_person: item.contact_person,
      phone: item.phone,
      email: item.email,
      address: item.address,
      category: item.category,
    });
  };

  const handleSaveEdit = async () => {
    if (!editItem) return;
    await updateMutation.mutateAsync({ id: editItem.id, updates: editForm as any });
    setEditItem(null);
  };

  const handleApproveClick = (item: SourcingQueueItem) => {
    setApproveItem(item);
    setAssignCategory(item.category || LEAD_CATEGORIES[0]);
    setAssignRepId('');
  };

  const handleConfirmApprove = async () => {
    if (!approveItem || !assignRepId || !assignCategory) return;
    await approveMutation.mutateAsync({
      item: approveItem,
      assignedRepId: assignRepId,
      category: assignCategory,
    });
    setApproveItem(null);
  };

  const isLoading = loadingHigh || loadingMed || loadingLow;
  const totalCount = (highQueue?.length || 0) + (mediumQueue?.length || 0) + (lowQueue?.length || 0);

  if (isLoading) {
    return (
      <Card>
        <CardHeader><CardTitle>AI Vetting Queue</CardTitle></CardHeader>
        <CardContent>
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full mb-2" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (totalCount === 0) {
    return (
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Sparkles className="h-5 w-5 text-primary" />AI Vetting Queue</CardTitle></CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-8">
            No items in the vetting queue. Use "Fetch from URL" to scrape leads from a website.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            AI Vetting Queue
            <Badge variant="secondary">{totalCount}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Tabs defaultValue="high">
            <div className="px-4 pt-2">
              <TabsList>
                <TabsTrigger value="high" className="gap-1">
                  High Priority <Badge variant="default" className="ml-1 text-xs h-5">{highQueue?.length || 0}</Badge>
                </TabsTrigger>
                <TabsTrigger value="medium" className="gap-1">
                  Medium <Badge variant="secondary" className="ml-1 text-xs h-5">{mediumQueue?.length || 0}</Badge>
                </TabsTrigger>
                <TabsTrigger value="low" className="gap-1">
                  Trash / Low <Badge variant="outline" className="ml-1 text-xs h-5">{lowQueue?.length || 0}</Badge>
                </TabsTrigger>
              </TabsList>
            </div>
            <TabsContent value="high" className="mt-0">
              <QueueTable
                items={highQueue || []}
                onEdit={handleEdit}
                onApprove={handleApproveClick}
                onDelete={(id) => deleteMutation.mutate(id)}
                showBulkDelete
                onBulkDelete={(ids) => bulkDeleteMutation.mutate(ids)}
              />
            </TabsContent>
            <TabsContent value="medium" className="mt-0">
              <QueueTable
                items={mediumQueue || []}
                onEdit={handleEdit}
                onApprove={handleApproveClick}
                onDelete={(id) => deleteMutation.mutate(id)}
                showBulkDelete
                onBulkDelete={(ids) => bulkDeleteMutation.mutate(ids)}
              />
            </TabsContent>
            <TabsContent value="low" className="mt-0">
              <QueueTable
                items={lowQueue || []}
                onEdit={handleEdit}
                onApprove={handleApproveClick}
                onDelete={(id) => deleteMutation.mutate(id)}
                showBulkDelete
                onBulkDelete={(ids) => bulkDeleteMutation.mutate(ids)}
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={!!editItem} onOpenChange={() => setEditItem(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Raw Lead</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Company Name" value={editForm.company_name || ''} onChange={e => setEditForm(prev => ({ ...prev, company_name: e.target.value }))} />
            <Input placeholder="Contact Person" value={editForm.contact_person || ''} onChange={e => setEditForm(prev => ({ ...prev, contact_person: e.target.value }))} />
            <Input placeholder="Phone" value={editForm.phone || ''} onChange={e => setEditForm(prev => ({ ...prev, phone: e.target.value }))} />
            <Input placeholder="Email" value={editForm.email || ''} onChange={e => setEditForm(prev => ({ ...prev, email: e.target.value }))} />
            <Input placeholder="Address" value={editForm.address || ''} onChange={e => setEditForm(prev => ({ ...prev, address: e.target.value }))} />
            <Select value={editForm.category || ''} onValueChange={v => setEditForm(prev => ({ ...prev, category: v }))}>
              <SelectTrigger><SelectValue placeholder="Category" /></SelectTrigger>
              <SelectContent>
                {LEAD_CATEGORIES.map(c => (<SelectItem key={c} value={c}>{c}</SelectItem>))}
              </SelectContent>
            </Select>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditItem(null)}>Cancel</Button>
              <Button onClick={handleSaveEdit} disabled={updateMutation.isPending}>Save</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Approve & Assign Dialog */}
      <Dialog open={!!approveItem} onOpenChange={() => setApproveItem(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Approve & Assign Lead</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Assign <strong>{approveItem?.company_name || 'this lead'}</strong> to a sales rep.
            </p>
            {approveItem?.ai_reasoning && (
              <div className="bg-muted/50 p-3 rounded-md flex items-start gap-2">
                <Brain className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs font-medium text-primary mb-1">AI Analysis</p>
                  <p className="text-sm text-muted-foreground">{approveItem.ai_reasoning}</p>
                  <p className="text-xs mt-1">Relevance Score: <strong>{approveItem.relevance_score}/100</strong></p>
                </div>
              </div>
            )}
            <Select value={assignCategory} onValueChange={setAssignCategory}>
              <SelectTrigger><SelectValue placeholder="Category" /></SelectTrigger>
              <SelectContent>
                {LEAD_CATEGORIES.map(c => (<SelectItem key={c} value={c}>{c}</SelectItem>))}
              </SelectContent>
            </Select>
            <Select value={assignRepId} onValueChange={setAssignRepId}>
              <SelectTrigger><SelectValue placeholder="Assign to rep..." /></SelectTrigger>
              <SelectContent>
                {profiles?.map(p => (
                  <SelectItem key={p.user_id} value={p.user_id}>{p.full_name || p.user_id}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setApproveItem(null)}>Cancel</Button>
              <Button onClick={handleConfirmApprove} disabled={!assignRepId || !assignCategory || approveMutation.isPending}>
                Confirm & Assign
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default VettingQueue;
