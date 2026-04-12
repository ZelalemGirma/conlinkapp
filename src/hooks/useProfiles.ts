import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const useProfiles = () => {
  return useQuery({
    queryKey: ['profiles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, full_name, avatar_url');
      if (error) throw error;
      return data;
    },
  });
};

export const useReps = () => {
  return useQuery({
    queryKey: ['reps'],
    queryFn: async () => {
      const { data: roles, error: rolesErr } = await supabase
        .from('user_roles')
        .select('user_id, role')
        .eq('role', 'rep');
      if (rolesErr) throw rolesErr;

      if (!roles?.length) return [];

      const repIds = roles.map(r => r.user_id);
      const { data: profiles, error: profErr } = await supabase
        .from('profiles')
        .select('user_id, full_name')
        .in('user_id', repIds);
      if (profErr) throw profErr;
      return profiles ?? [];
    },
  });
};
