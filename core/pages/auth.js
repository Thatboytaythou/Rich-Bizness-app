// =========================
// RICH BIZNESS AUTH — FINAL SYNCED + SYSTEM CONNECT
// /core/pages/auth.js
// =========================

import { initApp, getSupabase } from "/core/app.js";

await initApp();

const supabase = getSupabase();
const $ = (id) => document.getElementById(id);

// =========================
// ELEMENTS
// =========================

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

// =========================
// HELPERS
// =========================

function setStatus(message, type = "normal") {
  if (!els.status) return;
  els.status.textContent = message;
  els.status.className = `auth-status ${type}`;
}

function setLoading(button, loading, text = "Working...") {
  if (!button) return;

  if (loading) {
    button.dataset.original = button.textContent;
    button.textContent = text;
    button.disabled = true;
  } else {
    button.textContent = button.dataset.original || button.textContent;
    button.disabled = false;
  }
}

function slugify(value = "") {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-");
}

function getRedirect() {
  return new URL(window.location.href).searchParams.get("next") || "/profile.html";
}

// =========================
// 🔥 SYSTEM SYNC (NEW)
// =========================

async function syncUserSystem(user) {
  if (!user?.id) return;

  // 🔥 ensure profile exists
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  // 🔥 cache avatar for metaverse
  const avatarData = {
    id: user.id,
    name: profile?.display_name || user.email,
    avatar: profile?.avatar_url || "/images/brand/1E7155FE-1726-4D71-964F-B0337A2E80A1.png",
    avatar_type: profile?.avatar_type || "gta",
    avatar_style: profile?.avatar_style || "hybrid"
  };

  localStorage.setItem("rb_meta_avatar", JSON.stringify(avatarData));

  // 🔥 global session cache (future use)
  localStorage.setItem("rb_user", JSON.stringify({
    id: user.id,
    email: user.email
  }));
}

// =========================
// FORM SWITCHING
// =========================

function showForm(type) {
  els.signinForm.hidden = type !== "signin";
  els.signupForm.hidden = type !== "signup";
  els.resetForm.hidden = type !== "reset";

  els.tabSignin.classList.toggle("active", type === "signin");
  els.tabSignup.classList.toggle("active", type === "signup");
  els.tabReset.classList.toggle("active", type === "reset");
}

// =========================
// SIGN IN
// =========================

async function handleTapIn(e) {
  e.preventDefault();

  const email = els.signinEmail.value.trim();
  const password = els.signinPassword.value;

  setLoading(els.signinSubmit, true, "Tapping In...");
  setStatus("Connecting...");

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  setLoading(els.signinSubmit, false);

  if (error) {
    setStatus(error.message, "error");
    return;
  }

  await syncUserSystem(data.user);

  setStatus("Tapped In ✅", "success");

  window.location.href = getRedirect();
}

// =========================
// SIGN UP
// =========================

async function handleJoin(e) {
  e.preventDefault();

  const email = els.signupEmail.value.trim();
  const password = els.signupPassword.value;
  const displayName = els.signupDisplayName.value.trim();
  const username = slugify(els.signupUsername.value || displayName);

  setLoading(els.signupSubmit, true, "Joining...");
  setStatus("Creating account...");

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        display_name: displayName,
        username
      }
    }
  });

  setLoading(els.signupSubmit, false);

  if (error) {
    setStatus(error.message, "error");
    return;
  }

  if (data?.user) {
    await supabase.from("profiles").upsert({
      id: data.user.id,
      email,
      display_name: displayName,
      username
    });

    await syncUserSystem(data.user);
  }

  setStatus("Account created ✅", "success");

  window.location.href = getRedirect();
}

// =========================
// RESET
// =========================

async function handleReset(e) {
  e.preventDefault();

  const email = els.resetEmail.value.trim();

  setLoading(els.resetSubmit, true, "Sending...");
  setStatus("Sending reset...");

  const { error } = await supabase.auth.resetPasswordForEmail(email);

  setLoading(els.resetSubmit, false);

  if (error) {
    setStatus(error.message, "error");
    return;
  }

  setStatus("Reset email sent ✅", "success");
}

// =========================
// SIGN OUT
// =========================

async function handleSignOut() {
  await supabase.auth.signOut();

  localStorage.removeItem("rb_meta_avatar");
  localStorage.removeItem("rb_user");

  window.location.href = "/auth.html";
}

// =========================
// SESSION CHECK
// =========================

async function checkSession() {
  const { data } = await supabase.auth.getSession();
  const user = data?.session?.user;

  if (user) {
    await syncUserSystem(user);

    els.sessionPanel.hidden = false;
    els.sessionEmail.textContent = user.email;

    setStatus("Already tapped in.");
  } else {
    els.sessionPanel.hidden = true;
  }
}

// =========================
// EVENTS
// =========================

function bindEvents() {
  els.tabSignin.onclick = () => showForm("signin");
  els.tabSignup.onclick = () => showForm("signup");
  els.tabReset.onclick = () => showForm("reset");

  els.signinForm.onsubmit = handleTapIn;
  els.signupForm.onsubmit = handleJoin;
  els.resetForm.onsubmit = handleReset;

  els.signoutBtn.onclick = handleSignOut;
}

// =========================
// BOOT
// =========================

async function boot() {
  bindEvents();
  showForm("signin");
  await checkSession();
}

boot();
