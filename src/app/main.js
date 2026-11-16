import { getPalette } from '../core/palette.js';
import { buildDisplayList } from '../render/build.js';
import { layout } from '../render/layout.js';
import { paint } from '../render/paint.js';

const canvas = document.querySelector('#stage');
const ctx = canvas.getContext('2d');

const params = new URLSearchParams(location.search);
const scene = {
  seed: params.get('seed') || 'demo',
  palette: getPalette(params.get('palette') || 'paper'),
};

function render() {
  const view = layout({
    width: window.innerWidth,
    height: window.innerHeight,
    dpr: window.devicePixelRatio || 1,
  });

  canvas.width = view.pixelWidth;
  canvas.height = view.pixelHeight;
  canvas.style.width = `${view.cssWidth}px`;
  canvas.style.height = `${view.cssHeight}px`;

  const displayList = buildDisplayList(scene, view, 0);
  paint(ctx, displayList, view);
}

window.addEventListener('resize', render);
render();
