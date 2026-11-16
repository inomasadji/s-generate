import { dot, normalize } from './math.js';

/**
 * Один источник света на всю сцену: сверху-слева-спереди. Направление
 * зафиксировано в мире, поэтому один и тот же объект светится одинаково
 * в плашке и в сцене.
 */
export const DEFAULT_LIGHT = normalize([-0.45, 0.8, 0.55]);

/** @typedef {[number, number, number]} Rgb */

/**
 * Плоское затенение с квантованием: 6 ступеней дают «нарисованный» вид
 * и стабильный хэш кадра.
 *
 * @param {Rgb} base
 * @param {number[]} normal
 * @param {number[]} [light]
 * @returns {Rgb}
 */
export function shadeColor(base, normal, light = DEFAULT_LIGHT) {
  const n = normalize(normal);
  const lambert = Math.max(0, Math.min(1, dot(n, light)));
  const step = Math.round((0.25 + 0.75 * lambert) * 5) / 5;
  const factor = 0.55 + 0.5 * step;

  return /** @type {Rgb} */ (
    base.map((channel) => Math.min(255, Math.round(channel * factor)))
  );
}

/**
 * Линейное смешение цветов: нужно для перехода шляпки от центра к краю.
 *
 * @param {Rgb} a
 * @param {Rgb} b
 * @param {number} t
 * @returns {Rgb}
 */
export function mixColor(a, b, t) {
  const k = Math.max(0, Math.min(1, t));
  return /** @type {Rgb} */ ([
    Math.round(a[0] + (b[0] - a[0]) * k),
    Math.round(a[1] + (b[1] - a[1]) * k),
    Math.round(a[2] + (b[2] - a[2]) * k),
  ]);
}
