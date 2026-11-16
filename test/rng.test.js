import test from 'node:test';
import assert from 'node:assert/strict';

import { chance, gauss, hashSeed, int, makeRng, pick, range, rngStream } from '../src/core/rng.js';

test('hashSeed стабилен и не выходит за uint32', () => {
  assert.equal(hashSeed('demo'), 2935829814);
  assert.equal(hashSeed('demo:pileus'), 3194606496);
  assert.equal(hashSeed('demo'), hashSeed('demo'));
  assert.notEqual(hashSeed('demo'), hashSeed('demo '));
  assert.ok(hashSeed('') >= 0 && hashSeed('') <= 0xffffffff);
});

test('mulberry32: эталонная последовательность для сида 12345', () => {
  const rng = makeRng(12345);
  const values = [rng(), rng(), rng(), rng(), rng()].map((value) => value.toFixed(6));

  assert.deepEqual(values, [
    '0.979728',
    '0.306752',
    '0.484205',
    '0.817934',
    '0.509428',
  ]);
});

test('один сид — одна последовательность, разные — разные', () => {
  const a = makeRng(7);
  const b = makeRng(7);
  const c = makeRng(8);

  const seqA = Array.from({ length: 20 }, () => a());
  const seqB = Array.from({ length: 20 }, () => b());
  const seqC = Array.from({ length: 20 }, () => c());

  assert.deepEqual(seqA, seqB);
  assert.notDeepEqual(seqA, seqC);
});

test('именованные потоки не зависят друг от друга', () => {
  const stipe = rngStream('seed', 'stipe');
  const pileus = rngStream('seed', 'pileus');
  const stipeAgain = rngStream('seed', 'stipe');

  const first = stipe();
  // Поток шляпки «тратит» числа, но ножка этого не замечает.
  pileus();
  pileus();
  const second = stipe();

  const control = makeRng(hashSeed('seed:stipe'));
  assert.equal(first, control());
  assert.equal(second, control());
  assert.notEqual(first, rngStream('seed', 'pileus')());
});

test('значения всегда в [0, 1)', () => {
  const rng = makeRng(99);
  for (let i = 0; i < 1000; i++) {
    const value = rng();
    assert.ok(value >= 0 && value < 1, `вне диапазона: ${value}`);
  }
});

test('range и int не выходят за границы', () => {
  const rng = makeRng(1);

  for (let i = 0; i < 1000; i++) {
    const value = range(rng, -2, 3);
    assert.ok(value >= -2 && value <= 3);

    const integer = int(rng, 3, 7);
    assert.ok(Number.isInteger(integer));
    assert.ok(integer >= 3 && integer <= 7);
  }

  assert.equal(int(makeRng(1), 0, 0), 0);
});

test('pick, chance и gauss ведут себя предсказуемо', () => {
  const rng = makeRng(5);
  const list = ['a', 'b', 'c'];

  for (let i = 0; i < 100; i++) assert.ok(list.includes(pick(rng, list)));

  let hits = 0;
  for (let i = 0; i < 1000; i++) if (chance(rng, 0.25)) hits++;
  assert.ok(hits > 150 && hits < 350, `странная частота: ${hits}`);

  const value = gauss(rng, 10, 2);
  assert.ok(Number.isFinite(value));
});
