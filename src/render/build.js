import { css } from '../core/palette.js';
import { createCamera, projectPoint } from './camera.js';
import { LOGICAL_SIZE } from './layout.js';
import { PLATE_AREA, buildPlateOverlay } from './plate.js';

/**
 * Display list — единственная граница между «формой» и «пикселями».
 *
 * @typedef {object} Item
 * @property {[number, number][]} pts экранные точки, логические единицы
 * @property {string} color CSS-цвет
 * @property {number} layer порядок слоёв: ножка → шляпка → пятна
 * @property {number} z глубина для сортировки внутри слоя
 * @property {number} index исходный порядок, чтобы сортировка была стабильной
 *
 * @typedef {object} DisplayList
 * @property {number} width
 * @property {number} height
 * @property {string} backdrop
 * @property {string} ink
 * @property {Item[]} items
 * @property {object | null} overlay рамка и подпись
 */

/**
 * @param {{ mode: 'plate' | 'scene', seed: string,
 *           palette: import('../core/palette.js').Palette,
 *           shape: { polys: Array<{ pts: number[][], color: number[],
 *             layer: number, bias?: number }> },
 *           camera?: { yaw: number, pitch: number } }} scene
 * @param {import('./layout.js').View} view
 * @param {number} [t]
 * @returns {DisplayList}
 */
export function buildDisplayList(scene, view, t = 0) {
  void view;
  void t;

  const camera = createCamera(scene.camera);
  const polys = scene.shape?.polys ?? [];

  const projected = [];
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  polys.forEach((poly, index) => {
    const pts = poly.pts.map((point) => projectPoint(point, camera));
    let z = 0;

    for (const point of pts) {
      z += point[2];
      if (point[0] < minX) minX = point[0];
      if (point[0] > maxX) maxX = point[0];
      if (point[1] < minY) minY = point[1];
      if (point[1] > maxY) maxY = point[1];
    }

    projected.push({
      pts,
      z: z / pts.length + (poly.bias ?? 0),
      color: poly.color,
      layer: poly.layer ?? 0,
      index,
    });
  });

  const area = scene.mode === 'plate'
    ? PLATE_AREA
    : { x: 0, y: 0, width: LOGICAL_SIZE, height: LOGICAL_SIZE };

  let scale = 1;
  let midX = 0;
  let midY = 0;

  if (projected.length > 0) {
    const spanX = Math.max(1e-6, maxX - minX);
    const spanY = Math.max(1e-6, maxY - minY);
    scale = Math.min(area.width / spanX, area.height / spanY) * 0.9;
    midX = (minX + maxX) / 2;
    midY = (minY + maxY) / 2;
  }

  const centerX = area.x + area.width / 2;
  const centerY = area.y + area.height / 2;

  const items = projected.map((item) => ({
    pts: item.pts.map((point) => [
      centerX + (point[0] - midX) * scale,
      centerY - (point[1] - midY) * scale,
    ]),
    color: css(item.color),
    layer: item.layer,
    z: item.z,
    index: item.index,
  }));

  items.sort((a, b) => a.layer - b.layer || a.z - b.z || a.index - b.index);

  return {
    width: LOGICAL_SIZE,
    height: LOGICAL_SIZE,
    backdrop: css(scene.palette.paper),
    ink: css(scene.palette.ink),
    items,
    overlay: scene.mode === 'plate' ? buildPlateOverlay(scene) : null,
  };
}
