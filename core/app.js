// GLOBAL APP CORE (USED EVERYWHERE)

const SUPABASE_URL = "https://ksvdequymkceevocgpdj.supabase.co";
const SUPABASE_KEY = "sb_publishable_bRhd0yC-gBTWTPC26IZHlw_sda85zos";

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// 🔐 Get current user everywhere
export async function getUser() {
  const { data } = await supabase.auth.getUser();
  return data.user;
}

// 🔥 Create notification (USED BY ALL FEATURES)
export async function createNotification(user_id, type, message) {
  await supabase.from("notifications").insert({
    user_id,
    type,
    message
  });
}

// 💰 Track earnings globally
export async function addEarning(user_id, amount, source, ref_id=null) {
  await supabase.from("earnings").insert({
    user_id,
    amount,
    source,
    ref_id
  });
}

// 👥 Follow system trigger
export async function followUser(follower, following) {
  await supabase.from("followers").insert({
    follower_id: follower,
    following_id: following
  });

  await createNotification(
    following,
    "follow",
    "You got a new follower 🔥"
  );
}

// 🔁 Global event system (important)
export function emitEvent(name, data){
  window.dispatchEvent(new CustomEvent(name, { detail: data }));
}

export function onEvent(name, callback){
  window.addEventListener(name, e => callback(e.detail));
}

export { supabase };
