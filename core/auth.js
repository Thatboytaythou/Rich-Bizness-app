// core/auth.js

import { supabase } from '/core/supabase.js';
import { ROUTES } from '/core/config.js';

let cachedSession = null;
let cachedUser = null;
let cachedProfile = null;
let authBooted = false;

function slugify(value = '') {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
}

export async function getSessionSafe() {
  const { data, error } = await supabase.auth.getSession();
  if (error) return null;
  cachedSession = data?.session || null;
  cachedUser = data?.session?.user || null;
  return cachedSession;
}

export async function getCurrentUserSafe() {
  const session = await getSessionSafe();
  return session?.user || null;
}

export async function getCurrentProfileSafe(force = false) {
  if (!force && cachedProfile && cachedUser?.id === cachedProfile?.id) {
    return cachedProfile;
  }

  const user = await getCurrentUserSafe();
  if (!user) {
    cachedProfile = null;
    return null;
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle();

  if (error) {
    console.error('[auth] getCurrentProfileSafe error:', error);
    cachedProfile = null;
    return null;
  }

  cachedProfile = data || null;
  return cachedProfile;
}

export async function ensureProfileRecord(user, overrides = {}) {
  if (!user?.id) return null;

  const email = user.email || null;
  const displayName =
    overrides.display_name?.trim() ||
    user.user_metadata?.display_name ||
    user.user_metadata?.full_name ||
    email?.split('@')[0] ||
    'Rich Bizness User';

  const username =
    slugify(overrides.username) ||
    slugify(user.user_metadata?.username) ||
    slugify(email?.split('@')[0]) ||
    `user-${user.id.slice(0, 8)}`;

  const payload = {
    id: user.id,
    user_id: user.id,
    email,
    display_name: displayName,
    username,
    handle: username,
    onboarding_complete: false,
    updated_at: new Date().toISOString()
  };

  const { error } = await supabase
    .from('profiles')
    .upsert(payload, { onConflict: 'id' });

  if (error) {
    console.error('[auth] ensureProfileRecord error:', error);
    throw new Error(error.message || 'Could not create your profile record.');
  }

  return await getCurrentProfileSafe(true);
}

export async function signUpWithEmail({
  email,
  password,
  displayName = '',
  username = ''
}) {
  const cleanEmail = String(email || '').trim();
  const cleanPassword = String(password || '');
  const cleanDisplayName = String(displayName || '').trim();
  const cleanUsername = slugify(username);

  if (!cleanEmail || !cleanPassword) {
    throw new Error('Email and password are required.');
  }

  const { data, error } = await supabase.auth.signUp({
    email: cleanEmail,
    password: cleanPassword,
    options: {
      data: {
        display_name: cleanDisplayName,
        username: cleanUsername
      }
    }
  });

  if (error) {
    console.error('[auth] signUpWithEmail error:', error);
    throw new Error(error.message || 'Could not create account.');
  }

  if (data?.user) {
    await ensureProfileRecord(data.user, {
      display_name: cleanDisplayName,
      username: cleanUsername
    });
  }

  cachedSession = data?.session || null;
  cachedUser = data?.user || null;

  return data;
}

export async function signInWithEmail({ email, password }) {
  const cleanEmail = String(email || '').trim();
  const cleanPassword = String(password || '');

  if (!cleanEmail || !cleanPassword) {
    throw new Error('Email and password are required.');
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email: cleanEmail,
    password: cleanPassword
  });

  if (error) {
    console.error('[auth] signInWithEmail error:', error);
    throw new Error(error.message || 'Could not sign in.');
  }

  if (data?.user) {
    await ensureProfileRecord(data.user);
  }

  cachedSession = data?.session || null;
  cachedUser = data?.user || null;

  return data;
}

export async function signOutUser(redirectTo = ROUTES.auth) {
  const { error } = await supabase.auth.signOut();
  if (error) {
    console.error('[auth] signOutUser error:', error);
    throw new Error(error.message || 'Could not sign out.');
  }

  cachedSession = null;
  cachedUser = null;
  cachedProfile = null;

  if (redirectTo) {
    window.location.href = redirectTo;
  }
}

export async function sendPasswordReset(email) {
  const cleanEmail = String(email || '').trim();

  if (!cleanEmail) {
    throw new Error('Email is required.');
  }

  const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
    redirectTo: `${window.location.origin}${ROUTES.auth}`
  });

  if (error) {
    console.error('[auth] sendPasswordReset error:', error);
    throw new Error(error.message || 'Could not send password reset email.');
  }

  return true;
}

export async function requireAuth({
  redirectTo = ROUTES.auth,
  allowIfAuthenticated = true
} = {}) {
  const user = await getCurrentUserSafe();

  if (!user && redirectTo) {
    window.location.href = redirectTo;
    return null;
  }

  if (user && allowIfAuthenticated) {
    return user;
  }

  return user;
}

export async function redirectIfAuthenticated(target = ROUTES.profile) {
  const user = await getCurrentUserSafe();
  if (user) {
    window.location.href = target;
    return true;
  }
  return false;
}

export function watchAuthState({
  onSignedIn = null,
  onSignedOut = null,
  reloadOnChange = false
} = {}) {
  return supabase.auth.onAuthStateChange(async (event, session) => {
    cachedSession = session || null;
    cachedUser = session?.user || null;
    cachedProfile = null;

    if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
      if (session?.user) {
        try {
          await ensureProfileRecord(session.user);
        } catch (error) {
          console.error('[auth] watchAuthState ensureProfileRecord error:', error);
        }
      }

      if (typeof onSignedIn === 'function') {
        onSignedIn(session?.user || null, session || null, event);
      }

      if (reloadOnChange) {
        window.location.reload();
      }
    }

    if (event === 'SIGNED_OUT') {
      if (typeof onSignedOut === 'function') {
        onSignedOut(event);
      }

      if (reloadOnChange) {
        window.location.reload();
      }
    }
  });
}

export async function bootAuth({
  protect = false,
  guestOnly = false,
  authRedirect = ROUTES.auth,
  appRedirect = ROUTES.profile
} = {}) {
  if (authBooted) {
    return {
      session: cachedSession,
      user: cachedUser,
      profile: cachedProfile
    };
  }

  const session = await getSessionSafe();
  const user = session?.user || null;

  if (guestOnly && user) {
    window.location.href = appRedirect;
    return null;
  }

  if (protect && !user) {
    window.location.href = authRedirect;
    return null;
  }

  if (user) {
    try {
      cachedProfile = await ensureProfileRecord(user);
    } catch (error) {
      console.error('[auth] bootAuth ensureProfileRecord error:', error);
    }
  }

  authBooted = true;

  return {
    session: cachedSession,
    user: cachedUser,
    profile: cachedProfile
  };
}
