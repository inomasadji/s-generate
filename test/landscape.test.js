import test from 'node:test';
import assert from 'node:assert/strict';

import { getPalette } from '../src/core/palette.js';
import { hashSeed } from '../src/core/rng.js';
import { buildDisplayList } from '../src/render/build.js';
import { layout } from '../src/render/layout.js';
import { buildLandscape } from '../src/scene/landscape.js';

const palette = getPalette('forest');
const view = layout({ width: 900, height: 900, dpr: 1 });

function hashItems(items) {
  const text = items
    .map((item) => `${item.color}|${item.pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(';')}`)
    .join('|');
  return hashSeed(text).toString(16).padStart(8, '0');
}

test('ландшафт детерминирован', () => {
  const a = buildLandscape({ seed: 'scape-1', palette });
  const b = buildLandscape({ seed: 'scape-1', palette });

  assert.equal(JSON.stringify(a), JSON.stringify(b));
  assert.equal(
    hashItems(buildDisplayList(a, view).items),
    hashItems(buildDisplayList(b, view).items),
  );
});

test('сцена содержит небо, рельеф и объекты', () => {
  const scene = buildLandscape({ seed: 'scape-1', palette });
  const list = buildDisplayList(scene, view);
  const layers = new Set(list.items.map((item) => item.layer));

  assert.equal(scene.mode, 'scene');
  assert.ok(scene.scenery.length > 20);
  assert.ok(scene.objects.length >= 8);
  assert.ok(list.backdrop.kind === 'sky');
  assert.ok(layers.has(1), 'горы');
  assert.ok(layers.has(2), 'облака');
  assert.ok(layers.has(3), 'холмы');
  assert.ok(Math.max(...layers) >= 10, 'объекты');
});

test('слои объектов идут от дальних к ближним', () => {
  const scene = buildLandscape({ seed: 'scape-2', palette });
  const ys = scene.objects.map((object) => object.y);

  for (let i = 1; i < ys.length; i++) assert.ok(ys[i] >= ys[i - 1]);
  for (let i = 1; i < scene.objects.length; i++) {
    assert.equal(scene.objects[i].layer - scene.objects[i - 1].layer, 10);
  }
});

test('объекты стоят на земле, а не в небе', () => {
  const scene = buildLandscape({ seed: 'scape-2', palette });
  const list = buildDisplayList(scene, view);

  for (const item of list.items) {
    if (item.layer < 10) continue;
    for (const [, y] of item.pts) {
      assert.ok(y >= 300 && y <= 760, `y=${y}`);
    }
  }
});

test('сцена укладывается в бюджет полигонов', () => {
  const scene = buildLandscape({ seed: 'scape-3', palette });
  const list = buildDisplayList(scene, view);

  assert.ok(list.items.length < 12000, `полигонов: ${list.items.length}`);
});
