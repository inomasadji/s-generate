import { mixColor, shadeColor } from '../core/color.js';
import { add, clamp, cross, dot, length, normalize, scale, sub } from '../core/math.js';
import { getPalette } from '../core/palette.js';
import { int, pick, range, rngStream } from '../core/rng.js';
import { splinePoint } from '../core/spline.js';

const WOOD_LAYER = 0;
const FOLIAGE_LAYER = 1;

/**
 * Дерево: ствол с корнями, ветки-трубы, крона из дисков.
 *
 * Крона строится не «шариками на концах веток», а оболочкой-эллипсоидом:
 * часть дисков сидит на ветках, часть — на поверхности оболочки. Так силуэт
 * остаётся округлым, а не распадается на отдельные гроздья.
 *
 * @param {{ seed?: string,
 *           palette?: import('../core/palette.js').Palette,
 *           params?: Record<string, number | string> }} [options]
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
  const spread = Number(params.spread ?? range(rng, 0.6, 0.95));
  const foliageKind = String(params.foliage ?? pick(rng, ['round', 'round', 'column', 'conical']));
  const density = Number(params.density ?? range(rng, 0.75, 1));
  const detail = clamp(Number(params.detail ?? 1), 0.4, 1.2);
  const clusterCount = Math.max(5, Math.round((params.clusters ?? 24) * detail * density));
  const leafDiscs = Math.max(2, Math.round(5 * detail));

  const trunkSides = Math.max(5, Math.round(8 * detail));
  const branchSides = Math.max(4, Math.round(6 * detail));

  const canopyShape = foliageKind === 'column'
    ? { rx: 0.36, ry: 0.5, rz: 0.36, cy: 0.78 }
    : { rx: 0.52, ry: 0.36, rz: 0.48, cy: 0.7 };

  const canopy = {
    center: [0, height * canopyShape.cy, 0],
    radii: [height * canopyShape.rx, height * canopyShape.ry, height * canopyShape.rz],
  };

  /** @type {Array<Record<string, unknown>>} */
  const polys = [];
  const barkTone = mixColor(palette.wood, palette.ink, range(rng, 0.08, 0.2));
  const barkLight = mixColor(palette.wood, palette.paper, 0.12);

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
    if (dot(normal, [center[0], center[1] - height * 0.5, center[2]]) < 0) {
      normal = scale(normal, -1);
    }
    return normal;
  }

  /**
   * @param {number[][]} pts
   * @param {number[]} color
   * @param {number} layer
   * @param {boolean} [outline]
   */
  function pushPoly(pts, color, layer, outline = true) {
    polys.push({
      pts,
      color: shadeColor(color, normalOf(pts)),
      normal: normalOf(pts),
      group: layer === FOLIAGE_LAYER ? 'foliage' : 'wood',
      layer,
      outline,
    });
  }

  /**
   * @param {number[][]} points
   * @param {number[]} radii
   * @param {number[]} color
   * @param {number} sides
   */
  function addTube(points, radii, color, sides) {
    const rings = points.map((point, index) => {
      const before = points[Math.max(0, index - 1)];
      const after = points[Math.min(points.length - 1, index + 1)];
      const tangent = normalize(sub(after, before));
      const helper = Math.abs(tangent[1]) > 0.9 ? [1, 0, 0] : [0, 1, 0];
      const u = normalize(cross(tangent, helper));
      const v = normalize(cross(tangent, u));
      const radius = radii[index];

      return Array.from({ length: sides }, (_, side) => {
        const angle = (side / sides) * Math.PI * 2;
        return [
          point[0] + (u[0] * Math.cos(angle) + v[0] * Math.sin(angle)) * radius,
          point[1] + (u[1] * Math.cos(angle) + v[1] * Math.sin(angle)) * radius,
          point[2] + (u[2] * Math.cos(angle) + v[2] * Math.sin(angle)) * radius,
        ];
      });
    });

    for (let i = 0; i < rings.length - 1; i++) {
      // Чередование тонов коры: ствол перестаёт быть однотонной палкой.
      const tone = i % 4 === 0 ? mixColor(color, barkTone, 0.55) : mixColor(color, barkLight, 0.12);
      for (let side = 0; side < sides; side++) {
        const next = (side + 1) % sides;
        pushPoly(
          [rings[i][side], rings[i][next], rings[i + 1][next], rings[i + 1][side]],
          tone,
          WOOD_LAYER,
        );
      }
    }
  }

  /**
   * Диск листвы. Нормаль наклонена к центру кроны — верх и левый бок светлее,
   * низ и правый — темнее.
   *
   * @param {number[]} center
   * @param {number} radius
   */
  function addLeafDisc(center, radius) {
    const relative = sub(center, canopy.center);
    const normal = normalize([
      relative[0] / canopy.radii[0] * 0.6,
      1.3,
      relative[2] / canopy.radii[2] * 0.6,
    ]);

    const up = clamp(relative[1] / canopy.radii[1], -1, 1);
    let tone = mixColor(palette.leaf, palette.leafDark, clamp(0.45 - up * 0.35 + range(rng, 0, 0.2), 0, 1));
    if (rng() < 0.25) tone = mixColor(tone, palette.paper, range(rng, 0.06, 0.16));

    const phase = range(rng, 0, Math.PI);
    const points = Array.from({ length: 9 }, (_, index) => {
      const angle = phase + (index / 9) * Math.PI * 2;
      return [
        center[0] + Math.cos(angle) * radius,
        center[1] + Math.sin(angle) * radius * 0.88,
        center[2],
      ];
    });

    polys.push({
      pts: points,
      color: shadeColor(tone, normal),
      normal,
      group: 'foliage',
      layer: FOLIAGE_LAYER,
      outline: false,
    });
  }

  /**
   * @param {number[]} center
   * @param {number} size
   * @param {number} count
   */
  function addFoliageCluster(center, size, count) {
    for (let i = 0; i < count; i++) {
      const offset = [
        range(rng, -0.55, 0.55) * size,
        range(rng, -0.4, 0.45) * size,
        range(rng, -0.55, 0.55) * size,
      ];
      addLeafDisc(add(center, offset), size * range(rng, 0.4, 0.66));
    }
  }

  /**
   * Диски по поверхности кроны: держат силуэт и не дают ему рассыпаться.
   *
   * @param {number} count
   */
  function addCanopyShell(count) {
    for (let i = 0; i < count; i++) {
      const theta = range(rng, 0, Math.PI * 2);
      const phi = range(rng, 0, Math.PI * 0.78);
      const radius = range(rng, 0.72, 0.95);

      const point = [
        canopy.center[0] + Math.cos(theta) * Math.sin(phi) * canopy.radii[0] * radius,
        canopy.center[1] + Math.cos(phi) * canopy.radii[1] * radius,
        canopy.center[2] + Math.sin(theta) * Math.sin(phi) * canopy.radii[2] * radius,
      ];

      const size = height * range(rng, 0.045, 0.068) * (0.75 + density * 0.35);
      addLeafDisc(point, size);

      // Мелкий спутник рядом: одиночные диски на оболочке выглядят
      // оторванными от кроны.
      if (rng() < 0.75) {
        addLeafDisc(
          add(point, [
            range(rng, -0.035, 0.035) * height,
            range(rng, -0.03, 0.03) * height,
            range(rng, -0.035, 0.035) * height,
          ]),
          size * range(rng, 0.7, 0.95),
        );
      }
    }
  }

  /**
   * Ветка с подъёмом к свету: конец загибается вверх, как у настоящего дерева.
   *
   * @param {number[]} origin
   * @param {number[]} direction
   * @param {number} branchLength
   * @param {number} radius
   * @param {number} remaining
   */
  function addBranch(origin, direction, branchLength, radius, remaining) {
    const mid = add(origin, scale(direction, branchLength * 0.5));
    const lifted = normalize(add(direction, [range(rng, -0.1, 0.1), range(rng, 0.35, 0.6), range(rng, -0.1, 0.1)]));
    const tip = add(mid, scale(lifted, branchLength * 0.55));

    addTube(
      [origin, mid, tip],
      [radius, radius * 0.78, radius * 0.52],
      palette.wood,
      branchSides,
    );

    if (remaining <= 0) {
      addFoliageCluster(tip, height * range(rng, 0.1, 0.14), Math.max(2, leafDiscs - 1));
      return;
    }

    addFoliageCluster(add(tip, [0, height * 0.02, 0]), height * 0.09, 2);

    const baseAzimuth = Math.atan2(lifted[2], lifted[0]);
    const children = rng() < 0.3 ? 3 : 2;

    for (let i = 0; i < children; i++) {
      const azimuth = baseAzimuth + (i - (children - 1) / 2) * range(rng, 0.55, 0.95);
      const tilt = range(rng, 0.5, spread);
      const nextDirection = normalize([
        Math.sin(tilt) * Math.cos(azimuth),
        Math.cos(tilt),
        Math.sin(tilt) * Math.sin(azimuth),
      ]);
      addBranch(tip, nextDirection, branchLength * 0.64, radius * 0.6, remaining - 1);
    }
  }

  /**
   * @param {number[]} axis
   * @param {number} radius
   */
  function addRoots(axis, radius) {
    const roots = int(rng, 3, 5);
    for (let i = 0; i < roots; i++) {
      const angle = (i / roots) * Math.PI * 2 + range(rng, -0.3, 0.3);
      const reach = radius * range(rng, 1.8, 2.8);
      const lift = radius * range(rng, 0.35, 0.75);

      addTube(
        [
          [0, radius * 0.9, 0],
          [Math.cos(angle) * reach * 0.55, lift * 0.5, Math.sin(angle) * reach * 0.55],
          [Math.cos(angle) * reach, 0, Math.sin(angle) * reach],
        ],
        [radius * 0.4, radius * 0.24, radius * 0.09],
        palette.wood,
        Math.max(4, branchSides - 2),
      );
    }
    void axis;
  }

  // --- Стволы ------------------------------------------------------------

  for (let trunk = 0; trunk < trunks; trunk++) {
    const azimuth = (trunk / Math.max(1, trunks)) * Math.PI * 2 + range(rng, -0.4, 0.4);
    const lean = trunks > 1 ? range(rng, 0.16, 0.34) : range(rng, 0.02, 0.1);
    const topRadius = trunkRadius * (trunks > 1 ? 0.55 : 0.3);

    const axis = [
      [0, 0, 0],
      [Math.cos(azimuth) * lean * 0.25, height * 0.28, Math.sin(azimuth) * lean * 0.25],
      [Math.cos(azimuth) * lean * 0.65, height * 0.58, Math.sin(azimuth) * lean * 0.65],
      [Math.cos(azimuth) * lean, height, Math.sin(azimuth) * lean],
    ];

    const samples = Math.max(6, Math.round(10 * detail));
    const points = [];
    const radii = [];

    for (let i = 0; i <= samples; i++) {
      const t = i / samples;
      const point = splinePoint(axis, t);
      // Лёгкая кривизна ствола: прямых палок в лесу не бывает.
      point[0] += Math.sin(t * Math.PI) * range(rng, -1, 1) * height * 0.012;
      points.push(point);
      radii.push(trunkRadius * (1 - 0.62 * t) + trunkRadius * 0.4 * Math.exp(-t * 16));
    }

    addTube(points, radii, palette.wood, trunkSides);
    addRoots(axis, trunkRadius);

    const top = points[points.length - 1];

    if (foliageKind === 'conical') {
      addFoliageCluster(top, height * 0.12, 3);
      continue;
    }

    if (depth <= 0) {
      addFoliageCluster(top, height * 0.18 * density, Math.round(5 * density) + 2);
      addCanopyShell(Math.round(clusterCount / 3));
      continue;
    }

    const branchCount = Math.max(4, Math.round(6 * detail));
    for (let i = 0; i < branchCount; i++) {
      const t = 0.45 + (i / Math.max(1, branchCount - 1)) * 0.38;
      const origin = splinePoint(axis, t);
      const branchAzimuth = azimuth + i * 2.399 + range(rng, -0.35, 0.35);
      const tilt = range(rng, 0.62, foliageKind === 'column' ? 0.72 : spread);
      const direction = normalize([
        Math.sin(tilt) * Math.cos(branchAzimuth),
        Math.cos(tilt),
        Math.sin(tilt) * Math.sin(branchAzimuth),
      ]);
      addBranch(origin, direction, height * range(rng, 0.28, foliageKind === 'column' ? 0.3 : 0.42), trunkRadius * 0.5, depth - 1);
    }

    addFoliageCluster(top, height * 0.12, 3);
  }

  // --- Хвойная крона -----------------------------------------------------

  if (foliageKind === 'conical') {
    const tiers = Math.max(5, Math.round(8 * detail));

    for (let tier = 0; tier < tiers; tier++) {
      const t = 0.3 + (tier / tiers) * 0.68;
      const tierRadius = height * (0.38 - t * 0.3) * density;
      const count = Math.max(5, Math.round(7 * detail));

      for (let i = 0; i < count; i++) {
        const angle = (i / count) * Math.PI * 2 + tier * 0.7;
        const point = [
          Math.cos(angle) * tierRadius * range(rng, 0.75, 1),
          height * t + range(rng, -0.03, 0.03) * height,
          Math.sin(angle) * tierRadius * range(rng, 0.75, 1),
        ];
        addLeafDisc(point, height * range(rng, 0.05, 0.075));
      }
    }

    addFoliageCluster([0, height * 1.02, 0], height * 0.1, 4);
  }

  // --- Крона-оболочка (для лиственных) -----------------------------------

  if (foliageKind !== 'conical') {
    addCanopyShell(clusterCount);
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

  return { kind: 'tree', seed, height, foliage: foliageKind, polys, bounds: { min, max } };
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
      depth: 1,
      spread: range(rng, 0.9, 1.15),
      foliage: 'round',
      density: range(rng, 1, 1.2),
      clusters: 12,
      detail: 0.8,
    },
  });
}
