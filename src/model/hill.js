import { mixColor, shadeColor } from '../core/color.js';
import { clamp, normalize } from '../core/math.js';
import { createNoise } from '../core/noise.js';
import { getPalette } from '../core/palette.js';
import { int, range, rngStream } from '../core/rng.js';
import { buildTree } from './tree.js';

/**
 * Холм для плашки: три плана, фасетный свет по склонам, светлый гребень,
 * трава на ближнем плане и два дерева — ближнее для масштаба, дальнее для
 * глубины. Локальные координаты: x от −1 до 1, y от 0 до ~0.9.
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
   * @param {number} [alpha]
   */
  function push(points, color, layer, outline = false, alpha = 1) {
    polys.push({
      pts: points.map(([x, y]) => [x, y, 0]),
      color,
      normal: [0, 0, 1],
      group: 'hill',
      layer,
      outline,
      alpha,
    });
  }

  /**
   * Гребень плана: широкий купол плюс шум по кромке. Без купола три плана
   * читались как три ровные полосы, а не как холмы.
   *
   * @param {{ baseY: number, height: number, offset: number,
   *           centerX: number, sigma: number }} plan
   * @returns {[number, number][]}
   */
  function ridgeFor(plan) {
    const ridge = [];

    for (let x = -1.05; x <= 1.051; x += 0.06) {
      const dome = Math.exp(-((x - plan.centerX) ** 2) / (2 * plan.sigma ** 2));
      const rough = noise.fbm2(x * 2.3 + plan.offset, plan.offset, { octaves: 3 });
      ridge.push([x, plan.baseY + plan.height * (0.62 * dome + 0.38 * (0.5 + 0.5 * rough))]);
    }

    return ridge;
  }

  /**
   * План разбит на фасеты: наклон грани задаёт нормаль, нормаль — ступень
   * света. Тот же свет, что у грибов и деревьев, поэтому холм не выпадает
   * из картинки, но перестаёт быть плоской заливкой.
   *
   * @param {object} plan
   * @param {[number, number][]} ridge
   */
  function addRidge(plan, ridge) {
    for (let i = 0; i < ridge.length - 1; i++) {
      const [x0, y0] = ridge[i];
      const [x1, y1] = ridge[i + 1];
      const slope = clamp((y1 - y0) / (x1 - x0), -1.8, 1.8);

      push(
        [[x0, y0], [x1, y1], [x1, -0.06], [x0, -0.06]],
        shadeColor(plan.color, normalize([-slope * 1.5, 1, 0.7])),
        plan.layer,
      );
    }

    // Нижняя часть плана уходит в тень: граница повторяет гребень, поэтому
    // читается как склон, а не как горизонтальная полоса поперёк холма.
    const lower = ridge.map(([x, y]) => [x, Math.max(y - plan.shadeDepth, -0.06)]);
    push(
      [...lower, [1.05, -0.06], [-1.05, -0.06]],
      shadeColor(plan.color, normalize([0.35, 0.1, 0.93])),
      plan.layer,
      false,
      0.5,
    );

    return ridge;
  }

  const plans = [
    {
      baseY: 0.28,
      height: 0.54,
      offset: 0,
      centerX: range(rng, -0.55, 0.05),
      sigma: range(rng, 0.45, 0.65),
      shadeDepth: 0.1,
      color: palette.hillFar,
      layer: 0,
    },
    {
      baseY: 0.14,
      height: 0.46,
      offset: 31,
      centerX: range(rng, -0.1, 0.55),
      sigma: range(rng, 0.4, 0.6),
      shadeDepth: 0.1,
      color: mixColor(palette.hillFar, palette.hillNear, 0.55),
      layer: 0,
    },
    {
      baseY: 0,
      height: 0.32,
      offset: 67,
      centerX: range(rng, -0.45, 0.45),
      sigma: range(rng, 0.5, 0.75),
      shadeDepth: 0.075,
      color: palette.hillNear,
      layer: 0,
    },
  ];

  const ridges = [];

  for (let index = 0; index < plans.length; index++) {
    const ridge = ridgeFor(plans[index]);
    ridges.push(addRidge(plans[index], ridge));
  }

  // Светлая кромка на ближних планах: гребень ловит солнце и отделяется
  // от холма позади. Тонкая полоса, а не градиент.
  for (let index = 1; index < plans.length; index++) {
    const plan = plans[index];
    const crest = mixColor(plan.color, palette.sun, 0.18);
    const ridge = ridges[index];

    for (let i = 0; i < ridge.length - 1; i++) {
      const [x0, y0] = ridge[i];
      const [x1, y1] = ridge[i + 1];
      push(
        [[x0, y0], [x1, y1], [x1, y1 - 0.012], [x0, y0 - 0.012]],
        crest,
        plan.layer,
        false,
        0.9,
      );
    }
  }

  // Трава на ближнем плане: густая кромка и пучки по всему склону. Одиночные
  // треугольники вдоль гребня читались как пунктир, а не как трава.
  const near = ridges[ridges.length - 1];
  const grassTone = mixColor(palette.grass, palette.leafDark, 0.3);
  const grassLight = mixColor(palette.grass, palette.leaf, 0.4);

  /**
   * Пучок травы: 2–4 лезвия с разным наклоном и высотой.
   *
   * @param {number} x
   * @param {number} y
   * @param {number} size
   * @param {number[]} tone
   */
  function addTuft(x, y, size, tone) {
    const blades = 3 + int(rng, 0, 2);

    for (let blade = 0; blade < blades; blade++) {
      const dx = range(rng, -0.35, 0.35) * size;
      const tall = size * range(rng, 0.8, 1.6);
      const lean = range(rng, -0.35, 0.35) * size;

      push(
        [
          [x + dx - size * 0.08, y],
          [x + dx + size * 0.08, y],
          [x + dx + lean, y - tall],
        ],
        tone,
        0.75,
      );
    }
  }

  // Кромка: шанс задаёт шум, поэтому ряд получается рваным, а не линейкой.
  for (let i = 1; i < near.length - 1; i++) {
    const [x, y] = near[i];
    if (noise.fbm2(x * 7.5, 5.1, { octaves: 2 }) < -0.2) continue;
    addTuft(x, y, range(rng, 0.018, 0.04), rng() < 0.45 ? grassLight : grassTone);
  }

  // Склон: пучки ниже гребня, чтобы трава была пятнами по всему холму.
  const tufts = 22 + int(rng, 0, 10);
  for (let i = 0; i < tufts; i++) {
    const x = range(rng, -0.92, 0.92);
    const top = sampleRidge(near, x);
    const y = Math.max(-0.035, top - range(rng, 0.015, 0.22));
    addTuft(x, y, range(rng, 0.012, 0.03), rng() < 0.4 ? grassLight : grassTone);
  }

  /**
   * Дерево на гребне: модель, тень под ней и слой. Вынесено в функцию,
   * потому что на холме их два — ближнее и дальнее, для глубины.
   *
   * @param {[number, number][]} ridge
   * @param {number} x
   * @param {string} name часть сида
   * @param {Record<string, number | string>} params
   * @param {number} scale
   * @param {number[]} groundColor цвет склона для тени
   */
  function addTree(ridge, x, name, params, scale, groundColor) {
    const ground = sampleRidge(ridge, x) - 0.005;
    const tree = buildTree({ seed: `${seed}:hill-tree-${name}`, palette, params });
    const shadow = tree.height * scale * 0.26;

    push(
      ellipse(x, ground, shadow, shadow * 0.3),
      shadeColor(groundColor, [0.7, -0.4, 0.5]),
      0.5,
      false,
      0.35,
    );

    for (const poly of tree.polys) {
      polys.push({
        ...poly,
        pts: poly.pts.map(([px, py, pz]) => [px * scale + x, py * scale + ground, pz * scale]),
        layer: 1 + (poly.layer ?? 0),
      });
    }
  }

  // Ближнее дерево — герой плашки, дальнее — масштаб и глубина.
  const treeX = range(rng, -0.35, 0.35);
  addTree(
    near,
    treeX,
    'near',
    { height: range(rng, 0.55, 0.68), trunkRadius: 0.03, depth: 1, density: 1, clusters: 32, foliage: 'round' },
    range(rng, 0.72, 0.9),
    palette.hillNear,
  );

  addTree(
    ridges[1],
    Math.max(-0.95, treeX - range(rng, 0.55, 0.8)),
    'far',
    { height: range(rng, 0.38, 0.46), trunkRadius: 0.026, depth: 1, density: 1, clusters: 22, foliage: 'round' },
    range(rng, 0.5, 0.62),
    mixColor(palette.hillFar, palette.hillNear, 0.55),
  );

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

  return { kind: 'hill', seed, polys, bounds: { min, max } };
}

/**
 * @param {number[]} ridge
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

/**
 * @param {number} cx
 * @param {number} cy
 * @param {number} rx
 * @param {number} ry
 * @param {number} [steps]
 * @returns {[number, number][]}
 */
function ellipse(cx, cy, rx, ry, steps = 18) {
  return Array.from({ length: steps }, (_, i) => {
    const angle = (i / steps) * Math.PI * 2;
    return [cx + Math.cos(angle) * rx, cy + Math.sin(angle) * ry];
  });
}
