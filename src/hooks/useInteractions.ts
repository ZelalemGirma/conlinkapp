import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useCampaignFilter } from '@/hooks/useCampaignFilter';
import type { Database } from '@/integrations/supabase/types';

type InteractionRow = Database['public']['Tables']['interaction_logs']['Row'];
type InteractionInsert = Database['public']['Tables']['interaction_logs']['Insert'];

export const useInteractionLogs = (leadId: string | undefined) => {
  return useQuery({
    queryKey: ['interaction_logs', leadId],
    enabled: !!leadId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('interaction_logs')
        .select('*')
        .eq('lead_id', leadId!)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as InteractionRow[];
    },
  });
};

export const useCreateInteraction = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { toast } = useToast();
  const { campaignId } = useCampaignFilter();

  return useMutation({
    mutationFn: async (interaction: Omit<InteractionInsert, 'created_by'>) => {
      if (!user) throw new Error('Not authenticated');
      const insertData: any = { ...interaction, created_by: user.id };
      if (campaignId) insertData.campaign_id = campaignId;
      const { data, error } = await supabase
        .from('interaction_logs')
        .insert(insertData)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['interaction_logs', variables.lead_id] });
      toast({ title: 'Interaction logged' });
    },
    onError: (err: Error) => {
      toast({ title: 'Failed to log interaction', description: err.message, variant: 'destructive' });
    },
  });
};
