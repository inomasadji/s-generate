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
  function push(points, color, group, outline = true, alpha = 1) {
    polys.push({
      pts: points.map(([x, y]) => [x, y, 0]),
      color,
      normal: [0, 0, 1],
      group,
      layer: 0,
      outline,
      alpha,
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
      const left = range(rng, 0.16, 0.32);
      const right = range(rng, 0.1, 0.22);

      tops.push([x, y]);
      points.push([x - left, y * range(rng, 0.16, 0.38)]);
      points.push([x, y]);
      points.push([x + right, y * range(rng, 0.12, 0.3)]);

      // Седловина к следующей вершине: хребет перестаёт быть пилой.
      if (i < count - 1) {
        const saddle = x + (1.8 / count) * range(rng, 0.35, 0.55);
        points.push([saddle, range(rng, 0.12, 0.3)]);
      }
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

    // Отвесные скалы: узкие тёмные полосы в теле горы.
    for (let cliff = 0; cliff < 1; cliff++) {
      const cx = x + range(rng, -0.12, 0.12);
      const top = y * range(rng, 0.5, 0.82);
      push(
        [
          [cx - 0.016, top],
          [cx + 0.02, top * 0.96],
          [cx + 0.036, 0],
          [cx - 0.006, 0],
        ],
        mixColor(palette.mountainShade, palette.ink, 0.14),
        'cliff',
        false,
      );
    }
  }

  // Снег: только на вершинах выше линии.
  const snowLine = range(rng, 0.6, 0.7);

  for (const [x, y] of front.tops) {
    if (y <= snowLine) continue;
    const width = (y - snowLine) * 1.05 + 0.06;
    const tongue = (y - snowLine) * 0.5;
    push(
      [
        [x, y],
        [x + width, snowLine],
        [x + width * 0.35, snowLine + tongue * 0.45],
        [x - width * 0.1, snowLine + tongue],
        [x - width * 0.45, snowLine + tongue * 0.35],
        [x - width, snowLine],
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

  // Дымка у подножия: гора уходит в холодную мглу, а не стоит на линейке.
  push(
    [[-1.05, 0.02], [1.05, 0.01], [1.05, 0.2], [-1.05, 0.23]],
    mixColor(palette.skyBottom, palette.snow, 0.3),
    'mist',
    false,
    0.16,
  );
  push(
    [[-1.05, 0.16], [1.05, 0.14], [1.05, 0.3], [-1.05, 0.33]],
    mixColor(palette.skyBottom, palette.snow, 0.2),
    'mist',
    false,
    0.1,
  );

  const bounds = { min: [-1.05, 0, 0], max: [1.05, 1, 0] };
  return { kind: 'mountain', seed, polys, bounds };
}
