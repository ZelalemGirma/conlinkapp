
-- Helper: can current user see a given lead?
CREATE OR REPLACE FUNCTION public.can_view_lead(_lead_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.leads l
    WHERE l.id = _lead_id
      AND (
        public.has_role(auth.uid(), 'admin')
        OR public.has_role(auth.uid(), 'manager')
        OR l.created_by = auth.uid()
        OR l.assigned_rep_id = auth.uid()
      )
  )
$$;

-- ============ LEADS ============
DROP POLICY IF EXISTS "Authenticated users can view leads" ON public.leads;
CREATE POLICY "Users can view permitted leads"
ON public.leads FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'manager')
  OR created_by = auth.uid()
  OR assigned_rep_id = auth.uid()
);

-- ============ INTERACTION LOGS ============
DROP POLICY IF EXISTS "Authenticated users can view logs" ON public.interaction_logs;
CREATE POLICY "Users can view permitted interaction logs"
ON public.interaction_logs FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'manager')
  OR created_by = auth.uid()
  OR public.can_view_lead(lead_id)
);

-- ============ MEETINGS ============
DROP POLICY IF EXISTS "Authenticated users can view meetings" ON public.meetings;
CREATE POLICY "Users can view permitted meetings"
ON public.meetings FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'manager')
  OR created_by = auth.uid()
  OR public.can_view_lead(lead_id)
);

-- ============ SALES TARGETS ============
DROP POLICY IF EXISTS "Authenticated users can view targets" ON public.sales_targets;
CREATE POLICY "Users can view permitted targets"
ON public.sales_targets FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'manager')
  OR rep_id = auth.uid()
);

-- ============ REP BADGES ============
DROP POLICY IF EXISTS "Authenticated users can view badges" ON public.rep_badges;
CREATE POLICY "Users can view permitted badges"
ON public.rep_badges FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'manager')
  OR user_id = auth.uid()
);

-- ============ PROFILES ============
DROP POLICY IF EXISTS "Anyone authenticated can view profiles" ON public.profiles;
CREATE POLICY "Users can view permitted profiles"
ON public.profiles FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'manager')
  OR user_id = auth.uid()
);

-- ============ USER ROLES ============
DROP POLICY IF EXISTS "Anyone authenticated can view roles" ON public.user_roles;
CREATE POLICY "Users can view permitted roles"
ON public.user_roles FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'manager')
  OR user_id = auth.uid()
);

-- ============ INTERACTION SCORES ============
DROP POLICY IF EXISTS "Authenticated users can view scores" ON public.interaction_scores;
CREATE POLICY "Users can view permitted interaction scores"
ON public.interaction_scores FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'manager')
  OR EXISTS (
    SELECT 1 FROM public.interaction_logs il
    WHERE il.id = interaction_scores.interaction_id
      AND (il.created_by = auth.uid() OR public.can_view_lead(il.lead_id))
  )
);
