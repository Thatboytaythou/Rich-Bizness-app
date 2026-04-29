// =========================
// RICH BIZNESS AUTH — FINAL SYNCED
// /core/pages/auth.js
// Matches: /auth.html
// Language locked: Tap In / Tap Out / Join The Bizness / Reset Access
// =========================

import { initApp, getSupabase } from "/core/app.js";

await initApp();

const supabase = getSupabase();
const $ = (id) => document.getElementById(id);

const els = {
  status: $("auth-status"),

  panelTitle: $("auth-panel-title"),
  panelCopy: $("auth-panel-copy"),

  tabSignin: $("show-signin-btn"),
  tabSignup: $("show-signup-btn"),
  tabReset: $("show-reset-btn"),

  signinForm: $("signin-form"),
  signupForm: $("signup-form"),
  resetForm: $("reset-form"),

  signinEmail: $("signin-email"),
  signinPassword: $("signin-password"),
  signinSubmit: $("signin-submit-btn"),

  signupEmail: $("signup-email"),
  signupPassword: $("signup-password"),
  signupDisplayName: $("signup-display-name"),
  signupUsername: $("signup-username"),
  signupSubmit: $("signup-submit-btn"),

  resetEmail: $("reset-email"),
  resetSubmit: $("reset-submit-btn"),

  sessionPanel: $("auth-session-panel"),
  sessionTitle: $("auth-session-title"),
  sessionEmail: $("auth-session-email"),

  signoutBtn: $("signout-btn")
};

function setStatus(message, type = "normal") {
  if (!els.status) return;
  els.status.textContent = message;
  els.status.className = `auth-status ${type}`.trim();
}

function setLoading(button, loading, loadingText = "Working...") {
  if (!button) return;

  if (loading) {
    button.dataset.originalText = button.textContent || "";
    button.textContent = loadingText;
    button.disabled = true;
    return;
  }

  button.disabled = false;
  button.textContent = button.dataset.originalText || button.textContent;
}

function slugify(value = "") {
  return String(value)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9_]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

function getRedirect() {
  const url = new URL(window.location.href);
  return url.searchParams.get("next") || "/profile.html";
}

function showForm(type = "signin") {
  if (els.signinForm) els.signinForm.hidden = type !== "signin";
  if (els.signupForm) els.signupForm.hidden = type !== "signup";
  if (els.resetForm) els.resetForm.hidden = type !== "reset";

  els.tabSignin?.classList.toggle("active", type === "signin");
  els.tabSignin?.classList.toggle("is-active", type === "signin");

  els.tabSignup?.classList.toggle("active", type === "signup");
  els.tabSignup?.classList.toggle("is-active", type === "signup");

  els.tabReset?.classList.toggle("active", type === "reset");
  els.tabReset?.classList.toggle("is-active", type === "reset");

  if (type === "signin") {
    if (els.panelTitle) els.panelTitle.textContent = "Welcome back";
    if (els.panelCopy) els.panelCopy.textContent = "Tap in to continue building Rich Bizness.";
    setStatus("Ready to tap in.");
  }

  if (type === "signup") {
    if (els.panelTitle) els.panelTitle.textContent = "Join The Bizness";
    if (els.panelCopy) els.panelCopy.textContent = "Create your account and start building your empire.";
    setStatus("Ready to join.");
  }

  if (type === "reset") {
    if (els.panelTitle) els.panelTitle.textContent = "Reset Access";
    if (els.panelCopy) els.panelCopy.textContent = "Send yourself a reset access link.";
    setStatus("Ready to reset access.");
  }
}

async function upsertProfileForUser(user, { displayName = "", username = "" } = {}) {
  if (!user?.id) return null;

  const cleanUsername =
    slugify(username) ||
    slugify(displayName) ||
    slugify(user.email?.split("@")[0] || "richbizness");

  const payload = {
    id: user.id,
    email: user.email || null,
    display_name: displayName || user.user_metadata?.display_name || null,
    username: cleanUsername,
    updated_at: new Date().toISOString()
  };

  const { data, error } = await supabase
    .from("profiles")
    .upsert(payload, { onConflict: "id" })
    .select("*")
    .maybeSingle();

  if (error) {
    console.warn("[auth] profile sync failed:", error.message);
    return null;
  }

  return data || null;
}

