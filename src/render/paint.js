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

  // 3. Слои: сначала все полигоны слоя, потом контур силуэта этого слоя.
  //    Так спрятанный контур (верх ножки под шляпкой) не просвечивает.
  let start = 0;
  while (start < displayList.items.length) {
    let end = start + 1;
    while (end < displayList.items.length &&
           displayList.items[end].layer === displayList.items[start].layer) {
      end++;
    }

    const layerItems = displayList.items.slice(start, end);

    // Контур рисуем ДО заливки и вдвое толще: полигоны закрывают внутренние
    // рёбра, а снаружи остаётся половина линии. Иначе скрытые рёбра (дальний
    // край шляпки) просвечивают сквозь объект.
    drawSilhouette(ctx, layerItems, displayList.ink, 2.4);

    for (const item of layerItems) {
      ctx.beginPath();
      ctx.moveTo(item.pts[0][0], item.pts[0][1]);
      for (let i = 1; i < item.pts.length; i++) {
        ctx.lineTo(item.pts[i][0], item.pts[i][1]);
      }
      ctx.closePath();

      ctx.fillStyle = item.color;
      ctx.fill();

      // Обводка тем же цветом закрывает щели между соседними полигонами.
      ctx.strokeStyle = item.color;
      ctx.lineWidth = 0.6;
      ctx.stroke();
    }

    start = end;
  }

  if (displayList.overlay) drawPlate(ctx, displayList.overlay);

  ctx.restore();
}

/**
 * Рамка, орнамент и подпись. Рисуется в логических единицах поверх сцены.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {{ frame: { x: number, y: number, width: number, height: number, inset: number },
 *           title: string, subtitle: string,
 *           colors: { ink: string, muted: string, accent: string } }} overlay
 */
function drawPlate(ctx, overlay) {
  const { frame, colors } = overlay;
  const cx = frame.x + frame.width / 2;

  ctx.strokeStyle = colors.ink;
  ctx.lineWidth = 1.6;
  ctx.strokeRect(frame.x, frame.y, frame.width, frame.height);

  ctx.globalAlpha = 0.55;
  ctx.lineWidth = 0.5;
  ctx.strokeRect(
    frame.x + frame.inset,
    frame.y + frame.inset,
    frame.width - frame.inset * 2,
    frame.height - frame.inset * 2,
  );
  ctx.globalAlpha = 1;

  // Короткая линия-орнамент отделяет рисунок от подписи.
  ctx.strokeStyle = colors.accent;
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(cx - 24, 590);
  ctx.lineTo(cx + 24, 590);
  ctx.stroke();

  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';

  ctx.fillStyle = colors.ink;
  ctx.font = 'italic 32px Georgia, "Times New Roman", serif';
  ctx.fillText(overlay.title, cx, 636);

  ctx.fillStyle = colors.muted;
  ctx.font = '15px Georgia, "Times New Roman", serif';
  ctx.fillText(overlay.subtitle, cx, 666);
}

/**
 * Контур силуэта: внутреннее ребро встречается дважды, внешнее — один раз.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {import('./build.js').Item[]} items
 * @param {string} ink
 * @param {number} lineWidth
 */
function drawSilhouette(ctx, items, ink, lineWidth) {
  /** @type {Map<string, number>} */
  const edges = new Map();

  const keyOf = (point) => `${point[0].toFixed(2)},${point[1].toFixed(2)}`;

  for (const item of items) {
    for (let i = 0; i < item.pts.length; i++) {
      const a = keyOf(item.pts[i]);
      const b = keyOf(item.pts[(i + 1) % item.pts.length]);
      const key = a < b ? `${a}|${b}` : `${b}|${a}`;
      edges.set(key, (edges.get(key) ?? 0) + 1);
    }
  }

  ctx.strokeStyle = ink;
  ctx.lineWidth = lineWidth;
  ctx.lineJoin = 'round';
  ctx.beginPath();

  for (const [key, count] of edges) {
    if (count !== 1) continue;
    const [a, b] = key.split('|');
    const [ax, ay] = a.split(',').map(Number);
    const [bx, by] = b.split(',').map(Number);
    ctx.moveTo(ax, ay);
    ctx.lineTo(bx, by);
  }

  ctx.stroke();
}
