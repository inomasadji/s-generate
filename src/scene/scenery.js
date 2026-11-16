import { mixColor } from '../core/color.js';
import { createNoise } from '../core/noise.js';
import { int, range, rngStream } from '../core/rng.js';

/** Линия горизонта в логических единицах. */
export const HORIZON = 420;

/**
 * @typedef {object} SceneryItem
 * @property {[number, number][]} pts экранные точки
 * @property {number[]} color RGB
 * @property {number} [alpha]
 * @property {number} layer полоса: солнце 0, горы 1, облака 2, холмы 3, трава 4
 * @property {number} [z]
 */

/** @param {number} cx @param {number} cy @param {number} radius @param {number} [sides] */
export function circlePolygon(cx, cy, radius, sides = 20) {
  return Array.from({ length: sides }, (_, index) => {
    const angle = (index / sides) * Math.PI * 2;
    return [cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius];
  });
}

/** @param {number} cx @param {number} cy @param {number} rx @param {number} ry */
export function ellipsePolygon(cx, cy, rx, ry, sides = 18) {
  return Array.from({ length: sides }, (_, index) => {
    const angle = (index / sides) * Math.PI * 2;
    return [cx + Math.cos(angle) * rx, cy + Math.sin(angle) * ry];
  });
}

/**
 * Небо и земля описываются фоном, а не полигонами: это единственное место,
 * где разрешены градиенты.
 *
 * @param {string} seed
 * @param {import('../core/palette.js').Palette} palette
 */
export function buildSky(seed, palette) {
  void seed;
  return {
    kind: 'sky',
    horizon: HORIZON,
    top: palette.skyTop,
    bottom: palette.skyBottom,
    groundTop: mixColor(palette.ground, palette.skyBottom, 0.22),
    groundBottom: mixColor(palette.ground, palette.ink, 0.1),
  };
}

/**
 * @param {string} seed
 * @param {import('../core/palette.js').Palette} palette
 * @returns {SceneryItem[]}
 */
export function buildSun(seed, palette) {
  const rng = rngStream(seed, 'sun');
  const x = range(rng, 500, 620);
  const y = range(rng, 90, 150);
  const radius = range(rng, 26, 36);

  return [
    { pts: circlePolygon(x, y, radius * 1.55, 24), color: palette.sun, alpha: 0.2, layer: 0 },
    { pts: circlePolygon(x, y, radius, 24), color: palette.sun, layer: 0 },
  ];
}

/**
 * Облако — несколько плоских кругов над общей линией, плюс тень снизу.
 *
 * @param {string} seed
 * @param {import('../core/palette.js').Palette} palette
 * @returns {SceneryItem[]}
 */
export function buildClouds(seed, palette) {
  const rng = rngStream(seed, 'clouds');
  const items = [];
  const count = int(rng, 3, 5);

  for (let cloud = 0; cloud < count; cloud++) {
    const scale = range(rng, 0.7, 1.35);
    const cx = range(rng, 80, 640);
    const cy = range(rng, 100, 230);
    const blobs = int(rng, 4, 7);
    const shadow = mixColor(palette.cloud, palette.muted, 0.28);

    // Тень чуть ниже и уже — облако читается объёмным даже без градиента.
    for (let i = 0; i < blobs; i++) {
      items.push({
        pts: circlePolygon(cx + range(rng, -46, 46) * scale, cy + range(rng, 2, 14) * scale, range(rng, 12, 24) * scale, 14),
        color: shadow,
        layer: 2,
      });
    }

    for (let i = 0; i < blobs; i++) {
      items.push({
        pts: circlePolygon(cx + range(rng, -46, 46) * scale, cy + range(rng, -10, 4) * scale, range(rng, 14, 28) * scale, 14),
        color: palette.cloud,
        layer: 2,
      });
    }
  }

  return items;
}

/**
 * Два горных плана: дальний — светлее и ниже, ближний — темнее, со снегом.
 * Грани не рисуем треугольниками: объём даёт разница планов и снеговые шапки.
 *
 * @param {string} seed
 * @param {import('../core/palette.js').Palette} palette
 * @returns {SceneryItem[]}
 */
