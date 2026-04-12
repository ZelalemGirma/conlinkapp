import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useUpdateLead } from '@/hooks/useLeads';
import { useReps } from '@/hooks/useProfiles';
import { LEAD_STATUS_CONFIG, LEAD_CATEGORIES } from '@/types';
import type { LeadStatus } from '@/types';
import LeadStatusBadge from '@/components/leads/LeadStatusBadge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Phone,
  Mail,
  MapPin,
  Building2,
  User,
  Tag,
  CheckCircle2,
  XCircle,
  Clock,
} from 'lucide-react';
import type { Database } from '@/integrations/supabase/types';

type LeadRow = Database['public']['Tables']['leads']['Row'];

const EXECUTION_STATUSES: LeadStatus[] = [
  'deal_closed', 'meeting_scheduled', 'profile_sent', 'needs_followup',
  'call_me_back', 'rejected_phone', 'rejected_spot', 'company_closed',
  'wrong_number', 'not_reachable', 'not_answered',
];

interface LeadDetailDialogProps {
  lead: LeadRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const LeadDetailDialog: React.FC<LeadDetailDialogProps> = ({ lead, open, onOpenChange }) => {
  const { role, user } = useAuth();
  const updateLead = useUpdateLead();
  const { data: reps } = useReps();
  const [assignRepId, setAssignRepId] = useState('');

  if (!lead) return null;

  const isPending = lead.status === 'pending';
  const isDraft = lead.status === 'draft';
  const isApproved = lead.status === 'approved';
  const canApprove = (role === 'manager' || role === 'admin') && isPending;
  const canSubmit = isDraft && (lead.created_by === user?.id || role === 'admin');
  const canUpdateStatus = !isDraft && !isPending && (
    lead.assigned_rep_id === user?.id || lead.created_by === user?.id || role === 'admin' || role === 'manager'
  );

  const handleSubmitForApproval = () => {
    updateLead.mutate({ id: lead.id, status: 'pending' });
  };

  const handleApprove = () => {
    if (!assignRepId) return;
    updateLead.mutate({ id: lead.id, status: 'approved', assigned_rep_id: assignRepId });
  };

  const handleReject = () => {
    updateLead.mutate({ id: lead.id, status: 'rejected_spot' });
  };

  const handleStatusChange = (newStatus: string) => {
    updateLead.mutate({ id: lead.id, status: newStatus as any });
  };

  const InfoRow = ({ icon: Icon, label, value, href }: { icon: React.ElementType; label: string; value?: string | null; href?: string }) => {
    if (!value) return null;
    return (
      <div className="flex items-start gap-3 py-1.5">
        <Icon className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
        <div>
          <div className="text-xs text-muted-foreground">{label}</div>
          {href ? (
            <a href={href} className="text-sm text-primary hover:underline">{value}</a>
          ) : (
            <div className="text-sm">{value}</div>
          )}
        </div>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="text-secondary flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            {lead.company_name}
          </DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[70vh] pr-4">
          <div className="space-y-4">
            {/* Status */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Status:</span>
              <LeadStatusBadge status={lead.status} />
            </div>

            {/* Lead Info */}
            <div className="space-y-1">
              <InfoRow icon={User} label="Contact Person" value={lead.contact_person} />
              <InfoRow icon={Tag} label="Position" value={lead.position} />
              <InfoRow icon={Phone} label="Phone" value={lead.phone} href={lead.phone ? `tel:${lead.phone}` : undefined} />
              <InfoRow icon={Mail} label="Email" value={lead.email} href={lead.email ? `mailto:${lead.email}` : undefined} />
              <InfoRow icon={Tag} label="Category" value={lead.category} />
              <InfoRow icon={MapPin} label="Address" value={lead.specific_address} />
              <InfoRow icon={MapPin} label="Zone" value={lead.location_zone} />
              <InfoRow icon={Tag} label="Campaign" value={lead.campaign_tag} />
              {lead.gps_lat && lead.gps_lng && (
                <InfoRow icon={MapPin} label="GPS" value={`${lead.gps_lat}, ${lead.gps_lng}`} />
              )}
            </div>

            <Separator />

            {/* Actions */}
            {canSubmit && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium flex items-center gap-2">
                  <Clock className="h-4 w-4" /> Submit for Approval
                </h4>
                <Button onClick={handleSubmitForApproval} disabled={updateLead.isPending} className="w-full">
                  Submit Lead for Manager Approval
                </Button>
              </div>
            )}

            {canApprove && (
              <div className="space-y-3 rounded-lg border border-primary/20 bg-primary/5 p-4">
                <h4 className="text-sm font-semibold text-secondary">Manager Approval Required</h4>
                <div className="space-y-2">
                  <label className="text-sm text-muted-foreground">Assign to Rep:</label>
                  <Select value={assignRepId} onValueChange={setAssignRepId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a rep" />
                    </SelectTrigger>
                    <SelectContent>
                      {reps?.map(rep => (
                        <SelectItem key={rep.user_id} value={rep.user_id}>
                          {rep.full_name || 'Unnamed Rep'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={handleApprove}
                    disabled={!assignRepId || updateLead.isPending}
                    className="flex-1"
                  >
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Approve & Assign
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={handleReject}
                    disabled={updateLead.isPending}
                    className="flex-1"
                  >
                    <XCircle className="mr-2 h-4 w-4" />
                    Reject
                  </Button>
                </div>
              </div>
            )}

            {canUpdateStatus && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Update Status</h4>
                <Select onValueChange={handleStatusChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Change status..." />
                  </SelectTrigger>
                  <SelectContent>
                    {EXECUTION_STATUSES.map(s => (
                      <SelectItem key={s} value={s}>
                        {LEAD_STATUS_CONFIG[s].label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

export default LeadDetailDialog;
