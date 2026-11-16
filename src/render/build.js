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
 * @property {number} layer порядок слоёв
 * @property {number} z глубина для сортировки внутри слоя
 * @property {boolean} [outline] рисовать ли контур силуэта
 * @property {number} index исходный порядок, чтобы сортировка была стабильной
 *
 * @typedef {object} DisplayList
 * @property {number} width
 * @property {number} height
 * @property {string | object} backdrop
 * @property {string} ink
 * @property {Item[]} items
 * @property {object | null} overlay
 */

/**
 * @param {object} scene
 * @param {import('./layout.js').View} view
 * @param {number} [t]
 * @returns {DisplayList}
 */
export function buildDisplayList(scene, view, t = 0) {
  return scene.mode === 'scene'
    ? buildSceneDisplayList(scene)
    : buildPlateDisplayList(scene, view, t);
}

/**
 * Плашка: один объект, вписанный в область рисунка, плюс рамка и подпись.
 *
 * @param {object} scene
 * @param {import('./layout.js').View} view
 * @param {number} t
 * @returns {DisplayList}
 */
export function buildPlateDisplayList(scene, view, t) {
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
      outline: poly.outline !== false,
      index,
    });
  });

  const area = scene.mode === 'plate' ? PLATE_AREA : { x: 0, y: 0, width: LOGICAL_SIZE, height: LOGICAL_SIZE };

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
  let centerY = area.y + area.height / 2;

  if (projected.length > 0 && scene.align === 'bottom') {
    const spanY = Math.max(1e-6, maxY - minY);
    centerY = area.y + area.height - (spanY * scale) / 2;
  }

  const items = projected.map((item) => ({
    pts: item.pts.map((point) => [
      centerX + (point[0] - midX) * scale,
      centerY - (point[1] - midY) * scale,
    ]),
    color: css(item.color),
    layer: item.layer,
    outline: item.outline,
    z: item.z,
    index: item.index,
  }));

  items.sort((a, b) => a.layer - b.layer || a.z - b.z || a.index - b.index);

  return {
    width: LOGICAL_SIZE,
    height: LOGICAL_SIZE,
    backdrop: css(scene.palette.paper),
    plateBackground: scene.background
      ? { top: css(scene.background.top), bottom: css(scene.background.bottom) }
      : null,
    ink: css(scene.palette.ink),
    items,
    overlay: scene.mode === 'plate' ? buildPlateOverlay(scene) : null,
  };
}

/**
 * Сцена: небо и земля — фоном, рельеф — готовыми экранными полигонами,
 * деревья и грибы — моделями, спроецированными и поставленными на землю.
 *
 * @param {object} scene
 * @returns {DisplayList}
 */
export function buildSceneDisplayList(scene) {
  const camera = createCamera(scene.camera);
  const items = [];
  let index = 0;

  for (const entry of scene.scenery) {
    items.push({
      pts: entry.pts,
      color: css(entry.color, entry.alpha ?? 1),
      layer: entry.layer,
      outline: false,
      z: entry.z ?? 0,
      index: index++,
    });
  }

  for (const object of scene.objects) {
    for (const poly of object.model.polys) {
      const projected = poly.pts.map((point) => projectPoint(point, camera));
      let z = 0;

      for (const point of projected) z += point[2];

      items.push({
        pts: projected.map((point) => [
          object.x + point[0] * object.scale,
          object.y - point[1] * object.scale,
        ]),
        color: css(poly.color),
        layer: object.layer + (poly.layer ?? 0),
        outline: poly.outline !== false,
        z: z / projected.length + (poly.bias ?? 0),
        index: index++,
      });
    }
  }

  items.sort((a, b) => a.layer - b.layer || a.z - b.z || a.index - b.index);

  const sky = scene.sky;

  return {
    width: LOGICAL_SIZE,
    height: LOGICAL_SIZE,
    backdrop: {
      kind: 'sky',
      horizon: sky.horizon,
      outer: css(scene.palette.paper),
      top: css(sky.top),
      bottom: css(sky.bottom),
      groundTop: css(sky.groundTop),
      groundBottom: css(sky.groundBottom),
    },
    ink: css(scene.palette.ink),
    items,
    overlay: null,
  };
}
