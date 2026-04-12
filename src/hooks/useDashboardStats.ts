import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface DashboardStats {
  totalLeads: number;
  dealsClosed: number;
  meetingsToday: number;
  followupsDue: number;
  overdueCount: number;
  leadsThisWeek: number;
  statusBreakdown: Record<string, number>;
}

export const useDashboardStats = () => {
  const { user, role } = useAuth();

  return useQuery({
    queryKey: ['dashboard-stats', user?.id, role],
    queryFn: async () => {
      const now = new Date();
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
      const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString();
      const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString();

      let leadsQuery = supabase.from('leads').select('id, status, created_at, updated_at');
      if (role === 'rep' && user) {
        leadsQuery = leadsQuery.or(`created_by.eq.${user.id},assigned_rep_id.eq.${user.id}`);
      }
      const { data: leads } = await leadsQuery;

      const allLeads = leads || [];
      const totalLeads = allLeads.length;
      const dealsClosed = allLeads.filter(l => l.status === 'deal_closed').length;
      const leadsThisWeek = allLeads.filter(l => new Date(l.created_at) >= weekAgo).length;
      const followupsDue = allLeads.filter(l => l.status === 'needs_followup' || l.status === 'call_me_back').length;
      const overdueCount = allLeads.filter(l =>
        !['deal_closed', 'company_closed', 'rejected_phone', 'rejected_spot', 'wrong_number'].includes(l.status) &&
        l.updated_at < threeDaysAgo
      ).length;

      const statusBreakdown: Record<string, number> = {};
      allLeads.forEach(l => {
        statusBreakdown[l.status] = (statusBreakdown[l.status] || 0) + 1;
      });

      // Meetings today
      const { count: meetingsToday } = await supabase
        .from('meetings')
        .select('id', { count: 'exact', head: true })
        .gte('scheduled_at', todayStart)
        .lt('scheduled_at', todayEnd);

      return {
        totalLeads,
        dealsClosed,
        meetingsToday: meetingsToday || 0,
        followupsDue,
        overdueCount,
        leadsThisWeek,
        statusBreakdown,
      } as DashboardStats;
    },
    enabled: !!user,
  });
};

export interface RepPerformance {
  userId: string;
  fullName: string;
  totalLeads: number;
  dealsClosed: number;
  meetingsScheduled: number;
  interactionCount: number;
}

export const useTeamPerformance = () => {
  return useQuery({
    queryKey: ['team-performance'],
    queryFn: async () => {
      const { data: profiles } = await supabase.from('profiles').select('user_id, full_name');
      const { data: roles } = await supabase.from('user_roles').select('user_id, role').eq('role', 'rep');
      const { data: leads } = await supabase.from('leads').select('id, status, assigned_rep_id, created_by');
      const { data: interactions } = await supabase.from('interaction_logs').select('id, created_by');

      const repUserIds = (roles || []).map(r => r.user_id);
      const profileMap = Object.fromEntries((profiles || []).map(p => [p.user_id, p.full_name]));

      return repUserIds.map(uid => {
        const repLeads = (leads || []).filter(l => l.assigned_rep_id === uid || l.created_by === uid);
        return {
          userId: uid,
          fullName: profileMap[uid] || 'Unknown',
          totalLeads: repLeads.length,
          dealsClosed: repLeads.filter(l => l.status === 'deal_closed').length,
          meetingsScheduled: repLeads.filter(l => l.status === 'meeting_scheduled').length,
          interactionCount: (interactions || []).filter(i => i.created_by === uid).length,
        } as RepPerformance;
      }).sort((a, b) => b.dealsClosed - a.dealsClosed);
    },
  });
};

export const useSpotlightRep = () => {
  return useQuery({
    queryKey: ['spotlight-rep'],
    queryFn: async () => {
      const { data: settings } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', 'golden_spotlight_user_id')
        .maybeSingle();

      if (!settings?.value) return null;

      const { data: profile } = await supabase
        .from('profiles')
        .select('user_id, full_name')
        .eq('user_id', settings.value)
        .maybeSingle();

      if (!profile) return null;

      const { data: leads } = await supabase
        .from('leads')
        .select('id')
        .eq('status', 'deal_closed')
        .or(`assigned_rep_id.eq.${profile.user_id},created_by.eq.${profile.user_id}`);

      return {
        fullName: profile.full_name,
        userId: profile.user_id,
        dealsClosed: leads?.length || 0,
      };
    },
  });
};
