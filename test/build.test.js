import test from 'node:test';
import assert from 'node:assert/strict';

import { getPalette } from '../src/core/palette.js';
import { buildMushroom } from '../src/model/mushroom.js';
import { buildDisplayList } from '../src/render/build.js';
import { PLATE_AREA } from '../src/render/plate.js';
import { layout } from '../src/render/layout.js';

function makeScene(seed = 'golden-1') {
  const palette = getPalette('paper');
  return {
    mode: 'plate',
    seed,
    palette,
    shape: buildMushroom({ seed, palette }),
    camera: { yaw: -0.32, pitch: 0.18 },
  };
}

const view = layout({ width: 900, height: 900, dpr: 1 });

test('display list детерминирован', () => {
  const scene = makeScene();

  assert.equal(
    JSON.stringify(buildDisplayList(scene, view)),
    JSON.stringify(buildDisplayList(scene, view)),
  );
});

test('разные сиды дают разные картинки', () => {
  const a = buildDisplayList(makeScene('golden-1'), view);
  const b = buildDisplayList(makeScene('golden-2'), view);

  assert.notEqual(JSON.stringify(a.items), JSON.stringify(b.items));
});

test('сцена вписана в область плашки', () => {
  const list = buildDisplayList(makeScene(), view);
  const margin = 1;

  for (const item of list.items) {
    for (const [x, y] of item.pts) {
      assert.ok(x >= PLATE_AREA.x - margin, `x ${x} слева`);
      assert.ok(x <= PLATE_AREA.x + PLATE_AREA.width + margin, `x ${x} справа`);
      assert.ok(y >= PLATE_AREA.y - margin, `y ${y} сверху`);
      assert.ok(y <= PLATE_AREA.y + PLATE_AREA.height + margin, `y ${y} снизу`);
    }
  }
});

test('слои идут по порядку: ножка → шляпка → пятна', () => {
  const list = buildDisplayList(makeScene(), view);
  const layers = list.items.map((item) => item.layer);

  for (let i = 1; i < layers.length; i++) {
    assert.ok(layers[i] >= layers[i - 1]);
  }

  assert.equal(layers[0], 0);
  assert.equal(layers[layers.length - 1], 2);
});

test('внутри слоя сортировка по глубине', () => {
  const list = buildDisplayList(makeScene(), view);
  let start = 0;

  while (start < list.items.length) {
    let end = start + 1;
    while (end < list.items.length && list.items[end].layer === list.items[start].layer) end++;

    for (let i = start + 1; i < end; i++) {
      assert.ok(list.items[i].z >= list.items[i - 1].z);
    }
    start = end;
  }
});
