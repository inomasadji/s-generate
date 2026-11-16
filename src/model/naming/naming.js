import { pick, int, rngStream } from '../../core/rng.js';
import { ENDINGS, ONSETS, VOWELS } from './syllables.js';
import { slugify } from './slug.js';

export { slugify };

/**
 * Слоговый генератор латинских названий. Цепь Маркова из исходной статьи
 * здесь избыточна: слогов хватает, данных — пара килобайт, зависимостей — ноль.
 *
 * @param {() => number} rng
 * @param {Set<string>} used
 * @returns {string}
 */
function syllable(rng, used) {
  for (let attempt = 0; attempt < 12; attempt++) {
    const value = pick(rng, ONSETS) + pick(rng, VOWELS);
    if (!used.has(value)) {
      used.add(value);
      return value;
    }
  }
  return pick(rng, ONSETS) + pick(rng, VOWELS);
}

/**
 * @param {() => number} rng
 * @param {number} count
 * @returns {string}
 */
function buildWord(rng, count) {
  const used = new Set();
  let word = '';

  for (let i = 0; i < count; i++) word += syllable(rng, used);

  // На стыке слова и окончания не должно получиться трёх гласных подряд
  // («…o» + «ae» = «oae»): латынь так не выглядит, и читать это тяжело.
  let ending = pick(rng, ENDINGS);
  for (let attempt = 0; attempt < 10 && /[aeiou]{3}/.test(word + ending); attempt++) {
    ending = pick(rng, ENDINGS);
  }
  if (/[aeiou]{3}/.test(word + ending)) ending = 'nus';

  return word + ending;
}

/**
 * @param {string} word
 * @returns {string}
 */
function capitalize(word) {
  return word.charAt(0).toUpperCase() + word.slice(1);
}

/**
 * Название вида: род + видовой эпитет, как в ботанике.
 *
 * @param {string} seed
 * @returns {{ genus: string, species: string, full: string, slug: string }}
 */
export function generateName(seed) {
  const rng = rngStream(seed, 'name');

  const genus = capitalize(buildWord(rng, int(rng, 2, 3)));
  const species = buildWord(rng, 2);

  return {
    genus,
    species,
    full: `${genus} ${species}`,
    slug: `${slugify(genus)}-${slugify(species)}`,
  };
}
