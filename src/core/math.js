/**
 * Векторная математика без классов и аллокаций на каждую операцию:
 * точки — обычные массивы `[x, y, z]`.
 *
 * @typedef {number[]} Vec3
 */

/**
 * @param {number} [x]
 * @param {number} [y]
 * @param {number} [z]
 * @returns {Vec3}
 */
export function vec3(x = 0, y = 0, z = 0) {
  return [x, y, z];
}

/**
 * @param {Vec3} a
 * @param {Vec3} b
 * @returns {Vec3}
 */
export function add(a, b) {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
}

/**
 * @param {Vec3} a
 * @param {Vec3} b
 * @returns {Vec3}
 */
export function sub(a, b) {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

/**
 * @param {Vec3} a
 * @param {number} k
 * @returns {Vec3}
 */
export function scale(a, k) {
  return [a[0] * k, a[1] * k, a[2] * k];
}

/**
 * @param {Vec3} a
 * @param {Vec3} b
 * @returns {number}
 */
export function dot(a, b) {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

/**
 * @param {Vec3} a
 * @param {Vec3} b
 * @returns {Vec3}
 */
export function cross(a, b) {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];
}

/**
 * @param {Vec3} a
 * @returns {number}
 */
export function length(a) {
  return Math.hypot(a[0], a[1], a[2]);
}

/**
 * Нулевой вектор остаётся нулевым: лучше явный ноль, чем NaN в геометрии.
 * @param {Vec3} a
 * @returns {Vec3}
 */
export function normalize(a) {
  const len = length(a);
  return len > 1e-9 ? [a[0] / len, a[1] / len, a[2] / len] : [0, 0, 0];
}

/**
 * @param {number} a
 * @param {number} b
 * @param {number} t
 * @returns {number}
 */
export function lerp(a, b, t) {
  return a + (b - a) * t;
}

/**
 * @param {Vec3} a
 * @param {Vec3} b
 * @param {number} t
 * @returns {Vec3}
 */
export function lerpVec3(a, b, t) {
  return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
}

/**
 * @param {number} value
 * @param {number} lo
 * @param {number} hi
 * @returns {number}
 */
export function clamp(value, lo, hi) {
  return value < lo ? lo : value > hi ? hi : value;
}
