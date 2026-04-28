// =========================
// RICH BIZNESS GLOBAL CONFIG — FINAL REPAIR
// /core/config.js
// One source map for routes, tables, buckets, brand assets, money, live, upload lanes
// =========================

export const APP_NAME = "Rich Bizness";
export const APP_LEGAL_NAME = "Rich Bizness LLC";
export const APP_TAGLINE = "Live • Music • Gaming • Sports • Gallery • Store • Creator World";

export const APP_URL =
  window.location.origin || "https://rich-bizness-app.vercel.app";

export const SUPABASE_PROJECT_URL = "https://ksvdequymkceevocgpdj.supabase.co";
export const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_bRhd0yC-gBTWTPC26IZHlw_sda85zos";

export const DEFAULT_CURRENCY = "usd";
export const DEFAULT_PLATFORM_FEE_BPS = 1000;

/* =========================
   ROUTES
========================= */

export const ROUTES = {
  home: "/index.html",
  auth: "/auth.html",

  feed: "/feed.html",
  profile: "/profile.html",
  notifications: "/notifications.html",
  messages: "/messages.html",
  comments: "/comments.html",

  live: "/live.html",
  watch: "/watch.html",
  watchSports: "/watch-sports.html",

  music: "/music.html",
  musicRevenue: "/music-revenue.html",
  musicUnlock: "/music-unlock.html",
  artist: "/artist.html",
  artistHome: "/artist/index.html",
  artistManage: "/artist/manage.html",
  artistChannelManage: "/artist-channel-manage.html",
  artistUpload: "/artist/upload.html",
  artistAnalytics: "/artist/analytics.html",

  podcast: "/podcast.html",
  podcastUpload: "/podcast-upload.html",
  radio: "/radio.html",
  playlist: "/playlist.html",
  playlistViews: "/playlist-views.html",
  album: "/album.html",
  albumView: "/album-view.html",

  gaming: "/gaming.html",
  gamingProfile: "/gaming-profile.html",
  gamingLeaderboard: "/gaming-leaderboard.html",
  gamingTournaments: "/gaming-tournaments.html",
  gamingAdmin: "/gaming-admin.html",
  challenges: "/games/challenges.html",
  ride: "/ride.html",

  sports: "/sports.html",
  sportsProfile: "/sports-profile.html",
  sportsPost: "/sports-post.html",
  sportsPicks: "/sports-picks.html",
  sportsLeaderboard: "/sports-leaderboard.html",
  sportsSchedule: "/sports-schedule.html",
  sportsAdmin: "/sports-admin.html",

  gallery: "/gallery.html",

  upload: "/upload.html",
  uploadGaming: "/upload-gaming.html",
  uploadSports: "/upload-sports.html",
  uploadMusic: "/upload-music.html",
  uploadFashion: "/upload-fashion.html",

  store: "/store.html",
  storeAdmin: "/store-admin.html",

  monetization: "/monetization.html",
  monetizationSuccess: "/monetization-success.html",
  monetizationCancel: "/monetization-cancel.html",
  success: "/success.html",
  cancel: "/cancel.html",
  payouts: "/payouts.html",

  creatorDashboard: "/creator-dashboard.html",
  adminDashboard: "/admin-dashboard.html",
  adminPayouts: "/admin-payouts.html",

  metaverse: "/metaverse.html",
  analytics: "/analytics.html"
};

export const NAV_LINKS = [
  { label: "Home", route: "home" },
  { label: "Feed", route: "feed" },
  { label: "Watch", route: "watch" },
  { label: "Live", route: "live" },
  { label: "Music", route: "music" },
  { label: "Gaming", route: "gaming" },
  { label: "Sports", route: "sports" },
  { label: "Gallery", route: "gallery" },
  { label: "Upload", route: "upload" },
  { label: "Store", route: "store" },
  { label: "Meta", route: "metaverse" },
  { label: "Dashboard", route: "creatorDashboard" }
];

