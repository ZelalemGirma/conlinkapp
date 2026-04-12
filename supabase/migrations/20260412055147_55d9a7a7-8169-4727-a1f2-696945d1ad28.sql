
-- Add deactivated flag to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS deactivated boolean NOT NULL DEFAULT false;

-- Allow admins to update any profile (for name changes and deactivation)
CREATE POLICY "Admins can update any profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Allow admins to delete profiles
CREATE POLICY "Admins can delete profiles"
ON public.profiles
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));
