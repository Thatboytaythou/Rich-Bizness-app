// =========================
// RICH BIZNESS FOLLOW UI — FINAL
// =========================

import {
  followUser,
  unfollowUser,
  isFollowing
} from "./follow-client.js";

export async function mountFollowButton({
  containerId,
  currentUserId,
  targetUserId
}) {
  const el = document.getElementById(containerId);
  if (!el) return;

  if (!targetUserId || currentUserId === targetUserId) {
    el.innerHTML = "";
    return;
  }

  let following = await isFollowing(currentUserId, targetUserId);

  render();

  async function toggleFollow() {
    if (following) {
      await unfollowUser(currentUserId, targetUserId);
      following = false;
    } else {
      await followUser(currentUserId, targetUserId);
      following = true;
    }

    render();
  }

  function render() {
    el.innerHTML = `
      <button class="btn ${following ? "btn-dark" : "btn"}">
        ${following ? "Following" : "Follow"}
      </button>
    `;

    el.querySelector("button").onclick = toggleFollow;
  }
}
