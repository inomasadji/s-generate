import { mixColor, shadeColor } from '../core/color.js';
import { add, cross, dot, length, normalize, scale, sub } from '../core/math.js';
import { getPalette } from '../core/palette.js';
import { int, pick, range, rngStream } from '../core/rng.js';
import { splinePoint } from '../core/spline.js';

const WOOD_LAYER = 0;
const FOLIAGE_LAYER = 1;
const SIDES = 6;

/**
 * Дерево: ствол-свип, ветки-трубы, листва дисками.
 * Листва — билборды в плоскости XY: при малом наклоне камеры они читаются
 * как объёмные кластеры, а стоят дешевле сфер.
 *
 * @param {{ seed?: string,
 *           palette?: import('../core/palette.js').Palette,
 *           params?: Record<string, number | string> }} [options]
 * @returns {{ kind: string, seed: string, height: number,
 *             polys: Array<Record<string, unknown>>,
 *             bounds: { min: number[], max: number[] } }}
 */
export function buildTree(options = {}) {
  const {
    seed = 'demo',
    palette = getPalette('forest'),
    params = {},
  } = options;

  const rng = rngStream(seed, 'tree');

  const height = Number(params.height ?? range(rng, 1.05, 1.55));
  const trunkRadius = Number(params.trunkRadius ?? range(rng, 0.05, 0.085));
  const trunks = Number(params.trunks ?? 1);
  const depth = Number(params.depth ?? 2);
  const spread = Number(params.spread ?? range(rng, 0.55, 0.9));
  const foliageKind = String(params.foliage ?? pick(rng, ['round', 'round', 'conical']));
  const density = Number(params.density ?? range(rng, 0.6, 1));

  const polys = [];
  const centerY = height * 0.5;

  /** @param {number[][]} pts */
  function centroid(pts) {
    const sum = [0, 0, 0];
    for (const point of pts) {
      sum[0] += point[0];
      sum[1] += point[1];
      sum[2] += point[2];
    }
    return scale(sum, 1 / pts.length);
  }

  /** @param {number[][]} pts */
  function normalOf(pts) {
    let normal = normalize(cross(sub(pts[1], pts[0]), sub(pts[2], pts[0])));
    if (length(normal) < 1e-9) return [0, 1, 0];

    const center = centroid(pts);
    if (dot(normal, [center[0], center[1] - centerY, center[2]]) < 0) {
      normal = scale(normal, -1);
    }
    return normal;
  }

  /**
   * @param {number[][]} pts
   * @param {number[]} baseColor
   * @param {number} layer
   * @param {boolean} [outline]
   */
  function pushPoly(pts, baseColor, layer, outline = true) {
    const normal = normalOf(pts);
    polys.push({
      pts,
      color: shadeColor(baseColor, normal),
      normal,
      group: layer === FOLIAGE_LAYER ? 'foliage' : 'wood',
      layer,
      outline,
    });
  }

  /**
   * Труба по ломаной: кольца в плоскостях, перпендикулярных касательной.
   *
   * @param {number[][]} points
   * @param {number[]} radii
   * @param {number[]} baseColor
   */
  function addTube(points, radii, baseColor) {
    const rings = points.map((point, index) => {
      const before = points[Math.max(0, index - 1)];
      const after = points[Math.min(points.length - 1, index + 1)];
      const tangent = normalize(sub(after, before));
      const helper = Math.abs(tangent[1]) > 0.9 ? [1, 0, 0] : [0, 1, 0];
      const u = normalize(cross(tangent, helper));
      const v = normalize(cross(tangent, u));
      const radius = radii[index];

      return Array.from({ length: SIDES }, (_, side) => {
        const angle = (side / SIDES) * Math.PI * 2;
        return [
          point[0] + (u[0] * Math.cos(angle) + v[0] * Math.sin(angle)) * radius,
          point[1] + (u[1] * Math.cos(angle) + v[1] * Math.sin(angle)) * radius,
          point[2] + (u[2] * Math.cos(angle) + v[2] * Math.sin(angle)) * radius,
        ];
      });
    });

    for (let i = 0; i < rings.length - 1; i++) {
      for (let side = 0; side < SIDES; side++) {
        const next = (side + 1) % SIDES;
        pushPoly(
          [rings[i][side], rings[i][next], rings[i + 1][next], rings[i + 1][side]],
          baseColor,
          WOOD_LAYER,
        );
      }
    }
  }

  /**
   * Кластер листвы: несколько плоских дисков вокруг точки.
   *
   * @param {number[]} center
   * @param {number} radius
   * @param {number} count
   */
  function addFoliage(center, radius, count) {
    for (let i = 0; i < count; i++) {
      const discCenter = add(center, [
        range(rng, -1, 1) * radius * 0.9,
        range(rng, -0.55, 0.8) * radius * 0.8,
        range(rng, -1, 1) * radius * 0.9,
      ]);
      const discRadius = range(rng, 0.45, 0.8) * radius;
      let tone = mixColor(palette.leaf, palette.leafDark, range(rng, 0, 0.6));
      // Иногда лист светлее — крона не выглядит одним пятном.
      if (rng() < 0.3) tone = mixColor(tone, palette.paper, range(rng, 0.08, 0.2));

      const points = Array.from({ length: 10 }, (_, k) => {
        const angle = (k / 10) * Math.PI * 2;
        return [
          discCenter[0] + Math.cos(angle) * discRadius,
          discCenter[1] + Math.sin(angle) * discRadius,
          discCenter[2],
        ];
      });

      pushPoly(points, tone, FOLIAGE_LAYER, false);
    }
  }

  /**
   * Ветка: короткая изогнутая труба, в конце — развилка или листва.
   *
   * @param {number[]} origin
   * @param {number[]} direction
   * @param {number} branchLength
   * @param {number} radius
   * @param {number} remaining
   */
  function addBranch(origin, direction, branchLength, radius, remaining) {
    const bent = normalize(add(direction, [
      range(rng, -0.22, 0.22),
      range(rng, 0.1, 0.3),
      range(rng, -0.22, 0.22),
    ]));
    const mid = add(origin, scale(direction, branchLength * 0.55));
    const tip = add(mid, scale(bent, branchLength * 0.55));

    addTube([origin, mid, tip], [radius, radius * 0.8, radius * 0.58], palette.wood);

    if (remaining <= 0) {
      addFoliage(tip, height * range(rng, 0.16, 0.22) * density, Math.round(range(rng, 3, 5) * density) + 2);
      return;
    }

    const baseAzimuth = Math.atan2(bent[2], bent[0]);
    for (let i = 0; i < 2; i++) {
      const azimuth = baseAzimuth + (i === 0 ? -1 : 1) * range(rng, 0.45, 0.85);
      const tilt = range(rng, 0.55, spread);
      const nextDirection = normalize([
        Math.sin(tilt) * Math.cos(azimuth),
        Math.cos(tilt),
        Math.sin(tilt) * Math.sin(azimuth),
      ]);
      addBranch(tip, nextDirection, branchLength * 0.66, radius * 0.62, remaining - 1);
    }
  }

  // --- Стволы ------------------------------------------------------------

  for (let trunk = 0; trunk < trunks; trunk++) {
    const azimuth = (trunk / Math.max(1, trunks)) * Math.PI * 2 + range(rng, -0.4, 0.4);
    const lean = trunks > 1 ? range(rng, 0.16, 0.32) : range(rng, 0.02, 0.1);
    const topRadius = trunkRadius * (trunks > 1 ? 0.6 : 0.35);

    const axis = [
      [0, 0, 0],
      [Math.cos(azimuth) * lean * 0.3, height * 0.3, Math.sin(azimuth) * lean * 0.3],
      [Math.cos(azimuth) * lean * 0.7, height * 0.62, Math.sin(azimuth) * lean * 0.7],
      [Math.cos(azimuth) * lean, height, Math.sin(azimuth) * lean],
    ];

    const samples = 8;
    const points = [];
    const radii = [];

    for (let i = 0; i <= samples; i++) {
      const t = i / samples;
      points.push(splinePoint(axis, t));
      radii.push(trunkRadius + (topRadius - trunkRadius) * t);
    }

    addTube(points, radii, palette.wood);

    const top = points[points.length - 1];

    if (depth <= 0) {
      addFoliage(top, height * 0.3 * density, Math.round(6 * density) + 2);
      continue;
    }

    // Крона: ветки из верхней половины ствола, верхушка тоже в листве.
    const branchCount = int(rng, 3, 5);
    for (let i = 0; i < branchCount; i++) {
      const t = 0.62 + (i / Math.max(1, branchCount - 1)) * 0.33;
      const origin = splinePoint(axis, t);
      const branchAzimuth = azimuth + i * 2.4 + range(rng, -0.4, 0.4);
      const tilt = range(rng, 0.6, spread);
      const direction = normalize([
        Math.sin(tilt) * Math.cos(branchAzimuth),
        Math.cos(tilt),
        Math.sin(tilt) * Math.sin(branchAzimuth),
      ]);
      addBranch(origin, direction, height * range(rng, 0.3, 0.44), trunkRadius * 0.55, depth - 1);
    }

    addFoliage(top, height * 0.2 * density, Math.round(4 * density) + 2);
  }

  // --- Хвойные ярусы -----------------------------------------------------

  if (foliageKind === 'conical') {
    const tiers = 5;
    for (let tier = 0; tier < tiers; tier++) {
      const t = 0.35 + (tier / tiers) * 0.55;
      const radius = height * (0.3 - t * 0.22) * density;
      addFoliage([0, height * t, 0], radius, Math.max(3, Math.round(5 * density)));
    }
  }

  // --- Габариты ----------------------------------------------------------

  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];

  for (const poly of polys) {
    for (const point of poly.pts) {
      for (let axisIndex = 0; axisIndex < 3; axisIndex++) {
        min[axisIndex] = Math.min(min[axisIndex], point[axisIndex]);
        max[axisIndex] = Math.max(max[axisIndex], point[axisIndex]);
      }
    }
  }

  return { kind: 'tree', seed, height, polys, bounds: { min, max } };
}

/**
 * Кустарник — то же дерево, но несколько стволов из одной точки и низкая
 * плотная крона. Отдельный код не нужен: отличаются только параметры.
 *
 * @param {{ seed?: string, palette?: import('../core/palette.js').Palette }} [options]
 */
export function buildShrub(options = {}) {
  const { seed = 'demo', palette = getPalette('forest') } = options;
  const rng = rngStream(seed, 'shrub');

  return buildTree({
    seed,
    palette,
    params: {
      trunks: int(rng, 3, 4),
      height: range(rng, 0.42, 0.62),
      trunkRadius: range(rng, 0.022, 0.038),
      depth: 0,
      spread: range(rng, 0.9, 1.15),
      foliage: 'round',
      density: range(rng, 1.1, 1.3),
    },
  });
}
