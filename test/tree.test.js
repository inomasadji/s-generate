import test from 'node:test';
import assert from 'node:assert/strict';

import { buildShrub, buildTree } from '../src/model/tree.js';

test('дерево детерминировано', () => {
  const a = buildTree({ seed: 'tree-1' });
  const b = buildTree({ seed: 'tree-1' });
  const c = buildTree({ seed: 'tree-2' });

  assert.equal(JSON.stringify(a), JSON.stringify(b));
  assert.notEqual(JSON.stringify(a), JSON.stringify(c));
});

test('у дерева есть ствол и листва', () => {
  const tree = buildTree({ seed: 'tree-1' });
  const groups = new Set(tree.polys.map((poly) => poly.group));

  assert.ok(tree.polys.length > 150, `мало полигонов: ${tree.polys.length}`);
  assert.ok(groups.has('wood'));
  assert.ok(groups.has('foliage'));
  assert.ok(tree.polys.some((poly) => poly.outline === false), 'листва без контура');
});

test('кустарник ниже дерева и состоит из нескольких стволов', () => {
  const shrub = buildShrub({ seed: 'bush-1' });
  const tree = buildTree({ seed: 'tree-1' });

  assert.ok((shrub.bounds.max[1] - shrub.bounds.min[1]) < (tree.bounds.max[1] - tree.bounds.min[1]));
  assert.ok(shrub.polys.length > 100);
});

test('все цвета дерева валидны', () => {
  const tree = buildTree({ seed: 'tree-colors' });

  for (const poly of tree.polys) {
    for (const channel of poly.color) {
      assert.ok(Number.isInteger(channel) && channel >= 0 && channel <= 255);
    }
  }
});
