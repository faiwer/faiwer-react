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
      updateState((prevValue) => {
        prev = prevValue;
        return (v: number) => v ** 3;
      }),
    );
    expectHtml(root).toBe('8');
    expect(prev!).toBe(square);
  });
});
