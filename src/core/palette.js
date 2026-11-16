/**
 * Палитры. Цвет — часть стиля, поэтому hex-литералов в генераторах нет:
 * тема задаёт именованные тона, генератор выбирает индексы.
 *
 * @typedef {[number, number, number]} Rgb — sRGB, 0..255
 * @typedef {Record<string, Rgb>} Palette
 */

/** @type {Record<string, Palette>} */
export const PALETTES = Object.freeze({
  // Ботаническая иллюстрация: тёплая бумага, сепия, чернила.
  paper: Object.freeze({
    paper: Object.freeze([232, 224, 208]),
    shade: Object.freeze([206, 196, 178]),
    muted: Object.freeze([140, 128, 112]),
    ink: Object.freeze([38, 34, 32]),
    accent: Object.freeze([168, 84, 60]),
  }),
});

/**
 * Возвращает тему по имени. Неизвестное имя (например, из URL) не должно
 * ронять экран — падаем на `paper`.
 *
 * @param {string} [name]
 * @returns {Palette}
 */
export function getPalette(name = 'paper') {
  return PALETTES[name] ?? PALETTES.paper;
}

/**
 * Цвет в строку CSS. Каналы квантуются до 8 бит — так один и тот же цвет
 * даёт один и тот же css, сколько бы раз его ни считали.
 *
 * @param {Rgb} rgb
 * @param {number} [alpha]
 * @returns {string}
 */
export function css(rgb, alpha = 1) {
  const [r, g, b] = rgb.map((value) => Math.min(255, Math.max(0, Math.round(value))));
  if (alpha >= 1) return `rgb(${r}, ${g}, ${b})`;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
