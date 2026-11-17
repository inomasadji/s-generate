import { css, getPalette } from '../core/palette.js';
import { nextSeed } from '../core/rng.js';
import { downloadBlob, plateFileName, renderPng } from '../export/png.js';
import { buildDisplayList } from '../render/build.js';
import { layout } from '../render/layout.js';
import { paint } from '../render/paint.js';
import { buildLandscape } from '../scene/landscape.js';
import { buildSpecimen } from '../scene/specimen.js';

const canvas = document.querySelector('#stage');
const ctx = canvas.getContext('2d');
const saveButton = document.querySelector('#save');
const nextButton = document.querySelector('#next');
const modeButton = document.querySelector('#mode');
const kindSelect = document.querySelector('#kind');

/**
 * Параметры кадра. Перегенерация меняет только сид: род, режим, палитра и
 * характер объекта должны пережить клик, иначе «ещё» превращается в лотерею.
 */
let options = readOptions();
let scene;
let palette;

/**
 * Всё состояние кадра живёт в URL: ссылку можно переслать, и она откроет
 * ровно тот же кадр. Разбор вынесен в функцию, чтобы popstate читал его же.
 */
function readOptions() {
  const query = new URLSearchParams(location.search);
  return {
    seed: query.get('seed') || 'demo',
    mode: query.get('mode') === 'scene' ? 'scene' : 'plate',
    kind: query.get('kind') || 'mushroom',
    palette: query.get('palette') || 'paper',
    shape: query.get('shape') || undefined,
    habit: query.get('habit') || undefined,
  };
}

function build() {
  palette = getPalette(options.palette);
  scene = options.mode === 'scene'
    ? buildLandscape({ seed: options.seed, palette })
    : buildSpecimen({
      kind: options.kind,
      seed: options.seed,
      palette,
      shape: options.shape,
      habit: options.habit,
    });

  document.documentElement.style.setProperty('--ink', css(palette.ink));
  document.documentElement.style.setProperty('--accent', css(palette.accent));
  document.documentElement.style.setProperty('--paper', css(palette.paper));
  document.title = `${scene.name.full} — s-generate`;

  syncControls();
  render();
}

/** Контролы повторяют URL: после «назад» в браузере они не должны врать. */
function syncControls() {
  kindSelect.hidden = options.mode === 'scene';
  kindSelect.value = options.mode === 'plate' ? scene.kind : 'mushroom';
  modeButton.textContent = options.mode === 'scene' ? 'Плашка' : 'Сцена';
}

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

/**
 * Новый сид — та же сцена, другой вариант. Цепочка детерминирована, поэтому
 * «ещё», «ещё», «ещё» из одного и того же места всегда даёт один и тот же
 * ряд кадров; браузеру остаётся только отрисовать готовый display list.
 */
function regenerate() {
  const query = new URLSearchParams(location.search);
  options.seed = nextSeed(options.seed);
  query.set('seed', options.seed);

  // Предыдущий вариант остаётся в истории: «назад» возвращает прошлый кадр.
  history.pushState({ seed: options.seed }, '', `${location.pathname}?${query}`);
  build();
}

// Для скриншотов и встраивания: чистая картинка без панели.
if (new URLSearchParams(location.search).get('ui') === '0') {
  document.querySelector('.toolbar').hidden = true;
}

kindSelect.addEventListener('change', () => {
  const next = new URLSearchParams(location.search);
  next.set('kind', kindSelect.value);
  next.delete('shape');
  location.search = next.toString();
});

modeButton.addEventListener('click', () => {
  const next = new URLSearchParams(location.search);
  next.set('mode', options.mode === 'scene' ? 'plate' : 'scene');
  location.search = next.toString();
});

nextButton.addEventListener('click', regenerate);

window.addEventListener('popstate', () => {
  options = readOptions();
  build();
});

window.addEventListener('keydown', (event) => {
  if (event.metaKey || event.ctrlKey || event.altKey) return;

  // Пробел и R на кнопке или в списке — это действие самого контрола.
  if (event.target instanceof Element && event.target.closest('button, select, input, textarea')) return;

  const key = event.key.toLowerCase();
  if (event.key !== ' ' && key !== 'r' && key !== 'к') return;

  event.preventDefault();
  regenerate();
});

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
build();
