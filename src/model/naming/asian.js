import { pick, rngStream } from '../../core/rng.js';
import { slugify } from './slug.js';

/**
 * Облака — азиатский уклон: короткие «пиньиньские» слова, обычно два,
 * изредка три. Слоги не повторяются, чтобы не выходило «Yun Yun».
 */

const SYLLABLES = [
  'Yun', 'Shan', 'Hai', 'Tian', 'Long', 'Qing', 'Xiao', 'Mei',
  'Ling', 'Feng', 'Yue', 'Guang', 'Shen', 'Lan', 'Bai', 'Jin',
];

const TAILS = [
  'Shan', 'Hai', 'Yun', 'Feng', 'Tian', 'Ling', 'Yue', 'Guang', 'Long', 'Xiao',
];

/**
 * @param {string} seed
 * @returns {{ full: string, slug: string }}
 */
export function generateAsianName(seed) {
  const rng = rngStream(seed, 'name-asian');
  const first = pick(rng, SYLLABLES);
  let second = pick(rng, TAILS);
  for (let attempt = 0; attempt < 6 && second === first; attempt++) {
    second = pick(rng, TAILS);
  }

  const words = [first, second];
  if (rng() < 0.35) {
    let third = pick(rng, SYLLABLES);
    for (let attempt = 0; attempt < 6 && words.includes(third); attempt++) {
      third = pick(rng, SYLLABLES);
    }
    words.push(third);
  }

  const full = words.join(' ');
  return { full, slug: slugify(full) };
}
