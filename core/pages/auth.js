// =========================
// RICH BIZNESS AUTH CONTROLLER
// /core/pages/auth.js
// =========================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// =========================
// INIT SUPABASE
// =========================
const supabase = createClient(
  window.NEXT_PUBLIC_SUPABASE_URL,
  window.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
);

// =========================
// ELEMENTS
// =========================
const statusEl = document.getElementById("auth-status");

const signinForm = document.getElementById("signin-form");
const signupForm = document.getElementById("signup-form");

const tabSignin = document.getElementById("auth-tab-signin");
const tabSignup = document.getElementById("auth-tab-signup");

const forgotBtn = document.getElementById("forgot-password-btn");

// =========================
// STATUS HELPER
// =========================
function setStatus(msg, type = "info") {
  if (!statusEl) return;

  statusEl.textContent = msg;

  statusEl.style.color =
    type === "error"
      ? "#ff6b6b"
      : type === "success"
      ? "#69ffb4"
      : "#f5fff8";
}

// =========================
// TAB SWITCH
// =========================
function showTab(tab) {
  if (tab === "signup") {
    signupForm.classList.remove("is-hidden");
    signinForm.classList.add("is-hidden");

    tabSignup.classList.add("is-active");
    tabSignin.classList.remove("is-active");
  } else {
    signinForm.classList.remove("is-hidden");
    signupForm.classList.add("is-hidden");

    tabSignin.classList.add("is-active");
    tabSignup.classList.remove("is-active");
  }
}

tabSignin.onclick = () => showTab("signin");
tabSignup.onclick = () => showTab("signup");

// =========================
// SIGN IN
// =========================
signinForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const email = document.getElementById("signin-email").value.trim();
  const password = document.getElementById("signin-password").value;

  setStatus("Tapping in...");

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    setStatus(error.message, "error");
    return;
  }

  setStatus("Welcome back. Redirecting...", "success");

  setTimeout(() => {
    window.location.href = "/index.html";
  }, 900);
});

// =========================
// SIGN UP
// =========================
signupForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const email = document.getElementById("signup-email").value.trim();
  const password = document.getElementById("signup-password").value;

  const displayName = document.getElementById("signup-display-name").value.trim();
  const username = document.getElementById("signup-username").value.trim();

  setStatus("Creating your account...");

  const { data, error } = await supabase.auth.signUp({
    email,
    password
  });

  if (error) {
    setStatus(error.message, "error");
    return;
  }

  const user = data?.user;

  // =========================
  // OPTIONAL PROFILE INSERT
  // =========================
  if (user) {
    try {
      await supabase.from("profiles").insert({
        id: user.id,
        email,
        display_name: displayName || null,
        username: username || null,
        created_at: new Date().toISOString()
      });
    } catch (err) {
      console.warn("Profile insert skipped:", err);
    }
  }

  setStatus("Account created. Check your email to confirm.", "success");

  showTab("signin");
});

// =========================
// FORGOT PASSWORD
// =========================
forgotBtn.onclick = async () => {
  const email = document.getElementById("signin-email").value.trim();

  if (!email) {
    setStatus("Enter your email first.", "error");
    return;
  }

  setStatus("Sending reset link...");

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: window.location.origin + "/auth.html"
  });

  if (error) {
    setStatus(error.message, "error");
    return;
  }

  setStatus("Password reset email sent.", "success");
};

// =========================
// AUTO SESSION CHECK
// =========================
async function checkSession() {
  const { data } = await supabase.auth.getSession();

  if (data?.session?.user) {
    setStatus("You're already tapped in. Redirecting...", "success");

    setTimeout(() => {
      window.location.href = "/profile.html";
    }, 800);
  }
}

checkSession();

// =========================
// DEBUG
// =========================
console.log("🔐 Auth system loaded — READY");
