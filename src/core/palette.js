/**
 * Палитры. Цвет — часть стиля, поэтому hex-литералов в генераторах нет:
 * тема задаёт именованные тона, генератор выбирает индексы.
 *
 * @typedef {[number, number, number]} Rgb — sRGB, 0..255
 * @typedef {Record<string, Rgb>} Palette
 */

/**
 * @param {Record<string, [number, number, number]>} tones
 * @returns {Palette}
 */
function theme(tones) {
  const frozen = {};
  for (const [name, rgb] of Object.entries(tones)) frozen[name] = Object.freeze(rgb);
  return Object.freeze(frozen);
}

/** @type {Record<string, Palette>} */
export const PALETTES = Object.freeze({
  // Ботаническая иллюстрация: тёплая бумага, сепия, чернила.
  paper: theme({
    paper: [232, 224, 208],
    shade: [206, 196, 178],
    muted: [140, 128, 112],
    ink: [38, 34, 32],
    accent: [168, 84, 60],
    stem: [222, 208, 184],
    cap: [178, 92, 64],
    capShade: [138, 64, 46],
    spot: [246, 240, 226],
    skyTop: [206, 214, 212],
    skyBottom: [236, 229, 214],
    sun: [232, 206, 150],
    cloud: [242, 236, 224],
    mountain: [178, 180, 172],
    mountainShade: [150, 152, 146],
    snow: [248, 244, 236],
    hillFar: [176, 182, 164],
    hillNear: [150, 162, 136],
    ground: [186, 174, 150],
    wood: [132, 110, 84],
    leaf: [124, 140, 96],
    leafDark: [96, 110, 74],
    grass: [120, 132, 90],
  }),

  // Летний лес: зелень, кора, мох.
  forest: theme({
    paper: [232, 236, 222],
    shade: [204, 212, 190],
    muted: [118, 128, 104],
    ink: [30, 38, 28],
    accent: [176, 92, 54],
    stem: [226, 216, 190],
    cap: [150, 74, 52],
    capShade: [112, 52, 38],
    spot: [244, 238, 222],
    skyTop: [164, 196, 208],
    skyBottom: [226, 232, 214],
    sun: [240, 214, 150],
    cloud: [246, 244, 234],
    mountain: [140, 156, 148],
    mountainShade: [112, 128, 122],
    snow: [246, 248, 244],
    hillFar: [150, 172, 140],
    hillNear: [110, 140, 96],
    ground: [124, 140, 96],
    wood: [104, 84, 62],
    leaf: [86, 124, 74],
    leafDark: [62, 96, 58],
    grass: [92, 124, 70],
  }),

  // Сумерки: синие, розовые, фиолетовые.
  dusk: theme({
    paper: [230, 216, 206],
    shade: [198, 182, 176],
    muted: [120, 104, 112],
    ink: [32, 26, 36],
    accent: [206, 110, 86],
    stem: [226, 206, 196],
    cap: [126, 66, 96],
    capShade: [92, 46, 72],
    spot: [244, 226, 222],
    skyTop: [92, 96, 140],
    skyBottom: [226, 164, 142],
    sun: [244, 196, 150],
    cloud: [230, 184, 180],
    mountain: [96, 92, 132],
    mountainShade: [72, 70, 104],
    snow: [236, 226, 232],
    hillFar: [110, 100, 130],
    hillNear: [82, 76, 104],
    ground: [92, 82, 98],
    wood: [78, 62, 70],
    leaf: [96, 96, 120],
    leafDark: [70, 70, 94],
    grass: [86, 86, 104],
  }),

  // Осень: охра, ржавчина, бордо.
  autumn: theme({
    paper: [236, 226, 204],
    shade: [208, 192, 164],
    muted: [130, 112, 88],
    ink: [40, 32, 24],
    accent: [190, 96, 48],
    stem: [226, 212, 182],
    cap: [186, 96, 52],
    capShade: [142, 66, 40],
    spot: [246, 236, 218],
    skyTop: [196, 198, 190],
    skyBottom: [238, 214, 176],
    sun: [238, 190, 120],
    cloud: [244, 232, 214],
    mountain: [150, 138, 130],
    mountainShade: [122, 110, 104],
    snow: [246, 242, 234],
    hillFar: [166, 150, 118],
    hillNear: [134, 116, 88],
    ground: [160, 132, 94],
    wood: [96, 76, 54],
    leaf: [186, 124, 60],
    leafDark: [142, 92, 48],
    grass: [146, 120, 74],
  }),

  // Горы: серо-синие, снег, хвоя.
  alpine: theme({
    paper: [232, 234, 232],
    shade: [202, 206, 206],
    muted: [116, 124, 128],
    ink: [28, 34, 40],
    accent: [176, 86, 66],
    stem: [228, 222, 210],
    cap: [120, 104, 96],
    capShade: [92, 78, 72],
    spot: [246, 246, 242],
    skyTop: [150, 178, 200],
    skyBottom: [224, 232, 236],
    sun: [246, 238, 210],
    cloud: [250, 250, 248],
    mountain: [128, 136, 146],
    mountainShade: [100, 108, 118],
    snow: [250, 250, 250],
    hillFar: [150, 160, 166],
    hillNear: [116, 130, 138],
    ground: [150, 158, 154],
    wood: [92, 86, 80],
    leaf: [74, 102, 92],
    leafDark: [52, 78, 70],
    grass: [104, 124, 110],
  }),

  // Луг: светлая зелень, тёплое солнце, почти без пыли.
  meadow: theme({
    paper: [246, 243, 226],
    shade: [222, 222, 200],
    muted: [116, 124, 96],
    ink: [32, 40, 28],
    accent: [204, 118, 60],
    stem: [240, 230, 200],
    cap: [198, 104, 66],
    capShade: [152, 72, 44],
    spot: [252, 248, 234],
    skyTop: [150, 194, 216],
    skyBottom: [232, 240, 218],
    sun: [250, 222, 148],
    cloud: [253, 251, 242],
    mountain: [162, 176, 172],
    mountainShade: [130, 146, 144],
    snow: [253, 253, 249],
    hillFar: [170, 192, 148],
    hillNear: [122, 158, 100],
    ground: [148, 166, 108],
    wood: [124, 100, 72],
    leaf: [106, 148, 78],
    leafDark: [76, 112, 58],
    grass: [116, 148, 74],
  }),

  // Пустыня: охра, терракота, пыльные фиолетовые дали.
  sand: theme({
    paper: [238, 226, 202],
    shade: [212, 198, 172],
    muted: [138, 118, 92],
    ink: [46, 36, 28],
    accent: [186, 86, 50],
    stem: [232, 214, 184],
    cap: [176, 102, 66],
    capShade: [134, 72, 46],
    spot: [248, 238, 218],
    skyTop: [198, 180, 166],
    skyBottom: [240, 216, 178],
    sun: [244, 198, 130],
    cloud: [246, 234, 216],
    mountain: [158, 134, 124],
    mountainShade: [128, 106, 100],
    snow: [246, 240, 228],
    hillFar: [192, 168, 130],
    hillNear: [166, 140, 102],
    ground: [190, 162, 120],
    wood: [122, 94, 66],
    leaf: [164, 146, 88],
    leafDark: [128, 114, 70],
    grass: [174, 154, 100],
  }),

  // Тушь: почти монохром, один тёплый акцент — как гравюра с сургучом.
  ink: theme({
    paper: [238, 236, 230],
    shade: [214, 212, 204],
    muted: [122, 122, 118],
    ink: [26, 26, 26],
    accent: [150, 58, 48],
    stem: [216, 212, 202],
    cap: [128, 124, 118],
    capShade: [98, 94, 90],
    spot: [246, 244, 238],
    skyTop: [206, 208, 206],
    skyBottom: [234, 232, 226],
    sun: [226, 222, 210],
    cloud: [242, 240, 234],
    mountain: [158, 158, 154],
    mountainShade: [128, 128, 124],
    snow: [248, 248, 246],
    hillFar: [170, 172, 168],
    hillNear: [138, 140, 136],
    ground: [160, 156, 148],
    wood: [104, 98, 90],
    leaf: [132, 134, 128],
    leafDark: [96, 98, 94],
    grass: [124, 126, 118],
  }),

  // Ночь: тёмная бумага, лунный свет, холодные листья. `ink` здесь светлый,
  // поэтому рамка и подпись плашки читаются на тёмном фоне.
  night: theme({
    paper: [28, 34, 52],
    shade: [42, 50, 72],
    muted: [140, 150, 174],
    ink: [234, 235, 226],
    accent: [216, 140, 98],
    stem: [184, 182, 172],
    cap: [124, 76, 90],
    capShade: [90, 54, 68],
    spot: [228, 226, 216],
    skyTop: [22, 28, 56],
    skyBottom: [88, 94, 132],
    sun: [228, 224, 196],
    cloud: [122, 130, 158],
    mountain: [68, 76, 106],
    mountainShade: [50, 56, 82],
    snow: [198, 204, 216],
    hillFar: [60, 78, 90],
    hillNear: [42, 58, 70],
    ground: [36, 42, 52],
    wood: [88, 74, 66],
    leaf: [60, 86, 82],
    leafDark: [42, 62, 62],
    grass: [54, 74, 66],
  }),
});

