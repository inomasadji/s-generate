import { mixColor, shadeColor } from '../core/color.js';
import { add, clamp, cross, dot, length, normalize, scale, sub } from '../core/math.js';
import { createNoise } from '../core/noise.js';
import { getPalette } from '../core/palette.js';
import { int, pick, range, rngStream, chance } from '../core/rng.js';
import { sampleSpline, splinePoint, splineTangent } from '../core/spline.js';

const VERTICAL = 14;
const RADIAL = 32;
const PROFILE_STEPS = 8;
const SEGMENTS = 40;

const CAP_SHAPES = ['convex', 'flat', 'umbonate', 'funnel'];

/**
 * Крайние формы. Умножители применяются к базовым параметрам, поэтому сид
 * всё равно влияет на всё остальное.
 */
const PRESETS = {
  classic: {},
  parasol: { height: 1.35, stemRadius: 0.65, capRadius: 1.15, capProfile: 'flat', spotCount: 0 },
  porcini: { height: 0.78, stemRadius: 1.95, capRadius: 0.88, capProfile: 'convex', spotCount: 0 },
  amanita: { capRadius: 1.05, spotCount: 12, ring: true, capProfile: 'convex' },
};

/**
 * Гриб: ножка-свип, шляпка-вращение с тремя слоями шума, пятна.
 * Всё в локальных координатах, основание — в `y = 0`.
 *
 * @param {{ seed?: string,
 *           palette?: import('../core/palette.js').Palette,
 *           params?: Record<string, number | string> }} [options]
 * @returns {{ kind: string, seed: string, height: number,
 *             polys: Array<Record<string, unknown>>,
 *             bounds: { min: number[], max: number[] } }}
 */
