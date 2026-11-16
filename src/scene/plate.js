import { buildSpecimen } from './specimen.js';

/**
 * Плашка гриба — частный случай общей плашки. Оставлено как удобный вход
 * для тестов и внешних вызовов; приложение использует `buildSpecimen`.
 *
 * @param {{ seed?: string, palette: import('../core/palette.js').Palette,
 *           shape?: string }} options
 */
export function buildPlate(options) {
  return buildSpecimen({ ...options, kind: 'mushroom' });
}
