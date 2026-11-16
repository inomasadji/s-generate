import { buildDisplayList } from '../render/build.js';
import { layout } from '../render/layout.js';
import { paint } from '../render/paint.js';

/**
 * Имя файла: `s-generate_<kind>_<slug>_<seed>.<ext>`, всё в нижнем регистре,
 * без пробелов и кириллицы — чтобы ссылка пережила любой мессенджер.
 *
 * @param {{ kind: string, seed: string,
 *           name?: { slug: string } }} scene
 * @param {string} [extension]
 * @returns {string}
 */
export function plateFileName(scene, extension = 'png') {
  const slug = scene.name?.slug ?? 'specimen';
  const seed = String(scene.seed)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 24) || 'seed';

  return `s-generate_${scene.kind}_${slug}_${seed}.${extension}`;
}

/**
 * Рендер плашки в PNG. Холст квадратный: превью и экспорт используют
 * один и тот же display list, отличается только масштаб.
 *
 * @param {object} scene
 * @param {number} [size] сторона в пикселях
 * @returns {Promise<Blob>}
 */
export async function renderPng(scene, size = 1080) {
  const view = layout({ width: size, height: size, dpr: 1 });
  const canvas = document.createElement('canvas');
  canvas.width = view.pixelWidth;
  canvas.height = view.pixelHeight;

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D недоступен');

  paint(ctx, buildDisplayList(scene, view), view);

  return await new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('Браузер не смог собрать PNG'));
    }, 'image/png');
  });
}

/**
 * @param {Blob} blob
 * @param {string} filename
 */
export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  // Дать браузеру начать скачивание, прежде чем освобождать ссылку.
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
