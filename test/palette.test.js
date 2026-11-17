import test from 'node:test';
import assert from 'node:assert/strict';

import { PALETTES, PALETTE_IDS, css, getPalette, seasonOf } from '../src/core/palette.js';

/** Относительная яркость по WCAG: нужна, чтобы тёмные темы не теряли подпись. */
function luminance([r, g, b]) {
  const channel = (value) => {
    const v = value / 255;
    return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

function contrast(a, b) {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (light + 0.05) / (dark + 0.05);
}

test('во всех темах одинаковый набор тонов', () => {
  const names = Object.keys(getPalette('paper')).sort();

  for (const themeName of Object.keys(PALETTES)) {
    const palette = getPalette(themeName);
    assert.deepEqual(Object.keys(palette).sort(), names, themeName);
  }
});

test('в интерфейсе перечислены все темы и только они', () => {
  assert.deepEqual([...PALETTE_IDS].sort(), Object.keys(PALETTES).sort());
  assert.equal(new Set(PALETTE_IDS).size, PALETTE_IDS.length, 'тема указана дважды');
});

test('в каждой теме каждый тон — три канала 0..255', () => {
  for (const [themeName, palette] of Object.entries(PALETTES)) {
    for (const [name, rgb] of Object.entries(palette)) {
      assert.equal(rgb.length, 3, `${themeName}.${name}: должно быть три канала`);
      for (const channel of rgb) {
        assert.ok(Number.isInteger(channel), `${themeName}.${name}: канал не целый`);
        assert.ok(channel >= 0 && channel <= 255, `${themeName}.${name}: канал вне диапазона`);
      }
    }
  }
});

test('базовых тонов не больше 24 на тему', () => {
  for (const [themeName, palette] of Object.entries(PALETTES)) {
    assert.ok(Object.keys(palette).length <= 24, `${themeName}: тонов больше 24`);
  }
});

test('у каждой темы есть сезон', () => {
  for (const themeName of PALETTE_IDS) {
    assert.match(
      seasonOf(PALETTES[themeName]),
      /^(spring|summer|autumn|winter)$/,
      themeName,
    );
  }
});

test('подпись и рамка читаются на бумаге каждой темы', () => {
  for (const [themeName, palette] of Object.entries(PALETTES)) {
    const ratio = contrast(palette.ink, palette.paper);
    assert.ok(ratio >= 4.5, `${themeName}: контраст ink/paper всего ${ratio.toFixed(1)}`);
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
