ALTER TABLE public.leads ADD COLUMN source text DEFAULT '' NOT NULL;
ALTER TABLE public.leads ADD COLUMN phone_numbers text[] DEFAULT '{}' NOT NULL;