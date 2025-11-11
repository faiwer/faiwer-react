import { useMemo } from '~/index';
import { act } from '~/testing';
import { expectHtml, mount, useStateX } from '../helpers';

describe('Hooks: useMemo', () => {
  it('useMemo: calls the fn on the 1st run', () => {
    const Comp = () => useMemo(() => 1, []);
    expectHtml(mount(<Comp />)).toBe('1');
  });

  it("useMemo: doesn't invalidate the cache when deps are not changed", async () => {
    const state = useStateX<number>();
    const Comp = () => {
      const stateValue = state.use(0);
      return useMemo(() => stateValue, [3]);
    };
    const root = mount(<Comp />);
    expectHtml(root).toBe('0');

    await act(() => state.set(2));
    expectHtml(root).toBe('0');
  });

  for (const type of ['object', 'scalar']) {
    const v = type === 'object' ? [{ a: 1 }, { a: 2 }] : [42, 43];
    it(`useMemo: invalidates the cache when a ${type} dep is changed`, async () => {
      const state = useStateX<unknown>();
      const Comp = () => {
        const stateValue = state.use(v[0]);
        return useMemo(() => JSON.stringify(stateValue), [stateValue]);
      };

      const root = mount(<Comp />);
      expectHtml(root).toBe(JSON.stringify(v[0]));

      await act(() => state.set(v[1]));
      expectHtml(root).toBe(JSON.stringify(v[1]));
    });
  }
});
