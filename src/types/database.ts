import type {
  CurrencyCode,
  DistanceUnit,
  ExpenseStatus,
  FuelType,
  IncomeSourceKind,
  IntegritySeverity,
  Json,
  OccupancyCode,
  OcrStatus,
  AssistantConfidence,
  AssistantRecommendationStatus,
  AssistantSignalSource,
  OdometerReadingKind,
  OdometerSource,
  ReadingValidationStatus,
  RevisionSource,
  OwnershipType,
  ReportStatus,
  ReportingCadence,
} from '@/types/domain';

type Row = Record<string, unknown>;

export type Database = {
  public: {
    Tables: {
      countries: {
        Row: {
          code: string;
          name_i18n: Json;
          default_currency: CurrencyCode;
          default_distance_unit: DistanceUnit;
          is_active: boolean;
        };
        Insert: Partial<Database['public']['Tables']['countries']['Row']> & { code: string };
        Update: Partial<Database['public']['Tables']['countries']['Row']>;
      };
      jurisdictions: {
        Row: {
          id: string;
          country_code: string;
          parent_id: string | null;
          code: string;
          kind: string;
          name_i18n: Json;
          is_active: boolean;
        };
        Insert: Partial<Database['public']['Tables']['jurisdictions']['Row']> & {
          country_code: string;
          code: string;
          kind: string;
          name_i18n: Json;
        };
        Update: Partial<Database['public']['Tables']['jurisdictions']['Row']>;
      };
      tax_years: {
        Row: {
          id: string;
          country_code: string;
          year: number;
          starts_on: string;
          ends_on: string;
          is_current: boolean;
        };
        Insert: Partial<Database['public']['Tables']['tax_years']['Row']> & {
          country_code: string;
          year: number;
          starts_on: string;
          ends_on: string;
        };
        Update: Partial<Database['public']['Tables']['tax_years']['Row']>;
      };
      occupation_catalog: {
        Row: {
          id: string;
          country_code: string | null;
          code: OccupancyCode | string;
          name_i18n: Json;
          sort_order: number;
          is_active: boolean;
        };
        Insert: Row;
        Update: Row;
      };
      expense_category_catalog: {
        Row: {
          id: string;
          country_code: string;
          jurisdiction_id: string | null;
          tax_year_id: string | null;
          code: string;
          name_i18n: Json;
          description_i18n: Json | null;
          accountant_label_i18n: Json | null;
          sort_order: number;
          requires_receipt: boolean;
          requires_vehicle: boolean;
          is_active: boolean;
        };
        Insert: Row;
        Update: Row;
      };
      income_category_catalog: {
        Row: {
          id: string;
          country_code: string;
          jurisdiction_id: string | null;
          tax_year_id: string | null;
          code: string;
          name_i18n: Json;
          sort_order: number;
          is_active: boolean;
        };
        Insert: Row;
        Update: Row;
      };
      mileage_rate_methods: {
        Row: {
          id: string;
          country_code: string;
          jurisdiction_id: string | null;
          tax_year_id: string | null;
          method_code: string;
          title_i18n: Json;
          description_i18n: Json | null;
          source_name: string | null;
          source_url: string | null;
          is_available: boolean;
        };
        Insert: Row;
        Update: Row;
      };
      mileage_rate_tiers: {
        Row: {
          id: string;
          method_id: string;
          vehicle_class: string | null;
          min_distance: number | null;
          max_distance: number | null;
          rate_per_unit: number | null;
          distance_unit: DistanceUnit;
          notes_i18n: Json | null;
        };
        Insert: Row;
        Update: Row;
      };
      record_requirements: {
        Row: {
          id: string;
          country_code: string | null;
          jurisdiction_id: string | null;
          tax_year_id: string | null;
          entity_type: string;
          field_name: string;
          is_required: boolean;
          condition: Json | null;
          message_i18n: Json;
        };
        Insert: Row;
        Update: Row;
      };
      integrity_rule_definitions: {
        Row: {
          id: string;
          code: string;
          country_code: string | null;
          jurisdiction_id: string | null;
          tax_year_id: string | null;
          entity_type: string;
          severity: IntegritySeverity;
          title_i18n: Json;
          description_i18n: Json;
          is_active: boolean;
          config: Json | null;
        };
        Insert: Row;
        Update: Row;
      };
      report_section_templates: {
        Row: {
          id: string;
          country_code: string;
          jurisdiction_id: string | null;
          tax_year_id: string | null;
          code: string;
          title_i18n: Json;
          sort_order: number;
          include_entities: string[];
          notes_i18n: Json | null;
        };
        Insert: Row;
        Update: Row;
      };
      profiles: {
        Row: {
          id: string;
          full_name: string | null;
          phone: string | null;
          preferred_locale: string;
          country_code: string | null;
          jurisdiction_id: string | null;
          occupancy: string | null;
          default_distance_unit: DistanceUnit | null;
          default_currency: CurrencyCode | null;
          accountant_name: string | null;
          accountant_email: string | null;
          reporting_cadence: ReportingCadence | null;
          onboarding_completed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database['public']['Tables']['profiles']['Row']> & { id: string };
        Update: Partial<Database['public']['Tables']['profiles']['Row']>;
      };
      vehicles: {
        Row: {
          id: string;
          user_id: string;
          nickname: string;
          make: string | null;
          model: string | null;
          year: number | null;
          plate: string | null;
          vin: string | null;
          fuel_type: FuelType | string | null;
          ownership_type: OwnershipType | string | null;
          business_use_percent: number | null;
          distance_unit: DistanceUnit;
          current_odometer: number | null;
          is_active: boolean;
          acquired_on: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database['public']['Tables']['vehicles']['Row']> & {
          user_id: string;
          nickname: string;
        };
        Update: Partial<Database['public']['Tables']['vehicles']['Row']>;
      };
      odometer_readings: {
        Row: {
          id: string;
          user_id: string;
          vehicle_id: string;
          reading: number;
          unit: DistanceUnit;
          kind: OdometerReadingKind;
          recorded_on: string;
          recorded_at: string;
          photo_path: string | null;
          notes: string | null;
          is_valid: boolean;
          validation_status: ReadingValidationStatus;
          extracted_reading: number | null;
          ocr_status: OcrStatus | null;
          ocr_payload: Json | null;
          ocr_provider: string | null;
          ocr_confirmed_at: string | null;
          source: OdometerSource;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database['public']['Tables']['odometer_readings']['Row']> & {
          user_id: string;
          vehicle_id: string;
          reading: number;
          unit: DistanceUnit;
          kind: OdometerReadingKind;
          recorded_on: string;
        };
        Update: Partial<Database['public']['Tables']['odometer_readings']['Row']>;
      };
      odometer_reading_revisions: {
        Row: {
          id: string;
          reading_id: string;
          user_id: string;
          field_name: string;
          old_value: string | null;
          new_value: string | null;
          reason: string;
          source: RevisionSource;
          created_at: string;
        };
        Insert: Row;
        Update: Row;
      };
      distance_segments: {
        Row: {
          id: string;
          user_id: string;
          vehicle_id: string;
          start_reading_id: string;
          end_reading_id: string;
          distance: number;
          unit: DistanceUnit;
          started_on: string;
          ended_on: string;
          purpose: string;
          business_distance: number | null;
        };
        Insert: Row;
        Update: Row;
      };
      receipts: {
        Row: {
          id: string;
          user_id: string;
          storage_path: string;
          original_filename: string | null;
          mime_type: string | null;
          captured_at: string;
          ocr_status: OcrStatus;
          ocr_payload: Json | null;
          ocr_provider: string | null;
          review_status: 'pending' | 'reviewed' | 'discarded';
          reviewed_at: string | null;
        };
        Insert: Partial<Database['public']['Tables']['receipts']['Row']> & {
          user_id: string;
          storage_path: string;
        };
        Update: Partial<Database['public']['Tables']['receipts']['Row']>;
      };
      expenses: {
        Row: {
          id: string;
          user_id: string;
          vehicle_id: string | null;
          receipt_id: string | null;
          category_id: string | null;
          vendor_name: string | null;
          subtotal: number | null;
          amount: number;
          tax_amount: number | null;
          currency: string;
          incurred_on: string;
          incurred_time: string | null;
          fuel_quantity: number | null;
          price_per_unit: number | null;
          payment_method: string | null;
          reference_number: string | null;
          notes: string | null;
          status: ExpenseStatus;
          finalized_at: string | null;
          extracted_payload: Json | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database['public']['Tables']['expenses']['Row']> & {
          user_id: string;
          amount: number;
          incurred_on: string;
        };
        Update: Partial<Database['public']['Tables']['expenses']['Row']>;
      };
      expense_revisions: {
        Row: {
          id: string;
          expense_id: string;
          user_id: string;
          field_name: string;
          old_value: string | null;
          new_value: string | null;
          reason: string;
          source: RevisionSource;
          created_at: string;
        };
        Insert: Partial<Database['public']['Tables']['expense_revisions']['Row']> & {
          expense_id: string;
          user_id: string;
          field_name: string;
          reason: string;
          source: RevisionSource;
        };
        Update: Partial<Database['public']['Tables']['expense_revisions']['Row']>;
      };
      income_entries: {
        Row: {
          id: string;
          user_id: string;
          category_id: string | null;
          source_name: string;
          source_kind: IncomeSourceKind;
          amount: number;
          currency: string;
          received_on: string;
          reference_number: string | null;
          notes: string | null;
          document_path: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database['public']['Tables']['income_entries']['Row']> & {
          user_id: string;
          source_name: string;
          amount: number;
          received_on: string;
        };
        Update: Partial<Database['public']['Tables']['income_entries']['Row']>;
      };
      tax_reports: {
        Row: {
          id: string;
          user_id: string;
          tax_year_id: string;
          jurisdiction_id: string | null;
          status: ReportStatus;
          generated_at: string | null;
          package_path: string | null;
          summary: Json | null;
          disclaimer_version: string;
          created_at: string;
        };
        Insert: Row;
        Update: Row;
      };
      integrity_findings: {
        Row: {
          id: string;
          user_id: string;
          rule_id: string | null;
          rule_code: string;
          tax_year_id: string | null;
          entity_type: string;
          entity_id: string | null;
          severity: IntegritySeverity;
          title_i18n: Json;
          description_i18n: Json;
          is_resolved: boolean;
          details: Json | null;
          detected_at: string;
        };
        Insert: Row;
        Update: Row;
      };
      assistant_check_definitions: {
        Row: {
          id: string;
          code: string;
          entity_type: string;
          default_confidence: AssistantConfidence;
          title_i18n: Json;
          description_i18n: Json;
          is_active: boolean;
          config: Json | null;
        };
        Insert: Row;
        Update: Row;
      };
      assistant_runs: {
        Row: {
          id: string;
          user_id: string;
          provider: string;
          status: 'running' | 'complete' | 'failed';
          signal_count: number;
          notes_i18n: Json | null;
          created_at: string;
        };
        Insert: Partial<Database['public']['Tables']['assistant_runs']['Row']> & {
          user_id: string;
        };
        Update: Partial<Database['public']['Tables']['assistant_runs']['Row']>;
      };
      assistant_recommendations: {
        Row: {
          id: string;
          user_id: string;
          run_id: string | null;
          check_id: string | null;
          check_code: string;
          fingerprint: string;
          entity_type: string;
          entity_id: string | null;
          related_entity_id: string | null;
          confidence: AssistantConfidence;
          source: AssistantSignalSource;
          status: AssistantRecommendationStatus;
          title_i18n: Json;
          body_i18n: Json;
          evidence: Json;
          proposed_patch: Json | null;
          requires_review: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database['public']['Tables']['assistant_recommendations']['Row']> & {
          user_id: string;
          check_code: string;
          fingerprint: string;
          entity_type: string;
          confidence: AssistantConfidence;
          source: AssistantSignalSource;
          title_i18n: Json;
          body_i18n: Json;
        };
        Update: Partial<Database['public']['Tables']['assistant_recommendations']['Row']>;
      };
      assistant_review_events: {
        Row: {
          id: string;
          recommendation_id: string;
          user_id: string;
          action: 'opened' | 'dismissed' | 'confirmed' | 'applied' | 'obsolete';
          note: string | null;
          patch_applied: Json | null;
          created_at: string;
        };
        Insert: Partial<Database['public']['Tables']['assistant_review_events']['Row']> & {
          recommendation_id: string;
          user_id: string;
          action: 'opened' | 'dismissed' | 'confirmed' | 'applied' | 'obsolete';
        };
        Update: Partial<Database['public']['Tables']['assistant_review_events']['Row']>;
      };
      support_topics: {
        Row: {
          id: string;
          code: string;
          category: string;
          title_i18n: Json;
          body_i18n: Json;
          sort_order: number;
          is_active: boolean;
        };
        Insert: Row;
        Update: Row;
      };
      support_threads: {
        Row: {
          id: string;
          user_id: string;
          status: 'open' | 'claimed' | 'escalated' | 'resolved';
          assigned_agent_id: string | null;
          escalated_by: string | null;
          topic_id: string | null;
          last_message_at: string;
          created_at: string;
          updated_at: string;
        };
        Insert: Row;
        Update: Row;
      };
      support_messages: {
        Row: {
          id: string;
          thread_id: string;
          author_id: string;
          author_role: 'user' | 'agent' | 'admin';
          body: string;
          created_at: string;
        };
        Insert: Row;
        Update: Row;
      };
      landing_pages: {
        Row: {
          locale: string;
          content: Json;
          updated_at: string;
          updated_by: string | null;
        };
        Insert: Partial<Database['public']['Tables']['landing_pages']['Row']> & { locale: string; content: Json };
        Update: Partial<Database['public']['Tables']['landing_pages']['Row']>;
      };
      legal_pages: {
        Row: {
          locale: string;
          kind: string;
          content: Json;
          updated_at: string;
          updated_by: string | null;
        };
        Insert: Partial<Database['public']['Tables']['legal_pages']['Row']> & {
          locale: string;
          kind: string;
          content: Json;
        };
        Update: Partial<Database['public']['Tables']['legal_pages']['Row']>;
      };
    };
    Views: Record<string, never>;
    Functions: {
      rebuild_distance_segments: {
        Args: { p_vehicle_id: string };
        Returns: undefined;
      };
      is_staff: {
        Args: Record<string, never>;
        Returns: boolean;
      };
      admin_project_stats: {
        Args: Record<string, never>;
        Returns: Json;
      };
      admin_list_users: {
        Args: Record<string, never>;
        Returns: {
          id: string;
          email: string | null;
          full_name: string | null;
          country_code: string | null;
          created_at: string;
          onboarding_completed_at: string | null;
        }[];
      };
      is_agent: {
        Args: Record<string, never>;
        Returns: boolean;
      };
      is_support: {
        Args: Record<string, never>;
        Returns: boolean;
      };
      support_inbox: {
        Args: Record<string, never>;
        Returns: {
          id: string;
          user_id: string;
          user_email: string | null;
          user_name: string | null;
          status: string;
          assigned_agent_id: string | null;
          topic_id: string | null;
          last_message_at: string;
          created_at: string;
        }[];
      };
      admin_list_agents: {
        Args: Record<string, never>;
        Returns: {
          id: string;
          email: string | null;
          full_name: string | null;
          phone: string | null;
          created_at: string;
        }[];
      };
    };
    Enums: Record<string, never>;
  };
};

export type TableRow<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row'];
