import test from 'node:test';
import assert from 'node:assert/strict';

import { generateName, slugify } from '../src/model/naming/naming.js';

test('название детерминировано и похоже на латынь', () => {
  const a = generateName('golden-1');
  const b = generateName('golden-1');

  assert.deepEqual(a, b);
  assert.match(a.full, /^[A-Z][a-z]{2,} [a-z]{2,}$/);
  assert.match(a.slug, /^[a-z-]+$/);
  assert.equal(a.slug, slugify(a.full));
  assert.ok(!/[aeiou]{3}/.test(a.full), `три гласные подряд: ${a.full}`);
});

test('разные сиды дают разные названия', () => {
  const names = new Set();
  for (let i = 0; i < 60; i++) names.add(generateName(`seed-${i}`).full);

  assert.ok(names.size > 55, `слишком много повторов: ${names.size}/60`);
});

test('slugify убирает всё лишнее', () => {
  assert.equal(slugify('Otinium Caseubbacula'), 'otinium-caseubbacula');
  assert.equal(slugify('  --Ужас--  '), '');
});
