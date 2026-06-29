export function sampleCaveDensity(x, y, z) {
  const nx = x / 18;
  const ny = y / 12;
  const nz = z / 18;
  const band =
    Math.sin(nx * 3.1) * Math.cos(nz * 2.9) +
    Math.cos(nx * 1.7 + nz * 2.1) * Math.sin(ny * 2.4);
  const micro =
    (Math.sin(x * 0.43 + z * 0.37) + Math.sin(y * 0.61 + x * 0.29)) * 0.35;
  return band + micro;
}
