import { supabase } from "@/integrations/supabase/client";
import { extractFilePath } from "./storage-utils";

export const SHIFT_PHOTOS_BUCKET = "shift-photos";

const FALLBACK_EXTENSION = "jpg";

const resolveFileExtension = (file: File) => {
  const fromMime = file.type?.split("/")?.[1]?.toLowerCase()?.split(";")?.[0];
  const fromName = file.name?.split(".")?.pop()?.toLowerCase();
  const extension = fromMime || fromName || FALLBACK_EXTENSION;

  if (extension === "jpeg") return "jpg";
  return extension;
};

const getUploadErrorMessage = (error: unknown): string => {
  if (!error) return "Unknown upload error";
  if (error instanceof Error) return error.message;

  if (typeof error === "object" && error !== null) {
    const maybeMessage = (error as { message?: string }).message;
    if (typeof maybeMessage === "string" && maybeMessage.length > 0) {
      return maybeMessage;
    }
  }

  return String(error);
};

export const normalizeShiftPhotoPath = (
  value: string | null | undefined
): string | null => {
  if (!value) return null;
  return extractFilePath(value, SHIFT_PHOTOS_BUCKET) ?? value;
};

const getAuthenticatedUserId = async (fallbackUserId?: string): Promise<string> => {
  if (typeof fallbackUserId === "string" && fallbackUserId.trim().length > 0) {
    return fallbackUserId.trim();
  }

  const { data: sessionData } = await supabase.auth.getSession();
  if (sessionData.session?.user?.id) {
    return sessionData.session.user.id;
  }

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (!userError && userData.user?.id) {
    return userData.user.id;
  }

  const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
  if (!refreshError && refreshData.session?.user?.id) {
    return refreshData.session.user.id;
  }

  throw new Error("AUTH_REQUIRED: Missing authenticated session");
};

export async function uploadShiftPhoto(params: {
  file: File;
  photoId: string;
  userId?: string;
}): Promise<string> {
  const { file, photoId, userId } = params;

  if (!file) {
    throw new Error("לא התקבל קובץ תמונה");
  }

  if (file.size <= 0) {
    throw new Error("קובץ התמונה ריק");
  }

  const authenticatedUserId = await getAuthenticatedUserId(userId);
  const extension = resolveFileExtension(file);

  const safePhotoId = String(photoId)
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-zA-Z0-9-_]/g, "")
    .toLowerCase();

  const filePath = `${authenticatedUserId}/drafts/${safePhotoId}_${Date.now()}.${extension}`;

  const { error } = await supabase.storage
    .from(SHIFT_PHOTOS_BUCKET)
    .upload(filePath, file, {
      contentType: "image/jpeg",
      upsert: true,
      cacheControl: "3600",
    });

  if (error) {
    throw new Error(getUploadErrorMessage(error));
  }

  return filePath;
}

export async function deleteShiftPhoto(pathOrUrl?: string | null): Promise<void> {
  const normalizedPath = normalizeShiftPhotoPath(pathOrUrl);
  if (!normalizedPath) return;

  const { error } = await supabase.storage
    .from(SHIFT_PHOTOS_BUCKET)
    .remove([normalizedPath]);

  if (error) {
    throw error;
  }
}