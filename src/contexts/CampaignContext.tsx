import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useQueryClient } from '@tanstack/react-query';

interface Campaign {
  id: string;
  name: string;
  description: string;
  is_active: boolean;
  created_by: string;
  created_at: string;
}

interface CampaignContextType {
  campaigns: Campaign[];
  activeCampaignId: string | null;
  setActiveCampaign: (campaignId: string | null) => Promise<void>;
  needsCampaignSelection: boolean;
  isLoading: boolean;
}

const CampaignContext = createContext<CampaignContextType | null>(null);

export const useCampaign = () => {
  const ctx = useContext(CampaignContext);
  if (!ctx) throw new Error('useCampaign must be used within CampaignProvider');
  return ctx;
};

export const CampaignProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, role } = useAuth();
  const queryClient = useQueryClient();
  const [activeCampaignId, setActiveCampaignId] = useState<string | null>(null);
  const [profileLoaded, setProfileLoaded] = useState(false);

  // Fetch campaigns
  const { data: campaigns = [], isLoading: campaignsLoading } = useQuery({
    queryKey: ['campaigns'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('campaigns')
        .select('*')
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return data as Campaign[];
    },
    enabled: !!user,
  });

  // Load active campaign from profile
  useEffect(() => {
    if (!user) {
      setActiveCampaignId(null);
      setProfileLoaded(false);
      return;
    }
    const load = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('active_campaign_id')
        .eq('user_id', user.id)
        .maybeSingle();
      setActiveCampaignId((data as any)?.active_campaign_id ?? null);
      setProfileLoaded(true);
    };
    load();
  }, [user]);

  const setActiveCampaign = useCallback(async (campaignId: string | null) => {
    if (!user) return;
    await supabase
      .from('profiles')
      .update({ active_campaign_id: campaignId } as any)
      .eq('user_id', user.id);
    setActiveCampaignId(campaignId);
    // Invalidate all data queries so they refetch with new campaign filter
    queryClient.invalidateQueries();
  }, [user, queryClient]);

  // Reps and managers need to select a campaign (admin doesn't)
  const needsCampaignSelection = profileLoaded && !!user && role !== 'admin' && !activeCampaignId && campaigns.length > 0;

  return (
    <CampaignContext.Provider value={{
      campaigns,
      activeCampaignId,
      setActiveCampaign,
      needsCampaignSelection,
      isLoading: campaignsLoading || !profileLoaded,
    }}>
      {children}
    </CampaignContext.Provider>
  );
};
