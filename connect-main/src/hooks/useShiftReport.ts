import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "./use-toast";
import { COMBAT_EQUIPMENT, PRE_MOVEMENT_CHECKS, DRIVER_TOOLS, DRILLS } from "@/lib/constants";
import { normalizeShiftPhotoPath } from "@/lib/shift-photo-storage";

interface ShiftFormData {
  dateTime: Date;
  outpost: string;
  driverName: string;
  vehicleNumber: string;
  shiftType: string;
  emergencyProcedure: boolean | undefined;
  commanderBriefing: boolean | undefined;
  workCardFilled: boolean | undefined;
  combatEquipment: string[];
  preMovementChecks: string[];
  driverTools: string[];
  drillsCompleted: string[];
  safetyVulnerabilities: string;
  vardimProcedure: string;
  vardimPoints: string;
  vehicleNotes: string;
  photos: Record<string, string>;
}

type RequiredPhotoKey = "front" | "left" | "right" | "back" | "steering";

const REQUIRED_PHOTO_KEYS: RequiredPhotoKey[] = ["front", "left", "right", "back", "steering"];

interface PhotoUpdatePayload {
  photo_front: string;
  photo_left: string;
  photo_right: string;
  photo_back: string;
  photo_steering_wheel: string;
  is_complete: boolean;
}

const toStoredPhotoPath = (value: string | undefined, key: RequiredPhotoKey): string => {
  if (!value || value.trim().length === 0) {
    throw new Error(`Missing required photo: ${key}`);
  }

  const normalized = normalizeShiftPhotoPath(value);
  if (!normalized) {
    throw new Error(`Invalid photo path: ${key}`);
  }

  return normalized;
};

const mapShiftType = (shiftType: string): "morning" | "afternoon" | "evening" => {
  if (shiftType === "morning" || shiftType === "afternoon" || shiftType === "evening") {
    return shiftType;
  }

  if (shiftType.includes("בוקר")) return "morning";
  if (shiftType.includes("צהריים")) return "afternoon";
  if (shiftType.includes("ערב")) return "evening";

  return "evening";
};

const buildPhotoPayload = (photos: Record<string, string>): PhotoUpdatePayload => ({
  photo_front: toStoredPhotoPath(photos.front, "front"),
  photo_left: toStoredPhotoPath(photos.left, "left"),
  photo_right: toStoredPhotoPath(photos.right, "right"),
  photo_back: toStoredPhotoPath(photos.back, "back"),
  photo_steering_wheel: toStoredPhotoPath(photos.steering, "steering"),
  is_complete: true,
});

export function useShiftReport() {
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const resolveAuthenticatedUserId = async (): Promise<string> => {
    if (user?.id) {
      return user.id;
    }

    const { data: sessionData } = await supabase.auth.getSession();
    if (sessionData.session?.user?.id) {
      return sessionData.session.user.id;
    }

    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (!authError && authData.user?.id) {
      return authData.user.id;
    }

    const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
    if (!refreshError && refreshData.session?.user?.id) {
      return refreshData.session.user.id;
    }

    throw new Error("AUTH_REQUIRED: Missing authenticated session");
  };

  const submitReport = async (formData: ShiftFormData): Promise<boolean> => {
    if (!user) {
      toast({
        title: "שגיאה",
        description: "יש להתחבר כדי לשלוח דיווח",
        variant: "destructive",
      });
      return false;
    }

    setIsSubmitting(true);

    try {
      const authenticatedUserId = await resolveAuthenticatedUserId();

      for (const key of REQUIRED_PHOTO_KEYS) {
        if (!formData.photos[key] || formData.photos[key].trim().length === 0) {
          throw new Error(`Missing required photo: ${key}`);
        }
      }

      const reportDate = formData.dateTime.toISOString().split("T")[0];
      const reportTime = formData.dateTime.toTimeString().split(" ")[0];
      const photoPayload = buildPhotoPayload(formData.photos);

      const { error: insertError } = await supabase.from("shift_reports").insert({
        user_id: authenticatedUserId,
        report_date: reportDate,
        report_time: reportTime,
        outpost: formData.outpost,
        driver_name: formData.driverName,
        vehicle_number: formData.vehicleNumber,
        shift_type: mapShiftType(formData.shiftType),
        emergency_procedure_participation: formData.emergencyProcedure ?? false,
        commander_briefing_attendance: formData.commanderBriefing ?? false,
        work_card_completed: formData.workCardFilled ?? false,
        has_ceramic_vest: formData.combatEquipment.includes(COMBAT_EQUIPMENT[0]),
        has_helmet: formData.combatEquipment.includes(COMBAT_EQUIPMENT[1]),
        has_personal_weapon: formData.combatEquipment.includes(COMBAT_EQUIPMENT[2]),
        has_ammunition: formData.combatEquipment.includes(COMBAT_EQUIPMENT[3]),
        pre_movement_checks_completed: formData.preMovementChecks.length === PRE_MOVEMENT_CHECKS.length,
        pre_movement_items_checked: formData.preMovementChecks,
        driver_tools_checked: formData.driverTools.length === DRIVER_TOOLS.length,
        driver_tools_items_checked: formData.driverTools,
        descent_drill_completed: formData.drillsCompleted.includes(DRILLS[0]),
        rollover_drill_completed: formData.drillsCompleted.includes(DRILLS[1]),
        fire_drill_completed: formData.drillsCompleted.includes(DRILLS[2]),
        safety_vulnerabilities: formData.safetyVulnerabilities || null,
        vardim_procedure_explanation: formData.vardimProcedure || null,
        vardim_points: formData.vardimPoints || null,
        vehicle_notes: formData.vehicleNotes || null,
        ...photoPayload,
      });

      if (insertError) {
        throw insertError;
      }

      return true;
    } catch (error) {
      console.error("Submit error:", error);

      toast({
        title: "שגיאה בשליחת הדיווח",
        description: "שליחת התמונות נכשלה. נסה שוב.",
        variant: "destructive",
      });
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    submitReport,
    isSubmitting,
  };
}