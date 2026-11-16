import test from 'node:test';
import assert from 'node:assert/strict';

import { getPalette } from '../src/core/palette.js';
import { buildDisplayList } from '../src/render/build.js';
import { layout } from '../src/render/layout.js';
import { PLATE_AREA } from '../src/render/plate.js';
import { SPECIMEN_KINDS, buildSpecimen } from '../src/scene/specimen.js';

const palette = getPalette('paper');
const view = layout({ width: 900, height: 900, dpr: 1 });

for (const kind of SPECIMEN_KINDS) {
  test(`плашка «${kind}»: детерминизм, имя и вписывание`, () => {
    const scene = buildSpecimen({ kind, seed: `specimen-${kind}`, palette });
    const again = buildSpecimen({ kind, seed: `specimen-${kind}`, palette });

    assert.equal(JSON.stringify(scene), JSON.stringify(again));
    assert.equal(scene.kind, kind);
    assert.ok(scene.shape.polys.length > 0);
    assert.ok(scene.name.full.length > 2);

    const list = buildDisplayList(scene, view);
    assert.equal(list.overlay.title, scene.name.full);

    for (const item of list.items) {
      for (const [x, y] of item.pts) {
        assert.ok(x >= PLATE_AREA.x - 1 && x <= PLATE_AREA.x + PLATE_AREA.width + 1, `x=${x}`);
        assert.ok(y >= PLATE_AREA.y - 1 && y <= PLATE_AREA.y + PLATE_AREA.height + 1, `y=${y}`);
      }
    }
  });
}

test('у каждого рода своя школа имён', () => {
  const hill = buildSpecimen({ kind: 'hill', seed: 'school', palette });
  const mountain = buildSpecimen({ kind: 'mountain', seed: 'school', palette });
  const cloud = buildSpecimen({ kind: 'cloud', seed: 'school', palette });

  assert.match(hill.name.full, /[А-ЯЁ]/);
  assert.match(mountain.name.full, /^[A-Z]/);
  assert.match(cloud.name.full, /^[A-Z][a-z]+ [A-Z]/);
});

test('неизвестный род падает на гриб', () => {
  const scene = buildSpecimen({ kind: 'dragon', seed: 'x', palette });
  assert.equal(scene.kind, 'mushroom');
});
