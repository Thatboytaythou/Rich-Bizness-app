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

async function refreshSessionCache() {
  const { data, error } = await supabase.auth.getSession();

  if (error) {
    console.error('[auth] refreshSessionCache error:', error);
    cachedSession = null;
    cachedUser = null;
    return null;
  }

  cachedSession = data?.session || null;
  cachedUser = data?.session?.user || null;
  return cachedSession;
}

export async function getSessionSafe() {
  return await refreshSessionCache();
}

export async function getCurrentUserSafe() {
  const session = await refreshSessionCache();
  return session?.user || null;
}

export async function getCurrentUser() {
  return await getCurrentUserSafe();
}

export async function getSession() {
  return await getSessionSafe();
}

export async function getCurrentProfileSafe(force = false) {
  if (!force && cachedProfile && cachedUser?.id && cachedProfile?.id === cachedUser.id) {
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

export async function getCurrentProfile(force = false) {
  return await getCurrentProfileSafe(force);
}

export async function ensureProfileRecord(user, overrides = {}) {
  if (!user?.id) return null;

  const email = user.email || null;

  const displayName =
    String(overrides.display_name || '').trim() ||
    String(overrides.displayName || '').trim() ||
    user.user_metadata?.display_name ||
    user.user_metadata?.full_name ||
    email?.split('@')[0] ||
    'Rich Bizness User';

  const username =
    slugify(overrides.username || '') ||
    slugify(user.user_metadata?.username || '') ||
    slugify(email?.split('@')[0] || '') ||
    `user-${user.id.slice(0, 8)}`;

  const payload = {
    id: user.id,
    user_id: user.id,
    email,
    display_name: displayName,
    username,
    handle: username,
    updated_at: new Date().toISOString()
  };

  const { error } = await supabase
    .from('profiles')
    .upsert(payload, { onConflict: 'id' });

  if (error) {
    console.error('[auth] ensureProfileRecord error:', error);
    throw new Error(error.message || 'Could not create your profile record.');
  }

  const profile = await getCurrentProfileSafe(true);
  cachedProfile = profile;
  return profile;
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

  cachedSession = data?.session || null;
  cachedUser = data?.user || null;

  if (data?.user) {
    await ensureProfileRecord(data.user, {
      display_name: cleanDisplayName,
      username: cleanUsername
    });
  }

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

  cachedSession = data?.session || null;
  cachedUser = data?.user || null;

  if (data?.user) {
    await ensureProfileRecord(data.user);
  }

  return data;
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

export async function signOutUser(redirectTo = ROUTES.auth) {
  const { error } = await supabase.auth.signOut();

  if (error) {
    console.error('[auth] signOutUser error:', error);
    throw new Error(error.message || 'Could not sign out.');
  }

  cachedSession = null;
  cachedUser = null;
  cachedProfile = null;
  authBooted = false;

  if (redirectTo) {
    window.location.href = redirectTo;
  }

  return true;
}

export async function logoutUser(redirectTo = ROUTES.auth) {
  return await signOutUser(redirectTo);
}

export async function requireAuth({
  redirectTo = ROUTES.auth
} = {}) {
  const user = await getCurrentUserSafe();

  if (!user) {
    if (redirectTo) window.location.href = redirectTo;
    return null;
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
  onSignedOut = null
} = {}) {
  return supabase.auth.onAuthStateChange(async (event, session) => {
    cachedSession = session || null;
    cachedUser = session?.user || null;
    cachedProfile = null;

    if (
      event === 'SIGNED_IN' ||
      event === 'TOKEN_REFRESHED' ||
      event === 'USER_UPDATED'
    ) {
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
    }

    if (event === 'SIGNED_OUT') {
      if (typeof onSignedOut === 'function') {
        onSignedOut(event);
      }
    }
  });
}

export function onAuthStateChange(callback) {
  return supabase.auth.onAuthStateChange((event, session) => {
    cachedSession = session || null;
    cachedUser = session?.user || null;
    cachedProfile = null;

    if (typeof callback === 'function') {
      callback(event, session);
    }
  });
}

export async function bootAuth({
  protect = false,
  guestOnly = false,
  authRedirect = ROUTES.auth,
  appRedirect = ROUTES.profile
} = {}) {
  const session = await refreshSessionCache();
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
  } else {
    cachedProfile = null;
  }

  authBooted = true;

  return {
    session: cachedSession,
    user: cachedUser,
    profile: cachedProfile
  };
}
