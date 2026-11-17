import { PALETTE_IDS, css, getPalette } from '../core/palette.js';
import { nextSeed } from '../core/rng.js';
import { downloadBlob, plateFileName, renderPng } from '../export/png.js';
import { MUSHROOM_SHAPES } from '../model/mushroom.js';
import { TREE_HABITS } from '../model/tree.js';
import { buildDisplayList } from '../render/build.js';
import { layout } from '../render/layout.js';
import { paint } from '../render/paint.js';
import { buildLandscape } from '../scene/landscape.js';
import { rollVariant } from '../scene/randomize.js';
import { SPECIMEN_KINDS, buildSpecimen } from '../scene/specimen.js';

const canvas = document.querySelector('#stage');
const ctx = canvas.getContext('2d');
const saveButton = document.querySelector('#save');
const nextButton = document.querySelector('#next');
const diceButton = document.querySelector('#dice');
const kindSelect = document.querySelector('#kind');
const modeSelect = document.querySelector('#mode');
const shapeSelect = document.querySelector('#shape');
const habitSelect = document.querySelector('#habit');
const paletteSelect = document.querySelector('#palette');
const kindField = document.querySelector('#kind-field');
const shapeField = document.querySelector('#shape-field');
const habitField = document.querySelector('#habit-field');

/**
 * Параметры кадра. «Ещё» меняет только сид, «Случайно» — сид и сочетание
 * рода, палитры и характера; режим остаётся выбранным.
 */
let options = readOptions();
let scene;

/**
 * Всё состояние кадра живёт в URL: ссылку можно переслать, и она откроет
 * ровно тот же кадр. Разбор вынесен в функцию, чтобы popstate читал его же.
 */
function readOptions() {
  const query = new URLSearchParams(location.search);
  const rawKind = query.get('kind') || 'mushroom';
  const shape = query.get('shape') || '';
  const habit = query.get('habit') || '';
  const paletteName = query.get('palette') || 'paper';
  const kind = SPECIMEN_KINDS.includes(rawKind) ? rawKind : 'mushroom';

  return {
    seed: query.get('seed') || 'demo',
    mode: query.get('mode') === 'scene' ? 'scene' : 'plate',
    kind,
    palette: PALETTE_IDS.includes(paletteName) ? paletteName : 'paper',
    // Форма бывает только у гриба, характер — только у дерева.
    shape: kind === 'mushroom' && MUSHROOM_SHAPES.includes(shape) ? shape : undefined,
    habit: kind === 'tree' && TREE_HABITS.includes(habit) ? habit : undefined,
  };
}

/**
 * Пишет кадр в URL, не трогая незнакомые параметры (`ui` и будущие).
 * Значения по умолчанию не пишутся, поэтому ссылка остаётся короткой.
 *
 * @param {boolean} push оставить прошлый кадр в истории браузера
 */
function writeUrl(push) {
  const query = new URLSearchParams(location.search);

  put(query, 'seed', options.seed);
  put(query, 'mode', options.mode === 'plate' ? '' : options.mode);
  put(query, 'kind', options.kind === 'mushroom' ? '' : options.kind);
  put(query, 'palette', options.palette === 'paper' ? '' : options.palette);
  put(query, 'shape', options.shape ?? '');
  put(query, 'habit', options.habit ?? '');

  const url = `${location.pathname}?${query}`;
  if (push) history.pushState(null, '', url);
  else history.replaceState(null, '', url);
}

function put(query, key, value) {
  if (value === '') query.delete(key);
  else query.set(key, value);
}

function build() {
  const palette = getPalette(options.palette);
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
  document.documentElement.style.setProperty('--muted', css(palette.muted));
  document.documentElement.style.setProperty('--accent', css(palette.accent));
  document.documentElement.style.setProperty('--paper', css(palette.paper));
  document.title = `${scene.name.full} — s-generate`;

  syncControls();
  render();
}

/** Контролы повторяют URL: после «назад» в браузере они не должны врать. */
function syncControls() {
  const plate = options.mode === 'plate';

  kindField.hidden = !plate;
  shapeField.hidden = !plate || options.kind !== 'mushroom';
  habitField.hidden = !plate || options.kind !== 'tree';

  kindSelect.value = plate ? options.kind : 'mushroom';
  modeSelect.value = options.mode;
  shapeSelect.value = options.shape ?? '';
  habitSelect.value = options.habit ?? 'upright';
  paletteSelect.value = options.palette;
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
  options.seed = nextSeed(options.seed);
  writeUrl(true);
  build();
}

/** Новая комбинация целиком: сид, род, палитра, форма и характер. */
function randomize() {
  options = rollVariant(options);
  writeUrl(true);
  build();
}

// Для скриншотов и встраивания: чистая картинка без панели.
if (new URLSearchParams(location.search).get('ui') === '0') {
  document.querySelector('.toolbar').hidden = true;
}

/**
 * Смена контрола — это правка текущего кадра, а не новый шаг истории:
 * «назад» в браузере возвращает предыдущий вариант, а не прошлый выбор в списке.
 */
function bind(select, apply) {
  select.addEventListener('change', () => {
    apply(select.value);
    writeUrl(false);
    build();
  });
}

bind(kindSelect, (value) => {
  const known = SPECIMEN_KINDS.includes(value) ? value : 'mushroom';
  if (known === options.kind) return;

  options.kind = known;
  // Форма и характер принадлежат конкретному роду — переносить их нельзя.
  options.shape = undefined;
  options.habit = undefined;
});

bind(modeSelect, (value) => {
  options.mode = value === 'scene' ? 'scene' : 'plate';
});

bind(shapeSelect, (value) => {
  options.shape = MUSHROOM_SHAPES.includes(value) ? value : undefined;
});

bind(habitSelect, (value) => {
  options.habit = TREE_HABITS.includes(value) ? value : undefined;
});

bind(paletteSelect, (value) => {
  options.palette = PALETTE_IDS.includes(value) ? value : 'paper';
});

nextButton.addEventListener('click', regenerate);
diceButton.addEventListener('click', randomize);

window.addEventListener('popstate', () => {
  options = readOptions();
  build();
});

window.addEventListener('keydown', (event) => {
  if (event.metaKey || event.ctrlKey || event.altKey) return;

  // Пробел и буквы на кнопке или в списке — это действие самого контрола.
  if (event.target instanceof Element && event.target.closest('button, select, input, textarea')) return;

  const key = event.key.toLowerCase();

  if (event.key === ' ' || key === 'r' || key === 'к') {
    event.preventDefault();
    regenerate();
    return;
  }

  if (key === 'd' || key === 'в') {
    event.preventDefault();
    randomize();
  }
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
