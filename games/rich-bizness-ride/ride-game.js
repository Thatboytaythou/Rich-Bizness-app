import * as THREE from "https://unpkg.com/three@0.160.0/build/three.module.js";

const LANES = [-3.2, 0, 3.2];
const ROAD_WRAP = 240;

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function rand(seed) {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

function formatCurrency(value) {
  return `$${Math.floor(value).toLocaleString()}`;
}

function makeRenderer(container) {
  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: false,
    powerPreference: "high-performance"
  });

  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  container.appendChild(renderer.domElement);
  return renderer;
}

function makeLights(scene) {
  const ambient = new THREE.AmbientLight(0xffffff, 0.72);
  scene.add(ambient);

  const sun = new THREE.DirectionalLight(0xffd89b, 1.45);
  sun.position.set(12, 18, 14);
  sun.castShadow = true;
  sun.shadow.mapSize.width = 2048;
  sun.shadow.mapSize.height = 2048;
  sun.shadow.camera.near = 0.1;
  sun.shadow.camera.far = 140;
  sun.shadow.camera.left = -34;
  sun.shadow.camera.right = 34;
  sun.shadow.camera.top = 34;
  sun.shadow.camera.bottom = -34;
  scene.add(sun);

  const cityGlow = new THREE.PointLight(0x57d478, 1.65, 90);
  cityGlow.position.set(13, 8, -36);
  scene.add(cityGlow);

  const streetGlow = new THREE.PointLight(0xffaa44, 1.15, 60);
  streetGlow.position.set(0, 6, 8);
  scene.add(streetGlow);

  const rimGlow = new THREE.PointLight(0x7bc5ff, 0.7, 36);
  rimGlow.position.set(-10, 6, 16);
  scene.add(rimGlow);
}

function makeRoad(scene) {
  const roadGroup = new THREE.Group();

  const road = new THREE.Mesh(
    new THREE.PlaneGeometry(16, ROAD_WRAP),
    new THREE.MeshStandardMaterial({
      color: 0x151515,
      roughness: 0.95,
      metalness: 0.05
    })
  );
  road.rotation.x = -Math.PI / 2;
  road.receiveShadow = true;
  roadGroup.add(road);

  for (let i = 0; i < 30; i += 1) {
    const stripe = new THREE.Mesh(
      new THREE.PlaneGeometry(0.42, 3.8),
      new THREE.MeshStandardMaterial({
        color: 0xdbaa51,
        emissive: 0x92540c,
        emissiveIntensity: 0.35
      })
    );
    stripe.rotation.x = -Math.PI / 2;
    stripe.position.set(0, 0.02, -i * 8 + 10);
    roadGroup.add(stripe);
  }

  const shoulderMat = new THREE.MeshStandardMaterial({
    color: 0x0e170f,
    roughness: 1
  });

  const leftShoulder = new THREE.Mesh(
    new THREE.PlaneGeometry(2.1, ROAD_WRAP),
    shoulderMat
  );
  leftShoulder.rotation.x = -Math.PI / 2;
  leftShoulder.position.set(-9, 0.01, 0);
  leftShoulder.receiveShadow = true;
  roadGroup.add(leftShoulder);

  const rightShoulder = leftShoulder.clone();
  rightShoulder.position.x = 9;
  roadGroup.add(rightShoulder);

  scene.add(roadGroup);
  return roadGroup;
}

