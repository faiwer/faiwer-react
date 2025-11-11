import { useStableCallback } from '~/index';
import { act } from '~/testing';
import { mount, useStateX } from '../helpers';

describe('Hooks: useStableCallback', () => {
  it('returns the same method each render', async () => {
    const state = useStateX<number>();
    let fn: Function;

    const Comp = () => {
      const currentState = state.use(0);
      fn = useStableCallback(() => currentState);
      return null;
    };

    mount(<Comp />);
    expect(fn!()).toBe(0);

    let prev = fn!;
    await act(() => state.set(2));
    expect(fn!()).toBe(2);
    expect(prev).toBe(fn!);
  });
});
