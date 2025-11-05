import { Children, Fragment } from 'faiwer-react';

describe('Children', () => {
  const Component = () => null;

  it('handles non-fragment nodes', () => {
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
    expect(Children.count(src)).toBe(src.length);
  });

  it('unwraps arrays', () => {
    const src = [1, [2, 3], 4];
    expect(Children.toArray(src)).toEqual([1, 2, 3, 4]);
  });

  it('iterates through values', () => {
    const fn = jest.fn();
    Children.forEach([1, [2], 3], fn);
    expect(fn.mock.calls).toEqual([[1], [2], [3]]);
  });

  it('iterates through values with this', () => {
    const fn = jest.fn();
    Children.forEach(
      [1, [2], 3],
      function (this: number, child) {
        fn(Number(child) + this);
      },
      4,
    );
    expect(fn.mock.calls).toEqual([[5], [6], [7]]);
  });

  it('maps values', () => {
    expect(Children.map([1, 2], (child) => Number(child) * 2)).toEqual([2, 4]);
  });

  it('maps values with "this"', () => {
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

  it('throws when there more or less than 1 value', () => {
    let src: JSX.Element = [1];
    Children.only(src);

    const only: JSX.Element[] = [
      1,
      [1],
      <Component />,
      <div />,
      <>1</>,
      <>
        {1}
        {2}
      </>,
      <Fragment>
        {1}
        {2}
      </Fragment>,
    ];

    for (const src of only) {
      Children.only(src);
    }

    expect(() => Children.only([1, 2])).toThrow();
  });
});
