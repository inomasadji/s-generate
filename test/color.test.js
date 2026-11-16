import test from 'node:test';
import assert from 'node:assert/strict';

import { shadeColor, mixColor } from '../src/core/color.js';

test('свет сверху светлее, чем свет снизу', () => {
  const up = shadeColor([100, 100, 100], [0, 1, 0]);
  const down = shadeColor([100, 100, 100], [0, -1, 0]);

  assert.ok(up[0] > down[0]);
  assert.ok(up[1] > down[1]);
  assert.ok(up[2] > down[2]);
});

test('затенение квантовано: близкие нормали дают один цвет', () => {
  const a = shadeColor([120, 90, 70], [0.1, 0.99, 0]);
  const b = shadeColor([120, 90, 70], [0.1, 0.995, 0]);

  assert.deepEqual(a, b);
});

test('цвет не выходит за 8 бит', () => {
  const bright = shadeColor([250, 250, 250], [0, 1, 0]);
  for (const channel of bright) assert.ok(channel >= 0 && channel <= 255);
});

test('mixColor доходит до концов', () => {
  const a = [10, 20, 30];
  const b = [200, 100, 0];

  assert.deepEqual(mixColor(a, b, 0), a);
  assert.deepEqual(mixColor(a, b, 1), b);
  assert.deepEqual(mixColor(a, b, 0.5), [105, 60, 15]);
});
