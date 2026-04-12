
-- Table for AI interaction quality scores
CREATE TABLE public.interaction_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  interaction_id uuid NOT NULL REFERENCES public.interaction_logs(id) ON DELETE CASCADE,
  effort_score integer NOT NULL DEFAULT 5 CHECK (effort_score >= 1 AND effort_score <= 10),
  sentiment text NOT NULL DEFAULT 'neutral',
  quality_label text NOT NULL DEFAULT 'medium',
  analysis_notes text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(interaction_id)
);

ALTER TABLE public.interaction_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view scores"
  ON public.interaction_scores FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Service role can insert scores"
  ON public.interaction_scores FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Service role can update scores"
  ON public.interaction_scores FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Table to track duplicate entry attempts
CREATE TABLE public.duplicate_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  company_name text NOT NULL,
  matched_lead_id uuid REFERENCES public.leads(id) ON DELETE SET NULL,
  attempted_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.duplicate_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins and managers can view all attempts"
  ON public.duplicate_attempts FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role) OR auth.uid() = user_id);

CREATE POLICY "Authenticated users can log attempts"
  ON public.duplicate_attempts FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Table for rep badges
CREATE TABLE public.rep_badges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  badge_type text NOT NULL,
  badge_label text NOT NULL,
  period_start date NOT NULL,
  period_end date NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.rep_badges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view badges"
  ON public.rep_badges FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admins can manage badges"
  ON public.rep_badges FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete badges"
  ON public.rep_badges FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));
