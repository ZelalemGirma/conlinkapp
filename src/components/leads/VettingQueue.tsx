import React, { useState } from 'react';
import {
  useSourcingQueue,
  useApproveQueueItem,
  useDeleteQueueItem,
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
import { Check, Trash2, Pencil, AlertTriangle, ExternalLink } from 'lucide-react';

const VettingQueue: React.FC = () => {
  const { data: queue, isLoading } = useSourcingQueue();
  const { data: profiles } = useProfiles();
  const approveMutation = useApproveQueueItem();
  const deleteMutation = useDeleteQueueItem();
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

  if (isLoading) {
    return (
      <Card>
        <CardHeader><CardTitle>Vetting Queue</CardTitle></CardHeader>
        <CardContent>
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full mb-2" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (!queue || queue.length === 0) {
    return (
      <Card>
        <CardHeader><CardTitle>Vetting Queue</CardTitle></CardHeader>
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
            Vetting Queue
            <Badge variant="secondary">{queue.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Company</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {queue.map(item => (
                  <TableRow key={item.id} className={item.is_duplicate ? 'bg-destructive/10' : ''}>
                    <TableCell>
                      <div className="font-medium">{item.company_name || '—'}</div>
                      {item.contact_person && (
                        <div className="text-xs text-muted-foreground">{item.contact_person}</div>
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
                      <a
                        href={item.source_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                      >
                        <ExternalLink className="h-3 w-3" />
                        Link
                      </a>
                    </TableCell>
                    <TableCell>
                      {item.is_duplicate ? (
                        <Badge variant="destructive" className="text-xs">
                          <AlertTriangle className="mr-1 h-3 w-3" />
                          Duplicate
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs">Pending</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(item)}
                          title="Edit"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleApproveClick(item)}
                          disabled={item.is_duplicate}
                          title={item.is_duplicate ? 'Cannot approve duplicate' : 'Approve & Assign'}
                          className="text-success hover:text-success"
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteMutation.mutate(item.id)}
                          title="Purge"
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={!!editItem} onOpenChange={() => setEditItem(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Raw Lead</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              placeholder="Company Name"
              value={editForm.company_name || ''}
              onChange={e => setEditForm(prev => ({ ...prev, company_name: e.target.value }))}
            />
            <Input
              placeholder="Contact Person"
              value={editForm.contact_person || ''}
              onChange={e => setEditForm(prev => ({ ...prev, contact_person: e.target.value }))}
            />
            <Input
              placeholder="Phone"
              value={editForm.phone || ''}
              onChange={e => setEditForm(prev => ({ ...prev, phone: e.target.value }))}
            />
            <Input
              placeholder="Email"
              value={editForm.email || ''}
              onChange={e => setEditForm(prev => ({ ...prev, email: e.target.value }))}
            />
            <Input
              placeholder="Address"
              value={editForm.address || ''}
              onChange={e => setEditForm(prev => ({ ...prev, address: e.target.value }))}
            />
            <Select
              value={editForm.category || ''}
              onValueChange={v => setEditForm(prev => ({ ...prev, category: v }))}
            >
              <SelectTrigger><SelectValue placeholder="Category" /></SelectTrigger>
              <SelectContent>
                {LEAD_CATEGORIES.map(c => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
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
          <DialogHeader>
            <DialogTitle>Approve & Assign Lead</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Assign <strong>{approveItem?.company_name || 'this lead'}</strong> to a sales rep.
            </p>
            <Select value={assignCategory} onValueChange={setAssignCategory}>
              <SelectTrigger><SelectValue placeholder="Category" /></SelectTrigger>
              <SelectContent>
                {LEAD_CATEGORIES.map(c => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={assignRepId} onValueChange={setAssignRepId}>
              <SelectTrigger><SelectValue placeholder="Assign to rep..." /></SelectTrigger>
              <SelectContent>
                {profiles?.map(p => (
                  <SelectItem key={p.user_id} value={p.user_id}>
                    {p.full_name || p.user_id}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setApproveItem(null)}>Cancel</Button>
              <Button
                onClick={handleConfirmApprove}
                disabled={!assignRepId || !assignCategory || approveMutation.isPending}
              >
                Approve & Assign
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default VettingQueue;
