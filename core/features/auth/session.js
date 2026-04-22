// core/features/auth/session.js

import { supabase } from '/core/supabase.js';

let currentSession = null;
let currentUser = null;
let listeners = new Set();

/**
 * Get current session
 */
export function getSession() {
  return currentSession;
}

/**
 * Get current user
 */
export function getUser() {
  return currentUser;
}

/**
 * Check if user is logged in
 */
export function isAuthenticated() {
  return !!currentUser;
}

/**
 * Subscribe to session changes
 */
export function onSessionChange(callback) {
  if (typeof callback === 'function') {
    listeners.add(callback);
  }

  return () => {
    listeners.delete(callback);
  };
}

/**
 * Notify all listeners
 */
function notify() {
  listeners.forEach((cb) => {
    try {
      cb({
        session: currentSession,
        user: currentUser
      });
    } catch (err) {
      console.error('[session] listener error:', err);
    }
  });
}

/**
 * Load initial session from Supabase
 */
export async function loadSession() {
  try {
    const {
      data: { session },
      error
    } = await supabase.auth.getSession();

    if (error) {
      console.error('[session] loadSession error:', error);
      return null;
    }

    currentSession = session || null;
    currentUser = session?.user || null;

    notify();

    return currentSession;
  } catch (err) {
    console.error('[session] loadSession catch:', err);
    return null;
  }
}

/**
 * Sign in with email + password
 */
export async function signIn(email, password) {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      console.error('[session] signIn error:', error);
      throw error;
    }

    currentSession = data.session;
    currentUser = data.user;

    notify();

    return data;
  } catch (err) {
    console.error('[session] signIn catch:', err);
    throw err;
  }
}

/**
 * Sign up new user
 */
export async function signUp(email, password) {
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password
    });

    if (error) {
      console.error('[session] signUp error:', error);
      throw error;
    }

    currentSession = data.session || null;
    currentUser = data.user || null;

    notify();

    return data;
  } catch (err) {
    console.error('[session] signUp catch:', err);
    throw err;
  }
}

/**
 * Sign out
 */
export async function signOut() {
  try {
    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error('[session] signOut error:', error);
      throw error;
    }

    currentSession = null;
    currentUser = null;

    notify();
  } catch (err) {
    console.error('[session] signOut catch:', err);
    throw err;
  }
}

/**
 * Initialize session system (AUTO SYNC)
 */
export function initSessionListener() {
  supabase.auth.onAuthStateChange((event, session) => {
    currentSession = session || null;
    currentUser = session?.user || null;

    console.log('[session] auth change:', event);

    notify();
  });
}

/**
 * Bootstrap session (call this ONCE in app.js)
 */
export async function bootstrapSession() {
  await loadSession();
  initSessionListener();
}
