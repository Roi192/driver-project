import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "./use-toast";
import { COMBAT_EQUIPMENT, PRE_MOVEMENT_CHECKS, DRIVER_TOOLS, DRILLS } from "@/lib/constants";

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
  photos: Record<string, string | File>;
}

type RequiredPhotoKey = "front" | "left" | "right" | "back" | "steering";

const REQUIRED_PHOTO_KEYS: RequiredPhotoKey[] = ["front", "left", "right", "back", "steering"];


interface UploadedPhoto {
  path: string;
  signedUrl: string;
}

interface PhotoUpdatePayload {
  photo_front: string | null;
  photo_left: string | null;
  photo_right: string | null;
  photo_back: string | null;
  photo_steering_wheel: string | null;
  is_complete: boolean;
}

export function useShiftReport() {
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const resolvePhotoBlob = async (photoData: string | File): Promise<Blob> => {
    if (photoData instanceof Blob) {
      return photoData;
    }

    if (typeof photoData === "string") {
      const response = await fetch(photoData);
      if (!response.ok) {
        throw new Error("Failed to read photo data");
      }
      return await response.blob();
    }

    throw new Error("Unsupported photo format");
  };

  const uploadPhoto = async (
    photoData: string | File,
    photoType: RequiredPhotoKey,
    reportId: string
  ): Promise<UploadedPhoto> => {
    const blob = await resolvePhotoBlob(photoData);

    const rawMimeExtension = blob.type?.split("/")?.[1]?.toLowerCase()?.split(";")?.[0];
    const extension = rawMimeExtension === "jpeg" ? "jpg" : (rawMimeExtension || "jpg");
    const contentType = blob.type || "image/jpeg";
    const fileName = `${user?.id}/${reportId}/${photoType}_${Date.now()}.${extension}`;

    const { error: uploadError } = await supabase.storage
      .from("shift-photos")
      .upload(fileName, blob, {
        contentType,
        upsert: true,
      });

    if (uploadError) {
      throw uploadError;
    }

    const { data: signedUrlData, error: signedUrlError } = await supabase.storage
      .from("shift-photos")
      .createSignedUrl(fileName, 60 * 60 * 24 * 7);

    if (signedUrlError || !signedUrlData?.signedUrl) {
      throw signedUrlError || new Error("Failed to create signed URL");
    }

    return {
      path: fileName,
      signedUrl: signedUrlData.signedUrl,
    };
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

    let createdReportId: string | null = null;
    const uploadedPaths: string[] = [];

    try {
      for (const key of REQUIRED_PHOTO_KEYS) {
        if (!formData.photos[key]) {
          throw new Error(`Missing required photo: ${key}`);
        }
      }

      const reportDate = formData.dateTime.toISOString().split("T")[0];
      const reportTime = formData.dateTime.toTimeString().split(" ")[0];

      const { data: report, error: insertError } = await supabase
        .from("shift_reports")
        .insert({
          user_id: user.id,
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
          is_complete: false,
        })
        .select()
        .single();

      if (insertError || !report) {
        throw insertError || new Error("Failed to create report");
      }

      createdReportId = report.id;

      const uploadedEntries = await Promise.all(
        REQUIRED_PHOTO_KEYS.map(async (key) => {
          const uploadResult = await uploadPhoto(formData.photos[key], key, report.id);
          uploadedPaths.push(uploadResult.path);
          return [key, uploadResult.signedUrl] as const;
        })
      );

      const photoUrls = Object.fromEntries(uploadedEntries) as Record<RequiredPhotoKey, string>;

      const updatePayload: PhotoUpdatePayload = {
        photo_front: null,
        photo_left: null,
        photo_right: null,
        photo_back: null,
        photo_steering_wheel: null,
        is_complete: true,
      };

      for (const key of REQUIRED_PHOTO_KEYS) {
        const photoUrl = photoUrls[key] || null;

        switch (key) {
          case "front":
            updatePayload.photo_front = photoUrl;
            break;
          case "left":
            updatePayload.photo_left = photoUrl;
            break;
          case "right":
            updatePayload.photo_right = photoUrl;
            break;
          case "back":
            updatePayload.photo_back = photoUrl;
            break;
          case "steering":
            updatePayload.photo_steering_wheel = photoUrl;
            break;
        }
      }

      const { error: updateError } = await supabase
        .from("shift_reports")
        .update(updatePayload)
        .eq("id", report.id);

      if (updateError) {
        throw updateError;
      }

      return true;
    } catch (error) {
      console.error("Submit error:", error);

      if (uploadedPaths.length > 0) {
        const { error: removeError } = await supabase.storage.from("shift-photos").remove(uploadedPaths);
        if (removeError) {
          console.error("Failed to cleanup uploaded photos:", removeError);
        }
      }

      if (createdReportId) {
        const { error: rollbackError } = await supabase
          .from("shift_reports")
          .delete()
          .eq("id", createdReportId);

        if (rollbackError) {
          console.error("Failed to rollback partial report:", rollbackError);
        }
      }

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