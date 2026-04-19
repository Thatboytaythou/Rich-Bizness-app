import {
  signUpWithEmail,
  loginWithEmail,
  logoutUser,
  getCurrentUser,
  onAuthStateChange
} from './auth.js';

function el(id) {
  return document.getElementById(id);
}

function showError(message) {
  const node = el('auth-error');
  if (!node) return;
  node.textContent = message || '';
  node.style.display = message ? 'block' : 'none';
}

function showSuccess(message) {
  const node = el('auth-success');
  if (!node) return;
  node.textContent = message || '';
  node.style.display = message ? 'block' : 'none';
}

function setSessionStatus(text) {
  const node = el('auth-session-status');
  if (!node) return;
  node.textContent = text || '';
}

function switchTab(tab) {
  const loginTab = el('tab-login');
  const signupTab = el('tab-signup');
  const loginForm = el('login-form');
  const signupForm = el('signup-form');

  if (!loginTab || !signupTab || !loginForm || !signupForm) return;

  const showLogin = tab === 'login';

  loginTab.classList.toggle('active', showLogin);
  signupTab.classList.toggle('active', !showLogin);
  loginForm.classList.toggle('active', showLogin);
  signupForm.classList.toggle('active', !showLogin);
}

async function refreshSessionUi() {
  try {
    const user = await getCurrentUser();

    if (!user) {
      setSessionStatus('No active session');
      return;
    }

    setSessionStatus(`Signed in as ${user.email || user.id}`);
  } catch (error) {
    setSessionStatus('Failed to read session');
  }
}

function bindTabs() {
  el('tab-login')?.addEventListener('click', () => switchTab('login'));
  el('tab-signup')?.addEventListener('click', () => switchTab('signup'));
}

function bindLogin() {
  const form = el('login-form');
  if (!form) return;

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    showError('');
    showSuccess('');

    try {
      await loginWithEmail({
        email: el('login-email')?.value,
        password: el('login-password')?.value
      });

      showSuccess('Login successful.');
      await refreshSessionUi();

      setTimeout(() => {
        window.location.href = '/profile.html';
      }, 700);
    } catch (error) {
      showError(error.message || 'Login failed');
    }
  });
}

function bindSignup() {
  const form = el('signup-form');
  if (!form) return;

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    showError('');
    showSuccess('');

    try {
      const result = await signUpWithEmail({
        displayName: el('signup-display-name')?.value,
        username: el('signup-username')?.value,
        email: el('signup-email')?.value,
        password: el('signup-password')?.value
      });

      const user = result?.user || null;
      const session = result?.session || null;

      if (session && user) {
        showSuccess('Account created and signed in.');
        await refreshSessionUi();

        setTimeout(() => {
          window.location.href = '/profile.html';
        }, 700);
        return;
      }

      showSuccess('Account created. Check your email to confirm your account if confirmation is enabled.');
      await refreshSessionUi();
    } catch (error) {
      showError(error.message || 'Signup failed');
    }
  });
}

function bindLogout() {
  el('logout-btn')?.addEventListener('click', async () => {
    showError('');
    showSuccess('');

    try {
      await logoutUser();
      showSuccess('Logged out.');
      await refreshSessionUi();
    } catch (error) {
      showError(error.message || 'Logout failed');
    }
  });
}

function bindProfileRedirect() {
  el('go-profile-btn')?.addEventListener('click', async () => {
    try {
      const user = await getCurrentUser();
      if (user?.id) {
        window.location.href = `/profile.html?id=${encodeURIComponent(user.id)}`;
        return;
      }
      window.location.href = '/profile.html';
    } catch {
      window.location.href = '/profile.html';
    }
  });
}

function boot() {
  bindTabs();
  bindLogin();
  bindSignup();
  bindLogout();
  bindProfileRedirect();
  refreshSessionUi();

  onAuthStateChange(() => {
    refreshSessionUi();
  });
}

document.addEventListener('DOMContentLoaded', boot);
