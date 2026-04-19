import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getPlaylists } from "./playlist-api.js";

const supabase = createClient(
  window.NEXT_PUBLIC_SUPABASE_URL,
  window.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
);

function el(id) {
  return document.getElementById(id);
}

function safeText(value, fallback = "—") {
  if (value === null || value === undefined || value === "") return fallback;
  return String(value);
}

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function showError(message) {
  const node = el("music-error");
  if (!node) return;
  node.textContent = message || "";
  node.style.display = message ? "block" : "none";

  const success = el("music-success");
  if (success && message) success.style.display = "none";
}

function showSuccess(message) {
  const node = el("music-success");
  if (!node) return;
  node.textContent = message || "";
  node.style.display = message ? "block" : "none";

  const error = el("music-error");
  if (error && message) error.style.display = "none";
}

function clearMessages() {
  showError("");
  showSuccess("");
}

const state = {
  tracks: [],
  albums: [],
  playlists: [],
  featuredTracks: [],
  featuredAlbums: [],
  featuredPlaylists: [],
  search: "",
  activeTab: "all"
};

async function getTracks(limit = 24) {
  const { data, error } = await supabase
    .from("tracks")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data || [];
}

async function getAlbums(limit = 24) {
  const { data, error } = await supabase
    .from("albums")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data || [];
}

function applyFilters() {
  const q = state.search.trim().toLowerCase();

  const searchMatch = (text) => !q || String(text || "").toLowerCase().includes(q);

  state.featuredTracks = state.tracks.filter((track) => {
    const blob = `${track.title || ""} ${track.artist_name || ""} ${track.genre || ""} ${track.description || ""}`;
    return searchMatch(blob);
  });

  state.featuredAlbums = state.albums.filter((album) => {
    const blob = `${album.title || ""} ${album.description || ""} ${album.album_type || ""}`;
    return searchMatch(blob);
  });

  state.featuredPlaylists = state.playlists.filter((playlist) => {
    const blob = `${playlist.title || ""} ${playlist.description || ""} ${playlist.visibility || ""}`;
    return searchMatch(blob);
  });
}

function detectMusicShell() {
  return {
    tracksGrid:
      el("music-tracks-grid") ||
      el("tracks-grid") ||
      document.querySelector("[data-music-tracks-grid]"),

    albumsGrid:
      el("music-albums-grid") ||
      el("albums-grid") ||
      document.querySelector("[data-music-albums-grid]"),

    playlistsGrid:
      el("music-playlists-grid") ||
      el("playlists-grid") ||
      document.querySelector("[data-music-playlists-grid]"),

    summaryStats:
      el("music-summary-stats") ||
      document.querySelector("[data-music-summary-stats]"),

    tabBar:
      el("music-tab-bar") ||
      document.querySelector("[data-music-tab-bar]"),

    searchInput:
      el("music-search") ||
      document.querySelector("[data-music-search]") ||
      document.querySelector("input[type='search']"),

    sectionsWrap:
      el("music-sections-wrap") ||
      document.querySelector("[data-music-sections-wrap]") ||
      document.querySelector(".music-sections")
  };
}

function ensureSection(title, subtitle, gridId) {
  let section = document.getElementById(`${gridId}-section`);
  if (section) return section;

  const shell = detectMusicShell();
  const host =
    shell.sectionsWrap ||
    document.querySelector(".container") ||
    document.querySelector(".page-shell") ||
    document.body;

  section = document.createElement("section");
  section.id = `${gridId}-section`;
  section.style.marginTop = "20px";
  section.innerHTML = `
    <div style="background:rgba(0,0,0,0.55);border:1px solid rgba(255,255,255,0.08);border-radius:22px;padding:18px;">
      <div style="display:flex;justify-content:space-between;gap:12px;align-items:flex-end;flex-wrap:wrap;margin-bottom:14px;">
        <div>
          <h2 style="margin:0;font-size:28px;">${escapeHtml(title)}</h2>
          <p style="margin:8px 0 0;color:#b8c7c0;">${escapeHtml(subtitle)}</p>
        </div>
      </div>
      <div id="${gridId}" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:16px;"></div>
    </div>
  `;

  host.appendChild(section);
  return section;
}

