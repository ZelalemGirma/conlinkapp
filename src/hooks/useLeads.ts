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
}) => {
  const { campaignId } = useCampaignFilter();

  return useQuery({
    queryKey: ['leads', filters, campaignId],
    queryFn: async () => {
      let query = supabase
        .from('leads')
        .select('*')
        .order('created_at', { ascending: false });

      if (campaignId) {
        query = query.eq('campaign_id', campaignId);
      }

      if (filters?.search) {
        query = query.or(
          `company_name.ilike.%${filters.search}%,contact_person.ilike.%${filters.search}%,phone.ilike.%${filters.search}%,email.ilike.%${filters.search}%`
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

      const { data, error } = await query;
      if (error) throw error;
      return data as LeadRow[];
    },
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
