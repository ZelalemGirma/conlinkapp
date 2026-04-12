import { LEAD_STATUS_CONFIG } from '@/types';
import type { LeadStatus } from '@/types';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface LeadStatusBadgeProps {
  status: string;
}

const LeadStatusBadge: React.FC<LeadStatusBadgeProps> = ({ status }) => {
  const config = LEAD_STATUS_CONFIG[status as LeadStatus];
  if (!config) return <Badge variant="outline">{status}</Badge>;

  return (
    <Badge className={cn('text-[11px] font-medium', config.color)}>
      {config.label}
    </Badge>
  );
};

export default LeadStatusBadge;
