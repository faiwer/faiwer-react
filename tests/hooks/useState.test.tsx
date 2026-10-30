import { useState, type StateSetter } from '~/index';
import { act } from '~/testing';
import { expectHtml, mount } from '../helpers';

describe('Hooks: useState', () => {
  it('useState uses the initial value', () => {
    const Comp = () => {
      const [content] = useState('Content');
      return <div>{content}</div>;
    };
    expectHtml(mount(<Comp />)).toBe('<div>Content</div>');
  });

  it('throws when setState is called during the rendering phase', async () => {
    const Comp = () => {
      const [, setSt] = useState(0);
      setSt(2);
      return null;
    };
    expect(() => mount(<Comp />)).toThrow('render phase');
  });

  it('It supports a fabric as the 1st argument', () => {
    const Comp = () => {
      const [v] = useState(() => 42);
      return v;
    };
    expectHtml(mount(<Comp />)).toBe('42');
  });

  it('supports a function as a setter', async () => {
    let updateState: StateSetter<number>;
    const Comp = () => {
      const [state, setState] = useState(0);
      updateState = setState;
      return state;
    };

    const root = mount(<Comp />);
    expectHtml(root).toBe('0');

    for (let i = 0; i < 5; ++i) {
      await act(() => updateState((v) => v + 1));
      expectHtml(root).toBe(String(i + 1));
    }
  });

  it('supports a function as a value', async () => {
    let updateState: StateSetter<(v: number) => number>;
    const square = (v: number) => v ** 2;
    const Comp = () => {
      const [state, setState] = useState(() => square);
      updateState = setState;
      return state(2);
    };

    const root = mount(<Comp />);
    expectHtml(root).toBe('4');

    let prev: Function;
    await act(() =>
      updateState((prevValue: typeof prev) => {
        prev = prevValue;
        return (v: number) => v ** 3;
      }),
    );
    expectHtml(root).toBe('8');
    expect(prev!).toBe(square);
  });

  it('does not re-render when setting NaN over NaN', async () => {
    let renders = 0;
    let updateState: StateSetter<number>;
    const Comp = () => {
      renders += 1;
      const [state, setState] = useState(NaN);
      updateState = setState;
      return String(state);
    };

    mount(<Comp />);
    expect(renders).toBe(1);

    await act(() => updateState(NaN));
    expect(renders).toBe(1);
  });

  it('re-renders when setting -0 over 0', async () => {
    let renders = 0;
    let updateState: StateSetter<number>;
    const Comp = () => {
      renders += 1;
      const [state, setState] = useState(0);
      updateState = setState;
      return Object.is(state, -0) ? '-0' : String(state);
    };

    const root = mount(<Comp />);
    expectHtml(root).toBe('0');

    await act(() => updateState(-0));
    expect(renders).toBe(2);
    expectHtml(root).toBe('-0');
  });
});
