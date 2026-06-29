import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { CELL_SIZE, sampleTerrainHeight, sampleCaveDensity, wrapToLoopingChunk } from './procedural.js';

const scene = new THREE.Scene();
scene.background = new THREE.Color('#090b13');
scene.fog = new THREE.Fog('#090b13', 250, 900);

const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 2400);
camera.position.set(0, 34, 120);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

const hemi = new THREE.HemisphereLight('#9db7ff', '#101015', 0.8);
scene.add(hemi);

const directional = new THREE.DirectionalLight('#fdf6e0', 1.35);
directional.position.set(140, 280, 120);
directional.castShadow = true;
directional.shadow.mapSize.set(2048, 2048);
directional.shadow.camera.left = -360;
directional.shadow.camera.right = 360;
directional.shadow.camera.top = 360;
directional.shadow.camera.bottom = -360;
scene.add(directional);

const world = new CANNON.World();
world.gravity.set(0, -9.82, 0);
world.broadphase = new CANNON.SAPBroadphase(world);
world.allowSleep = true;

const dynamicItems = [];
const keyState = new Set();

const terrainState = {
  heightAmplitude: 24,
  roughness: 12,
  style: 'realistic'
};

const terrainGeometry = new THREE.PlaneGeometry(CELL_SIZE * 4, CELL_SIZE * 4, 120, 120);
const terrainMaterial = new THREE.MeshStandardMaterial({
  color: '#6c8f55',
  wireframe: true,
  roughness: 0.82,
  metalness: 0.08
});
const terrainMesh = new THREE.Mesh(terrainGeometry, terrainMaterial);
terrainMesh.rotation.x = -Math.PI / 2;
terrainMesh.receiveShadow = true;
scene.add(terrainMesh);

let terrainBody = null;

const cavePointsGeom = new THREE.BufferGeometry();
const caveMaterial = new THREE.PointsMaterial({ color: '#7bbdff', size: 0.55, transparent: true, opacity: 0.65 });
const cavePoints = new THREE.Points(cavePointsGeom, caveMaterial);
scene.add(cavePoints);

function getTerrainColor(style) {
  if (style === 'desert') return '#ad8f5a';
  if (style === 'frost') return '#b9ccd6';
  return '#6c8f55';
}

function rebuildTerrain() {
  const positions = terrainGeometry.attributes.position;
  const localVerts = [];
  for (let i = 0; i < positions.count; i += 1) {
    const x = positions.getX(i);
    const z = positions.getY(i);
    const worldSample = wrapToLoopingChunk(x, z, CELL_SIZE * 4);
    const y = sampleTerrainHeight(worldSample.x, worldSample.z, terrainState);
    positions.setZ(i, y);
    localVerts.push(new CANNON.Vec3(x, y, z));
  }
  positions.needsUpdate = true;
  terrainGeometry.computeVertexNormals();

  const points = [];
  const step = 5;
  for (let y = -26; y <= 18; y += step) {
    for (let x = -52; x <= 52; x += step) {
      for (let z = -52; z <= 52; z += step) {
        if (sampleCaveDensity(x, y, z) > 1.3) {
          points.push(x, y, z);
        }
      }
    }
  }
  cavePointsGeom.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));

  if (terrainBody) {
    world.removeBody(terrainBody);
  }

  const shape = new CANNON.Trimesh(
    localVerts.flatMap((v) => [v.x, v.y, v.z]),
    terrainGeometry.index.array
  );
  terrainBody = new CANNON.Body({ mass: 0, shape });
  terrainBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
  world.addBody(terrainBody);

  terrainMaterial.color.set(getTerrainColor(terrainState.style));
}

