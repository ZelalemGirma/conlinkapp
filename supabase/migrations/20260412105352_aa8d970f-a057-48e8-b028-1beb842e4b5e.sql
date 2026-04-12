
-- Unique partial indexes on phone and email (skip empty strings and nulls)
CREATE UNIQUE INDEX IF NOT EXISTS leads_phone_unique 
ON public.leads (phone) 
WHERE phone IS NOT NULL AND phone != '';

CREATE UNIQUE INDEX IF NOT EXISTS leads_email_unique 
ON public.leads (email) 
WHERE email IS NOT NULL AND email != '';

-- Install pg_trgm for fuzzy matching
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Fuzzy duplicate check function
CREATE OR REPLACE FUNCTION public.check_lead_duplicates(
  _company_name text DEFAULT NULL,
  _phone text DEFAULT NULL,
  _exclude_id uuid DEFAULT NULL
)
RETURNS TABLE(
  id uuid,
  company_name text,
  phone text,
  email text,
  assigned_rep_id uuid,
  match_type text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  normalized_name text;
BEGIN
  -- Normalize company name: lowercase, strip common suffixes and punctuation
  normalized_name := lower(trim(coalesce(_company_name, '')));
  normalized_name := regexp_replace(normalized_name, '\s*(plc|ltd|llc|inc|corp|co|company|business|enterprise|enterprises|trading|group)\s*\.?\s*', ' ', 'gi');
  normalized_name := regexp_replace(normalized_name, '[^a-z0-9\s]', '', 'g');
  normalized_name := trim(regexp_replace(normalized_name, '\s+', ' ', 'g'));

  RETURN QUERY
  -- Phone match (exact)
  SELECT l.id, l.company_name, l.phone, l.email, l.assigned_rep_id, 'phone'::text AS match_type
  FROM public.leads l
  WHERE _phone IS NOT NULL AND _phone != ''
    AND l.phone = _phone
    AND (_exclude_id IS NULL OR l.id != _exclude_id)

  UNION

  -- Company name fuzzy match using trigram similarity
  SELECT l.id, l.company_name, l.phone, l.email, l.assigned_rep_id, 'company_name'::text AS match_type
  FROM public.leads l
  WHERE normalized_name != ''
    AND (_exclude_id IS NULL OR l.id != _exclude_id)
    AND similarity(
      regexp_replace(
        regexp_replace(
          regexp_replace(lower(trim(l.company_name)), '\s*(plc|ltd|llc|inc|corp|co|company|business|enterprise|enterprises|trading|group)\s*\.?\s*', ' ', 'gi'),
          '[^a-z0-9\s]', '', 'g'),
        '\s+', ' ', 'g'),
      normalized_name
    ) > 0.3;
END;
$$;

-- Merge leads function (admin/manager only)
CREATE OR REPLACE FUNCTION public.merge_leads(
  _primary_id uuid,
  _secondary_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check caller is admin or manager
  IF NOT (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager')) THEN
    RAISE EXCEPTION 'Only admins and managers can merge leads';
  END IF;

  -- Move interaction logs from secondary to primary
  UPDATE public.interaction_logs SET lead_id = _primary_id WHERE lead_id = _secondary_id;

  -- Move meetings from secondary to primary
  UPDATE public.meetings SET lead_id = _primary_id WHERE lead_id = _secondary_id;

  -- Delete the secondary lead
  DELETE FROM public.leads WHERE id = _secondary_id;
END;
$$;

-- Allow admins to delete leads (needed for merge and cleanup)
CREATE POLICY "Admins can delete leads"
ON public.leads
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));
