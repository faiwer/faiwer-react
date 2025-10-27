import { useState, useCallback, type StateSetter } from '~/index';
import { act } from '~/testing';
import { expectHtml, mount } from '../helpers';

describe('Hooks: useCallback', () => {
  it('memoizes the given function', async () => {
    let setState: StateSetter<number>;

    const Comp = () => {
      const [v, setV] = useState(42);
      const fn = useCallback(() => v, []);
      setState = setV;
      return fn();
    };

    const root = mount(<Comp />);
    expectHtml(root).toBe('42');

    await act(() => setState!(11));
    expectHtml(root).toBe('42');
  });

  it('updates the function when at least one of the deps is changed', async () => {
    let setState: StateSetter<number>;
    const Comp = () => {
      const [v, setV] = useState(42);
      setState = setV;
      const fn = useCallback(() => v, [v]);
      return [v, '-', fn()];
    };

    const root = mount(<Comp />);
    expectHtml(root).toBe('42-42');

    await act(() => setState!(55));
    expectHtml(root).toBe('55-55');
  });
});
