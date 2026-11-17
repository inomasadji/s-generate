import test from 'node:test';
import assert from 'node:assert/strict';

import { PALETTE_IDS } from '../src/core/palette.js';
import { MUSHROOM_SHAPES } from '../src/model/mushroom.js';
import { TREE_HABITS } from '../src/model/tree.js';
import { rollVariant } from '../src/scene/randomize.js';
import { SPECIMEN_KINDS } from '../src/scene/specimen.js';

const BASE = Object.freeze({
  seed: 'demo',
  mode: 'plate',
  kind: 'mushroom',
  palette: 'paper',
  shape: 'classic',
  habit: 'upright',
});

test('бросок воспроизводим и не меняет вход', () => {
  const first = rollVariant(BASE);
  const second = rollVariant(BASE);

  assert.deepEqual(first, second);
  assert.equal(BASE.seed, 'demo');
  assert.notEqual(first.seed, 'demo');
  assert.notEqual(first.seed, BASE.seed);
});

test('бросок укладывается в допустимые значения', () => {
  let current = BASE;
  const seenKinds = new Set();

  for (let i = 0; i < 200; i++) {
    current = rollVariant(current);

    assert.ok(SPECIMEN_KINDS.includes(current.kind), `чужой род: ${current.kind}`);
    assert.ok(PALETTE_IDS.includes(current.palette), `чужая палитра: ${current.palette}`);
    assert.equal(current.mode, 'plate');

    if (current.kind === 'mushroom') {
      assert.ok(MUSHROOM_SHAPES.includes(current.shape), `чужая форма: ${current.shape}`);
    } else {
      assert.equal(current.shape, undefined, 'форма осталась не от гриба');
    }

    if (current.kind === 'tree') {
      assert.ok(TREE_HABITS.includes(current.habit), `чужой характер: ${current.habit}`);
    } else {
      assert.equal(current.habit, undefined, 'характер остался не от дерева');
    }

    seenKinds.add(current.kind);
  }

  // «Случайно» должно дотягиваться до всех родов, а не крутиться около гриба.
  assert.deepEqual([...seenKinds].sort(), [...SPECIMEN_KINDS].sort());
});

test('в сцене бросок не трогает невидимые параметры', () => {
  const scene = Object.freeze({
    seed: 'demo',
    mode: 'scene',
    kind: 'hill',
    palette: 'forest',
    shape: undefined,
    habit: undefined,
  });

  const next = rollVariant(scene);

  assert.equal(next.mode, 'scene');
  assert.equal(next.kind, 'hill');
  assert.equal(next.shape, undefined);
  assert.equal(next.habit, undefined);
  assert.notEqual(next.seed, scene.seed);
  assert.ok(PALETTE_IDS.includes(next.palette));
});

test('два броска подряд дают разные сочетания', () => {
  const first = rollVariant(BASE);
  const second = rollVariant(first);

  assert.notEqual(first.seed, second.seed);
  assert.notDeepEqual(
    [first.kind, first.palette, first.shape ?? '', first.habit ?? ''],
    [second.kind, second.palette, second.shape ?? '', second.habit ?? ''],
  );
});
