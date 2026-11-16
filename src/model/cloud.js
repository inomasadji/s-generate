import { mixColor } from '../core/color.js';
import { getPalette } from '../core/palette.js';
import { int, range, rngStream } from '../core/rng.js';

/**
 * Облако для плашки: большая туча и два小 компаньона, тень снизу,
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
   * @param {number} cx
   * @param {number} cy
   * @param {number} scale
   * @param {number} blobs
   */
  function cloud(cx, cy, scale, blobs) {
    const shadow = mixColor(palette.cloud, palette.muted, 0.35);

    // Одни и те же пуфы дают и тень, и тело: иначе тень «уезжает» в сторону.
    const puffs = Array.from({ length: blobs }, () => ({
      x: cx + range(rng, -0.22, 0.22) * scale,
      y: cy + range(rng, -0.02, 0.16) * scale,
      radius: range(rng, 0.14, 0.26) * scale,
    }));

    for (const item of puffs) {
      puff(item.x, item.y - 0.06 * scale, item.radius * 0.98, shadow, 0);
    }
    for (const item of puffs) {
      puff(item.x, item.y, item.radius, palette.cloud, 1);
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
