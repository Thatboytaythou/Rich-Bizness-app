// =========================
// RICH BIZNESS AUTH — FINAL SYSTEM
// /core/pages/auth.js
// Handles: sign in, sign up, reset, session, redirect
// =========================

import {
  initApp,
  getSupabase
} from "/core/app.js";

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

  signupEmail: $("signup-email"),
  signupPassword: $("signup-password"),
  signupDisplayName: $("signup-display-name"),
  signupUsername: $("signup-username"),

  resetEmail: $("reset-email"),

  sessionPanel: $("auth-session-panel"),
  sessionEmail: $("auth-session-email"),

  signoutBtn: $("signout-btn")
};

function setStatus(message, type = "normal") {
  if (!els.status) return;
  els.status.textContent = message;
  els.status.className = `auth-status ${type}`;
}

function showForm(type) {
  els.signinForm.hidden = type !== "signin";
  els.signupForm.hidden = type !== "signup";
  els.resetForm.hidden = type !== "reset";

  els.tabSignin.classList.toggle("active", type === "signin");
  els.tabSignup.classList.toggle("active", type === "signup");
  els.tabReset.classList.toggle("active", type === "reset");

  if (type === "signin") {
    els.panelTitle.textContent = "Welcome back";
    els.panelCopy.textContent = "Sign in to continue building Rich Bizness.";
  }

  if (type === "signup") {
    els.panelTitle.textContent = "Create your account";
    els.panelCopy.textContent = "Start your Rich Bizness empire.";
  }

  if (type === "reset") {
    els.panelTitle.textContent = "Reset password";
    els.panelCopy.textContent = "We’ll send you a reset link.";
  }
}

function getRedirect() {
  const url = new URL(window.location.href);
  return url.searchParams.get("next") || "/profile.html";
}

async function handleSignIn(e) {
  e.preventDefault();

  const email = els.signinEmail.value.trim();
  const password = els.signinPassword.value;

  if (!email || !password) {
    setStatus("Enter email and password.", "error");
    return;
  }

  setStatus("Signing in...");

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    setStatus(error.message || "Sign in failed.", "error");
    return;
  }

  setStatus("Signed in successfully.", "success");

  window.location.href = getRedirect();
}

async function handleSignUp(e) {
  e.preventDefault();

  const email = els.signupEmail.value.trim();
  const password = els.signupPassword.value;
  const displayName = els.signupDisplayName.value.trim();
  const username = els.signupUsername.value.trim();

  if (!email || !password) {
    setStatus("Email and password required.", "error");
    return;
  }

  setStatus("Creating account...");

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        display_name: displayName || null,
        username: username || null
      }
    }
  });

  if (error) {
    setStatus(error.message || "Sign up failed.", "error");
    return;
  }

  setStatus("Account created. Check your email if confirmation is required.", "success");

  // optional: create profile row
  if (data?.user?.id) {
    await supabase.from("profiles").upsert({
      id: data.user.id,
      display_name: displayName || null,
      username: username || null,
      created_at: new Date().toISOString()
    });
  }
}

async function handleReset(e) {
  e.preventDefault();

  const email = els.resetEmail.value.trim();

  if (!email) {
    setStatus("Enter your email.", "error");
    return;
  }

  setStatus("Sending reset link...");

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: window.location.origin + "/auth.html"
  });

  if (error) {
    setStatus(error.message || "Reset failed.", "error");
    return;
  }

  setStatus("Reset email sent.", "success");
}

async function handleSignOut() {
  await supabase.auth.signOut();
  setStatus("Signed out.", "success");
  els.sessionPanel.hidden = true;
}

async function checkSession() {
  const { data } = await supabase.auth.getSession();
  const user = data?.session?.user;

  if (user) {
    els.sessionPanel.hidden = false;
    els.sessionEmail.textContent = user.email || "—";
    setStatus("You are signed in.", "success");
  } else {
    els.sessionPanel.hidden = true;
  }
}

function bindAuth() {
  els.tabSignin?.addEventListener("click", () => showForm("signin"));
  els.tabSignup?.addEventListener("click", () => showForm("signup"));
  els.tabReset?.addEventListener("click", () => showForm("reset"));

  els.signinForm?.addEventListener("submit", handleSignIn);
  els.signupForm?.addEventListener("submit", handleSignUp);
  els.resetForm?.addEventListener("submit", handleReset);

  els.signoutBtn?.addEventListener("click", handleSignOut);

  supabase.auth.onAuthStateChange((_event, session) => {
    if (session?.user) {
      checkSession();
    }
  });
}

async function bootAuth() {
  bindAuth();
  showForm("signin");
  await checkSession();
}

bootAuth().catch((err) => {
  console.error("[auth] boot error:", err);
  setStatus("Auth failed to load.", "error");
});