function makeBike() {
  const bike = new THREE.Group();

  const greenMat = new THREE.MeshStandardMaterial({
    color: 0x556b2f,
    metalness: 0.6,
    roughness: 0.35
  });
  const darkMat = new THREE.MeshStandardMaterial({
    color: 0x111111,
    metalness: 0.2,
    roughness: 0.85
  });
  const metalMat = new THREE.MeshStandardMaterial({
    color: 0x545454,
    metalness: 0.9,
    roughness: 0.2
  });
  const engineMat = new THREE.MeshStandardMaterial({
    color: 0x2e8b57,
    metalness: 0.65,
    roughness: 0.35
  });

  const chassis = new THREE.Mesh(
    new THREE.BoxGeometry(3.2, 0.28, 0.4),
    greenMat
  );
  chassis.position.set(0, 0.45, 0);
  chassis.castShadow = true;
  bike.add(chassis);

  const seatBar = new THREE.Mesh(
    new THREE.BoxGeometry(1.3, 0.2, 0.35),
    greenMat
  );
  seatBar.position.set(0.55, 0.8, 0);
  seatBar.castShadow = true;
  bike.add(seatBar);

  const tank = new THREE.Mesh(
    new THREE.BoxGeometry(0.68, 0.24, 0.46),
    darkMat
  );
  tank.position.set(0.95, 1.07, 0);
  tank.castShadow = true;
  bike.add(tank);

  const seat = new THREE.Mesh(
    new THREE.BoxGeometry(1.45, 0.14, 0.62),
    darkMat
  );
  seat.position.set(0.4, 1.01, 0);
  seat.castShadow = true;
  bike.add(seat);

  const engine = new THREE.Mesh(
    new THREE.CylinderGeometry(0.45, 0.45, 0.55, 18),
    engineMat
  );
  engine.position.set(-0.2, 0.3, 0);
  engine.rotation.z = Math.PI / 2;
  engine.castShadow = true;
  bike.add(engine);

  const frontFork = new THREE.Mesh(
    new THREE.CylinderGeometry(0.08, 0.08, 1.28, 12),
    metalMat
  );
  frontFork.position.set(-0.78, 0.78, 0);
  frontFork.rotation.z = Math.PI / 8;
  frontFork.castShadow = true;
  bike.add(frontFork);

  const handle = new THREE.Mesh(
    new THREE.CylinderGeometry(0.05, 0.05, 0.92, 12),
    metalMat
  );
  handle.position.set(-1.1, 1.35, 0);
  handle.rotation.z = Math.PI / 2;
  handle.castShadow = true;
  bike.add(handle);

  const headlight = new THREE.Mesh(
    new THREE.SphereGeometry(0.12, 16, 16),
    new THREE.MeshStandardMaterial({
      color: 0xe7fbff,
      emissive: 0x9fdcff,
      emissiveIntensity: 1.7
    })
  );
  headlight.position.set(-0.92, 1.48, 0.22);
  bike.add(headlight);

  const frontWheelGroup = new THREE.Group();
  frontWheelGroup.position.set(-1.15, 0.18, 0);

  const frontWheel = new THREE.Mesh(
    new THREE.TorusGeometry(0.56, 0.16, 12, 36),
    new THREE.MeshStandardMaterial({ color: 0x101010, roughness: 1 })
  );
  frontWheel.rotation.x = Math.PI / 2;
  frontWheel.castShadow = true;
  frontWheelGroup.add(frontWheel);

  const frontHub = new THREE.Mesh(
    new THREE.CylinderGeometry(0.1, 0.1, 0.18, 12),
    metalMat
  );
  frontHub.rotation.x = Math.PI / 2;
  frontWheelGroup.add(frontHub);
  bike.add(frontWheelGroup);

  const rearWheelGroup = new THREE.Group();
  rearWheelGroup.position.set(1.3, 0.18, 0);

  const rearWheel = new THREE.Mesh(
    new THREE.TorusGeometry(0.78, 0.22, 16, 40),
    new THREE.MeshStandardMaterial({ color: 0x101010, roughness: 1 })
  );
  rearWheel.rotation.x = Math.PI / 2;
  rearWheel.castShadow = true;
  rearWheelGroup.add(rearWheel);

  const rearHub = new THREE.Mesh(
    new THREE.CylinderGeometry(0.13, 0.13, 0.25, 12),
    metalMat
  );
  rearHub.rotation.x = Math.PI / 2;
  rearWheelGroup.add(rearHub);
  bike.add(rearWheelGroup);

  const rider = new THREE.Group();

  const hoodieMat = new THREE.MeshStandardMaterial({
    color: 0x131313,
    roughness: 0.92
  });

  const hoodie = new THREE.Mesh(
    new THREE.BoxGeometry(1.1, 1.3, 0.85),
    hoodieMat
  );
  hoodie.position.set(0.1, 2.2, 0);
  hoodie.castShadow = true;
  rider.add(hoodie);

  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.34, 18, 18),
    new THREE.MeshStandardMaterial({
      color: 0x8a532d,
      roughness: 0.85
    })
  );
  head.position.set(-0.1, 3.1, 0);
  head.castShadow = true;
  rider.add(head);

  const beanie = new THREE.Mesh(
    new THREE.CylinderGeometry(0.34, 0.28, 0.34, 16),
    new THREE.MeshStandardMaterial({
      color: 0x9fdcff,
      roughness: 0.7
    })
  );
  beanie.position.set(-0.1, 3.32, 0);
  beanie.castShadow = true;
  rider.add(beanie);

  const armL = new THREE.Mesh(
    new THREE.BoxGeometry(0.28, 0.95, 0.24),
    hoodieMat
  );
  armL.position.set(-0.58, 2.15, -0.06);
  armL.rotation.z = 0.55;
  armL.castShadow = true;
  rider.add(armL);

  const armR = armL.clone();
  armR.position.set(-0.1, 2.15, 0.22);
  armR.rotation.z = -0.7;
  rider.add(armR);

  const legL = new THREE.Mesh(
    new THREE.BoxGeometry(0.32, 1.15, 0.28),
    hoodieMat
  );
  legL.position.set(0.4, 1.05, -0.18);
  legL.rotation.z = -0.15;
  legL.castShadow = true;
  rider.add(legL);

  const legR = legL.clone();
  legR.position.set(0.92, 1.05, 0.18);
  rider.add(legR);

  bike.add(rider);

  return { bike, frontWheelGroup, rearWheelGroup };
}

