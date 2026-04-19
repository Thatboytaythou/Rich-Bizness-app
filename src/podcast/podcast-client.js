import {
  getPodcastShows,
  getPodcastEpisodes
} from "./podcast-api.js";

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

const state = {
  shows: [],
  activeShowIndex: 0,
  activeEpisodeIndex: 0,
  activeFilter: "all",
  search: "",
  isPlaying: false
};

function getActiveShow() {
  return state.shows[state.activeShowIndex] || null;
}

function getVisibleEpisodes(show) {
  if (!show?.episodes?.length) return [];

  return show.episodes.filter((episode) => {
    const filterText = String(episode.filter || "").toLowerCase();
    const tagText = String(episode.tag || "").toLowerCase();
    const searchBlob = `${episode.title || ""} ${episode.subtitle || ""} ${episode.tag || ""}`.toLowerCase();

    const matchesFilter =
      state.activeFilter === "all" ||
      filterText.includes(state.activeFilter) ||
      tagText.includes(state.activeFilter);

    const matchesSearch =
      !state.search || searchBlob.includes(state.search.toLowerCase());

    return matchesFilter && matchesSearch;
  });
}

function getActiveEpisode() {
  const show = getActiveShow();
  if (!show) return null;

  const visible = getVisibleEpisodes(show);
  if (!visible.length) return null;

  const current = visible[state.activeEpisodeIndex];
  return current || visible[0] || null;
}

function showPodcastError(message) {
  const node = el("podcast-error");
  if (!node) return;
  node.textContent = message || "";
  node.style.display = message ? "block" : "none";

  const success = el("podcast-success");
  if (success && message) success.style.display = "none";
}

function showPodcastSuccess(message) {
  const node = el("podcast-success");
  if (!node) return;
  node.textContent = message || "";
  node.style.display = message ? "block" : "none";

  const error = el("podcast-error");
  if (error && message) error.style.display = "none";
}

function clearMessages() {
  showPodcastError("");
  showPodcastSuccess("");
}

function renderShowList() {
  const container = el("podcast-show-list");
  if (!container) return;

  if (!state.shows.length) {
    container.innerHTML = `
      <div class="show-item active">
        <strong>No podcast shows yet</strong>
        <span>Create a show and upload episodes first.</span>
      </div>
    `;
    return;
  }

  container.innerHTML = state.shows.map((show, index) => `
    <div class="show-item ${index === state.activeShowIndex ? "active" : ""}" data-show-index="${index}">
      <strong>${escapeHtml(show.label)}</strong>
      <span>${escapeHtml(show.description)}</span>
    </div>
  `).join("");

  container.querySelectorAll("[data-show-index]").forEach((item) => {
    item.addEventListener("click", () => {
      setShow(Number(item.getAttribute("data-show-index") || 0));
    });
  });
}

function renderEpisodes() {
  const container = el("podcast-episode-list");
  if (!container) return;

  const show = getActiveShow();
  const visibleEpisodes = getVisibleEpisodes(show);

  if (!show || !visibleEpisodes.length) {
    container.innerHTML = `
      <div class="episode-item active">
        <div class="episode-number">—</div>
        <div class="episode-thumb">
          <img src="/images/brand/logo-music-label.png" alt="No episode" />
        </div>
        <div class="episode-copy">
          <strong>No episodes match this filter</strong>
          <span>Change the filter, search, or upload real episodes.</span>
        </div>
        <div class="episode-tag">Empty</div>
      </div>
    `;
    return;
  }

  const activeEpisode = getActiveEpisode();

  container.innerHTML = visibleEpisodes.map((episode, index) => `
    <div class="episode-item ${episode.id === activeEpisode?.id ? "active" : ""}" data-episode-index="${index}">
      <div class="episode-number">${index + 1}</div>
      <div class="episode-thumb">
        <img src="${escapeHtml(episode.cover)}" alt="${escapeHtml(episode.title)}" />
      </div>
      <div class="episode-copy">
        <strong>${escapeHtml(episode.title)}</strong>
        <span>${escapeHtml(episode.subtitle)}</span>
      </div>
      <div class="episode-tag">${escapeHtml(episode.tag)}</div>
    </div>
  `).join("");

  container.querySelectorAll("[data-episode-index]").forEach((item) => {
    item.addEventListener("click", () => {
      state.activeEpisodeIndex = Number(item.getAttribute("data-episode-index") || 0);
      renderPodcastNow();
      if (state.isPlaying) startEpisode();
    });
  });
}

function renderFilterButtons() {
  document.querySelectorAll(".filter-btn").forEach((button) => {
    const filter = button.getAttribute("data-filter") || "all";
    button.classList.toggle("active", filter === state.activeFilter);
  });
}

