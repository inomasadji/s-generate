import { css, getPalette } from '../core/palette.js';
import { downloadBlob, plateFileName, renderPng } from '../export/png.js';
import { buildDisplayList } from '../render/build.js';
import { layout } from '../render/layout.js';
import { paint } from '../render/paint.js';
import { buildLandscape } from '../scene/landscape.js';
import { buildSpecimen } from '../scene/specimen.js';

const canvas = document.querySelector('#stage');
const ctx = canvas.getContext('2d');
const saveButton = document.querySelector('#save');
const modeButton = document.querySelector('#mode');
const kindSelect = document.querySelector('#kind');

const params = new URLSearchParams(location.search);
const seed = params.get('seed') || 'demo';
const palette = getPalette(params.get('palette') || 'paper');
const mode = params.get('mode') === 'scene' ? 'scene' : 'plate';
const kind = params.get('kind') || 'mushroom';

const scene = mode === 'scene'
  ? buildLandscape({ seed, palette })
  : buildSpecimen({
    kind,
    seed,
    palette,
    shape: params.get('shape') || undefined,
    habit: params.get('habit') || undefined,
  });

// Для скриншотов и встраивания: чистая картинка без панели.
if (params.get('ui') === '0') document.querySelector('.toolbar').hidden = true;

document.documentElement.style.setProperty('--ink', css(palette.ink));
document.documentElement.style.setProperty('--accent', css(palette.accent));
document.documentElement.style.setProperty('--paper', css(palette.paper));
document.title = `${scene.name.full} — s-generate`;

kindSelect.value = mode === 'plate' ? scene.kind : 'mushroom';
kindSelect.hidden = mode === 'scene';

kindSelect.addEventListener('change', () => {
  const next = new URLSearchParams(location.search);
  next.set('kind', kindSelect.value);
  next.delete('shape');
  location.search = next.toString();
});

modeButton.textContent = mode === 'scene' ? 'Плашка' : 'Сцена';
modeButton.addEventListener('click', () => {
  const next = new URLSearchParams(location.search);
  next.set('mode', mode === 'scene' ? 'plate' : 'scene');
  location.search = next.toString();
});

function render() {
  const rect = canvas.getBoundingClientRect();
  const view = layout({
    width: rect.width,
    height: rect.height,
    dpr: window.devicePixelRatio || 1,
  });

  canvas.width = view.pixelWidth;
  canvas.height = view.pixelHeight;

  paint(ctx, buildDisplayList(scene, view), view);
}

saveButton.addEventListener('click', async () => {
  const label = saveButton.textContent;

  saveButton.disabled = true;
  saveButton.textContent = 'Собираю…';

  try {
    const blob = await renderPng(scene, 1080);
    downloadBlob(blob, plateFileName(scene));
  } catch (error) {
    console.error(error);
    saveButton.textContent = 'Не вышло, ещё раз?';
    setTimeout(() => {
      saveButton.textContent = label;
      saveButton.disabled = false;
    }, 2000);
    return;
  }

  saveButton.textContent = label;
  saveButton.disabled = false;
});

window.addEventListener('resize', render);
render();
