import * as THREE from 'three';
import { TerrainManager } from './engine/terrain.js';
import { PhysicsManager } from './engine/physics.js';
import { CameraController } from './engine/camera.js';
import { CaveRenderer } from './engine/caves.js';
import { EditorPanel } from './engine/editor.js';

// ── Renderer ─────────────────────────────────────────────────────────────────

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

// ── Scene & Camera ───────────────────────────────────────────────────────────

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x090b13);
scene.fog = new THREE.Fog(0x090b13, 200, 700);

const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 2000);
camera.position.set(0, 34, 120);

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ── Lighting ─────────────────────────────────────────────────────────────────

const hemi = new THREE.HemisphereLight(0x9db7ff, 0x101015, 0.8);
scene.add(hemi);

const sun = new THREE.DirectionalLight(0xfdf6e0, 1.35);
sun.position.set(140, 280, 120);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.left  = -360;
sun.shadow.camera.right =  360;
sun.shadow.camera.top   =  360;
sun.shadow.camera.bottom = -360;
scene.add(sun);

// cave ambient glow
const caveAmbient = new THREE.PointLight(0x3b6fbf, 0.9, 120);
caveAmbient.position.set(0, -10, 0);
scene.add(caveAmbient);

// ── Engine Systems ───────────────────────────────────────────────────────────

const physics  = new PhysicsManager();
const terrain  = new TerrainManager(scene);
const caveRenderer = new CaveRenderer(scene);
const cameraCtrl   = new CameraController(camera, renderer.domElement);
const editor   = new EditorPanel(scene, physics, camera);

editor.onTerrainChange((key, value) => {
  if (key === 'amplitude')  terrain.setAmplitude(value);
  if (key === 'roughness')  terrain.setRoughness(value);
  if (key === 'style')      terrain.setStyle(value);
  if (key === 'wireframe') {
    for (let i = 0; i < terrain.count; i++) {
      terrain.getChunkData(i).mat.wireframe = value;
    }
  }
});

// ── Seed objects ─────────────────────────────────────────────────────────────

import * as CANNON from 'cannon-es';

for (let i = 0; i < 18; i++) {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(3.6, 3.6, 3.6),
    new THREE.MeshStandardMaterial({ color: 0xd6dde8, roughness: 0.5, metalness: 0.25 }),
  );
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.position.set(
    (Math.random() - 0.5) * 100,
    80 + i * 6,
    (Math.random() - 0.5) * 100,
  );
  scene.add(mesh);
  physics.addDynamic(mesh, new CANNON.Box(new CANNON.Vec3(1.8, 1.8, 1.8)));
}

// ── Game loop ─────────────────────────────────────────────────────────────────

let prev = performance.now();

function animate(now) {
  requestAnimationFrame(animate);

  const dt = Math.min((now - prev) / 1000, 0.05);
  prev = now;

  cameraCtrl.update(dt);

  const changed = terrain.update(camera.position.x, camera.position.z);
  if (changed) {
    for (let i = 0; i < terrain.count; i++) {
      const chunk = terrain.getChunkData(i);
      if (chunk?.dirty) {
        physics.syncTerrainChunk(i, chunk.geom, chunk.mesh);
        chunk.dirty = false;
      }
    }
  }

  physics.step(dt);

  // move sun with camera
  sun.position.set(camera.position.x + 100, 280, camera.position.z + 80);

  renderer.render(scene, camera);
}

requestAnimationFrame(animate);

