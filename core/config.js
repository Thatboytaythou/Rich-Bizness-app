// core/config.js

export const APP_NAME = 'Rich Bizness';
export const APP_TAGLINE = 'Live • Music • Gaming • Sports • Gallery • Store • Creator World';

export const APP_URL =
  window.location.origin ||
  'https://rich-bizness.vercel.app';

export const ROUTES = {
  home: '/index.html',
  auth: '/auth.html',
  feed: '/feed.html',
  profile: '/profile.html',
  notifications: '/notifications.html',
  messages: '/messages.html',

  live: '/live.html',
  watch: '/watch.html',

  music: '/music.html',
  artistHome: '/artist/index.html',
  artistManage: '/artist/manage.html',
  artistUpload: '/artist/upload.html',
  artistAnalytics: '/artist/analytics.html',

  gaming: '/gaming.html',
  gamingProfile: '/gaming-profile.html',
  gamingLeaderboard: '/gaming-leaderboard.html',
  gamingTournaments: '/gaming-tournaments.html',
  gamingAdmin: '/gaming-admin.html',

  sports: '/sports.html',
  sportsProfile: '/sports-profile.html',
  sportsPost: '/sports-post.html',
  sportsPicks: '/sports-picks.html',
  sportsLeaderboard: '/sports-leaderboard.html',
  sportsSchedule: '/sports-schedule.html',
  sportsAdmin: '/sports-admin.html',

  gallery: '/gallery.html',

  upload: '/upload.html',
  uploadGaming: '/upload-gaming.html',
  uploadSports: '/upload-sports.html',
  uploadMusic: '/upload-music.html',
  uploadFashion: '/upload-fashion.html',
  podcastUpload: '/podcast-upload.html',

  podcast: '/podcast.html',
  radio: '/radio.html',
  playlist: '/playlist.html',
  playlistViews: '/playlist-views.html',
  album: '/album.html',
  albumView: '/album-view.html',

  store: '/store.html',
  storeAdmin: '/store-admin.html',

  monetization: '/monetization.html',
  monetizationSuccess: '/monetization-success.html',
  monetizationCancel: '/monetization-cancel.html',
  payouts: '/payouts.html',

  creatorDashboard: '/creator-dashboard.html',
  adminDashboard: '/admin-dashboard.html',
  adminPayouts: '/admin-payouts.html'
};

export const STORAGE_BUCKETS = {
  avatars: 'avatars',
  profileImages: 'profile-images',
  creatorBanners: 'creator-banners',

  feedMedia: 'feed-media',
  messageAttachments: 'message-attachments',

  liveThumbnails: 'live-thumbnails',
  liveRecordings: 'live-recordings',

  music: 'music',
  musicFiles: 'music-files',
  musicCovers: 'music-covers',
  artistUploads: 'Artist-uploads',

  gaming: 'gaming',
  gamingUploads: 'gaming-uploads',

  sports: 'sports',
  sportsMedia: 'sports-media',

  artworks: 'artworks',
  galleryUploads: 'gallery-uploads',

  podcasts: 'podcasts',
  storeProducts: 'store-products'
};

export const POST_TYPES = {
  standard: 'post',
  music: 'music',
  gaming: 'gaming',
  sports: 'sports',
  artwork: 'artwork',
  live: 'live',
  product: 'product',
  podcast: 'podcast'
};

export const VISIBILITY = {
  public: 'public',
  followers: 'followers',
  private: 'private'
};

export const LIVE_STATUS = {
  draft: 'draft',
  scheduled: 'scheduled',
  live: 'live',
  ended: 'ended'
};

export const LIVE_ACCESS = {
  free: 'free',
  paid: 'paid',
  vip: 'vip'
};

export const PRODUCT_KINDS = {
  digital: 'digital',
  physical: 'physical',
  premium: 'premium',
  liveAccess: 'live_access',
  subscription: 'subscription'
};

export const SPORTS = [
  'Basketball',
  'Football',
  'Baseball',
  'Golf',
  'Gym',
  'MMA',
  'Boxing',
  'Soccer',
  'Track',
  'Other'
];

export const GAMING_PLATFORMS = [
  'PlayStation',
  'Xbox',
  'PC',
  'Nintendo',
  'Mobile',
  'Arcade',
  'Other'
];

export const MUSIC_GENRES = [
  'Hip-Hop',
  'Rap',
  'R&B',
  'Pop',
  'Rock',
  'Jazz',
  'Gospel',
  'Afrobeats',
  'Podcast',
  'Other'
];

export const BRAND_IMAGES = {
  homeHero: '/images/brand/19FB5229-30DD-40B0-9404-5136C27FEF6A.png',
  live: '/images/brand/7F5D6348-B3DF-4584-A206-7F98B8BB0D53.png',
  gaming: '/images/brand/639C7F96-E386-46D4-8929-34AFE3C6EDD3.png',
  sports: '/images/brand/8FE83A11-A7F6-45D7-9840-D8A066A88684.png',
  music: '/images/brand/1E7155FE-1726-4D71-964F-B0337A2E80A1.png',
  gallery: '/images/brand/F1AE13D6-DE21-4024-8E8B-9096BF73DFB7.png',
  artist: '/images/brand/B3C4FDF0-8485-4426-B1B4-A86491EB168B.png',
  baseball: '/images/brand/6F26FF98-8FFE-4A1C-B9FB-C4233274CF8A.png',
  logo: '/images/rich-bizness-profile.jpg'
};

export function getRoute(name) {
  return ROUTES[name] || ROUTES.home;
}

export function absoluteUrl(path = '/') {
  if (!path) return APP_URL;
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  return `${APP_URL}${path.startsWith('/') ? path : `/${path}`}`;
}

export function isActiveRoute(path) {
  const current = window.location.pathname;
  return current === path;
}

export function formatMoney(cents = 0, currency = 'USD') {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency
  }).format((Number(cents || 0)) / 100);
}

export function formatNumber(value = 0) {
  return Number(value || 0).toLocaleString();
}
