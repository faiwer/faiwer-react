import { useState, type StateSetter, useMemo } from '~/index';
import { act } from '~/testing';
import { expectHtml, mount } from '../helpers';

describe('Hooks: useMemo', () => {
  it('useMemo: calls the fn on the 1st run', () => {
    const Comp = () => useMemo(() => 1, []);
    expectHtml(mount(<Comp />)).toBe('1');
  });

  it("useMemo: doesn't invalidate the cache when deps are not changed", async () => {
    let updateState: StateSetter<number>;
    const Comp = () => {
      const [v, setV] = useState(0);
      updateState = setV;
      return useMemo(() => v, [3]);
    };
    const root = mount(<Comp />);
    expectHtml(root).toBe('0');

    await act(() => updateState!(2));
    expectHtml(root).toBe('0');
  });

  for (const type of ['object', 'scalar']) {
    const v = type === 'object' ? [{ a: 1 }, { a: 2 }] : [42, 43];
    it(`useMemo: invalidates the cache when a ${type} dep is changed`, async () => {
      let updateState: StateSetter<unknown>;
      const Comp = () => {
        const [state, setState] = useState<unknown>(v[0]);
        updateState = setState;
        return useMemo(() => JSON.stringify(state), [state]);
      };

      const root = mount(<Comp />);
      expectHtml(root).toBe(JSON.stringify(v[0]));

      await act(() => updateState!(v[1]));
      expectHtml(root).toBe(JSON.stringify(v[1]));
    });
  }
});
