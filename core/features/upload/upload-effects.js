// =========================
// RICH BIZNESS UPLOAD EFFECTS — CLOUD CHAMBER
// /core/features/upload/upload-effects.js
// =========================

export async function playUploadEffects(orbEl) {
  if (!orbEl) return;

  // =========================
  // STEP 1 — CHARGE (GLOW + SCALE)
  // =========================
  orbEl.classList.add("orb-charging");

  await wait(600);

  // =========================
  // STEP 2 — COMPRESS (PULL IN)
  // =========================
  orbEl.classList.remove("orb-charging");
  orbEl.classList.add("orb-compress");

  await wait(500);

  // =========================
  // STEP 3 — BURST (EXPLOSION)
  // =========================
  orbEl.classList.remove("orb-compress");
  orbEl.classList.add("orb-burst");

  spawnEnergyParticles(orbEl);

  await wait(700);

  // =========================
  // RESET
  // =========================
  orbEl.classList.remove("orb-burst");
}

// =========================
// PARTICLE BURST
// =========================

function spawnEnergyParticles(orbEl) {
  const count = 18;

  for (let i = 0; i < count; i++) {
    const p = document.createElement("span");

    p.className = "energy-particle";

    const angle = (Math.PI * 2 * i) / count;
    const distance = 120 + Math.random() * 80;

    const x = Math.cos(angle) * distance;
    const y = Math.sin(angle) * distance;

    p.style.setProperty("--x", `${x}px`);
    p.style.setProperty("--y", `${y}px`);

    orbEl.appendChild(p);

    setTimeout(() => p.remove(), 900);
  }
}

// =========================
// UTIL
// =========================

function wait(ms) {
  return new Promise((res) => setTimeout(res, ms));
}
