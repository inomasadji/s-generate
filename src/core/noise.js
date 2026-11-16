/**
 * Шум Перлина. Таблица перестановок строится из явного RNG, поэтому шум
 * детерминирован и не зависит от глобального состояния.
 */

const S = Math.SQRT1_2;

// Восемь единичных направлений: изотропнее, чем «плюс/минус», и без делений.
const GRADIENTS = [
  [1, 0], [-1, 0], [0, 1], [0, -1],
  [S, S], [-S, S], [S, -S], [-S, -S],
];

/**
 * @param {() => number} rng
 * @returns {{ perlin2: (x: number, y: number) => number,
 *             fbm2: (x: number, y: number, options?: { octaves?: number,
 *               lacunarity?: number, gain?: number }) => number }}
 */
export function createNoise(rng) {
  const source = new Uint8Array(256);
  for (let i = 0; i < 256; i++) source[i] = i;

  // Перестановка Фишера–Йетса: одна и та же для одного и того же RNG.
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = source[i];
    source[i] = source[j];
    source[j] = tmp;
  }

  const perm = new Uint8Array(512);
  for (let i = 0; i < 512; i++) perm[i] = source[i & 255];

  const fade = (t) => t * t * t * (t * (t * 6 - 15) + 10);
  const mix = (a, b, t) => a + (b - a) * t;

  function grad(hash, x, y) {
    const g = GRADIENTS[hash & 7];
    return g[0] * x + g[1] * y;
  }

  /** @returns {number} примерно в [-1, 1] */
  function perlin2(x, y) {
    const x0 = Math.floor(x);
    const y0 = Math.floor(y);
    const xf = x - x0;
    const yf = y - y0;
    const X = x0 & 255;
    const Y = y0 & 255;
    const u = fade(xf);
    const v = fade(yf);

    const aa = perm[perm[X] + Y];
    const ab = perm[perm[X] + Y + 1];
    const ba = perm[perm[X + 1] + Y];
    const bb = perm[perm[X + 1] + Y + 1];

    const top = mix(grad(aa, xf, yf), grad(ba, xf - 1, yf), u);
    const bottom = mix(grad(ab, xf, yf - 1), grad(bb, xf - 1, yf - 1), u);
    const value = mix(top, bottom, v) * 1.414;

    return value < -1 ? -1 : value > 1 ? 1 : value;
  }

  /**
   * Фрактальный шум: несколько октав с затуханием.
   * @param {number} x
   * @param {number} y
   * @param {{ octaves?: number, lacunarity?: number, gain?: number }} [options]
   * @returns {number}
   */
  function fbm2(x, y, options = {}) {
    const { octaves = 4, lacunarity = 2, gain = 0.5 } = options;
    let amplitude = 1;
    let frequency = 1;
    let sum = 0;
    let norm = 0;

    for (let i = 0; i < octaves; i++) {
      sum += perlin2(x * frequency, y * frequency) * amplitude;
      norm += amplitude;
      amplitude *= gain;
      frequency *= lacunarity;
    }

    return norm > 0 ? sum / norm : 0;
  }

  return { perlin2, fbm2 };
}