export function buildMountains(seed, palette) {
  const rng = rngStream(seed, 'mountains');
  const items = [];

  const ranges = [
    {
      baseY: 440,
      minY: 292,
      maxY: 336,
      color: mixColor(palette.mountain, palette.skyBottom, 0.38),
      snowLine: 0,
    },
    {
      baseY: 470,
      minY: 318,
      maxY: 368,
      color: palette.mountain,
      snowLine: 362,
    },
  ];

  for (const plan of ranges) {
    const peaks = int(rng, 3, 5);
    const ridge = [[-40, plan.baseY]];
    const tops = [];

    for (let i = 0; i < peaks; i++) {
      const x = -20 + ((i + 0.5) / peaks) * 760 + range(rng, -26, 26);
      const y = range(rng, plan.minY, plan.maxY);
      const left = range(rng, 30, 52);
      const right = range(rng, 22, 40);

      tops.push([x, y]);
      ridge.push([x - left, Math.min(plan.baseY, y + range(rng, 20, 42))]);
      ridge.push([x, y]);
      ridge.push([x + right, Math.min(plan.baseY, y + range(rng, 18, 38))]);

      if (i < peaks - 1) {
        ridge.push([x + (760 / peaks) * range(rng, 0.35, 0.55), Math.min(plan.baseY, y + range(rng, 55, 90))]);
      }
    }

    ridge.push([760, plan.baseY]);
    items.push({
      pts: [...ridge, [760, plan.baseY + 24], [-40, plan.baseY + 24]],
      color: plan.color,
      layer: 1,
    });

    if (plan.snowLine <= 0) continue;

    for (const [x, y] of tops) {
      // Отвесные скалы: тёмные полосы от вершины к подножию.
      for (let cliff = 0; cliff < 1; cliff++) {
        const cx = x + range(rng, -20, 20);
        const topY = y + (plan.baseY - y) * range(rng, 0.15, 0.4);
        items.push({
          pts: [
            [cx - 4, topY],
            [cx + 5, topY - 3],
            [cx + 8, plan.baseY],
            [cx - 2, plan.baseY],
          ],
          color: mixColor(palette.mountainShade, palette.ink, 0.12),
          layer: 1,
        });
      }

      if (y >= plan.snowLine) continue;
      const width = (plan.snowLine - y) * 0.8;
      const tongue = (plan.snowLine - y) * 0.45;
      items.push({
        pts: [
          [x, y],
          [x + width, plan.snowLine],
          [x + width * 0.4, plan.snowLine + tongue * 0.5],
          [x + width * 0.2, plan.snowLine - 3],
          [x - width * 0.05, plan.snowLine + tongue],
          [x - width * 0.25, plan.snowLine - 2],
          [x - width * 0.9, plan.snowLine],
        ],
        color: palette.snow,
        layer: 1,
      });
    }
  }

  return items;
}

/**
 * Дымка у подножия: несколько полупрозрачных полос между холмами и травой.
 *
 * @param {string} seed
 * @param {import('../core/palette.js').Palette} palette
 * @returns {SceneryItem[]}
 */
export function buildMist(seed, palette) {
  const rng = rngStream(seed, 'mist');
  const items = [];

  for (let i = 0; i < 2; i++) {
    const y = range(rng, 360, 462);
    const height = range(rng, 8, 18);

    items.push({
      pts: [[-20, y], [740, y + range(rng, -6, 6)], [740, y + height], [-20, y + height]],
      color: mixColor(palette.cloud, palette.skyBottom, 0.35),
      alpha: range(rng, 0.08, 0.16),
      layer: 3.5,
    });
  }

  return items;
}

/**
 * Холмы: три плана из 1D-фрактального шума, каждый светлее к горизонту.
 *
 * @param {string} seed
 * @param {import('../core/palette.js').Palette} palette
 * @returns {SceneryItem[]}
 */
export function buildHills(seed, palette) {
  const noise = createNoise(rngStream(seed, 'hills'));
  const items = [];

  const plans = [
    { baseY: 470, height: 36, color: palette.hillFar, offset: 0, step: 16 },
    { baseY: 492, height: 48, color: mixColor(palette.hillFar, palette.hillNear, 0.55), offset: 31, step: 14 },
    { baseY: 516, height: 56, color: palette.hillNear, offset: 67, step: 12 },
  ];

  for (const plan of plans) {
    const ridge = [];

    for (let x = -20; x <= 740; x += plan.step) {
      const value = noise.fbm2(x * 0.0045 + plan.offset, plan.offset, { octaves: 3 });
      ridge.push([x, plan.baseY - plan.height * (0.5 + 0.5 * value)]);
    }

    items.push({
      pts: [...ridge, [740, 760], [-20, 760]],
      color: plan.color,
      layer: 3,
    });
  }

  return items;
}

/**
 * Травинки на земле: три треугольных лезвия в кустике.
 *
 * @param {string} seed
 * @param {import('../core/palette.js').Palette} palette
 * @returns {SceneryItem[]}
 */
export function buildGrass(seed, palette) {
  const rng = rngStream(seed, 'grass');
  const items = [];
  const color = mixColor(palette.grass, palette.ground, 0.25);
  const dark = mixColor(palette.grass, palette.ink, 0.16);
  const count = int(rng, 18, 28);

  for (let i = 0; i < count; i++) {
    const x = range(rng, 10, 710);
    const y = range(rng, 560, 712);
    const height = range(rng, 7, 16);
    const width = range(rng, 2.5, 5);

    for (let blade = 0; blade < 3; blade++) {
      const bx = x + (blade - 1) * width * 1.1;
      const lean = range(rng, -4, 4);
      items.push({
        pts: [[bx - width / 2, y], [bx + width / 2, y], [bx + lean, y - height]],
        color: blade === 1 ? dark : color,
        layer: 4,
      });
    }
  }

  return items;
}
