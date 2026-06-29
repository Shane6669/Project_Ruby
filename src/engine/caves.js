import * as THREE from 'three';
import { sampleCaveDensity } from './cave-math.js';

export { sampleCaveDensity };
export class CaveRenderer {
  constructor(scene) {
    this._scene = scene;
    this._lineSegments = null;
    this._build();
  }

  _build() {
    if (this._lineSegments) {
      this._scene.remove(this._lineSegments);
      this._lineSegments.geometry.dispose();
    }

    const verts = [];
    const step = 6;
    const threshold = 1.05;

    const dirs = [
      [step, 0, 0],
      [0, step, 0],
      [0, 0, step],
    ];

    for (let y = -30; y <= 10; y += step) {
      for (let x = -120; x <= 120; x += step) {
        for (let z = -120; z <= 120; z += step) {
          const d0 = sampleCaveDensity(x, y, z);
          if (d0 < threshold) continue;
          for (const [dx, dy, dz] of dirs) {
            const d1 = sampleCaveDensity(x + dx, y + dy, z + dz);
            if (d1 >= threshold) {
              verts.push(x, y, z, x + dx, y + dy, z + dz);
            }
          }
        }
      }
    }

    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
    const mat = new THREE.LineBasicMaterial({
      color: 0x5fa3e0,
      transparent: true,
      opacity: 0.55,
    });
    this._lineSegments = new THREE.LineSegments(geom, mat);
    this._scene.add(this._lineSegments);
  }
}
