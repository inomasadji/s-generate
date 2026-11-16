/**
 * Ортографическая камера. Перспективы нет намеренно: картинка не зависит
 * от размера холста, а плашка и сцена используют один код.
 *
 * @typedef {{ cy: number, sy: number, cp: number, sp: number }} Camera
 */

/**
 * @param {{ yaw?: number, pitch?: number }} [options]
 * @returns {Camera}
 */
export function createCamera(options = {}) {
  const { yaw = -0.32, pitch = 0.18 } = options;

  return {
    cy: Math.cos(yaw),
    sy: Math.sin(yaw),
    cp: Math.cos(pitch),
    sp: Math.sin(pitch),
  };
}

/**
 * Мир → пространство камеры. `z` больше — ближе к зрителю.
 *
 * @param {number[]} point
 * @param {Camera} camera
 * @returns {[number, number, number]}
 */
export function projectPoint(point, camera) {
  const x1 = point[0] * camera.cy + point[2] * camera.sy;
  const z1 = -point[0] * camera.sy + point[2] * camera.cy;
  const y1 = point[1];

  return [
    x1,
    y1 * camera.cp - z1 * camera.sp,
    y1 * camera.sp + z1 * camera.cp,
  ];
}
