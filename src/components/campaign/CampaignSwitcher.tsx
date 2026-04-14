import React from 'react';
import { useCampaign } from '@/contexts/CampaignContext';
import { useAuth } from '@/contexts/AuthContext';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Briefcase } from 'lucide-react';

const CampaignSwitcher: React.FC = () => {
  const { role } = useAuth();
  const { campaigns, activeCampaignId, setActiveCampaign } = useCampaign();

  if (campaigns.length === 0) return null;

  // Admin sees "All Campaigns" option + filter; reps/managers must have one selected
  const isAdmin = role === 'admin';

  return (
    <div className="flex items-center gap-2">
      <Briefcase className="h-4 w-4 text-muted-foreground shrink-0" />
      <Select
        value={activeCampaignId || 'all'}
        onValueChange={v => setActiveCampaign(v === 'all' ? null : v)}
      >
        <SelectTrigger className="h-8 text-xs w-[160px]">
          <SelectValue placeholder="Select Campaign" />
        </SelectTrigger>
        <SelectContent>
          {isAdmin && <SelectItem value="all">All Campaigns</SelectItem>}
          {campaigns.map(c => (
            <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

export default CampaignSwitcher;