function ensureSummaryBar() {
  let summary = el("music-summary-stats");
  if (summary) return summary;

  const hero =
    document.querySelector(".hero") ||
    document.querySelector(".hero-card") ||
    document.querySelector(".music-hero") ||
    document.querySelector(".container") ||
    document.querySelector(".page-shell");

  summary = document.createElement("div");
  summary.id = "music-summary-stats";
  summary.style.cssText =
    "display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px;margin-top:18px;";

  if (hero) {
    hero.appendChild(summary);
  }

  return summary;
}

function ensureSearchBar() {
  const shell = detectMusicShell();
  if (shell.searchInput) return shell.searchInput;

  const hero =
    document.querySelector(".hero") ||
    document.querySelector(".hero-card") ||
    document.querySelector(".music-hero") ||
    document.querySelector(".container") ||
    document.querySelector(".page-shell");

  const wrap = document.createElement("div");
  wrap.style.marginTop = "16px";
  wrap.innerHTML = `
    <input
      id="music-search"
      type="search"
      placeholder="Search tracks, albums, playlists..."
      style="width:100%;max-width:460px;padding:14px 16px;border-radius:16px;border:1px solid rgba(255,255,255,0.08);background:rgba(255,255,255,0.04);color:white;outline:none;"
    />
  `;

  if (hero) hero.appendChild(wrap);
  return el("music-search");
}

function ensureTabs() {
  let bar = el("music-tab-bar");
  if (bar) return bar;

  const hero =
    document.querySelector(".hero") ||
    document.querySelector(".hero-card") ||
    document.querySelector(".music-hero") ||
    document.querySelector(".container") ||
    document.querySelector(".page-shell");

  bar = document.createElement("div");
  bar.id = "music-tab-bar";
  bar.style.cssText = "display:flex;gap:10px;flex-wrap:wrap;margin-top:16px;";
  bar.innerHTML = `
    <button class="music-tab-btn active" data-tab="all" type="button" style="padding:10px 14px;border-radius:12px;border:1px solid rgba(255,255,255,0.08);background:rgba(67,245,155,0.18);color:white;font-weight:800;cursor:pointer;">All</button>
    <button class="music-tab-btn" data-tab="tracks" type="button" style="padding:10px 14px;border-radius:12px;border:1px solid rgba(255,255,255,0.08);background:rgba(255,255,255,0.04);color:white;font-weight:800;cursor:pointer;">Tracks</button>
    <button class="music-tab-btn" data-tab="albums" type="button" style="padding:10px 14px;border-radius:12px;border:1px solid rgba(255,255,255,0.08);background:rgba(255,255,255,0.04);color:white;font-weight:800;cursor:pointer;">Albums</button>
    <button class="music-tab-btn" data-tab="playlists" type="button" style="padding:10px 14px;border-radius:12px;border:1px solid rgba(255,255,255,0.08);background:rgba(255,255,255,0.04);color:white;font-weight:800;cursor:pointer;">Playlists</button>
  `;

  if (hero) hero.appendChild(bar);
  return bar;
}

function renderSummary() {
  const summary = ensureSummaryBar();
  if (!summary) return;

  summary.innerHTML = `
    <div style="padding:16px;border-radius:18px;border:1px solid rgba(110,255,176,0.16);background:rgba(255,255,255,0.04);">
      <div style="color:#97b8a6;font-size:12px;margin-bottom:6px;">Tracks</div>
      <strong style="font-size:26px;">${state.tracks.length}</strong>
    </div>
    <div style="padding:16px;border-radius:18px;border:1px solid rgba(110,255,176,0.16);background:rgba(255,255,255,0.04);">
      <div style="color:#97b8a6;font-size:12px;margin-bottom:6px;">Albums</div>
      <strong style="font-size:26px;">${state.albums.length}</strong>
    </div>
    <div style="padding:16px;border-radius:18px;border:1px solid rgba(110,255,176,0.16);background:rgba(255,255,255,0.04);">
      <div style="color:#97b8a6;font-size:12px;margin-bottom:6px;">Playlists</div>
      <strong style="font-size:26px;">${state.playlists.length}</strong>
    </div>
  `;
}

