import {
  signUpWithEmail,
  loginWithEmail,
  logoutUser,
  getCurrentUser,
  onAuthStateChange
} from "./auth.js";

function el(id) {
  return document.getElementById(id);
}

function showError(message) {
  const node = el("auth-error");
  if (!node) return;
  node.textContent = message || "";
  node.style.display = message ? "block" : "none";
}

function showSuccess(message) {
  const node = el("auth-success");
  if (!node) return;
  node.textContent = message || "";
  node.style.display = message ? "block" : "none";
}

function setSessionStatus(text) {
  const node = el("auth-session-status");
  if (!node) return;
  node.textContent = text || "";
}

function setFormCopy(mode) {
  const title = el("auth-form-title");
  const subtitle = el("auth-form-subtitle");

  if (!title || !subtitle) return;

  if (mode === "signup") {
    title.textContent = "Create your account";
    subtitle.textContent = "Set up your Rich Bizness creator access.";
    return;
  }

  title.textContent = "Login to your account";
  subtitle.textContent = "Use your email and password to continue.";
}

function setSignedInView(isSignedIn, user = null) {
  const signedInPanel = el("signed-in-panel");
  const loginForm = el("login-form");
  const signupForm = el("signup-form");
  const loginTab = el("tab-login");
  const signupTab = el("tab-signup");

  if (signedInPanel) {
    signedInPanel.classList.toggle("active", !!isSignedIn);
  }

  if (!loginForm || !signupForm || !loginTab || !signupTab) return;

  if (isSignedIn) {
    loginForm.classList.remove("active");
    signupForm.classList.remove("active");
    loginTab.classList.remove("active");
    signupTab.classList.remove("active");
    setFormCopy("login");
    return;
  }

  const signupActive = signupTab.classList.contains("active");
  loginForm.classList.toggle("active", !signupActive);
  signupForm.classList.toggle("active", signupActive);
  setFormCopy(signupActive ? "signup" : "login");
}

function switchTab(tab) {
  const loginTab = el("tab-login");
  const signupTab = el("tab-signup");
  const loginForm = el("login-form");
  const signupForm = el("signup-form");
  const signedInPanel = el("signed-in-panel");

  if (!loginTab || !signupTab || !loginForm || !signupForm) return;

  if (signedInPanel?.classList.contains("active")) {
    return;
  }

  const showLogin = tab === "login";

  loginTab.classList.toggle("active", showLogin);
  signupTab.classList.toggle("active", !showLogin);
  loginForm.classList.toggle("active", showLogin);
  signupForm.classList.toggle("active", !showLogin);

  setFormCopy(showLogin ? "login" : "signup");
}

async function refreshSessionUi() {
  try {
    const user = await getCurrentUser();

    if (!user) {
      setSessionStatus("No active session");
      setSignedInView(false);
      return;
    }

    const label =
      user.user_metadata?.display_name ||
      user.email ||
      user.id;

    setSessionStatus(`Signed in as ${label}`);
    setSignedInView(true, user);
  } catch (error) {
    console.error("[auth-ui] refreshSessionUi error:", error);
    setSessionStatus("Auth failed to load");
    setSignedInView(false);
    showError(error.message || "Failed to read session");
  }
}

function bindTabs() {
  el("tab-login")?.addEventListener("click", () => switchTab("login"));
  el("tab-signup")?.addEventListener("click", () => switchTab("signup"));
}

function bindLogin() {
  const form = el("login-form");
  if (!form) return;

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    showError("");
    showSuccess("");

    const loginBtn = el("login-btn");
    if (loginBtn) {
      loginBtn.disabled = true;
      loginBtn.textContent = "Logging in...";
    }

    try {
      await loginWithEmail({
        email: el("login-email")?.value,
        password: el("login-password")?.value
      });

      showSuccess("Login successful.");
      await refreshSessionUi();

      setTimeout(() => {
        window.location.href = "/profile.html";
      }, 700);
    } catch (error) {
      console.error("[auth-ui] login error:", error);
      showError(error.message || "Login failed");
    } finally {
      if (loginBtn) {
        loginBtn.disabled = false;
        loginBtn.textContent = "Login";
      }
    }
  });
}

function bindSignup() {
  const form = el("signup-form");
  if (!form) return;

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    showError("");
    showSuccess("");

    const signupBtn = el("signup-btn");
    if (signupBtn) {
      signupBtn.disabled = true;
      signupBtn.textContent = "Creating...";
    }

    try {
      const result = await signUpWithEmail({
        displayName: el("signup-display-name")?.value,
        username: el("signup-username")?.value,
        email: el("signup-email")?.value,
        password: el("signup-password")?.value
      });

      const user = result?.user || null;
      const session = result?.session || null;

      if (session && user) {
        showSuccess("Account created and signed in.");
        await refreshSessionUi();

        setTimeout(() => {
          window.location.href = "/profile.html";
        }, 700);
        return;
      }

      showSuccess("Account created. Check your email if confirmation is enabled.");
      await refreshSessionUi();
    } catch (error) {
      console.error("[auth-ui] signup error:", error);
      showError(error.message || "Signup failed");
    } finally {
      if (signupBtn) {
        signupBtn.disabled = false;
        signupBtn.textContent = "Create Account";
      }
    }
  });
}

function bindLogout() {
  el("logout-btn")?.addEventListener("click", async () => {
    showError("");
    showSuccess("");

    const logoutBtn = el("logout-btn");
    if (logoutBtn) {
      logoutBtn.disabled = true;
      logoutBtn.textContent = "Logging out...";
    }

    try {
      await logoutUser();
      showSuccess("Logged out.");
      await refreshSessionUi();
      switchTab("login");
    } catch (error) {
      console.error("[auth-ui] logout error:", error);
      showError(error.message || "Logout failed");
    } finally {
      if (logoutBtn) {
        logoutBtn.disabled = false;
        logoutBtn.textContent = "Logout";
      }
    }
  });
}

function bindProfileRedirect() {
  el("go-profile-btn")?.addEventListener("click", async () => {
    try {
      const user = await getCurrentUser();
      if (user?.id) {
        window.location.href = `/profile.html?id=${encodeURIComponent(user.id)}`;
        return;
      }
      window.location.href = "/profile.html";
    } catch (error) {
      console.error("[auth-ui] profile redirect error:", error);
      window.location.href = "/profile.html";
    }
  });
}

function bindLiveRedirect() {
  el("go-live-btn")?.addEventListener("click", () => {
    window.location.href = "/live.html";
  });
}

function boot() {
  bindTabs();
  bindLogin();
  bindSignup();
  bindLogout();
  bindProfileRedirect();
  bindLiveRedirect();

  switchTab("login");
  refreshSessionUi();

  onAuthStateChange(() => {
    refreshSessionUi();
  });
}

document.addEventListener("DOMContentLoaded", boot);
