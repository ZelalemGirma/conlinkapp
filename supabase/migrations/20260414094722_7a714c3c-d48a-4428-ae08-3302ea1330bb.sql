
-- Function to increment actual_count on the matching sales_target
CREATE OR REPLACE FUNCTION public.increment_target_actual(
  _user_id uuid,
  _target_type target_type
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.sales_targets
  SET actual_count = actual_count + 1,
      updated_at = now()
  WHERE rep_id = _user_id
    AND target_type = _target_type
    AND period_start <= current_date
    AND period_end >= current_date;
END;
$$;

-- Trigger: when a meeting is created, increment "meetings" target
CREATE OR REPLACE FUNCTION public.on_meeting_created()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM increment_target_actual(NEW.created_by, 'meetings');
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_meeting_created
AFTER INSERT ON public.meetings
FOR EACH ROW
EXECUTE FUNCTION public.on_meeting_created();

-- Trigger: when a lead is created, increment "leads" target
CREATE OR REPLACE FUNCTION public.on_lead_created()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM increment_target_actual(NEW.created_by, 'leads');
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_lead_created
AFTER INSERT ON public.leads
FOR EACH ROW
EXECUTE FUNCTION public.on_lead_created();

-- Trigger: when a phone interaction is logged, increment "calls" target
CREATE OR REPLACE FUNCTION public.on_interaction_created()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.type = 'phone' THEN
    PERFORM increment_target_actual(NEW.created_by, 'calls');
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_interaction_created
AFTER INSERT ON public.interaction_logs
FOR EACH ROW
EXECUTE FUNCTION public.on_interaction_created();

-- Trigger: when a lead status changes to deal_closed, increment "conversions" target
CREATE OR REPLACE FUNCTION public.on_lead_deal_closed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'deal_closed' AND (OLD.status IS NULL OR OLD.status != 'deal_closed') THEN
    PERFORM increment_target_actual(
      COALESCE(NEW.assigned_rep_id, NEW.created_by),
      'conversions'
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_lead_deal_closed
AFTER UPDATE ON public.leads
FOR EACH ROW
EXECUTE FUNCTION public.on_lead_deal_closed();
