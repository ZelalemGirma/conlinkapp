
-- Create role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'manager', 'rep');

-- Create lead status enum
CREATE TYPE public.lead_status AS ENUM (
  'draft', 'pending', 'approved', 'deal_closed', 'meeting_scheduled',
  'profile_sent', 'needs_followup', 'call_me_back', 'rejected_phone',
  'rejected_spot', 'company_closed', 'wrong_number', 'not_reachable', 'not_answered'
);

-- Create lead category enum
CREATE TYPE public.lead_category AS ENUM (
  'Building Materials', 'Electrical & Power', 'Electro Mechanical', 'Conveying Systems',
  'Solar Technology', 'Specialities', 'Metal & Industrial Engineering', 'Pre-Engineered System',
  'Road Construction Materials', 'Geological Systems', 'Construction Machinery',
  'Land and Building Development', 'Consultants', 'Construction Firms',
  'Interior Design & Architecture', 'Financial Service'
);

-- Create interaction type enum
CREATE TYPE public.interaction_type AS ENUM ('phone', 'email', 'telegram', 'site_visit', 'meeting');

-- Profiles table
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  full_name TEXT NOT NULL DEFAULT '',
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- User roles table
CREATE TABLE public.user_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'rep',
  UNIQUE(user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles (avoids RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$$;

-- Leads table
CREATE TABLE public.leads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_name TEXT NOT NULL,
  contact_person TEXT NOT NULL DEFAULT '',
  position TEXT DEFAULT '',
  phone TEXT DEFAULT '',
  email TEXT DEFAULT '',
  category lead_category NOT NULL,
  specific_address TEXT DEFAULT '',
  location_zone TEXT DEFAULT '',
  gps_lat DOUBLE PRECISION,
  gps_lng DOUBLE PRECISION,
  campaign_tag TEXT DEFAULT '',
  status lead_status NOT NULL DEFAULT 'draft',
  assigned_rep_id UUID REFERENCES auth.users(id),
  created_by UUID REFERENCES auth.users(id) NOT NULL,
  photo_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

-- Interaction logs table
CREATE TABLE public.interaction_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE NOT NULL,
  type interaction_type NOT NULL,
  notes TEXT NOT NULL DEFAULT '',
  created_by UUID REFERENCES auth.users(id) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.interaction_logs ENABLE ROW LEVEL SECURITY;

-- Sales targets table
CREATE TABLE public.sales_targets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  rep_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  target_count INTEGER NOT NULL DEFAULT 0,
  actual_count INTEGER NOT NULL DEFAULT 0,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.sales_targets ENABLE ROW LEVEL SECURITY;

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Triggers for updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_leads_updated_at BEFORE UPDATE ON public.leads FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_sales_targets_updated_at BEFORE UPDATE ON public.sales_targets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''));
  -- Default role is rep
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'rep');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- RLS Policies

-- Profiles
CREATE POLICY "Anyone authenticated can view profiles" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- User roles
CREATE POLICY "Anyone authenticated can view roles" ON public.user_roles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage roles" ON public.user_roles FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update roles" ON public.user_roles FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete roles" ON public.user_roles FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Leads
CREATE POLICY "Authenticated users can view leads" ON public.leads FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can create leads" ON public.leads FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Reps can update own leads" ON public.leads FOR UPDATE TO authenticated USING (
  auth.uid() = created_by OR auth.uid() = assigned_rep_id OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager')
);

-- Interaction logs
CREATE POLICY "Authenticated users can view logs" ON public.interaction_logs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can create logs" ON public.interaction_logs FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);

-- Sales targets
CREATE POLICY "Authenticated users can view targets" ON public.sales_targets FOR SELECT TO authenticated USING (true);
CREATE POLICY "Managers and admins can create targets" ON public.sales_targets FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'));
CREATE POLICY "Managers and admins can update targets" ON public.sales_targets FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'));
