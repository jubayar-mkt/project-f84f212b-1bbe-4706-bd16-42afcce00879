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
      budgets: {
        Row: {
          category: string
          created_at: string
          id: string
          month: string
          monthly_limit: number
          updated_at: string
          user_id: string
        }
        Insert: {
          category: string
          created_at?: string
          id?: string
          month: string
          monthly_limit: number
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          month?: string
          monthly_limit?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      habit_checkins: {
        Row: {
          checkin_date: string
          count: number
          created_at: string
          habit_id: string
          id: string
          user_id: string
        }
        Insert: {
          checkin_date?: string
          count?: number
          created_at?: string
          habit_id: string
          id?: string
          user_id: string
        }
        Update: {
          checkin_date?: string
          count?: number
          created_at?: string
          habit_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "habit_checkins_habit_id_fkey"
            columns: ["habit_id"]
            isOneToOne: false
            referencedRelation: "habits"
            referencedColumns: ["id"]
          },
        ]
      }
      habits: {
        Row: {
          active: boolean
          category: string | null
          color: string
          created_at: string
          description: string | null
          icon: string
          id: string
          name: string
          target_per_day: number
          updated_at: string
          user_id: string
        }
        Insert: {
          active?: boolean
          category?: string | null
          color?: string
          created_at?: string
          description?: string | null
          icon?: string
          id?: string
          name: string
          target_per_day?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          active?: boolean
          category?: string | null
          color?: string
          created_at?: string
          description?: string | null
          icon?: string
          id?: string
          name?: string
          target_per_day?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          link: string | null
          read: boolean
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          link?: string | null
          read?: boolean
          title: string
          type?: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          link?: string | null
          read?: boolean
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      prayer_settings: {
        Row: {
          asr_reminder: boolean
          asr_time: string | null
          created_at: string
          dhuhr_reminder: boolean
          dhuhr_time: string | null
          fajr_reminder: boolean
          fajr_time: string | null
          id: string
          isha_reminder: boolean
          isha_time: string | null
          maghrib_reminder: boolean
          maghrib_time: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          asr_reminder?: boolean
          asr_time?: string | null
          created_at?: string
          dhuhr_reminder?: boolean
          dhuhr_time?: string | null
          fajr_reminder?: boolean
          fajr_time?: string | null
          id?: string
          isha_reminder?: boolean
          isha_time?: string | null
          maghrib_reminder?: boolean
          maghrib_time?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          asr_reminder?: boolean
          asr_time?: string | null
          created_at?: string
          dhuhr_reminder?: boolean
          dhuhr_time?: string | null
          fajr_reminder?: boolean
          fajr_time?: string | null
          id?: string
          isha_reminder?: boolean
          isha_time?: string | null
          maghrib_reminder?: boolean
          maghrib_time?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      routine_completions: {
        Row: {
          completed: boolean
          completed_at: string | null
          completion_date: string
          created_at: string
          id: string
          skipped: boolean
          template_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          completed?: boolean
          completed_at?: string | null
          completion_date: string
          created_at?: string
          id?: string
          skipped?: boolean
          template_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          completed?: boolean
          completed_at?: string | null
          completion_date?: string
          created_at?: string
          id?: string
          skipped?: boolean
          template_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "routine_completions_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "routine_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      routine_templates: {
        Row: {
          active: boolean
          archived_at: string | null
          category: string | null
          created_at: string
          description: string | null
          effective_from: string
          end_time: string | null
          id: string
          name: string
          prayer_key: Database["public"]["Enums"]["prayer_key"] | null
          priority: Database["public"]["Enums"]["routine_priority"]
          sort_order: number
          source: Database["public"]["Enums"]["routine_source"]
          start_time: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          active?: boolean
          archived_at?: string | null
          category?: string | null
          created_at?: string
          description?: string | null
          effective_from?: string
          end_time?: string | null
          id?: string
          name: string
          prayer_key?: Database["public"]["Enums"]["prayer_key"] | null
          priority?: Database["public"]["Enums"]["routine_priority"]
          sort_order?: number
          source?: Database["public"]["Enums"]["routine_source"]
          start_time?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          active?: boolean
          archived_at?: string | null
          category?: string | null
          created_at?: string
          description?: string | null
          effective_from?: string
          end_time?: string | null
          id?: string
          name?: string
          prayer_key?: Database["public"]["Enums"]["prayer_key"] | null
          priority?: Database["public"]["Enums"]["routine_priority"]
          sort_order?: number
          source?: Database["public"]["Enums"]["routine_source"]
          start_time?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      routines: {
        Row: {
          category: string | null
          completed: boolean
          completed_at: string | null
          created_at: string
          description: string | null
          end_time: string | null
          id: string
          name: string
          priority: Database["public"]["Enums"]["routine_priority"]
          scheduled_date: string
          scheduled_time: string | null
          sort_order: number
          updated_at: string
          user_id: string
        }
        Insert: {
          category?: string | null
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          description?: string | null
          end_time?: string | null
          id?: string
          name: string
          priority?: Database["public"]["Enums"]["routine_priority"]
          scheduled_date?: string
          scheduled_time?: string | null
          sort_order?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string | null
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          description?: string | null
          end_time?: string | null
          id?: string
          name?: string
          priority?: Database["public"]["Enums"]["routine_priority"]
          scheduled_date?: string
          scheduled_time?: string | null
          sort_order?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      savings_deposits: {
        Row: {
          amount: number
          created_at: string
          deposit_date: string
          goal_id: string
          id: string
          note: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          deposit_date?: string
          goal_id: string
          id?: string
          note?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          deposit_date?: string
          goal_id?: string
          id?: string
          note?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "savings_deposits_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "savings_goals"
            referencedColumns: ["id"]
          },
        ]
      }
      savings_goals: {
        Row: {
          color: string
          completed: boolean
          completed_at: string | null
          created_at: string
          deadline: string | null
          icon: string
          id: string
          name: string
          note: string | null
          sort_order: number
          target_amount: number
          updated_at: string
          user_id: string
        }
        Insert: {
          color?: string
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          deadline?: string | null
          icon?: string
          id?: string
          name: string
          note?: string | null
          sort_order?: number
          target_amount: number
          updated_at?: string
          user_id: string
        }
        Update: {
          color?: string
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          deadline?: string | null
          icon?: string
          id?: string
          name?: string
          note?: string | null
          sort_order?: number
          target_amount?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      shop_credits: {
        Row: {
          created_at: string
          id: string
          item_name: string
          note: string | null
          purchase_date: string
          quantity: number
          shop_name: string
          total_amount: number
          unit_price: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          item_name: string
          note?: string | null
          purchase_date?: string
          quantity?: number
          shop_name: string
          total_amount: number
          unit_price?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          item_name?: string
          note?: string | null
          purchase_date?: string
          quantity?: number
          shop_name?: string
          total_amount?: number
          unit_price?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      shop_payments: {
        Row: {
          created_at: string
          id: string
          note: string | null
          paid_amount: number
          payment_date: string
          payment_method: string | null
          shop_name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          note?: string | null
          paid_amount: number
          payment_date?: string
          payment_method?: string | null
          shop_name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          note?: string | null
          paid_amount?: number
          payment_date?: string
          payment_method?: string | null
          shop_name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      transactions: {
        Row: {
          amount: number
          category: string
          created_at: string
          id: string
          note: string | null
          transaction_date: string
          type: Database["public"]["Enums"]["transaction_type"]
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          category: string
          created_at?: string
          id?: string
          note?: string | null
          transaction_date?: string
          type: Database["public"]["Enums"]["transaction_type"]
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string
          id?: string
          note?: string | null
          transaction_date?: string
          type?: Database["public"]["Enums"]["transaction_type"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
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
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "premium" | "user"
      prayer_key: "fajr" | "dhuhr" | "asr" | "maghrib" | "isha"
      routine_priority: "low" | "medium" | "high"
      routine_source: "manual" | "prayer"
      transaction_type: "income" | "expense"
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
      app_role: ["admin", "premium", "user"],
      prayer_key: ["fajr", "dhuhr", "asr", "maghrib", "isha"],
      routine_priority: ["low", "medium", "high"],
      routine_source: ["manual", "prayer"],
      transaction_type: ["income", "expense"],
    },
  },
} as const
