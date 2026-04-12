import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect } from 'react';

export const useDuplicateCheck = (companyName: string, phone: string, excludeId?: string) => {
  const { user } = useAuth();
  const trimmedName = companyName.trim();
  const trimmedPhone = phone.trim();
  const enabled = trimmedName.length >= 3 || trimmedPhone.length >= 4;

  const query = useQuery({
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

  // Track duplicate attempts for discrepancy alerts
  useEffect(() => {
    if (query.data && query.data.length > 0 && user && trimmedName.length >= 3) {
      // Log the duplicate attempt (fire and forget)
      supabase.from('duplicate_attempts').insert({
        user_id: user.id,
        company_name: trimmedName,
        matched_lead_id: query.data[0].id,
      }).then(() => {});
    }
  }, [query.data, user, trimmedName]);

  return query;
};
