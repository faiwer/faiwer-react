import { nullthrows } from 'faiwer-react/utils';
import { expectHtml, mount, useStateX, wait, waitFor } from '../helpers';
import { act } from 'faiwer-react/testing';

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

  it.todo(`doesn't recover the value when setState was called`);
  it.todo(`treats manual .value changes as user events`);
  it.todo(`the order of value & onChange props doesn't matter`);
});
