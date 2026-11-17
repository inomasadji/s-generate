import { mixColor } from '../core/color.js';
import { getPalette } from '../core/palette.js';
import { int, range, rngStream } from '../core/rng.js';

/**
 * Облако для плашки: большая туча и два компаньона, тень снизу,
 * блики сверху. Локальные координаты: x от −1 до 1.
 *
 * @param {{ seed?: string, palette?: import('../core/palette.js').Palette }} [options]
 */
export function buildCloud(options = {}) {
  const { seed = 'demo', palette = getPalette('paper') } = options;
  const rng = rngStream(seed, 'cloud');

  /** @type {Array<Record<string, unknown>>} */
  const polys = [];

  /**
   * @param {number} cx
   * @param {number} cy
   * @param {number} radius
   * @param {number[]} color
   * @param {number} layer
   */
  function puff(cx, cy, radius, color, layer) {
    const sides = 14;
    polys.push({
      pts: Array.from({ length: sides }, (_, index) => {
        const angle = (index / sides) * Math.PI * 2;
        return [cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius * 0.78, 0];
      }),
      color,
      normal: [0, 0, 1],
      group: 'cloud',
      layer,
      outline: false,
    });
  }

  /**
   * Светлая кромка по верхней дуге пуфа: тонкий серп, а не круглый блик.
   *
   * @param {number} cx
   * @param {number} cy
   * @param {number} radius
   * @param {number[]} color
   */
  function rim(cx, cy, radius, color) {
    const steps = 8;
    const pts = [];

    for (let i = 0; i <= steps; i++) {
      const angle = Math.PI * (0.16 + 0.68 * (i / steps));
      pts.push([cx + Math.cos(angle) * radius * 0.92, cy + Math.sin(angle) * radius * 0.72]);
    }
    for (let i = steps; i >= 0; i--) {
      const angle = Math.PI * (0.16 + 0.68 * (i / steps));
      pts.push([cx + Math.cos(angle) * radius * 0.68, cy + Math.sin(angle) * radius * 0.53]);
    }

    polys.push({
      pts: pts.map(([x, y]) => [x, y, 0]),
      color,
      normal: [0, 0, 1],
      group: 'cloud',
      layer: 2,
      outline: false,
    });
  }

  /**
   * @param {number} cx
   * @param {number} cy
   * @param {number} scale
   * @param {number} blobs
   */
  function cloud(cx, cy, scale, blobs) {
    const shadow = mixColor(palette.cloud, palette.muted, 0.38);
    const mid = mixColor(palette.cloud, palette.muted, 0.16);
    const light = mixColor(palette.cloud, palette.snow, 0.5);

    // Одни и те же пуфы дают тень, тело и блик: иначе слои «уезжают» в сторону.
    const puffs = Array.from({ length: blobs }, () => ({
      x: cx + range(rng, -0.22, 0.22) * scale,
      y: cy + range(rng, -0.02, 0.16) * scale,
      radius: range(rng, 0.14, 0.26) * scale,
    }));

    // Три тона вместо двух: тень снизу, средний тон и тело. Плоское облако
    // из двух пятен читалось как наклейка.
    for (const item of puffs) {
      puff(item.x, item.y - 0.07 * scale, item.radius * 0.98, shadow, 0);
    }
    for (const item of puffs) {
      puff(item.x, item.y - 0.025 * scale, item.radius, mid, 0.5);
    }
    for (const item of puffs) {
      puff(item.x, item.y, item.radius, palette.cloud, 1);
    }

    // Блики на верхних пуфах: тонкая кромка сверху-слева, а не круглые пятна.
    const lit = [...puffs].sort((a, b) => b.y - a.y).slice(0, 2);
    for (const item of lit) {
      rim(item.x, item.y, item.radius, light);
    }
  }

  cloud(0, 0.08, 1, int(rng, 5, 7));
  cloud(range(rng, -0.62, -0.5), -0.16, 0.5, 5);
  cloud(range(rng, 0.5, 0.62), -0.2, 0.5, 5);

  const bounds = boundsOf(polys);
  return { kind: 'cloud', seed, polys, bounds };
}

/**
 * @param {Array<{ pts: number[][] }>} polys
 */
function boundsOf(polys) {
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];

  for (const poly of polys) {
    for (const point of poly.pts) {
      for (let axis = 0; axis < 3; axis++) {
        min[axis] = Math.min(min[axis], point[axis]);
        max[axis] = Math.max(max[axis], point[axis]);
      }
    }
  }

  return { min, max };
}