/* =========================
   TABLE MAP
========================= */

export const TABLES = {
  profiles: "profiles",
  followers: "followers",
  notifications: "notifications",

  posts: "posts",
  comments: "comments",
  reactions: "reactions",
  postReactions: "post_reactions",
  reposts: "reposts",
  uploads: "uploads",

  dmThreads: "dm_threads",
  dmThreadMembers: "dm_thread_members",
  dmMessages: "dm_messages",
  dmMessageReactions: "dm_message_reactions",

  liveStreams: "live_streams",
  liveStreamMembers: "live_stream_members",
  liveStreamPurchases: "live_stream_purchases",
  liveStreamBans: "live_stream_bans",
  liveViewSessions: "live_view_sessions",
  liveChatMessages: "live_chat_messages",
  liveStreamCards: "live_stream_cards",
  vipLiveAccess: "vip_live_access",

  musicTracks: "music_tracks",
  tracks: "tracks",
  musicUploads: "music_uploads",
  musicLikes: "music_likes",
  musicReposts: "music_reposts",
  musicStreams: "music_streams",
  musicUnlocks: "music_unlocks",
  musicEarnings: "music_earnings",
  playlists: "playlists",
  playlistTracks: "playlist_tracks",
  albums: "albums",
  albumTracks: "album_tracks",
  artistChannels: "artist_channels",

  podcastShows: "podcast_shows",
  podcastEpisodes: "podcast_episodes",
  radioStations: "radio_stations",
  radioStationTracks: "radio_station_tracks",
  radioPlays: "radio_plays",

  games: "games",
  gameScores: "game_scores",
  gameSessions: "game_sessions",
  gameClips: "game_clips",
  gamerProfiles: "gamer_profiles",
  gamingPosts: "gaming_posts",
  gamingUploads: "gaming_uploads",
  gamingUploadLikes: "gaming_upload_likes",
  gameChallenges: "game_challenges",
  gameChallengeEntries: "game_challenge_entries",
  gameChallengeInvites: "game_challenge_invites",

  sportsProfiles: "sports_profiles",
  sportsPosts: "sports_posts",
  sportsUploads: "sports_uploads",
  sportsPicks: "sports_picks",
  sportsPickResults: "sports_pick_results",
  sportsBrackets: "sports_brackets",

  artworks: "artworks",
  artworkLikes: "artwork_likes",
  artworkComments: "artwork_comments",
  artworkPurchases: "artwork_purchases",

  products: "products",
  storeOrders: "store_orders",
  orders: "orders",
  purchases: "purchases",
  userProductUnlocks: "user_product_unlocks",

  payments: "payments",
  tips: "tips",
  payoutRequests: "payout_requests",
  creatorAvailableBalances: "creator_available_balances",
  creatorEarnings: "creator_earnings",
  creatorMemberships: "creator_memberships",
  fanSubscriptions: "fan_subscriptions",

  premiumContent: "premium_content",
  premiumTracks: "premium_tracks",
  premiumTrackPurchases: "premium_track_purchases"
};

/* =========================
   STORAGE BUCKETS
========================= */

export const STORAGE_BUCKETS = {
  avatars: "avatars",
  profileImages: "profile-images",
  creatorBanners: "creator-banners",

  feedMedia: "feed-media",
  uploads: "uploads",
  userContent: "user-content",
  messageAttachments: "message-attachments",

  liveThumbnails: "live-thumbnails",
  liveRecordings: "live-recordings",

  music: "music",
  musicFiles: "music-files",
  musicCovers: "music-covers",
  artistUploads: "Artist-uploads",

  gaming: "gaming",
  gamingUploads: "gaming-uploads",

  sports: "sports",
  sportsMedia: "sports-media",

  artworks: "artworks",
  galleryUploads: "gallery-uploads",

  podcasts: "podcasts",
  storeProducts: "store-products"
};

/* =========================
   BRAND ASSETS
========================= */

