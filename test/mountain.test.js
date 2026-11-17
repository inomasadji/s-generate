import test from 'node:test';
import assert from 'node:assert/strict';

import { getPalette } from '../src/core/palette.js';
import { buildMountain } from '../src/model/mountain.js';

const palette = getPalette('paper');
const SEEDS = ['mt-1', 'mt-2', 'mt-3', 'mt-4', 'demo', 'torr', 'cauldron'];

/** @param {[number, number]} point */
function inside(point, pts) {
  let result = false;

  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i];
    const [xj, yj] = pts[j];
    if ((yi > point[1]) !== (yj > point[1]) &&
        point[0] < ((xj - xi) * (point[1] - yi)) / (yj - yi) + xi) {
      result = !result;
    }
  }

  return result;
}

test('гора детерминирована', () => {
  const a = buildMountain({ seed: 'mt-1', palette });
  const b = buildMountain({ seed: 'mt-1', palette });
  const c = buildMountain({ seed: 'mt-2', palette });

  assert.equal(JSON.stringify(a), JSON.stringify(b));
  assert.notEqual(JSON.stringify(a), JSON.stringify(c));
});

test('снег лежит на горе, а не висит в воздухе', () => {
  for (const seed of SEEDS) {
    const mountain = buildMountain({ seed, palette });
    const body = mountain.polys.find((poly) => poly.group === 'mountain');
    const caps = mountain.polys.filter((poly) => poly.group === 'snow');

    assert.ok(body, `${seed}: нет хребта`);

    for (const cap of caps) {
      for (const [x, y] of cap.pts) {
        // Вершина шапки может лежать ровно на кромке: сдвиг на эпсилон вниз
        // (внутрь горы) отличает «на склоне» от «в небе».
        assert.ok(
          inside([x, y], body.pts) ||
            inside([x, y - 1e-6], body.pts) ||
            inside([x, y + 1e-6], body.pts),
          `${seed}: снег в (${x.toFixed(3)}, ${y.toFixed(3)}) вне горы`,
        );
      }
    }
  }
});

test('вершины гор разной высоты: есть главная', () => {
  for (const seed of SEEDS) {
    const mountain = buildMountain({ seed, palette });
    const body = mountain.polys.find((poly) => poly.group === 'mountain');
    const peaks = [];

    for (let i = 1; i < body.pts.length - 1; i++) {
      const [, y] = body.pts[i];
      if (y > body.pts[i - 1][1] && y > body.pts[i + 1][1]) peaks.push(y);
    }

    assert.ok(peaks.length >= 2, `${seed}: вершин ${peaks.length}`);
    const spread = Math.max(...peaks) - Math.min(...peaks);
    assert.ok(spread > 0.06, `${seed}: вершины почти одной высоты (${spread.toFixed(3)})`);
  }
});

test('цвета гор — валидные sRGB', () => {
  const mountain = buildMountain({ seed: 'mt-colors', palette });

  for (const poly of mountain.polys) {
    for (const channel of poly.color) {
      assert.ok(Number.isInteger(channel) && channel >= 0 && channel <= 255);
    }
  }
});
