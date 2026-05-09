import { Children, Fragment } from 'faiwer-react';

describe('Children', () => {
  const Component = () => null;

  describe('forEach', () => {
    it('iterates through array values', () => {
      const fn = jest.fn();
      Children.forEach([1, [2], 3], fn);
      expect(fn.mock.calls).toEqual([[1], [2], [3]]);
    });

    it('unwraps deeply nested arrays', () => {
      const fn = jest.fn();
      Children.forEach([1, [2, [3, [4]]], 5], fn);
      expect(fn.mock.calls).toEqual([[1], [2], [3], [4], [5]]);
    });

    it('passes scalar children straight to fn (e.g. `null`, `false`)', () => {
      const fn = jest.fn();
      Children.forEach(['str', null, undefined, false], fn);
      expect(fn.mock.calls).toEqual([['str'], [null], [undefined], [false]]);
    });

    it('keeps fragments as-is (does not unwrap their children)', () => {
      const fn = jest.fn();
      const fragment = (
        <>
          {1}
          {2}
        </>
      );
      Children.forEach([fragment], fn);
      expect(fn.mock.calls).toEqual([[fragment]]);
    });

    it('calls fn once when given a single element', () => {
      const fn = jest.fn();
      const node = <Component />;
      Children.forEach(node, fn);
      expect(fn.mock.calls).toEqual([[node]]);
    });

    it('calls fn once when given a single scalar', () => {
      const fn = jest.fn();
      Children.forEach(42, fn);
      expect(fn.mock.calls).toEqual([[42]]);
    });

    it('does not call fn when children is `null` or `undefined`', () => {
      const fn = jest.fn();
      Children.forEach(null, fn);
      Children.forEach(undefined, fn);
      expect(fn).not.toHaveBeenCalled();
    });

    it('respects `this` argument for both arrays and singletons', () => {
      const fn = jest.fn();
      const callback = function (this: number, child: unknown) {
        fn(Number(child) + this);
      };

      Children.forEach([1, [2], 3], callback, 4);
      Children.forEach(10, callback, 4);

      expect(fn.mock.calls).toEqual([[5], [6], [7], [14]]);
    });
  });

  describe('toArray', () => {
    it('returns flat array of array children', () => {
      const src = [
        'str',
        null,
        undefined,
        false,
        <div />,
        <Component />,
        <>
          {1}
          {2}
        </>,
      ];
      expect(Children.toArray(src)).toEqual(src);
    });

    it('unwraps nested arrays', () => {
      expect(Children.toArray([1, [2, 3], 4])).toEqual([1, 2, 3, 4]);
    });

    it('wraps a single element into an array', () => {
      const node = <Component />;
      expect(Children.toArray(node)).toEqual([node]);
    });

    it('wraps a single scalar into an array', () => {
      expect(Children.toArray('hello')).toEqual(['hello']);
    });

    it('returns an empty array for `null` / `undefined`', () => {
      expect(Children.toArray(null)).toEqual([]);
      expect(Children.toArray(undefined)).toEqual([]);
    });
  });

  describe('count', () => {
    it('counts children inside an array (including scalars)', () => {
      const src = ['str', null, undefined, false, <div />, <Component />];
      expect(Children.count(src)).toBe(src.length);
    });

    it('returns 1 for a single element or scalar', () => {
      expect(Children.count(<Component />)).toBe(1);
      expect(Children.count(0)).toBe(1);
    });

    it('returns 0 for `null` / `undefined`', () => {
      expect(Children.count(null)).toBe(0);
      expect(Children.count(undefined)).toBe(0);
    });
  });

  describe('map', () => {
    it('maps array values', () => {
      expect(Children.map([1, 2], (child) => Number(child) * 2)).toEqual([
        2, 4,
      ]);
    });

    it('maps a single element / scalar', () => {
      expect(Children.map(3, (child) => Number(child) * 2)).toEqual([6]);
      expect(Children.map(<Component />, () => 'hit')).toEqual(['hit']);
    });

    it('returns an empty array for `null` / `undefined`', () => {
      const fn = jest.fn();
      expect(Children.map(null, fn)).toEqual([]);
      expect(Children.map(undefined, fn)).toEqual([]);
      expect(fn).not.toHaveBeenCalled();
    });

    it('honors `this` argument', () => {
      expect(
        Children.map(
          [1, [2]],
          function (this: number, child) {
            return this + Number(child) * 2;
          },
          4 /* as this */,
        ),
      ).toEqual([6, 8]);
    });
  });

  describe('only', () => {
    it('passes through a single element / scalar', () => {
      Children.only(1);
      Children.only(<Component />);
      Children.only(<div />);
      Children.only(<>1</>);
      Children.only(
        <Fragment>
          {1}
          {2}
        </Fragment>,
      );
    });

    it('passes through a one-item array', () => {
      Children.only([1]);
      Children.only([<Component />]);
    });

    it('throws when there is more than one child', () => {
      expect(() => Children.only([1, 2])).toThrow();
    });

    it('throws when there are no children', () => {
      expect(() => Children.only([])).toThrow();
      expect(() => Children.only(null)).toThrow();
      expect(() => Children.only(undefined)).toThrow();
    });
  });
});
