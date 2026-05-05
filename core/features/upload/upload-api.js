// =========================
// RICH BIZNESS UPLOAD API — SUPABASE STORAGE
// /core/features/upload/upload-api.js
// =========================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// =========================
// INIT SUPABASE (LOCKED TO YOUR PROJECT)
// =========================

const supabase = createClient(
  window.NEXT_PUBLIC_SUPABASE_URL,
  window.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
);

// =========================
// MAIN UPLOAD FUNCTION
// =========================

export async function sendUploadToServer(file) {
  try {
    if (!file) {
      return { success: false, error: "No file provided" };
    }

    // =========================
    // GENERATE UNIQUE FILE NAME
    // =========================
    const fileExt = file.name.split(".").pop();
    const fileName = `${Date.now()}-${Math.random()
      .toString(36)
      .substring(2)}.${fileExt}`;

    const filePath = `uploads/${fileName}`;

    // =========================
    // UPLOAD TO STORAGE
    // =========================
    const { error: uploadError } = await supabase.storage
      .from("uploads") // bucket name
      .upload(filePath, file);

    if (uploadError) {
      throw uploadError;
    }

    // =========================
    // GET PUBLIC URL
    // =========================
    const { data } = supabase.storage
      .from("uploads")
      .getPublicUrl(filePath);

    const publicUrl = data?.publicUrl;

    // =========================
    // RETURN RESULT
    // =========================
    return {
      success: true,
      url: publicUrl
    };

  } catch (err) {
    console.error("Upload API error:", err);
    return {
      success: false,
      error: err.message
    };
  }
}
