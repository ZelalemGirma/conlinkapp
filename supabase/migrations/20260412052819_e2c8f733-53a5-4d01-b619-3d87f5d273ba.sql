-- Create enum for target types
CREATE TYPE public.target_type AS ENUM ('leads', 'calls', 'meetings', 'conversions');

-- Add target_type column to sales_targets with default 'leads'
ALTER TABLE public.sales_targets 
ADD COLUMN target_type public.target_type NOT NULL DEFAULT 'leads';