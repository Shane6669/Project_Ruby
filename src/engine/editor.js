import * as THREE from 'three';
import * as CANNON from 'cannon-es';

const PRIM_COLORS = [0xd6dde8, 0xe8d6c0, 0xc0d6e8, 0xd6c0e8, 0xe8e8c0];

let _colorIdx = 0;

function nextColor() {
  return PRIM_COLORS[_colorIdx++ % PRIM_COLORS.length];
}

export class EditorPanel {
  constructor(scene, physics, camera) {
    this._scene = scene;
    this._physics = physics;
    this._camera = camera;
    this._onTerrainChange = null;
    this._wireframe = true;

    this._bind();
  }

  onTerrainChange(fn) {
    this._onTerrainChange = fn;
  }

  _bind() {
    document.getElementById('terrain-height').addEventListener('input', (e) => {
      this._onTerrainChange?.('amplitude', Number(e.target.value));
    });

    document.getElementById('terrain-roughness').addEventListener('input', (e) => {
      this._onTerrainChange?.('roughness', Number(e.target.value));
    });

    document.getElementById('terrain-style').addEventListener('change', (e) => {
      this._onTerrainChange?.('style', e.target.value);
    });

    document.getElementById('terrain-wireframe').addEventListener('change', (e) => {
      this._wireframe = e.target.checked;
      this._onTerrainChange?.('wireframe', e.target.checked);
    });

    document.getElementById('spawn-model').addEventListener('click', () => {
      const type = document.getElementById('model-type').value;
      const color = document.getElementById('model-color').value;
      this._spawnPrimitive(type, color);
    });
  }

  _spawnPrimitive(type, hexColor) {
    let geom, shape;
    if (type === 'sphere') {
      geom  = new THREE.SphereGeometry(2.2, 24, 24);
      shape = new CANNON.Sphere(2.2);
    } else if (type === 'capsule') {
      geom  = new THREE.CapsuleGeometry(1.4, 2.8, 10, 16);
      shape = new CANNON.Cylinder(1.4, 1.4, 4.2, 14);
    } else {
      geom  = new THREE.BoxGeometry(3.6, 3.6, 3.6);
      shape = new CANNON.Box(new CANNON.Vec3(1.8, 1.8, 1.8));
    }

    const color = hexColor ? parseInt(hexColor.replace('#', ''), 16) : nextColor();
    const mesh = new THREE.Mesh(
      geom,
      new THREE.MeshStandardMaterial({ color, roughness: 0.5, metalness: 0.25 }),
    );
    mesh.castShadow = true;
    mesh.receiveShadow = true;

    const fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(this._camera.quaternion);
    mesh.position.copy(this._camera.position).addScaledVector(fwd, 18);
    mesh.position.y = Math.max(mesh.position.y, 6);

    this._scene.add(mesh);
    this._physics.addDynamic(mesh, shape);
  }
}
