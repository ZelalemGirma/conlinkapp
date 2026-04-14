import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { LEAD_STATUS_CONFIG } from '@/types';
import type { Database } from '@/integrations/supabase/types';

type LeadRow = Database['public']['Tables']['leads']['Row'];

export interface Notification {
  id: string;
  title: string;
  description: string;
  type: 'status_change' | 'assignment' | 'overdue' | 'meeting_reminder';
  timestamp: Date;
  read: boolean;
  leadId?: string;
}

export const useNotifications = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const addNotification = useCallback((n: Omit<Notification, 'id' | 'timestamp' | 'read'>) => {
    const notification: Notification = {
      ...n,
      id: crypto.randomUUID(),
      timestamp: new Date(),
      read: false,
    };
    setNotifications(prev => [notification, ...prev].slice(0, 50));
    setUnreadCount(prev => prev + 1);
  }, []);

  const markAllRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
  }, []);

  const markRead = useCallback((id: string) => {
    setNotifications(prev =>
      prev.map(n => n.id === id ? { ...n, read: true } : n)
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
  }, []);

  // Check for overdue leads on mount
  useEffect(() => {
    if (!user) return;

    const checkOverdue = async () => {
      const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
      const { data } = await supabase
        .from('leads')
        .select('id, company_name, updated_at, status')
        .or(`created_by.eq.${user.id},assigned_rep_id.eq.${user.id}`)
        .lt('updated_at', threeDaysAgo)
        .not('status', 'in', '("deal_closed","company_closed","rejected_phone","rejected_spot","wrong_number")');

      (data || []).forEach(lead => {
        const days = Math.floor((Date.now() - new Date(lead.updated_at).getTime()) / (1000 * 60 * 60 * 24));
        addNotification({
          title: 'Overdue Lead',
          description: `${lead.company_name} — no contact in ${days} days`,
          type: 'overdue',
          leadId: lead.id,
        });
      });
    };

    checkOverdue();
  }, [user, addNotification]);

  // Check for upcoming meetings (within 12 hours)
  useEffect(() => {
    if (!user) return;

    const checkUpcomingMeetings = async () => {
      const now = new Date();
      const twelveHoursLater = new Date(now.getTime() + 12 * 60 * 60 * 1000);

      const { data: meetings } = await supabase
        .from('meetings')
        .select('id, lead_id, scheduled_at, location')
        .gte('scheduled_at', now.toISOString())
        .lte('scheduled_at', twelveHoursLater.toISOString())
        .eq('created_by', user.id);

      if (!meetings || meetings.length === 0) return;

      // Get lead names for the meetings
      const leadIds = [...new Set(meetings.map(m => m.lead_id))];
      const { data: leads } = await supabase
        .from('leads')
        .select('id, company_name')
        .in('id', leadIds);

      const leadMap = Object.fromEntries((leads || []).map(l => [l.id, l.company_name]));

      meetings.forEach(meeting => {
        const scheduledAt = new Date(meeting.scheduled_at);
        const hoursUntil = Math.round((scheduledAt.getTime() - now.getTime()) / (1000 * 60 * 60));
        const companyName = leadMap[meeting.lead_id] || 'Unknown';
        addNotification({
          title: 'Meeting Reminder',
          description: `${companyName} — in ${hoursUntil}h${meeting.location ? ` at ${meeting.location}` : ''}`,
          type: 'meeting_reminder',
          leadId: meeting.lead_id,
        });
      });
    };

    checkUpcomingMeetings();
  }, [user, addNotification]);

  // Subscribe to realtime lead changes
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('lead-notifications')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'leads' },
        (payload) => {
          const newLead = payload.new as LeadRow;
          const oldLead = payload.old as Partial<LeadRow>;

          if (oldLead.status && newLead.status !== oldLead.status) {
            const statusLabel = LEAD_STATUS_CONFIG[newLead.status]?.label || newLead.status;
            if (newLead.created_by === user.id || newLead.assigned_rep_id === user.id) {
              addNotification({
                title: 'Lead Status Changed',
                description: `${newLead.company_name} → ${statusLabel}`,
                type: 'status_change',
                leadId: newLead.id,
              });
            }
          }

          if (newLead.assigned_rep_id === user.id && oldLead.assigned_rep_id !== user.id) {
            addNotification({
              title: 'New Lead Assigned',
              description: `${newLead.company_name} has been assigned to you`,
              type: 'assignment',
              leadId: newLead.id,
            });
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'leads' },
        (payload) => {
          const newLead = payload.new as LeadRow;
          if (newLead.assigned_rep_id === user.id && newLead.created_by !== user.id) {
            addNotification({
              title: 'New Lead Assigned',
              description: `${newLead.company_name} has been assigned to you`,
              type: 'assignment',
              leadId: newLead.id,
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, addNotification]);

  return { notifications, unreadCount, markAllRead, markRead };
};
