export type UserRole = 'admin' | 'manager' | 'rep';

export type LeadStatus =
  | 'draft'
  | 'pending'
  | 'approved'
  | 'deal_closed'
  | 'meeting_scheduled'
  | 'profile_sent'
  | 'needs_followup'
  | 'call_me_back'
  | 'rejected_phone'
  | 'rejected_spot'
  | 'company_closed'
  | 'wrong_number'
  | 'not_reachable'
  | 'not_answered';

export type LeadCategory =
  | 'Building Materials'
  | 'Electrical & Power'
  | 'Electro Mechanical'
  | 'Conveying Systems'
  | 'Solar Technology'
  | 'Specialities'
  | 'Metal & Industrial Engineering'
  | 'Pre-Engineered System'
  | 'Road Construction Materials'
  | 'Geological Systems'
  | 'Construction Machinery'
  | 'Land and Building Development'
  | 'Consultants'
  | 'Construction Firms'
  | 'Interior Design & Architecture'
  | 'Financial Service';

export type InteractionType = 'phone' | 'email' | 'telegram' | 'site_visit' | 'meeting';

export const LEAD_CATEGORIES: LeadCategory[] = [
  'Building Materials',
  'Electrical & Power',
  'Electro Mechanical',
  'Conveying Systems',
  'Solar Technology',
  'Specialities',
  'Metal & Industrial Engineering',
  'Pre-Engineered System',
  'Road Construction Materials',
  'Geological Systems',
  'Construction Machinery',
  'Land and Building Development',
  'Consultants',
  'Construction Firms',
  'Interior Design & Architecture',
  'Financial Service',
];

export const LOCATION_ZONES = [
  'Bole', 'Kirkos', 'Nifas Silk', 'Yeka', 'Arada', 'Addis Ketema',
  'Lideta', 'Kolfe Keranio', 'Gulele', 'Akaky Kaliti', 'Lemi Kura',
];

export const LEAD_SOURCES = [
  'Walk-in',
  'Addis Chamber',
  'TikTok',
  'Exhibition',
  'Office',
  'Referral',
  'Website',
  'Cold Call',
  'Social Media',
  'Email Campaign',
  'Partner',
] as const;

export const LEAD_STATUS_CONFIG: Record<LeadStatus, { label: string; color: string }> = {
  draft: { label: 'Draft', color: 'bg-muted text-muted-foreground' },
  pending: { label: 'Pending Approval', color: 'bg-warning text-warning-foreground' },
  approved: { label: 'Approved', color: 'bg-info text-info-foreground' },
  deal_closed: { label: 'Deal Closed', color: 'bg-success text-success-foreground' },
  meeting_scheduled: { label: 'Meeting Scheduled', color: 'bg-info text-info-foreground' },
  profile_sent: { label: 'Profile Sent', color: 'bg-secondary text-secondary-foreground' },
  needs_followup: { label: 'Needs Follow-up', color: 'bg-warning text-warning-foreground' },
  call_me_back: { label: 'Call Me Back', color: 'bg-primary text-primary-foreground' },
  rejected_phone: { label: 'Rejected (Phone)', color: 'bg-destructive text-destructive-foreground' },
  rejected_spot: { label: 'Rejected (Spot)', color: 'bg-destructive text-destructive-foreground' },
  company_closed: { label: 'Company Closed', color: 'bg-muted text-muted-foreground' },
  wrong_number: { label: 'Wrong Number', color: 'bg-destructive text-destructive-foreground' },
  not_reachable: { label: 'Not Reachable', color: 'bg-muted text-muted-foreground' },
  not_answered: { label: 'Not Answered', color: 'bg-muted text-muted-foreground' },
};

export interface Lead {
  id: string;
  company_name: string;
  contact_person: string;
  position: string;
  phone: string;
  email: string;
  category: LeadCategory;
  specific_address: string;
  location_zone: string;
  gps_lat?: number;
  gps_lng?: number;
  campaign_tag: string;
  status: LeadStatus;
  assigned_rep_id?: string;
  created_by: string;
  photo_url?: string;
  created_at: string;
  updated_at: string;
}

export interface InteractionLog {
  id: string;
  lead_id: string;
  type: InteractionType;
  notes: string;
  created_by: string;
  created_at: string;
}

export interface SalesTarget {
  id: string;
  rep_id: string;
  target_count: number;
  actual_count: number;
  period_start: string;
  period_end: string;
}

export interface Profile {
  id: string;
  full_name: string;
  email: string;
  avatar_url?: string;
}
