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

function makeRenderer(container) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  container.appendChild(renderer.domElement);
  return renderer;
}

function makeLights(scene) {
  const ambient = new THREE.AmbientLight(0xffffff, 0.7);
  scene.add(ambient);

  const sun = new THREE.DirectionalLight(0xffd89b, 1.45);
  sun.position.set(12, 18, 14);
  sun.castShadow = true;
  sun.shadow.mapSize.width = 2048;
  sun.shadow.mapSize.height = 2048;
  sun.shadow.camera.near = 0.1;
  sun.shadow.camera.far = 120;
  sun.shadow.camera.left = -30;
  sun.shadow.camera.right = 30;
  sun.shadow.camera.top = 30;
  sun.shadow.camera.bottom = -30;
  scene.add(sun);

  const cityGlow = new THREE.PointLight(0x57d478, 1.6, 90);
  cityGlow.position.set(12, 8, -36);
  scene.add(cityGlow);

  const streetGlow = new THREE.PointLight(0xffaa44, 1.15, 60);
  streetGlow.position.set(0, 6, 8);
  scene.add(streetGlow);
}

function makeRoad(scene) {
  const roadGroup = new THREE.Group();

  const road = new THREE.Mesh(
    new THREE.PlaneGeometry(16, ROAD_WRAP),
    new THREE.MeshStandardMaterial({ color: 0x151515, roughness: 0.95, metalness: 0.05 })
  );
  road.rotation.x = -Math.PI / 2;
  road.receiveShadow = true;
  roadGroup.add(road);

  for (let i = 0; i < 30; i += 1) {
    const stripe = new THREE.Mesh(
      new THREE.PlaneGeometry(0.42, 3.8),
      new THREE.MeshStandardMaterial({ color: 0xdbaa51, emissive: 0x92540c, emissiveIntensity: 0.35 })
    );
    stripe.rotation.x = -Math.PI / 2;
    stripe.position.set(0, 0.02, -i * 8 + 10);
    roadGroup.add(stripe);
  }

  const shoulderMat = new THREE.MeshStandardMaterial({ color: 0x0e170f, roughness: 1 });

  const leftShoulder = new THREE.Mesh(new THREE.PlaneGeometry(2.1, ROAD_WRAP), shoulderMat);
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

  const greenMat = new THREE.MeshStandardMaterial({ color: 0x556b2f, metalness: 0.6, roughness: 0.35 });
  const darkMat = new THREE.MeshStandardMaterial({ color: 0x111111, metalness: 0.2, roughness: 0.85 });
  const metalMat = new THREE.MeshStandardMaterial({ color: 0x545454, metalness: 0.9, roughness: 0.2 });
  const engineMat = new THREE.MeshStandardMaterial({ color: 0x2e8b57, metalness: 0.65, roughness: 0.35 });

  const chassis = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.28, 0.4), greenMat);
  chassis.position.set(0, 0.45, 0);
  chassis.castShadow = true;
  bike.add(chassis);

  const seatBar = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.2, 0.35), greenMat);
  seatBar.position.set(0.55, 0.8, 0);
  seatBar.castShadow = true;
  bike.add(seatBar);

  const tank = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.24, 0.46), darkMat);
  tank.position.set(0.95, 1.07, 0);
  tank.castShadow = true;
  bike.add(tank);

  const seat = new THREE.Mesh(new THREE.BoxGeometry(1.45, 0.14, 0.62), darkMat);
  seat.position.set(0.4, 1.01, 0);
  seat.castShadow = true;
  bike.add(seat);

  const engine = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.55, 18), engineMat);
  engine.position.set(-0.2, 0.3, 0);
  engine.rotation.z = Math.PI / 2;
  engine.castShadow = true;
  bike.add(engine);

  const frontFork = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 1.28, 12), metalMat);
  frontFork.position.set(-0.78, 0.78, 0);
  frontFork.rotation.z = Math.PI / 8;
  frontFork.castShadow = true;
  bike.add(frontFork);

  const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.92, 12), metalMat);
  handle.position.set(-1.1, 1.35, 0);
  handle.rotation.z = Math.PI / 2;
  handle.castShadow = true;
  bike.add(handle);

  const headlight = new THREE.Mesh(
    new THREE.SphereGeometry(0.12, 16, 16),
    new THREE.MeshStandardMaterial({ color: 0xe7fbff, emissive: 0x9fdcff, emissiveIntensity: 1.7 })
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
  const frontHub = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.18, 12), metalMat);
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
  const rearHub = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.
