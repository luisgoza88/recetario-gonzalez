// Tipos generados automaticamente desde Supabase (proyecto snyelpbcfbzaxadrtxpa).
// Regenerar con: supabase gen types (o MCP generate_typescript_types).
// NO editar a mano.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1";
  };
  public: {
    Tables: {
      adjustment_suggestions: {
        Row: {
          applied_at: string | null;
          change_percent: number | null;
          created_at: string | null;
          current_value: string | null;
          feedback_count: number | null;
          household_id: string | null;
          id: string;
          ingredient_name: string | null;
          item_id: string | null;
          reason: string;
          recipe_id: string | null;
          status: string | null;
          suggested_value: string | null;
          suggestion_type: string;
        };
        Insert: {
          applied_at?: string | null;
          change_percent?: number | null;
          created_at?: string | null;
          current_value?: string | null;
          feedback_count?: number | null;
          household_id?: string | null;
          id?: string;
          ingredient_name?: string | null;
          item_id?: string | null;
          reason: string;
          recipe_id?: string | null;
          status?: string | null;
          suggested_value?: string | null;
          suggestion_type: string;
        };
        Update: {
          applied_at?: string | null;
          change_percent?: number | null;
          created_at?: string | null;
          current_value?: string | null;
          feedback_count?: number | null;
          household_id?: string | null;
          id?: string;
          ingredient_name?: string | null;
          item_id?: string | null;
          reason?: string;
          recipe_id?: string | null;
          status?: string | null;
          suggested_value?: string | null;
          suggestion_type?: string;
        };
        Relationships: [
          {
            foreignKeyName: "adjustment_suggestions_household_id_fkey";
            columns: ["household_id"];
            isOneToOne: false;
            referencedRelation: "households";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "adjustment_suggestions_item_id_fkey";
            columns: ["item_id"];
            isOneToOne: false;
            referencedRelation: "market_items";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "adjustment_suggestions_recipe_id_fkey";
            columns: ["recipe_id"];
            isOneToOne: false;
            referencedRelation: "recipes";
            referencedColumns: ["id"];
          },
        ];
      };
      ai_action_queue: {
        Row: {
          actions: Json;
          approved_actions: string[] | null;
          audit_log_ids: string[] | null;
          conversation_id: string | null;
          created_at: string | null;
          decision_at: string | null;
          decision_by: string | null;
          decision_notes: string | null;
          execution_completed_at: string | null;
          execution_result: Json | null;
          execution_started_at: string | null;
          expires_at: string;
          household_id: string;
          id: string;
          proposal_id: string;
          records_affected: number | null;
          rejected_actions: string[] | null;
          risk_level: number;
          session_id: string;
          status: string;
          summary: string;
          tables_affected: string[] | null;
          updated_at: string | null;
          user_id: string | null;
        };
        Insert: {
          actions?: Json;
          approved_actions?: string[] | null;
          audit_log_ids?: string[] | null;
          conversation_id?: string | null;
          created_at?: string | null;
          decision_at?: string | null;
          decision_by?: string | null;
          decision_notes?: string | null;
          execution_completed_at?: string | null;
          execution_result?: Json | null;
          execution_started_at?: string | null;
          expires_at?: string;
          household_id: string;
          id?: string;
          proposal_id?: string;
          records_affected?: number | null;
          rejected_actions?: string[] | null;
          risk_level?: number;
          session_id: string;
          status?: string;
          summary: string;
          tables_affected?: string[] | null;
          updated_at?: string | null;
          user_id?: string | null;
        };
        Update: {
          actions?: Json;
          approved_actions?: string[] | null;
          audit_log_ids?: string[] | null;
          conversation_id?: string | null;
          created_at?: string | null;
          decision_at?: string | null;
          decision_by?: string | null;
          decision_notes?: string | null;
          execution_completed_at?: string | null;
          execution_result?: Json | null;
          execution_started_at?: string | null;
          expires_at?: string;
          household_id?: string;
          id?: string;
          proposal_id?: string;
          records_affected?: number | null;
          rejected_actions?: string[] | null;
          risk_level?: number;
          session_id?: string;
          status?: string;
          summary?: string;
          tables_affected?: string[] | null;
          updated_at?: string | null;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "ai_action_queue_household_id_fkey";
            columns: ["household_id"];
            isOneToOne: false;
            referencedRelation: "households";
            referencedColumns: ["id"];
          },
        ];
      };
      ai_audit_log: {
        Row: {
          action_type: string;
          affected_record_ids: string[] | null;
          affected_tables: string[] | null;
          confirmed_at: string | null;
          confirmed_by: string | null;
          conversation_id: string | null;
          created_at: string | null;
          error_message: string | null;
          executed_at: string | null;
          function_name: string;
          household_id: string;
          id: string;
          new_state: Json | null;
          parameters: Json | null;
          previous_state: Json | null;
          required_confirmation: boolean | null;
          result: Json | null;
          risk_level: number;
          rollback_reason: string | null;
          rolled_back_at: string | null;
          rolled_back_by: string | null;
          session_id: string;
          status: string;
          user_id: string | null;
        };
        Insert: {
          action_type: string;
          affected_record_ids?: string[] | null;
          affected_tables?: string[] | null;
          confirmed_at?: string | null;
          confirmed_by?: string | null;
          conversation_id?: string | null;
          created_at?: string | null;
          error_message?: string | null;
          executed_at?: string | null;
          function_name: string;
          household_id: string;
          id?: string;
          new_state?: Json | null;
          parameters?: Json | null;
          previous_state?: Json | null;
          required_confirmation?: boolean | null;
          result?: Json | null;
          risk_level?: number;
          rollback_reason?: string | null;
          rolled_back_at?: string | null;
          rolled_back_by?: string | null;
          session_id: string;
          status?: string;
          user_id?: string | null;
        };
        Update: {
          action_type?: string;
          affected_record_ids?: string[] | null;
          affected_tables?: string[] | null;
          confirmed_at?: string | null;
          confirmed_by?: string | null;
          conversation_id?: string | null;
          created_at?: string | null;
          error_message?: string | null;
          executed_at?: string | null;
          function_name?: string;
          household_id?: string;
          id?: string;
          new_state?: Json | null;
          parameters?: Json | null;
          previous_state?: Json | null;
          required_confirmation?: boolean | null;
          result?: Json | null;
          risk_level?: number;
          rollback_reason?: string | null;
          rolled_back_at?: string | null;
          rolled_back_by?: string | null;
          session_id?: string;
          status?: string;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "ai_audit_log_household_id_fkey";
            columns: ["household_id"];
            isOneToOne: false;
            referencedRelation: "households";
            referencedColumns: ["id"];
          },
        ];
      };
      ai_context: {
        Row: {
          context: Json | null;
          household_id: string | null;
          id: string;
          last_topic: string | null;
          session_id: string;
          updated_at: string | null;
          user_preferences: Json | null;
        };
        Insert: {
          context?: Json | null;
          household_id?: string | null;
          id?: string;
          last_topic?: string | null;
          session_id: string;
          updated_at?: string | null;
          user_preferences?: Json | null;
        };
        Update: {
          context?: Json | null;
          household_id?: string | null;
          id?: string;
          last_topic?: string | null;
          session_id?: string;
          updated_at?: string | null;
          user_preferences?: Json | null;
        };
        Relationships: [
          {
            foreignKeyName: "ai_context_household_id_fkey";
            columns: ["household_id"];
            isOneToOne: false;
            referencedRelation: "households";
            referencedColumns: ["id"];
          },
        ];
      };
      ai_conversations: {
        Row: {
          content: string;
          created_at: string | null;
          household_id: string | null;
          id: string;
          rich_content: Json | null;
          role: string;
          session_id: string;
          user_id: string | null;
        };
        Insert: {
          content: string;
          created_at?: string | null;
          household_id?: string | null;
          id?: string;
          rich_content?: Json | null;
          role: string;
          session_id: string;
          user_id?: string | null;
        };
        Update: {
          content?: string;
          created_at?: string | null;
          household_id?: string | null;
          id?: string;
          rich_content?: Json | null;
          role?: string;
          session_id?: string;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "ai_conversations_household_id_fkey";
            columns: ["household_id"];
            isOneToOne: false;
            referencedRelation: "households";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "ai_conversations_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      ai_function_registry: {
        Row: {
          category: string;
          created_at: string | null;
          description: string | null;
          description_es: string | null;
          function_name: string;
          id: string;
          is_enabled: boolean | null;
          is_reversible: boolean | null;
          rate_limit_per_minute: number | null;
          requires_confirmation: boolean | null;
          risk_level: number;
          should_log: boolean | null;
          updated_at: string | null;
        };
        Insert: {
          category: string;
          created_at?: string | null;
          description?: string | null;
          description_es?: string | null;
          function_name: string;
          id?: string;
          is_enabled?: boolean | null;
          is_reversible?: boolean | null;
          rate_limit_per_minute?: number | null;
          requires_confirmation?: boolean | null;
          risk_level?: number;
          should_log?: boolean | null;
          updated_at?: string | null;
        };
        Update: {
          category?: string;
          created_at?: string | null;
          description?: string | null;
          description_es?: string | null;
          function_name?: string;
          id?: string;
          is_enabled?: boolean | null;
          is_reversible?: boolean | null;
          rate_limit_per_minute?: number | null;
          requires_confirmation?: boolean | null;
          risk_level?: number;
          should_log?: boolean | null;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      budgets: {
        Row: {
          actual_spent: number | null;
          budget_amount: number;
          created_at: string | null;
          household_id: string | null;
          id: string;
          notes: string | null;
          period_end: string;
          period_start: string;
          period_type: string;
          updated_at: string | null;
        };
        Insert: {
          actual_spent?: number | null;
          budget_amount: number;
          created_at?: string | null;
          household_id?: string | null;
          id?: string;
          notes?: string | null;
          period_end: string;
          period_start: string;
          period_type: string;
          updated_at?: string | null;
        };
        Update: {
          actual_spent?: number | null;
          budget_amount?: number;
          created_at?: string | null;
          household_id?: string | null;
          id?: string;
          notes?: string | null;
          period_end?: string;
          period_start?: string;
          period_type?: string;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "budgets_household_id_fkey";
            columns: ["household_id"];
            isOneToOne: false;
            referencedRelation: "households";
            referencedColumns: ["id"];
          },
        ];
      };
      cleaning_history: {
        Row: {
          completed_at: string | null;
          employee_id: string | null;
          id: string;
          notes: string | null;
          rating: number | null;
          space_id: string | null;
          task_name: string | null;
        };
        Insert: {
          completed_at?: string | null;
          employee_id?: string | null;
          id?: string;
          notes?: string | null;
          rating?: number | null;
          space_id?: string | null;
          task_name?: string | null;
        };
        Update: {
          completed_at?: string | null;
          employee_id?: string | null;
          id?: string;
          notes?: string | null;
          rating?: number | null;
          space_id?: string | null;
          task_name?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "cleaning_history_employee_id_fkey";
            columns: ["employee_id"];
            isOneToOne: false;
            referencedRelation: "home_employees";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "cleaning_history_employee_id_fkey";
            columns: ["employee_id"];
            isOneToOne: false;
            referencedRelation: "today_tasks_summary";
            referencedColumns: ["employee_id"];
          },
          {
            foreignKeyName: "cleaning_history_space_id_fkey";
            columns: ["space_id"];
            isOneToOne: false;
            referencedRelation: "spaces";
            referencedColumns: ["id"];
          },
        ];
      };
      cleaning_supplies: {
        Row: {
          category: string;
          created_at: string | null;
          current_quantity: number | null;
          household_id: string;
          id: string;
          last_restocked: string | null;
          min_quantity: number | null;
          name: string;
          notes: string | null;
          unit: string;
          updated_at: string | null;
        };
        Insert: {
          category?: string;
          created_at?: string | null;
          current_quantity?: number | null;
          household_id: string;
          id?: string;
          last_restocked?: string | null;
          min_quantity?: number | null;
          name: string;
          notes?: string | null;
          unit?: string;
          updated_at?: string | null;
        };
        Update: {
          category?: string;
          created_at?: string | null;
          current_quantity?: number | null;
          household_id?: string;
          id?: string;
          last_restocked?: string | null;
          min_quantity?: number | null;
          name?: string;
          notes?: string | null;
          unit?: string;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "cleaning_supplies_household_id_fkey";
            columns: ["household_id"];
            isOneToOne: false;
            referencedRelation: "households";
            referencedColumns: ["id"];
          },
        ];
      };
      completed_days: {
        Row: {
          completed: boolean | null;
          created_at: string | null;
          date: string;
          id: string;
        };
        Insert: {
          completed?: boolean | null;
          created_at?: string | null;
          date: string;
          id?: string;
        };
        Update: {
          completed?: boolean | null;
          created_at?: string | null;
          date?: string;
          id?: string;
        };
        Relationships: [];
      };
      daily_completions: {
        Row: {
          completed_at: string | null;
          completion_date: string;
          created_at: string | null;
          employee_id: string | null;
          household_id: string | null;
          id: string;
          meals_completed: Json | null;
          notes: string | null;
          photo_urls: string[] | null;
          preparations_completed: string[] | null;
          started_at: string | null;
          tasks_completed: string[] | null;
        };
        Insert: {
          completed_at?: string | null;
          completion_date: string;
          created_at?: string | null;
          employee_id?: string | null;
          household_id?: string | null;
          id?: string;
          meals_completed?: Json | null;
          notes?: string | null;
          photo_urls?: string[] | null;
          preparations_completed?: string[] | null;
          started_at?: string | null;
          tasks_completed?: string[] | null;
        };
        Update: {
          completed_at?: string | null;
          completion_date?: string;
          created_at?: string | null;
          employee_id?: string | null;
          household_id?: string | null;
          id?: string;
          meals_completed?: Json | null;
          notes?: string | null;
          photo_urls?: string[] | null;
          preparations_completed?: string[] | null;
          started_at?: string | null;
          tasks_completed?: string[] | null;
        };
        Relationships: [
          {
            foreignKeyName: "daily_completions_household_id_fkey";
            columns: ["household_id"];
            isOneToOne: false;
            referencedRelation: "households";
            referencedColumns: ["id"];
          },
        ];
      };
      daily_task_instances: {
        Row: {
          category: string;
          category_id: string | null;
          completed_at: string | null;
          created_at: string | null;
          date: string;
          employee_id: string | null;
          household_id: string | null;
          id: string;
          is_special: boolean | null;
          notes: string | null;
          started_at: string | null;
          status: string;
          task_name: string;
          template_id: string | null;
          time_end: string;
          time_start: string;
        };
        Insert: {
          category: string;
          category_id?: string | null;
          completed_at?: string | null;
          created_at?: string | null;
          date: string;
          employee_id?: string | null;
          household_id?: string | null;
          id?: string;
          is_special?: boolean | null;
          notes?: string | null;
          started_at?: string | null;
          status?: string;
          task_name: string;
          template_id?: string | null;
          time_end: string;
          time_start: string;
        };
        Update: {
          category?: string;
          category_id?: string | null;
          completed_at?: string | null;
          created_at?: string | null;
          date?: string;
          employee_id?: string | null;
          household_id?: string | null;
          id?: string;
          is_special?: boolean | null;
          notes?: string | null;
          started_at?: string | null;
          status?: string;
          task_name?: string;
          template_id?: string | null;
          time_end?: string;
          time_start?: string;
        };
        Relationships: [
          {
            foreignKeyName: "daily_task_instances_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "task_categories";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "daily_task_instances_employee_id_fkey";
            columns: ["employee_id"];
            isOneToOne: false;
            referencedRelation: "employees";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "daily_task_instances_template_id_fkey";
            columns: ["template_id"];
            isOneToOne: false;
            referencedRelation: "schedule_templates";
            referencedColumns: ["id"];
          },
        ];
      };
      day_menu: {
        Row: {
          breakfast_id: string;
          created_at: string | null;
          day_number: number;
          dinner_id: string | null;
          household_id: string | null;
          id: string;
          lunch_id: string;
          reminder: string | null;
          updated_at: string | null;
        };
        Insert: {
          breakfast_id: string;
          created_at?: string | null;
          day_number: number;
          dinner_id?: string | null;
          household_id?: string | null;
          id?: string;
          lunch_id: string;
          reminder?: string | null;
          updated_at?: string | null;
        };
        Update: {
          breakfast_id?: string;
          created_at?: string | null;
          day_number?: number;
          dinner_id?: string | null;
          household_id?: string | null;
          id?: string;
          lunch_id?: string;
          reminder?: string | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "day_menu_breakfast_id_fkey";
            columns: ["breakfast_id"];
            isOneToOne: false;
            referencedRelation: "recipes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "day_menu_dinner_id_fkey";
            columns: ["dinner_id"];
            isOneToOne: false;
            referencedRelation: "recipes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "day_menu_household_id_fkey";
            columns: ["household_id"];
            isOneToOne: false;
            referencedRelation: "households";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "day_menu_lunch_id_fkey";
            columns: ["lunch_id"];
            isOneToOne: false;
            referencedRelation: "recipes";
            referencedColumns: ["id"];
          },
        ];
      };
      employee_checkins: {
        Row: {
          check_in_time: string;
          check_out_time: string | null;
          created_at: string | null;
          date: string;
          employee_id: string;
          household_id: string;
          id: string;
          notes: string | null;
          total_hours: number | null;
        };
        Insert: {
          check_in_time: string;
          check_out_time?: string | null;
          created_at?: string | null;
          date: string;
          employee_id: string;
          household_id: string;
          id?: string;
          notes?: string | null;
          total_hours?: number | null;
        };
        Update: {
          check_in_time?: string;
          check_out_time?: string | null;
          created_at?: string | null;
          date?: string;
          employee_id?: string;
          household_id?: string;
          id?: string;
          notes?: string | null;
          total_hours?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "employee_checkins_employee_id_fkey";
            columns: ["employee_id"];
            isOneToOne: false;
            referencedRelation: "home_employees";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "employee_checkins_employee_id_fkey";
            columns: ["employee_id"];
            isOneToOne: false;
            referencedRelation: "today_tasks_summary";
            referencedColumns: ["employee_id"];
          },
          {
            foreignKeyName: "employee_checkins_household_id_fkey";
            columns: ["household_id"];
            isOneToOne: false;
            referencedRelation: "households";
            referencedColumns: ["id"];
          },
        ];
      };
      employee_performance_scores: {
        Row: {
          avg_rating: number | null;
          consistency_score: number | null;
          created_at: string | null;
          employee_id: string;
          id: string;
          last_computed_at: string | null;
          overall_score: number;
          reliability_score: number | null;
          speed_score: number | null;
          total_minutes_worked: number | null;
          total_tasks_completed: number | null;
          updated_at: string | null;
        };
        Insert: {
          avg_rating?: number | null;
          consistency_score?: number | null;
          created_at?: string | null;
          employee_id: string;
          id?: string;
          last_computed_at?: string | null;
          overall_score?: number;
          reliability_score?: number | null;
          speed_score?: number | null;
          total_minutes_worked?: number | null;
          total_tasks_completed?: number | null;
          updated_at?: string | null;
        };
        Update: {
          avg_rating?: number | null;
          consistency_score?: number | null;
          created_at?: string | null;
          employee_id?: string;
          id?: string;
          last_computed_at?: string | null;
          overall_score?: number;
          reliability_score?: number | null;
          speed_score?: number | null;
          total_minutes_worked?: number | null;
          total_tasks_completed?: number | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "employee_performance_scores_employee_id_fkey";
            columns: ["employee_id"];
            isOneToOne: true;
            referencedRelation: "home_employees";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "employee_performance_scores_employee_id_fkey";
            columns: ["employee_id"];
            isOneToOne: true;
            referencedRelation: "today_tasks_summary";
            referencedColumns: ["employee_id"];
          },
        ];
      };
      employee_space_assignments: {
        Row: {
          can_substitute: boolean | null;
          created_at: string | null;
          employee_id: string;
          id: string;
          is_primary: boolean | null;
          notes: string | null;
          priority_order: number | null;
          space_id: string;
          updated_at: string | null;
        };
        Insert: {
          can_substitute?: boolean | null;
          created_at?: string | null;
          employee_id: string;
          id?: string;
          is_primary?: boolean | null;
          notes?: string | null;
          priority_order?: number | null;
          space_id: string;
          updated_at?: string | null;
        };
        Update: {
          can_substitute?: boolean | null;
          created_at?: string | null;
          employee_id?: string;
          id?: string;
          is_primary?: boolean | null;
          notes?: string | null;
          priority_order?: number | null;
          space_id?: string;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "employee_space_assignments_employee_id_fkey";
            columns: ["employee_id"];
            isOneToOne: false;
            referencedRelation: "home_employees";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "employee_space_assignments_employee_id_fkey";
            columns: ["employee_id"];
            isOneToOne: false;
            referencedRelation: "today_tasks_summary";
            referencedColumns: ["employee_id"];
          },
          {
            foreignKeyName: "employee_space_assignments_space_id_fkey";
            columns: ["space_id"];
            isOneToOne: false;
            referencedRelation: "spaces";
            referencedColumns: ["id"];
          },
        ];
      };
      employees: {
        Row: {
          active: boolean | null;
          created_at: string | null;
          email: string | null;
          household_id: string | null;
          id: string;
          name: string;
          phone: string | null;
          updated_at: string | null;
          work_days: number[] | null;
          zone: string;
        };
        Insert: {
          active?: boolean | null;
          created_at?: string | null;
          email?: string | null;
          household_id?: string | null;
          id?: string;
          name: string;
          phone?: string | null;
          updated_at?: string | null;
          work_days?: number[] | null;
          zone: string;
        };
        Update: {
          active?: boolean | null;
          created_at?: string | null;
          email?: string | null;
          household_id?: string | null;
          id?: string;
          name?: string;
          phone?: string | null;
          updated_at?: string | null;
          work_days?: number[] | null;
          zone?: string;
        };
        Relationships: [
          {
            foreignKeyName: "employees_household_id_fkey";
            columns: ["household_id"];
            isOneToOne: false;
            referencedRelation: "households";
            referencedColumns: ["id"];
          },
        ];
      };
      generated_menus: {
        Row: {
          approved_at: string | null;
          approved_by: string | null;
          created_at: string | null;
          feedback_summary: Json | null;
          generated_by: string | null;
          household_id: string | null;
          id: string;
          menu_data: Json;
          status: string | null;
          updated_at: string | null;
          week_start_date: string;
        };
        Insert: {
          approved_at?: string | null;
          approved_by?: string | null;
          created_at?: string | null;
          feedback_summary?: Json | null;
          generated_by?: string | null;
          household_id?: string | null;
          id?: string;
          menu_data: Json;
          status?: string | null;
          updated_at?: string | null;
          week_start_date: string;
        };
        Update: {
          approved_at?: string | null;
          approved_by?: string | null;
          created_at?: string | null;
          feedback_summary?: Json | null;
          generated_by?: string | null;
          household_id?: string | null;
          id?: string;
          menu_data?: Json;
          status?: string | null;
          updated_at?: string | null;
          week_start_date?: string;
        };
        Relationships: [
          {
            foreignKeyName: "generated_menus_household_id_fkey";
            columns: ["household_id"];
            isOneToOne: false;
            referencedRelation: "households";
            referencedColumns: ["id"];
          },
        ];
      };
      home_employees: {
        Row: {
          active: boolean | null;
          created_at: string | null;
          hours_per_day: number | null;
          household_id: string | null;
          id: string;
          name: string;
          notes: string | null;
          phone: string | null;
          role: string | null;
          work_days: Json | null;
          zone: string | null;
        };
        Insert: {
          active?: boolean | null;
          created_at?: string | null;
          hours_per_day?: number | null;
          household_id?: string | null;
          id?: string;
          name: string;
          notes?: string | null;
          phone?: string | null;
          role?: string | null;
          work_days?: Json | null;
          zone?: string | null;
        };
        Update: {
          active?: boolean | null;
          created_at?: string | null;
          hours_per_day?: number | null;
          household_id?: string | null;
          id?: string;
          name?: string;
          notes?: string | null;
          phone?: string | null;
          role?: string | null;
          work_days?: Json | null;
          zone?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "home_employees_household_id_fkey";
            columns: ["household_id"];
            isOneToOne: false;
            referencedRelation: "households";
            referencedColumns: ["id"];
          },
        ];
      };
      household_ai_trust: {
        Row: {
          allow_bulk_operations: boolean | null;
          allow_destructive_actions: boolean | null;
          auto_approve_level: number | null;
          created_at: string | null;
          failed_actions: number | null;
          household_id: string;
          id: string;
          incident_count: number | null;
          last_incident_at: string | null;
          max_actions_per_minute: number | null;
          max_critical_actions_per_day: number | null;
          max_items_per_bulk_operation: number | null;
          require_confirmation_always: boolean | null;
          rolled_back_actions: number | null;
          successful_actions: number | null;
          trust_level: number;
          updated_at: string | null;
        };
        Insert: {
          allow_bulk_operations?: boolean | null;
          allow_destructive_actions?: boolean | null;
          auto_approve_level?: number | null;
          created_at?: string | null;
          failed_actions?: number | null;
          household_id: string;
          id?: string;
          incident_count?: number | null;
          last_incident_at?: string | null;
          max_actions_per_minute?: number | null;
          max_critical_actions_per_day?: number | null;
          max_items_per_bulk_operation?: number | null;
          require_confirmation_always?: boolean | null;
          rolled_back_actions?: number | null;
          successful_actions?: number | null;
          trust_level?: number;
          updated_at?: string | null;
        };
        Update: {
          allow_bulk_operations?: boolean | null;
          allow_destructive_actions?: boolean | null;
          auto_approve_level?: number | null;
          created_at?: string | null;
          failed_actions?: number | null;
          household_id?: string;
          id?: string;
          incident_count?: number | null;
          last_incident_at?: string | null;
          max_actions_per_minute?: number | null;
          max_critical_actions_per_day?: number | null;
          max_items_per_bulk_operation?: number | null;
          require_confirmation_always?: boolean | null;
          rolled_back_actions?: number | null;
          successful_actions?: number | null;
          trust_level?: number;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "household_ai_trust_household_id_fkey";
            columns: ["household_id"];
            isOneToOne: true;
            referencedRelation: "households";
            referencedColumns: ["id"];
          },
        ];
      };
      household_invitations: {
        Row: {
          accepted_at: string | null;
          code: string | null;
          created_at: string | null;
          current_uses: number | null;
          email: string;
          expires_at: string;
          household_id: string | null;
          id: string;
          invited_by: string | null;
          max_uses: number | null;
          role: string | null;
          suggested_name: string | null;
          token: string;
          used_at: string | null;
        };
        Insert: {
          accepted_at?: string | null;
          code?: string | null;
          created_at?: string | null;
          current_uses?: number | null;
          email: string;
          expires_at: string;
          household_id?: string | null;
          id?: string;
          invited_by?: string | null;
          max_uses?: number | null;
          role?: string | null;
          suggested_name?: string | null;
          token: string;
          used_at?: string | null;
        };
        Update: {
          accepted_at?: string | null;
          code?: string | null;
          created_at?: string | null;
          current_uses?: number | null;
          email?: string;
          expires_at?: string;
          household_id?: string | null;
          id?: string;
          invited_by?: string | null;
          max_uses?: number | null;
          role?: string | null;
          suggested_name?: string | null;
          token?: string;
          used_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "household_invitations_household_id_fkey";
            columns: ["household_id"];
            isOneToOne: false;
            referencedRelation: "households";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "household_invitations_invited_by_fkey";
            columns: ["invited_by"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      household_memberships: {
        Row: {
          created_at: string | null;
          display_name: string | null;
          household_id: string | null;
          id: string;
          invited_by: string | null;
          is_active: boolean | null;
          joined_at: string | null;
          permissions: Json | null;
          role: string;
          updated_at: string | null;
          user_id: string | null;
        };
        Insert: {
          created_at?: string | null;
          display_name?: string | null;
          household_id?: string | null;
          id?: string;
          invited_by?: string | null;
          is_active?: boolean | null;
          joined_at?: string | null;
          permissions?: Json | null;
          role?: string;
          updated_at?: string | null;
          user_id?: string | null;
        };
        Update: {
          created_at?: string | null;
          display_name?: string | null;
          household_id?: string | null;
          id?: string;
          invited_by?: string | null;
          is_active?: boolean | null;
          joined_at?: string | null;
          permissions?: Json | null;
          role?: string;
          updated_at?: string | null;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "household_memberships_household_id_fkey";
            columns: ["household_id"];
            isOneToOne: false;
            referencedRelation: "households";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "household_memberships_invited_by_fkey";
            columns: ["invited_by"];
            isOneToOne: false;
            referencedRelation: "user_profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "household_memberships_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "user_profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      household_mood_history: {
        Row: {
          created_at: string | null;
          day_of_week: number | null;
          feedback_score: number | null;
          household_id: string | null;
          id: string;
          meal_type: string | null;
          mood: string;
          recipe_id: string | null;
        };
        Insert: {
          created_at?: string | null;
          day_of_week?: number | null;
          feedback_score?: number | null;
          household_id?: string | null;
          id?: string;
          meal_type?: string | null;
          mood: string;
          recipe_id?: string | null;
        };
        Update: {
          created_at?: string | null;
          day_of_week?: number | null;
          feedback_score?: number | null;
          household_id?: string | null;
          id?: string;
          meal_type?: string | null;
          mood?: string;
          recipe_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "household_mood_history_household_id_fkey";
            columns: ["household_id"];
            isOneToOne: false;
            referencedRelation: "households";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "household_mood_history_recipe_id_fkey";
            columns: ["recipe_id"];
            isOneToOne: false;
            referencedRelation: "recipes";
            referencedColumns: ["id"];
          },
        ];
      };
      households: {
        Row: {
          address: string | null;
          cooking_profile: Json | null;
          created_at: string | null;
          currency: string | null;
          dietary_preferences: Json | null;
          features: Json | null;
          id: string;
          language: string | null;
          max_employees: number | null;
          max_recipes: number | null;
          max_users: number | null;
          name: string;
          owner_name: string | null;
          plan: string | null;
          plan_expires_at: string | null;
          settings: Json | null;
          setup_completed: boolean | null;
          slug: string | null;
          timezone: string | null;
          updated_at: string | null;
        };
        Insert: {
          address?: string | null;
          cooking_profile?: Json | null;
          created_at?: string | null;
          currency?: string | null;
          dietary_preferences?: Json | null;
          features?: Json | null;
          id?: string;
          language?: string | null;
          max_employees?: number | null;
          max_recipes?: number | null;
          max_users?: number | null;
          name: string;
          owner_name?: string | null;
          plan?: string | null;
          plan_expires_at?: string | null;
          settings?: Json | null;
          setup_completed?: boolean | null;
          slug?: string | null;
          timezone?: string | null;
          updated_at?: string | null;
        };
        Update: {
          address?: string | null;
          cooking_profile?: Json | null;
          created_at?: string | null;
          currency?: string | null;
          dietary_preferences?: Json | null;
          features?: Json | null;
          id?: string;
          language?: string | null;
          max_employees?: number | null;
          max_recipes?: number | null;
          max_users?: number | null;
          name?: string;
          owner_name?: string | null;
          plan?: string | null;
          plan_expires_at?: string | null;
          settings?: Json | null;
          setup_completed?: boolean | null;
          slug?: string | null;
          timezone?: string | null;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      image_library: {
        Row: {
          category: string;
          created_at: string | null;
          cuisine_type: string;
          description_en: string;
          id: string;
          image_url: string;
          key_ingredients: string[] | null;
          main_protein: string | null;
          name_en: string;
          name_es: string;
          tags: string[];
          updated_at: string | null;
          usage_count: number | null;
        };
        Insert: {
          category: string;
          created_at?: string | null;
          cuisine_type?: string;
          description_en: string;
          id?: string;
          image_url: string;
          key_ingredients?: string[] | null;
          main_protein?: string | null;
          name_en: string;
          name_es: string;
          tags?: string[];
          updated_at?: string | null;
          usage_count?: number | null;
        };
        Update: {
          category?: string;
          created_at?: string | null;
          cuisine_type?: string;
          description_en?: string;
          id?: string;
          image_url?: string;
          key_ingredients?: string[] | null;
          main_protein?: string | null;
          name_en?: string;
          name_es?: string;
          tags?: string[];
          updated_at?: string | null;
          usage_count?: number | null;
        };
        Relationships: [];
      };
      ingredient_aliases: {
        Row: {
          alias: string;
          created_at: string | null;
          household_id: string | null;
          id: string;
          is_global: boolean | null;
          market_item_id: string | null;
        };
        Insert: {
          alias: string;
          created_at?: string | null;
          household_id?: string | null;
          id?: string;
          is_global?: boolean | null;
          market_item_id?: string | null;
        };
        Update: {
          alias?: string;
          created_at?: string | null;
          household_id?: string | null;
          id?: string;
          is_global?: boolean | null;
          market_item_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "ingredient_aliases_household_id_fkey";
            columns: ["household_id"];
            isOneToOne: false;
            referencedRelation: "households";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "ingredient_aliases_market_item_id_fkey";
            columns: ["market_item_id"];
            isOneToOne: false;
            referencedRelation: "market_items";
            referencedColumns: ["id"];
          },
        ];
      };
      ingredient_categories: {
        Row: {
          ai_description: string | null;
          color: string | null;
          icon: string | null;
          id: string;
          name: string;
          name_es: string;
          sort_order: number | null;
        };
        Insert: {
          ai_description?: string | null;
          color?: string | null;
          icon?: string | null;
          id: string;
          name: string;
          name_es: string;
          sort_order?: number | null;
        };
        Update: {
          ai_description?: string | null;
          color?: string | null;
          icon?: string | null;
          id?: string;
          name?: string;
          name_es?: string;
          sort_order?: number | null;
        };
        Relationships: [];
      };
      inspection_reports: {
        Row: {
          checklist: Json;
          created_at: string | null;
          employee_id: string | null;
          general_notes: string | null;
          household_id: string;
          id: string;
          inspected_at: string | null;
          issues_found: number | null;
          passed: boolean | null;
          photos: string[] | null;
          space_id: string;
          task_id: string | null;
        };
        Insert: {
          checklist: Json;
          created_at?: string | null;
          employee_id?: string | null;
          general_notes?: string | null;
          household_id: string;
          id?: string;
          inspected_at?: string | null;
          issues_found?: number | null;
          passed?: boolean | null;
          photos?: string[] | null;
          space_id: string;
          task_id?: string | null;
        };
        Update: {
          checklist?: Json;
          created_at?: string | null;
          employee_id?: string | null;
          general_notes?: string | null;
          household_id?: string;
          id?: string;
          inspected_at?: string | null;
          issues_found?: number | null;
          passed?: boolean | null;
          photos?: string[] | null;
          space_id?: string;
          task_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "inspection_reports_employee_id_fkey";
            columns: ["employee_id"];
            isOneToOne: false;
            referencedRelation: "home_employees";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "inspection_reports_employee_id_fkey";
            columns: ["employee_id"];
            isOneToOne: false;
            referencedRelation: "today_tasks_summary";
            referencedColumns: ["employee_id"];
          },
          {
            foreignKeyName: "inspection_reports_household_id_fkey";
            columns: ["household_id"];
            isOneToOne: false;
            referencedRelation: "households";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "inspection_reports_space_id_fkey";
            columns: ["space_id"];
            isOneToOne: false;
            referencedRelation: "spaces";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "inspection_reports_task_id_fkey";
            columns: ["task_id"];
            isOneToOne: false;
            referencedRelation: "scheduled_tasks";
            referencedColumns: ["id"];
          },
        ];
      };
      inventory: {
        Row: {
          current_number: number | null;
          current_quantity: string;
          household_id: string | null;
          id: string;
          item_id: string;
          last_updated: string | null;
          notes: string | null;
        };
        Insert: {
          current_number?: number | null;
          current_quantity?: string;
          household_id?: string | null;
          id?: string;
          item_id: string;
          last_updated?: string | null;
          notes?: string | null;
        };
        Update: {
          current_number?: number | null;
          current_quantity?: string;
          household_id?: string | null;
          id?: string;
          item_id?: string;
          last_updated?: string | null;
          notes?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "inventory_household_id_fkey";
            columns: ["household_id"];
            isOneToOne: false;
            referencedRelation: "households";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "inventory_item_id_fkey";
            columns: ["item_id"];
            isOneToOne: true;
            referencedRelation: "market_items";
            referencedColumns: ["id"];
          },
        ];
      };
      learned_task_durations: {
        Row: {
          confidence: string | null;
          created_at: string | null;
          estimated_minutes: number;
          id: string;
          last_computed_at: string | null;
          learned_minutes: number;
          sample_count: number;
          space_id: string;
          task_template_id: string;
          updated_at: string | null;
        };
        Insert: {
          confidence?: string | null;
          created_at?: string | null;
          estimated_minutes?: number;
          id?: string;
          last_computed_at?: string | null;
          learned_minutes?: number;
          sample_count?: number;
          space_id: string;
          task_template_id: string;
          updated_at?: string | null;
        };
        Update: {
          confidence?: string | null;
          created_at?: string | null;
          estimated_minutes?: number;
          id?: string;
          last_computed_at?: string | null;
          learned_minutes?: number;
          sample_count?: number;
          space_id?: string;
          task_template_id?: string;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "learned_task_durations_space_id_fkey";
            columns: ["space_id"];
            isOneToOne: false;
            referencedRelation: "spaces";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "learned_task_durations_task_template_id_fkey";
            columns: ["task_template_id"];
            isOneToOne: false;
            referencedRelation: "task_templates";
            referencedColumns: ["id"];
          },
        ];
      };
      market_checklist: {
        Row: {
          checked: boolean | null;
          checked_at: string | null;
          household_id: string | null;
          id: string;
          item_id: string;
        };
        Insert: {
          checked?: boolean | null;
          checked_at?: string | null;
          household_id?: string | null;
          id?: string;
          item_id: string;
        };
        Update: {
          checked?: boolean | null;
          checked_at?: string | null;
          household_id?: string | null;
          id?: string;
          item_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "market_checklist_household_id_fkey";
            columns: ["household_id"];
            isOneToOne: false;
            referencedRelation: "households";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "market_checklist_item_id_fkey";
            columns: ["item_id"];
            isOneToOne: true;
            referencedRelation: "market_items";
            referencedColumns: ["id"];
          },
        ];
      };
      market_items: {
        Row: {
          ai_tags: string[] | null;
          avg_price: number | null;
          category: string;
          category_id: string | null;
          created_at: string | null;
          estimated_price: number | null;
          household_id: string | null;
          id: string;
          is_custom: boolean | null;
          is_global: boolean | null;
          last_price_update: string | null;
          last_purchase_date: string | null;
          name: string;
          order_index: number;
          preferred_store: string | null;
          price_unit: string | null;
          purchase_frequency_days: number | null;
          quantity: string;
          unit: string | null;
        };
        Insert: {
          ai_tags?: string[] | null;
          avg_price?: number | null;
          category: string;
          category_id?: string | null;
          created_at?: string | null;
          estimated_price?: number | null;
          household_id?: string | null;
          id: string;
          is_custom?: boolean | null;
          is_global?: boolean | null;
          last_price_update?: string | null;
          last_purchase_date?: string | null;
          name: string;
          order_index: number;
          preferred_store?: string | null;
          price_unit?: string | null;
          purchase_frequency_days?: number | null;
          quantity: string;
          unit?: string | null;
        };
        Update: {
          ai_tags?: string[] | null;
          avg_price?: number | null;
          category?: string;
          category_id?: string | null;
          created_at?: string | null;
          estimated_price?: number | null;
          household_id?: string | null;
          id?: string;
          is_custom?: boolean | null;
          is_global?: boolean | null;
          last_price_update?: string | null;
          last_purchase_date?: string | null;
          name?: string;
          order_index?: number;
          preferred_store?: string | null;
          price_unit?: string | null;
          purchase_frequency_days?: number | null;
          quantity?: string;
          unit?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "market_items_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "ingredient_categories";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "market_items_household_id_fkey";
            columns: ["household_id"];
            isOneToOne: false;
            referencedRelation: "households";
            referencedColumns: ["id"];
          },
        ];
      };
      meal_feedback: {
        Row: {
          created_at: string | null;
          date: string;
          household_id: string | null;
          id: string;
          leftover_rating: string | null;
          meal_type: string;
          missing_ingredients: string[] | null;
          notes: string | null;
          portion_rating: string | null;
          recipe_id: string;
          source: string | null;
          star_rating: number | null;
          used_up_ingredients: string[] | null;
          user_id: string | null;
          would_repeat: boolean | null;
        };
        Insert: {
          created_at?: string | null;
          date: string;
          household_id?: string | null;
          id?: string;
          leftover_rating?: string | null;
          meal_type: string;
          missing_ingredients?: string[] | null;
          notes?: string | null;
          portion_rating?: string | null;
          recipe_id: string;
          source?: string | null;
          star_rating?: number | null;
          used_up_ingredients?: string[] | null;
          user_id?: string | null;
          would_repeat?: boolean | null;
        };
        Update: {
          created_at?: string | null;
          date?: string;
          household_id?: string | null;
          id?: string;
          leftover_rating?: string | null;
          meal_type?: string;
          missing_ingredients?: string[] | null;
          notes?: string | null;
          portion_rating?: string | null;
          recipe_id?: string;
          source?: string | null;
          star_rating?: number | null;
          used_up_ingredients?: string[] | null;
          user_id?: string | null;
          would_repeat?: boolean | null;
        };
        Relationships: [
          {
            foreignKeyName: "meal_feedback_household_id_fkey";
            columns: ["household_id"];
            isOneToOne: false;
            referencedRelation: "households";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "meal_feedback_recipe_id_fkey";
            columns: ["recipe_id"];
            isOneToOne: false;
            referencedRelation: "recipes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "meal_feedback_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      preparations: {
        Row: {
          created_at: string | null;
          description: string | null;
          household_id: string | null;
          id: string;
          ingredients: Json;
          is_global: boolean | null;
          name: string;
        };
        Insert: {
          created_at?: string | null;
          description?: string | null;
          household_id?: string | null;
          id: string;
          ingredients?: Json;
          is_global?: boolean | null;
          name: string;
        };
        Update: {
          created_at?: string | null;
          description?: string | null;
          household_id?: string | null;
          id?: string;
          ingredients?: Json;
          is_global?: boolean | null;
          name?: string;
        };
        Relationships: [
          {
            foreignKeyName: "preparations_household_id_fkey";
            columns: ["household_id"];
            isOneToOne: false;
            referencedRelation: "households";
            referencedColumns: ["id"];
          },
        ];
      };
      price_history: {
        Row: {
          household_id: string | null;
          id: string;
          item_id: string;
          price: number;
          price_unit: string;
          recorded_at: string | null;
          source: string | null;
        };
        Insert: {
          household_id?: string | null;
          id?: string;
          item_id: string;
          price: number;
          price_unit?: string;
          recorded_at?: string | null;
          source?: string | null;
        };
        Update: {
          household_id?: string | null;
          id?: string;
          item_id?: string;
          price?: number;
          price_unit?: string;
          recorded_at?: string | null;
          source?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "price_history_household_id_fkey";
            columns: ["household_id"];
            isOneToOne: false;
            referencedRelation: "households";
            referencedColumns: ["id"];
          },
        ];
      };
      purchase_patterns: {
        Row: {
          avg_frequency_days: number | null;
          created_at: string | null;
          household_id: string;
          id: string;
          item_id: string;
          item_name: string;
          last_purchase_date: string | null;
          total_purchases: number | null;
          updated_at: string | null;
        };
        Insert: {
          avg_frequency_days?: number | null;
          created_at?: string | null;
          household_id: string;
          id?: string;
          item_id: string;
          item_name: string;
          last_purchase_date?: string | null;
          total_purchases?: number | null;
          updated_at?: string | null;
        };
        Update: {
          avg_frequency_days?: number | null;
          created_at?: string | null;
          household_id?: string;
          id?: string;
          item_id?: string;
          item_name?: string;
          last_purchase_date?: string | null;
          total_purchases?: number | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "purchase_patterns_household_id_fkey";
            columns: ["household_id"];
            isOneToOne: false;
            referencedRelation: "households";
            referencedColumns: ["id"];
          },
        ];
      };
      purchases: {
        Row: {
          budget_id: string | null;
          household_id: string | null;
          id: string;
          item_id: string | null;
          item_name: string;
          notes: string | null;
          price: number;
          purchased_at: string | null;
          quantity: string | null;
          store: string | null;
          user_id: string | null;
        };
        Insert: {
          budget_id?: string | null;
          household_id?: string | null;
          id?: string;
          item_id?: string | null;
          item_name: string;
          notes?: string | null;
          price: number;
          purchased_at?: string | null;
          quantity?: string | null;
          store?: string | null;
          user_id?: string | null;
        };
        Update: {
          budget_id?: string | null;
          household_id?: string | null;
          id?: string;
          item_id?: string | null;
          item_name?: string;
          notes?: string | null;
          price?: number;
          purchased_at?: string | null;
          quantity?: string | null;
          store?: string | null;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "purchases_budget_id_fkey";
            columns: ["budget_id"];
            isOneToOne: false;
            referencedRelation: "budgets";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "purchases_household_id_fkey";
            columns: ["household_id"];
            isOneToOne: false;
            referencedRelation: "households";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "purchases_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      push_subscriptions: {
        Row: {
          auth_key: string;
          created_at: string | null;
          endpoint: string;
          id: string;
          last_used_at: string | null;
          p256dh_key: string;
          user_agent: string | null;
          user_id: string;
        };
        Insert: {
          auth_key: string;
          created_at?: string | null;
          endpoint: string;
          id?: string;
          last_used_at?: string | null;
          p256dh_key: string;
          user_agent?: string | null;
          user_id: string;
        };
        Update: {
          auth_key?: string;
          created_at?: string | null;
          endpoint?: string;
          id?: string;
          last_used_at?: string | null;
          p256dh_key?: string;
          user_agent?: string | null;
          user_id?: string;
        };
        Relationships: [];
      };
      quick_routine_logs: {
        Row: {
          completed_at: string | null;
          created_at: string | null;
          household_id: string;
          id: string;
          items_completed: number | null;
          routine_id: string;
          routine_name: string;
          time_taken: number | null;
          total_items: number;
        };
        Insert: {
          completed_at?: string | null;
          created_at?: string | null;
          household_id: string;
          id?: string;
          items_completed?: number | null;
          routine_id: string;
          routine_name: string;
          time_taken?: number | null;
          total_items: number;
        };
        Update: {
          completed_at?: string | null;
          created_at?: string | null;
          household_id?: string;
          id?: string;
          items_completed?: number | null;
          routine_id?: string;
          routine_name?: string;
          time_taken?: number | null;
          total_items?: number;
        };
        Relationships: [
          {
            foreignKeyName: "quick_routine_logs_household_id_fkey";
            columns: ["household_id"];
            isOneToOne: false;
            referencedRelation: "households";
            referencedColumns: ["id"];
          },
        ];
      };
      rate_limits: {
        Row: {
          count: number;
          created_at: string | null;
          id: string;
          key: string;
          window_ms: number;
          window_start: string;
        };
        Insert: {
          count?: number;
          created_at?: string | null;
          id?: string;
          key: string;
          window_ms: number;
          window_start?: string;
        };
        Update: {
          count?: number;
          created_at?: string | null;
          id?: string;
          key?: string;
          window_ms?: number;
          window_start?: string;
        };
        Relationships: [];
      };
      recipe_favorites: {
        Row: {
          created_at: string | null;
          household_id: string | null;
          id: string;
          recipe_id: string;
          user_id: string;
        };
        Insert: {
          created_at?: string | null;
          household_id?: string | null;
          id?: string;
          recipe_id: string;
          user_id: string;
        };
        Update: {
          created_at?: string | null;
          household_id?: string | null;
          id?: string;
          recipe_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "recipe_favorites_household_id_fkey";
            columns: ["household_id"];
            isOneToOne: false;
            referencedRelation: "households";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "recipe_favorites_recipe_id_fkey";
            columns: ["recipe_id"];
            isOneToOne: false;
            referencedRelation: "recipes";
            referencedColumns: ["id"];
          },
        ];
      };
      recipe_image_cache: {
        Row: {
          attribution: string | null;
          attribution_url: string | null;
          created_at: string | null;
          id: string;
          image_url: string;
          recipe_name: string;
          recipe_name_hash: string;
          source: string;
        };
        Insert: {
          attribution?: string | null;
          attribution_url?: string | null;
          created_at?: string | null;
          id?: string;
          image_url: string;
          recipe_name: string;
          recipe_name_hash: string;
          source: string;
        };
        Update: {
          attribution?: string | null;
          attribution_url?: string | null;
          created_at?: string | null;
          id?: string;
          image_url?: string;
          recipe_name?: string;
          recipe_name_hash?: string;
          source?: string;
        };
        Relationships: [];
      };
      recipes: {
        Row: {
          calories_per_serving: number | null;
          category: string | null;
          cook_time: number | null;
          created_at: string | null;
          description: string | null;
          dietary_tags: string[] | null;
          difficulty: string | null;
          estimated_cost: number | null;
          household_id: string | null;
          id: string;
          image_url: string | null;
          ingredients: Json;
          moods: string[] | null;
          name: string;
          nutrition: Json | null;
          portions: Json | null;
          prep_time: number | null;
          region: string | null;
          source: string | null;
          steps: string[];
          tags: string[] | null;
          thermomix_compatible: boolean | null;
          tips: string | null;
          total: string | null;
          total_time: number | null;
          type: string;
          updated_at: string | null;
        };
        Insert: {
          calories_per_serving?: number | null;
          category?: string | null;
          cook_time?: number | null;
          created_at?: string | null;
          description?: string | null;
          dietary_tags?: string[] | null;
          difficulty?: string | null;
          estimated_cost?: number | null;
          household_id?: string | null;
          id: string;
          image_url?: string | null;
          ingredients?: Json;
          moods?: string[] | null;
          name: string;
          nutrition?: Json | null;
          portions?: Json | null;
          prep_time?: number | null;
          region?: string | null;
          source?: string | null;
          steps?: string[];
          tags?: string[] | null;
          thermomix_compatible?: boolean | null;
          tips?: string | null;
          total?: string | null;
          total_time?: number | null;
          type: string;
          updated_at?: string | null;
        };
        Update: {
          calories_per_serving?: number | null;
          category?: string | null;
          cook_time?: number | null;
          created_at?: string | null;
          description?: string | null;
          dietary_tags?: string[] | null;
          difficulty?: string | null;
          estimated_cost?: number | null;
          household_id?: string | null;
          id?: string;
          image_url?: string | null;
          ingredients?: Json;
          moods?: string[] | null;
          name?: string;
          nutrition?: Json | null;
          portions?: Json | null;
          prep_time?: number | null;
          region?: string | null;
          source?: string | null;
          steps?: string[];
          tags?: string[] | null;
          thermomix_compatible?: boolean | null;
          tips?: string | null;
          total?: string | null;
          total_time?: number | null;
          type?: string;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "recipes_household_id_fkey";
            columns: ["household_id"];
            isOneToOne: false;
            referencedRelation: "households";
            referencedColumns: ["id"];
          },
        ];
      };
      schedule_config: {
        Row: {
          created_at: string | null;
          cycle_start_date: string;
          cycle_weeks: number;
          household_id: string | null;
          id: string;
          is_active: boolean | null;
          updated_at: string | null;
        };
        Insert: {
          created_at?: string | null;
          cycle_start_date: string;
          cycle_weeks?: number;
          household_id?: string | null;
          id?: string;
          is_active?: boolean | null;
          updated_at?: string | null;
        };
        Update: {
          created_at?: string | null;
          cycle_start_date?: string;
          cycle_weeks?: number;
          household_id?: string | null;
          id?: string;
          is_active?: boolean | null;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      schedule_templates: {
        Row: {
          category: string;
          category_id: string | null;
          created_at: string | null;
          day_of_week: number;
          employee_id: string | null;
          household_id: string | null;
          id: string;
          is_special: boolean | null;
          order_index: number | null;
          space_id: string | null;
          task_description: string | null;
          task_name: string;
          time_end: string;
          time_start: string;
          updated_at: string | null;
          week_number: number;
        };
        Insert: {
          category: string;
          category_id?: string | null;
          created_at?: string | null;
          day_of_week: number;
          employee_id?: string | null;
          household_id?: string | null;
          id?: string;
          is_special?: boolean | null;
          order_index?: number | null;
          space_id?: string | null;
          task_description?: string | null;
          task_name: string;
          time_end: string;
          time_start: string;
          updated_at?: string | null;
          week_number: number;
        };
        Update: {
          category?: string;
          category_id?: string | null;
          created_at?: string | null;
          day_of_week?: number;
          employee_id?: string | null;
          household_id?: string | null;
          id?: string;
          is_special?: boolean | null;
          order_index?: number | null;
          space_id?: string | null;
          task_description?: string | null;
          task_name?: string;
          time_end?: string;
          time_start?: string;
          updated_at?: string | null;
          week_number?: number;
        };
        Relationships: [
          {
            foreignKeyName: "schedule_templates_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "task_categories";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "schedule_templates_employee_id_fkey";
            columns: ["employee_id"];
            isOneToOne: false;
            referencedRelation: "employees";
            referencedColumns: ["id"];
          },
        ];
      };
      scheduled_tasks: {
        Row: {
          actual_minutes: number | null;
          completed_at: string | null;
          completed_by: string | null;
          created_at: string | null;
          employee_id: string | null;
          household_id: string | null;
          id: string;
          notes: string | null;
          rating: number | null;
          scheduled_date: string;
          space_id: string | null;
          status: string | null;
          task_template_id: string | null;
        };
        Insert: {
          actual_minutes?: number | null;
          completed_at?: string | null;
          completed_by?: string | null;
          created_at?: string | null;
          employee_id?: string | null;
          household_id?: string | null;
          id?: string;
          notes?: string | null;
          rating?: number | null;
          scheduled_date: string;
          space_id?: string | null;
          status?: string | null;
          task_template_id?: string | null;
        };
        Update: {
          actual_minutes?: number | null;
          completed_at?: string | null;
          completed_by?: string | null;
          created_at?: string | null;
          employee_id?: string | null;
          household_id?: string | null;
          id?: string;
          notes?: string | null;
          rating?: number | null;
          scheduled_date?: string;
          space_id?: string | null;
          status?: string | null;
          task_template_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "scheduled_tasks_completed_by_fkey";
            columns: ["completed_by"];
            isOneToOne: false;
            referencedRelation: "home_employees";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "scheduled_tasks_completed_by_fkey";
            columns: ["completed_by"];
            isOneToOne: false;
            referencedRelation: "today_tasks_summary";
            referencedColumns: ["employee_id"];
          },
          {
            foreignKeyName: "scheduled_tasks_employee_id_fkey";
            columns: ["employee_id"];
            isOneToOne: false;
            referencedRelation: "home_employees";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "scheduled_tasks_employee_id_fkey";
            columns: ["employee_id"];
            isOneToOne: false;
            referencedRelation: "today_tasks_summary";
            referencedColumns: ["employee_id"];
          },
          {
            foreignKeyName: "scheduled_tasks_household_id_fkey";
            columns: ["household_id"];
            isOneToOne: false;
            referencedRelation: "households";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "scheduled_tasks_space_id_fkey";
            columns: ["space_id"];
            isOneToOne: false;
            referencedRelation: "spaces";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "scheduled_tasks_task_template_id_fkey";
            columns: ["task_template_id"];
            isOneToOne: false;
            referencedRelation: "task_templates";
            referencedColumns: ["id"];
          },
        ];
      };
      shopping_list_assignments: {
        Row: {
          assigned_at: string | null;
          id: string;
          item_id: string;
          shopping_list_id: string;
          user_id: string;
        };
        Insert: {
          assigned_at?: string | null;
          id?: string;
          item_id: string;
          shopping_list_id: string;
          user_id: string;
        };
        Update: {
          assigned_at?: string | null;
          id?: string;
          item_id?: string;
          shopping_list_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "shopping_list_assignments_shopping_list_id_fkey";
            columns: ["shopping_list_id"];
            isOneToOne: false;
            referencedRelation: "shopping_lists";
            referencedColumns: ["id"];
          },
        ];
      };
      shopping_lists: {
        Row: {
          completed_at: string | null;
          created_at: string | null;
          household_id: string | null;
          id: string;
          items: Json;
          menu_id: string | null;
          status: string | null;
          total_actual: number | null;
          total_estimated: number | null;
          week_start_date: string;
        };
        Insert: {
          completed_at?: string | null;
          created_at?: string | null;
          household_id?: string | null;
          id?: string;
          items?: Json;
          menu_id?: string | null;
          status?: string | null;
          total_actual?: number | null;
          total_estimated?: number | null;
          week_start_date: string;
        };
        Update: {
          completed_at?: string | null;
          created_at?: string | null;
          household_id?: string | null;
          id?: string;
          items?: Json;
          menu_id?: string | null;
          status?: string | null;
          total_actual?: number | null;
          total_estimated?: number | null;
          week_start_date?: string;
        };
        Relationships: [
          {
            foreignKeyName: "shopping_lists_household_id_fkey";
            columns: ["household_id"];
            isOneToOne: false;
            referencedRelation: "households";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "shopping_lists_menu_id_fkey";
            columns: ["menu_id"];
            isOneToOne: false;
            referencedRelation: "generated_menus";
            referencedColumns: ["id"];
          },
        ];
      };
      space_types: {
        Row: {
          category: string;
          default_tasks: Json | null;
          icon: string | null;
          id: string;
          name: string;
          sort_order: number | null;
        };
        Insert: {
          category: string;
          default_tasks?: Json | null;
          icon?: string | null;
          id?: string;
          name: string;
          sort_order?: number | null;
        };
        Update: {
          category?: string;
          default_tasks?: Json | null;
          icon?: string | null;
          id?: string;
          name?: string;
          sort_order?: number | null;
        };
        Relationships: [];
      };
      spaces: {
        Row: {
          area_sqm: number | null;
          category: string;
          characteristics: Json | null;
          created_at: string | null;
          custom_name: string | null;
          has_bathroom: boolean | null;
          household_id: string | null;
          id: string;
          notes: string | null;
          space_type_id: string | null;
          usage_level: string | null;
        };
        Insert: {
          area_sqm?: number | null;
          category: string;
          characteristics?: Json | null;
          created_at?: string | null;
          custom_name?: string | null;
          has_bathroom?: boolean | null;
          household_id?: string | null;
          id?: string;
          notes?: string | null;
          space_type_id?: string | null;
          usage_level?: string | null;
        };
        Update: {
          area_sqm?: number | null;
          category?: string;
          characteristics?: Json | null;
          created_at?: string | null;
          custom_name?: string | null;
          has_bathroom?: boolean | null;
          household_id?: string | null;
          id?: string;
          notes?: string | null;
          space_type_id?: string | null;
          usage_level?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "spaces_household_id_fkey";
            columns: ["household_id"];
            isOneToOne: false;
            referencedRelation: "households";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "spaces_space_type_id_fkey";
            columns: ["space_type_id"];
            isOneToOne: false;
            referencedRelation: "space_types";
            referencedColumns: ["id"];
          },
        ];
      };
      store_prices: {
        Row: {
          id: string;
          item_name: string;
          price: number;
          store: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          item_name: string;
          price: number;
          store: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          item_name?: string;
          price?: number;
          store?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      subscriptions: {
        Row: {
          created_at: string | null;
          current_period_end: string | null;
          household_id: string;
          id: string;
          status: string;
          stripe_customer_id: string | null;
          stripe_subscription_id: string | null;
          tier: Database["public"]["Enums"]["subscription_tier"];
          trial_ends_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          created_at?: string | null;
          current_period_end?: string | null;
          household_id: string;
          id?: string;
          status?: string;
          stripe_customer_id?: string | null;
          stripe_subscription_id?: string | null;
          tier?: Database["public"]["Enums"]["subscription_tier"];
          trial_ends_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          created_at?: string | null;
          current_period_end?: string | null;
          household_id?: string;
          id?: string;
          status?: string;
          stripe_customer_id?: string | null;
          stripe_subscription_id?: string | null;
          tier?: Database["public"]["Enums"]["subscription_tier"];
          trial_ends_at?: string | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "subscriptions_household_id_fkey";
            columns: ["household_id"];
            isOneToOne: true;
            referencedRelation: "households";
            referencedColumns: ["id"];
          },
        ];
      };
      substitution_history: {
        Row: {
          household_id: string | null;
          id: string;
          notes: string | null;
          original: string;
          rating: number | null;
          recipe_id: string | null;
          substitute: string;
          used_at: string | null;
        };
        Insert: {
          household_id?: string | null;
          id?: string;
          notes?: string | null;
          original: string;
          rating?: number | null;
          recipe_id?: string | null;
          substitute: string;
          used_at?: string | null;
        };
        Update: {
          household_id?: string | null;
          id?: string;
          notes?: string | null;
          original?: string;
          rating?: number | null;
          recipe_id?: string | null;
          substitute?: string;
          used_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "substitution_history_household_id_fkey";
            columns: ["household_id"];
            isOneToOne: false;
            referencedRelation: "households";
            referencedColumns: ["id"];
          },
        ];
      };
      task_categories: {
        Row: {
          active: boolean | null;
          color: string | null;
          created_at: string | null;
          description: string | null;
          household_id: string;
          icon: string | null;
          id: string;
          is_default: boolean | null;
          name: string;
          sort_order: number | null;
        };
        Insert: {
          active?: boolean | null;
          color?: string | null;
          created_at?: string | null;
          description?: string | null;
          household_id: string;
          icon?: string | null;
          id?: string;
          is_default?: boolean | null;
          name: string;
          sort_order?: number | null;
        };
        Update: {
          active?: boolean | null;
          color?: string | null;
          created_at?: string | null;
          description?: string | null;
          household_id?: string;
          icon?: string | null;
          id?: string;
          is_default?: boolean | null;
          name?: string;
          sort_order?: number | null;
        };
        Relationships: [];
      };
      task_templates: {
        Row: {
          assigned_employee_id: string | null;
          category: string | null;
          created_at: string | null;
          description: string | null;
          estimated_minutes: number | null;
          frequency: string;
          frequency_days: number | null;
          household_id: string | null;
          id: string;
          is_active: boolean | null;
          name: string;
          priority: string | null;
          space_id: string | null;
        };
        Insert: {
          assigned_employee_id?: string | null;
          category?: string | null;
          created_at?: string | null;
          description?: string | null;
          estimated_minutes?: number | null;
          frequency: string;
          frequency_days?: number | null;
          household_id?: string | null;
          id?: string;
          is_active?: boolean | null;
          name: string;
          priority?: string | null;
          space_id?: string | null;
        };
        Update: {
          assigned_employee_id?: string | null;
          category?: string | null;
          created_at?: string | null;
          description?: string | null;
          estimated_minutes?: number | null;
          frequency?: string;
          frequency_days?: number | null;
          household_id?: string | null;
          id?: string;
          is_active?: boolean | null;
          name?: string;
          priority?: string | null;
          space_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "task_templates_assigned_employee_id_fkey";
            columns: ["assigned_employee_id"];
            isOneToOne: false;
            referencedRelation: "home_employees";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "task_templates_assigned_employee_id_fkey";
            columns: ["assigned_employee_id"];
            isOneToOne: false;
            referencedRelation: "today_tasks_summary";
            referencedColumns: ["employee_id"];
          },
          {
            foreignKeyName: "task_templates_household_id_fkey";
            columns: ["household_id"];
            isOneToOne: false;
            referencedRelation: "households";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "task_templates_space_id_fkey";
            columns: ["space_id"];
            isOneToOne: false;
            referencedRelation: "spaces";
            referencedColumns: ["id"];
          },
        ];
      };
      user_profiles: {
        Row: {
          avatar_url: string | null;
          created_at: string | null;
          email: string;
          full_name: string | null;
          id: string;
          notification_preferences: Json | null;
          phone: string | null;
          preferred_language: string | null;
          updated_at: string | null;
        };
        Insert: {
          avatar_url?: string | null;
          created_at?: string | null;
          email: string;
          full_name?: string | null;
          id: string;
          notification_preferences?: Json | null;
          phone?: string | null;
          preferred_language?: string | null;
          updated_at?: string | null;
        };
        Update: {
          avatar_url?: string | null;
          created_at?: string | null;
          email?: string;
          full_name?: string | null;
          id?: string;
          notification_preferences?: Json | null;
          phone?: string | null;
          preferred_language?: string | null;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      users: {
        Row: {
          auth_id: string | null;
          avatar_url: string | null;
          created_at: string | null;
          email: string;
          household_id: string | null;
          id: string;
          last_active_at: string | null;
          name: string | null;
          permissions: Json | null;
          role: string | null;
          updated_at: string | null;
        };
        Insert: {
          auth_id?: string | null;
          avatar_url?: string | null;
          created_at?: string | null;
          email: string;
          household_id?: string | null;
          id?: string;
          last_active_at?: string | null;
          name?: string | null;
          permissions?: Json | null;
          role?: string | null;
          updated_at?: string | null;
        };
        Update: {
          auth_id?: string | null;
          avatar_url?: string | null;
          created_at?: string | null;
          email?: string;
          household_id?: string | null;
          id?: string;
          last_active_at?: string | null;
          name?: string | null;
          permissions?: Json | null;
          role?: string | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "users_household_id_fkey";
            columns: ["household_id"];
            isOneToOne: false;
            referencedRelation: "households";
            referencedColumns: ["id"];
          },
        ];
      };
      workload_predictions_log: {
        Row: {
          affected_employee_id: string | null;
          created_at: string | null;
          household_id: string;
          id: string;
          message: string;
          prediction_date: string;
          prediction_type: string;
          resolved_at: string | null;
          severity: string;
          suggested_action: string | null;
          was_resolved: boolean | null;
        };
        Insert: {
          affected_employee_id?: string | null;
          created_at?: string | null;
          household_id: string;
          id?: string;
          message: string;
          prediction_date: string;
          prediction_type: string;
          resolved_at?: string | null;
          severity: string;
          suggested_action?: string | null;
          was_resolved?: boolean | null;
        };
        Update: {
          affected_employee_id?: string | null;
          created_at?: string | null;
          household_id?: string;
          id?: string;
          message?: string;
          prediction_date?: string;
          prediction_type?: string;
          resolved_at?: string | null;
          severity?: string;
          suggested_action?: string | null;
          was_resolved?: boolean | null;
        };
        Relationships: [
          {
            foreignKeyName: "workload_predictions_log_affected_employee_id_fkey";
            columns: ["affected_employee_id"];
            isOneToOne: false;
            referencedRelation: "home_employees";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "workload_predictions_log_affected_employee_id_fkey";
            columns: ["affected_employee_id"];
            isOneToOne: false;
            referencedRelation: "today_tasks_summary";
            referencedColumns: ["employee_id"];
          },
          {
            foreignKeyName: "workload_predictions_log_household_id_fkey";
            columns: ["household_id"];
            isOneToOne: false;
            referencedRelation: "households";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      today_tasks_summary: {
        Row: {
          completed: number | null;
          employee_id: string | null;
          employee_name: string | null;
          household_id: string | null;
          in_progress: number | null;
          pending: number | null;
          progress_percent: number | null;
          total: number | null;
        };
        Relationships: [];
      };
    };
    Functions: {
      check_rate_limit: {
        Args: { p_key: string; p_limit: number; p_window_ms: number };
        Returns: {
          allowed: boolean;
          current_count: number;
          reset_at: string;
        }[];
      };
      check_user_permission: {
        Args: { p_household_id: string; p_permission: string };
        Returns: boolean;
      };
      cleanup_expired_rate_limits: { Args: never; Returns: number };
      cleanup_old_conversations: { Args: never; Returns: number };
      complete_ai_audit_log: {
        Args: {
          p_affected_record_ids?: string[];
          p_affected_tables?: string[];
          p_error_message?: string;
          p_log_id: string;
          p_new_state?: Json;
          p_previous_state?: Json;
          p_result?: Json;
          p_status: string;
        };
        Returns: boolean;
      };
      create_ai_audit_log: {
        Args: {
          p_function_name: string;
          p_household_id: string;
          p_parameters?: Json;
          p_risk_level?: number;
          p_session_id: string;
          p_user_id: string;
        };
        Returns: string;
      };
      create_ai_proposal: {
        Args: {
          p_actions: Json;
          p_household_id: string;
          p_risk_level: number;
          p_session_id: string;
          p_summary: string;
          p_user_id: string;
        };
        Returns: string;
      };
      create_default_categories: {
        Args: { p_household_id: string };
        Returns: undefined;
      };
      create_invitation: {
        Args: {
          p_expires_in_days?: number;
          p_household_id: string;
          p_max_uses?: number;
          p_role?: string;
          p_suggested_name?: string;
        };
        Returns: {
          code: string;
          expires_at: string;
          household_id: string;
          id: string;
          max_uses: number;
          role: string;
          suggested_name: string;
        }[];
      };
      decide_ai_proposal: {
        Args: {
          p_approved_action_ids?: string[];
          p_decision: string;
          p_decision_by: string;
          p_notes?: string;
          p_proposal_id: string;
        };
        Returns: boolean;
      };
      expire_old_proposals: { Args: never; Returns: number };
      generate_daily_tasks:
        | { Args: { target_date: string }; Returns: number }
        | {
            Args: { p_household_id?: string; target_date: string };
            Returns: number;
          };
      generate_invitation_code: { Args: never; Returns: string };
      get_current_household_id: { Args: never; Returns: string };
      get_cycle_week: { Args: { target_date: string }; Returns: number };
      get_function_risk_config: {
        Args: { p_function_name: string };
        Returns: {
          category: string;
          is_reversible: boolean;
          requires_confirmation: boolean;
          risk_level: number;
        }[];
      };
      get_household_tier: {
        Args: { p_household_id: string };
        Returns: Database["public"]["Enums"]["subscription_tier"];
      };
      get_my_memberships: {
        Args: never;
        Returns: {
          display_name: string;
          household_id: string;
          household_name: string;
          is_active: boolean;
          joined_at: string;
          membership_id: string;
          role: Database["public"]["Enums"]["user_role"];
        }[];
      };
      get_user_household_id: { Args: never; Returns: string };
      has_household_role: {
        Args: { p_household_id: string; p_roles: string[] };
        Returns: boolean;
      };
      is_household_member: {
        Args: { p_household_id: string };
        Returns: boolean;
      };
      rollback_ai_action: {
        Args: { p_log_id: string; p_reason?: string; p_rolled_back_by: string };
        Returns: Json;
      };
      upsert_purchase_pattern: {
        Args: {
          p_household_id: string;
          p_item_id: string;
          p_item_name: string;
          p_purchase_date: string;
        };
        Returns: undefined;
      };
      use_invitation_code: {
        Args: { p_code: string };
        Returns: {
          error: string;
          household_id: string;
          membership_id: string;
          role: string;
          success: boolean;
        }[];
      };
      user_has_household_access: {
        Args: { check_household_id: string };
        Returns: boolean;
      };
    };
    Enums: {
      subscription_tier: "free" | "premium" | "family";
      user_role: "admin" | "empleado" | "familia";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<
  keyof Database,
  "public"
>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      subscription_tier: ["free", "premium", "family"],
      user_role: ["admin", "empleado", "familia"],
    },
  },
} as const;
