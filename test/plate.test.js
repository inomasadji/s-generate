import test from 'node:test';
import assert from 'node:assert/strict';

import { getPalette } from '../src/core/palette.js';
import { hashSeed } from '../src/core/rng.js';
import { plateFileName } from '../src/export/png.js';
import { buildDisplayList } from '../src/render/build.js';
import { layout } from '../src/render/layout.js';
import { buildPlate } from '../src/scene/plate.js';

const palette = getPalette('paper');
const view = layout({ width: 900, height: 900, dpr: 1 });

function hashItems(items) {
  const text = items
    .map((item) => `${item.color}|${item.pts.map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`).join(';')}`)
    .join('|');
  return hashSeed(text).toString(16).padStart(8, '0');
}

test('плашка детерминирована', () => {
  const a = buildPlate({ seed: 'golden-1', palette });
  const b = buildPlate({ seed: 'golden-1', palette });

  assert.equal(JSON.stringify(a), JSON.stringify(b));
  assert.equal(
    JSON.stringify(buildDisplayList(a, view)),
    JSON.stringify(buildDisplayList(b, view)),
  );
});

test('подпись и рамка попадают в display list', () => {
  const scene = buildPlate({ seed: 'caption', palette });
  const list = buildDisplayList(scene, view);

  assert.ok(list.overlay);
  assert.equal(list.overlay.title, scene.name.full);
  assert.equal(list.overlay.subtitle, `s-generate · ${scene.seed}`);
});

test('имя файла читаемо и безопасно', () => {
  const scene = buildPlate({ seed: 'golden-1', palette });

  assert.equal(
    plateFileName(scene),
    `s-generate_mushroom_${scene.name.slug}_golden-1.png`,
  );
  assert.equal(plateFileName(scene, 'gif').endsWith('.gif'), true);
  assert.match(plateFileName({ ...scene, seed: 'Привет мир!' }), /_seed\.png$/);
});

test('двадцать сидов дают двадцать разных плашек', () => {
  const hashes = new Set();

  for (let i = 0; i < 20; i++) {
    const scene = buildPlate({ seed: `variety-${i}`, palette });
    hashes.add(hashItems(buildDisplayList(scene, view).items));
  }

  assert.equal(hashes.size, 20);
});

test('golden: картинка плашки не меняется незаметно', () => {
  const scene = buildPlate({ seed: 'golden-1', palette });
  const list = buildDisplayList(scene, view);

  assert.equal(hashItems(list.items), 'dee84e99');
});
