import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface SourcingQueueItem {
  id: string;
  source_url: string;
  company_name: string;
  contact_person: string;
  phone: string;
  email: string;
  address: string;
  category: string;
  raw_text: string;
  status: 'pending' | 'approved' | 'rejected';
  is_duplicate: boolean;
  duplicate_lead_id: string | null;
  fetched_by: string;
  approved_by: string | null;
  assigned_rep_id: string | null;
  created_at: string;
  updated_at: string;
}

export const useSourcingQueue = () => {
  return useQuery({
    queryKey: ['sourcing-queue'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sourcing_queue' as any)
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as SourcingQueueItem[];
    },
  });
};

export const useFetchLeadsFromUrl = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (url: string) => {
      if (!user) throw new Error('Not authenticated');

      // Call edge function
      const { data: scrapeData, error: scrapeError } = await supabase.functions.invoke('scrape-leads', {
        body: { url },
      });

      if (scrapeError) throw scrapeError;
      if (!scrapeData?.success) throw new Error(scrapeData?.error || 'Scrape failed');

      // Check for duplicates and insert into sourcing queue
      const leads = scrapeData.leads || [];
      const inserted: any[] = [];

      for (const lead of leads) {
        // Check duplicates by phone
        let isDuplicate = false;
        let duplicateLeadId: string | null = null;

        if (lead.phone) {
          const { data: dupes } = await supabase.rpc('check_lead_duplicates', {
            _phone: lead.phone,
            _company_name: lead.company_name || null,
          });
          if (dupes && dupes.length > 0) {
            isDuplicate = true;
            duplicateLeadId = dupes[0].id;
          }
        }

        const { data: insertedRow, error: insertError } = await supabase
          .from('sourcing_queue' as any)
          .insert({
            source_url: url,
            company_name: lead.company_name || '',
            contact_person: lead.contact_person || '',
            phone: lead.phone || '',
            email: lead.email || '',
            address: lead.address || '',
            category: lead.category || '',
            raw_text: scrapeData.raw_text?.substring(0, 2000) || '',
            status: 'pending',
            is_duplicate: isDuplicate,
            duplicate_lead_id: duplicateLeadId,
            fetched_by: user.id,
          } as any)
          .select()
          .single();

        if (!insertError && insertedRow) inserted.push(insertedRow);
      }

      return { count: inserted.length, leads: inserted };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['sourcing-queue'] });
      toast({ title: `Fetched ${data.count} lead(s) into vetting queue` });
    },
    onError: (err: Error) => {
      toast({ title: 'Failed to fetch leads', description: err.message, variant: 'destructive' });
    },
  });
};

export const useApproveQueueItem = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ item, assignedRepId, category }: { item: SourcingQueueItem; assignedRepId: string; category: string }) => {
      if (!user) throw new Error('Not authenticated');

      // Create real lead
      const { error: leadError } = await supabase.from('leads').insert({
        company_name: item.company_name,
        contact_person: item.contact_person,
        phone: item.phone,
        email: item.email,
        specific_address: item.address,
        category: category as any,
        status: 'draft',
        assigned_rep_id: assignedRepId,
        created_by: user.id,
      });

      if (leadError) throw leadError;

      // Mark as approved
      const { error: updateError } = await supabase
        .from('sourcing_queue' as any)
        .update({ status: 'approved', approved_by: user.id, assigned_rep_id: assignedRepId } as any)
        .eq('id', item.id);

      if (updateError) throw updateError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sourcing-queue'] });
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      toast({ title: 'Lead approved and assigned' });
    },
    onError: (err: Error) => {
      toast({ title: 'Failed to approve lead', description: err.message, variant: 'destructive' });
    },
  });
};

export const useDeleteQueueItem = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('sourcing_queue' as any)
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sourcing-queue'] });
      toast({ title: 'Item purged from queue' });
    },
    onError: (err: Error) => {
      toast({ title: 'Failed to delete', description: err.message, variant: 'destructive' });
    },
  });
};

export const useUpdateQueueItem = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<SourcingQueueItem> }) => {
      const { error } = await supabase
        .from('sourcing_queue' as any)
        .update(updates as any)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sourcing-queue'] });
      toast({ title: 'Item updated' });
    },
    onError: (err: Error) => {
      toast({ title: 'Failed to update', description: err.message, variant: 'destructive' });
    },
  });
};
