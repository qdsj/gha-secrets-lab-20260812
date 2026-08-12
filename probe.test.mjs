import assert from 'node:assert/strict';
import test from 'node:test';
import { inspect, metadata, parseCliValues, sha256 } from './probe.mjs';

test('metadata reports presence, length and expected digest match without the value', () => {
  const value = 'fake-secret-value';
  const result = metadata('SECRET', value, sha256(value));
  assert.deepEqual(result, {
    name: 'SECRET',
    present: true,
    length: 17,
    sha256: sha256(value),
    expectedHashPresent: true,
    sha256Match: true
  });
  assert.equal(JSON.stringify(result).includes(value), false);
});

test('CLI parser preserves common shell-special characters once the shell passes them', () => {
  const special = 'space $ & = + / % value';
  const values = parseCliValues(['--special-chars-secret', special]);
  assert.equal(values.SPECIAL_CHARS_SECRET, special);
  assert.equal(values.STORAGE_ACCESS_KEY, '');
});

test('environment and CLI modes produce equivalent metadata', () => {
  const value = 'same-value';
  const expected = sha256(value);
  const envResult = inspect('env', [], {
    STORAGE_ACCESS_KEY: value,
    EXPECTED_STORAGE_ACCESS_KEY_SHA256: expected
  });
  const cliResult = inspect('cli', ['--storage-access-key', value], {
    EXPECTED_STORAGE_ACCESS_KEY_SHA256: expected
  });
  assert.deepEqual(envResult[0], cliResult[0]);
});

test('unset secret is represented as an empty string', () => {
  const result = inspect('env', [], {})[0];
  assert.equal(result.present, false);
  assert.equal(result.length, 0);
  assert.equal(result.sha256, sha256(''));
});

