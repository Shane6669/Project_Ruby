import test from 'node:test';
import assert from 'node:assert/strict';
import { positiveModulo, sampleTerrainHeight, sampleCaveDensity, wrapToLoopingChunk, CELL_SIZE } from '../src/procedural.js';

test('positiveModulo wraps negatives and positives', () => {
  assert.equal(positiveModulo(-1, 10), 9);
  assert.equal(positiveModulo(11, 10), 1);
});

test('terrain sampling is deterministic for same coordinates', () => {
  const settings = { heightAmplitude: 24, roughness: 12 };
  const a = sampleTerrainHeight(12.5, 31.2, settings);
  const b = sampleTerrainHeight(12.5, 31.2, settings);
  assert.equal(a, b);
});

test('looping chunk wrapping stays inside bounds', () => {
  const wrapped = wrapToLoopingChunk(CELL_SIZE * 8 + 5, -17, CELL_SIZE * 4);
  assert.ok(wrapped.x >= 0 && wrapped.x < CELL_SIZE * 4);
  assert.ok(wrapped.z >= 0 && wrapped.z < CELL_SIZE * 4);
});

test('cave density stays finite', () => {
  const density = sampleCaveDensity(10, -5, 20);
  assert.equal(Number.isFinite(density), true);
});
