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
   * @param {number} [alpha]
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
   * Хребет из неравных гор: у каждой вершины своя ширина основания, крутизна
   * склонов и высота, одна вершина — главная. Так хребет не выглядит рядом
   * одинаковых треугольников.
   *
   * @param {number} count
   * @param {number} minY
   * @param {number} maxY
   */
  function makeRidge(count, minY, maxY) {
    const points = [[-1.05, 0]];
    const tops = [];

    const weights = Array.from({ length: count }, () => range(rng, 0.45, 1.9));
    const total = weights.reduce((sum, value) => sum + value, 0);

    const peaks = [];
    let cursor = -1.05;

    for (let i = 0; i < count; i++) {
      const share = (weights[i] / total) * 2.1;
      peaks.push({
        x: cursor + share / 2,
        y: range(rng, minY, maxY),
      });
      cursor += share;
    }

    // Без главной вершины хребет похож на расчёску.
    const main = int(rng, 0, count - 1);
    peaks[main].y = Math.max(peaks[main].y, range(rng, maxY * 0.85, maxY));
    for (let i = 0; i < count; i++) {
      if (i !== main) peaks[i].y *= range(rng, 0.6, 0.85);
    }

    for (let i = 0; i < count; i++) {
      const peak = peaks[i];
      // Соседние вершины делят хребет пополам: граница — будущая седловина.
      const leftBound = i === 0 ? -1.05 : (peaks[i - 1].x + peak.x) / 2;
      const rightBound = i === count - 1 ? 1.05 : (peak.x + peaks[i + 1].x) / 2;

      if (i > 0) points.push([leftBound, range(rng, 0.1, 0.28)]);

      // Ширина основания — доля расстояния до соседа: у одной вершины
      // склон почти отвесный, у другой — пологий.
      const leftX = peak.x - (peak.x - leftBound) * range(rng, 0.35, 0.95);
      const rightX = peak.x + (rightBound - peak.x) * range(rng, 0.35, 0.95);

      points.push([leftX, peak.y * range(rng, 0.14, 0.34)]);
      points.push([peak.x, peak.y]);
      points.push([rightX, peak.y * range(rng, 0.1, 0.3)]);

      // Индексы плеч нужны снегу: он должен лежать на склонах, а не в воздухе.
      tops.push({ x: peak.x, y: peak.y, left: points.length - 3, right: points.length - 1 });
    }

    points.push([1.05, 0]);
    return { points, tops };
  }

  /**
   * Точка на отрезке «вершина → плечо», где склон пересекает снеговую линию.
   *
   * @param {[number, number]} peak
   * @param {[number, number]} shoulder
   * @param {number} lineY
   * @returns {[number, number] | null}
   */
  function snowEdge(peak, shoulder, lineY) {
    const dy = shoulder[1] - peak[1];
    if (Math.abs(dy) < 1e-6) return null;

    const t = (lineY - peak[1]) / dy;
    if (t <= 0 || t >= 1) return null;

    return [peak[0] + (shoulder[0] - peak[0]) * t, lineY];
  }

  const back = makeRidge(int(rng, 3, 4), 0.42, 0.72);
  push(
    [...back.points, [1.05, 0.02], [-1.05, 0.02]],
    mixColor(palette.mountain, palette.skyBottom, 0.32),
    'mountain-back',
  );

  const front = makeRidge(int(rng, 2, 3), 0.55, 1);
  push(front.points, palette.mountain, 'mountain');

  // Теневые склоны: правый склон каждой вершины уходит в тень, свет — слева.
  for (const top of front.tops) {
    const shoulderX = front.points[top.right][0];
    push(
      [
        [top.x, top.y],
        [Math.max(top.x + 0.04, shoulderX), 0],
        [top.x + 0.015, 0],
      ],
      mixColor(palette.mountain, palette.mountainShade, 0.8),
      'mountain-shade',
    );

    // Скальные выходы: низкие широкие пятна у подножия. Узкие полосы во всю
    // высоту читались как столбы, а не как скалы.
    const patches = int(rng, 1, 2);
    for (let i = 0; i < patches; i++) {
      const cx = top.x + range(rng, -0.18, 0.06);
      const base = top.y * range(rng, 0.03, 0.1);
      const rockHeight = top.y * range(rng, 0.1, 0.2);
      const width = range(rng, 0.05, 0.1);
      const drift = range(rng, -0.04, 0.04);

      push(
        [
          [cx - width, base + rockHeight * 0.3],
          [cx - width * 0.5, base + rockHeight],
          [cx + width * 0.1, base + rockHeight * 0.9],
          [cx + width + drift, base + rockHeight * 0.2],
          [cx + width * 0.2, base],
        ],
        mixColor(palette.mountainShade, palette.ink, 0.18),
        'cliff',
        false,
      );
    }
  }

  // Снег: только на вершинах выше линии, кромка идёт по склонам, языки — внутрь
  // горы. Раньше шапка строилась от ширины самой себя и висела в воздухе.
  const snowLine = range(rng, 0.58, 0.72);

  for (const top of front.tops) {
    if (top.y <= snowLine + 0.05) continue;

    const left = snowEdge([top.x, top.y], front.points[top.left], snowLine);
    const right = snowEdge([top.x, top.y], front.points[top.right], snowLine);
    if (!left || !right || left[0] >= right[0]) continue;

    const bottom = [];
    const points = int(rng, 5, 8);
    const depth = (top.y - snowLine) * 0.22;
    for (let i = 1; i < points; i++) {
      const f = i / points;
      const x = right[0] + (left[0] - right[0]) * f;
      // Зубчатая кромка: глубокие языки чередуются с мелкими, иначе шапка
      // выглядит белым шаром на вершине.
      const dip = depth * (i % 2 === 0 ? range(rng, 0.7, 1) : range(rng, 0.15, 0.4));
      bottom.push([x, snowLine - dip]);
    }

    push([[top.x, top.y], right, ...bottom, left], palette.snow, 'snow', false);
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
