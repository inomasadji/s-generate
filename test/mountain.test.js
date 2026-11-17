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

/** Хребет собирается из верхних рёбер фасетов: они общие и стыкуются по x. */
function ridgeOf(facets) {
  const ys = new Map();

  for (const facet of facets) {
    for (const [x, y] of facet.pts.slice(0, 2)) {
      const key = x.toFixed(6);
      ys.set(key, Math.max(ys.get(key) ?? -Infinity, y));
    }
  }

  return [...ys.entries()]
    .map(([x, y]) => [Number(x), y])
    .sort((a, b) => a[0] - b[0]);
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
    const facets = mountain.polys.filter((poly) => poly.group === 'mountain');
    const caps = mountain.polys.filter((poly) => poly.group === 'snow');

    assert.ok(facets.length > 0, `${seed}: нет хребта`);

    const onMountain = (x, y) => facets.some((facet) =>
      inside([x, y], facet.pts) ||
      inside([x, y - 1e-6], facet.pts) ||
      inside([x, y + 1e-6], facet.pts));

    for (const cap of caps) {
      for (const [x, y] of cap.pts) {
        assert.ok(
          onMountain(x, y),
          `${seed}: снег в (${x.toFixed(3)}, ${y.toFixed(3)}) вне горы`,
        );
      }
    }
  }
});

test('вершины гор разной высоты: есть главная', () => {
  for (const seed of SEEDS) {
    const mountain = buildMountain({ seed, palette });
    const ridge = ridgeOf(mountain.polys.filter((poly) => poly.group === 'mountain'));
    const peaks = [];

    for (let i = 1; i < ridge.length - 1; i++) {
      if (ridge[i][1] > ridge[i - 1][1] && ridge[i][1] > ridge[i + 1][1]) {
        peaks.push(ridge[i][1]);
      }
    }

    assert.ok(peaks.length >= 2, `${seed}: вершин ${peaks.length}`);
    const spread = Math.max(...peaks) - Math.min(...peaks);
    assert.ok(spread > 0.06, `${seed}: вершины почти одной высоты (${spread.toFixed(3)})`);
  }
});

/** Яркость в 0..255: для проверки, что свет и тень действительно различаются. */
function luminance([r, g, b]) {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

test('у гор есть освещённые и теневые грани', () => {
  for (const seed of SEEDS) {
    const facets = buildMountain({ seed, palette }).polys.filter((poly) => poly.group === 'mountain');
    const colors = new Set(facets.map((facet) => facet.color.join(',')));
    const values = facets.map((facet) => luminance(facet.color));
    const spread = Math.max(...values) - Math.min(...values);

    assert.ok(colors.size >= 3, `${seed}: граней всего ${colors.size}`);
    assert.ok(spread > 30, `${seed}: свет и тень почти одинаковы (${spread.toFixed(1)})`);
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
