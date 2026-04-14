import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Pencil, Briefcase } from 'lucide-react';
import { toast } from 'sonner';

const CampaignManager: React.FC = () => {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const { data: campaigns = [] } = useQuery({
    queryKey: ['all-campaigns'],
    queryFn: async () => {
      const { data, error } = await supabase.from('campaigns').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const createCampaign = useMutation({
    mutationFn: async (c: { name: string; description: string }) => {
      if (!user) throw new Error('Not authenticated');
      const { error } = await supabase.from('campaigns').insert({ ...c, created_by: user.id });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['all-campaigns'] });
      qc.invalidateQueries({ queryKey: ['campaigns'] });
      toast.success('Campaign created');
      resetForm();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateCampaign = useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; name?: string; description?: string; is_active?: boolean }) => {
      const { error } = await supabase.from('campaigns').update(updates).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['all-campaigns'] });
      qc.invalidateQueries({ queryKey: ['campaigns'] });
      toast.success('Campaign updated');
      resetForm();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const resetForm = () => {
    setDialogOpen(false);
    setEditId(null);
    setName('');
    setDescription('');
  };

  const handleSubmit = () => {
    if (!name.trim()) return;
    if (editId) {
      updateCampaign.mutate({ id: editId, name: name.trim(), description: description.trim() });
    } else {
      createCampaign.mutate({ name: name.trim(), description: description.trim() });
    }
  };

  const startEdit = (c: any) => {
    setEditId(c.id);
    setName(c.name);
    setDescription(c.description || '');
    setDialogOpen(true);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Briefcase className="h-5 w-5 text-primary" /> Campaigns
            </CardTitle>
            <CardDescription>Create and manage campaigns for your team</CardDescription>
          </div>
          <Dialog open={dialogOpen} onOpenChange={v => { if (!v) resetForm(); setDialogOpen(v); }}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="h-4 w-4 mr-1" /> New Campaign</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editId ? 'Edit Campaign' : 'Create Campaign'}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <div>
                  <Label>Campaign Name *</Label>
                  <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Edition 14" />
                </div>
                <div>
                  <Label>Description</Label>
                  <Input value={description} onChange={e => setDescription(e.target.value)} placeholder="Optional description" />
                </div>
                <Button onClick={handleSubmit} disabled={!name.trim()} className="w-full">
                  {editId ? 'Update' : 'Create'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {campaigns.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">No campaigns yet</TableCell>
              </TableRow>
            ) : campaigns.map((c: any) => (
              <TableRow key={c.id}>
                <TableCell className="font-medium">{c.name}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{c.description || '—'}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={c.is_active}
                      onCheckedChange={v => updateCampaign.mutate({ id: c.id, is_active: v })}
                    />
                    <Badge variant={c.is_active ? 'default' : 'secondary'}>
                      {c.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                </TableCell>
                <TableCell>
                  <Button variant="ghost" size="sm" onClick={() => startEdit(c)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

export default CampaignManager;
