import test from 'node:test';
import assert from 'node:assert/strict';

import { createNoise } from '../src/core/noise.js';
import { makeRng } from '../src/core/rng.js';

test('шум детерминирован для одного RNG', () => {
  const a = createNoise(makeRng(42));
  const b = createNoise(makeRng(42));

  for (let i = 0; i < 50; i++) {
    const x = i * 0.37;
    const y = i * 0.11;
    assert.equal(a.perlin2(x, y), b.perlin2(x, y));
  }
});

test('другой сид — другой шум', () => {
  const a = createNoise(makeRng(1));
  const b = createNoise(makeRng(2));

  let differences = 0;
  for (let i = 0; i < 50; i++) {
    const x = i * 0.37 + 0.11;
    const y = i * 0.29 + 0.07;
    if (a.perlin2(x, y) !== b.perlin2(x, y)) differences++;
  }
  assert.ok(differences > 45);
});

test('perlin2 не выходит за [-1, 1]', () => {
  const noise = createNoise(makeRng(7));

  for (let i = 0; i < 2000; i++) {
    const value = noise.perlin2((i % 37) * 0.19, Math.floor(i / 37) * 0.23);
    assert.ok(value >= -1 && value <= 1, `вне диапазона: ${value}`);
  }
});

test('шум непрерывен: малый шаг — малое изменение', () => {
  const noise = createNoise(makeRng(3));

  for (let i = 0; i < 100; i++) {
    const x = i * 0.13;
    const y = i * 0.07;
    const delta = Math.abs(noise.perlin2(x + 0.001, y) - noise.perlin2(x, y));
    assert.ok(delta < 0.05, `скачок ${delta} в точке ${x}`);
  }
});

test('fbm2 тоже в пределах [-1, 1] и реагирует на число октав', () => {
  const noise = createNoise(makeRng(11));
  let changed = 0;

  for (let i = 0; i < 100; i++) {
    const x = i * 0.3;
    const y = i * 0.17;
    const value = noise.fbm2(x, y, { octaves: 5 });
    assert.ok(value >= -1 && value <= 1);
    if (noise.fbm2(x, y, { octaves: 1 }) !== value) changed++;
  }

  assert.ok(changed > 90);
});
