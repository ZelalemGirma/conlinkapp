ALTER TABLE public.sourcing_queue
  ADD COLUMN relevance_score integer DEFAULT 0,
  ADD COLUMN ai_reasoning text DEFAULT '',
  ADD COLUMN priority text DEFAULT 'medium';
