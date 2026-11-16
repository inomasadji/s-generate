import test from 'node:test';
import assert from 'node:assert/strict';

import { add, clamp, cross, dot, length, lerp, normalize, scale, sub, vec3 } from '../src/core/math.js';
import { sampleSpline, splinePoint, splineTangent } from '../src/core/spline.js';

test('базовая векторная математика', () => {
  assert.deepEqual(vec3(), [0, 0, 0]);
  assert.deepEqual(add([1, 2, 3], [4, 5, 6]), [5, 7, 9]);
  assert.deepEqual(sub([4, 5, 6], [1, 2, 3]), [3, 3, 3]);
  assert.deepEqual(scale([1, 2, 3], 2), [2, 4, 6]);
  assert.equal(dot([1, 2, 3], [4, 5, 6]), 32);
  assert.deepEqual(cross([1, 0, 0], [0, 1, 0]), [0, 0, 1]);
  assert.equal(length([3, 4, 0]), 5);
  assert.deepEqual(normalize([0, 5, 0]), [0, 1, 0]);
  assert.deepEqual(normalize([0, 0, 0]), [0, 0, 0]);
  assert.equal(lerp(10, 20, 0.25), 12.5);
  assert.equal(clamp(-5, 0, 1), 0);
  assert.equal(clamp(5, 0, 1), 1);
});

test('сплайн проходит через крайние точки', () => {
  const points = [[0, 0, 0], [1, 2, 0], [2, 1, 1], [3, 0, 0]];
  const curve = sampleSpline(points, 12);

  assert.equal(curve.length, 13);
  assert.deepEqual(curve[0], points[0]);
  assert.deepEqual(curve[curve.length - 1], points[points.length - 1]);
});

test('на прямой с равным шагом середина остаётся серединой', () => {
  const points = [[0, 0, 0], [1, 0, 0], [2, 0, 0], [3, 0, 0]];
  const mid = splinePoint(points, 0.5);

  assert.ok(Math.abs(mid[0] - 1.5) < 1e-9);
  assert.equal(mid[1], 0);
});

test('замкнутый сплайн замыкается и не дублирует точку', () => {
  const square = [[1, 0, 0], [0, 0, 1], [-1, 0, 0], [0, 0, -1]];
  const ring = sampleSpline(square, 16, { closed: true });

  assert.equal(ring.length, 16);
  assert.deepEqual(ring[0], square[0]);
  assert.deepEqual(splinePoint(square, 1, { closed: true }), square[0]);
});

test('касательная — единичный вектор вдоль кривой', () => {
  const points = [[0, 0, 0], [0, 1, 0], [0, 2, 0], [0, 3, 0]];
  const tangent = splineTangent(points, 0.5);

  assert.ok(Math.abs(length(tangent) - 1) < 1e-6);
  assert.ok(tangent[1] > 0.99);
});
