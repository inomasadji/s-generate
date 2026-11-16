import { mixColor } from '../core/color.js';
import { getPalette } from '../core/palette.js';
import { int, range, rngStream } from '../core/rng.js';

/**
 * Гора для плашки: два хребта, снеговые шапки, теневые склоны и осыпь.
 * Локальные координаты: x от −1 до 1, y от 0 до 1.
 *
 * @param {{ seed?: string, palette?: import('../core/palette.js').Palette }} [options]
 */
export function buildMountain(options = {}) {
  const { seed = 'demo', palette = getPalette('alpine') } = options;
  const rng = rngStream(seed, 'mountain');

  /** @type {Array<Record<string, unknown>>} */
  const polys = [];

  /**
   * @param {[number, number][]} points
   * @param {number[]} color
   * @param {string} group
   * @param {boolean} [outline]
   */
  function push(points, color, group, outline = true) {
    polys.push({
      pts: points.map(([x, y]) => [x, y, 0]),
      color,
      normal: [0, 0, 1],
      group,
      layer: 0,
      outline,
    });
  }

  /**
   * @param {number} count
   * @param {number} minY
   * @param {number} maxY
   */
  function makeRidge(count, minY, maxY) {
    const points = [[-1.05, 0]];
    const tops = [];

    for (let i = 0; i < count; i++) {
      const x = -0.9 + ((i + 0.5) / count) * 1.8 + range(rng, -0.08, 0.08);
      const y = range(rng, minY, maxY);
      tops.push([x, y]);
      points.push([x - range(rng, 0.18, 0.3), y * range(rng, 0.35, 0.55)]);
      points.push([x, y]);
      points.push([x + range(rng, 0.16, 0.28), y * range(rng, 0.3, 0.5)]);
    }

    points.push([1.05, 0]);
    return { points, tops };
  }

  const back = makeRidge(int(rng, 3, 4), 0.45, 0.72);
  push(
    [...back.points, [1.05, 0.02], [-1.05, 0.02]],
    mixColor(palette.mountain, palette.skyBottom, 0.42),
    'mountain-back',
  );

  const front = makeRidge(int(rng, 2, 4), 0.58, 0.95);
  push(front.points, palette.mountain, 'mountain');

  // Теневые склоны: от вершины к подножию, а не «парусом» в воздухе.
  for (const [x, y] of front.tops) {
    push(
      [[x, y], [x + range(rng, 0.1, 0.18), 0], [x + 0.02, 0]],
      mixColor(palette.mountain, palette.mountainShade, 0.8),
      'mountain-shade',
    );
  }

  // Снег: только на вершинах выше линии.
  const snowLine = range(rng, 0.6, 0.7);

  for (const [x, y] of front.tops) {
    if (y <= snowLine) continue;
    const width = (y - snowLine) * 0.95 + 0.05;
    push(
      [
        [x, y],
        [x + width, snowLine],
        [x + width * 0.45, snowLine - 0.035],
        [x - width * 0.3, snowLine],
        [x - width * 0.85, snowLine - 0.02],
      ],
      palette.snow,
      'snow',
      false,
    );
  }

  // Осыпь у подножия — передний план горы.
  push(
    [[-1.05, 0], [1.05, 0], [1.05, 0.08], [0.4, 0.11], [-0.5, 0.09], [-1.05, 0.06]],
    mixColor(palette.mountainShade, palette.ground, 0.4),
    'scree',
    false,
  );

  const bounds = { min: [-1.05, 0, 0], max: [1.05, 1, 0] };
  return { kind: 'mountain', seed, polys, bounds };
}
