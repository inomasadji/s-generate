import { mixColor } from '../core/color.js';
import { getPalette } from '../core/palette.js';
import { int, range, rngStream } from '../core/rng.js';
import { buildMushroom } from '../model/mushroom.js';
import { generateName } from '../model/naming/naming.js';
import { buildShrub, buildTree } from '../model/tree.js';
import { buildClouds, buildGrass, buildHills, buildMist, buildMountains, buildSky, buildSun, ellipsePolygon } from './scenery.js';

/**
 * Ландшафт: небо, рельеф и расставленные объекты. Всё в логических
 * координатах 720×720, порядок задаётся слоями и линией земли.
 *
 * @param {{ seed?: string, palette?: import('../core/palette.js').Palette }} [options]
 */
export function buildLandscape(options = {}) {
  const { seed = 'demo', palette = getPalette('forest') } = options;
  const rng = rngStream(seed, 'landscape');
  const name = generateName(seed);

  const scenery = [
    ...buildSun(seed, palette),
    ...buildClouds(seed, palette),
    ...buildMountains(seed, palette),
    ...buildHills(seed, palette),
    ...buildMist(seed, palette),
    ...buildGrass(seed, palette),
  ];

  const objects = [];
  const takenX = [];

  /**
   * @param {number} min
   * @param {number} max
   * @param {number} gap
   */
  function freeX(min, max, gap) {
    for (let attempt = 0; attempt < 40; attempt++) {
      const x = range(rng, min, max);
      if (takenX.every((other) => Math.abs(other - x) >= gap)) {
        takenX.push(x);
        return x;
      }
    }
    const x = range(rng, min, max);
    takenX.push(x);
    return x;
  }

  // Дальний лес: мелкий, редкий, грубая детализация.
  const farTrees = int(rng, 5, 7);
  for (let i = 0; i < farTrees; i++) {
    objects.push({
      model: buildTree({
        seed: `${seed}:far-${i}`,
        palette,
        params: { depth: 1, density: 0.7, detail: 0.75, clusters: 16, height: range(rng, 1.1, 1.5) },
      }),
      x: freeX(70, 650, 110),
      y: range(rng, 505, 545),
      scale: range(rng, 55, 70),
    });
  }

  // Средний план.
  const midTrees = 4;
  for (let i = 0; i < midTrees; i++) {
    objects.push({
      model: buildTree({
        seed: `${seed}:mid-${i}`,
        palette,
        params: { depth: 2, density: range(rng, 0.85, 1.05), detail: 0.9, clusters: 24 },
      }),
      x: freeX(80, 640, 150),
      y: range(rng, 565, 605),
      scale: range(rng, 85, 110),
    });
  }

  // Кустарники у земли: слева и справа, чтобы не спорить с героем.
  for (let i = 0; i < 3; i++) {
    objects.push({
      model: buildShrub({ seed: `${seed}:shrub-${i}`, palette }),
      x: i === 0 ? range(rng, 90, 170) : range(rng, 590, 670),
      y: range(rng, 620, 655),
      scale: range(rng, 75, 95),
    });
  }

  // Грибы: пара в траве и один «герой» на переднем плане.
  const mushrooms = 2;
  for (let i = 0; i < mushrooms; i++) {
    objects.push({
      model: buildMushroom({
        seed: `${seed}:mushroom-${i}`,
        palette,
        params: { detail: 0.8 },
      }),
      x: i === 0 ? range(rng, 170, 290) : range(rng, 480, 610),
      y: range(rng, 645, 690),
      scale: range(rng, 55, 75),
    });
  }

  objects.push({
    model: buildMushroom({
      seed: `${seed}:hero`,
      palette,
      params: { detail: 0.9 },
    }),
    x: range(rng, 340, 400),
    y: 705,
    scale: range(rng, 95, 115),
  });

  // Дальние объекты рисуются первыми: слой растёт с линией земли.
  objects.sort((a, b) => a.y - b.y);
  objects.forEach((object, index) => {
    object.layer = 10 + index * 10;
  });

  // Мягкие тени под объектами: без них предметы «висят» над землёй.
  for (const object of objects) {
    const width = object.model.bounds.max[0] - object.model.bounds.min[0];
    const rx = Math.max(9, width * object.scale * 0.34);
    scenery.push({
      pts: ellipsePolygon(object.x, object.y, rx, rx * 0.18),
      color: mixColor(palette.ground, palette.ink, 0.22),
      alpha: 0.35,
      layer: 5,
    });
  }

  return {
    mode: 'scene',
    kind: 'landscape',
    seed,
    palette,
    name,
    camera: { yaw: -0.12, pitch: 0.14 },
    sky: buildSky(seed, palette),
    scenery,
    objects,
  };
}
