import * as THREE from 'three';

export const CHUNK_SIZE = 96;
export const CHUNK_SEGS = 80;
export const CHUNK_GRID = 3;

const TERRAIN_COLORS = {
  realistic: 0x6c8f55,
  desert: 0xad8f5a,
  frost: 0xb9ccd6,
};

function pseudoRand(nx, nz) {
  const v = Math.sin(nx * 12.9898 + nz * 78.233) * 43758.5453;
  return (v - Math.floor(v)) * 2 - 1;
}

function sampleHeight(worldX, worldZ, amplitude, roughness) {
  const large = pseudoRand(worldX / (roughness * 7), worldZ / (roughness * 7)) * amplitude;
  const medium = pseudoRand((worldX + 111.3) / (roughness * 2.5), (worldZ - 47.8) / (roughness * 2.5)) * (amplitude * 0.35);
  const fine = pseudoRand((worldX - 15.2) / roughness, (worldZ + 89.4) / roughness) * (amplitude * 0.12);
  return large + medium + fine;
}

export class TerrainManager {
  constructor(scene) {
    this._scene = scene;
    this._settings = { amplitude: 24, roughness: 12, style: 'realistic' };
    this._chunks = [];
    this._lastCamChunkX = Infinity;
    this._lastCamChunkZ = Infinity;

    for (let cz = 0; cz < CHUNK_GRID; cz++) {
      for (let cx = 0; cx < CHUNK_GRID; cx++) {
        const geom = new THREE.PlaneGeometry(CHUNK_SIZE, CHUNK_SIZE, CHUNK_SEGS, CHUNK_SEGS);
        const mat = new THREE.MeshStandardMaterial({
          color: TERRAIN_COLORS.realistic,
          wireframe: true,
          roughness: 0.82,
          metalness: 0.08,
        });
        const mesh = new THREE.Mesh(geom, mat);
        mesh.rotation.x = -Math.PI / 2;
        mesh.receiveShadow = true;
        scene.add(mesh);
        this._chunks.push({ mesh, geom, mat, dirty: true, originX: 0, originZ: 0 });
      }
    }
  }

  update(cameraX, cameraZ) {
    const camChunkX = Math.floor(cameraX / CHUNK_SIZE);
    const camChunkZ = Math.floor(cameraZ / CHUNK_SIZE);

    const moved = camChunkX !== this._lastCamChunkX || camChunkZ !== this._lastCamChunkZ;
    if (!moved) return false;
    this._lastCamChunkX = camChunkX;
    this._lastCamChunkZ = camChunkZ;

    const half = Math.floor(CHUNK_GRID / 2);
    let idx = 0;
    for (let cz = 0; cz < CHUNK_GRID; cz++) {
      for (let cx = 0; cx < CHUNK_GRID; cx++) {
        const worldChunkX = camChunkX + cx - half;
        const worldChunkZ = camChunkZ + cz - half;
        this._buildChunk(idx, worldChunkX, worldChunkZ);
        idx++;
      }
    }
    return true;
  }

  rebuild() {
    this._lastCamChunkX = Infinity;
    this._lastCamChunkZ = Infinity;
  }

  setStyle(style) {
    this._settings.style = style;
    this.rebuild();
  }

  setAmplitude(v) {
    this._settings.amplitude = v;
    this.rebuild();
  }

  setRoughness(v) {
    this._settings.roughness = v;
    this.rebuild();
  }

  _buildChunk(idx, worldChunkX, worldChunkZ) {
    const { mesh, geom, mat } = this._chunks[idx];
    const { amplitude, roughness, style } = this._settings;
    const originX = worldChunkX * CHUNK_SIZE;
    const originZ = worldChunkZ * CHUNK_SIZE;

    this._chunks[idx].originX = originX;
    this._chunks[idx].originZ = originZ;

    mesh.position.set(originX + CHUNK_SIZE / 2, 0, originZ + CHUNK_SIZE / 2);

    const pos = geom.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const lx = pos.getX(i);
      const lz = pos.getY(i);
      const wx = originX + lx + CHUNK_SIZE / 2;
      const wz = originZ + lz + CHUNK_SIZE / 2;
      pos.setZ(i, sampleHeight(wx, wz, amplitude, roughness));
    }
    pos.needsUpdate = true;
    geom.computeVertexNormals();

    mat.color.setHex(TERRAIN_COLORS[style] ?? TERRAIN_COLORS.realistic);
    this._chunks[idx].dirty = true;
  }

  getChunkData(idx) {
    return this._chunks[idx] ?? null;
  }

  get count() {
    return this._chunks.length;
  }
}
