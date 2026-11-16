import { pick, rngStream } from '../../core/rng.js';
import { slugify } from './slug.js';

/**
 * Горы — кельтский уклон: Ben, Càrn, Sgùrr и определения-эпитеты,
 * которые в гэльских названиях означают цвет, высоту или характер склона.
 */

const PREFIXES = [
  'Ben', 'Beinn', 'Càrn', 'Carn', 'Sgùrr', 'Dun', 'Craig', 'Torr', 'Glen', 'Aonach',
];

const EPITHETS = [
  'Dubh', 'Bàn', 'Dearg', 'Glas', 'Liath', 'Ruadh', 'Mòr', 'Beag',
  'Cuach', 'Sgàil', 'Bhealaich', 'Choire', 'Mhàir', 'Odhar',
];

/**
 * @param {string} seed
 * @returns {{ full: string, slug: string }}
 */
export function generateCelticName(seed) {
  const rng = rngStream(seed, 'name-celtic');
  const prefix = pick(rng, PREFIXES);
  let epithet = pick(rng, EPITHETS);

  // Изредка добавляем гэльское окончание — названия перестают быть
  // двумя списками, склеенными наугад.
  if (rng() < 0.3) epithet += 'ach';

  return {
    full: `${prefix} ${epithet}`,
    slug: slugify(`${prefix} ${epithet}`),
  };
}
