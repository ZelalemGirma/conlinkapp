import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useCampaignFilter } from '@/hooks/useCampaignFilter';
import type { Database } from '@/integrations/supabase/types';

type LeadRow = Database['public']['Tables']['leads']['Row'];
type LeadInsert = Database['public']['Tables']['leads']['Insert'];
type LeadUpdate = Database['public']['Tables']['leads']['Update'];

export const useLeads = (filters?: {
  search?: string;
  category?: string;
  status?: string;
  zone?: string;
  source?: string;
  repId?: string;
}) => {
  const { campaignId } = useCampaignFilter();
  const { user, role, loading } = useAuth();
  const canSeeAllLeads = role === 'admin' || role === 'manager';

  return useQuery({
    queryKey: ['leads', filters, campaignId, user?.id, role],
    queryFn: async () => {
      if (!user) return [] as LeadRow[];

      let query = supabase
        .from('leads')
        .select('*')
        .order('created_at', { ascending: false });

      if (campaignId) {
        query = query.eq('campaign_id', campaignId);
      }

      // Reps see: leads they created, OR leads assigned to them that are past draft/pending.
      if (!canSeeAllLeads) {
        query = query.or(
          `created_by.eq.${user.id},and(assigned_rep_id.eq.${user.id},status.not.in.(draft,pending))`
        );
      }

      if (filters?.category) {
        query = query.eq('category', filters.category as any);
      }
      if (filters?.status) {
        query = query.eq('status', filters.status as any);
      }
      if (filters?.zone) {
        query = query.eq('location_zone', filters.zone);
      }
      if (filters?.source) {
        query = query.eq('source', filters.source);
      }
      if (filters?.repId && canSeeAllLeads) {
        query = query.or(`assigned_rep_id.eq.${filters.repId},created_by.eq.${filters.repId}`);
      }

      const { data, error } = await query;
      if (error) throw error;

      let leads = (data as LeadRow[]) ?? [];

      if (!canSeeAllLeads) {
        leads = leads.filter(
          (lead) =>
            lead.created_by === user.id ||
            (lead.assigned_rep_id === user.id &&
              lead.status !== 'draft' &&
              lead.status !== 'pending')
        );
      }

      if (filters?.search) {
        const search = filters.search.trim().toLowerCase();
        leads = leads.filter((lead) =>
          [lead.company_name, lead.contact_person, lead.phone, lead.email]
            .filter(Boolean)
            .some((value) => value!.toLowerCase().includes(search))
        );
      }

      return leads;
    },
    enabled: !!user && !loading,
  });
};

export const useCreateLead = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { toast } = useToast();
  const { campaignId } = useCampaignFilter();

  return useMutation({
    mutationFn: async (lead: Omit<LeadInsert, 'created_by'>) => {
      if (!user) throw new Error('Not authenticated');
      const insertData: any = { ...lead, created_by: user.id };
      if (campaignId) insertData.campaign_id = campaignId;
      const { data, error } = await supabase
        .from('leads')
        .insert(insertData)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      toast({ title: 'Lead created successfully' });
    },
    onError: (err: Error) => {
      toast({ title: 'Failed to create lead', description: err.message, variant: 'destructive' });
    },
  });
};

export const useUpdateLead = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...updates }: LeadUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from('leads')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      toast({ title: 'Lead updated successfully' });
    },
    onError: (err: Error) => {
      toast({ title: 'Failed to update lead', description: err.message, variant: 'destructive' });
    },
  });
};

export const useDeleteLeads = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase
        .from('leads')
        .delete()
        .in('id', ids);
      if (error) throw error;
    },
    onSuccess: (_, ids) => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      toast({ title: `${ids.length} lead(s) deleted` });
    },
    onError: (err: Error) => {
      toast({ title: 'Failed to delete leads', description: err.message, variant: 'destructive' });
    },
  });
};
