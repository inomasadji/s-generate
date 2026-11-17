import { mixColor, shadeColor } from '../core/color.js';
import { add, clamp, cross, dot, length, normalize, scale, sub } from '../core/math.js';
import { createNoise } from '../core/noise.js';
import { getPalette, seasonOf } from '../core/palette.js';
import { int, pick, range, rngStream } from '../core/rng.js';
import { splinePoint } from '../core/spline.js';

const WOOD_LAYER = 0;
const FOLIAGE_LAYER = 1;

/** Характеры дерева; `upright` — обычный ствол без крайностей. */
export const TREE_HABITS = Object.freeze(['upright', 'column', 'weeping', 'crooked']);

/** Хвойные силуэты: ель узкая и поникшая, пихта широкая, сосна редкая. */
export const TREE_CONIFERS = Object.freeze(['spruce', 'fir', 'pine']);

const CONIFERS = {
  spruce: { tiers: 12, radius: 0.33, taper: 0.95, bare: 0.22, droop: 0.05, spread: 0.75, drift: 0.05 },
  fir: { tiers: 10, radius: 0.4, taper: 0.8, bare: 0.18, droop: 0.03, spread: 0.9, drift: 0.03 },
  pine: { tiers: 7, radius: 0.28, taper: 0.55, bare: 0.42, droop: 0.01, spread: 0.55, drift: 0.1 },
};

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
  // Листья — отдельный поток: добавление деталей не должно сдвигать ветки.
  const leafRng = rngStream(seed, 'leaves');

  const height = Number(params.height ?? range(rng, 1.05, 1.55));
  const trunkRadius = Number(params.trunkRadius ?? range(rng, 0.05, 0.085));
  const trunks = Number(params.trunks ?? 1);
  const depth = Number(params.depth ?? 2);
  const spread = Number(params.spread ?? range(rng, 0.6, 0.95));
  const conifer = TREE_CONIFERS.includes(String(params.conifer)) ? String(params.conifer) : null;
  const foliageKind = conifer
    ? 'conical'
    : String(params.foliage ?? pick(rng, ['round', 'round', 'column', 'conical']));
  const density = Number(params.density ?? range(rng, 0.75, 1));
  const detail = clamp(Number(params.detail ?? 1), 0.4, 1.2);
  const season = String(params.season ?? seasonOf(palette));
  const habit = String(params.habit ?? 'upright');
  const isWinter = season === 'winter';
  const isSpring = season === 'spring';
  const isAutumn = season === 'autumn';

  const seasonClusterFactor = isWinter ? 0.2 : 1;
  const clusterCount = Math.max(
    3,
    Math.round((params.clusters ?? 28) * detail * density * seasonClusterFactor),
  );
  const leafDiscs = Math.max(2, Math.round(5 * detail));

  const barkNoise = createNoise(rngStream(seed, 'bark'));

  const trunkSides = Math.max(5, Math.round(8 * detail));
  const branchSides = Math.max(4, Math.round(6 * detail));

  const habitShape = {
    upright: { rx: 0.52, ry: 0.36, rz: 0.48, cy: 0.7 },
    column: { rx: 0.36, ry: 0.5, rz: 0.36, cy: 0.78 },
    weeping: { rx: 0.44, ry: 0.5, rz: 0.42, cy: 0.62 },
    crooked: { rx: 0.62, ry: 0.24, rz: 0.5, cy: 0.8 },
  };

  const canopyShape = habit === 'upright' && foliageKind === 'column'
    ? habitShape.column
    : habitShape[habit] ?? habitShape.upright;

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
    // Кадр кольца переносится с предыдущего кольца (parallel transport).
    // Если каждый раз строить его от «верха» [0,1,0], то на крутом изгибе
    // кадр перескакивает на 90° и труба выворачивается — в стволе появляется
    // разлом. Перенос поворачивает кадр вместе с осью, без рывков.
    let frame = null;

    const rings = points.map((point, index) => {
      const before = points[Math.max(0, index - 1)];
      const after = points[Math.min(points.length - 1, index + 1)];
      const tangent = normalize(sub(after, before));
      const helper = Math.abs(tangent[1]) > 0.9 ? [1, 0, 0] : [0, 1, 0];

      if (!frame) {
        frame = normalize(cross(tangent, helper));
      } else {
        frame = normalize(sub(frame, scale(tangent, dot(frame, tangent))));
        if (length(frame) < 1e-9) frame = normalize(cross(tangent, helper));
      }

      const u = frame;
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
      for (let side = 0; side < sides; side++) {
        const next = (side + 1) % sides;
        // Продольные волокна коры: тон грани зависит от угла и высоты.
        const angle = (side / sides) * Math.PI * 2;
        const grain = barkNoise.perlin2(
          Math.cos(angle) * 1.6 + i * 0.37,
          Math.sin(angle) * 1.6 + i * 0.11,
        );
        const tone = mixColor(color, grain >= 0 ? barkTone : barkLight, Math.abs(grain) * 0.24);

        pushPoly(
          [rings[i][side], rings[i][next], rings[i + 1][next], rings[i + 1][side]],
          tone,
          WOOD_LAYER,
        );
      }
    }
  }

  /**
   * Лист: две половины вдоль жилки. Одна светлее, другая темнее — лист
   * читается сложенным, а не плоским ромбом.
   *
   * @param {number[]} origin
   * @param {number} angle
   * @param {number} length
   * @param {number} width
   * @param {number[]} normal
   * @param {number[]} tone
   */
  function addLeaf(origin, angle, length, width, normal, tone) {
    const tip = [
      origin[0] + Math.cos(angle) * length,
      origin[1] + Math.sin(angle) * length,
      origin[2],
    ];
    const left = [
      origin[0] + Math.cos(angle + 1.9) * width,
      origin[1] + Math.sin(angle + 1.9) * width * 0.8,
      origin[2],
    ];
    const right = [
      origin[0] + Math.cos(angle - 1.9) * width,
      origin[1] + Math.sin(angle - 1.9) * width * 0.8,
      origin[2],
    ];
    const dark = mixColor(tone, palette.leafDark, 0.22);

    polys.push({
      pts: [origin, left, tip],
      color: shadeColor(tone, normal),
      normal,
      group: 'foliage',
      layer: FOLIAGE_LAYER,
      outline: false,
    });
    polys.push({
      pts: [origin, tip, right],
      color: shadeColor(dark, normal),
      normal,
      group: 'foliage',
      layer: FOLIAGE_LAYER,
      outline: false,
    });
  }

  /**
   * Узел листьев: 2–4 листа вокруг точки, каждый со своим поворотом.
   * Заменяет два случайных ромбика по краю диска.
   *
   * @param {number[]} center
   * @param {number} size
   * @param {number[]} normal
   * @param {number[]} tone
   */
  function addLeafNode(center, size, normal, tone) {
    const leaves = 3 + int(leafRng, 0, 1);

    for (let i = 0; i < leaves; i++) {
      const angle = range(leafRng, 0, Math.PI * 2);
      const distance = size * range(leafRng, 0.3, 0.55);
      const origin = [
        center[0] + Math.cos(angle) * distance,
        center[1] + Math.sin(angle) * distance * 0.85,
        center[2],
      ];
      const length = size * range(leafRng, 0.5, 0.75);

      addLeaf(
        origin,
        angle + range(leafRng, -0.4, 0.4),
        length,
        length * range(leafRng, 0.4, 0.5),
        normal,
        tone,
      );
    }
  }

  /**
   * Диск листвы. Нормаль наклонена к центру кроны — верх и левый бок светлее,
   * низ и правый — темнее.
   *
   * @param {number[]} center
   * @param {number} radius
   * @param {boolean} [withLeaves] листовые узлы: только для лиственных
   */
  function addLeafDisc(center, radius, withLeaves = true) {
    const relative = sub(center, canopy.center);
    const normal = normalize([
      relative[0] / canopy.radii[0] * 0.6,
      1.3,
      relative[2] / canopy.radii[2] * 0.6,
    ]);

    const up = clamp(relative[1] / canopy.radii[1], -1, 1);
    let base = palette.leaf;
    if (isSpring) base = mixColor(base, palette.spot, 0.3);
    if (isAutumn) base = mixColor(base, palette.accent, 0.5);
    if (isWinter) base = mixColor(palette.leafDark, palette.muted, 0.35);

    let tone = mixColor(base, palette.leafDark, clamp(0.45 - up * 0.35 + range(rng, 0, 0.2), 0, 1));
    if (!isWinter && rng() < 0.25) tone = mixColor(tone, palette.paper, range(rng, 0.06, 0.16));

    const phase = range(rng, 0, Math.PI);
    const points = Array.from({ length: 12 }, (_, index) => {
      const angle = phase + (index / 12) * Math.PI * 2;
      // Неровный край: диск перестаёт быть правильным многоугольником.
      const wobble = 0.72 + Math.abs(barkNoise.perlin2(
        Math.cos(angle) * 1.2 + center[0] * 5,
        Math.sin(angle) * 1.2 + center[2] * 5,
      )) * 0.5;
      const r = radius * wobble;
      return [
        center[0] + Math.cos(angle) * r,
        center[1] + Math.sin(angle) * r * 0.88,
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

    // Узлы листьев по краю: фактура вместо ровного блина. Хвое не нужны
    // широкие листья — у неё своя форма ярусов.
    if (withLeaves && detail >= 0.85 && !isWinter) {
      addLeafNode(center, radius, normal, tone);
    }
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
    const liftY = habit === 'weeping' ? range(rng, -0.55, -0.25) : range(rng, 0.35, 0.6);
    const lifted = normalize(add(direction, [range(rng, -0.1, 0.1), liftY, range(rng, -0.1, 0.1)]));
    const tip = add(mid, scale(lifted, branchLength * 0.55));

    addTube(
      [origin, mid, tip],
      [radius, radius * 0.78, radius * 0.52],
      palette.wood,
      branchSides,
    );

    if (remaining <= 0) {
      if (isWinter) {
        addSnowTip(tip, height * range(rng, 0.016, 0.028));
      } else {
        addFoliageCluster(tip, height * range(rng, 0.1, 0.14), Math.max(2, leafDiscs - 1));
      }
      return;
    }

    if (!isWinter) {
      addFoliageCluster(add(tip, [0, height * 0.02, 0]), height * 0.09, 2);
    }

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

  /**
   * Снежная шапка на ветке.
   * @param {number[]} center
   * @param {number} size
   */
  function addSnowTip(center, size) {
    polys.push({
      pts: [
        [center[0] + size, center[1], center[2]],
        [center[0], center[1] + size * 0.55, center[2]],
        [center[0] - size, center[1], center[2]],
        [center[0], center[1] - size * 0.3, center[2]],
      ],
      color: mixColor(palette.snow, palette.skyTop, 0.22),
      normal: [0, 1, 0],
      group: 'snow',
      layer: FOLIAGE_LAYER,
      outline: false,
    });
  }

  /**
   * Каменная гряда у корней — для кривой сосны на скале.
   */
  function addRock() {
    const rockColor = mixColor(palette.mountainShade, palette.ink, 0.15);

    for (let i = 0; i < 2; i++) {
      const width = trunkRadius * range(rng, 2.4, 3.6);
      const heightRock = trunkRadius * range(rng, 3, 4.5);
      const offset = range(rng, -trunkRadius * 3, trunkRadius * 3);

      polys.push({
        pts: [
          [-width + offset, heightRock * 0.2],
          [-width * 0.6 + offset, heightRock],
          [width * 0.1 + offset, heightRock * 1.05],
          [width + offset, heightRock * 0.55],
          [width * 0.7 + offset, -trunkRadius * 0.2],
          [-width * 0.8 + offset, -trunkRadius * 0.2],
        ].map(([x, y]) => [x, y, 0]),
        color: mixColor(rockColor, palette.ink, i === 0 ? 0.15 : 0),
        normal: [0, 0, 1],
        group: 'rock',
        layer: -1,
        outline: false,
      });
    }
  }

  /**
   * Весеннее цветение: мелкие белые точки по кроне.
   * @param {number} count
   */
  function addBlossoms(count) {
    const blossomTone = mixColor(palette.spot, palette.accent, 0.22);

    for (let i = 0; i < count; i++) {
      const theta = range(rng, 0, Math.PI * 2);
      const phi = range(rng, 0, Math.PI * 0.8);
      const radius = range(rng, 0.7, 1.05);
      const center = [
        canopy.center[0] + Math.cos(theta) * Math.sin(phi) * canopy.radii[0] * radius,
        canopy.center[1] + Math.cos(phi) * canopy.radii[1] * radius,
        canopy.center[2] + Math.sin(theta) * Math.sin(phi) * canopy.radii[2] * radius,
      ];
      const size = height * range(rng, 0.007, 0.012);

      polys.push({
        pts: Array.from({ length: 5 }, (_, k) => {
          const angle = (k / 5) * Math.PI * 2;
          return [
            center[0] + Math.cos(angle) * size,
            center[1] + Math.sin(angle) * size,
            center[2],
          ];
        }),
        color: blossomTone,
        normal: [0, 1, 0],
        group: 'blossom',
        layer: 2,
        outline: false,
      });
    }
  }

  /**
   * Осенний листопад: несколько листьев ниже кроны.
   * @param {number} count
   */
  function addFallingLeaves(count) {
    for (let i = 0; i < count; i++) {
      const x = range(rng, -canopy.radii[0], canopy.radii[0]) * 0.9;
      const y = range(rng, height * 0.12, canopy.center[1] - canopy.radii[1] * 0.4);
      const z = range(rng, -canopy.radii[2], canopy.radii[2]) * 0.5;
      const size = height * range(rng, 0.008, 0.014);
      const tone = mixColor(palette.accent, palette.leaf, range(rng, 0.1, 0.5));

      polys.push({
        pts: [
          [x + size, y],
          [x, y + size * 0.5],
          [x - size * 0.8, y + size * 0.1],
          [x, y - size * 0.4],
        ].map(([px, py]) => [px, py, z]),
        color: tone,
        normal: [0, 0, 1],
        group: 'leaf',
        layer: 2,
        outline: false,
      });
    }
  }

  /**
   * Плакучие пряди: цепочки листвы, свисающие с кроны.
   * @param {number} count
   */
  function addWeepingStrands(count) {
    for (let i = 0; i < count; i++) {
      const angle = range(rng, 0, Math.PI * 2);
      const depth = range(rng, 0.35, 0.95);
      const x = canopy.center[0] + Math.cos(angle) * canopy.radii[0] * depth;
      const z = canopy.center[2] + Math.sin(angle) * canopy.radii[2] * depth;
      let y = canopy.center[1] - canopy.radii[1] * range(rng, 0.2, 0.55);
      const length = int(rng, 4, 7);

      for (let k = 0; k < length; k++) {
        const px = x + range(rng, -0.02, 0.02) * height;
        const pz = z + range(rng, -0.015, 0.015) * height;
        addLeafDisc([px, Math.max(height * 0.08, y), pz], height * range(rng, 0.024, 0.04));
        y -= height * range(rng, 0.03, 0.055);
      }
    }
  }

  // --- Стволы ------------------------------------------------------------

  /** Ось ствола для хвойной кроны: ярусы должны сидеть на ней, а не на x=0. */
  let coniferAxis = null;

  for (let trunk = 0; trunk < trunks; trunk++) {
    const azimuth = (trunk / Math.max(1, trunks)) * Math.PI * 2 + range(rng, -0.4, 0.4);
    const crooked = habit === 'crooked';
    const lean = trunks > 1
      ? range(rng, 0.16, 0.34)
      : crooked ? range(rng, 0.25, 0.45) : range(rng, 0.02, 0.1);
    const topRadius = trunkRadius * (trunks > 1 ? 0.55 : 0.3);

    const axis = [
      [0, 0, 0],
      [Math.cos(azimuth) * lean * (crooked ? 0.5 : 0.25), height * 0.28, Math.sin(azimuth) * lean * 0.25],
      [Math.cos(azimuth) * lean * (crooked ? 0.3 : 0.65), height * 0.58, Math.sin(azimuth) * lean * (crooked ? 0.75 : 0.65)],
      [Math.cos(azimuth) * lean * (crooked ? 1.15 : 1), height, Math.sin(azimuth) * lean * (crooked ? 0.2 : 1)],
    ];

    const samples = Math.max(6, Math.round(16 * detail));
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
    if (crooked) addRock();

    const top = points[points.length - 1];

    if (foliageKind === 'conical') {
      coniferAxis = points;
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
      const tiltMax = habit === 'column' ? 0.72 : habit === 'crooked' ? 1.15 : spread;
      const tilt = range(rng, 0.62, tiltMax);
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
    // Тип хвойного выбирается сидом: ель, пихта или сосна. У каждого свой
    // профиль ярусов, поэтому «ёлки» перестают быть одной формой.
    const type = conifer ?? pick(rng, ['spruce', 'spruce', 'fir', 'pine']);
    const preset = CONIFERS[type];
    const tiers = Math.max(4, Math.round(preset.tiers * detail));
    const phase = range(rng, 0, Math.PI * 2);
    const drift = range(rng, -1, 1) * preset.drift * height;
    const axis = coniferAxis ?? [[0, 0, 0], [0, height, 0]];
    const axisAt = (value) => axis[Math.round(value * (axis.length - 1))];

    for (let tier = 0; tier < tiers; tier++) {
      const t = tiers > 1 ? tier / (tiers - 1) : 1;
      const y = height * (preset.bare + (1 - preset.bare) * t);
      const ringRadius = height * preset.radius * Math.pow(1 - t, preset.taper) * density;
      const axisPoint = axisAt(preset.bare + (1 - preset.bare) * t);
      const centerX = axisPoint[0] + Math.sin(t * 2.7 + phase) * drift;
      const centerZ = axisPoint[2] + Math.cos(t * 2.1 + phase) * drift * 0.5;

      // Внизу ветвей больше, у вершины — меньше; сосна растёт редкими пучками
      // вокруг ствола, но с плотной сердцевиной кроны.
      const branches = type === 'pine'
        ? Math.max(3, Math.round((5 + (1 - t) * 2) * detail))
        : Math.max(6, Math.round((9 + (1 - t) * 6) * detail));

      for (let i = 0; i < branches; i++) {
        const angle = (i / branches) * Math.PI * 2 + tier * 0.8 + range(rng, -0.2, 0.2);
        const reach = ringRadius * range(rng, 1 - preset.spread * 0.25, 1 + preset.spread * 0.2);
        const px = centerX + Math.cos(angle) * reach;
        const pz = centerZ + Math.sin(angle) * reach;
        // Кончик ветки провисает: у ели сильнее, у пихты почти нет.
        const py = y - preset.droop * height * (0.35 + 0.65 * (reach / (ringRadius + 1e-6)));
        const size = height * range(rng, 0.035, 0.056) * (0.85 + (1 - t) * 0.45);

        addLeafDisc([px, py, pz], size, false);

        // Второй диск ниже и дальше от ствола: ветка растрёпанная, а не бусина.
        if (rng() < (type === 'pine' ? 0.9 : 0.55)) {
          addLeafDisc(
            [
              px + Math.cos(angle) * size * 0.9,
              py - size * range(rng, 0.35, 0.8),
              pz + Math.sin(angle) * size * 0.9,
            ],
            size * range(rng, 0.6, 0.85),
            false,
          );
        }
      }

      // Сосна: плотная сердцевина кроны, иначе редкие пучки висят в воздухе.
      if (type === 'pine') {
        addLeafDisc([centerX, y, centerZ], height * 0.055 * density, false);
      }
    }

    // Макушка: короткий побег, а не шар и не торчащий ствол.
    const crown = axisAt(1);
    addLeafDisc([crown[0], height * 1.005, crown[2]], height * 0.045 * (0.8 + detail * 0.3), false);
  }

  // --- Крона-оболочка (для лиственных) -----------------------------------

  if (foliageKind !== 'conical') {
    addCanopyShell(clusterCount);
  }

  if (habit === 'weeping') addWeepingStrands(Math.round(16 * detail));

  if (isSpring) addBlossoms(Math.round(clusterCount * 1.4));
  if (isAutumn) addFallingLeaves(Math.round(8 * detail));

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

  return { kind: 'tree', seed, height, foliage: foliageKind, season, habit, polys, bounds: { min, max } };
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
