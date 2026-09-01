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
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      admin_settings: {
        Row: {
          admin_password: string
          id: string
        }
        Insert: {
          admin_password?: string
          id?: string
        }
        Update: {
          admin_password?: string
          id?: string
        }
        Relationships: []
      }
      audit_requests: {
        Row: {
          client_name: string
          company_name: string | null
          created_at: string
          email: string
          id: string
          payload: Json
          phone: string
          status: string
          updated_at: string
        }
        Insert: {
          client_name: string
          company_name?: string | null
          created_at?: string
          email: string
          id: string
          payload: Json
          phone: string
          status?: string
          updated_at?: string
        }
        Update: {
          client_name?: string
          company_name?: string | null
          created_at?: string
          email?: string
          id?: string
          payload?: Json
          phone?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      audit_snapshots: {
        Row: {
          created_at: string
          error: string | null
          extracted_at: string
          id: string
          is_mock: boolean
          metrics: Json | null
          platform: string
          raw_response: Json | null
          social_connection_id: string
          source: string
        }
        Insert: {
          created_at?: string
          error?: string | null
          extracted_at: string
          id?: string
          is_mock?: boolean
          metrics?: Json | null
          platform: string
          raw_response?: Json | null
          social_connection_id: string
          source: string
        }
        Update: {
          created_at?: string
          error?: string | null
          extracted_at?: string
          id?: string
          is_mock?: boolean
          metrics?: Json | null
          platform?: string
          raw_response?: Json | null
          social_connection_id?: string
          source?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_snapshots_social_connection_id_fkey"
            columns: ["social_connection_id"]
            isOneToOne: false
            referencedRelation: "social_connections"
            referencedColumns: ["id"]
          },
        ]
      }
      client_action_quotes: {
        Row: {
          accepted_at: string | null
          action_type: string
          actual_cost_usd: number | null
          actual_usage: Json | null
          client_profile_id: string
          cost_breakdown: Json
          created_at: string
          estimated_cost_usd: number
          id: string
          social_connection_id: string
        }
        Insert: {
          accepted_at?: string | null
          action_type: string
          actual_cost_usd?: number | null
          actual_usage?: Json | null
          client_profile_id: string
          cost_breakdown: Json
          created_at?: string
          estimated_cost_usd: number
          id?: string
          social_connection_id: string
        }
        Update: {
          accepted_at?: string | null
          action_type?: string
          actual_cost_usd?: number | null
          actual_usage?: Json | null
          client_profile_id?: string
          cost_breakdown?: Json
          created_at?: string
          estimated_cost_usd?: number
          id?: string
          social_connection_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_action_quotes_client_profile_id_fkey"
            columns: ["client_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_action_quotes_social_connection_id_fkey"
            columns: ["social_connection_id"]
            isOneToOne: false
            referencedRelation: "social_connections"
            referencedColumns: ["id"]
          },
        ]
      }
      competitive_briefs: {
        Row: {
          admin_notes: string | null
          brief_content: string | null
          competitor_name: string
          created_at: string
          error: string | null
          id: string
          is_mock: boolean
          sources: Json | null
        }
        Insert: {
          admin_notes?: string | null
          brief_content?: string | null
          competitor_name: string
          created_at?: string
          error?: string | null
          id?: string
          is_mock?: boolean
          sources?: Json | null
        }
        Update: {
          admin_notes?: string | null
          brief_content?: string | null
          competitor_name?: string
          created_at?: string
          error?: string | null
          id?: string
          is_mock?: boolean
          sources?: Json | null
        }
        Relationships: []
      }
      content_drafts: {
        Row: {
          calendar_day_offset: number
          calendar_entry_index: number
          calendar_platform: string
          calendar_working_title: string
          caption: string | null
          created_at: string
          error: string | null
          hook: string | null
          id: string
          is_mock: boolean
          review_notes: string | null
          review_status: string
          reviewed_at: string | null
          reviewed_by: string | null
          script: string | null
          social_connection_id: string
          strategy_id: string
        }
        Insert: {
          calendar_day_offset: number
          calendar_entry_index: number
          calendar_platform: string
          calendar_working_title: string
          caption?: string | null
          created_at?: string
          error?: string | null
          hook?: string | null
          id?: string
          is_mock?: boolean
          review_notes?: string | null
          review_status?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          script?: string | null
          social_connection_id: string
          strategy_id: string
        }
        Update: {
          calendar_day_offset?: number
          calendar_entry_index?: number
          calendar_platform?: string
          calendar_working_title?: string
          caption?: string | null
          created_at?: string
          error?: string | null
          hook?: string | null
          id?: string
          is_mock?: boolean
          review_notes?: string | null
          review_status?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          script?: string | null
          social_connection_id?: string
          strategy_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_drafts_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_drafts_social_connection_id_fkey"
            columns: ["social_connection_id"]
            isOneToOne: false
            referencedRelation: "social_connections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_drafts_strategy_id_fkey"
            columns: ["strategy_id"]
            isOneToOne: false
            referencedRelation: "content_strategies"
            referencedColumns: ["id"]
          },
        ]
      }
      content_strategies: {
        Row: {
          created_at: string
          diagnostic_id: string
          editorial_calendar: Json | null
          error: string | null
          id: string
          is_mock: boolean
          pillars: Json | null
          review_notes: string | null
          review_status: string
          reviewed_at: string | null
          reviewed_by: string | null
          social_connection_id: string
          summary: string | null
          trends_used: Json | null
        }
        Insert: {
          created_at?: string
          diagnostic_id: string
          editorial_calendar?: Json | null
          error?: string | null
          id?: string
          is_mock?: boolean
          pillars?: Json | null
          review_notes?: string | null
          review_status?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          social_connection_id: string
          summary?: string | null
          trends_used?: Json | null
        }
        Update: {
          created_at?: string
          diagnostic_id?: string
          editorial_calendar?: Json | null
          error?: string | null
          id?: string
          is_mock?: boolean
          pillars?: Json | null
          review_notes?: string | null
          review_status?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          social_connection_id?: string
          summary?: string | null
          trends_used?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "content_strategies_diagnostic_id_fkey"
            columns: ["diagnostic_id"]
            isOneToOne: false
            referencedRelation: "diagnostics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_strategies_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_strategies_social_connection_id_fkey"
            columns: ["social_connection_id"]
            isOneToOne: false
            referencedRelation: "social_connections"
            referencedColumns: ["id"]
          },
        ]
      }
      diagnostic_screenshots: {
        Row: {
          created_at: string
          id: string
          label: string
          social_connection_id: string
          storage_path: string
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          label: string
          social_connection_id: string
          storage_path: string
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          label?: string
          social_connection_id?: string
          storage_path?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "diagnostic_screenshots_social_connection_id_fkey"
            columns: ["social_connection_id"]
            isOneToOne: false
            referencedRelation: "social_connections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "diagnostic_screenshots_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      diagnostics: {
        Row: {
          audit_snapshot_id: string | null
          conclusive: boolean | null
          created_at: string
          error: string | null
          hypotheses: Json | null
          id: string
          is_mock: boolean
          missing_data: Json | null
          review_notes: string | null
          review_status: string
          reviewed_at: string | null
          reviewed_by: string | null
          screenshot_ids: string[]
          social_connection_id: string
          summary: string | null
        }
        Insert: {
          audit_snapshot_id?: string | null
          conclusive?: boolean | null
          created_at?: string
          error?: string | null
          hypotheses?: Json | null
          id?: string
          is_mock?: boolean
          missing_data?: Json | null
          review_notes?: string | null
          review_status?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          screenshot_ids?: string[]
          social_connection_id: string
          summary?: string | null
        }
        Update: {
          audit_snapshot_id?: string | null
          conclusive?: boolean | null
          created_at?: string
          error?: string | null
          hypotheses?: Json | null
          id?: string
          is_mock?: boolean
          missing_data?: Json | null
          review_notes?: string | null
          review_status?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          screenshot_ids?: string[]
          social_connection_id?: string
          summary?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "diagnostics_audit_snapshot_id_fkey"
            columns: ["audit_snapshot_id"]
            isOneToOne: false
            referencedRelation: "audit_snapshots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "diagnostics_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "diagnostics_social_connection_id_fkey"
            columns: ["social_connection_id"]
            isOneToOne: false
            referencedRelation: "social_connections"
            referencedColumns: ["id"]
          },
        ]
      }
      edge_function_rate_limits: {
        Row: {
          last_called_at: string
          resource_key: string
        }
        Insert: {
          last_called_at?: string
          resource_key: string
        }
        Update: {
          last_called_at?: string
          resource_key?: string
        }
        Relationships: []
      }
      engagement_items: {
        Row: {
          author_handle: string | null
          classification_rationale: string | null
          content: string
          created_at: string
          error: string | null
          handled: boolean
          handled_at: string | null
          handled_by: string | null
          human_notes: string | null
          id: string
          is_mock: boolean
          kind: string
          needs_response: boolean | null
          platform_comment_id: string
          posted_at: string | null
          social_connection_id: string
        }
        Insert: {
          author_handle?: string | null
          classification_rationale?: string | null
          content: string
          created_at?: string
          error?: string | null
          handled?: boolean
          handled_at?: string | null
          handled_by?: string | null
          human_notes?: string | null
          id?: string
          is_mock?: boolean
          kind: string
          needs_response?: boolean | null
          platform_comment_id: string
          posted_at?: string | null
          social_connection_id: string
        }
        Update: {
          author_handle?: string | null
          classification_rationale?: string | null
          content?: string
          created_at?: string
          error?: string | null
          handled?: boolean
          handled_at?: string | null
          handled_by?: string | null
          human_notes?: string | null
          id?: string
          is_mock?: boolean
          kind?: string
          needs_response?: boolean | null
          platform_comment_id?: string
          posted_at?: string | null
          social_connection_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "engagement_items_handled_by_fkey"
            columns: ["handled_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "engagement_items_social_connection_id_fkey"
            columns: ["social_connection_id"]
            isOneToOne: false
            referencedRelation: "social_connections"
            referencedColumns: ["id"]
          },
        ]
      }
      performance_analyses: {
        Row: {
          analysis_summary: string | null
          baseline_snapshot_id: string
          comparison_snapshot_id: string
          correlation_note: string | null
          created_at: string
          error: string | null
          id: string
          is_mock: boolean
          metrics_delta: Json | null
          social_connection_id: string
        }
        Insert: {
          analysis_summary?: string | null
          baseline_snapshot_id: string
          comparison_snapshot_id: string
          correlation_note?: string | null
          created_at?: string
          error?: string | null
          id?: string
          is_mock?: boolean
          metrics_delta?: Json | null
          social_connection_id: string
        }
        Update: {
          analysis_summary?: string | null
          baseline_snapshot_id?: string
          comparison_snapshot_id?: string
          correlation_note?: string | null
          created_at?: string
          error?: string | null
          id?: string
          is_mock?: boolean
          metrics_delta?: Json | null
          social_connection_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "performance_analyses_baseline_snapshot_id_fkey"
            columns: ["baseline_snapshot_id"]
            isOneToOne: false
            referencedRelation: "audit_snapshots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "performance_analyses_comparison_snapshot_id_fkey"
            columns: ["comparison_snapshot_id"]
            isOneToOne: false
            referencedRelation: "audit_snapshots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "performance_analyses_social_connection_id_fkey"
            columns: ["social_connection_id"]
            isOneToOne: false
            referencedRelation: "social_connections"
            referencedColumns: ["id"]
          },
        ]
      }
      phase_pricing_config: {
        Row: {
          action_type: string
          estimated_gpu_seconds: number | null
          estimated_input_tokens: number | null
          estimated_output_tokens: number | null
          margin_pct: number
          notes: string | null
          updated_at: string
        }
        Insert: {
          action_type: string
          estimated_gpu_seconds?: number | null
          estimated_input_tokens?: number | null
          estimated_output_tokens?: number | null
          margin_pct?: number
          notes?: string | null
          updated_at?: string
        }
        Update: {
          action_type?: string
          estimated_gpu_seconds?: number | null
          estimated_input_tokens?: number | null
          estimated_output_tokens?: number | null
          margin_pct?: number
          notes?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      phase4b_visual_jobs: {
        Row: {
          completed_at: string | null
          created_at: string
          error: string | null
          id: string
          input_storage_path: string
          instructions: string | null
          is_mock: boolean
          operation_type: string
          output_storage_path: string | null
          requested_by: string | null
          review_notes: string | null
          review_status: string
          reviewed_at: string | null
          reviewed_by: string | null
          runpod_job_id: string | null
          runpod_status: string | null
          social_connection_id: string
          status: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          error?: string | null
          id?: string
          input_storage_path: string
          instructions?: string | null
          is_mock?: boolean
          operation_type: string
          output_storage_path?: string | null
          requested_by?: string | null
          review_notes?: string | null
          review_status?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          runpod_job_id?: string | null
          runpod_status?: string | null
          social_connection_id: string
          status?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          error?: string | null
          id?: string
          input_storage_path?: string
          instructions?: string | null
          is_mock?: boolean
          operation_type?: string
          output_storage_path?: string | null
          requested_by?: string | null
          review_notes?: string | null
          review_status?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          runpod_job_id?: string | null
          runpod_status?: string | null
          social_connection_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "phase4b_visual_jobs_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "phase4b_visual_jobs_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "phase4b_visual_jobs_social_connection_id_fkey"
            columns: ["social_connection_id"]
            isOneToOne: false
            referencedRelation: "social_connections"
            referencedColumns: ["id"]
          },
        ]
      }
      portfolio_media: {
        Row: {
          created_at: string
          description: string | null
          display_order: number | null
          embed_url: string | null
          id: string
          is_visible: boolean | null
          media_type: string
          media_url: string | null
          platform: string | null
          thumbnail_url: string | null
          title: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          display_order?: number | null
          embed_url?: string | null
          id?: string
          is_visible?: boolean | null
          media_type: string
          media_url?: string | null
          platform?: string | null
          thumbnail_url?: string | null
          title: string
        }
        Update: {
          created_at?: string
          description?: string | null
          display_order?: number | null
          embed_url?: string | null
          id?: string
          is_visible?: boolean | null
          media_type?: string
          media_url?: string | null
          platform?: string | null
          thumbnail_url?: string | null
          title?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          active_sessions: string[]
          company_name: string | null
          created_at: string
          current_role: string
          email: string
          full_name: string
          id: string
          phone: string
          roles: string[]
          status: string
          zernio_profile_id: string | null
        }
        Insert: {
          active_sessions?: string[]
          company_name?: string | null
          created_at?: string
          current_role?: string
          email: string
          full_name: string
          id: string
          phone: string
          roles?: string[]
          status?: string
          zernio_profile_id?: string | null
        }
        Update: {
          active_sessions?: string[]
          company_name?: string | null
          created_at?: string
          current_role?: string
          email?: string
          full_name?: string
          id?: string
          phone?: string
          roles?: string[]
          status?: string
          zernio_profile_id?: string | null
        }
        Relationships: []
      }
      publication_log: {
        Row: {
          detail: string | null
          event: string
          id: string
          occurred_at: string
          scheduled_publication_id: string
        }
        Insert: {
          detail?: string | null
          event: string
          id?: string
          occurred_at?: string
          scheduled_publication_id: string
        }
        Update: {
          detail?: string | null
          event?: string
          id?: string
          occurred_at?: string
          scheduled_publication_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "publication_log_scheduled_publication_id_fkey"
            columns: ["scheduled_publication_id"]
            isOneToOne: false
            referencedRelation: "scheduled_publications"
            referencedColumns: ["id"]
          },
        ]
      }
      scheduled_publications: {
        Row: {
          content_draft_id: string
          content_snapshot: Json
          created_at: string
          error: string | null
          id: string
          is_mock: boolean
          platform_post_id: string | null
          published_at: string | null
          scheduled_at: string
          social_connection_id: string
          status: string
        }
        Insert: {
          content_draft_id: string
          content_snapshot: Json
          created_at?: string
          error?: string | null
          id?: string
          is_mock?: boolean
          platform_post_id?: string | null
          published_at?: string | null
          scheduled_at: string
          social_connection_id: string
          status?: string
        }
        Update: {
          content_draft_id?: string
          content_snapshot?: Json
          created_at?: string
          error?: string | null
          id?: string
          is_mock?: boolean
          platform_post_id?: string | null
          published_at?: string | null
          scheduled_at?: string
          social_connection_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "scheduled_publications_content_draft_id_fkey"
            columns: ["content_draft_id"]
            isOneToOne: false
            referencedRelation: "content_drafts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scheduled_publications_social_connection_id_fkey"
            columns: ["social_connection_id"]
            isOneToOne: false
            referencedRelation: "social_connections"
            referencedColumns: ["id"]
          },
        ]
      }
      social_connections: {
        Row: {
          account_handle: string
          brand_brief: string | null
          client_profile_id: string | null
          connection_status: string
          created_at: string
          id: string
          platform: string
          updated_at: string
          zernio_account_id: string | null
        }
        Insert: {
          account_handle: string
          brand_brief?: string | null
          client_profile_id?: string | null
          connection_status?: string
          created_at?: string
          id?: string
          platform: string
          updated_at?: string
          zernio_account_id?: string | null
        }
        Update: {
          account_handle?: string
          brand_brief?: string | null
          client_profile_id?: string | null
          connection_status?: string
          created_at?: string
          id?: string
          platform?: string
          updated_at?: string
          zernio_account_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "social_connections_client_profile_id_fkey"
            columns: ["client_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      testimonials: {
        Row: {
          avatar_url: string | null
          client_company: string | null
          client_name: string
          client_role: string | null
          content: string
          created_at: string
          display_order: number | null
          id: string
          is_visible: boolean | null
          rating: number | null
        }
        Insert: {
          avatar_url?: string | null
          client_company?: string | null
          client_name: string
          client_role?: string | null
          content: string
          created_at?: string
          display_order?: number | null
          id?: string
          is_visible?: boolean | null
          rating?: number | null
        }
        Update: {
          avatar_url?: string | null
          client_company?: string | null
          client_name?: string
          client_role?: string | null
          content?: string
          created_at?: string
          display_order?: number | null
          id?: string
          is_visible?: boolean | null
          rating?: number | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_admin: { Args: never; Returns: boolean }
    }
    Enums: {
      [_ in never]: never
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
