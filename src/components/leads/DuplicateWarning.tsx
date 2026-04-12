import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { useReps } from '@/hooks/useProfiles';

interface DuplicateMatch {
  id: string;
  company_name: string;
  phone: string;
  email: string;
  assigned_rep_id: string | null;
  match_type: string;
}

interface DuplicateWarningProps {
  duplicates: DuplicateMatch[];
}

const DuplicateWarning: React.FC<DuplicateWarningProps> = ({ duplicates }) => {
  const { data: reps } = useReps();

  if (!duplicates.length) return null;

  const getRepName = (repId: string | null) => {
    if (!repId || !reps) return 'Unassigned';
    const rep = reps.find(r => r.user_id === repId);
    return rep?.full_name || 'Unknown Rep';
  };

  return (
    <div className="rounded-lg border border-warning/50 bg-warning/10 p-3 space-y-2">
      <div className="flex items-center gap-2 text-warning-foreground">
        <AlertTriangle className="h-4 w-4 shrink-0" />
        <span className="text-sm font-semibold">Potential Duplicates Found</span>
      </div>
      {duplicates.map(dup => (
        <div key={`${dup.id}-${dup.match_type}`} className="text-sm text-muted-foreground pl-6">
          <strong>{dup.company_name}</strong>
          {dup.phone && <span> • {dup.phone}</span>}
          <span className="block text-xs">
            Match: {dup.match_type === 'phone' ? 'Phone number' : 'Company name'} • Assigned to: {getRepName(dup.assigned_rep_id)}
          </span>
        </div>
      ))}
    </div>
  );
};

export default DuplicateWarning;
