import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const useDuplicateCheck = (companyName: string, phone: string, excludeId?: string) => {
  const trimmedName = companyName.trim();
  const trimmedPhone = phone.trim();
  const enabled = trimmedName.length >= 3 || trimmedPhone.length >= 4;

  return useQuery({
    queryKey: ['duplicate-check', trimmedName, trimmedPhone, excludeId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('check_lead_duplicates', {
        _company_name: trimmedName || null,
        _phone: trimmedPhone || null,
        _exclude_id: excludeId || null,
      });
      if (error) throw error;
      return data as Array<{
        id: string;
        company_name: string;
        phone: string;
        email: string;
        assigned_rep_id: string | null;
        match_type: string;
      }>;
    },
    enabled,
    staleTime: 2000,
  });
};
