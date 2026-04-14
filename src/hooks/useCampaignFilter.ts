import { useCampaign } from '@/contexts/CampaignContext';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Returns the campaign_id to filter queries by.
 * - Admin with no filter selected: null (show all)
 * - Rep/Manager: their active campaign id
 */
export const useCampaignFilter = () => {
  const { role } = useAuth();
  const { activeCampaignId } = useCampaign();

  // Admin sees all unless they explicitly filter
  // Reps/managers always filter by their active campaign
  return {
    campaignId: activeCampaignId,
    isAdmin: role === 'admin',
  };
};