function trackCard(track) {
  return `
    <article style="background:rgba(0,0,0,0.52);border:1px solid rgba(255,255,255,0.08);border-radius:20px;overflow:hidden;">
      <div style="aspect-ratio:1/1;background:rgba(255,255,255,0.03);">
        <img
          src="${escapeHtml(track.cover_url || "/images/brand/logo-music-label.png")}"
          alt="${escapeHtml(track.title || "Track")}"
          style="width:100%;height:100%;object-fit:cover;"
        />
      </div>
      <div style="padding:16px;display:grid;gap:10px;">
        <div>
          <h3 style="margin:0 0 6px;font-size:18px;">${escapeHtml(safeText(track.title, "Untitled Track"))}</h3>
          <p style="margin:0;color:#97b8a6;font-size:13px;line-height:1.6;">
            ${escapeHtml(safeText(track.artist_name, "Artist"))}
            ${track.genre ? ` • ${escapeHtml(track.genre)}` : ""}
          </p>
        </div>
        ${track.audio_url ? `<audio controls src="${escapeHtml(track.audio_url)}" style="width:100%;"></audio>` : ""}
        <div style="display:flex;gap:10px;flex-wrap:wrap;">
          <a href="/artist/" style="padding:10px 12px;border-radius:12px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);font-weight:800;">Artist</a>
        </div>
      </div>
    </article>
  `;
}

function albumCard(album) {
  return `
    <article style="background:rgba(0,0,0,0.52);border:1px solid rgba(255,255,255,0.08);border-radius:20px;overflow:hidden;">
      <div style="aspect-ratio:1/1;background:rgba(255,255,255,0.03);position:relative;">
        <img
          src="${escapeHtml(album.cover_url || "/images/brand/logo-music-label.png")}"
          alt="${escapeHtml(album.title || "Album")}"
          style="width:100%;height:100%;object-fit:cover;"
        />
        <div style="position:absolute;top:12px;right:12px;padding:6px 10px;border-radius:999px;background:rgba(0,0,0,0.56);border:1px solid rgba(255,255,255,0.08);font-size:11px;font-weight:900;">
          ${escapeHtml((album.album_type || "album").toUpperCase())}
        </div>
      </div>
      <div style="padding:16px;display:grid;gap:10px;">
        <div>
          <h3 style="margin:0 0 6px;font-size:18px;">${escapeHtml(safeText(album.title, "Untitled Album"))}</h3>
          <p style="margin:0;color:#97b8a6;font-size:13px;line-height:1.6;">
            ${escapeHtml(safeText(album.description, "Release ready for the music lane."))}
          </p>
        </div>
        <div style="display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;color:#97b8a6;font-size:12px;">
          <span>${Number(album.track_count || 0)} tracks</span>
          <span>${escapeHtml(safeText(album.visibility, "public"))}</span>
        </div>
        <div style="display:flex;gap:10px;flex-wrap:wrap;">
          <a href="/album.html" style="padding:10px 12px;border-radius:12px;background:rgba(67,245,155,0.12);border:1px solid rgba(67,245,155,0.16);font-weight:800;">Open Album</a>
        </div>
      </div>
    </article>
  `;
}

function playlistCard(playlist) {
  return `
    <article style="background:rgba(0,0,0,0.52);border:1px solid rgba(255,255,255,0.08);border-radius:20px;overflow:hidden;">
      <div style="aspect-ratio:1/1;background:rgba(255,255,255,0.03);position:relative;">
        <img
          src="${escapeHtml(playlist.cover_url || "/images/brand/logo-music-label.png")}"
          alt="${escapeHtml(playlist.title || "Playlist")}"
          style="width:100%;height:100%;object-fit:cover;"
        />
        <div style="position:absolute;top:12px;right:12px;padding:6px 10px;border-radius:999px;background:rgba(0,0,0,0.56);border:1px solid rgba(255,255,255,0.08);font-size:11px;font-weight:900;">
          ${playlist.is_featured ? "FEATURED" : "PLAYLIST"}
        </div>
      </div>
      <div style="padding:16px;display:grid;gap:10px;">
        <div>
          <h3 style="margin:0 0 6px;font-size:18px;">${escapeHtml(safeText(playlist.title, "Untitled Playlist"))}</h3>
          <p style="margin:0;color:#97b8a6;font-size:13px;line-height:1.6;">
            ${escapeHtml(safeText(playlist.description, "Curated playlist ready for replay."))}
          </p>
        </div>
        <div style="display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;color:#97b8a6;font-size:12px;">
          <span>${Number(playlist.track_count || 0)} tracks</span>
          <span>${escapeHtml(safeText(playlist.visibility, "public"))}</span>
        </div>
        <div style="display:flex;gap:10px;flex-wrap:wrap;">
          <a href="/playlist-view.html?id=${encodeURIComponent(playlist.id)}" style="padding:10px 12px;border-radius:12px;background:rgba(67,245,155,0.12);border:1px solid rgba(67,245,155,0.16);font-weight:800;">Open Playlist</a>
        </div>
      </div>
    </article>
  `;
}

