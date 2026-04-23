import { initApp, getCurrentUserState, getCurrentProfileState } from "/core/app.js";
import { mountEliteNav } from "/core/nav.js";
import {
  supabase,
  getProfile,
  isFollowing,
  followUser,
  unfollowUser,
  getCreatorBalance
} from "/core/supabase.js";
import { ROUTES, BRAND_IMAGES, formatMoney, formatNumber } from "/core/config.js";
import { getQueryParam } from "/core/utils.js";

function $(id) {
  return document.getElementById(id);
}

const els = {
  navMount: $("elite-platform-nav"),
  statusBox: $("profile-status"),

  heroName: $("profile-display-name"),
  heroHandle: $("profile-handle"),
  heroBio: $("profile-bio"),
  heroAvatar: $("profile-avatar"),
  heroBanner: $("profile-banner"),

  followerCount: $("profile-follower-count"),
  followingCount: $("profile-following-count"),
  postCount: $("profile-post-count"),
  trackCount: $("profile-track-count"),
  productCount: $("profile-product-count"),
  balanceValue: $("profile-balance"),

  followBtn: $("profile-follow-btn"),
  messageBtn: $("profile-message-btn"),
  editBtn: $("profile-edit-btn"),
  shareBtn: $("profile-share-btn"),

  editForm: $("profile-edit-form"),
  saveBtn: $("profile-save-btn"),

  inputDisplayName: $("profile-input-display-name"),
  inputUsername: $("profile-input-username"),
  inputHandle: $("profile-input-handle"),
  inputBio: $("profile-input-bio"),
  inputAvatar: $("profile-input-avatar"),
  inputBanner: $("profile-input-banner"),

  postsGrid: $("profile-posts-grid"),
  musicGrid: $("profile-music-grid"),
  productsGrid: $("profile-products-grid"),
  premiumGrid: $("profile-premium-grid"),
  liveGrid: $("profile-live-grid"),

  tabButtons: Array.from(document.querySelectorAll("[data-profile-tab]")),
  tabPanels: Array.from(document.querySelectorAll("[data-profile-panel]"))
};

