import { clamp, normalize, sub } from './math.js';

/**
 * Сегмент Катмулла-Рома в форме Эрмита. Работает для точки любой размерности,
 * поэтому годится и для 3D-оси, и для 2D-профиля.
 *
 * @param {number[]} p0
 * @param {number[]} p1
 * @param {number[]} p2
 * @param {number[]} p3
 * @param {number} t 0..1 внутри сегмента p1..p2
 * @param {number} [tension] 0.5 — классическая кривая
 * @returns {number[]}
 */
export function catmullRom(p0, p1, p2, p3, t, tension = 0.5) {
  const t2 = t * t;
  const t3 = t2 * t;
  const out = new Array(p1.length);

  for (let i = 0; i < p1.length; i++) {
    const m1 = (p2[i] - p0[i]) * tension;
    const m2 = (p3[i] - p1[i]) * tension;
    out[i] =
      (2 * t3 - 3 * t2 + 1) * p1[i] +
      (t3 - 2 * t2 + t) * m1 +
      (-2 * t3 + 3 * t2) * p2[i] +
      (t3 - t2) * m2;
  }

  return out;
}

/**
 * Точка на сплайне по нормированному `t` в `[0, 1]`.
 *
 * @param {number[][]} points
 * @param {number} t
 * @param {{ closed?: boolean, tension?: number }} [options]
 * @returns {number[]}
 */
export function splinePoint(points, t, options = {}) {
  const { closed = false, tension = 0.5 } = options;
  const count = points.length;

  if (count === 0) return [];
  if (count === 1) return [...points[0]];

  const segments = closed ? count : count - 1;
  const clamped = clamp(t, 0, 1);
  const seg = Math.min(Math.floor(clamped * segments), segments - 1);
  const local = clamped * segments - seg;

  if (closed) {
    return catmullRom(
      points[(seg - 1 + count) % count],
      points[seg % count],
      points[(seg + 1) % count],
      points[(seg + 2) % count],
      local,
      tension,
    );
  }

  return catmullRom(
    points[Math.max(0, seg - 1)],
    points[seg],
    points[Math.min(count - 1, seg + 1)],
    points[Math.min(count - 1, seg + 2)],
    local,
    tension,
  );
}

/**
 * Равномерная выборка сплайна.
 * Для открытой кривой возвращает `steps + 1` точку (включая концы),
 * для замкнутой — `steps` точек без дубликата первой.
 *
 * @param {number[][]} points
 * @param {number} steps
 * @param {{ closed?: boolean, tension?: number }} [options]
 * @returns {number[][]}
 */
export function sampleSpline(points, steps, options = {}) {
  const { closed = false } = options;
  const total = closed ? steps : steps + 1;
  const out = new Array(total);

  for (let i = 0; i < total; i++) {
    out[i] = splinePoint(points, i / steps, options);
  }

  return out;
}

/**
 * Единичная касательная через конечную разность: для профиля шляпки этого
 * достаточно, а аналитическая производная — лишний код.
 *
 * @param {number[][]} points
 * @param {number} t
 * @param {{ closed?: boolean, tension?: number }} [options]
 * @returns {number[]}
 */
export function splineTangent(points, t, options = {}) {
  const eps = 1e-4;
  const before = splinePoint(points, Math.max(0, t - eps), options);
  const after = splinePoint(points, Math.min(1, t + eps), options);
  return normalize(sub(after, before));
}