function makeCity(scene) {
  const group = new THREE.Group();

  for (let i = 0; i < 34; i += 1) {
    const left = i % 2 === 0;
    const seed = i + 1;
    const height = 5 + rand(seed * 1.13) * 18;
    const width = 2 + rand(seed * 2.21) * 4.5;
    const depth = 2 + rand(seed * 3.07) * 5;
    const x = left ? -11 - rand(seed * 1.91) * 8 : 11 + rand(seed * 1.37) * 8;
    const z = -i * 9;

    const mat = new THREE.MeshStandardMaterial({
      color: left ? 0x1d2026 : 0x241c17,
      roughness: 0.88,
      metalness: 0.12
    });

    const tower = new THREE.Mesh(
      new THREE.BoxGeometry(width, height, depth),
      mat
    );
    tower.position.set(x, height / 2, z);
    tower.castShadow = true;
    tower.receiveShadow = true;
    tower.userData.isTower = true;
    group.add(tower);

    const emissive = new THREE.Color(left ? 0x3c8c63 : 0xd48222);

    for (let r = 0; r < Math.floor(height * 1.4); r += 1) {
      const lightPanel = new THREE.Mesh(
        new THREE.PlaneGeometry(0.18, 0.24),
        new THREE.MeshStandardMaterial({
          color: 0xf8ddb3,
          emissive,
          emissiveIntensity: 0.55,
          side: THREE.DoubleSide
        })
      );

      lightPanel.position.set(
        x - width / 2 + 0.42 + (r % 4) * 0.44,
        height - 0.9 - Math.floor(r / 4) * 0.58,
        z + depth / 2 + 0.01
      );
      group.add(lightPanel);
    }
  }

  scene.add(group);
  return { group };
}

function makeTreehouse(scene) {
  const root = new THREE.Group();

  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(1.35, 1.9, 8.5, 16),
    new THREE.MeshStandardMaterial({
      color: 0x4b2f1a,
      roughness: 0.96
    })
  );
  trunk.castShadow = true;
  trunk.position.set(0, 4.2, 0);
  root.add(trunk);

  const canopy = new THREE.Mesh(
    new THREE.SphereGeometry(4.9, 24, 24),
    new THREE.MeshStandardMaterial({
      color: 0x2d7c42,
      roughness: 0.92
    })
  );
  canopy.castShadow = true;
  canopy.position.set(0.2, 9.2, 0.4);
  root.add(canopy);

  const house = new THREE.Mesh(
    new THREE.BoxGeometry(3.5, 2.15, 2.6),
    new THREE.MeshStandardMaterial({
      color: 0x5b3f27,
      roughness: 0.86
    })
  );
  house.castShadow = true;
  house.position.set(0.35, 9.6, 0.45);
  root.add(house);

  const windowMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(0.72, 0.56),
    new THREE.MeshStandardMaterial({
      color: 0xffecbc,
      emissive: 0xffaa33,
      emissiveIntensity: 1.1
    })
  );
  windowMesh.position.set(0.45, 9.55, 1.77);
  root.add(windowMesh);

  const pathMat = new THREE.MeshStandardMaterial({
    color: 0xcfffd1,
    emissive: 0x57d478,
    emissiveIntensity: 0.9
  });

  for (let i = 0; i < 7; i += 1) {
    const step = new THREE.Mesh(
      new THREE.BoxGeometry(0.92, 0.12, 1.9),
      pathMat
    );
    step.position.set(0.4, 0.2 + i * 0.26, 4.8 - i * 1.2);
    root.add(step);
  }

  root.position.set(13, 0, -125);
  scene.add(root);
  return root;
}

