-- =========================
-- RICH BIZNESS — REALTIME ENABLE
-- sql/120_realtime.sql
-- =========================

-- Enable replica identity (needed for realtime updates)
alter table posts replica identity full;
alter table comments replica identity full;
alter table post_reactions replica identity full;
alter table reposts replica identity full;

alter table live_streams replica identity full;
alter table live_chat_messages replica identity full;
alter table live_view_sessions replica identity full;
alter table live_stream_members replica identity full;

alter table dm_messages replica identity full;
alter table notifications replica identity full;

alter table game_scores replica identity full;
alter table gaming_uploads replica identity full;

alter table music_tracks replica identity full;
alter table radio_stations replica identity full;

alter table artworks replica identity full;
alter table store_orders replica identity full;

-- Add tables to realtime publication
alter publication supabase_realtime add table posts;
alter publication supabase_realtime add table comments;
alter publication supabase_realtime add table post_reactions;
alter publication supabase_realtime add table reposts;

alter publication supabase_realtime add table live_streams;
alter publication supabase_realtime add table live_chat_messages;
alter publication supabase_realtime add table live_view_sessions;
alter publication supabase_realtime add table live_stream_members;

alter publication supabase_realtime add table dm_messages;
alter publication supabase_realtime add table notifications;

alter publication supabase_realtime add table game_scores;
alter publication supabase_realtime add table gaming_uploads;

alter publication supabase_realtime add table music_tracks;
alter publication supabase_realtime add table radio_stations;

alter publication supabase_realtime add table artworks;
alter publication supabase_realtime add table store_orders;

-- =========================
-- DONE
-- =========================
NOTIFY pgrst, 'reload schema';
