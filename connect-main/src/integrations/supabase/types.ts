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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      drill_locations: {
        Row: {
          created_at: string
          description: string | null
          drill_type: Database["public"]["Enums"]["drill_type"]
          id: string
          image_url: string | null
          instructions: string | null
          latitude: number | null
          longitude: number | null
          name: string
          outpost: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          drill_type: Database["public"]["Enums"]["drill_type"]
          id?: string
          image_url?: string | null
          instructions?: string | null
          latitude?: number | null
          longitude?: number | null
          name: string
          outpost: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          drill_type?: Database["public"]["Enums"]["drill_type"]
          id?: string
          image_url?: string | null
          instructions?: string | null
          latitude?: number | null
          longitude?: number | null
          name?: string
          outpost?: string
          updated_at?: string
        }
        Relationships: []
      }
      procedures: {
        Row: {
          created_at: string
          description: string | null
          file_url: string | null
          id: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          file_url?: string | null
          id?: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          file_url?: string | null
          id?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          full_name: string
          id: string
          outpost: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          full_name: string
          id?: string
          outpost?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          full_name?: string
          id?: string
          outpost?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      safety_content: {
        Row: {
          category: string
          created_at: string
          description: string | null
          event_date: string | null
          file_url: string | null
          id: string
          image_url: string | null
          title: string
          updated_at: string
          video_url: string | null
        }
        Insert: {
          category: string
          created_at?: string
          description?: string | null
          event_date?: string | null
          file_url?: string | null
          id?: string
          image_url?: string | null
          title: string
          updated_at?: string
          video_url?: string | null
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          event_date?: string | null
          file_url?: string | null
          id?: string
          image_url?: string | null
          title?: string
          updated_at?: string
          video_url?: string | null
        }
        Relationships: []
      }
      safety_events: {
        Row: {
          category: Database["public"]["Enums"]["safety_event_category"]
          created_at: string
          description: string | null
          event_date: string | null
          id: string
          lessons_learned: string | null
          title: string
          updated_at: string
        }
        Insert: {
          category: Database["public"]["Enums"]["safety_event_category"]
          created_at?: string
          description?: string | null
          event_date?: string | null
          id?: string
          lessons_learned?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          category?: Database["public"]["Enums"]["safety_event_category"]
          created_at?: string
          description?: string | null
          event_date?: string | null
          id?: string
          lessons_learned?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      safety_files: {
        Row: {
          category: Database["public"]["Enums"]["safety_category"]
          content: string | null
          created_at: string
          id: string
          image_url: string | null
          outpost: string
          title: string
          updated_at: string
        }
        Insert: {
          category: Database["public"]["Enums"]["safety_category"]
          content?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          outpost: string
          title: string
          updated_at?: string
        }
        Update: {
          category?: Database["public"]["Enums"]["safety_category"]
          content?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          outpost?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      shift_reports: {
        Row: {
          commander_briefing_attendance: boolean | null
          created_at: string
          descent_drill_completed: boolean | null
          driver_name: string
          driver_tools_checked: boolean | null
          driver_tools_items_checked: string[] | null
          emergency_procedure_participation: boolean | null
          fire_drill_completed: boolean | null
          has_ammunition: boolean | null
          has_ceramic_vest: boolean | null
          has_helmet: boolean | null
          has_personal_weapon: boolean | null
          id: string
          is_complete: boolean | null
          outpost: string
          photo_back: string | null
          photo_front: string | null
          photo_left: string | null
          photo_right: string | null
          photo_steering_wheel: string | null
          pre_movement_checks_completed: boolean | null
          pre_movement_items_checked: string[] | null
          report_date: string
          report_time: string
          rollover_drill_completed: boolean | null
          safety_vulnerabilities: string | null
          shift_type: Database["public"]["Enums"]["shift_type"]
          updated_at: string
          user_id: string
          vardim_points: string | null
          vardim_procedure_explanation: string | null
          vehicle_number: string
          work_card_completed: boolean | null
        }
        Insert: {
          commander_briefing_attendance?: boolean | null
          created_at?: string
          descent_drill_completed?: boolean | null
          driver_name: string
          driver_tools_checked?: boolean | null
          driver_tools_items_checked?: string[] | null
          emergency_procedure_participation?: boolean | null
          fire_drill_completed?: boolean | null
          has_ammunition?: boolean | null
          has_ceramic_vest?: boolean | null
          has_helmet?: boolean | null
          has_personal_weapon?: boolean | null
          id?: string
          is_complete?: boolean | null
          outpost: string
          photo_back?: string | null
          photo_front?: string | null
          photo_left?: string | null
          photo_right?: string | null
          photo_steering_wheel?: string | null
          pre_movement_checks_completed?: boolean | null
          pre_movement_items_checked?: string[] | null
          report_date?: string
          report_time?: string
          rollover_drill_completed?: boolean | null
          safety_vulnerabilities?: string | null
          shift_type: Database["public"]["Enums"]["shift_type"]
          updated_at?: string
          user_id: string
          vardim_points?: string | null
          vardim_procedure_explanation?: string | null
          vehicle_number: string
          work_card_completed?: boolean | null
        }
        Update: {
          commander_briefing_attendance?: boolean | null
          created_at?: string
          descent_drill_completed?: boolean | null
          driver_name?: string
          driver_tools_checked?: boolean | null
          driver_tools_items_checked?: string[] | null
          emergency_procedure_participation?: boolean | null
          fire_drill_completed?: boolean | null
          has_ammunition?: boolean | null
          has_ceramic_vest?: boolean | null
          has_helmet?: boolean | null
          has_personal_weapon?: boolean | null
          id?: string
          is_complete?: boolean | null
          outpost?: string
          photo_back?: string | null
          photo_front?: string | null
          photo_left?: string | null
          photo_right?: string | null
          photo_steering_wheel?: string | null
          pre_movement_checks_completed?: boolean | null
          pre_movement_items_checked?: string[] | null
          report_date?: string
          report_time?: string
          rollover_drill_completed?: boolean | null
          safety_vulnerabilities?: string | null
          shift_type?: Database["public"]["Enums"]["shift_type"]
          updated_at?: string
          user_id?: string
          vardim_points?: string | null
          vardim_procedure_explanation?: string | null
          vehicle_number?: string
          work_card_completed?: boolean | null
        }
        Relationships: []
      }
      training_videos: {
        Row: {
          created_at: string
          duration: string | null
          id: string
          thumbnail_url: string | null
          title: string
          updated_at: string
          video_url: string | null
        }
        Insert: {
          created_at?: string
          duration?: string | null
          id?: string
          thumbnail_url?: string | null
          title: string
          updated_at?: string
          video_url?: string | null
        }
        Update: {
          created_at?: string
          duration?: string | null
          id?: string
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
          video_url?: string | null
        }
        Relationships: []
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
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "driver" | "admin"
      drill_type: "descent" | "rollover" | "fire"
      safety_category: "vardim" | "vulnerability" | "parsa"
      safety_event_category:
        | "fire"
        | "accident"
        | "weapon"
        | "vehicle"
        | "other"
      shift_type: "morning" | "afternoon" | "evening"
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
      app_role: ["driver", "admin"],
      drill_type: ["descent", "rollover", "fire"],
      safety_category: ["vardim", "vulnerability", "parsa"],
      safety_event_category: ["fire", "accident", "weapon", "vehicle", "other"],
      shift_type: ["morning", "afternoon", "evening"],
    },
  },
} as const
