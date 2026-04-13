
-- Create sourcing queue table for raw scraped leads
CREATE TABLE public.sourcing_queue (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  source_url TEXT NOT NULL,
  company_name TEXT NOT NULL DEFAULT '',
  contact_person TEXT NOT NULL DEFAULT '',
  phone TEXT DEFAULT '',
  email TEXT DEFAULT '',
  address TEXT DEFAULT '',
  category TEXT DEFAULT '',
  raw_text TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  is_duplicate BOOLEAN NOT NULL DEFAULT false,
  duplicate_lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
  fetched_by UUID NOT NULL,
  approved_by UUID,
  assigned_rep_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.sourcing_queue ENABLE ROW LEVEL SECURITY;

-- Only admins and managers can view
CREATE POLICY "Admins and managers can view sourcing queue"
ON public.sourcing_queue FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

-- Only admins and managers can insert
CREATE POLICY "Admins and managers can insert sourcing queue"
ON public.sourcing_queue FOR INSERT TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

-- Only admins and managers can update
CREATE POLICY "Admins and managers can update sourcing queue"
ON public.sourcing_queue FOR UPDATE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

-- Only admins and managers can delete
CREATE POLICY "Admins and managers can delete sourcing queue"
ON public.sourcing_queue FOR DELETE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

-- Auto-update timestamp
CREATE TRIGGER update_sourcing_queue_updated_at
BEFORE UPDATE ON public.sourcing_queue
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
