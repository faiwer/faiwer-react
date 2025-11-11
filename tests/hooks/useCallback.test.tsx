import { useCallback } from '~/index';
import { act } from '~/testing';
import { expectHtml, mount, useStateX } from '../helpers';

describe('Hooks: useCallback', () => {
  it('memoizes the given function', async () => {
    const state = useStateX<number>();

    const Comp = () => {
      const v = state.use(42);
      const fn = useCallback(() => v, []);
      return fn();
    };

    const root = mount(<Comp />);
    expectHtml(root).toBe('42');

    await act(() => state.set(11));
    expectHtml(root).toBe('42');
  });

  it('updates the function when at least one of the deps is changed', async () => {
    const state = useStateX<number>();
    const Comp = () => {
      const v = state.use(42);
      const fn = useCallback(() => v, [v]);
      return [v, '-', fn()];
    };

    const root = mount(<Comp />);
    expectHtml(root).toBe('42-42');

    await act(() => state.set(55));
    expectHtml(root).toBe('55-55');
  });
});
