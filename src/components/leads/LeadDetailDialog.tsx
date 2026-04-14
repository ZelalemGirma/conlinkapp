import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useUpdateLead } from '@/hooks/useLeads';
import { useReps } from '@/hooks/useProfiles';
import { LEAD_STATUS_CONFIG } from '@/types';
import type { LeadStatus } from '@/types';
import LeadStatusBadge from '@/components/leads/LeadStatusBadge';
import InteractionLogPanel from '@/components/leads/InteractionLogPanel';
import MeetingSchedulerDialog from '@/components/leads/MeetingSchedulerDialog';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
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
  Calendar,
  Globe,
} from 'lucide-react';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
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
  const [meetingOpen, setMeetingOpen] = useState(false);

  // Fetch meetings for this lead
  const { data: meetings } = useQuery({
    queryKey: ['lead-meetings', lead?.id],
    queryFn: async () => {
      if (!lead) return [];
      const { data, error } = await supabase
        .from('meetings')
        .select('*')
        .eq('lead_id', lead.id)
        .order('scheduled_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!lead && open,
  });

  if (!lead) return null;

  const isPending = lead.status === 'pending';
  const isDraft = lead.status === 'draft';
  const canApprove = (role === 'manager' || role === 'admin') && isPending;
  const canSubmit = isDraft && (lead.created_by === user?.id || role === 'admin');
  const canUpdateStatus = !isDraft && !isPending && (
    lead.assigned_rep_id === user?.id || lead.created_by === user?.id || role === 'admin' || role === 'manager'
  );

  const phoneNumbers: string[] = (lead as any).phone_numbers?.length
    ? (lead as any).phone_numbers
    : lead.phone ? [lead.phone] : [];

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
    if (newStatus === 'meeting_scheduled') {
      setMeetingOpen(true);
      return;
    }
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
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="text-secondary flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              {lead.company_name}
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[70vh] pr-4">
            <Tabs defaultValue="details">
              <TabsList className="grid w-full grid-cols-3 mb-4">
                <TabsTrigger value="details">Details</TabsTrigger>
                <TabsTrigger value="meetings">Meetings</TabsTrigger>
                <TabsTrigger value="interactions">Interactions</TabsTrigger>
              </TabsList>

              <TabsContent value="details" className="space-y-4 mt-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm text-muted-foreground">Status:</span>
                  <LeadStatusBadge status={lead.status} />
                </div>

                <div className="space-y-1">
                  <InfoRow icon={User} label="Contact Person" value={lead.contact_person} />
                  <InfoRow icon={Tag} label="Position" value={lead.position} />
                  {phoneNumbers.map((ph, i) => (
                    <InfoRow
                      key={i}
                      icon={Phone}
                      label={i === 0 ? 'Phone' : `Phone ${i + 1}`}
                      value={ph}
                      href={`tel:${ph}`}
                    />
                  ))}
                  <InfoRow
                    icon={Mail}
                    label="Email"
                    value={lead.email}
                    href={lead.email ? `mailto:${lead.email}` : undefined}
                  />
                  <InfoRow icon={Tag} label="Category" value={lead.category} />
                  <InfoRow icon={Globe} label="Source" value={(lead as any).source} />
                  <InfoRow icon={MapPin} label="Address" value={lead.specific_address} />
                  <InfoRow icon={MapPin} label="Zone" value={lead.location_zone} />
                  <InfoRow icon={Tag} label="Campaign" value={lead.campaign_tag} />
                  {lead.gps_lat && lead.gps_lng && (
                    <InfoRow icon={MapPin} label="GPS" value={`${lead.gps_lat}, ${lead.gps_lng}`} />
                  )}
                </div>

                <Separator />

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
                      <Button onClick={handleApprove} disabled={!assignRepId || updateLead.isPending} className="flex-1">
                        <CheckCircle2 className="mr-2 h-4 w-4" /> Approve & Assign
                      </Button>
                      <Button variant="destructive" onClick={handleReject} disabled={updateLead.isPending} className="flex-1">
                        <XCircle className="mr-2 h-4 w-4" /> Reject
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
              </TabsContent>

              <TabsContent value="meetings" className="mt-0 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium">Scheduled Meetings</h4>
                  <Button size="sm" variant="outline" onClick={() => setMeetingOpen(true)} className="gap-1.5">
                    <Calendar className="h-3.5 w-3.5" /> Schedule
                  </Button>
                </div>
                {!meetings?.length ? (
                  <p className="text-sm text-muted-foreground text-center py-8">No meetings scheduled yet.</p>
                ) : (
                  meetings.map(m => (
                    <Card key={m.id}>
                      <CardContent className="p-3 space-y-1.5">
                        <div className="flex items-center gap-2 text-sm font-medium">
                          <Calendar className="h-4 w-4 text-primary" />
                          {format(new Date(m.scheduled_at), 'MMM d, yyyy')}
                          <span className="text-muted-foreground">at</span>
                          <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                          {format(new Date(m.scheduled_at), 'h:mm a')}
                        </div>
                        {m.location && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <MapPin className="h-3.5 w-3.5" />
                            {m.location}
                          </div>
                        )}
                        {m.notes && (
                          <p className="text-xs text-muted-foreground">{m.notes}</p>
                        )}
                      </CardContent>
                    </Card>
                  ))
                )}
              </TabsContent>

              <TabsContent value="interactions" className="mt-0">
                <InteractionLogPanel leadId={lead.id} />
              </TabsContent>
            </Tabs>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      <MeetingSchedulerDialog
        leadId={lead.id}
        companyName={lead.company_name}
        open={meetingOpen}
        onOpenChange={setMeetingOpen}
      />
    </>
  );
};

export default LeadDetailDialog;
