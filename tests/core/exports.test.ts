import * as ns from 'faiwer-react';
import React from 'faiwer-react';

/**
 * Make sure the named exports (`import { x } from 'faiwer-react'`) and the
 * default export (`import React from 'faiwer-react'; React.x`) line up 1:1.
 *
 * `import * as` also exposes the default export itself under the key
 * `default`, plus transpilers sometimes add `__esModule`. Both are filtered.
 */
const SKIP = new Set(['default', '__esModule']);
const namedKeys = Object.keys(ns)
  .filter((k) => !SKIP.has(k))
  .sort();
const defaultKeys = Object.keys(React).sort();

describe('public exports', () => {
  it('named exports and default export expose the same keys', () => {
    expect(defaultKeys).toEqual(namedKeys);
  });

  it('every export has the same typeof on both sides and is not nil', () => {
    for (const key of defaultKeys) {
      const fromNamed = (ns as Record<string, unknown>)[key];
      const fromDefault = (React as Record<string, unknown>)[key];
      expect(typeof fromNamed).toBe(typeof fromDefault);
      expect(!!fromDefault).toBe(true);
    }
  });
});