export const BRAND_IMAGES = {
  homeHero: "/images/brand/19FB5229-30DD-40B0-9404-5136C27FEF6A.png",
  logo: "/images/brand/1E7155FE-1726-4D71-964F-B0337A2E80A1.png",
  avatar: "/images/brand/1E7155FE-1726-4D71-964F-B0337A2E80A1.png",

  live: "/images/brand/29F1046D-D88C-4252-8546-25B262FDA7CC.png",
  watch: "/images/brand/29F1046D-D88C-4252-8546-25B262FDA7CC.png",

  gaming: "/images/83FAD785-46D7-4EB3-8A3F-1E4A8BB78C90.png",
  ride: "/images/brand/29F1046D-D88C-4252-8546-25B262FDA7CC.png",

  sports: "/images/brand/8FE83A11-A7F6-45D7-9840-D8A066A88684.png",
  music: "/images/brand/logo-music-label.png",
  gallery: "/images/brand/F1AE13D6-DE21-4024-8E8B-9096BF73DFB7.png",
  artist: "/images/brand/B3C4FDF0-8485-4426-B1B4-A86491EB168B.png",
  baseball: "/images/brand/6F26FF98-8FFE-4A1C-B9FB-C4233274CF8A.png",

  fallback: "/images/brand/19FB5229-30DD-40B0-9404-5136C27FEF6A.png"
};

export const SECTION_BACKGROUNDS = {
  home: BRAND_IMAGES.homeHero,
  live: BRAND_IMAGES.live,
  watch: BRAND_IMAGES.watch,
  music: BRAND_IMAGES.music,
  gaming: BRAND_IMAGES.gaming,
  sports: BRAND_IMAGES.sports,
  gallery: BRAND_IMAGES.gallery,
  artist: BRAND_IMAGES.artist,
  upload: BRAND_IMAGES.live,
  profile: BRAND_IMAGES.homeHero,
  dashboard: BRAND_IMAGES.live,
  store: BRAND_IMAGES.homeHero,
  metaverse: BRAND_IMAGES.live
};

/* =========================
   TYPES / ENUMS
========================= */

export const POST_TYPES = {
  standard: "post",
  music: "music",
  gaming: "gaming",
  sports: "sports",
  artwork: "artwork",
  live: "live",
  product: "product",
  podcast: "podcast"
};

export const VISIBILITY = {
  public: "public",
  followers: "followers",
  private: "private",
  draft: "draft",
  premium: "premium"
};

export const LIVE_STATUS = {
  draft: "draft",
  scheduled: "scheduled",
  live: "live",
  ended: "ended"
};

export const LIVE_ACCESS = {
  free: "free",
  paid: "paid",
  vip: "vip",
  members: "members"
};

export const PRODUCT_KINDS = {
  digital: "digital",
  physical: "physical",
  premium: "premium",
  liveAccess: "live_access",
  subscription: "subscription",
  merch: "merch"
};

export const PAYMENT_STATUS = {
  pending: "pending",
  paid: "paid",
  succeeded: "succeeded",
  failed: "failed",
  refunded: "refunded"
};

export const NOTIFICATION_TYPES = {
  like: "like",
  comment: "comment",
  repost: "repost",
  follow: "follow",
  message: "message",
  liveStarted: "live_started",
  livePurchase: "live_purchase",
  gameChallenge: "game_challenge",
  sportsPick: "sports_pick",
  musicUpload: "music_upload",
  artworkPurchase: "artwork_purchase",
  storeOrder: "store_order",
  payout: "payout",
  system: "system"
};

/* =========================
   SECTION OPTIONS
========================= */

export const SPORTS = [
  "Basketball",
  "Football",
  "Baseball",
  "Golf",
  "Gym",
  "MMA",
  "Boxing",
  "Soccer",
  "Track",
  "Other"
];

export const GAMING_PLATFORMS = [
  "PlayStation",
  "Xbox",
  "PC",
  "Nintendo",
  "Mobile",
  "Arcade",
  "Other"
];

