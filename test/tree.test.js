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

test('ствол кривого дерева не рвётся: вершины конечны', () => {
  for (const seed of ['rock', 'demo', 'aaa', 'ccc']) {
    const tree = buildTree({ seed, habit: 'crooked' });

    for (const poly of tree.polys) {
      for (const point of poly.pts) {
        for (const value of point) {
          assert.ok(Number.isFinite(value), `${seed}: ${value}`);
        }
      }
    }
  }
});

test('хвойные силуэты различаются и не обрастают листьями', () => {
  const trees = ['spruce', 'fir', 'pine'].map((conifer) =>
    buildTree({ seed: 'conifer', params: { conifer, height: 1.5 } }));

  for (const tree of trees) {
    assert.equal(tree.foliage, 'conical');
    assert.equal(
      tree.polys.filter((poly) => poly.group === 'foliage' && poly.pts.length === 3).length,
      0,
      'у хвои не должно быть широких листьев',
    );
  }

  assert.notEqual(JSON.stringify(trees[0]), JSON.stringify(trees[1]));
  assert.notEqual(JSON.stringify(trees[1]), JSON.stringify(trees[2]));

  const width = (tree) => tree.bounds.max[0] - tree.bounds.min[0];
  assert.ok(width(trees[0]) < width(trees[1]), 'ель уже пихты');
});

test('у лиственного дерева есть узлы листьев', () => {
  const tree = buildTree({ seed: 'oak-3', params: { foliage: 'round', detail: 1 } });
  const leaves = tree.polys.filter((poly) => poly.group === 'foliage' && poly.pts.length === 3);

  assert.ok(leaves.length > 20, `листьев всего ${leaves.length}`);
  assert.ok(leaves.every((leaf) => leaf.color.length === 3));
});

test('все цвета дерева валидны', () => {
  const tree = buildTree({ seed: 'tree-colors' });

  for (const poly of tree.polys) {
    for (const channel of poly.color) {
      assert.ok(Number.isInteger(channel) && channel >= 0 && channel <= 255);
    }
  }
});
