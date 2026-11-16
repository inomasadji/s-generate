/**
 * Вся случайность проекта идёт отсюда. В `src/` нет `Math.random()`:
 * сид — строка, из неё получается число, из числа — поток.
 */

/**
 * FNV-1a, 32 бита. Хэш используется как сид и как эталон для golden-тестов.
 * @param {string} text
 * @returns {number} uint32
 */
export function hashSeed(text) {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/**
 * mulberry32: быстрый, короткий, детерминированный PRNG.
 * @param {number} seed uint32
 * @returns {() => number} значения в [0, 1)
 */
export function makeRng(seed) {
  let state = seed >>> 0;
  return function next() {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Именованный поток. Одна часть объекта не должна зависеть от того, сколько
 * чисел потратили соседние: `rngStream(seed, 'pileus')` не сдвинется, если
 * появится юбка.
 *
 * @param {string} seed
 * @param {string} name
 * @returns {() => number}
 */
export function rngStream(seed, name) {
  return makeRng(hashSeed(`${seed}:${name}`));
}

/**
 * @param {() => number} rng
 * @param {number} lo
 * @param {number} hi
 * @returns {number}
 */
export function range(rng, lo, hi) {
  return lo + (hi - lo) * rng();
}

/**
 * Целое в `[lo, hi]` включительно.
 * @param {() => number} rng
 * @param {number} lo
 * @param {number} hi
 * @returns {number}
 */
export function int(rng, lo, hi) {
  return lo + Math.floor(rng() * (hi - lo + 1));
}

/**
 * @template T
 * @param {() => number} rng
 * @param {readonly T[]} list
 * @returns {T}
 */
export function pick(rng, list) {
  return list[Math.floor(rng() * list.length)];
}

/**
 * @param {() => number} rng
 * @param {number} probability
 * @returns {boolean}
 */
export function chance(rng, probability) {
  return rng() < probability;
}

/**
 * Нормальное распределение (Бокс–Мюллер).
 * @param {() => number} rng
 * @param {number} [mean]
 * @param {number} [sd]
 * @returns {number}
 */
export function gauss(rng, mean = 0, sd = 1) {
  const u = 1 - rng();
  const v = rng();
  return mean + sd * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}
