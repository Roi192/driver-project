import { supabase } from "@/integrations/supabase/client";
import { extractFilePath } from "./storage-utils";

export const SHIFT_PHOTOS_BUCKET = "shift-photos";

const FALLBACK_EXTENSION = "jpg";

const resolveFileExtension = (file: File) => {
  const fromMime = file.type?.split("/")?.[1]?.toLowerCase()?.split(";")?.[0];
  const fromName = file.name?.split(".")?.pop()?.toLowerCase();
  const extension = fromMime || fromName || FALLBACK_EXTENSION;

  return extension === "jpeg" ? "jpg" : extension;
};

export const normalizeShiftPhotoPath = (value: string | null | undefined): string | null => {
  if (!value) return null;
  return extractFilePath(value, SHIFT_PHOTOS_BUCKET) ?? value;
};

export async function uploadShiftPhoto(params: {
  file: File;
  userId: string;
  photoId: string;
}): Promise<string> {
  const extension = resolveFileExtension(params.file);
  const filePath = `${params.userId}/drafts/${params.photoId}_${Date.now()}.${extension}`;

  const { error } = await supabase.storage.from(SHIFT_PHOTOS_BUCKET).upload(filePath, params.file, {
    contentType: params.file.type || "image/jpeg",
    upsert: true,
  });

  if (error) {
    throw error;
  }

  return filePath;
}

export async function deleteShiftPhoto(pathOrUrl?: string | null): Promise<void> {
  const normalizedPath = normalizeShiftPhotoPath(pathOrUrl);
  if (!normalizedPath) return;

  const { error } = await supabase.storage.from(SHIFT_PHOTOS_BUCKET).remove([normalizedPath]);

  if (error) {
    throw error;
  }
}