// =========================
// RICH BIZNESS DIGITAL ASSETS — FULL SYNCED
// /core/features/profile/digital-assets.js
// =========================

import { getSupabase, getCurrentUserState } from "/core/app.js";

const supabase = getSupabase();

/* =========================
   ELEMENTS
========================= */

const $ = (id) => document.getElementById(id);

const els = {
  list: $("digital-assets-list"),
  empty: $("digital-assets-empty"),

  uploadInput: $("digital-asset-upload-input"),
  uploadBtn: $("digital-asset-upload-btn"),

  titleInput: $("digital-asset-title"),
  typeSelect: $("digital-asset-type"),

  status: $("digital-assets-status")
};

/* =========================
   STATE
========================= */

let assets = [];

/* =========================
   HELPERS
========================= */

function setStatus(msg, type = "normal") {
  if (!els.status) return;

  els.status.textContent = msg;
  els.status.className = "status-box";

  if (type === "success") els.status.classList.add("is-success");
  if (type === "error") els.status.classList.add("is-error");
}

function formatDate(v) {
  if (!v) return "—";
  const d = new Date(v);
  return isNaN(d.getTime()) ? "—" : d.toLocaleString();
}

function getExt(file) {
  return file?.name?.split(".").pop()?.toLowerCase() || "bin";
}

/* =========================
   LOAD ASSETS
========================= */

export async function loadDigitalAssets() {
  try {
    const user = getCurrentUserState();
    if (!user?.id) return;

    const { data, error } = await supabase
      .from("uploads")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("load assets error:", error);
      setStatus(error.message, "error");
      return;
    }

    assets = data || [];
    renderAssets();
  } catch (err) {
    console.error("loadDigitalAssets crash:", err);
  }
}

/* =========================
   RENDER
========================= */

function renderAssets() {
  if (!els.list) return;

  if (!assets.length) {
    els.list.innerHTML = "";
    if (els.empty) els.empty.style.display = "";
    return;
  }

  if (els.empty) els.empty.style.display = "none";

  els.list.innerHTML = assets.map((a) => `
    <div class="asset-card">
      <div class="asset-preview">
        ${
          a.file_url?.match(/\.(mp4|webm|mov)$/i)
            ? `<video src="${a.file_url}" controls></video>`
            : `<img src="${a.thumbnail_url || a.file_url}" alt="asset" />`
        }
      </div>

      <div class="asset-meta">
        <strong>${a.title || "Untitled Asset"}</strong>
        <span>${a.content_type || "file"}</span>
        <small>${formatDate(a.created_at)}</small>
      </div>

      <div class="asset-actions">
        <button class="btn btn-dark" data-delete="${a.id}">Delete</button>
      </div>
    </div>
  `).join("");
}

/* =========================
   UPLOAD
========================= */

async function uploadAsset() {
  try {
    const user = getCurrentUserState();
    if (!user?.id) {
      setStatus("You must be signed in.", "error");
      return;
    }

    const file = els.uploadInput?.files?.[0];
    if (!file) {
      setStatus("Select a file first.", "error");
      return;
    }

    setStatus("Uploading asset...");

    const ext = getExt(file);
    const path = `${user.id}/${Date.now()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("uploads")
      .upload(path, file, { upsert: true });

    if (uploadError) {
      console.error("upload error:", uploadError);
      setStatus(uploadError.message, "error");
      return;
    }

    const { data: urlData } = supabase.storage
      .from("uploads")
      .getPublicUrl(path);

    const publicUrl = urlData?.publicUrl;

    const { error: insertError } = await supabase
      .from("uploads")
      .insert({
        user_id: user.id,
        title: els.titleInput?.value || file.name,
        content_type: els.typeSelect?.value || "file",
        file_url: publicUrl,
        created_at: new Date().toISOString()
      });

    if (insertError) {
      console.error("insert error:", insertError);
      setStatus(insertError.message, "error");
      return;
    }

    els.uploadInput.value = "";
    setStatus("Asset uploaded.", "success");

    await loadDigitalAssets();
  } catch (err) {
    console.error("uploadAsset crash:", err);
    setStatus("Upload failed.", "error");
  }
}

/* =========================
   DELETE
========================= */

async function deleteAsset(id) {
  try {
    const user = getCurrentUserState();
    if (!user?.id || !id) return;

    setStatus("Deleting asset...");

    const { error } = await supabase
      .from("uploads")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) {
      console.error("delete error:", error);
      setStatus(error.message, "error");
      return;
    }

    setStatus("Asset deleted.", "success");
    await loadDigitalAssets();
  } catch (err) {
    console.error("deleteAsset crash:", err);
  }
}

/* =========================
   EVENTS
========================= */

function bindEvents() {
  els.uploadBtn?.addEventListener("click", uploadAsset);

  els.list?.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-delete]");
    if (!btn) return;

    const id = btn.getAttribute("data-delete");
    deleteAsset(id);
  });
}

/* =========================
   BOOT
========================= */

export function bootDigitalAssets() {
  bindEvents();
  loadDigitalAssets();
}
