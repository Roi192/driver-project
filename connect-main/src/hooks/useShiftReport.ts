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
  photos: Record<string, string>;
}

export function useShiftReport() {
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const compressImageBlob = async (
    input: Blob,
    options: { maxDimension: number; quality: number } = { maxDimension: 1600, quality: 0.75 }
  ): Promise<Blob> => {
    try {
      const bitmap = await createImageBitmap(input);
      const ratio = Math.min(1, options.maxDimension / Math.max(bitmap.width, bitmap.height));
      const targetW = Math.max(1, Math.round(bitmap.width * ratio));
      const targetH = Math.max(1, Math.round(bitmap.height * ratio));

      const canvas = document.createElement("canvas");
      canvas.width = targetW;
      canvas.height = targetH;

      const ctx = canvas.getContext("2d");
      if (!ctx) return input;

      ctx.drawImage(bitmap, 0, 0, targetW, targetH);
      bitmap.close?.();

      const output = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/jpeg", options.quality)
      );

      return output ?? input;
    } catch {
      return input;
    }
  };

  const uploadPhoto = async (
    base64Data: string,
    photoType: string,
    reportId: string
  ): Promise<string | null> => {
    try {
      // Convert base64 to blob, then compress for storage savings
      const base64Response = await fetch(base64Data);
      const originalBlob = await base64Response.blob();
      const blob = await compressImageBlob(originalBlob);

      const fileName = `${user?.id}/${reportId}/${photoType}_${Date.now()}.jpg`;

      const { error: uploadError } = await supabase.storage
        .from("shift-photos")
        .upload(fileName, blob, {
          contentType: "image/jpeg",
          upsert: true,
        });

      if (uploadError) {
        console.error("Upload error:", uploadError);
        return null;
      }

      // Create a signed URL valid for 1 year (31536000 seconds) for private bucket access
      const { data: signedUrlData, error: signedUrlError } = await supabase.storage
        .from("shift-photos")
        .createSignedUrl(fileName, 31536000);

      if (signedUrlError || !signedUrlData?.signedUrl) {
        console.error("Signed URL error:", signedUrlError);
        return null;
      }

      return signedUrlData.signedUrl;
    } catch (error) {
      console.error("Photo upload failed:", error);
      return null;
    }
  };

  const mapShiftType = (shiftType: string): "morning" | "afternoon" | "evening" => {
    // Current UI stores english enum values
    if (shiftType === "morning" || shiftType === "afternoon" || shiftType === "evening") {
      return shiftType;
    }

    // Backwards compatibility (old UI stored hebrew labels)
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

    try {
      // Create the report first to get the ID
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

      // Upload photos if any
      const photoUrls: Record<string, string | null> = {};
      const photoKeys = Object.keys(formData.photos);

      for (const key of photoKeys) {
        const photoData = formData.photos[key];
        if (photoData) {
          const url = await uploadPhoto(photoData, key, report.id);
          photoUrls[key] = url;
        }
      }

      // Update report with photo URLs and mark as complete
      const { error: updateError } = await supabase
        .from("shift_reports")
        .update({
          photo_front: photoUrls.front || null,
          photo_left: photoUrls.left || null,
          photo_right: photoUrls.right || null,
          photo_back: photoUrls.back || null,
          photo_steering_wheel: photoUrls.steering || null,
          is_complete: true,
        })
        .eq("id", report.id);

      if (updateError) {
        throw updateError;
      }

      return true;
    } catch (error) {
      console.error("Submit error:", error);
      toast({
        title: "שגיאה בשליחת הדיווח",
        description: "נסה שוב מאוחר יותר",
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