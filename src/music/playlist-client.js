import {
  getPlaylistBundle,
  createPlaylist,
  updatePlaylist,
  deletePlaylist,
  addTrackToPlaylist,
  removeTrackFromPlaylist,
  getPlaylistTracks,
  getTracksForCurrentUser
} from "./playlist-api.js";

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

function getPlaylistIdFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get("id");
}

function setQueryParam(key, value) {
  const url = new URL(window.location.href);
  if (value) {
    url.searchParams.set(key, value);
  } else {
    url.searchParams.delete(key);
  }
  window.history.replaceState({}, "", url.toString());
}

function showError(message) {
  const node = el("playlist-error");
  if (!node) return;
  node.textContent = message || "";
  node.style.display = message ? "block" : "none";

  const success = el("playlist-success");
  if (success && message) success.style.display = "none";
}

function showSuccess(message) {
  const node = el("playlist-success");
  if (!node) return;
  node.textContent = message || "";
  node.style.display = message ? "block" : "none";

  const error = el("playlist-error");
  if (error && message) error.style.display = "none";
}

function clearMessages() {
  showError("");
  showSuccess("");
}

const state = {
  currentUser: null,
  playlists: [],
  filteredPlaylists: [],
  myTracks: [],
  selectedPlaylist: null,
  selectedTracks: [],
  activeFilter: "all",
  search: ""
};

function playlistMatchesFilter(playlist, filter) {
  if (filter === "all") return true;
  if (filter === "featured") return !!playlist.is_featured;

  const text = `${playlist.title || ""} ${playlist.description || ""}`.toLowerCase();

  if (filter === "artist") return text.includes("artist");
  if (filter === "mood") return text.includes("mood") || text.includes("vibe");
  if (filter === "night") return text.includes("night") || text.includes("late");
  return true;
}

function applyPlaylistFilters() {
  state.filteredPlaylists = state.playlists.filter((playlist) => {
    const matchesFilter = playlistMatchesFilter(playlist, state.activeFilter);
    const matchesSearch =
      !state.search ||
      `${playlist.title || ""} ${playlist.description || ""}`
        .toLowerCase()
        .includes(state.search.toLowerCase());

    return matchesFilter && matchesSearch;
  });
}

function getOwnerLabel(playlist) {
  if (playlist.creator_id === state.currentUser?.id) return "You";
  return "Artist";
}

function renderPlaylistGrid() {
  const grid = el("playlist-grid");
  const empty = el("playlist-empty");
  if (!grid || !empty) return;

  applyPlaylistFilters();

  if (!state.filteredPlaylists.length) {
    grid.style.display = "none";
    empty.style.display = "grid";
    return;
  }

  empty.style.display = "none";
  grid.style.display = "grid";

  grid.innerHTML = state.filteredPlaylists.map((playlist) => `
    <article class="playlist-card">
      <div class="playlist-media">
        <img
          src="${escapeHtml(playlist.cover_url || "/images/brand/logo-music-label.png")}"
          alt="${escapeHtml(playlist.title || "Playlist")}"
        />
        <div class="playlist-badge">${playlist.is_featured ? "Featured" : "Playlist"}</div>
      </div>

      <div class="playlist-body">
        <h3 class="playlist-title">${escapeHtml(safeText(playlist.title, "Untitled Playlist"))}</h3>
        <p class="playlist-copy">${escapeHtml(safeText(playlist.description, "Curated Rich Bizness playlist."))}</p>

        <div class="playlist-meta">
          <span>${Number(playlist.track_count || 0)} tracks</span>
          <span>${escapeHtml(String(playlist.visibility || "public"))}</span>
        </div>

        <div class="playlist-owner">
          <div class="playlist-owner-avatar">${playlist.creator_id === state.currentUser?.id ? "YOU" : "RB"}</div>
          <div class="playlist-owner-text">
            <strong>${escapeHtml(getOwnerLabel(playlist))}</strong>
            <span>${playlist.creator_id === state.currentUser?.id ? "Your Playlist" : "Curated Mix"}</span>
          </div>
        </div>

        <div class="playlist-actions">
          <button class="btn-card" data-open-playlist="${playlist.id}" type="button">Open Playlist</button>
          ${
            playlist.creator_id === state.currentUser?.id
              ? `<button class="btn-card" data-edit-playlist="${playlist.id}" type="button">Edit Playlist</button>`
              : ""
          }
        </div>
      </div>
    </article>
  `).join("");

  grid.querySelectorAll("[data-open-playlist]").forEach((button) => {
    button.addEventListener("click", () => {
      const playlistId = button.getAttribute("data-open-playlist");
      window.location.href = `/playlist-view.html?id=${encodeURIComponent(playlistId)}`;
    });
  });

  grid.querySelectorAll("[data-edit-playlist]").forEach((button) => {
    button.addEventListener("click", () => {
      const playlistId = button.getAttribute("data-edit-playlist");
      openPlaylistManager(playlistId, true);
    });
  });
}

