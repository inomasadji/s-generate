import { mixColor } from '../core/color.js';
import { createNoise } from '../core/noise.js';
import { getPalette } from '../core/palette.js';
import { range, rngStream } from '../core/rng.js';
import { buildTree } from './tree.js';

/**
 * Холм для плашки: три плана, трава на ближнем и одинокое дерево
 * для масштаба. Локальные координаты: x от −1 до 1, y от 0 до ~0.9.
 *
 * @param {{ seed?: string, palette?: import('../core/palette.js').Palette }} [options]
 */
export function buildHill(options = {}) {
  const { seed = 'demo', palette = getPalette('forest') } = options;
  const rng = rngStream(seed, 'hill');
  const noise = createNoise(rngStream(seed, 'hill-noise'));

  /** @type {Array<Record<string, unknown>>} */
  const polys = [];

  /**
   * @param {[number, number][]} points
   * @param {number[]} color
   * @param {number} layer
   * @param {boolean} [outline]
   */
  function push(points, color, layer, outline = false) {
    polys.push({
      pts: points.map(([x, y]) => [x, y, 0]),
      color,
      normal: [0, 0, 1],
      group: 'hill',
      layer,
      outline,
    });
  }

  const plans = [
    { baseY: 0.55, height: 0.22, offset: 0, color: palette.hillFar },
    { baseY: 0.34, height: 0.28, offset: 27, color: mixColor(palette.hillFar, palette.hillNear, 0.55) },
    { baseY: 0.12, height: 0.34, offset: 61, color: palette.hillNear },
  ];

  const ridges = [];

  for (const plan of plans) {
    const ridge = [];

    for (let x = -1.05; x <= 1.05; x += 0.08) {
      const value = noise.fbm2(x * 2.1 + plan.offset, plan.offset, { octaves: 3 });
      ridge.push([x, plan.baseY + plan.height * (0.5 + 0.5 * value)]);
    }

    ridges.push(ridge);
    push([...ridge, [1.05, -0.05], [-1.05, -0.05]], plan.color, 0);
  }

  // Трава на ближнем плане: короткие лезвия вдоль гребня.
  const near = ridges[ridges.length - 1];
  for (let i = 2; i < near.length - 2; i += 2) {
    const [x, y] = near[i];
    if (rng() < 0.35) continue;

    const height = range(rng, 0.02, 0.05);
    push(
      [[x - 0.008, y], [x + 0.008, y], [x + range(rng, -0.01, 0.01), y - height]],
      mixColor(palette.grass, palette.ink, 0.15),
      0,
    );
  }

  // Дерево на склоне: даёт масштаб и оживляет холм.
  const treeX = range(rng, 0.05, 0.45);
  const treeGround = sampleRidge(near, treeX);
  const tree = buildTree({
    seed: `${seed}:hill-tree`,
    palette,
    params: { height: range(rng, 0.5, 0.65), trunkRadius: 0.03, depth: 1, density: 1, foliage: 'round' },
  });
  const treeScale = range(rng, 0.55, 0.7);

  for (const poly of tree.polys) {
    polys.push({
      ...poly,
      pts: poly.pts.map(([x, y, z]) => [x * treeScale + treeX, y * treeScale + treeGround, z * treeScale]),
      layer: 1 + (poly.layer ?? 0),
    });
  }

  const bounds = {
    min: [-1.05, -0.05, 0],
    max: [1.05, Math.max(0.9, treeGround + 0.7 * treeScale), 0.2],
  };

  return { kind: 'hill', seed, polys, bounds };
}

/**
 * @param {number[][]} ridge
 * @param {number} x
 * @returns {number}
 */
function sampleRidge(ridge, x) {
  for (let i = 1; i < ridge.length; i++) {
    if (ridge[i][0] >= x) {
      const [x0, y0] = ridge[i - 1];
      const [x1, y1] = ridge[i];
      const t = x1 === x0 ? 0 : (x - x0) / (x1 - x0);
      return y0 + (y1 - y0) * t;
    }
  }
  return ridge[ridge.length - 1][1];
}
