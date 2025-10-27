import { useState, type StateSetter, useStableCallback } from '~/index';
import { act } from '~/testing';
import { mount } from '../helpers';

describe('Hooks: useStableCallback', () => {
  it('returns the same method each render', async () => {
    let updateState: StateSetter<number>;
    let fn: Function;

    const Comp = () => {
      const [state, setState] = useState(0);
      updateState = setState;
      fn = useStableCallback(() => state);
      return null;
    };

    mount(<Comp />);
    expect(fn!()).toBe(0);

    let prev = fn!;
    await act(() => updateState!(2));
    expect(fn!()).toBe(2);
    expect(prev).toBe(fn!);
  });
});