/**
 * Порядок тем в интерфейсе: от бумаги и туши через времена года к ночи.
 * @type {readonly string[]}
 */
export const PALETTE_IDS = Object.freeze([
  'paper', 'ink', 'forest', 'meadow', 'autumn', 'sand', 'dusk', 'alpine', 'night',
]);

/**
 * Имя темы по объекту палитры: пригодится, когда решение зависит от темы,
 * а не только от цветов (например, сезон дерева).
 * @type {WeakMap<object, string>}
 */
const PALETTE_NAMES = new WeakMap();
for (const [name, palette] of Object.entries(PALETTES)) PALETTE_NAMES.set(palette, name);

const SEASON_BY_PALETTE = {
  paper: 'summer',
  ink: 'summer',
  forest: 'summer',
  meadow: 'summer',
  sand: 'summer',
  dusk: 'spring',
  autumn: 'autumn',
  alpine: 'winter',
  night: 'summer',
};

/**
 * Сезон выводится из палитры: осень даёт осенние деревья, alpine — зимние,
 * dusk — весеннее цветение. Явный `season` в параметрах сильнее.
 *
 * @param {Palette} palette
 * @returns {'spring' | 'summer' | 'autumn' | 'winter'}
 */
export function seasonOf(palette) {
  return SEASON_BY_PALETTE[PALETTE_NAMES.get(palette) ?? 'paper'] ?? 'summer';
}

/**
 * Возвращает тему по имени. Неизвестное имя (например, из URL) не должно
 * ронять экран — падаем на `paper`.
 *
 * @param {string} [name]
 * @returns {Palette}
 */
export function getPalette(name = 'paper') {
  return PALETTES[name] ?? PALETTES.paper;
}

/**
 * Цвет в строку CSS. Каналы квантуются до 8 бит — так один и тот же цвет
 * даёт один и тот же css, сколько бы раз его ни считали.
 *
 * @param {Rgb} rgb
 * @param {number} [alpha]
 * @returns {string}
 */
export function css(rgb, alpha = 1) {
  const [r, g, b] = rgb.map((value) => Math.min(255, Math.max(0, Math.round(value))));
  if (alpha >= 1) return `rgb(${r}, ${g}, ${b})`;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
