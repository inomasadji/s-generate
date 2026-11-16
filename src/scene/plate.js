import { rngStream, range } from '../core/rng.js';
import { buildMushroom } from '../model/mushroom.js';
import { generateName } from '../model/naming/naming.js';

/**
 * Плашка — один объект на «бумаге» с рамкой и подписью.
 * Мир у плашки и сцены общий: отличается только композиция.
 *
 * @param {{ seed?: string, palette: import('../core/palette.js').Palette }} options
 * @returns {{ mode: 'plate', kind: string, seed: string,
 *             palette: object, shape: object,
 *             name: { genus: string, species: string, full: string, slug: string },
 *             camera: { yaw: number, pitch: number } }}
 */
export function buildPlate(options) {
  const { seed = 'demo', palette } = options;
  const cameraRng = rngStream(seed, 'camera');

  return {
    mode: 'plate',
    kind: 'mushroom',
    seed,
    palette,
    shape: buildMushroom({ seed, palette }),
    name: generateName(seed),
    // Небольшой разброс ракурса: плашки не должны быть близнецами.
    camera: {
      yaw: range(cameraRng, -0.48, -0.16),
      pitch: range(cameraRng, 0.12, 0.24),
    },
  };
}