function ensureManagerShell() {
  let shell = el("playlist-manager-shell");
  if (shell) return shell;

  const pageShell = document.querySelector(".page-shell") || document.querySelector(".container");
  const footer = document.querySelector(".footer");

  shell = document.createElement("section");
  shell.id = "playlist-manager-shell";
  shell.className = "panel";
  shell.style.marginTop = "18px";
  shell.innerHTML = `
    <div class="panel-head">
      <div>
        <h3 id="playlist-manager-title">Playlist Manager</h3>
        <p id="playlist-manager-subtitle">Create, edit, and fill playlists with your tracks.</p>
      </div>
      <div style="display:flex;gap:10px;flex-wrap:wrap;">
        <button id="playlist-new-btn" class="btn" type="button">New Playlist</button>
        <button id="playlist-close-btn" class="btn-ghost" type="button">Close</button>
      </div>
    </div>
    <div class="panel-body" id="playlist-manager-body"></div>
  `;

  if (footer && pageShell) {
    pageShell.insertBefore(shell, footer);
  } else if (pageShell) {
    pageShell.appendChild(shell);
  }

  el("playlist-close-btn")?.addEventListener("click", closePlaylistManager);
  el("playlist-new-btn")?.addEventListener("click", () => openCreatePlaylistForm());

  return shell;
}

function closePlaylistManager() {
  const shell = el("playlist-manager-shell");
  if (shell) shell.remove();
  state.selectedPlaylist = null;
  state.selectedTracks = [];
  setQueryParam("id", "");
}

function openCreatePlaylistForm() {
  const shell = ensureManagerShell();
  if (!shell) return;

  el("playlist-manager-title").textContent = "Create Playlist";
  el("playlist-manager-subtitle").textContent = "Build a new playlist and start organizing tracks.";

  el("playlist-manager-body").innerHTML = `
    <div style="display:grid;gap:14px;">
      <div style="display:grid;gap:8px;">
        <label>Title</label>
        <input id="playlist-form-title" type="text" placeholder="Late Night Studio" style="width:100%;border:1px solid rgba(255,255,255,0.08);background:rgba(255,255,255,0.04);color:var(--text);border-radius:14px;padding:13px 14px;" />
      </div>

      <div style="display:grid;gap:8px;">
        <label>Description</label>
        <input id="playlist-form-description" type="text" placeholder="After-hours studio sound." style="width:100%;border:1px solid rgba(255,255,255,0.08);background:rgba(255,255,255,0.04);color:var(--text);border-radius:14px;padding:13px 14px;" />
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;">
        <div style="display:grid;gap:8px;">
          <label>Cover URL</label>
          <input id="playlist-form-cover" type="text" placeholder="https://..." style="width:100%;border:1px solid rgba(255,255,255,0.08);background:rgba(255,255,255,0.04);color:var(--text);border-radius:14px;padding:13px 14px;" />
        </div>

        <div style="display:grid;gap:8px;">
          <label>Visibility</label>
          <select id="playlist-form-visibility" style="width:100%;border:1px solid rgba(255,255,255,0.08);background:rgba(255,255,255,0.04);color:var(--text);border-radius:14px;padding:13px 14px;">
            <option value="public">public</option>
            <option value="private">private</option>
            <option value="unlisted">unlisted</option>
          </select>
        </div>
      </div>

      <label style="display:flex;align-items:center;gap:10px;">
        <input id="playlist-form-featured" type="checkbox" />
        <span>Featured playlist</span>
      </label>

      <div style="display:flex;gap:10px;flex-wrap:wrap;">
        <button id="playlist-save-create-btn" class="btn" type="button">Create Playlist</button>
      </div>
    </div>
  `;

  el("playlist-save-create-btn")?.addEventListener("click", handleCreatePlaylist);
}

