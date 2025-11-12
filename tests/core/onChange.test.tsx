import { nullthrows } from 'faiwer-react/utils';
import { expectHtml, mount, useStateX, waitFor } from '../helpers';
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
  });

  it.todo('unsubscribes on deletion');
  it.todo(`doesn't interfere when the value-prop is nil`);
  it.todo(`doesn't recover the value when setState was called`);
  it.todo(`treats manual .value changes as user events`);
});
