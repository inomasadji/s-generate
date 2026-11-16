/**
 * Транслитерация для имён файлов: кириллица и диакритика превращаются
 * в латиницу, чтобы ссылка пережила любой мессенджер.
 */

const TRANSLIT = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'yo', ж: 'zh', з: 'z',
  и: 'i', й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r',
  с: 's', т: 't', у: 'u', ф: 'f', х: 'kh', ц: 'ts', ч: 'ch', ш: 'sh',
  щ: 'shch', ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya',
  і: 'i', ї: 'yi', є: 'ye', ґ: 'g',
};

/**
 * @param {string} text
 * @returns {string}
 */
export function slugify(text) {
  const latin = [...text.toLowerCase()]
    .map((char) => (char in TRANSLIT ? TRANSLIT[char] : char))
    .join('');

  return latin
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
