import { nullthrows } from 'faiwer-react/utils';
import {
  expectHtml,
  mount,
  useRerender,
  useStateX,
  wait,
  waitFor,
} from '../helpers';
import { act } from 'faiwer-react/testing';
import { useState } from 'faiwer-react';

describe('onChange', () => {
  const descriptor = Object.getOwnPropertyDescriptor(
    HTMLInputElement.prototype,
    'value',
  )!;
  const get = nullthrows(descriptor.get);
  const set = nullthrows(descriptor.set);

  const changeByUser = (input: HTMLElement, value: string) => {
    set.call(input, value);
    input.dispatchEvent(new InputEvent('input'));
  };

  it('It keeps input.value static when the "value" prop is given', async () => {
    const onChange = jest.fn();
    const v = useStateX<string>();
    const addEventListener = jest.spyOn(Element.prototype, 'addEventListener');

    const Comp = () => (
      <input
        value={v.use('42')}
        onChange={(evt) => onChange(evt.target.value)}
      />
    );

    const root = mount(<Comp />);
    const input = root.querySelector('input')!;

    expectHtml(root).toBe('<input>');
    expect(get.call(input)).toBe('42');
    expect(onChange).toHaveBeenCalledTimes(0);
    expect(addEventListener.mock.calls).toEqual([
      ['input', expect.any(Function), { capture: true }],
      ['input', expect.any(Function), { capture: false }],
    ]);

    changeByUser(input, '21');
    await waitFor(() => {
      expect(get.call(input)).toBe('42'); // Is intact
      expect(onChange).toHaveBeenCalledTimes(1);
      // Got access to the updated value in the "onChange" handler
      expect(onChange).toHaveBeenLastCalledWith('21');
    });

    await act(() => v.set('22'));
    expect(get.call(input)).toBe('22');
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(addEventListener).toHaveBeenCalledTimes(2); // still 2.
  });

  it('unsubscribes on tag removal', async () => {
    const addEventListener = jest.spyOn(Element.prototype, 'addEventListener');
    const removeEventListener = jest.spyOn(
      Element.prototype,
      'removeEventListener',
    );
    const onChange = jest.fn();

    const show = useStateX<boolean>();
    const Comp = () =>
      show.use(true) && <input value="42" onChange={onChange} />;

    mount(<Comp />);
    expect(addEventListener.mock.calls).toEqual([
      ['input', expect.any(Function), { capture: true }],
      ['input', expect.any(Function), { capture: false }],
    ]);
    expect(removeEventListener).toHaveBeenCalledTimes(0);

    await act(() => show.set(false));

    expect(removeEventListener).toHaveBeenCalledTimes(2);
    expect(removeEventListener.mock.calls).toEqual(addEventListener.mock.calls);
  });

  it(`doesn't interfere when the value-prop is nil`, () => {
    const addEventListener = jest.spyOn(Element.prototype, 'addEventListener');
    const onChange = jest.fn();

    const root = mount(<input onChange={onChange} />);
    const input = root.querySelector('input')!;

    expect(addEventListener.mock.calls).toEqual([
      ['input', expect.any(Function), { capture: false }],
    ]);

    changeByUser(input, '21');
    expect(get.call(input)).toBe('21');
    expect(onChange.mock.calls).toEqual([
      [
        expect.objectContaining({
          target: expect.objectContaining({
            value: '21',
          }),
        }),
      ],
    ]);
  });

  for (const nilValue of [null, undefined]) {
    it(`doesn't interfere when the value-prop is nil-ed afterwards. ${nilValue}`, async () => {
      const addEventListener = jest.spyOn(
        Element.prototype,
        'addEventListener',
      );
      const onChange = jest.fn();
      const nil = useStateX<boolean>();

      const Comp = () => (
        <input
          value={!nil.use(false) ? '42' : (nilValue as undefined)}
          onChange={onChange}
        />
      );
      const root = mount(<Comp />);
      const input = root.querySelector('input')!;

      expect(addEventListener.mock.calls).toEqual([
        ['input', expect.any(Function), { capture: true }],
        ['input', expect.any(Function), { capture: false }],
      ]);

      changeByUser(input, '21');
      await waitFor(() => {
        expect(get.call(input)).toBe('42');
      });

      await act(() => nil.set(true));

      changeByUser(input, '12');
      await wait(5);
      expect(get.call(input)).toBe('12');
    });
  }

  it(`doesn't recover the value when setState was called`, async () => {
    const Comp = () => {
      const [v, setV] = useState(0);
      return <input value={v} onChange={(e) => setV(Number(e.target.value))} />;
    };

    const root = mount(<Comp />);
    expectHtml(root).toBe('<input>');
    const input = root.querySelector('input')!;
    expect(get.call(input)).toBe('0');

    await act(() => changeByUser(input, '1'));
    expect(get.call(input)).toBe('1');
    await wait(5);
    expect(get.call(input)).toBe('1');
  });

  // It doesn't work this way in original React. But, why not?
  it(`treats manual .value changes as user events`, async () => {
    const onChange = jest.fn();

    const Comp = () => {
      const [v, setV] = useState(42);
      return (
        <input
          value={v}
          onChange={(e) => {
            onChange(e.target.value);
            setV(Number(e.target.value));
          }}
        />
      );
    };

    const root = mount(<Comp />);
    const input = root.querySelector('input')!;
    expect(get.call(input)).toBe('42');

    input.value = '21';
    expect(get.call(input)).toBe('21');
    expect(onChange.mock.calls).toEqual([['21']]);
  });

  it(`the order of value & onChange props doesn't matter`, async () => {
    const addEventListener = jest.spyOn(Element.prototype, 'addEventListener');
    const removeEventListener = jest.spyOn(
      Element.prototype,
      'removeEventListener',
    );

    let show = true;
    let rerender1: () => void;
    let rerender2: () => void;

    const Comp1 = () => {
      const [v, setV] = useState('a');
      rerender1 = useRerender();
      return show && <input value={v} onChange={(e) => setV(e.target.value)} />;
    };
    const Comp2 = () => {
      const [v, setV] = useState('a');
      rerender2 = useRerender();
      return show && <input onChange={(e) => setV(e.target.value)} value={v} />;
    };

    const roots = [mount(<Comp1 />), mount(<Comp2 />)];
    const inputs = roots.map((r) => r.querySelector('input')!);
    inputs.forEach((i) => expect(get.call(i)).toBe('a'));

    const call1 = ['input', expect.any(Function), { capture: true }];
    const call2 = ['input', expect.any(Function), { capture: false }];
    expect(addEventListener.mock.calls).toEqual([
      // 1st input
      call1,
      call2,
      // 2nd input, reverse order
      call2,
      call1,
    ]);

    inputs.forEach((i) => changeByUser(i, 'ab'));
    inputs.forEach((i) => expect(get.call(i)).toBe('ab'));

    await act(() => {
      show = false;
      rerender1();
      rerender2();
    });

    expect(removeEventListener.mock.calls).toEqual(addEventListener.mock.calls);
  });
});
