import test from 'node:test';
import assert from 'node:assert/strict';

import { LOGICAL_SIZE, layout } from '../src/render/layout.js';

test('квадратное окно: сцена занимает всю площадь', () => {
  const view = layout({ width: 1000, height: 1000, dpr: 1 });

  assert.equal(view.scale, 1000 / LOGICAL_SIZE);
  assert.equal(view.originX, 0);
  assert.equal(view.originY, 0);
  assert.equal(view.pixelWidth, 1000);
  assert.equal(view.pixelHeight, 1000);
});

test('широкое окно: сцена по центру, поля по бокам', () => {
  const view = layout({ width: 800, height: 600, dpr: 2 });

  assert.equal(view.cssWidth, 800);
  assert.equal(view.cssHeight, 600);
  assert.equal(view.pixelWidth, 1600);
  assert.equal(view.pixelHeight, 1200);
  assert.equal(view.side, 600);
  assert.equal(view.scale, 600 / LOGICAL_SIZE);
  assert.equal(view.originX, 100);
  assert.equal(view.originY, 0);
});

test('геометрия не зависит от devicePixelRatio', () => {
  const base = layout({ width: 1234, height: 777, dpr: 1 });
  const retina = layout({ width: 1234, height: 777, dpr: 3 });

  assert.equal(base.scale, retina.scale);
  assert.equal(base.originX, retina.originX);
  assert.equal(base.originY, retina.originY);
  assert.equal(retina.pixelWidth, 3702);
  assert.equal(retina.pixelHeight, 2331);
});
