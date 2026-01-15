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
      accidents: {
        Row: {
          accident_date: string
          checklist: Json | null
          closed_at: string | null
          created_at: string
          created_by: string | null
          description: string | null
          driver_name: string | null
          driver_type: string
          id: string
          judgment_result: string | null
          location: string | null
          notes: string | null
          severity: string | null
          soldier_id: string | null
          status: string
          updated_at: string
          vehicle_number: string | null
          was_judged: boolean | null
        }
        Insert: {
          accident_date: string
          checklist?: Json | null
          closed_at?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          driver_name?: string | null
          driver_type: string
          id?: string
          judgment_result?: string | null
          location?: string | null
          notes?: string | null
          severity?: string | null
          soldier_id?: string | null
          status?: string
          updated_at?: string
          vehicle_number?: string | null
          was_judged?: boolean | null
        }
        Update: {
          accident_date?: string
          checklist?: Json | null
          closed_at?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          driver_name?: string | null
          driver_type?: string
          id?: string
          judgment_result?: string | null
          location?: string | null
          notes?: string | null
          severity?: string | null
          soldier_id?: string | null
          status?: string
          updated_at?: string
          vehicle_number?: string | null
          was_judged?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "accidents_soldier_id_fkey"
            columns: ["soldier_id"]
            isOneToOne: false
            referencedRelation: "soldiers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accidents_soldier_id_fkey"
            columns: ["soldier_id"]
            isOneToOne: false
            referencedRelation: "soldiers_basic"
            referencedColumns: ["id"]
          },
        ]
      }
      bom_tasks: {
        Row: {
          assigned_to: string
          created_at: string
          created_by: string | null
          description: string | null
          due_date: string
          id: string
          notes: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          assigned_to: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date: string
          id?: string
          notes?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string
          id?: string
          notes?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      calendar_holidays: {
        Row: {
          category: string
          created_at: string
          event_date: string
          id: string
          is_recurring: boolean | null
          title: string
        }
        Insert: {
          category: string
          created_at?: string
          event_date: string
          id?: string
          is_recurring?: boolean | null
          title: string
        }
        Update: {
          category?: string
          created_at?: string
          event_date?: string
          id?: string
          is_recurring?: boolean | null
          title?: string
        }
        Relationships: []
      }
      cleaning_parade_examples: {
        Row: {
          created_at: string
          description: string
          display_order: number
          id: string
          image_url: string
          outpost: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description: string
          display_order?: number
          id?: string
          image_url: string
          outpost: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string
          display_order?: number
          id?: string
          image_url?: string
          outpost?: string
          updated_at?: string
        }
        Relationships: []
      }
      cleaning_parade_highlights: {
        Row: {
          created_at: string
          display_order: number
          id: string
          is_active: boolean
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          id?: string
          is_active?: boolean
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_order?: number
          id?: string
          is_active?: boolean
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      cleaning_parades: {
        Row: {
          created_at: string
          day_of_week: string
          id: string
          outpost: string
          parade_date: string
          parade_time: string
          photos: string[] | null
          responsible_driver: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          day_of_week: string
          id?: string
          outpost: string
          parade_date?: string
          parade_time?: string
          photos?: string[] | null
          responsible_driver: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          day_of_week?: string
          id?: string
          outpost?: string
          parade_date?: string
          parade_time?: string
          photos?: string[] | null
          responsible_driver?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      dangerous_routes: {
        Row: {
          created_at: string
          created_by: string | null
          danger_type: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          route_points: Json
          severity: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          danger_type?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          route_points?: Json
          severity?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          danger_type?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          route_points?: Json
          severity?: string
          updated_at?: string
        }
        Relationships: []
      }
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
      event_attendance: {
        Row: {
          absence_reason: string | null
          attended: boolean | null
          completed: boolean | null
          created_at: string
          event_id: string
          id: string
          notes: string | null
          soldier_id: string
          status: string
        }
        Insert: {
          absence_reason?: string | null
          attended?: boolean | null
          completed?: boolean | null
          created_at?: string
          event_id: string
          id?: string
          notes?: string | null
          soldier_id: string
          status?: string
        }
        Update: {
          absence_reason?: string | null
          attended?: boolean | null
          completed?: boolean | null
          created_at?: string
          event_id?: string
          id?: string
          notes?: string | null
          soldier_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_attendance_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "work_plan_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_attendance_soldier_id_fkey"
            columns: ["soldier_id"]
            isOneToOne: false
            referencedRelation: "soldiers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_attendance_soldier_id_fkey"
            columns: ["soldier_id"]
            isOneToOne: false
            referencedRelation: "soldiers_basic"
            referencedColumns: ["id"]
          },
        ]
      }
      inspections: {
        Row: {
          combat_debrief_by: string | null
          combat_driver_in_debrief: boolean | null
          combat_driver_participated: boolean | null
          combat_score: number | null
          commander_name: string
          created_at: string
          created_by: string | null
          general_notes: string | null
          id: string
          inspection_date: string
          inspector_name: string
          platoon: string
          procedures_combat_equipment: boolean | null
          procedures_descent_drill: boolean | null
          procedures_fire_drill: boolean | null
          procedures_rollover_drill: boolean | null
          procedures_score: number | null
          procedures_weapon_present: boolean | null
          routes_familiarity_score: number | null
          routes_notes: string | null
          safety_driver_tools_extinguisher: boolean | null
          safety_driver_tools_jack: boolean | null
          safety_driver_tools_license: boolean | null
          safety_driver_tools_triangle: boolean | null
          safety_driver_tools_vest: boolean | null
          safety_driver_tools_wheel_key: boolean | null
          safety_score: number | null
          safety_ten_commandments: boolean | null
          simulations_questions: Json | null
          simulations_score: number | null
          soldier_id: string
          total_score: number | null
          updated_at: string
          vehicle_clean: boolean | null
          vehicle_equipment_secured: boolean | null
          vehicle_mission_sheet: boolean | null
          vehicle_score: number | null
          vehicle_tlt_nuts: boolean | null
          vehicle_tlt_oil: boolean | null
          vehicle_tlt_pressure: boolean | null
          vehicle_tlt_water: boolean | null
          vehicle_vardim_knowledge: boolean | null
          vehicle_work_card: boolean | null
        }
        Insert: {
          combat_debrief_by?: string | null
          combat_driver_in_debrief?: boolean | null
          combat_driver_participated?: boolean | null
          combat_score?: number | null
          commander_name: string
          created_at?: string
          created_by?: string | null
          general_notes?: string | null
          id?: string
          inspection_date: string
          inspector_name: string
          platoon: string
          procedures_combat_equipment?: boolean | null
          procedures_descent_drill?: boolean | null
          procedures_fire_drill?: boolean | null
          procedures_rollover_drill?: boolean | null
          procedures_score?: number | null
          procedures_weapon_present?: boolean | null
          routes_familiarity_score?: number | null
          routes_notes?: string | null
          safety_driver_tools_extinguisher?: boolean | null
          safety_driver_tools_jack?: boolean | null
          safety_driver_tools_license?: boolean | null
          safety_driver_tools_triangle?: boolean | null
          safety_driver_tools_vest?: boolean | null
          safety_driver_tools_wheel_key?: boolean | null
          safety_score?: number | null
          safety_ten_commandments?: boolean | null
          simulations_questions?: Json | null
          simulations_score?: number | null
          soldier_id: string
          total_score?: number | null
          updated_at?: string
          vehicle_clean?: boolean | null
          vehicle_equipment_secured?: boolean | null
          vehicle_mission_sheet?: boolean | null
          vehicle_score?: number | null
          vehicle_tlt_nuts?: boolean | null
          vehicle_tlt_oil?: boolean | null
          vehicle_tlt_pressure?: boolean | null
          vehicle_tlt_water?: boolean | null
          vehicle_vardim_knowledge?: boolean | null
          vehicle_work_card?: boolean | null
        }
        Update: {
          combat_debrief_by?: string | null
          combat_driver_in_debrief?: boolean | null
          combat_driver_participated?: boolean | null
          combat_score?: number | null
          commander_name?: string
          created_at?: string
          created_by?: string | null
          general_notes?: string | null
          id?: string
          inspection_date?: string
          inspector_name?: string
          platoon?: string
          procedures_combat_equipment?: boolean | null
          procedures_descent_drill?: boolean | null
          procedures_fire_drill?: boolean | null
          procedures_rollover_drill?: boolean | null
          procedures_score?: number | null
          procedures_weapon_present?: boolean | null
          routes_familiarity_score?: number | null
          routes_notes?: string | null
          safety_driver_tools_extinguisher?: boolean | null
          safety_driver_tools_jack?: boolean | null
          safety_driver_tools_license?: boolean | null
          safety_driver_tools_triangle?: boolean | null
          safety_driver_tools_vest?: boolean | null
          safety_driver_tools_wheel_key?: boolean | null
          safety_score?: number | null
          safety_ten_commandments?: boolean | null
          simulations_questions?: Json | null
          simulations_score?: number | null
          soldier_id?: string
          total_score?: number | null
          updated_at?: string
          vehicle_clean?: boolean | null
          vehicle_equipment_secured?: boolean | null
          vehicle_mission_sheet?: boolean | null
          vehicle_score?: number | null
          vehicle_tlt_nuts?: boolean | null
          vehicle_tlt_oil?: boolean | null
          vehicle_tlt_pressure?: boolean | null
          vehicle_tlt_water?: boolean | null
          vehicle_vardim_knowledge?: boolean | null
          vehicle_work_card?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "inspections_soldier_id_fkey"
            columns: ["soldier_id"]
            isOneToOne: false
            referencedRelation: "soldiers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inspections_soldier_id_fkey"
            columns: ["soldier_id"]
            isOneToOne: false
            referencedRelation: "soldiers_basic"
            referencedColumns: ["id"]
          },
        ]
      }
      map_points_of_interest: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean | null
          latitude: number
          longitude: number
          name: string
          point_type: string
          severity: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          latitude: number
          longitude: number
          name: string
          point_type?: string
          severity?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          latitude?: number
          longitude?: number
          name?: string
          point_type?: string
          severity?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      procedure_signatures: {
        Row: {
          created_at: string
          full_name: string
          id: string
          items_checked: string[]
          procedure_type: string
          signature: string
          user_id: string
        }
        Insert: {
          created_at?: string
          full_name: string
          id?: string
          items_checked?: string[]
          procedure_type: string
          signature: string
          user_id: string
        }
        Update: {
          created_at?: string
          full_name?: string
          id?: string
          items_checked?: string[]
          procedure_type?: string
          signature?: string
          user_id?: string
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
          military_role: string | null
          outpost: string | null
          personal_number: string | null
          platoon: string | null
          region: string | null
          updated_at: string
          user_id: string
          user_type: string | null
        }
        Insert: {
          created_at?: string
          full_name: string
          id?: string
          military_role?: string | null
          outpost?: string | null
          personal_number?: string | null
          platoon?: string | null
          region?: string | null
          updated_at?: string
          user_id: string
          user_type?: string | null
        }
        Update: {
          created_at?: string
          full_name?: string
          id?: string
          military_role?: string | null
          outpost?: string | null
          personal_number?: string | null
          platoon?: string | null
          region?: string | null
          updated_at?: string
          user_id?: string
          user_type?: string | null
        }
        Relationships: []
      }
      punishments: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          judge: string
          notes: string | null
          offense: string
          punishment: string
          punishment_date: string
          soldier_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          judge: string
          notes?: string | null
          offense: string
          punishment: string
          punishment_date: string
          soldier_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          judge?: string
          notes?: string | null
          offense?: string
          punishment?: string
          punishment_date?: string
          soldier_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "punishments_soldier_id_fkey"
            columns: ["soldier_id"]
            isOneToOne: false
            referencedRelation: "soldiers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "punishments_soldier_id_fkey"
            columns: ["soldier_id"]
            isOneToOne: false
            referencedRelation: "soldiers_basic"
            referencedColumns: ["id"]
          },
        ]
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
          latitude: number | null
          longitude: number | null
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
          latitude?: number | null
          longitude?: number | null
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
          latitude?: number | null
          longitude?: number | null
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
          latitude: number | null
          lessons_learned: string | null
          longitude: number | null
          title: string
          updated_at: string
        }
        Insert: {
          category: Database["public"]["Enums"]["safety_event_category"]
          created_at?: string
          description?: string | null
          event_date?: string | null
          id?: string
          latitude?: number | null
          lessons_learned?: string | null
          longitude?: number | null
          title: string
          updated_at?: string
        }
        Update: {
          category?: Database["public"]["Enums"]["safety_event_category"]
          created_at?: string
          description?: string | null
          event_date?: string | null
          id?: string
          latitude?: number | null
          lessons_learned?: string | null
          longitude?: number | null
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
          latitude: number | null
          longitude: number | null
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
          latitude?: number | null
          longitude?: number | null
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
          latitude?: number | null
          longitude?: number | null
          outpost?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      sector_boundaries: {
        Row: {
          boundary_points: Json
          color: string | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          updated_at: string
        }
        Insert: {
          boundary_points?: Json
          color?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          updated_at?: string
        }
        Update: {
          boundary_points?: Json
          color?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
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
      soldiers: {
        Row: {
          civilian_license_expiry: string | null
          correct_driving_in_service_date: string | null
          created_at: string
          defensive_driving_passed: boolean | null
          full_name: string
          id: string
          is_active: boolean | null
          military_license_expiry: string | null
          outpost: string | null
          personal_number: string
          qualified_date: string | null
          release_date: string | null
          updated_at: string
        }
        Insert: {
          civilian_license_expiry?: string | null
          correct_driving_in_service_date?: string | null
          created_at?: string
          defensive_driving_passed?: boolean | null
          full_name: string
          id?: string
          is_active?: boolean | null
          military_license_expiry?: string | null
          outpost?: string | null
          personal_number: string
          qualified_date?: string | null
          release_date?: string | null
          updated_at?: string
        }
        Update: {
          civilian_license_expiry?: string | null
          correct_driving_in_service_date?: string | null
          created_at?: string
          defensive_driving_passed?: boolean | null
          full_name?: string
          id?: string
          is_active?: boolean | null
          military_license_expiry?: string | null
          outpost?: string | null
          personal_number?: string
          qualified_date?: string | null
          release_date?: string | null
          updated_at?: string
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
      trip_forms: {
        Row: {
          created_at: string
          exit_briefing_by_officer: boolean
          form_date: string
          id: string
          notes: string | null
          officer_name: string | null
          personal_equipment_checked: boolean
          signature: string
          soldier_name: string
          uniform_class_a: boolean
          updated_at: string
          user_id: string
          vehicle_returned: boolean
          weapon_reset: boolean
        }
        Insert: {
          created_at?: string
          exit_briefing_by_officer?: boolean
          form_date?: string
          id?: string
          notes?: string | null
          officer_name?: string | null
          personal_equipment_checked?: boolean
          signature: string
          soldier_name: string
          uniform_class_a?: boolean
          updated_at?: string
          user_id: string
          vehicle_returned?: boolean
          weapon_reset?: boolean
        }
        Update: {
          created_at?: string
          exit_briefing_by_officer?: boolean
          form_date?: string
          id?: string
          notes?: string | null
          officer_name?: string | null
          personal_equipment_checked?: boolean
          signature?: string
          soldier_name?: string
          uniform_class_a?: boolean
          updated_at?: string
          user_id?: string
          vehicle_returned?: boolean
          weapon_reset?: boolean
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
      work_plan_events: {
        Row: {
          attendees: string[] | null
          category: string | null
          color: string | null
          created_at: string
          created_by: string | null
          description: string | null
          end_date: string | null
          event_date: string
          expected_soldiers: string[] | null
          id: string
          is_series: boolean | null
          series_id: string | null
          series_pattern: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          attendees?: string[] | null
          category?: string | null
          color?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_date?: string | null
          event_date: string
          expected_soldiers?: string[] | null
          id?: string
          is_series?: boolean | null
          series_id?: string | null
          series_pattern?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          attendees?: string[] | null
          category?: string | null
          color?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_date?: string | null
          event_date?: string
          expected_soldiers?: string[] | null
          id?: string
          is_series?: boolean | null
          series_id?: string | null
          series_pattern?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      soldiers_basic: {
        Row: {
          full_name: string | null
          id: string | null
          is_active: boolean | null
          outpost: string | null
          personal_number: string | null
        }
        Insert: {
          full_name?: string | null
          id?: string | null
          is_active?: boolean | null
          outpost?: string | null
          personal_number?: string | null
        }
        Update: {
          full_name?: string | null
          id?: string | null
          is_active?: boolean | null
          outpost?: string | null
          personal_number?: string | null
        }
        Relationships: []
      }
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