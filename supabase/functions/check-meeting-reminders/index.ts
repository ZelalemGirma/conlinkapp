import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const now = new Date();
    const twelveHoursLater = new Date(now.getTime() + 12 * 60 * 60 * 1000);

    const { data: upcomingMeetings, error: meetingsError } = await supabase
      .from('meetings')
      .select('id, lead_id, scheduled_at, location, notes, created_by')
      .eq('reminder_sent', false)
      .gte('scheduled_at', now.toISOString())
      .lte('scheduled_at', twelveHoursLater.toISOString());

    if (meetingsError) throw meetingsError;

    if (!upcomingMeetings || upcomingMeetings.length === 0) {
      return new Response(JSON.stringify({ message: 'No meetings to remind about' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const remindedIds: string[] = [];

    for (const meeting of upcomingMeetings) {
      const { data: lead } = await supabase
        .from('leads')
        .select('company_name, assigned_rep_id, created_by')
        .eq('id', meeting.lead_id)
        .single();

      if (!lead) continue;

      // Determine who to notify
      const notifyUserIds = new Set<string>();
      notifyUserIds.add(meeting.created_by);
      if (lead.assigned_rep_id) notifyUserIds.add(lead.assigned_rep_id);

      const { data: adminManagers } = await supabase
        .from('user_roles')
        .select('user_id')
        .in('role', ['admin', 'manager']);

      (adminManagers || []).forEach(r => notifyUserIds.add(r.user_id));

      const scheduledDate = new Date(meeting.scheduled_at);
      const timeStr = scheduledDate.toLocaleString('en-US', {
        dateStyle: 'medium',
        timeStyle: 'short',
      });

      // Send email to each user who has an email
      for (const userId of notifyUserIds) {
        // Get user email from auth
        const { data: userData } = await supabase.auth.admin.getUserById(userId);
        const email = userData?.user?.email;
        if (!email) continue;

        await supabase.functions.invoke('send-transactional-email', {
          body: {
            templateName: 'meeting-reminder',
            recipientEmail: email,
            idempotencyKey: `meeting-reminder-${meeting.id}-${userId}`,
            templateData: {
              companyName: lead.company_name,
              scheduledAt: timeStr,
              location: meeting.location || undefined,
              notes: meeting.notes || undefined,
            },
          },
        });
      }

      // Mark as reminded
      const { error: updateError } = await supabase
        .from('meetings')
        .update({ reminder_sent: true })
        .eq('id', meeting.id);

      if (!updateError) {
        remindedIds.push(meeting.id);
      }
    }

    return new Response(
      JSON.stringify({ 
        message: `Processed ${upcomingMeetings.length} meetings, reminded ${remindedIds.length}`,
        reminded: remindedIds,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});