export function buildMushroom(options = {}) {
  const {
    seed = 'demo',
    palette = getPalette('paper'),
    params = {},
  } = options;

  const rng = rngStream(seed, 'mushroom');
  const noise = createNoise(rngStream(seed, 'noise'));

  const preset = PRESETS[params.shape] ?? {};
  const baseHeight = Number(params.height ?? range(rng, 0.95, 1.45));
  const baseStemRadius = Number(params.stemRadius ?? range(rng, 0.06, 0.11));
  const baseCapRadius = Number(params.capRadius ?? range(rng, 0.55, 0.95));

  const height = baseHeight * (preset.height ?? 1);
  const stemRadius = baseStemRadius * (preset.stemRadius ?? 1);
  const capRadius = baseCapRadius * (preset.capRadius ?? 1);
  const lean = Number(params.lean ?? range(rng, -0.22, 0.2));
  const stemNoise = Number(params.stemNoise ?? range(rng, 0.05, 0.14));
  const capProfile = String(params.capProfile ?? preset.capProfile ?? pick(rng, CAP_SHAPES));
  const radialNoise = Number(params.radialNoise ?? range(rng, 0.1, 0.24));
  const angularNoise = Number(params.angularNoise ?? range(rng, 0.02, 0.09));
  const orthNoise = Number(params.orthNoise ?? range(rng, 0.04, 0.12));
  const spotCount = Number(params.spotCount ?? preset.spotCount ?? int(rng, 0, 12));
  const hasRing = params.ring ?? preset.ring ?? chance(rng, 0.45);

  // Детализация: сцена рисует мелкие грибы грубее, чем плашка крупным планом.
  const detail = clamp(Number(params.detail ?? 1), 0.4, 1.5);
  const verticalSegments = Math.max(8, Math.round(VERTICAL * detail));
  const radialSegments = Math.max(10, Math.round(RADIAL * detail));
  const profileSteps = Math.max(5, Math.round(PROFILE_STEPS * detail));
  const capSegments = Math.max(16, Math.round(SEGMENTS * detail));

  const polys = [];
  const centerY = height * 0.55;

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
  function outwardNormal(pts) {
    let normal = normalize(cross(sub(pts[1], pts[0]), sub(pts[2], pts[0])));
    if (length(normal) < 1e-9) normal = [0, 1, 0];

    const center = centroid(pts);
    if (dot(normal, [center[0], center[1] - centerY, center[2]]) < 0) {
      normal = scale(normal, -1);
    }
    return normal;
  }

  /**
   * @param {number[][]} pts
   * @param {number[]} baseColor
   * @param {string} group
   * @param {number} layer
   */
  function pushPoly(pts, baseColor, group, layer) {
    const normal = outwardNormal(pts);
    polys.push({
      pts,
      color: shadeColor(baseColor, normal),
      normal,
      group,
      layer,
    });
  }

  // --- Ножка -------------------------------------------------------------

  const axis = [
    [0, 0, 0],
    [range(rng, -0.07, 0.07), height * 0.28, range(rng, -0.06, 0.06)],
    [lean * 0.45, height * 0.56, range(rng, -0.04, 0.04)],
    [lean * 0.9, height * 0.86, 0],
    [lean, height, 0],
  ];

  /** @param {number} angle @param {number} t */
  function stipeRadius(angle, t) {
    // У земли ножка чуть расширяется, к шляпке сужается.
    const taper = 1.3 - 0.55 * t + 0.08 * Math.exp(-t * 10);
    const grain = 1 + stemNoise * (1 - t) *
      noise.perlin2(Math.cos(angle) * 1.7 + 5.1, t * 2.2 + 9.3);
    return stemRadius * taper * grain;
  }

  /** @param {number} t */
  function stipeRing(t) {
    const axisPoint = splinePoint(axis, t);
    const section = [0, 1, 2, 3].map((k) => {
      const angle = (k * Math.PI) / 2;
      const radius = stipeRadius(angle, t);
      return [Math.cos(angle) * radius, 0, Math.sin(angle) * radius];
    });

    return sampleSpline(section, radialSegments, { closed: true, tension: 0.75 })
      .map((point) => [
        axisPoint[0] + point[0],
        axisPoint[1],
        axisPoint[2] + point[2],
      ]);
  }

  const rings = Array.from({ length: verticalSegments + 1 }, (_, index) => stipeRing(index / verticalSegments));

  for (let i = 0; i < verticalSegments; i++) {
    const t = i / verticalSegments;
    const baseColor = mixColor(palette.stem, palette.shade, (1 - t) * 0.18);

    for (let j = 0; j < radialSegments; j++) {
      const next = (j + 1) % radialSegments;
      pushPoly(
        [rings[i][j], rings[i][next], rings[i + 1][next], rings[i + 1][j]],
        baseColor,
        'stipe',
        0,
      );
    }
  }

  // --- Юбка (annulus) ----------------------------------------------------

  if (hasRing) {
    // Юбка ниже середины ножки: у шляпки широкий навес, и у самой шляпки
    // кольцо просто прячется под ним.
    const t = 0.5;
    const axisPoint = splinePoint(axis, t);
    const ringColor = mixColor(palette.spot, palette.shade, 0.25);
    const inner = [];
    const outer = [];

    for (let j = 0; j < radialSegments; j++) {
      const angle = (j / radialSegments) * Math.PI * 2;
      const radius = stipeRadius(angle, t);
      inner.push([
        axisPoint[0] + Math.cos(angle) * radius * 1.04,
        axisPoint[1] + 0.02,
        axisPoint[2] + Math.sin(angle) * radius * 1.04,
      ]);
      outer.push([
        axisPoint[0] + Math.cos(angle) * radius * 2.1,
        axisPoint[1] - 0.07,
        axisPoint[2] + Math.sin(angle) * radius * 2.1,
      ]);
    }

    for (let j = 0; j < radialSegments; j++) {
      const next = (j + 1) % radialSegments;
      pushPoly([inner[j], outer[j], outer[next], inner[next]], ringColor, 'ring', 1);
    }
  }

  // --- Шляпка ------------------------------------------------------------

  const capTop = height + 0.02;
  const dome = { convex: 0.62, umbonate: 0.76, flat: 0.4, funnel: 0.5 }[capProfile] ?? 0.6;
  const rimDrop = { convex: 0.12, umbonate: 0.08, flat: 0.05, funnel: 0.16 }[capProfile] ?? 0.1;
  const centerDip = capProfile === 'funnel' ? -0.22 : 0;

  const profile = [
    [0, capTop + capRadius * (dome + centerDip), 0],
    [capRadius * 0.42, capTop + capRadius * dome * 0.98, 0],
    [capRadius * 0.78, capTop + capRadius * dome * 0.55, 0],
    [capRadius * 0.96, capTop + capRadius * dome * 0.12, 0],
    [capRadius, capTop - capRadius * rimDrop, 0],
  ];

  /**
   * Точка шляпки: радиальный, угловой и ортогональный шум, как в исходной
   * статье, но в собственных координатах.
   *
   * @param {number} angle
   * @param {number} t
   * @returns {number[]}
   */
  function capPoint(angle, t) {
    const nx = Math.cos(angle) * t;
    const ny = Math.sin(angle) * t;

    const radial = -Math.abs(noise.perlin2(nx * 2.2 + 11.3, ny * 2.2 + 5.7)) * radialNoise;
    const tc = clamp(t * (1 + radial), 0, 1);

    const shapePoint = splinePoint(profile, tc);
    const tangent = splineTangent(profile, tc);
    const orthRadial = -tangent[1];
    const orthUp = tangent[0];

    const warped = angle + noise.perlin2(nx * 1.7 + 31.1, ny * 1.7 + 23.9) * angularNoise;
    const orth = noise.perlin2(nx * 2.9 + 47.7, ny * 2.9 + 7.3) * orthNoise * tc;

    const radius = Math.max(0.001, shapePoint[0] + orthRadial * orth);
    const y = shapePoint[1] + orthUp * orth;

    return [Math.cos(warped) * radius, y, Math.sin(warped) * radius];
  }

  const capColor = (t) => mixColor(palette.cap, palette.capShade, t * 0.5);
  const center = capPoint(0, 0);

  const capRings = [];
  for (let i = 1; i <= profileSteps; i++) {
    const ring = new Array(capSegments);
    for (let j = 0; j < capSegments; j++) {
      ring[j] = capPoint((j / capSegments) * Math.PI * 2, i / profileSteps);
    }
    capRings.push(ring);
  }

  for (let j = 0; j < capSegments; j++) {
    const next = (j + 1) % capSegments;
    pushPoly([center, capRings[0][j], capRings[0][next]], capColor(0.5 / profileSteps), 'pileus', 2);
  }

  for (let i = 0; i < profileSteps - 1; i++) {
    const t = (i + 1.5) / profileSteps;
    for (let j = 0; j < capSegments; j++) {
      const next = (j + 1) % capSegments;
      pushPoly(
        [capRings[i][j], capRings[i + 1][j], capRings[i + 1][next], capRings[i][next]],
        capColor(t),
        'pileus',
        2,
      );
    }
  }

  // --- Пятна -------------------------------------------------------------

  for (let index = 0; index < spotCount; index++) {
    const angle = range(rng, 0, Math.PI * 2);
    const t = range(rng, 0.18, 0.86);
    const spotCenter = capPoint(angle, t);

    let normal = normalize(cross(
      sub(capPoint(angle + 0.02, t), spotCenter),
      sub(capPoint(angle, Math.min(1, t + 0.02)), spotCenter),
    ));
    if (length(normal) < 1e-9) normal = [0, 1, 0];
    if (normal[1] < 0) normal = scale(normal, -1);

    const helper = Math.abs(normal[1]) > 0.9 ? [1, 0, 0] : [0, 1, 0];
    const tangentA = normalize(cross(helper, normal));
    const tangentB = normalize(cross(normal, tangentA));
    const radius = range(rng, 0.05, 0.09) * capRadius;
    const lifted = add(spotCenter, scale(normal, 0.008));

    const points = [];
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2;
      points.push(add(lifted, add(
        scale(tangentA, Math.cos(a) * radius),
        scale(tangentB, Math.sin(a) * radius),
      )));
    }

    pushPoly(points, palette.spot, 'spot', 3);
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

  return { kind: 'mushroom', seed, height, polys, bounds: { min, max } };
}