function renderPodcastNow() {
  const show = getActiveShow();
  const episode = getActiveEpisode();
  const player = el("podcast-player");
  const playButton = el("podcast-play-toggle");

  renderShowList();
  renderEpisodes();
  renderFilterButtons();

  if (!show) {
    el("podcast-show-label").textContent = "No Show";
    el("podcast-show-description").textContent = "Create a podcast show and upload episodes to power this page.";
    el("podcast-episode-title").textContent = "No episodes yet";
    el("podcast-episode-meta").textContent = "Podcast episodes will appear here once uploaded.";
    el("podcast-cover").src = "/images/brand/logo-music-label.png";
    if (player) player.src = "";
    if (playButton) playButton.textContent = "Play";
    return;
  }

  el("podcast-show-label").textContent = show.label;
  el("podcast-show-description").textContent = show.description;

  if (!episode) {
    el("podcast-episode-title").textContent = "No episodes match";
    el("podcast-episode-meta").textContent = `${show.label} • Change filter or upload more episodes`;
    el("podcast-cover").src = show.cover;
    if (player) player.src = "";
    if (playButton) playButton.textContent = "Play";
    return;
  }

  el("podcast-episode-title").textContent = episode.title;
  el("podcast-episode-meta").textContent = `${show.label} • ${episode.tag} • ${episode.subtitle}`;
  el("podcast-cover").src = episode.cover;

  if (player) player.src = episode.src || "";
  if (playButton) playButton.textContent = state.isPlaying ? "Pause" : "Play";
}

async function startEpisode() {
  clearMessages();

  const player = el("podcast-player");
  const episode = getActiveEpisode();

  if (!player || !episode) {
    showPodcastError("No playable episode loaded.");
    return;
  }

  if (!episode.src) {
    state.isPlaying = false;
    renderPodcastNow();
    showPodcastError("This episode is missing an audio URL.");
    return;
  }

  try {
    await player.play();
    state.isPlaying = true;
    renderPodcastNow();
    showPodcastSuccess(`Now playing: ${episode.title}`);
  } catch (error) {
    state.isPlaying = false;
    renderPodcastNow();
    showPodcastError("Playback was blocked. Tap play again.");
  }
}

function pauseEpisode() {
  const player = el("podcast-player");
  if (!player) return;
  player.pause();
  state.isPlaying = false;
  renderPodcastNow();
}

function toggleEpisodePlayback() {
  if (state.isPlaying) {
    pauseEpisode();
  } else {
    startEpisode();
  }
}

function nextEpisode() {
  const show = getActiveShow();
  const visible = getVisibleEpisodes(show);
  if (!visible.length) return;

  state.activeEpisodeIndex = (state.activeEpisodeIndex + 1) % visible.length;
  renderPodcastNow();
  if (state.isPlaying) startEpisode();
}

function prevEpisode() {
  const show = getActiveShow();
  const visible = getVisibleEpisodes(show);
  if (!visible.length) return;

  state.activeEpisodeIndex = (state.activeEpisodeIndex - 1 + visible.length) % visible.length;
  renderPodcastNow();
  if (state.isPlaying) startEpisode();
}

function setShow(index) {
  if (!state.shows[index]) return;
  state.activeShowIndex = index;
  state.activeEpisodeIndex = 0;
  renderPodcastNow();
  if (state.isPlaying) startEpisode();
}

function bindControls() {
  document.querySelectorAll(".filter-btn").forEach((button) => {
    button.addEventListener("click", () => {
      state.activeFilter = button.getAttribute("data-filter") || "all";
      state.activeEpisodeIndex = 0;
      renderPodcastNow();
    });
  });

  el("podcast-search")?.addEventListener("input", (event) => {
    state.search = event.target.value.trim();
    state.activeEpisodeIndex = 0;
    renderPodcastNow();
  });

  el("podcast-play-toggle")?.addEventListener("click", toggleEpisodePlayback);
  el("podcast-next-btn")?.addEventListener("click", nextEpisode);
  el("podcast-prev-btn")?.addEventListener("click", prevEpisode);
  el("podcast-start-btn")?.addEventListener("click", startEpisode);
  el("podcast-player")?.addEventListener("ended", nextEpisode);
}

function normalizeShow(show, episodes) {
  return {
    id: show.id,
    label: show.title || "Untitled Show",
    description: show.description || "Podcast show ready for episodes.",
    cover: show.cover_url || "/images/brand/logo-music-label.png",
    category: show.category || "talk",
    episodes: (episodes || [])
      .filter((episode) => episode.is_published !== false)
      .map((episode) => ({
        id: episode.id,
        title: episode.title || "Untitled Episode",
        subtitle: episode.description || `Episode ${episode.episode_number || 1}`,
        tag: episode.category || show.category || "Talk",
        filter: `${show.category || "talk"} ${episode.description || ""} ${episode.title || ""}`.toLowerCase(),
        cover: episode.cover_url || show.cover_url || "/images/brand/logo-music-label.png",
        src: episode.audio_url || ""
      }))
  };
}

async function loadRealShows() {
  clearMessages();

  const shows = await getPodcastShows({ limit: 50 });
  const normalized = [];

  for (const show of shows) {
    try {
      const episodes = await getPodcastEpisodes(show.id);
      const normalizedShow = normalizeShow(show, episodes);

      if (normalizedShow.episodes.length > 0) {
        normalized.push(normalizedShow);
      }
    } catch (error) {
      console.error("[podcast-client] show load error:", show.id, error);
    }
  }

  state.shows = normalized;
  state.activeShowIndex = 0;
  state.activeEpisodeIndex = 0;

  renderPodcastNow();

  if (!state.shows.length) {
    showPodcastError("No real podcast episodes found yet. Create a show and upload episodes first.");
  } else {
    showPodcastSuccess("Podcast page is now pulling real episodes.");
  }
}

async function bootPodcastPage() {
  try {
    bindControls();
    await loadRealShows();
  } catch (error) {
    console.error("[podcast-client] boot error:", error);
    showPodcastError(error.message || "Failed to load podcast shows.");
  }
}

document.addEventListener("DOMContentLoaded", bootPodcastPage);
