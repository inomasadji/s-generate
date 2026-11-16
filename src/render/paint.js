import { LOGICAL_SIZE } from './layout.js';

/**
 * Растеризация display list. Слой намеренно тонкий: ни форм, ни случайности.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {import('./build.js').DisplayList} displayList
 * @param {import('./layout.js').View} view
 */
export function paint(ctx, displayList, view) {
  const dpr = view.dpr;

  // 1. Фон — на всю площадь окна, в CSS-пикселях.
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = displayList.backdrop;
  ctx.fillRect(0, 0, view.cssWidth, view.cssHeight);

  // 2. Сцена — квадрат по центру, дальше рисуем в логических единицах.
  ctx.setTransform(
    dpr * view.scale, 0,
    0, dpr * view.scale,
    dpr * view.originX, dpr * view.originY,
  );
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, LOGICAL_SIZE, LOGICAL_SIZE);
  ctx.clip();

  // Полигоны появятся здесь на M1: заливка + обводка тем же цветом.

  ctx.restore();
}
