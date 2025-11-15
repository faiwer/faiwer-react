import { act } from 'faiwer-react/testing';
import { actAndWaitRAF, interceptRAFOnce, mount, useStateX } from '../helpers';
import type { PatchEvent } from 'faiwer-react/types/events';
import { useState } from 'faiwer-react';

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

  for (const mode of [false, null, undefined, 'omit']) {
    it(`handles a controlled radio-group. mode: ${mode}`, async () => {
      const value = useStateX<string>();
      const onRender = jest.fn();
      const onChange = jest
        .fn()
        .mockImplementation((v: string) => value.set(v));

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
                {...(v === selection || mode !== 'omit'
                  ? { checked: v === selection ? true : (mode as boolean) }
                  : {})}
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
  }

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

  it(`doesn't group controlled static-valued radios with different names`, async () => {
    const Comp = () => {
      return (
        <div>
          {['a', 'b'].map((v, idx) => (
            <input
              type="radio"
              name={'g' + (idx + 1)}
              value={v}
              checked={v === 'a'}
            />
          ))}
        </div>
      );
    };

    const root = mount(<Comp />);
    const [a, b] = root.querySelectorAll('input');

    checkSelection([a], 'a');
    checkSelection([b], null);

    await actAndWaitRAF(() => selectRadio(b));
    checkSelection([a], 'a');
    checkSelection([b], null);
  });

  for (const mode of ['withName', 'withoutName']) {
    it(`doesn't allow to change fixed value. ${mode}`, async () => {
      const root = mount(
        <div>
          {['a', 'b'].map((v) => (
            <input
              type="radio"
              value={v}
              checked={v === 'a'}
              {...(mode === 'withName' ? { name: 'form' } : {})}
            />
          ))}
        </div>,
      );
      const [a, b] = root.querySelectorAll('input');

      checkSelection([a, b], 'a');

      const raf = interceptRAFOnce();
      await act(() => selectRadio(b));

      raf();
      checkSelection([a, b], 'a');
    });
  }

  it(`doesn't group radios from different forms: controlled`, async () => {
    const values = {
      F1: useStateX<Value>(),
      F2: useStateX<Value>(),
    };
    type FormId = keyof typeof values;
    type Value = 'a' | 'b';

    const onChange = jest
      .fn()
      .mockImplementation((id: FormId, value: Value) => {
        values[id].set(value);
      });

    const Form = ({ id }: { id: FormId }) => {
      const selection = values[id].use('a');
      return (
        <form>
          {['a', 'b'].map((v) => (
            <input
              type="radio"
              name="form" // the same for both forms.
              value={v}
              checked={selection === v}
              onChange={(e) => onChange(id, e.target.value)}
            />
          ))}
        </form>
      );
    };
    const Comp = () => (
      <div>
        <Form id="F1" />
        <Form id="F2" />
      </div>
    );

    const root = mount(<Comp />);
    const [f1, f2] = root.querySelectorAll('form');
    const i = [
      [...f1.querySelectorAll('input')],
      [...f2.querySelectorAll('input')],
    ];

    checkSelection(i[0], 'a');
    checkSelection(i[1], 'a');

    await actAndWaitRAF(() => selectRadio(i[0][1]));
    checkSelection(i[0], 'b');
    checkSelection(i[1], 'a');
    expect(onChange.mock.calls).toEqual([['F1', 'b']]);

    await actAndWaitRAF(() => selectRadio(i[1][1]));
    checkSelection(i[0], 'b');
    checkSelection(i[1], 'b');
    expect(onChange.mock.lastCall).toEqual(['F2', 'b']);

    await actAndWaitRAF(() => selectRadio(i[0][0]));
    checkSelection(i[0], 'a');
    checkSelection(i[1], 'b');
    expect(onChange.mock.lastCall).toEqual(['F1', 'a']);

    expect(onChange).toHaveBeenCalledTimes(3);
  });

  it(`doesn't group radios from different forms: uncontrolled`, async () => {
    const onChange = jest.fn();
    type FormId = 'F1' | 'F2';

    const Form = ({ id }: { id: FormId }) => {
      return (
        <form>
          {['a', 'b'].map((v) => (
            <input
              type="radio"
              name="form" // the same for both forms.
              value={v}
              onChange={(e) => onChange(id, e.target.value)}
            />
          ))}
        </form>
      );
    };
    const Comp = () => (
      <div>
        <Form id="F1" />
        <Form id="F2" />
      </div>
    );

    const root = mount(<Comp />);
    const [f1, f2] = root.querySelectorAll('form');
    const radios = [
      [...f1.querySelectorAll('input')],
      [...f2.querySelectorAll('input')],
    ];

    checkSelection(radios[0], null);
    checkSelection(radios[1], null);

    await actAndWaitRAF(() => selectRadio(radios[0][1]));
    checkSelection(radios[0], 'b');
    checkSelection(radios[1], null);
    expect(onChange.mock.calls).toEqual([['F1', 'b']]);

    await actAndWaitRAF(() => selectRadio(radios[1][1]));
    checkSelection(radios[0], 'b');
    checkSelection(radios[1], 'b');
    expect(onChange.mock.lastCall).toEqual(['F2', 'b']);

    await actAndWaitRAF(() => selectRadio(radios[0][0]));
    checkSelection(radios[0], 'a');
    checkSelection(radios[1], 'b');
    expect(onChange.mock.lastCall).toEqual(['F1', 'a']);

    expect(onChange).toHaveBeenCalledTimes(3);
  });

  for (const mode of ['direct', 'reverse']) {
    it(`the order of the attributes in JSX doesn't matter: ${mode}`, async () => {
      const Comp = () => {
        const [selection, setSelection] = useState<string>('a');
        const x = <T,>(arr: T[]): T[] =>
          mode === 'direct' ? arr : arr.reverse();
        return (
          <div>
            {['a', 'b'].map((v) => (
              <input
                name="group"
                {...Object.fromEntries(
                  x([
                    ['type', 'radio'],
                    ['value', v],
                    ['checked', selection === v],
                    [
                      'onChange',
                      (e: PatchEvent<HTMLInputElement, InputEvent>) =>
                        setSelection(e.target.value),
                    ],
                  ]),
                )}
              />
            ))}
          </div>
        );
      };

      const root = mount(<Comp />);
      const [a, b] = root.querySelectorAll('input');
      checkSelection([a, b], 'a');

      await actAndWaitRAF(() => selectRadio(b));
      checkSelection([a, b], 'b');
    });
  }

  it('handles radio buttons from different components', async () => {
    const Radio = ({
      checked,
      value,
      onChange,
    }: {
      value: string;
      onChange: () => void;
      checked: boolean;
    }) => (
      <input
        type="radio"
        name="form"
        value={value}
        checked={checked}
        onChange={onChange}
      />
    );

    type Props = { selection: string; setSelection: (v: string) => void };

    const C1 = ({ selection, setSelection }: Props) => (
      <Radio
        checked={selection === 'a'}
        value="a"
        onChange={() => setSelection('a')}
      />
    );

    const C2 = ({ selection, setSelection }: Props) => (
      <Radio
        checked={selection === 'b'}
        value="b"
        onChange={() => setSelection('b')}
      />
    );

    const Parent = (props: Props) => {
      return <C2 {...props} />;
    };

    const Root = () => {
      const [selection, setSelection] = useState('a');
      const props: Props = { selection, setSelection };
      return (
        <div>
          <C1 {...props} />
          <Parent {...props}></Parent>
        </div>
      );
    };

    const root = mount(<Root />);
    const [a, b] = root.querySelectorAll('input');
    checkSelection([a, b], 'a');

    await actAndWaitRAF(() => selectRadio(b));
    checkSelection([a, b], 'b');

    await actAndWaitRAF(() => selectRadio(a));
    checkSelection([a, b], 'a');
  });
});