export const MUSIC_GENRES = [
  "Hip-Hop",
  "Rap",
  "R&B",
  "Pop",
  "Rock",
  "Jazz",
  "Gospel",
  "Afrobeats",
  "Podcast",
  "Other"
];

export const UPLOAD_LANES = {
  feed: {
    label: "Feed Post",
    table: TABLES.posts,
    route: ROUTES.feed,
    type: POST_TYPES.standard
  },
  music: {
    label: "Music Track",
    table: TABLES.musicTracks,
    route: ROUTES.music,
    type: POST_TYPES.music
  },
  sports: {
    label: "Sports Upload",
    table: TABLES.sportsUploads,
    route: ROUTES.sports,
    type: POST_TYPES.sports
  },
  gaming: {
    label: "Gaming Clip",
    table: TABLES.gamingUploads,
    route: ROUTES.gaming,
    type: POST_TYPES.gaming
  },
  gallery: {
    label: "Gallery Artwork",
    table: TABLES.artworks,
    route: ROUTES.gallery,
    type: POST_TYPES.artwork
  },
  store: {
    label: "Store Product",
    table: TABLES.products,
    route: ROUTES.store,
    type: POST_TYPES.product
  },
  premium: {
    label: "Premium Content",
    table: TABLES.premiumContent,
    route: ROUTES.monetization,
    type: "premium"
  },
  podcast: {
    label: "Podcast Episode",
    table: TABLES.podcastEpisodes,
    route: ROUTES.podcast,
    type: POST_TYPES.podcast
  }
};

export const MONEY_TABLES = [
  TABLES.tips,
  TABLES.payments,
  TABLES.payoutRequests,
  TABLES.creatorAvailableBalances,
  TABLES.creatorEarnings,
  TABLES.creatorMemberships,
  TABLES.fanSubscriptions,
  TABLES.premiumContent,
  TABLES.premiumTracks,
  TABLES.premiumTrackPurchases,
  TABLES.storeOrders,
  TABLES.liveStreamPurchases,
  TABLES.vipLiveAccess
];

/* =========================
   HELPERS
========================= */

export function getRoute(name) {
  return ROUTES[name] || ROUTES.home;
}

export function getTable(name) {
  return TABLES[name] || name;
}

export function getBucket(name) {
  return STORAGE_BUCKETS[name] || name;
}

export function getBrandImage(name) {
  return BRAND_IMAGES[name] || SECTION_BACKGROUNDS[name] || BRAND_IMAGES.fallback;
}

export function getSectionBackground(name) {
  return SECTION_BACKGROUNDS[name] || BRAND_IMAGES.fallback;
}

export function absoluteUrl(path = "/") {
  if (!path) return APP_URL;
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  return `${APP_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

export function isActiveRoute(path) {
  const current = window.location.pathname;
  return current === path || current.endsWith(path);
}

export function routeWithParams(routeName, params = {}) {
  const url = new URL(absoluteUrl(getRoute(routeName)));

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, value);
    }
  });

  return url.pathname + url.search;
}

export function formatMoney(cents = 0, currency = DEFAULT_CURRENCY) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: String(currency || DEFAULT_CURRENCY).toUpperCase()
  }).format(Number(cents || 0) / 100);
}

export function formatNumber(value = 0) {
  return Number(value || 0).toLocaleString();
}

export function safeDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString();
}

export function centsFromDollars(value = 0) {
  return Math.round(Number(value || 0) * 100);
}

export function dollarsFromCents(value = 0) {
  return Number(value || 0) / 100;
}

export function slugify(value = "") {
  return String(value)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export function makeSlug(value = "rich-bizness") {
  return `${slugify(value) || "rich-bizness"}-${Date.now()}`;
}

export function clampText(value = "", length = 120) {
  const text = String(value || "");
  return text.length > length ? `${text.slice(0, length)}...` : text;
}