function makeCashPickup(type = "cash") {
  if (type === "boost") {
    return new THREE.Mesh(
      new THREE.TorusKnotGeometry(0.36, 0.12, 64, 12),
      new THREE.MeshStandardMaterial({
        color: 0xffbd4d,
        emissive: 0xff8c1a,
        emissiveIntensity: 0.9,
        metalness: 0.55,
        roughness: 0.25
      })
    );
  }

  return new THREE.Mesh(
    new THREE.BoxGeometry(0.9, 0.45, 0.16),
    new THREE.MeshStandardMaterial({
      color: 0x7dff85,
      emissive: 0x22cc55,
      emissiveIntensity: 0.6,
      metalness: 0.22,
      roughness: 0.5
    })
  );
}

function makeObstacle(kind = "crate") {
  if (kind === "barrier") {
    return new THREE.Mesh(
      new THREE.BoxGeometry(1.7, 1.0, 0.55),
      new THREE.MeshStandardMaterial({
        color: 0xff8b3d,
        emissive: 0xb95011,
        emissiveIntensity: 0.35,
        roughness: 0.55
      })
    );
  }

  return new THREE.Mesh(
    new THREE.BoxGeometry(1.35, 1.35, 1.35),
    new THREE.MeshStandardMaterial({
      color: 0x704927,
      roughness: 0.92
    })
  );
}

