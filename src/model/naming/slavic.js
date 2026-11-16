import { pick, rngStream } from '../../core/rng.js';
import { slugify } from './slug.js';

/**
 * Холмы — славянский уклон: прилагательное согласуется с родом
 * существительного, иначе «Тихая Курган» выдаёт генератор.
 */

const ADJECTIVES = [
  { m: 'Тихий', f: 'Тихая', n: 'Тихое' },
  { m: 'Красный', f: 'Красная', n: 'Красное' },
  { m: 'Студёный', f: 'Студёная', n: 'Студёное' },
  { m: 'Зелёный', f: 'Зелёная', n: 'Зелёное' },
  { m: 'Крутой', f: 'Крутая', n: 'Крутое' },
  { m: 'Седой', f: 'Седая', n: 'Седое' },
  { m: 'Ветреный', f: 'Ветреная', n: 'Ветреное' },
  { m: 'Дремлющий', f: 'Дремлющая', n: 'Дремлющее' },
  { m: 'Ржаный', f: 'Ржаная', n: 'Ржаное' },
];

const NOUNS = [
  { word: 'Холм', gender: 'm' },
  { word: 'Курган', gender: 'm' },
  { word: 'Вал', gender: 'm' },
  { word: 'Взгорок', gender: 'm' },
  { word: 'Гряда', gender: 'f' },
  { word: 'Вершина', gender: 'f' },
  { word: 'Покатость', gender: 'f' },
  { word: 'Всхолмье', gender: 'n' },
  { word: 'Взгорье', gender: 'n' },
];

/**
 * @param {string} seed
 * @returns {{ full: string, slug: string }}
 */
export function generateSlavicName(seed) {
  const rng = rngStream(seed, 'name-slavic');
  const adjective = pick(rng, ADJECTIVES);
  const noun = pick(rng, NOUNS);
  const full = `${adjective[noun.gender]} ${noun.word}`;

  return { full, slug: slugify(full) };
}
