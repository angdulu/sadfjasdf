import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { intervalIsValid, scoreItem, validateItem } from '../score.js';

const dataPath = path.join(process.cwd(), 'items.json');
const raw = fs.readFileSync(dataPath, 'utf8');
const items = JSON.parse(raw);

assert.ok(Array.isArray(items) && items.length > 0, 'items.json should contain data');

for (const item of items) {
    const errors = validateItem(item);
    assert.deepEqual(errors, [], `Validation errors for ${item.name?.value || 'Unknown'}: ${errors.join(', ')}`);
}

const indeterminate = items.find(item => item.exposure?.availability?.value === 'Missing');
assert.ok(indeterminate, 'At least one item should have missing exposure for the indeterminate risk test');
assert.equal(scoreItem(indeterminate).indeterminate, true, 'Missing exposure should yield indeterminate risk');
assert.equal(scoreItem(indeterminate).level, 'Indeterminate', 'Missing exposure should set risk level to Indeterminate');

assert.equal(intervalIsValid('0.10-0.90'), true, 'Valid interval should pass');
assert.equal(intervalIsValid('0.90-0.10'), false, 'Reversed interval should fail');
assert.equal(intervalIsValid('1.10-1.20'), false, 'Out-of-range interval should fail');

console.log('All scoring invariants passed.');