function buildHUD(container) {
  const shell = document.createElement("div");
  shell.className = "rb-ride-overlay";
  shell.innerHTML = `
    <style>
      .rb-ride-overlay {
        position: absolute;
        inset: 0;
        pointer-events: none;
        font-family: Inter, system-ui, sans-serif;
        color: #fff6e7;
      }

      .rb-ride-top,
      .rb-ride-bottom {
        position: absolute;
        left: 0;
        width: 100%;
        display: flex;
        justify-content: space-between;
        gap: 12px;
        padding: 16px;
      }

      .rb-ride-top {
        top: 0;
        align-items: flex-start;
      }

      .rb-ride-bottom {
        bottom: 0;
        align-items: flex-end;
      }

      .rb-card {
        background: rgba(10, 12, 12, 0.72);
        border: 1px solid rgba(255,255,255,0.08);
        border-radius: 18px;
        backdrop-filter: blur(10px);
        box-shadow: 0 12px 30px rgba(0,0,0,0.25);
        padding: 12px 14px;
        min-width: 180px;
      }

      .rb-logo {
        font-size: 22px;
        font-weight: 1000;
        color: #f4c76a;
        line-height: 1;
        letter-spacing: 0.04em;
      }

      .rb-sub {
        margin-top: 6px;
        color: #d6c5a0;
        font-size: 11px;
        letter-spacing: 0.12em;
        text-transform: uppercase;
      }

      .rb-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(72px, 1fr));
        gap: 8px;
      }

      .rb-stat {
        padding: 8px 10px;
        border-radius: 12px;
        background: rgba(255,255,255,0.04);
      }

      .rb-stat small {
        display: block;
        color: #d2c29e;
        font-size: 10px;
        text-transform: uppercase;
        letter-spacing: 0.12em;
      }

      .rb-stat strong {
        display: block;
        font-size: 18px;
        margin-top: 4px;
      }

      .rb-meters {
        display: grid;
        gap: 8px;
      }

      .rb-meter-label {
        display: flex;
        justify-content: space-between;
        gap: 10px;
        font-size: 11px;
        color: #eddcb7;
        margin-bottom: 5px;
      }

      .rb-meter-track {
        height: 10px;
        border-radius: 999px;
        background: rgba(255,255,255,0.08);
        overflow: hidden;
      }

      .rb-meter-fill {
        height: 100%;
        border-radius: 999px;
        width: 0%;
        transition: width 0.12s linear;
      }

      .rb-controls {
        font-size: 11px;
        color: #e9ddc2;
        line-height: 1.6;
      }

      .rb-center-message {
        position: absolute;
        inset: 0;
        display: none;
        align-items: center;
        justify-content: center;
        text-align: center;
        padding: 24px;
        background: rgba(0,0,0,0.28);
      }

      .rb-center-inner {
        background: rgba(10,12,12,0.78);
        border: 1px solid rgba(255,255,255,0.08);
        border-radius: 24px;
        padding: 22px 24px;
        max-width: 480px;
        width: 100%;
      }

      .rb-center-title {
        font-size: 38px;
        font-weight: 1000;
        color: #f4c76a;
        line-height: 1;
      }

      .rb-center-copy {
        margin-top: 10px;
        color: #f8edd8;
        font-size: 15px;
        line-height: 1.6;
      }

      @media (max-width: 900px) {
        .rb-ride-top,
        .rb-ride-bottom {
          flex-direction: column;
          align-items: stretch;
        }
      }
    </style>

    <div class="rb-ride-top">
      <div class="rb-card">
        <div class="rb-logo">RICH BIZNESS RIDE</div>
        <div class="rb-sub">Elite City Runner</div>
      </div>

      <div class="rb-card">
        <div class="rb-grid">
          <div class="rb-stat"><small>Score</small><strong id="hud-score">0</strong></div>
          <div class="rb-stat"><small>Cash</small><strong id="hud-cash">$0</strong></div>
          <div class="rb-stat"><small>Distance</small><strong id="hud-distance">0m</strong></div>
          <div class="rb-stat"><small>Lives</small><strong id="hud-lives">3</strong></div>
        </div>
      </div>

      <div class="rb-card">
        <div class="rb-meters">
          <div>
            <div class="rb-meter-label"><span>Boost</span><strong id="hud-boost-value">100</strong></div>
            <div class="rb-meter-track"><div id="hud-boost" class="rb-meter-fill" style="background:#ffb84d"></div></div>
          </div>
          <div>
            <div class="rb-meter-label"><span>Health</span><strong id="hud-health-value">100</strong></div>
            <div class="rb-meter-track"><div id="hud-health" class="rb-meter-fill" style="background:#63d889"></div></div>
          </div>
          <div>
            <div class="rb-meter-label"><span>Speed</span><strong id="hud-speed-value">0</strong></div>
            <div class="rb-meter-track"><div id="hud-speed" class="rb-meter-fill" style="background:#7bc5ff"></div></div>
          </div>
        </div>
      </div>
    </div>

    <div class="rb-ride-bottom">
      <div class="rb-card rb-controls">
        <strong>Controls</strong><br />
        A / ← move left<br />
        D / → move right<br />
        Shift / W boost<br />
        Space jump<br />
        P / Esc pause
      </div>

      <div class="rb-card rb-controls">
        <strong>Mission</strong><br />
        survive the lane<br />
        collect money + boost<br />
        dodge crates + barriers<br />
        ride toward the treehouse skyline
      </div>
    </div>

    <div id="hud-center-message" class="rb-center-message">
      <div class="rb-center-inner">
        <div id="hud-center-title" class="rb-center-title">PAUSED</div>
        <div id="hud-center-copy" class="rb-center-copy">Press P or Escape to jump back in.</div>
      </div>
    </div>
  `;

  container.appendChild(shell);

  return {
    score: shell.querySelector("#hud-score"),
    cash: shell.querySelector("#hud-cash"),
    distance: shell.querySelector("#hud-distance"),
    lives: shell.querySelector("#hud-lives"),
    boostFill: shell.querySelector("#hud-boost"),
    healthFill: shell.querySelector("#hud-health"),
    speedFill: shell.querySelector("#hud-speed"),
    boostValue: shell.querySelector("#hud-boost-value"),
    healthValue: shell.querySelector("#hud-health-value"),
    speedValue: shell.querySelector("#hud-speed-value"),
    center: shell.querySelector("#hud-center-message"),
    centerTitle: shell.querySelector("#hud-center-title"),
    centerCopy: shell.querySelector("#hud-center-copy")
  };
}