function renderTracks() {
  ensureSection("Tracks", "Latest uploaded music on Rich Bizness.", "music-tracks-grid");
  const grid = el("music-tracks-grid");
  if (!grid) return;

  if (state.featuredTracks.length === 0) {
    grid.innerHTML = `
      <div style="padding:18px;border-radius:18px;border:1px dashed rgba(110,255,176,0.18);background:rgba(255,255,255,0.03);color:#97b8a6;">
        No tracks found yet.
      </div>
    `;
    return;
  }

  grid.innerHTML = state.featuredTracks.map(trackCard).join("");
}

function renderAlbums() {
  ensureSection("Albums", "Projects, EPs, singles, and mixtapes.", "music-albums-grid");
  const grid = el("music-albums-grid");
  if (!grid) return;

  if (state.featuredAlbums.length === 0) {
    grid.innerHTML = `
      <div style="padding:18px;border-radius:18px;border:1px dashed rgba(110,255,176,0.18);background:rgba(255,255,255,0.03);color:#97b8a6;">
        No albums found yet.
      </div>
    `;
    return;
  }

  grid.innerHTML = state.featuredAlbums.map(albumCard).join("");
}

function renderPlaylists() {
  ensureSection("Playlists", "Curated mixes, mood lanes, and radio foundations.", "music-playlists-grid");
  const grid = el("music-playlists-grid");
  if (!grid) return;

  if (state.featuredPlaylists.length === 0) {
    grid.innerHTML = `
      <div style="padding:18px;border-radius:18px;border:1px dashed rgba(110,255,176,0.18);background:rgba(255,255,255,0.03);color:#97b8a6;">
        No playlists found yet.
      </div>
    `;
    return;
  }

  grid.innerHTML = state.featuredPlaylists.map(playlistCard).join("");
}

function updateSectionVisibility() {
  const tracksSection = document.getElementById("music-tracks-grid-section");
  const albumsSection = document.getElementById("music-albums-grid-section");
  const playlistsSection = document.getElementById("music-playlists-grid-section");

  const showAll = state.activeTab === "all";
  if (tracksSection) tracksSection.style.display = showAll || state.activeTab === "tracks" ? "" : "none";
  if (albumsSection) albumsSection.style.display = showAll || state.activeTab === "albums" ? "" : "none";
  if (playlistsSection) playlistsSection.style.display = showAll || state.activeTab === "playlists" ? "" : "none";
}

function bindSearch() {
  const input = ensureSearchBar();
  if (!input || input.dataset.bound === "true") return;

  input.dataset.bound = "true";
  input.addEventListener("input", () => {
    state.search = input.value.trim();
    applyFilters();
    renderAll();
  });
}

function bindTabs() {
  const bar = ensureTabs();
  if (!bar) return;

  bar.querySelectorAll(".music-tab-btn").forEach((button) => {
    if (button.dataset.bound === "true") return;
    button.dataset.bound = "true";

    button.addEventListener("click", () => {
      state.activeTab = button.getAttribute("data-tab") || "all";
      bar.querySelectorAll(".music-tab-btn").forEach((btn) => {
        btn.classList.remove("active");
        btn.style.background = "rgba(255,255,255,0.04)";
      });
      button.classList.add("active");
      button.style.background = "rgba(67,245,155,0.18)";
      updateSectionVisibility();
    });
  });
}

function renderAll() {
  renderSummary();
  renderTracks();
  renderAlbums();
  renderPlaylists();
  updateSectionVisibility();
}

async function bootMusicClient() {
  try {
    clearMessages();
    bindSearch();
    bindTabs();

    const [tracks, albums, playlists] = await Promise.all([
      getTracks().catch(() => []),
      getAlbums().catch(() => []),
      getPlaylists().catch(() => [])
    ]);

    state.tracks = tracks;
    state.albums = albums;
    state.playlists = playlists;

    applyFilters();
    renderAll();

    if (!tracks.length && !albums.length && !playlists.length) {
      showError("Music page is live, but no real tracks, albums, or playlists were found yet.");
      return;
    }

    showSuccess("Music page is now pulling real tracks, albums, and playlists.");
  } catch (error) {
    console.error("[music-client] boot error:", error);
    showError(error.message || "Failed to load music page.");
  }
}

document.addEventListener("DOMContentLoaded", bootMusicClient);