let currentUser = null;
let currentOwnProfile = null;
let viewedUserId = null;
let viewedProfile = null;
let followBusy = false;

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function slugify(value = "") {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

function setStatus(message, type = "normal") {
  if (!els.statusBox) return;

  els.statusBox.textContent = message;
  els.statusBox.classList.remove("is-error", "is-success");

  if (type === "error") els.statusBox.classList.add("is-error");
  if (type === "success") els.statusBox.classList.add("is-success");
}

function normalizeProfile(profile) {
  if (Array.isArray(profile)) return profile[0] || null;
  return profile || null;
}

function getDisplayName(profile = null, fallbackUser = null) {
  return (
    profile?.display_name ||
    profile?.username ||
    profile?.handle ||
    fallbackUser?.user_metadata?.display_name ||
    fallbackUser?.user_metadata?.username ||
    fallbackUser?.email?.split("@")[0] ||
    "Rich Bizness User"
  );
}

function getHandle(profile = null, fallbackUser = null) {
  return (
    profile?.handle ||
    profile?.username ||
    slugify(getDisplayName(profile, fallbackUser)) ||
    "richbizness"
  );
}

function getBio(profile = null) {
  return profile?.bio || "Welcome to Rich Bizness.";
}

function getAvatar(profile = null) {
  return (
    profile?.avatar_url ||
    profile?.profile_image_url ||
    profile?.profile_image ||
    BRAND_IMAGES.logo
  );
}

function getBanner(profile = null) {
  return (
    profile?.banner_url ||
    profile?.cover_url ||
    BRAND_IMAGES.artist ||
    BRAND_IMAGES.homeHero
  );
}

function isOwner() {
  return Boolean(currentUser?.id && viewedUserId && currentUser.id === viewedUserId);
}

function show(el, display = "") {
  if (!el) return;
  el.style.display = display;
}

function hide(el) {
  if (!el) return;
  el.style.display = "none";
}

function renderProfileHero() {
  const profile = viewedProfile;

  if (els.heroName) els.heroName.textContent = getDisplayName(profile, currentUser);
  if (els.heroHandle) els.heroHandle.textContent = `@${getHandle(profile, currentUser)}`;
  if (els.heroBio) els.heroBio.textContent = getBio(profile);

  if (els.heroAvatar) {
    els.heroAvatar.src = getAvatar(profile);
    els.heroAvatar.alt = getDisplayName(profile, currentUser);
  }

  if (els.heroBanner) {
    els.heroBanner.src = getBanner(profile);
    els.heroBanner.alt = `${getDisplayName(profile, currentUser)} banner`;
  }

  if (els.messageBtn) {
    els.messageBtn.href = viewedUserId
      ? `${ROUTES.messages}?user=${encodeURIComponent(viewedUserId)}`
      : ROUTES.messages;
  }

  if (els.editBtn) {
    els.editBtn.style.display = isOwner() ? "" : "none";
  }
}

async function fetchCounts(userId) {
  const [
    followersRes,
    followingRes,
    postsRes,
    tracksRes,
    productsRes
  ] = await Promise.all([
    supabase.from("followers").select("id", { count: "exact", head: true }).eq("following_id", userId),
    supabase.from("followers").select("id", { count: "exact", head: true }).eq("follower_id", userId),
    supabase.from("posts").select("id", { count: "exact", head: true }).eq("user_id", userId),
    supabase.from("tracks").select("id", { count: "exact", head: true }).eq("creator_id", userId),
    supabase.from("products").select("id", { count: "exact", head: true }).eq("creator_id", userId)
  ]);

  return {
    followers: followersRes.count || 0,
    following: followingRes.count || 0,
    posts: postsRes.count || 0,
    tracks: tracksRes.count || 0,
    products: productsRes.count || 0
  };
}

async function renderCounts() {
  if (!viewedUserId) return;

  const counts = await fetchCounts(viewedUserId);

  if (els.followerCount) els.followerCount.textContent = formatNumber(counts.followers);
  if (els.followingCount) els.followingCount.textContent = formatNumber(counts.following);
  if (els.postCount) els.postCount.textContent = formatNumber(counts.posts);
  if (els.trackCount) els.trackCount.textContent = formatNumber(counts.tracks);
  if (els.productCount) els.productCount.textContent = formatNumber(counts.products);

  const balance = await getCreatorBalance(viewedUserId);
  if (els.balanceValue) {
    els.balanceValue.textContent = balance
      ? formatMoney(balance.available_cents || 0, "USD")
      : formatMoney(0, "USD");
  }
}

async function syncFollowButton() {
  if (!els.followBtn) return;

  if (!currentUser?.id || !viewedUserId || currentUser.id === viewedUserId) {
    els.followBtn.textContent = currentUser?.id === viewedUserId ? "Your profile" : "Follow";
    els.followBtn.disabled = !currentUser?.id || currentUser.id === viewedUserId;
    return;
  }

  const following = await isFollowing(currentUser.id, viewedUserId);
  els.followBtn.textContent = following ? "Following" : "Follow";
  els.followBtn.dataset.following = following ? "true" : "false";
  els.followBtn.disabled = false;
}

async function handleFollowToggle() {
  if (!els.followBtn || followBusy || !currentUser?.id || !viewedUserId || currentUser.id === viewedUserId) {
    return;
  }

  followBusy = true;
  els.followBtn.disabled = true;

  try {
    const following = els.followBtn.dataset.following === "true";

    if (following) {
      await unfollowUser(currentUser.id, viewedUserId);
      els.followBtn.textContent = "Follow";
      els.followBtn.dataset.following = "false";
      setStatus("Unfollowed creator.", "success");
    } else {
      await followUser(currentUser.id, viewedUserId);
      els.followBtn.textContent = "Following";
      els.followBtn.dataset.following = "true";
      setStatus("Creator followed.", "success");
    }

    await renderCounts();
  } catch (error) {
    console.error("[core/pages/profile] handleFollowToggle error:", error);
    setStatus(error.message || "Could not update follow state.", "error");
  } finally {
    followBusy = false;
    els.followBtn.disabled = false;
  }
}

function fillEditForm() {
  if (!isOwner() || !viewedProfile) return;

  if (els.inputDisplayName) els.inputDisplayName.value = viewedProfile.display_name || "";
  if (els.inputUsername) els.inputUsername.value = viewedProfile.username || "";
  if (els.inputHandle) els.inputHandle.value = viewedProfile.handle || "";
  if (els.inputBio) els.inputBio.value = viewedProfile.bio || "";
  if (els.inputAvatar) els.inputAvatar.value = viewedProfile.avatar_url || viewedProfile.profile_image_url || "";
  if (els.inputBanner) els.inputBanner.value = viewedProfile.banner_url || viewedProfile.cover_url || "";
}

async function saveProfile(event) {
  if (event) event.preventDefault();

  if (!isOwner() || !currentUser?.id) {
    setStatus("You can only edit your own profile.", "error");
    return;
  }

  if (els.saveBtn) els.saveBtn.disabled = true;

  try {
    const displayName = els.inputDisplayName?.value.trim() || "";
    const username = slugify(els.inputUsername?.value.trim() || "");
    const handle = slugify(els.inputHandle?.value.trim() || username || displayName || "richbizness");
    const bio = els.inputBio?.value.trim() || null;
    const avatarUrl = els.inputAvatar?.value.trim() || null;
    const bannerUrl = els.inputBanner?.value.trim() || null;

    const payload = {
      display_name: displayName || getDisplayName(viewedProfile, currentUser),
      username: username || getHandle(viewedProfile, currentUser),
      handle,
      bio,
      avatar_url: avatarUrl,
      profile_image_url: avatarUrl,
      banner_url: bannerUrl,
      cover_url: bannerUrl,
      updated_at: new Date().toISOString()
    };

    const { error } = await supabase
      .from("profiles")
      .update(payload)
      .eq("id", currentUser.id);

    if (error) {
      console.error("[core/pages/profile] saveProfile error:", error);
      throw new Error(error.message || "Could not save profile.");
    }

    viewedProfile = await getProfile(currentUser.id);
    fillEditForm();
    renderProfileHero();
    setStatus("Profile saved.", "success");
  } catch (error) {
    console.error("[core/pages/profile] saveProfile catch:", error);
    setStatus(error.message || "Could not save profile.", "error");
  } finally {
    if (els.saveBtn) els.saveBtn.disabled = false;
  }
}

function emptyCard(title = "Nothing here yet.", body = "This section will fill as content is added.") {
  return `
    <article class="card">
      <strong>${escapeHtml(title)}</strong>
      <p class="mt-2">${escapeHtml(body)}</p>
    </article>
  `;
}

function postCard(post = {}) {
  const title = post.title || post.caption || "Rich Bizness post";
  const body = post.body || post.description || "Creator content";
  const media = post.thumbnail_url || post.cover_url || post.image_url || "";
  const href = post.id ? `/feed.html?post=${encodeURIComponent(post.id)}` : ROUTES.feed;

  return `
    <article class="card">
      ${media ? `<img class="cover-image mb-3" src="${escapeHtml(media)}" alt="${escapeHtml(title)}" />` : ""}
      <strong>${escapeHtml(title)}</strong>
      <p class="mt-2">${escapeHtml(body)}</p>
      <div class="mt-3">
        <a class="btn-ghost" href="${href}">Open Post</a>
      </div>
    </article>
  `;
}

function trackCard(track = {}) {
  const title = track.title || "Untitled Track";
  const artist = track.artist_name || getDisplayName(viewedProfile, currentUser);
  const cover = track.cover_url || BRAND_IMAGES.music;

  return `
    <article class="card">
      <img class="cover-image mb-3" src="${escapeHtml(cover)}" alt="${escapeHtml(title)}" />
      <strong>${escapeHtml(title)}</strong>
      <p class="mt-2">${escapeHtml(artist)}</p>
      <div class="mt-3 inline-wrap">
        <span class="badge">${formatNumber(track.play_count || 0)} plays</span>
        <span class="badge">${formatNumber(track.like_count || 0)} likes</span>
      </div>
    </article>
  `;
}

function productCard(product = {}) {
  const title = product.name || product.title || "Product";
  const image = product.image_url || product.thumbnail_url || BRAND_IMAGES.homeHero;
  const price = formatMoney(product.price_cents || 0, product.currency || "USD");

  return `
    <article class="card">
      <img class="cover-image mb-3" src="${escapeHtml(image)}" alt="${escapeHtml(title)}" />
      <strong>${escapeHtml(title)}</strong>
      <p class="mt-2">${price}</p>
      <div class="mt-3">
        <a class="btn-ghost" href="${ROUTES.store}">Open Store</a>
      </div>
    </article>
  `;
}

function premiumCard(item = {}) {
  const title = item.title || "Premium Content";
  const description = item.description || "Premium unlock";
  const price = formatMoney(item.price_cents || 0, "USD");

  return `
    <article class="card">
      <strong>${escapeHtml(title)}</strong>
      <p class="mt-2">${escapeHtml(description)}</p>
      <div class="mt-3 inline-wrap">
        <span class="badge gold">${price}</span>
      </div>
    </article>
  `;
}

function liveCard(stream = {}) {
  const title = stream.title || "Live Stream";
  const image = stream.thumbnail_url || stream.cover_url || BRAND_IMAGES.live;
  const href = stream.slug
    ? `/watch.html?slug=${encodeURIComponent(stream.slug)}`
    : `/watch.html?id=${encodeURIComponent(stream.id)}`;

  return `
    <article class="card">
      <img class="cover-image mb-3" src="${escapeHtml(image)}" alt="${escapeHtml(title)}" />
      <strong>${escapeHtml(title)}</strong>
      <p class="mt-2">${escapeHtml(stream.status || "draft")}</p>
      <div class="mt-3">
        <a class="btn-ghost" href="${href}">Open Stream</a>
      </div>
    </article>
  `;
}

async function loadPosts() {
  if (!els.postsGrid || !viewedUserId) return;

  const { data, error } = await supabase
    .from("posts")
    .select("*")
    .eq("user_id", viewedUserId)
    .order("created_at", { ascending: false })
    .limit(12);

  if (error) {
    console.error("[core/pages/profile] loadPosts error:", error);
    els.postsGrid.innerHTML = emptyCard("Posts could not load.", "Try refreshing the page.");
    return;
  }

  els.postsGrid.innerHTML = data?.length
    ? data.map(postCard).join("")
    : emptyCard("No posts yet.", "Posts will appear here.");
}

async function loadTracks() {
  if (!els.musicGrid || !viewedUserId) return;

  const { data, error } = await supabase
    .from("tracks")
    .select("*")
    .eq("creator_id", viewedUserId)
    .order("created_at", { ascending: false })
    .limit(12);

  if (error) {
    console.error("[core/pages/profile] loadTracks error:", error);
    els.musicGrid.innerHTML = emptyCard("Music could not load.", "Try refreshing the page.");
    return;
  }

  els.musicGrid.innerHTML = data?.length
    ? data.map(trackCard).join("")
    : emptyCard("No tracks yet.", "Music uploads will appear here.");
}

async function loadProducts() {
  if (!els.productsGrid || !viewedUserId) return;

  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("creator_id", viewedUserId)
    .order("created_at", { ascending: false })
    .limit(12);

  if (error) {
    console.error("[core/pages/profile] loadProducts error:", error);
    els.productsGrid.innerHTML = emptyCard("Products could not load.", "Try refreshing the page.");
    return;
  }

  els.productsGrid.innerHTML = data?.length
    ? data.map(productCard).join("")
    : emptyCard("No products yet.", "Store items will appear here.");
}

async function loadPremiumContent() {
  if (!els.premiumGrid || !viewedUserId) return;

  const { data, error } = await supabase
    .from("premium_content")
    .select("*")
    .eq("creator_id", viewedUserId)
    .order("created_at", { ascending: false })
    .limit(12);

  if (error) {
    console.error("[core/pages/profile] loadPremiumContent error:", error);
    els.premiumGrid.innerHTML = emptyCard("Premium content could not load.", "Try refreshing the page.");
    return;
  }

  els.premiumGrid.innerHTML = data?.length
    ? data.map(premiumCard).join("")
    : emptyCard("No premium content yet.", "Premium unlocks will appear here.");
}

async function loadLiveStreams() {
  if (!els.liveGrid || !viewedUserId) return;

  const { data, error } = await supabase
    .from("live_streams")
    .select("*")
    .eq("creator_id", viewedUserId)
    .order("created_at", { ascending: false })
    .limit(12);

  if (error) {
    console.error("[core/pages/profile] loadLiveStreams error:", error);
    els.liveGrid.innerHTML = emptyCard("Live streams could not load.", "Try refreshing the page.");
    return;
  }

  els.liveGrid.innerHTML = data?.length
    ? data.map(liveCard).join("")
    : emptyCard("No live streams yet.", "Live history will appear here.");
}

function activateTab(tabName) {
  els.tabButtons.forEach((button) => {
    const active = button.dataset.profileTab === tabName;
    button.classList.toggle("active", active);
  });

  els.tabPanels.forEach((panel) => {
    const active = panel.dataset.profilePanel === tabName;
    panel.style.display = active ? "" : "none";
  });
}

function bindTabs() {
  els.tabButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const tabName = button.dataset.profileTab;
      if (!tabName) return;
      activateTab(tabName);
    });
  });
}

