import React, { useState, useMemo } from 'react';
import { useLeads, useUpdateLead } from '@/hooks/useLeads';
import { useAuth } from '@/contexts/AuthContext';
import { useProfiles } from '@/hooks/useProfiles';
import { LEAD_STATUS_CONFIG } from '@/types';
import type { LeadStatus } from '@/types';
import LeadStatusBadge from '@/components/leads/LeadStatusBadge';
import LeadDetailDialog from '@/components/leads/LeadDetailDialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Phone, Building2, GripVertical, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Database } from '@/integrations/supabase/types';

type LeadRow = Database['public']['Tables']['leads']['Row'];

const PIPELINE_COLUMNS: { status: LeadStatus; label: string }[] = [
  { status: 'draft', label: 'Drafts' },
  { status: 'pending', label: 'Pending Approval' },
  { status: 'approved', label: 'Approved' },
  { status: 'meeting_scheduled', label: 'Meeting Scheduled' },
  { status: 'profile_sent', label: 'Profile Sent' },
  { status: 'needs_followup', label: 'Follow-up' },
  { status: 'deal_closed', label: 'Closed Won' },
];

const Pipeline = () => {
  const { data: leads, isLoading } = useLeads();
  const { role } = useAuth();
  const { data: profiles } = useProfiles();
  const canSeeOwner = role === 'admin' || role === 'manager';
  const profileMap = useMemo(
    () => Object.fromEntries((profiles ?? []).map(p => [p.user_id, p.full_name || 'Unknown'])),
    [profiles]
  );
  const updateLead = useUpdateLead();
  const [selectedLead, setSelectedLead] = useState<LeadRow | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [draggedLeadId, setDraggedLeadId] = useState<string | null>(null);

  const getColumnLeads = (status: LeadStatus) =>
    leads?.filter(l => l.status === status) ?? [];

  const handleDragStart = (e: React.DragEvent, leadId: string) => {
    setDraggedLeadId(leadId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', leadId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, targetStatus: LeadStatus) => {
    e.preventDefault();
    const leadId = e.dataTransfer.getData('text/plain');
    if (!leadId) return;

    const lead = leads?.find(l => l.id === leadId);
    if (!lead || lead.status === targetStatus) {
      setDraggedLeadId(null);
      return;
    }

    updateLead.mutate({ id: leadId, status: targetStatus as any });
    setDraggedLeadId(null);
  };

  const openDetail = (lead: LeadRow) => {
    setSelectedLead(lead);
    setDetailOpen(true);
  };

  return (
    <div className="space-y-4 h-full">
      <div>
        <h1 className="text-2xl font-bold text-secondary">Lead Pipeline</h1>
        <p className="text-muted-foreground">Drag leads between columns to update status</p>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-4" style={{ minHeight: 'calc(100vh - 220px)' }}>
        {PIPELINE_COLUMNS.map(col => {
          const columnLeads = getColumnLeads(col.status);
          const config = LEAD_STATUS_CONFIG[col.status];
          return (
            <div
              key={col.status}
              className="flex-shrink-0 w-72"
              onDragOver={handleDragOver}
              onDrop={e => handleDrop(e, col.status)}
            >
              <Card className="h-full">
                <CardHeader className="pb-3 pt-4 px-3">
                  <CardTitle className="flex items-center justify-between text-sm">
                    <span>{col.label}</span>
                    <Badge variant="secondary" className="text-xs">
                      {columnLeads.length}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-3 pb-3">
                  <ScrollArea className="h-[calc(100vh-320px)]">
                    <div className="space-y-2 pr-2">
                      {columnLeads.length === 0 && (
                        <div className="text-center py-8 text-xs text-muted-foreground border border-dashed rounded-md">
                          Drop leads here
                        </div>
                      )}
                      {columnLeads.map(lead => (
                        <div
                          key={lead.id}
                          draggable
                          onDragStart={e => handleDragStart(e, lead.id)}
                          onClick={() => openDetail(lead)}
                          className={cn(
                            'cursor-grab active:cursor-grabbing rounded-lg border bg-card p-3 shadow-sm hover:shadow-md transition-shadow',
                            draggedLeadId === lead.id && 'opacity-50'
                          )}
                        >
                          <div className="flex items-start gap-2">
                            <GripVertical className="h-4 w-4 text-muted-foreground/40 mt-0.5 shrink-0" />
                            <div className="min-w-0 flex-1">
                              <div className="font-medium text-sm truncate">{lead.company_name}</div>
                              {lead.contact_person && (
                                <div className="text-xs text-muted-foreground truncate mt-0.5">
                                  {lead.contact_person}
                                </div>
                              )}
                              <div className="flex items-center gap-2 mt-2 flex-wrap">
                                <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded truncate max-w-[120px]">
                                  {lead.category}
                                </span>
                                {lead.phone && (
                                  <a
                                    href={`tel:${lead.phone}`}
                                    onClick={e => e.stopPropagation()}
                                    className="text-primary hover:text-primary/80"
                                  >
                                    <Phone className="h-3 w-3" />
                                  </a>
                                )}
                              </div>
                              {lead.campaign_tag && (
                                <div className="text-[10px] text-primary/70 mt-1">
                                  🏷️ {lead.campaign_tag}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>
          );
        })}
      </div>

      <LeadDetailDialog lead={selectedLead} open={detailOpen} onOpenChange={setDetailOpen} />
    </div>
  );
};

export default Pipeline;
