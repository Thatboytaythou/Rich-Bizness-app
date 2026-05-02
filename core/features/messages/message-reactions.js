// =========================
// RICH BIZNESS MESSAGE REACTIONS
// /core/features/messages/message-reaction.js
// =========================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  window.NEXT_PUBLIC_SUPABASE_URL,
  window.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
);

// ===== STATE =====
let currentUser = null;

// ===== INIT =====
export async function initMessageReactions() {
  const { data } = await supabase.auth.getUser();
  currentUser = data?.user || null;
}

// =========================
// TOGGLE REACTION
// =========================
export async function toggleReaction(messageId, emoji) {
  if (!currentUser) return;

  // check if already reacted
  const { data: existing } = await supabase
    .from("dm_message_reactions")
    .select("*")
    .eq("message_id", messageId)
    .eq("user_id", currentUser.id)
    .eq("emoji", emoji)
    .maybeSingle();

  if (existing) {
    // remove reaction
    await supabase
      .from("dm_message_reactions")
      .delete()
      .eq("id", existing.id);
  } else {
    // add reaction
    await supabase
      .from("dm_message_reactions")
      .insert([
        {
          message_id: messageId,
          user_id: currentUser.id,
          emoji
        }
      ]);
  }
}

// =========================
// LOAD REACTIONS FOR MESSAGES
// =========================
export async function loadReactions(messageIds) {
  if (!messageIds?.length) return {};

  const { data, error } = await supabase
    .from("dm_message_reactions")
    .select("*")
    .in("message_id", messageIds);

  if (error) {
    console.error("Reaction load error:", error);
    return {};
  }

  // group by message_id
  const grouped = {};

  for (const r of data) {
    if (!grouped[r.message_id]) {
      grouped[r.message_id] = {};
    }

    if (!grouped[r.message_id][r.emoji]) {
      grouped[r.message_id][r.emoji] = {
        count: 0,
        users: []
      };
    }

    grouped[r.message_id][r.emoji].count++;
    grouped[r.message_id][r.emoji].users.push(r.user_id);
  }

  return grouped;
}

// =========================
// RENDER REACTIONS UI
// =========================
export function renderReactions(messageId, reactions) {
  if (!reactions) return "";

  return `
    <div class="dm-reactions">
      ${Object.entries(reactions).map(([emoji, data]) => {
        const isMine = data.users.includes(currentUser?.id);

        return `
          <button 
            class="dm-reaction ${isMine ? "active" : ""}" 
            onclick="window.__rbReact('${messageId}', '${emoji}')"
          >
            ${emoji} ${data.count}
          </button>
        `;
      }).join("")}

      <button 
        class="dm-reaction add"
        onclick="window.__rbReactPicker('${messageId}')"
      >
        ➕
      </button>
    </div>
  `;
}

// =========================
// QUICK EMOJI PICKER
// =========================
const EMOJIS = ["🔥","❤️","😂","💯","👀","🎵","🚀"];

export function showReactionPicker(messageId) {
  const picker = document.createElement("div");
  picker.className = "dm-reaction-picker";

  picker.innerHTML = EMOJIS.map(e => `
    <button>${e}</button>
  `).join("");

  picker.onclick = async (e) => {
    if (e.target.tagName === "BUTTON") {
      const emoji = e.target.textContent;
      await toggleReaction(messageId, emoji);
      document.body.removeChild(picker);
    }
  };

  document.body.appendChild(picker);
}

// =========================
// GLOBAL HOOKS (HTML SAFE)
// =========================
window.__rbReact = async (messageId, emoji) => {
  await toggleReaction(messageId, emoji);
};

window.__rbReactPicker = (messageId) => {
  showReactionPicker(messageId);
};

// =========================
// REALTIME SUBSCRIBE
// =========================
export function subscribeToReactions(threadId, onUpdate) {
  supabase
    .channel("dm-reactions-" + threadId)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "dm_message_reactions"
      },
      () => {
        if (onUpdate) onUpdate();
      }
    )
    .subscribe();
}