function renderPlaylistManager() {
  if (!state.selectedPlaylist) return;

  const shell = ensureManagerShell();
  if (!shell) return;

  const playlist = state.selectedPlaylist;
  const isOwner = playlist.creator_id === state.currentUser?.id;

  el("playlist-manager-title").textContent = playlist.title || "Playlist Manager";
  el("playlist-manager-subtitle").textContent = isOwner
    ? "Edit playlist details and manage your track order."
    : "View playlist details and track list.";

  const myTracksMarkup = isOwner
    ? `
      <div class="panel" style="border-radius:22px;">
        <div class="panel-head">
          <div>
            <h3 style="font-size:20px;">Add Your Tracks</h3>
            <p>Push songs from your catalog into this playlist.</p>
          </div>
        </div>
        <div class="panel-body">
          <div id="playlist-my-tracks" style="display:grid;gap:12px;"></div>
        </div>
      </div>
    `
    : "";

  el("playlist-manager-body").innerHTML = `
    <div style="display:grid;gap:18px;">
      <div class="panel" style="border-radius:22px;">
        <div class="panel-head">
          <div>
            <h3 style="font-size:20px;">Playlist Details</h3>
            <p>${isOwner ? "Update your playlist info below." : "Playlist info is view only."}</p>
          </div>
        </div>
        <div class="panel-body">
          <div style="display:grid;gap:14px;">
            <div style="display:grid;gap:8px;">
              <label>Title</label>
              <input id="playlist-edit-title" ${isOwner ? "" : "disabled"} type="text" value="${escapeHtml(playlist.title || "")}" style="width:100%;border:1px solid rgba(255,255,255,0.08);background:rgba(255,255,255,0.04);color:var(--text);border-radius:14px;padding:13px 14px;" />
            </div>

            <div style="display:grid;gap:8px;">
              <label>Description</label>
              <input id="playlist-edit-description" ${isOwner ? "" : "disabled"} type="text" value="${escapeHtml(playlist.description || "")}" style="width:100%;border:1px solid rgba(255,255,255,0.08);background:rgba(255,255,255,0.04);color:var(--text);border-radius:14px;padding:13px 14px;" />
            </div>

            <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;">
              <div style="display:grid;gap:8px;">
                <label>Cover URL</label>
                <input id="playlist-edit-cover" ${isOwner ? "" : "disabled"} type="text" value="${escapeHtml(playlist.cover_url || "")}" style="width:100%;border:1px solid rgba(255,255,255,0.08);background:rgba(255,255,255,0.04);color:var(--text);border-radius:14px;padding:13px 14px;" />
              </div>

              <div style="display:grid;gap:8px;">
                <label>Visibility</label>
                <select id="playlist-edit-visibility" ${isOwner ? "" : "disabled"} style="width:100%;border:1px solid rgba(255,255,255,0.08);background:rgba(255,255,255,0.04);color:var(--text);border-radius:14px;padding:13px 14px;">
                  <option value="public" ${playlist.visibility === "public" ? "selected" : ""}>public</option>
                  <option value="private" ${playlist.visibility === "private" ? "selected" : ""}>private</option>
                  <option value="unlisted" ${playlist.visibility === "unlisted" ? "selected" : ""}>unlisted</option>
                </select>
              </div>
            </div>

            ${
              isOwner
                ? `
                <label style="display:flex;align-items:center;gap:10px;">
                  <input id="playlist-edit-featured" type="checkbox" ${playlist.is_featured ? "checked" : ""} />
                  <span>Featured playlist</span>
                </label>

                <div style="display:flex;gap:10px;flex-wrap:wrap;">
                  <button id="playlist-save-edit-btn" class="btn" type="button">Save Playlist</button>
                  <button id="playlist-delete-btn" class="btn-ghost" type="button">Delete Playlist</button>
                </div>
              `
                : ""
            }
          </div>
        </div>
      </div>

      <div class="panel" style="border-radius:22px;">
        <div class="panel-head">
          <div>
            <h3 style="font-size:20px;">Playlist Tracks</h3>
            <p>${state.selectedTracks.length} tracks currently inside this playlist.</p>
          </div>
        </div>
        <div class="panel-body">
          <div id="playlist-selected-tracks" style="display:grid;gap:12px;"></div>
        </div>
      </div>

      ${myTracksMarkup}
    </div>
  `;

  renderSelectedTracks(isOwner);

  if (isOwner) {
    renderMyTracks();
    el("playlist-save-edit-btn")?.addEventListener("click", handleUpdatePlaylist);
    el("playlist-delete-btn")?.addEventListener("click", handleDeletePlaylist);
  }
}

