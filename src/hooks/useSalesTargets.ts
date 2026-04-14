import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export const useSalesTargets = () => {
  return useQuery({
    queryKey: ['sales-targets'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sales_targets')
        .select('*')
        .order('period_start', { ascending: false });
      if (error) throw error;
      return data;
    },
    refetchInterval: 30000,
  });
};

export const useMyTargets = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['my-targets', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('sales_targets')
        .select('*')
        .eq('rep_id', user.id)
        .order('period_start', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
    refetchInterval: 30000,
  });
};

export const useCreateTarget = () => {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (target: { rep_id: string; target_count: number; period_start: string; period_end: string; target_type?: "leads" | "calls" | "meetings" | "conversions" }) => {
      const { data, error } = await supabase.from('sales_targets').insert([target]).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sales-targets'] });
      qc.invalidateQueries({ queryKey: ['my-targets'] });
      toast({ title: 'Target created' });
    },
    onError: (e: Error) => toast({ title: 'Failed', description: e.message, variant: 'destructive' }),
  });
};

export const useUpdateTarget = () => {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; actual_count?: number; target_count?: number }) => {
      const { data, error } = await supabase.from('sales_targets').update(updates).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sales-targets'] });
      qc.invalidateQueries({ queryKey: ['my-targets'] });
      toast({ title: 'Target updated' });
    },
    onError: (e: Error) => toast({ title: 'Failed', description: e.message, variant: 'destructive' }),
  });
};
