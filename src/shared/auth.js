import { supabase, getSession, getSessionUser, signOutSession } from './supabase.js';

function cleanUsername(value = '') {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, '');
}

export async function signUpWithEmail({
  email,
  password,
  displayName,
  username
}) {
  const cleanEmail = String(email || '').trim();
  const cleanPassword = String(password || '');
  const cleanDisplayName = String(displayName || '').trim();
  const cleanUserName = cleanUsername(username || cleanDisplayName || cleanEmail.split('@')[0] || 'user');

  if (!cleanEmail) throw new Error('Email is required');
  if (!cleanPassword || cleanPassword.length < 6) throw new Error('Password must be at least 6 characters');
  if (!cleanDisplayName) throw new Error('Display name is required');

  const redirectTo = `${window.location.origin}/auth.html`;

  const { data, error } = await supabase.auth.signUp({
    email: cleanEmail,
    password: cleanPassword,
    options: {
      emailRedirectTo: redirectTo,
      data: {
        display_name: cleanDisplayName,
        username: cleanUserName
      }
    }
  });

  if (error) throw error;
  return data;
}

export async function loginWithEmail({ email, password }) {
  const cleanEmail = String(email || '').trim();
  const cleanPassword = String(password || '');

  if (!cleanEmail) throw new Error('Email is required');
  if (!cleanPassword) throw new Error('Password is required');

  const { data, error } = await supabase.auth.signInWithPassword({
    email: cleanEmail,
    password: cleanPassword
  });

  if (error) throw error;
  return data;
}

export async function logoutUser() {
  return signOutSession();
}

export async function getCurrentSession() {
  return getSession();
}

export async function getCurrentUser() {
  return getSessionUser();
}

export function onAuthStateChange(callback) {
  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    callback?.(session);
  });

  return data?.subscription || null;
}