function bindActions() {
  els.followBtn?.addEventListener("click", handleFollowToggle);
  els.editForm?.addEventListener("submit", saveProfile);

  els.shareBtn?.addEventListener("click", async () => {
    const shareUrl = `${window.location.origin}/profile.html?user=${encodeURIComponent(viewedUserId || currentUser?.id || "")}`;

    try {
      await navigator.clipboard.writeText(shareUrl);
      setStatus("Profile link copied.", "success");
    } catch (error) {
      console.error("[core/pages/profile] share copy error:", error);
      setStatus("Could not copy profile link.", "error");
    }
  });
}

async function loadViewedProfile() {
  viewedUserId =
    getQueryParam("user", "") ||
    getQueryParam("id", "") ||
    currentUser?.id ||
    "";

  if (!viewedUserId) {
    throw new Error("No profile user id found.");
  }

  viewedProfile = await getProfile(viewedUserId);

  if (!viewedProfile && currentUser?.id === viewedUserId) {
    viewedProfile = currentOwnProfile;
  }

  if (!viewedProfile) {
    throw new Error("Profile could not be loaded.");
  }
}

async function bootProfilePage() {
  await initApp();

  currentUser = getCurrentUserState();
  currentOwnProfile = getCurrentProfileState();

  if (els.navMount) {
    mountEliteNav({
      target: "#elite-platform-nav",
      collapsed: false
    });
  }

  await loadViewedProfile();
  renderProfileHero();
  fillEditForm();
  await syncFollowButton();
  await renderCounts();

  await Promise.all([
    loadPosts(),
    loadTracks(),
    loadProducts(),
    loadPremiumContent(),
    loadLiveStreams()
  ]);

  bindTabs();
  bindActions();
  activateTab("posts");

  if (els.editForm) {
    show(els.editForm, isOwner() ? "" : "none");
  }

  setStatus("Profile loaded.", "success");
}

if (document.body?.classList.contains("profile-page")) {
  bootProfilePage().catch((error) => {
    console.error("[core/pages/profile] bootProfilePage error:", error);
    setStatus(error.message || "Could not load profile.", "error");
  });
}

export { bootProfilePage };