function renderSelectedTracks(isOwner) {
  const container = el("playlist-selected-tracks");
  if (!container) return;

  if (!state.selectedTracks.length) {
    container.innerHTML = `
      <div class="card">
        <h4>No tracks yet</h4>
        <p>${isOwner ? "Add tracks from your catalog below." : "This playlist does not have tracks yet."}</p>
      </div>
    `;
    return;
  }

  container.innerHTML = state.selectedTracks.map((track, index) => `
    <div class="card" style="display:grid;gap:10px;">
      <div style="display:flex;justify-content:space-between;gap:12px;align-items:flex-start;flex-wrap:wrap;">
        <div>
          <h4 style="margin:0 0 6px;">${escapeHtml(track.title || "Untitled Track")}</h4>
          <p>${escapeHtml(track.artist_name || "Artist")} • ${escapeHtml(track.genre || "No genre")}</p>
        </div>
        ${isOwner ? `<button class="btn-ghost" data-remove-track="${track.playlist_track_id}" type="button">Remove</button>` : ""}
      </div>
      ${track.audio_url ? `<audio controls src="${escapeHtml(track.audio_url)}" style="width:100%;"></audio>` : ""}
      <div style="color:var(--muted);font-size:12px;">Track ${index + 1}</div>
    </div>
  `).join("");

  if (isOwner) {
    container.querySelectorAll("[data-remove-track]").forEach((button) => {
      button.addEventListener("click", async () => {
        try {
          clearMessages();
          await removeTrackFromPlaylist(button.getAttribute("data-remove-track"));
          showSuccess("Track removed from playlist.");
          await reloadSelectedPlaylist();
        } catch (error) {
          console.error("[playlist-client] remove track error:", error);
          showError(error.message || "Could not remove track.");
        }
      });
    });
  }
}

