/**
 * Логическая сцена — квадрат LOGICAL_SIZE единиц. Экран лишь подбирает масштаб,
 * поэтому геометрия не зависит ни от размера окна, ни от devicePixelRatio.
 */

/** Сторона логической сцены в условных единицах. */
export const LOGICAL_SIZE = 720;

/**
 * @typedef {object} View
 * @property {number} cssWidth   ширина окна в CSS-пикселях
 * @property {number} cssHeight  высота окна в CSS-пикселях
 * @property {number} pixelWidth ширина буфера canvas
 * @property {number} pixelHeight высота буфера canvas
 * @property {number} dpr        плотность пикселей
 * @property {number} scale      CSS-пикселей на логическую единицу
 * @property {number} originX    левый отступ сцены в CSS-пикселях
 * @property {number} originY    верхний отступ сцены в CSS-пикселях
 * @property {number} side       сторона сцены в CSS-пикселях
 */

/**
 * Раскладывает квадратную сцену по окну: вписывает по меньшей стороне и
 * центрирует. Поля заполняет фон.
 *
 * @param {{width: number, height: number, dpr: number}} viewport
 * @returns {View}
 */
export function layout(viewport) {
  const cssWidth = Math.max(1, viewport.width);
  const cssHeight = Math.max(1, viewport.height);
  const dpr = Math.max(1, viewport.dpr || 1);
  const side = Math.min(cssWidth, cssHeight);

  return {
    cssWidth,
    cssHeight,
    pixelWidth: Math.round(cssWidth * dpr),
    pixelHeight: Math.round(cssHeight * dpr),
    dpr,
    scale: side / LOGICAL_SIZE,
    originX: (cssWidth - side) / 2,
    originY: (cssHeight - side) / 2,
    side,
  };
}
