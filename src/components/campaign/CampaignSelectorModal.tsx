import React from 'react';
import { useCampaign } from '@/contexts/CampaignContext';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Briefcase } from 'lucide-react';

const CampaignSelectorModal: React.FC = () => {
  const { campaigns, needsCampaignSelection, setActiveCampaign } = useCampaign();

  if (!needsCampaignSelection) return null;

  return (
    <Dialog open={true}>
      <DialogContent className="max-w-md" onPointerDownOutside={e => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Briefcase className="h-5 w-5 text-primary" />
            Select Campaign
          </DialogTitle>
          <DialogDescription>
            Choose a campaign to work in. All your activities will be saved under this campaign.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2 pt-2 max-h-[300px] overflow-auto">
          {campaigns.map(c => (
            <Button
              key={c.id}
              variant="outline"
              className="w-full justify-start h-auto py-3 px-4"
              onClick={() => setActiveCampaign(c.id)}
            >
              <div className="text-left">
                <div className="font-medium">{c.name}</div>
                {c.description && (
                  <div className="text-xs text-muted-foreground mt-0.5">{c.description}</div>
                )}
              </div>
            </Button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CampaignSelectorModal;
