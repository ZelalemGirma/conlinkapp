import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export const useCreateMeeting = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (meeting: { lead_id: string; scheduled_at: string; location?: string; notes?: string }) => {
      if (!user) throw new Error('Not authenticated');
      const { data, error } = await supabase
        .from('meetings')
        .insert({ ...meeting, created_by: user.id })
        .select()
        .single();
      if (error) throw error;

      // Also update the lead's meeting_date
      await supabase
        .from('leads')
        .update({ meeting_date: meeting.scheduled_at, status: 'meeting_scheduled' as any })
        .eq('id', meeting.lead_id);

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      toast({ title: 'Meeting scheduled successfully' });
    },
    onError: (err: Error) => {
      toast({ title: 'Failed to schedule meeting', description: err.message, variant: 'destructive' });
    },
  });
};