function renderMyTracks() {
  const container = el("playlist-my-tracks");
  if (!container) return;

  if (!state.myTracks.length) {
    container.innerHTML = `
      <div class="card">
        <h4>No uploaded tracks yet</h4>
        <p>Upload music first, then add it into your playlists.</p>
      </div>
    `;
    return;
  }

  const selectedTrackIds = new Set(state.selectedTracks.map((track) => track.id));

  container.innerHTML = state.myTracks.map((track) => `
    <div class="card" style="display:flex;justify-content:space-between;gap:12px;align-items:flex-start;flex-wrap:wrap;">
      <div>
        <h4 style="margin:0 0 6px;">${escapeHtml(track.title || "Untitled Track")}</h4>
        <p>${escapeHtml(track.artist_name || "Artist")} • ${escapeHtml(track.genre || "No genre")}</p>
      </div>
      <button
        class="btn-ghost"
        data-add-track="${track.id}"
        type="button"
        ${selectedTrackIds.has(track.id) ? "disabled" : ""}
      >
        ${selectedTrackIds.has(track.id) ? "Added" : "Add Track"}
      </button>
    </div>
  `).join("");

  container.querySelectorAll("[data-add-track]").forEach((button) => {
    button.addEventListener("click", async () => {
      try {
        clearMessages();
        await addTrackToPlaylist({
          playlistId: state.selectedPlaylist.id,
          trackId: button.getAttribute("data-add-track")
        });
        showSuccess("Track added to playlist.");
        await reloadSelectedPlaylist();
      } catch (error) {
        console.error("[playlist-client] add track error:", error);
        showError(error.message || "Could not add track.");
      }
    });
  });
}

async function reloadSelectedPlaylist() {
  if (!state.selectedPlaylist?.id) return;

  state.selectedTracks = await getPlaylistTracks(state.selectedPlaylist.id);
  state.myTracks = state.currentUser?.id ? await getTracksForCurrentUser().catch(() => []) : [];
  renderPlaylistManager();
  await refreshPlaylistListOnly();
}

async function refreshPlaylistListOnly() {
  const playlistId = state.selectedPlaylist?.id || getPlaylistIdFromUrl() || null;

  const bundle = await getPlaylistBundle({
    playlistId,
    search: state.search,
    featuredOnly: false
  });

  state.currentUser = bundle.currentUser;
  state.playlists = bundle.playlists;

  if (bundle.selectedPlaylist) {
    state.selectedPlaylist = bundle.selectedPlaylist;
  }

  renderPlaylistGrid();
}

async function openPlaylistManager(playlistId, forceOpen = false) {
  try {
    clearMessages();

    const bundle = await getPlaylistBundle({
      playlistId,
      search: state.search,
      featuredOnly: false
    });

    state.currentUser = bundle.currentUser;
    state.playlists = bundle.playlists;
    state.myTracks = bundle.myTracks || [];
    state.selectedPlaylist = bundle.selectedPlaylist;
    state.selectedTracks = bundle.selectedTracks || [];

    renderPlaylistGrid();
    renderPlaylistManager();
    setQueryParam("id", playlistId);

    if (forceOpen || bundle.selectedPlaylist) {
      ensureManagerShell().scrollIntoView({ behavior: "smooth", block: "start" });
    }
  } catch (error) {
    console.error("[playlist-client] open playlist manager error:", error);
    showError(error.message || "Could not open playlist.");
  }
}

async function handleCreatePlaylist() {
  try {
    clearMessages();

    const title = el("playlist-form-title")?.value?.trim() || "";
    const description = el("playlist-form-description")?.value?.trim() || "";
    const cover_url = el("playlist-form-cover")?.value?.trim() || "";
    const visibility = el("playlist-form-visibility")?.value || "public";
    const is_featured = !!el("playlist-form-featured")?.checked;

    if (!title) throw new Error("Playlist title is required.");

    const playlist = await createPlaylist({
      title,
      description,
      cover_url,
      visibility,
      is_featured
    });

    showSuccess("Playlist created.");
    await openPlaylistManager(playlist.id, true);
  } catch (error) {
    console.error("[playlist-client] create playlist error:", error);
    showError(error.message || "Could not create playlist.");
  }
}

