import { getPalette } from '../core/palette.js';
import { range, rngStream } from '../core/rng.js';
import { buildCloud } from '../model/cloud.js';
import { buildHill } from '../model/hill.js';
import { buildMountain } from '../model/mountain.js';
import { buildMushroom } from '../model/mushroom.js';
import { generateAsianName } from '../model/naming/asian.js';
import { generateCelticName } from '../model/naming/celtic.js';
import { generateName } from '../model/naming/naming.js';
import { generateSlavicName } from '../model/naming/slavic.js';
import { buildTree } from '../model/tree.js';

/** Что можно напечатать на плашке. */
export const SPECIMEN_KINDS = Object.freeze(['mushroom', 'tree', 'hill', 'mountain', 'cloud']);

const CAMERAS = {
  mushroom: { yaw: -0.32, pitch: 0.18 },
  tree: { yaw: -0.28, pitch: 0.16 },
  hill: { yaw: 0, pitch: 0 },
  mountain: { yaw: 0, pitch: 0 },
  cloud: { yaw: 0, pitch: 0 },
};

/**
 * Плашка с одним объектом. У каждого рода — свой генератор формы и своя
 * школа имён: грибы и деревья — ботаническая латынь, горы — кельтская,
 * холмы — славянская, облака — «азиатская».
 *
 * @param {{ kind?: string, seed?: string,
 *           palette?: import('../core/palette.js').Palette,
 *           shape?: string, habit?: string }} [options]
 */
export function buildSpecimen(options = {}) {
  const {
    kind = 'mushroom',
    seed = 'demo',
    palette = getPalette('paper'),
    shape,
    habit,
  } = options;

  const known = SPECIMEN_KINDS.includes(kind) ? kind : 'mushroom';
  const cameraRng = rngStream(seed, 'camera');
  const camera = {
    yaw: CAMERAS[known].yaw + (known === 'mushroom' || known === 'tree' ? range(cameraRng, -0.12, 0.12) : 0),
    pitch: CAMERAS[known].pitch + (known === 'mushroom' || known === 'tree' ? range(cameraRng, -0.03, 0.03) : 0),
  };

  let model;
  let name;
  let background = null;
  let align = 'center';

  switch (known) {
    case 'tree':
      model = buildTree({ seed, palette, params: habit ? { habit } : {} });
      name = generateName(seed);
      break;
    case 'hill':
      model = buildHill({ seed, palette });
      name = generateSlavicName(seed);
      background = { top: palette.skyTop, bottom: palette.skyBottom };
      align = 'bottom';
      break;
    case 'mountain':
      model = buildMountain({ seed, palette });
      name = generateCelticName(seed);
      background = { top: palette.skyTop, bottom: palette.skyBottom };
      align = 'bottom';
      break;
    case 'cloud':
      model = buildCloud({ seed, palette });
      name = generateAsianName(seed);
      background = { top: palette.skyTop, bottom: palette.skyBottom };
      break;
    default:
      model = buildMushroom({ seed, palette, params: shape ? { shape } : {} });
      name = generateName(seed);
  }

  return { mode: 'plate', kind: known, seed, palette, shape: model, name, camera, background, align };
}
