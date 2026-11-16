import { css } from '../core/palette.js';

/**
 * Геометрия плашки: рамка, область рисунка, полоса подписи.
 * Одна константа на всех, чтобы build и paint не разъезжались.
 */
export const PLATE_AREA = Object.freeze({ x: 68, y: 68, width: 584, height: 488 });

/** @returns {{ frame: object, title: string, subtitle: string, colors: object }} */
export function buildPlateOverlay(scene) {
  return {
    frame: { x: 34, y: 34, width: 652, height: 652, inset: 8 },
    title: scene.name?.full ?? scene.seed,
    subtitle: `s-generate · ${scene.seed}`,
    colors: {
      ink: css(scene.palette.ink),
      muted: css(scene.palette.muted),
      accent: css(scene.palette.accent),
    },
  };
}