async function handleUpdatePlaylist() {
  try {
    clearMessages();

    if (!state.selectedPlaylist?.id) {
      throw new Error("No playlist selected.");
    }

    const updated = await updatePlaylist(state.selectedPlaylist.id, {
      title: el("playlist-edit-title")?.value || "",
      description: el("playlist-edit-description")?.value || "",
      cover_url: el("playlist-edit-cover")?.value || "",
      visibility: el("playlist-edit-visibility")?.value || "public",
      is_featured: !!el("playlist-edit-featured")?.checked
    });

    state.selectedPlaylist = updated;
    showSuccess("Playlist updated.");
    await reloadSelectedPlaylist();
  } catch (error) {
    console.error("[playlist-client] update playlist error:", error);
    showError(error.message || "Could not update playlist.");
  }
}

async function handleDeletePlaylist() {
  try {
    clearMessages();

    if (!state.selectedPlaylist?.id) {
      throw new Error("No playlist selected.");
    }

    const confirmed = window.confirm("Delete this playlist?");
    if (!confirmed) return;

    await deletePlaylist(state.selectedPlaylist.id);
    showSuccess("Playlist deleted.");
    closePlaylistManager();
    await bootPlaylistPage();
  } catch (error) {
    console.error("[playlist-client] delete playlist error:", error);
    showError(error.message || "Could not delete playlist.");
  }
}

function bindToolbar() {
  const searchInput = el("playlist-search");
  if (searchInput && searchInput.dataset.bound !== "true") {
    searchInput.dataset.bound = "true";
    searchInput.addEventListener("input", () => {
      state.search = searchInput.value.trim();
      renderPlaylistGrid();
    });
  }

  document.querySelectorAll(".filter-btn, .filters button").forEach((button) => {
    if (button.dataset.bound === "true") return;
    button.dataset.bound = "true";

    button.addEventListener("click", () => {
      state.activeFilter = button.getAttribute("data-filter") || "all";

      document.querySelectorAll(".filter-btn, .filters button").forEach((btn) => {
        btn.classList.remove("active");
      });

      button.classList.add("active");
      renderPlaylistGrid();
    });
  });
}

function bindCreateButtons() {
  const topBtn = el("playlist-create-real-btn");
  if (topBtn && topBtn.dataset.bound !== "true") {
    topBtn.dataset.bound = "true";
    topBtn.addEventListener("click", openCreatePlaylistForm);
  }

  const legacyBtn = el("create-playlist-btn");
  if (legacyBtn && legacyBtn.dataset.bound !== "true") {
    legacyBtn.dataset.bound = "true";
    legacyBtn.addEventListener("click", openCreatePlaylistForm);
  }
}

function injectCreateButton() {
  const heroActions = document.querySelector(".hero-actions");
  if (!heroActions || el("playlist-create-real-btn")) return;

  const button = document.createElement("button");
  button.id = "playlist-create-real-btn";
  button.className = "btn";
  button.type = "button";
  button.textContent = "Create Playlist";
  heroActions.prepend(button);
}

async function bootPlaylistPage() {
  try {
    clearMessages();
    bindToolbar();
    injectCreateButton();
    bindCreateButtons();

    const playlistId = getPlaylistIdFromUrl();

    const bundle = await getPlaylistBundle({
      playlistId,
      search: state.search,
      featuredOnly: false
    });

    state.currentUser = bundle.currentUser;
    state.playlists = bundle.playlists;
    state.myTracks = bundle.myTracks || [];
    state.selectedPlaylist = bundle.selectedPlaylist;
    state.selectedTracks = bundle.selectedTracks || [];

    renderPlaylistGrid();

    if (state.selectedPlaylist) {
      renderPlaylistManager();
    }
  } catch (error) {
    console.error("[playlist-client] boot error:", error);
    showError(error.message || "Failed to load playlists.");
  }
}

document.addEventListener("DOMContentLoaded", bootPlaylistPage);
