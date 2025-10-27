import { useId } from '~/index';
import { act } from '~/testing';
import { mount, useRerender } from '../helpers';

describe('Hooks: useId', () => {
  it('returns the same ID every render', async () => {
    let rerender: () => void;
    const Comp = () => {
      rerender = useRerender();
      return `${useId()}|${useId()}`;
    };

    const root = mount(<Comp />);
    let prev = root.textContent ?? '';

    const values1 = prev.split('|');
    expect(values1.length).toBe(2);
    expect(values1[0]).not.toBe(values1[1]);
    values1.every((v) => expect(v.length).toBeGreaterThan(0));

    await act(() => rerender());
    expect(root.textContent).toBe(prev);
  });

  it(`doesn't return the same IDs for different components`, () => {
    const Comp = () => useId();
    const root = mount([<Comp />, '|', <Comp />]);
    const ids = (root.textContent ?? '').split('|');
    expect(ids.length).toBe(2);
    expect(ids[0]).not.toBe(ids[1]);
  });
});
