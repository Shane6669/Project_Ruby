export const CELL_SIZE = 24;

export function positiveModulo(value, mod) {
  return ((value % mod) + mod) % mod;
}

function pseudoNoise(x, z, scale = 1) {
  const nx = x / scale;
  const nz = z / scale;
  const value = Math.sin(nx * 12.9898 + nz * 78.233) * 43758.5453;
  return (value - Math.floor(value)) * 2 - 1;
}

export function sampleTerrainHeight(worldX, worldZ, { heightAmplitude, roughness }) {
  const large = pseudoNoise(worldX, worldZ, roughness * 7) * heightAmplitude;
  const medium = pseudoNoise(worldX + 111.3, worldZ - 47.8, roughness * 2.5) * (heightAmplitude * 0.35);
  const fine = pseudoNoise(worldX - 15.2, worldZ + 89.4, roughness) * (heightAmplitude * 0.12);
  return large + medium + fine;
}

export function sampleCaveDensity(worldX, worldY, worldZ) {
  const caveBands = Math.sin(worldX * 0.085) + Math.cos(worldZ * 0.09) + Math.sin(worldY * 0.17);
  const micro = pseudoNoise(worldX + worldY, worldZ - worldY, 5) * 1.15;
  return caveBands + micro;
}

export function wrapToLoopingChunk(worldX, worldZ, loopSize = CELL_SIZE * 4) {
  return {
    x: positiveModulo(worldX, loopSize),
    z: positiveModulo(worldZ, loopSize)
  };
}