export function mountRideGame(container) {
  if (!container) return null;

  container.innerHTML = "";
  container.style.position = "relative";
  container.style.minHeight = "78vh";

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x081211);
  scene.fog = new THREE.Fog(0x06110d, 22, 92);

  const camera = new THREE.PerspectiveCamera(
    58,
    container.clientWidth / container.clientHeight,
    0.1,
    300
  );
  camera.position.set(0, 7.2, 16);

  const renderer = makeRenderer(container);
  makeLights(scene);

  const roadGroup = makeRoad(scene);
  const { bike, frontWheelGroup, rearWheelGroup } = makeBike();
  bike.position.set(0, 0, 8);
  scene.add(bike);

  const city = makeCity(scene);
  const treehouse = makeTreehouse(scene);

  const starGeo = new THREE.BufferGeometry();
  const starCount = 700;
  const starPositions = new Float32Array(starCount * 3);

  for (let i = 0; i < starCount; i += 1) {
    starPositions[i * 3] = (Math.random() - 0.5) * 140;
    starPositions[i * 3 + 1] = Math.random() * 45 + 4;
    starPositions[i * 3 + 2] = -Math.random() * 180;
  }

  starGeo.setAttribute("position", new THREE.BufferAttribute(starPositions, 3));
  const stars = new THREE.Points(
    starGeo,
    new THREE.PointsMaterial({ color: 0xffffff, size: 0.3 })
  );
  scene.add(stars);

  const collectibles = [];
  const collectibleGroup = new THREE.Group();
  scene.add(collectibleGroup);

  for (let i = 0; i < 28; i += 1) {
    const type = i % 5 === 0 ? "boost" : "cash";
    const mesh = makeCashPickup(type);
    mesh.castShadow = true;
    collectibleGroup.add(mesh);

    collectibles.push({
      seed: i + 1,
      lane: i % 3,
      x: LANES[i % 3],
      z: -i * 7 - 16,
      type,
      collected: false,
      mesh
    });
  }

  const obstacles = [];
  const obstacleGroup = new THREE.Group();
  scene.add(obstacleGroup);

  for (let i = 0; i < 20; i += 1) {
    const kind = i % 2 === 0 ? "crate" : "barrier";
    const mesh = makeObstacle(kind);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    obstacleGroup.add(mesh);

    obstacles.push({
      seed: 100 + i,
      lane: i % 3,
      x: LANES[i % 3],
      z: -i * 12 - 28,
      kind,
      mesh,
      hitCooldown: 0
    });
  }

  const hud = buildHUD(container);

  const state = {
    score: 0,
    cash: 0,
    distance: 0,
    speed: 42,
    maxSpeed: 78,
    boost: 100,
    health: 100,
    lives: 3,
    combo: 0,
    paused: false,
    gameOver: false,
    laneIndex: 1,
    laneX: 0,
    lean: 0,
    playerY: 1.1,
    jumpVelocity: 0,
    pressed: new Set(),
    pauseLatch: false,
    startedAt: new Date().toISOString(),
    destroyed: false
  };

  function emitUpdate() {
    window.dispatchEvent(
      new CustomEvent("rb:ride:update", {
        detail: {
          score: Math.floor(state.score),
          cash: Math.floor(state.cash),
          distance: Math.floor(state.distance),
          health: Math.floor(state.health),
          boost: Math.floor(state.boost),
          lives: state.lives,
          mode: "Elite Ride"
        }
      })
    );
  }

  function emitGameOver() {
    window.dispatchEvent(
      new CustomEvent("rb:ride:gameover", {
        detail: {
          score: Math.floor(state.score),
          cash: Math.floor(state.cash),
          distance: Math.floor(state.distance),
          health: Math.floor(state.health),
          boost: Math.floor(state.boost),
          lives: state.lives,
          mode: "Elite Ride",
          startedAt: state.startedAt,
          endedAt: new Date().toISOString()
        }
      })
    );
  }

  function updateHUD() {
    hud.score.textContent = Math.floor(state.score).toLocaleString();
    hud.cash.textContent = formatCurrency(state.cash);
    hud.distance.textContent = `${Math.floor(state.distance).toLocaleString()}m`;
    hud.lives.textContent = String(state.lives);

    hud.boostFill.style.width = `${clamp(state.boost, 0, 100)}%`;
    hud.healthFill.style.width = `${clamp(state.health, 0, 100)}%`;
    hud.speedFill.style.width = `${(clamp(state.speed, 0, state.maxSpeed) / state.maxSpeed) * 100}%`;

    hud.boostValue.textContent = Math.floor(state.boost);
    hud.healthValue.textContent = Math.floor(state.health);
    hud.speedValue.textContent = Math.floor(state.speed);

    if (state.gameOver) {
      hud.center.style.display = "flex";
      hud.centerTitle.textContent = "RIDE OVER";
      hud.centerCopy.textContent =
        `Final score ${Math.floor(state.score).toLocaleString()} • ` +
        `Cash ${formatCurrency(state.cash)} • Refresh or relaunch to run it back.`;
      return;
    }

    if (state.paused) {
      hud.center.style.display = "flex";
      hud.centerTitle.textContent = "PAUSED";
      hud.centerCopy.textContent = "Press P or Escape to jump back in.";
      return;
    }

    hud.center.style.display = "none";
  }

  function onKeyDown(event) {
    state.pressed.add(event.key);

    if (
      event.key === " " ||
      event.key === "ArrowLeft" ||
      event.key === "ArrowRight"
    ) {
      event.preventDefault();
    }
  }

  function onKeyUp(event) {
    state.pressed.delete(event.key);
  }

  function isPressed(...keys) {
    return keys.some((key) => state.pressed.has(key));
  }

  function collect(type) {
    if (type === "boost") {
      state.boost = clamp(state.boost + 28, 0, 100);
      state.score += 140;
    } else {
      state.cash += 125 + state.combo * 8;
      state.score += 80;
      state.boost = clamp(state.boost + 4, 0, 100);
    }

    state.combo += 1;
  }

  function takeHit() {
    if (state.gameOver) return;

    state.health -= 32;
    state.combo = 0;

    if (state.health <= 0) {
      state.lives -= 1;
      state.health = 100;

      if (state.lives <= 0) {
        state.lives = 0;
        state.gameOver = true;
        emitGameOver();
      }
    }
  }

  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);

  const clock = new THREE.Clock();
  let raf = 0;

  function resize() {
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
  }

  window.addEventListener("resize", resize);

  function animate() {
    if (state.destroyed) return;

    raf = requestAnimationFrame(animate);
    const delta = Math.min(clock.getDelta(), 0.04);

    if (isPressed("p", "P", "Escape") && !state.pauseLatch) {
      state.pauseLatch = true;
      if (!state.gameOver) state.paused = !state.paused;
    }

    if (!isPressed("p", "P", "Escape")) {
      state.pauseLatch = false;
    }

    if (!state.paused && !state.gameOver) {
      if (isPressed("ArrowLeft", "a", "A") && state.laneIndex > 0) {
        state.laneIndex -= 1;
        state.pressed.delete("ArrowLeft");
        state.pressed.delete("a");
        state.pressed.delete("A");
      }

      if (isPressed("ArrowRight", "d", "D") && state.laneIndex < 2) {
        state.laneIndex += 1;
        state.pressed.delete("ArrowRight");
        state.pressed.delete("d");
        state.pressed.delete("D");
      }

      if (isPressed(" ") && state.playerY <= 1.11) {
        state.jumpVelocity = 8.5;
      }

      state.jumpVelocity -= 18 * delta;
      state.playerY += state.jumpVelocity * delta;

      if (state.playerY < 1.1) {
        state.playerY = 1.1;
        state.jumpVelocity = 0;
      }

      const boosting = isPressed("Shift", "W", "w") && state.boost > 0;
      const speedTarget = boosting ? state.maxSpeed : 42 + Math.min(18, state.combo * 0.9);

      state.speed = THREE.MathUtils.lerp(state.speed, speedTarget, 2.2 * delta);
      state.boost = clamp(
        state.boost + (boosting ? -28 * delta : 10 * delta),
        0,
        100
      );

      state.laneX = THREE.MathUtils.lerp(
        state.laneX,
        LANES[state.laneIndex],
        10 * delta
      );
      state.lean = THREE.MathUtils.lerp(
        state.lean,
        (LANES[state.laneIndex] - state.laneX) * -0.08,
        8 * delta
      );

      const addedDistance = state.speed * delta;
      state.distance += addedDistance;
      state.score += addedDistance * 2.4;

      roadGroup.position.z = state.distance % 8;
      treehouse.position.z = -140 + (state.distance % 220);

      bike.position.x = state.laneX;
      bike.position.y = state.playerY - 1.1;
      bike.rotation.z = state.lean;
      bike.rotation.x = THREE.MathUtils.lerp(
        bike.rotation.x,
        state.playerY > 1.2 ? -0.14 : 0,
        8 * delta
      );

      frontWheelGroup.rotation.z -= delta * 18;
      rearWheelGroup.rotation.z -= delta * 18;

      camera.position.x = THREE.MathUtils.lerp(
        camera.position.x,
        state.laneX * 0.3,
        4 * delta
      );
      camera.lookAt(state.laneX * 0.2, 2.5, -12);

      city.group.children.forEach((block) => {
        if (block.userData?.isTower) {
          if (block.position.z + (state.distance % ROAD_WRAP) > 18) {
            block.position.z -= ROAD_WRAP;
          }
        }
      });

      collectibles.forEach((item, index) => {
        const worldZ = item.z + (state.distance % ROAD_WRAP);

        item.mesh.position.set(
          item.x,
          item.type === "cash" ? 1.25 : 1.7,
          worldZ
        );
        item.mesh.rotation.y += delta * 2.4;
        item.mesh.rotation.x += delta * 0.6;
        item.mesh.visible = !item.collected;

        if (worldZ > 12 && !item.collected) {
          item.z -= ROAD_WRAP;
          item.lane = Math.floor(rand(item.seed + item.z) * 3);
          item.x = LANES[item.lane];

          const nextType = rand(item.seed + item.z * 0.3) > 0.78 ? "boost" : "cash";

          if (nextType !== item.type) {
            collectibleGroup.remove(item.mesh);
            item.type = nextType;
            item.mesh = makeCashPickup(item.type);
            item.mesh.castShadow = true;
            collectibleGroup.add(item.mesh);
          }
        }

        if (
          !item.collected &&
          worldZ > 6.6 &&
          worldZ < 9.5 &&
          Math.abs(item.x - state.laneX) < 1.2 &&
          Math.abs((item.type === "cash" ? 1.25 : 1.7) - state.playerY) < 1.4
        ) {
          item.collected = true;
          collect(item.type);

          setTimeout(() => {
            item.collected = false;
            item.z -= ROAD_WRAP;
            item.lane = Math.floor(rand(item.seed + item.z) * 3);
            item.x = LANES[item.lane];
          }, 80 + index);
        }
      });

      obstacles.forEach((item) => {
        const worldZ = item.z + (state.distance % ROAD_WRAP);

        item.mesh.position.set(
          item.x,
          item.kind === "crate" ? 0.7 : 0.52,
          worldZ
        );

        if (item.kind === "crate") {
          item.mesh.rotation.y += delta * 0.3;
        }

        item.hitCooldown = Math.max(0, item.hitCooldown - delta);

        if (worldZ > 12 && item.hitCooldown <= 0) {
          item.z -= ROAD_WRAP;
          item.lane = Math.floor(rand(item.seed + item.z) * 3);
          item.x = LANES[item.lane];

          const nextKind = rand(item.seed + item.z * 0.8) > 0.5 ? "crate" : "barrier";

          if (nextKind !== item.kind) {
            obstacleGroup.remove(item.mesh);
            item.kind = nextKind;
            item.mesh = makeObstacle(item.kind);
            item.mesh.castShadow = true;
            item.mesh.receiveShadow = true;
            obstacleGroup.add(item.mesh);
          }
        }

        if (
          item.hitCooldown <= 0 &&
          worldZ > 6.2 &&
          worldZ < 9.2 &&
          Math.abs(item.x - state.laneX) < 1.3 &&
          state.playerY < 1.8
        ) {
          item.hitCooldown = 0.42;
          takeHit();
        }
      });

      emitUpdate();
    }

    updateHUD();
    renderer.render(scene, camera);
  }

  emitUpdate();
  updateHUD();
  animate();

  return {
    destroy() {
      state.destroyed = true;
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);

      collectibleGroup.children.forEach((mesh) => {
        mesh.geometry?.dispose?.();
        mesh.material?.dispose?.();
      });

      obstacleGroup.children.forEach((mesh) => {
        mesh.geometry?.dispose?.();
        mesh.material?.dispose?.();
      });

      renderer.dispose();

      if (renderer.domElement?.parentNode === container) {
        container.removeChild(renderer.domElement);
      }

      const overlay = container.querySelector(".rb-ride-overlay");
      if (overlay) overlay.remove();
    }
  };
}