async function handleTapIn(event) {
  event.preventDefault();

  const email = els.signinEmail?.value?.trim();
  const password = els.signinPassword?.value || "";

  if (!email || !password) {
    setStatus("Enter email and password to tap in.", "error");
    return;
  }

  setLoading(els.signinSubmit, true, "Tapping In...");
  setStatus("Tapping you in...");

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  setLoading(els.signinSubmit, false);

  if (error) {
    setStatus(error.message || "Tap In failed.", "error");
    return;
  }

  setStatus("Tapped in successfully.", "success");
  window.location.href = getRedirect();
}

async function handleJoinBizness(event) {
  event.preventDefault();

  const email = els.signupEmail?.value?.trim();
  const password = els.signupPassword?.value || "";
  const displayName = els.signupDisplayName?.value?.trim() || "";
  const username = slugify(els.signupUsername?.value || displayName);

  if (!email || !password) {
    setStatus("Email and password required to Join The Bizness.", "error");
    return;
  }

  if (password.length < 6) {
    setStatus("Password needs at least 6 characters.", "error");
    return;
  }

  setLoading(els.signupSubmit, true, "Joining...");
  setStatus("Creating your Rich Bizness account...");

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${window.location.origin}/auth.html?next=${encodeURIComponent("/profile.html")}`,
      data: {
        display_name: displayName || null,
        username: username || null
      }
    }
  });

  setLoading(els.signupSubmit, false);

  if (error) {
    setStatus(error.message || "Join The Bizness failed.", "error");
    return;
  }

  if (data?.user?.id) {
    await upsertProfileForUser(data.user, { displayName, username });
  }

  if (data?.session?.user) {
    setStatus("You joined and tapped in. Taking you to profile...", "success");
    window.location.href = getRedirect();
    return;
  }

  setStatus("Account created. Check your email if confirmation is required.", "success");
  showForm("signin");
}

async function handleResetAccess(event) {
  event.preventDefault();

  const email = els.resetEmail?.value?.trim();

  if (!email) {
    setStatus("Enter your email to reset access.", "error");
    return;
  }

  setLoading(els.resetSubmit, true, "Sending...");
  setStatus("Sending Reset Access link...");

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/auth.html?type=recovery`
  });

  setLoading(els.resetSubmit, false);

  if (error) {
    setStatus(error.message || "Reset Access failed.", "error");
    return;
  }

  setStatus("Reset Access email sent.", "success");
}

async function handleTapOut() {
  if (els.signoutBtn) {
    els.signoutBtn.disabled = true;
    els.signoutBtn.textContent = "Tapping Out...";
  }

  await supabase.auth.signOut();

  setStatus("Tapped out.", "success");

  if (els.sessionPanel) els.sessionPanel.hidden = true;

  window.location.href = "/auth.html";
}

async function checkSession() {
  const { data } = await supabase.auth.getSession();
  const user = data?.session?.user || null;

  if (user) {
    await upsertProfileForUser(user, {
      displayName: user.user_metadata?.display_name || "",
      username: user.user_metadata?.username || ""
    });

    if (els.sessionPanel) els.sessionPanel.hidden = false;
    if (els.sessionTitle) els.sessionTitle.textContent = "Tapped In";
    if (els.sessionEmail) els.sessionEmail.textContent = user.email || "—";

    setStatus("You are tapped in.", "success");
    return user;
  }

  if (els.sessionPanel) els.sessionPanel.hidden = true;
  return null;
}

function bindAuth() {
  els.tabSignin?.addEventListener("click", () => showForm("signin"));
  els.tabSignup?.addEventListener("click", () => showForm("signup"));
  els.tabReset?.addEventListener("click", () => showForm("reset"));

  els.signinForm?.addEventListener("submit", handleTapIn);
  els.signupForm?.addEventListener("submit", handleJoinBizness);
  els.resetForm?.addEventListener("submit", handleResetAccess);

  els.signoutBtn?.addEventListener("click", handleTapOut);

  supabase.auth.onAuthStateChange(async (_event, session) => {
    if (session?.user) {
      await upsertProfileForUser(session.user, {
        displayName: session.user.user_metadata?.display_name || "",
        username: session.user.user_metadata?.username || ""
      });
    }

    await checkSession();
  });
}

async function bootAuth() {
  bindAuth();

  const type = new URLSearchParams(window.location.search).get("type");

  if (type === "recovery") {
    showForm("reset");
    setStatus("Reset Access mode opened. Use your email flow to update password if enabled.", "success");
  } else {
    showForm("signin");
  }

  await checkSession();
}

bootAuth().catch((error) => {
  console.error("[auth] boot error:", error);
  setStatus(error.message || "Auth failed to load.", "error");
});
