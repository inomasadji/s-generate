import test from 'node:test';
import assert from 'node:assert/strict';

import { generateAsianName } from '../src/model/naming/asian.js';
import { generateCelticName } from '../src/model/naming/celtic.js';
import { generateSlavicName } from '../src/model/naming/slavic.js';

function uniqueCount(make, count = 40) {
  const names = new Set();
  for (let i = 0; i < count; i++) names.add(make(`culture-${i}`).full);
  return names.size;
}

test('кельтские горы: два слова, диакритика, ascii-слаг', () => {
  const name = generateCelticName('celtic-1');
  const words = name.full.split(' ');

  assert.equal(words.length, 2);
  assert.match(words[0], /^[A-Z]/);
  assert.match(words[1], /^[A-Z]/);
  assert.match(name.slug, /^[a-z0-9-]+$/);
  assert.ok(name.slug.length > 3);
  assert.deepEqual(generateCelticName('celtic-1'), name);
  assert.ok(uniqueCount(generateCelticName) > 25);
});

test('славянские холмы: прилагательное согласовано с родом', () => {
  const name = generateSlavicName('slavic-1');
  const [adjective, noun] = name.full.split(' ');

  assert.match(adjective, /^[А-ЯЁ][а-яё]+$/);
  assert.match(noun, /^[А-ЯЁ][а-яё]+$/);
  assert.match(name.slug, /^[a-z0-9-]+$/);
  assert.ok(!/undefined/.test(name.full));

  // «Тихая Курган» быть не должно: женское прилагательное — только с женским
  // существительным.
  const feminine = new Set(['Гряда', 'Вершина', 'Покатость']);
  const masculine = new Set(['Холм', 'Курган', 'Вал', 'Взгорок']);
  const endsWithFeminine = /(ая|яя)$/.test(adjective);

  if (feminine.has(noun)) assert.ok(endsWithFeminine, name.full);
  if (masculine.has(noun)) assert.ok(!endsWithFeminine, name.full);

  assert.deepEqual(generateSlavicName('slavic-1'), name);
  assert.ok(uniqueCount(generateSlavicName) > 25);
});

test('азиатские облака: 2–3 коротких слова, без повторов', () => {
  const name = generateAsianName('asian-1');
  const words = name.full.split(' ');

  assert.ok(words.length === 2 || words.length === 3);
  for (const word of words) assert.match(word, /^[A-Z][a-z]+$/);
  assert.equal(new Set(words).size, words.length);
  assert.match(name.slug, /^[a-z0-9-]+$/);
  assert.deepEqual(generateAsianName('asian-1'), name);
  assert.ok(uniqueCount(generateAsianName) > 25);
});
