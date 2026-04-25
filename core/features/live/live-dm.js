import { supabase } from "/core/supabase.js";

export async function findOrCreateLiveDmThread({ currentUserId, targetUserId }) {
  if (!currentUserId) throw new Error("Login required.");
  if (!targetUserId) throw new Error("Missing DM target.");
  if (currentUserId === targetUserId) throw new Error("You cannot DM yourself.");

  const { data: myThreads, error: myThreadsError } = await supabase
    .from("dm_thread_members")
    .select("thread_id")
    .eq("user_id", currentUserId);

  if (myThreadsError) throw new Error(myThreadsError.message);

  let threadId = null;

  if (myThreads?.length) {
    const threadIds = myThreads.map((row) => row.thread_id);

    const { data: matches, error: matchError } = await supabase
      .from("dm_thread_members")
      .select("thread_id")
      .in("thread_id", threadIds)
      .eq("user_id", targetUserId);

    if (matchError) throw new Error(matchError.message);

    if (matches?.length) {
      threadId = matches[0].thread_id;
    }
  }

  if (threadId) return threadId;

  const { data: thread, error: threadError } = await supabase
    .from("dm_threads")
    .insert({
      created_by: currentUserId,
      title: "Slide In 🔥",
      is_group: false,
      last_message_at: new Date().toISOString(),
      metadata: {
        source: "live_dm"
      }
    })
    .select("id")
    .single();

  if (threadError) throw new Error(threadError.message);

  threadId = thread.id;

  const { error: membersError } = await supabase
    .from("dm_thread_members")
    .insert([
      {
        thread_id: threadId,
        user_id: currentUserId,
        last_read_at: new Date().toISOString()
      },
      {
        thread_id: threadId,
        user_id: targetUserId,
        last_read_at: null
      }
    ]);

  if (membersError) throw new Error(membersError.message);

  return threadId;
}

export async function sendLiveDm({
  currentUserId,
  targetUserId,
  body,
  streamId = null,
  targetLabel = "Private message"
}) {
  const message = String(body || "").trim();

  if (!message) throw new Error("Type your slide first.");

  const threadId = await findOrCreateLiveDmThread({
    currentUserId,
    targetUserId
  });

  const { error: messageError } = await supabase.from("dm_messages").insert({
    thread_id: threadId,
    sender_id: currentUserId,
    body: message,
    message_type: "text",
    media_url: null,
    reply_to_message_id: null,
    is_deleted: false,
    metadata: {
      source: "live",
      stream_id: streamId,
      target_label: targetLabel
    },
    created_at: new Date().toISOString()
  });

  if (messageError) throw new Error(messageError.message);

  await supabase
    .from("dm_threads")
    .update({
      last_message_at: new Date().toISOString()
    })
    .eq("id", threadId);

  return { threadId };
}
