import test from 'node:test';
import assert from 'node:assert/strict';

import { buildMushroom } from '../src/model/mushroom.js';

test('один сид — один гриб, другой сид — другой', () => {
  const a = buildMushroom({ seed: 'golden-1' });
  const b = buildMushroom({ seed: 'golden-1' });
  const c = buildMushroom({ seed: 'golden-2' });

  assert.equal(JSON.stringify(a), JSON.stringify(b));
  assert.notEqual(JSON.stringify(a), JSON.stringify(c));
});

test('гриб состоит из ножки, шляпки и пятен', () => {
  const mushroom = buildMushroom({ seed: 'golden-1' });
  const groups = new Set(mushroom.polys.map((poly) => poly.group));

  assert.ok(mushroom.polys.length > 200, `слишком мало полигонов: ${mushroom.polys.length}`);
  assert.ok(groups.has('stipe'));
  assert.ok(groups.has('pileus'));
  assert.ok(groups.has('spot'));
});

test('все цвета — валидные sRGB', () => {
  const mushroom = buildMushroom({ seed: 'structure' });

  for (const poly of mushroom.polys) {
    assert.equal(poly.color.length, 3);
    for (const channel of poly.color) {
      assert.ok(Number.isInteger(channel));
      assert.ok(channel >= 0 && channel <= 255);
    }
  }
});

test('габариты охватывают все вершины', () => {
  const mushroom = buildMushroom({ seed: 'bounds' });
  const { min, max } = mushroom.bounds;

  for (const poly of mushroom.polys) {
    for (const point of poly.pts) {
      for (let axis = 0; axis < 3; axis++) {
        assert.ok(point[axis] >= min[axis] - 1e-9);
        assert.ok(point[axis] <= max[axis] + 1e-9);
      }
    }
  }

  assert.ok(max[1] > 1);
  assert.ok(max[1] - min[1] > 1);
});

test('у мухомора есть юбка', () => {
  const mushroom = buildMushroom({
    seed: 'ring-test',
    params: { shape: 'amanita' },
  });

  assert.ok(mushroom.polys.some((poly) => poly.group === 'ring'));
  assert.equal(
    mushroom.polys.filter((poly) => poly.group === 'spot').length,
    12,
  );
});

test('параметры можно переопределить', () => {
  const mushroom = buildMushroom({
    seed: 'fixed',
    params: { height: 2, capRadius: 0.9, spotCount: 0, stemNoise: 0 },
  });

  assert.equal(mushroom.height, 2);
  assert.ok(!mushroom.polys.some((poly) => poly.group === 'spot'));
});
