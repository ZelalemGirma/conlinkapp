import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';

export interface SearchLeadResult {
  company_name: string;
  contact_person: string;
  phone: string;
  secondary_phone: string;
  email: string;
  address: string;
  location_zone: string;
  category: string;
  relevance_score: number;
  ai_reasoning: string;
  priority: 'high' | 'medium' | 'low';
  source_url: string;
}

export interface SearchLeadsResponse {
  success: boolean;
  leads: SearchLeadResult[];
  sources_searched: string[];
  detail_pages_fetched: number;
  error?: string;
}

export const useSearchLeads = () => {
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ query, sources }: { query: string; sources?: string[] }): Promise<SearchLeadsResponse> => {
      const { data, error } = await supabase.functions.invoke('search-leads', {
        body: { query, sources },
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Search failed');
      return data as SearchLeadsResponse;
    },
    onError: (err: Error) => {
      toast({ title: 'Search failed', description: err.message, variant: 'destructive' });
    },
  });
};

export const useImportSearchResults = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ leads, sourceQuery }: { leads: SearchLeadResult[]; sourceQuery: string }) => {
      if (!user) throw new Error('Not authenticated');

      let inserted = 0;
      for (const lead of leads) {
        // Check duplicates
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

        const { error } = await supabase
          .from('sourcing_queue')
          .insert({
            source_url: lead.source_url || `search: ${sourceQuery}`,
            company_name: lead.company_name,
            contact_person: lead.contact_person || '',
            phone: lead.phone || '',
            email: lead.email || '',
            address: lead.address || '',
            category: lead.category || '',
            raw_text: `AI Score: ${lead.relevance_score}/100 | ${lead.ai_reasoning}`,
            status: 'pending',
            is_duplicate: isDuplicate,
            duplicate_lead_id: duplicateLeadId,
            fetched_by: user.id,
            relevance_score: lead.relevance_score,
            ai_reasoning: lead.ai_reasoning,
            priority: lead.priority,
          });

        if (!error) inserted++;
      }

      return inserted;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ['sourcing-queue'] });
      toast({ title: `Imported ${count} lead(s) into vetting queue` });
    },
    onError: (err: Error) => {
      toast({ title: 'Import failed', description: err.message, variant: 'destructive' });
    },
  });
};
