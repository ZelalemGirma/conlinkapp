export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      app_settings: {
        Row: {
          created_at: string
          id: string
          key: string
          updated_at: string
          value: string
        }
        Insert: {
          created_at?: string
          id?: string
          key: string
          updated_at?: string
          value?: string
        }
        Update: {
          created_at?: string
          id?: string
          key?: string
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
      campaigns: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      duplicate_attempts: {
        Row: {
          attempted_at: string
          company_name: string
          id: string
          matched_lead_id: string | null
          user_id: string
        }
        Insert: {
          attempted_at?: string
          company_name: string
          id?: string
          matched_lead_id?: string | null
          user_id: string
        }
        Update: {
          attempted_at?: string
          company_name?: string
          id?: string
          matched_lead_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "duplicate_attempts_matched_lead_id_fkey"
            columns: ["matched_lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      interaction_logs: {
        Row: {
          campaign_id: string | null
          created_at: string
          created_by: string
          id: string
          lead_id: string
          notes: string
          type: Database["public"]["Enums"]["interaction_type"]
        }
        Insert: {
          campaign_id?: string | null
          created_at?: string
          created_by: string
          id?: string
          lead_id: string
          notes?: string
          type: Database["public"]["Enums"]["interaction_type"]
        }
        Update: {
          campaign_id?: string | null
          created_at?: string
          created_by?: string
          id?: string
          lead_id?: string
          notes?: string
          type?: Database["public"]["Enums"]["interaction_type"]
        }
        Relationships: [
          {
            foreignKeyName: "interaction_logs_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interaction_logs_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      interaction_scores: {
        Row: {
          analysis_notes: string | null
          created_at: string
          effort_score: number
          id: string
          interaction_id: string
          quality_label: string
          sentiment: string
        }
        Insert: {
          analysis_notes?: string | null
          created_at?: string
          effort_score?: number
          id?: string
          interaction_id: string
          quality_label?: string
          sentiment?: string
        }
        Update: {
          analysis_notes?: string | null
          created_at?: string
          effort_score?: number
          id?: string
          interaction_id?: string
          quality_label?: string
          sentiment?: string
        }
        Relationships: [
          {
            foreignKeyName: "interaction_scores_interaction_id_fkey"
            columns: ["interaction_id"]
            isOneToOne: true
            referencedRelation: "interaction_logs"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          assigned_rep_id: string | null
          campaign_id: string | null
          campaign_tag: string | null
          category: Database["public"]["Enums"]["lead_category"]
          company_name: string
          contact_person: string
          created_at: string
          created_by: string
          email: string | null
          gps_lat: number | null
          gps_lng: number | null
          id: string
          location_zone: string | null
          meeting_date: string | null
          phone: string | null
          photo_url: string | null
          position: string | null
          specific_address: string | null
          status: Database["public"]["Enums"]["lead_status"]
          updated_at: string
        }
        Insert: {
          assigned_rep_id?: string | null
          campaign_id?: string | null
          campaign_tag?: string | null
          category: Database["public"]["Enums"]["lead_category"]
          company_name: string
          contact_person?: string
          created_at?: string
          created_by: string
          email?: string | null
          gps_lat?: number | null
          gps_lng?: number | null
          id?: string
          location_zone?: string | null
          meeting_date?: string | null
          phone?: string | null
          photo_url?: string | null
          position?: string | null
          specific_address?: string | null
          status?: Database["public"]["Enums"]["lead_status"]
          updated_at?: string
        }
        Update: {
          assigned_rep_id?: string | null
          campaign_id?: string | null
          campaign_tag?: string | null
          category?: Database["public"]["Enums"]["lead_category"]
          company_name?: string
          contact_person?: string
          created_at?: string
          created_by?: string
          email?: string | null
          gps_lat?: number | null
          gps_lng?: number | null
          id?: string
          location_zone?: string | null
          meeting_date?: string | null
          phone?: string | null
          photo_url?: string | null
          position?: string | null
          specific_address?: string | null
          status?: Database["public"]["Enums"]["lead_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "leads_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      meetings: {
        Row: {
          campaign_id: string | null
          created_at: string
          created_by: string
          id: string
          lead_id: string
          location: string | null
          notes: string | null
          reminder_sent: boolean
          scheduled_at: string
          updated_at: string
        }
        Insert: {
          campaign_id?: string | null
          created_at?: string
          created_by: string
          id?: string
          lead_id: string
          location?: string | null
          notes?: string | null
          reminder_sent?: boolean
          scheduled_at: string
          updated_at?: string
        }
        Update: {
          campaign_id?: string | null
          created_at?: string
          created_by?: string
          id?: string
          lead_id?: string
          location?: string | null
          notes?: string | null
          reminder_sent?: boolean
          scheduled_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "meetings_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meetings_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          active_campaign_id: string | null
          avatar_url: string | null
          created_at: string
          deactivated: boolean
          full_name: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          active_campaign_id?: string | null
          avatar_url?: string | null
          created_at?: string
          deactivated?: boolean
          full_name?: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          active_campaign_id?: string | null
          avatar_url?: string | null
          created_at?: string
          deactivated?: boolean
          full_name?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_active_campaign_id_fkey"
            columns: ["active_campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      rep_badges: {
        Row: {
          badge_label: string
          badge_type: string
          created_at: string
          id: string
          period_end: string
          period_start: string
          user_id: string
        }
        Insert: {
          badge_label: string
          badge_type: string
          created_at?: string
          id?: string
          period_end: string
          period_start: string
          user_id: string
        }
        Update: {
          badge_label?: string
          badge_type?: string
          created_at?: string
          id?: string
          period_end?: string
          period_start?: string
          user_id?: string
        }
        Relationships: []
      }
      sales_targets: {
        Row: {
          actual_count: number
          created_at: string
          id: string
          period_end: string
          period_start: string
          rep_id: string
          target_count: number
          target_type: Database["public"]["Enums"]["target_type"]
          updated_at: string
        }
        Insert: {
          actual_count?: number
          created_at?: string
          id?: string
          period_end: string
          period_start: string
          rep_id: string
          target_count?: number
          target_type?: Database["public"]["Enums"]["target_type"]
          updated_at?: string
        }
        Update: {
          actual_count?: number
          created_at?: string
          id?: string
          period_end?: string
          period_start?: string
          rep_id?: string
          target_count?: number
          target_type?: Database["public"]["Enums"]["target_type"]
          updated_at?: string
        }
        Relationships: []
      }
      sourcing_queue: {
        Row: {
          address: string | null
          ai_reasoning: string | null
          approved_by: string | null
          assigned_rep_id: string | null
          campaign_id: string | null
          category: string | null
          company_name: string
          contact_person: string
          created_at: string
          duplicate_lead_id: string | null
          email: string | null
          fetched_by: string
          id: string
          is_duplicate: boolean
          phone: string | null
          priority: string | null
          raw_text: string | null
          relevance_score: number | null
          source_url: string
          status: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          ai_reasoning?: string | null
          approved_by?: string | null
          assigned_rep_id?: string | null
          campaign_id?: string | null
          category?: string | null
          company_name?: string
          contact_person?: string
          created_at?: string
          duplicate_lead_id?: string | null
          email?: string | null
          fetched_by: string
          id?: string
          is_duplicate?: boolean
          phone?: string | null
          priority?: string | null
          raw_text?: string | null
          relevance_score?: number | null
          source_url: string
          status?: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          ai_reasoning?: string | null
          approved_by?: string | null
          assigned_rep_id?: string | null
          campaign_id?: string | null
          category?: string | null
          company_name?: string
          contact_person?: string
          created_at?: string
          duplicate_lead_id?: string | null
          email?: string | null
          fetched_by?: string
          id?: string
          is_duplicate?: boolean
          phone?: string | null
          priority?: string | null
          raw_text?: string | null
          relevance_score?: number | null
          source_url?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sourcing_queue_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sourcing_queue_duplicate_lead_id_fkey"
            columns: ["duplicate_lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      check_lead_duplicates: {
        Args: { _company_name?: string; _exclude_id?: string; _phone?: string }
        Returns: {
          assigned_rep_id: string
          company_name: string
          email: string
          id: string
          match_type: string
          phone: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      merge_leads: {
        Args: { _primary_id: string; _secondary_id: string }
        Returns: undefined
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
    }
    Enums: {
      app_role: "admin" | "manager" | "rep"
      interaction_type:
        | "phone"
        | "email"
        | "telegram"
        | "site_visit"
        | "meeting"
      lead_category:
        | "Building Materials"
        | "Electrical & Power"
        | "Electro Mechanical"
        | "Conveying Systems"
        | "Solar Technology"
        | "Specialities"
        | "Metal & Industrial Engineering"
        | "Pre-Engineered System"
        | "Road Construction Materials"
        | "Geological Systems"
        | "Construction Machinery"
        | "Land and Building Development"
        | "Consultants"
        | "Construction Firms"
        | "Interior Design & Architecture"
        | "Financial Service"
      lead_status:
        | "draft"
        | "pending"
        | "approved"
        | "deal_closed"
        | "meeting_scheduled"
        | "profile_sent"
        | "needs_followup"
        | "call_me_back"
        | "rejected_phone"
        | "rejected_spot"
        | "company_closed"
        | "wrong_number"
        | "not_reachable"
        | "not_answered"
      target_type: "leads" | "calls" | "meetings" | "conversions"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "manager", "rep"],
      interaction_type: ["phone", "email", "telegram", "site_visit", "meeting"],
      lead_category: [
        "Building Materials",
        "Electrical & Power",
        "Electro Mechanical",
        "Conveying Systems",
        "Solar Technology",
        "Specialities",
        "Metal & Industrial Engineering",
        "Pre-Engineered System",
        "Road Construction Materials",
        "Geological Systems",
        "Construction Machinery",
        "Land and Building Development",
        "Consultants",
        "Construction Firms",
        "Interior Design & Architecture",
        "Financial Service",
      ],
      lead_status: [
        "draft",
        "pending",
        "approved",
        "deal_closed",
        "meeting_scheduled",
        "profile_sent",
        "needs_followup",
        "call_me_back",
        "rejected_phone",
        "rejected_spot",
        "company_closed",
        "wrong_number",
        "not_reachable",
        "not_answered",
      ],
      target_type: ["leads", "calls", "meetings", "conversions"],
    },
  },
} as const
