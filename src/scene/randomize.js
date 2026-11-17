import { PALETTE_IDS } from '../core/palette.js';
import { nextSeed, pick, rngStream } from '../core/rng.js';
import { MUSHROOM_SHAPES } from '../model/mushroom.js';
import { TREE_HABITS } from '../model/tree.js';
import { SPECIMEN_KINDS } from './specimen.js';

/**
 * Бросок «Случайно». Случайность берётся из следующего сида, а не из
 * `Math.random()`: сочетание рода, палитры и характера выводится из того же
 * сида, что стоит в URL, поэтому кадр воспроизводим и тест стабилен.
 *
 * Режим не крутится: в сцене род, форма и характер не видны, и кнопка молча
 * меняла бы то, чего на экране нет.
 *
 * @param {{ seed: string, mode: string, kind: string, palette: string,
 *           shape?: string, habit?: string }} current
 * @returns {typeof current}
 */
export function rollVariant(current) {
  const seed = nextSeed(current.seed);
  const rng = rngStream(seed, 'dice');

  if (current.mode === 'scene') {
    return { ...current, seed, palette: pick(rng, PALETTE_IDS) };
  }

  const kind = pick(rng, SPECIMEN_KINDS);

  return {
    ...current,
    seed,
    kind,
    palette: pick(rng, PALETTE_IDS),
    // Форма есть только у гриба, характер — только у дерева.
    shape: kind === 'mushroom' ? pick(rng, MUSHROOM_SHAPES) : undefined,
    habit: kind === 'tree' ? pick(rng, TREE_HABITS) : undefined,
  };
}