function createPhysicsPrimitive(type, position) {
  let geometry;
  let shape;
  if (type === 'sphere') {
    geometry = new THREE.SphereGeometry(2.2, 24, 24);
    shape = new CANNON.Sphere(2.2);
  } else if (type === 'capsule') {
    geometry = new THREE.CapsuleGeometry(1.4, 2.8, 10, 16);
    shape = new CANNON.Cylinder(1.4, 1.4, 4.2, 14);
  } else {
    geometry = new THREE.BoxGeometry(3.6, 3.6, 3.6);
    shape = new CANNON.Box(new CANNON.Vec3(1.8, 1.8, 1.8));
  }

  const mesh = new THREE.Mesh(
    geometry,
    new THREE.MeshStandardMaterial({ color: '#d6dde8', roughness: 0.5, metalness: 0.25 })
  );
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.position.copy(position);

  const body = new CANNON.Body({ mass: 6, shape });
  body.position.set(position.x, position.y, position.z);
  body.linearDamping = 0.03;
  body.angularDamping = 0.1;

  scene.add(mesh);
  world.addBody(body);
  dynamicItems.push({ mesh, body });
}

let yaw = 0;
let pitch = -0.15;

function applyCameraControl(deltaSeconds) {
  const speed = 50 * deltaSeconds;
  const forward = new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw));
  const right = new THREE.Vector3(forward.z, 0, -forward.x);

  if (keyState.has('KeyW')) camera.position.addScaledVector(forward, -speed);
  if (keyState.has('KeyS')) camera.position.addScaledVector(forward, speed);
  if (keyState.has('KeyA')) camera.position.addScaledVector(right, -speed);
  if (keyState.has('KeyD')) camera.position.addScaledVector(right, speed);

  camera.position.y = Math.max(camera.position.y, 12);
  camera.rotation.order = 'YXZ';
  camera.rotation.y = yaw;
  camera.rotation.x = pitch;
}

function editorHandlers() {
  const heightControl = document.getElementById('terrain-height');
  const roughControl = document.getElementById('terrain-roughness');
  const styleControl = document.getElementById('terrain-style');
  const modelControl = document.getElementById('model-type');
  const spawnButton = document.getElementById('spawn-model');

  heightControl.addEventListener('input', () => {
    terrainState.heightAmplitude = Number(heightControl.value);
    rebuildTerrain();
  });

  roughControl.addEventListener('input', () => {
    terrainState.roughness = Number(roughControl.value);
    rebuildTerrain();
  });

  styleControl.addEventListener('change', () => {
    terrainState.style = styleControl.value;
    rebuildTerrain();
  });

  spawnButton.addEventListener('click', () => {
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
    const origin = camera.position.clone().addScaledVector(forward, 15);
    createPhysicsPrimitive(modelControl.value, origin);
  });
}

window.addEventListener('keydown', (event) => keyState.add(event.code));
window.addEventListener('keyup', (event) => keyState.delete(event.code));

renderer.domElement.addEventListener('click', () => {
  renderer.domElement.requestPointerLock();
});

document.addEventListener('mousemove', (event) => {
  if (document.pointerLockElement !== renderer.domElement) {
    return;
  }
  yaw -= event.movementX * 0.002;
  pitch -= event.movementY * 0.002;
  pitch = Math.max(-1.4, Math.min(1.4, pitch));
});

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

rebuildTerrain();
editorHandlers();

for (let i = 0; i < 18; i += 1) {
  createPhysicsPrimitive('box', new THREE.Vector3((Math.random() - 0.5) * 80, 80 + i * 6, (Math.random() - 0.5) * 80));
}

let previous = performance.now();
function animate(time) {
  const delta = Math.min((time - previous) / 1000, 0.05);
  previous = time;

  applyCameraControl(delta);
  world.step(1 / 60, delta, 4);

  for (const item of dynamicItems) {
    item.mesh.position.copy(item.body.position);
    item.mesh.quaternion.copy(item.body.quaternion);
  }

  directional.position.set(camera.position.x + 100, 280, camera.position.z + 80);

  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

requestAnimationFrame(animate);
