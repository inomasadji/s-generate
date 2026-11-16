import { css } from '../core/palette.js';
import { LOGICAL_SIZE } from './layout.js';

/**
 * Display list — единственная граница между «формой» и «пикселями».
 * Здесь пока только фон: объекты появятся на M1.
 *
 * @typedef {object} DisplayList
 * @property {number} width  логическая ширина
 * @property {number} height логическая высота
 * @property {string} backdrop цвет фона в CSS
 * @property {Array<object>} items полигоны, уже отсортированные по глубине
 */

/**
 * @param {{ seed: string, palette: import('../core/palette.js').Palette }} scene
 * @param {import('./layout.js').View} view
 * @param {number} [t] время в секундах, для будущей анимации
 * @returns {DisplayList}
 */
export function buildDisplayList(scene, view, t = 0) {
  void view;
  void t;
  return {
    width: LOGICAL_SIZE,
    height: LOGICAL_SIZE,
    backdrop: css(scene.palette.paper),
    items: [],
  };
}
