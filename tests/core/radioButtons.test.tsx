import { act } from 'faiwer-react/testing';
import { mount, useStateX } from '../helpers';

describe('<input type="radio"/>', () => {
  const descriptor = Object.getOwnPropertyDescriptor(
    HTMLInputElement.prototype,
    'checked',
  )!;
  const set = (el: Element, v: boolean) => descriptor.set!.call(el, v);

  const selectRadio = (el: Element) => {
    set(el, true);
    el.dispatchEvent(new InputEvent('input'));
  };

  const checkSelection = (
    radios: Element[],
    selection: string | null,
  ): void => {
    for (const r of radios) {
      const input = r as HTMLInputElement;
      expect(input.checked).toBe(input.value === selection);
    }
  };

  it('handles the checked prop', () => {
    const root = mount(
      <div>
        <input type="radio" name="group" value="a" checked />
        <input type="radio" name="group" value="b" />
      </div>,
    );
    const [a, b] = root.querySelectorAll('input');
    checkSelection([a, b], 'a');
  });

  it(`handles a controlled radio-group`, async () => {
    const value = useStateX<string>();
    const onRender = jest.fn();
    const onChange = jest.fn().mockImplementation((v: string) => value.set(v));

    const Comp = () => {
      const selection = value.use('a');
      onRender(selection);

      return (
        <div>
          {['a', 'b'].map((v) => (
            <input
              type="radio"
              name="group"
              value={v}
              checked={v === selection}
              onChange={(evt) => onChange(evt.target.value)}
            />
          ))}
        </div>
      );
    };

    const root = mount(<Comp />);
    const [a, b] = root.querySelectorAll('input');
    checkSelection([a, b], 'a');

    await act(() => selectRadio(b));
    expect(onChange.mock.calls).toEqual([['b']]);
    expect(onRender.mock.lastCall).toEqual(['b']);
    checkSelection([a, b], 'b');

    await act(() => selectRadio(a));
    expect(onChange.mock.calls).toEqual([['b'], ['a']]);
    expect(onRender.mock.lastCall).toEqual(['a']);
    checkSelection([a, b], 'a');
  });

  it('ignores uncontrolled radios', async () => {
    const onChange = jest.fn();
    const onRender = jest.fn();

    const Comp = () => {
      onRender();
      return (
        <form>
          {['a', 'b'].map((v) => (
            <input
              type="radio"
              name="group"
              value={v}
              onChange={(e) => onChange(e.target.value)}
            />
          ))}
          <input
            type="radio"
            name="another"
            value="c"
            onChange={(e) => onChange(e.target.value)}
          />
        </form>
      );
    };
    const root = mount(<Comp />);

    const [a, b, c] = root.querySelectorAll('input');
    checkSelection([a, b], null);
    checkSelection([c], null);

    await act(() => selectRadio(b));
    checkSelection([a, b], 'b');
    checkSelection([c], null);

    await act(() => selectRadio(c));
    checkSelection([a, b], 'b');
    checkSelection([c], 'c');

    await act(() => selectRadio(a));
    checkSelection([a, b], 'a');
    checkSelection([c], 'c');

    expect(onRender).toHaveBeenCalledTimes(1);
    expect(onChange.mock.calls).toEqual([['b'], ['c'], ['a']]);
  });
});
