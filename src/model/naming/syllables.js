/**
 * Слоги для латинских названий. Данные — не «словарь», а стройматериал:
 * онсет + гласная дают слог, окончание задаёт «род».
 */

export const ONSETS = Object.freeze([
  'b', 'c', 'd', 'f', 'g', 'l', 'm', 'n', 'p', 'r', 's', 't', 'v',
  'br', 'cr', 'dr', 'fr', 'gl', 'gr', 'pl', 'pr', 'tr',
]);

export const VOWELS = Object.freeze(['a', 'e', 'i', 'o', 'u']);

export const ENDINGS = Object.freeze([
  'us', 'um', 'is', 'ae', 'ia', 'ium', 'ides', 'ata', 'ella', 'ina',
  'osa', 'icus', 'ensis',
]);
