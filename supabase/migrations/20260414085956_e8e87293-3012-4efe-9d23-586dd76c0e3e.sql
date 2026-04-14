
-- Create campaigns table
CREATE TABLE public.campaigns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view campaigns"
  ON public.campaigns FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admins and managers can create campaigns"
  ON public.campaigns FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'));

CREATE POLICY "Admins and managers can update campaigns"
  ON public.campaigns FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'));

CREATE POLICY "Admins can delete campaigns"
  ON public.campaigns FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_campaigns_updated_at
  BEFORE UPDATE ON public.campaigns
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Add campaign_id to leads
ALTER TABLE public.leads ADD COLUMN campaign_id UUID REFERENCES public.campaigns(id) ON DELETE SET NULL;

-- Add campaign_id to interaction_logs
ALTER TABLE public.interaction_logs ADD COLUMN campaign_id UUID REFERENCES public.campaigns(id) ON DELETE SET NULL;

-- Add campaign_id to meetings
ALTER TABLE public.meetings ADD COLUMN campaign_id UUID REFERENCES public.campaigns(id) ON DELETE SET NULL;

-- Add reminder_sent to meetings
ALTER TABLE public.meetings ADD COLUMN reminder_sent BOOLEAN NOT NULL DEFAULT false;

-- Add campaign_id to sourcing_queue
ALTER TABLE public.sourcing_queue ADD COLUMN campaign_id UUID REFERENCES public.campaigns(id) ON DELETE SET NULL;

-- Add active_campaign_id to profiles
ALTER TABLE public.profiles ADD COLUMN active_campaign_id UUID REFERENCES public.campaigns(id) ON DELETE SET NULL;

-- Create indexes for campaign filtering
CREATE INDEX idx_leads_campaign_id ON public.leads(campaign_id);
CREATE INDEX idx_interaction_logs_campaign_id ON public.interaction_logs(campaign_id);
CREATE INDEX idx_meetings_campaign_id ON public.meetings(campaign_id);
CREATE INDEX idx_sourcing_queue_campaign_id ON public.sourcing_queue(campaign_id);
CREATE INDEX idx_meetings_reminder ON public.meetings(scheduled_at, reminder_sent) WHERE reminder_sent = false;
