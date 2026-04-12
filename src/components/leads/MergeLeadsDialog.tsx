import React, { useState } from 'react';
import { useLeads } from '@/hooks/useLeads';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Search, Merge, ArrowRight, Check } from 'lucide-react';
import type { Database } from '@/integrations/supabase/types';

type LeadRow = Database['public']['Tables']['leads']['Row'];

interface MergeLeadsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const MergeLeadsDialog: React.FC<MergeLeadsDialogProps> = ({ open, onOpenChange }) => {
  const [search, setSearch] = useState('');
  const [primaryLead, setPrimaryLead] = useState<LeadRow | null>(null);
  const [secondaryLead, setSecondaryLead] = useState<LeadRow | null>(null);
  const [merging, setMerging] = useState(false);
  const { data: leads } = useLeads({ search: search || undefined });
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const handleMerge = async () => {
    if (!primaryLead || !secondaryLead) return;
    setMerging(true);
    try {
      const { error } = await supabase.rpc('merge_leads', {
        _primary_id: primaryLead.id,
        _secondary_id: secondaryLead.id,
      });
      if (error) throw error;
      toast({ title: 'Leads merged successfully', description: `"${secondaryLead.company_name}" merged into "${primaryLead.company_name}"` });
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      setPrimaryLead(null);
      setSecondaryLead(null);
      setSearch('');
      onOpenChange(false);
    } catch (err: any) {
      toast({ title: 'Merge failed', description: err.message, variant: 'destructive' });
    } finally {
      setMerging(false);
    }
  };

  const reset = () => {
    setPrimaryLead(null);
    setSecondaryLead(null);
    setSearch('');
  };

  const selectLead = (lead: LeadRow) => {
    if (!primaryLead) {
      setPrimaryLead(lead);
    } else if (!secondaryLead && lead.id !== primaryLead.id) {
      setSecondaryLead(lead);
    }
  };

  const filteredLeads = leads?.filter(l => 
    !primaryLead || l.id !== primaryLead.id
  );

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
      <DialogContent className="max-w-lg max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-secondary">
            <Merge className="h-5 w-5" /> Merge Leads
          </DialogTitle>
        </DialogHeader>

        {/* Selection display */}
        <div className="grid grid-cols-[1fr_auto_1fr] gap-2 items-center min-h-[60px]">
          <div className={`rounded-lg border p-3 text-sm ${primaryLead ? 'border-primary bg-primary/5' : 'border-dashed border-muted-foreground/30'}`}>
            {primaryLead ? (
              <div>
                <div className="font-medium">{primaryLead.company_name}</div>
                <div className="text-xs text-muted-foreground">Primary (kept)</div>
                <Button variant="ghost" size="sm" className="text-xs h-6 mt-1 p-0" onClick={() => { setPrimaryLead(null); setSecondaryLead(null); }}>Change</Button>
              </div>
            ) : (
              <span className="text-muted-foreground">Select primary lead</span>
            )}
          </div>
          <ArrowRight className="h-4 w-4 text-muted-foreground" />
          <div className={`rounded-lg border p-3 text-sm ${secondaryLead ? 'border-destructive bg-destructive/5' : 'border-dashed border-muted-foreground/30'}`}>
            {secondaryLead ? (
              <div>
                <div className="font-medium">{secondaryLead.company_name}</div>
                <div className="text-xs text-muted-foreground">Will be merged & deleted</div>
                <Button variant="ghost" size="sm" className="text-xs h-6 mt-1 p-0" onClick={() => setSecondaryLead(null)}>Change</Button>
              </div>
            ) : (
              <span className="text-muted-foreground">Select lead to merge</span>
            )}
          </div>
        </div>

        {!secondaryLead && (
          <>
            <Separator />
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search leads to select..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <ScrollArea className="max-h-[250px]">
              <div className="space-y-1">
                {filteredLeads?.map(lead => (
                  <button
                    key={lead.id}
                    onClick={() => selectLead(lead)}
                    className="w-full text-left px-3 py-2 rounded-md hover:bg-muted/50 text-sm transition-colors"
                  >
                    <div className="font-medium">{lead.company_name}</div>
                    <div className="text-xs text-muted-foreground">
                      {lead.contact_person} {lead.phone && `• ${lead.phone}`}
                    </div>
                  </button>
                ))}
                {filteredLeads?.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">No leads found</p>
                )}
              </div>
            </ScrollArea>
          </>
        )}

        {primaryLead && secondaryLead && (
          <div className="space-y-3">
            <Separator />
            <p className="text-sm text-muted-foreground">
              All interaction logs and meetings from <strong>{secondaryLead.company_name}</strong> will be transferred to <strong>{primaryLead.company_name}</strong>. The secondary lead will be permanently deleted.
            </p>
            <div className="flex gap-2">
              <Button onClick={handleMerge} disabled={merging} className="flex-1">
                <Check className="mr-2 h-4 w-4" />
                {merging ? 'Merging...' : 'Confirm Merge'}
              </Button>
              <Button variant="outline" onClick={reset}>Cancel</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default MergeLeadsDialog;
