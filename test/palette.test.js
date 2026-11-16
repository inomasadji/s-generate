import test from 'node:test';
import assert from 'node:assert/strict';

import { css, getPalette } from '../src/core/palette.js';

test('во всех темах каждый тон — три канала 0..255', () => {
  const palette = getPalette('paper');

  for (const [name, rgb] of Object.entries(palette)) {
    assert.equal(rgb.length, 3, `${name}: должно быть три канала`);
    for (const channel of rgb) {
      assert.ok(Number.isInteger(channel), `${name}: канал не целый`);
      assert.ok(channel >= 0 && channel <= 255, `${name}: канал вне диапазона`);
    }
  }
});

test('неизвестная тема падает на paper, а не ломает экран', () => {
  assert.deepEqual(getPalette('no-such-theme'), getPalette('paper'));
});

test('css квантует каналы и собирает rgb/rgba', () => {
  assert.equal(css([1, 2, 3]), 'rgb(1, 2, 3)');
  assert.equal(css([1, 2, 3], 0.5), 'rgba(1, 2, 3, 0.5)');
  assert.equal(css([300, -4, 3.6]), 'rgb(255, 0, 4)');
});
