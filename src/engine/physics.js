import * as THREE from 'three';
import * as CANNON from 'cannon-es';

export class PhysicsManager {
  constructor() {
    this.world = new CANNON.World();
    this.world.gravity.set(0, -9.82, 0);
    this.world.broadphase = new CANNON.SAPBroadphase(this.world);
    this.world.allowSleep = true;

    this._items = [];
    this._terrainBodies = [];
  }

  step(deltaSeconds) {
    this.world.step(1 / 60, deltaSeconds, 4);
    for (const { mesh, body } of this._items) {
      mesh.position.copy(body.position);
      mesh.quaternion.copy(body.quaternion);
    }
  }

  addDynamic(mesh, shape, mass = 6) {
    const body = new CANNON.Body({ mass, shape });
    body.position.set(mesh.position.x, mesh.position.y, mesh.position.z);
    body.linearDamping = 0.03;
    body.angularDamping = 0.1;
    this.world.addBody(body);
    this._items.push({ mesh, body });
    return body;
  }

  syncTerrainChunk(idx, geom, mesh) {
    if (this._terrainBodies[idx]) {
      this.world.removeBody(this._terrainBodies[idx]);
      this._terrainBodies[idx] = null;
    }

    const pos = geom.attributes.position;
    const verts = new Float32Array(pos.count * 3);
    for (let i = 0; i < pos.count; i++) {
      verts[i * 3 + 0] = pos.getX(i);
      verts[i * 3 + 1] = pos.getZ(i);
      verts[i * 3 + 2] = pos.getY(i);
    }
    const indices = geom.index.array;
    const shape = new CANNON.Trimesh(verts, indices);

    const body = new CANNON.Body({ mass: 0, shape });
    body.position.set(mesh.position.x, 0, mesh.position.z);
    body.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
    this.world.addBody(body);
    this._terrainBodies[idx] = body;
  }
}
