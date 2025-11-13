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
import type { PatchEvent } from 'faiwer-react/types/events';

describe('onChange', () => {
  const descriptors = {
    value: Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      'value',
    )!,
    checked: Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      'checked',
    )!,
  };
  const get = (input: Element, valueProp: 'value' | 'checked') =>
    nullthrows(descriptors[valueProp].get).call(input);
  const set = (
    input: Element,
    valueProps: 'value' | 'checked',
    value: boolean | string,
  ) => nullthrows(descriptors[valueProps].set).call(input, value);

  const changeByUser = (
    input: HTMLElement,
    valueProp: 'value' | 'checked',
    value: boolean | string,
  ) => {
    set(input, valueProp, value);
    input.dispatchEvent(new InputEvent('input'));
  };

  for (const valueProp of ['checked', 'value'] as const) {
    const inputType = valueProp === 'value' ? 'text' : 'checkbox';
    const getValueFromEvent = <T extends string | boolean = string | boolean>(
      event: PatchEvent<HTMLInputElement>,
    ): T =>
      valueProp === 'value'
        ? (event.target.value as T)
        : (event.target.checked as T);

    it(`It keeps input.${valueProp} static when the "value" prop is given`, async () => {
      type K = 'initial' | 'newUserVal' | 'newStateVal';
      const values: Record<K, boolean> | Record<K, string> =
        valueProp === 'value'
          ? {
              initial: '42',
              newUserVal: '21',
              newStateVal: '22',
            }
          : {
              initial: true,
              newUserVal: false,
              newStateVal: false,
            };

      const onChange = jest.fn();
      const v = useStateX<string | boolean>();
      const addEventListener = jest.spyOn(
        Element.prototype,
        'addEventListener',
      );

      const Comp = () => (
        <input
          type={inputType}
          {...{
            [valueProp]:
              valueProp === 'value'
                ? String(v.use(values.initial))
                : !!v.use(values.initial),
          }}
          onChange={(evt) => onChange(getValueFromEvent(evt))}
        />
      );

      const root = mount(<Comp />);
      const input = root.querySelector('input')!;

      expectHtml(root).toBe(`<input type="${inputType}">`);
      expect(get(input, valueProp)).toBe(values.initial);
      expect(onChange).toHaveBeenCalledTimes(0);
      expect(addEventListener.mock.calls).toEqual([
        ['input', expect.any(Function), { capture: true }],
        ['input', expect.any(Function), { capture: false }],
      ]);

      changeByUser(input, valueProp, values.newUserVal);
      await waitFor(() => {
        expect(get(input, valueProp)).toBe(values.initial); // Is intact
        expect(onChange).toHaveBeenCalledTimes(1);
        // Got access to the updated value in the "onChange" handler
        expect(onChange).toHaveBeenLastCalledWith(values.newUserVal);
      });

      await act(() => v.set(values.newStateVal));
      expect(get(input, valueProp)).toBe(values.newStateVal);
      expect(onChange).toHaveBeenCalledTimes(1);
      expect(addEventListener).toHaveBeenCalledTimes(2); // still 2.
    });

    it(`unsubscribes on tag removal. prop=${valueProp}`, async () => {
      const addEventListener = jest.spyOn(
        Element.prototype,
        'addEventListener',
      );
      const removeEventListener = jest.spyOn(
        Element.prototype,
        'removeEventListener',
      );
      const onChange = jest.fn();

      const show = useStateX<boolean>();
      const Comp = () =>
        show.use(true) &&
        (valueProp === 'value' ? (
          <input value="42" onChange={onChange} />
        ) : (
          <input type="checkbox" checked={true} onChange={onChange} />
        ));

      mount(<Comp />);
      expect(addEventListener.mock.calls).toEqual([
        ['input', expect.any(Function), { capture: true }],
        ['input', expect.any(Function), { capture: false }],
      ]);
      expect(removeEventListener).toHaveBeenCalledTimes(0);

      await act(() => show.set(false));

      expect(removeEventListener).toHaveBeenCalledTimes(2);
      expect(removeEventListener.mock.calls).toEqual(
        addEventListener.mock.calls,
      );
    });

    it(`doesn't interfere when the ${valueProp}-prop is nil`, () => {
      const addEventListener = jest.spyOn(
        Element.prototype,
        'addEventListener',
      );
      const onChange = jest.fn();

      const root = mount(
        <input
          type={valueProp === 'value' ? 'text' : 'checkbox'}
          onChange={onChange}
        />,
      );
      const input = root.querySelector('input')!;

      expect(addEventListener.mock.calls).toEqual([
        ['input', expect.any(Function), { capture: false }],
      ]);

      const newValue = valueProp === 'value' ? '21' : false;
      changeByUser(input, valueProp, newValue);
      expect(get(input, valueProp)).toBe(newValue);
      expect(onChange.mock.calls).toEqual([
        [
          expect.objectContaining({
            target: expect.objectContaining({
              [valueProp]: newValue,
            }),
          }),
        ],
      ]);
    });

    for (const nilValue of [null, undefined]) {
      it(`doesn't interfere when the ${valueProp}-prop is nil-ed afterwards. ${nilValue}`, async () => {
        const addEventListener = jest.spyOn(
          Element.prototype,
          'addEventListener',
        );
        const onChange = jest.fn();
        const nil = useStateX<boolean>();

        type K = 'initial' | 'newUserVal';
        const values: Record<K, string | boolean> =
          valueProp === 'value'
            ? {
                initial: '42',
                newUserVal: '12',
              }
            : {
                initial: true,
                newUserVal: false,
              };

        const Comp = () => (
          <input
            type={valueProp === 'value' ? 'text' : 'checkbox'}
            {...{
              [valueProp]: !nil.use(false)
                ? values.initial
                : (nilValue as undefined),
            }}
            onChange={onChange}
          />
        );
        const root = mount(<Comp />);
        const input = root.querySelector('input')!;

        expect(addEventListener.mock.calls).toEqual([
          ['input', expect.any(Function), { capture: true }],
          ['input', expect.any(Function), { capture: false }],
        ]);

        changeByUser(input, valueProp, values.initial);
        await waitFor(() => {
          expect(get(input, valueProp)).toBe(values.initial);
        });

        await act(() => nil.set(true));

        changeByUser(input, valueProp, values.newUserVal);
        await wait(5);
        expect(get(input, valueProp)).toBe(values.newUserVal);
      });
    }

    it(`doesn't recover the ${valueProp}-prop when setState was called`, async () => {
      type K = 'initial' | 'newUserVal';
      const values: Record<K, string | boolean> =
        valueProp === 'value'
          ? {
              initial: '0',
              newUserVal: '1',
            }
          : {
              initial: true,
              newUserVal: false,
            };

      const Comp = () => {
        const [v, setV] = useState(values.initial);
        return (
          <input
            type={inputType}
            {...{ [valueProp]: v }}
            onChange={(event) => setV(getValueFromEvent(event))}
          />
        );
      };

      const root = mount(<Comp />);
      expectHtml(root).toBe(`<input type="${inputType}">`);
      const input = root.querySelector('input')!;
      expect(get(input, valueProp)).toBe(
        typeof values.initial === 'boolean'
          ? values.initial
          : String(values.initial),
      );

      const newValAdapted =
        typeof values.newUserVal === 'boolean'
          ? values.newUserVal
          : String(values.newUserVal);
      await act(() => changeByUser(input, valueProp, newValAdapted));
      expect(get(input, valueProp)).toBe(newValAdapted);
      await wait(5);
      expect(get(input, valueProp)).toBe(newValAdapted);
    });

    // It doesn't work this way in original React. But, why not?
    it(`treats manual .${valueProp} changes as user events`, async () => {
      const onChange = jest.fn();

      type K = 'initial' | 'newCodeVal';
      const values: Record<K, string | boolean> =
        valueProp === 'value'
          ? {
              initial: '42',
              newCodeVal: '21',
            }
          : {
              initial: true,
              newCodeVal: false,
            };

      const Comp = () => {
        const [v, setV] = useState(values.initial);
        return (
          <input
            type={inputType}
            {...{ [valueProp]: v }}
            onChange={(event) => {
              const newValue = getValueFromEvent(event);
              onChange(newValue);
              setV(newValue);
            }}
          />
        );
      };

      const root = mount(<Comp />);
      const input = root.querySelector('input')!;
      expect(get(input, valueProp)).toBe(values.initial);

      (input as unknown as Record<string, unknown>)[valueProp] =
        values.newCodeVal;
      expect(get(input, valueProp)).toBe(values.newCodeVal);
      expect(onChange.mock.calls).toEqual([[values.newCodeVal]]);
    });

    it(`the order of ${valueProp} & onChange props doesn't matter`, async () => {
      const addEventListener = jest.spyOn(
        Element.prototype,
        'addEventListener',
      );
      const removeEventListener = jest.spyOn(
        Element.prototype,
        'removeEventListener',
      );

      let show = true;
      let rerender1: () => void;
      let rerender2: () => void;

      type K = 'initial' | 'newUserVal';
      const values: Record<K, string | boolean> =
        valueProp === 'value'
          ? {
              initial: 'a',
              newUserVal: 'ab',
            }
          : {
              initial: true,
              newUserVal: false,
            };

      const Comp1 = () => {
        const [v, setV] = useState(values.initial);
        rerender1 = useRerender();
        return (
          show && (
            <input
              type={inputType}
              {...{ [valueProp]: v }}
              onChange={(event) => setV(getValueFromEvent(event))}
            />
          )
        );
      };
      const Comp2 = () => {
        const [v, setV] = useState(values.initial);
        rerender2 = useRerender();
        return (
          show && (
            <input
              type={inputType}
              onChange={(event) => setV(getValueFromEvent(event))}
              {...{ [valueProp]: v }}
            />
          )
        );
      };

      const roots = [mount(<Comp1 />), mount(<Comp2 />)];
      const inputs = roots.map((r) => r.querySelector('input')!);
      inputs.forEach((i) => expect(get(i, valueProp)).toBe(values.initial));

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

      inputs.forEach((i) => changeByUser(i, valueProp, values.newUserVal));
      inputs.forEach((i) => expect(get(i, valueProp)).toBe(values.newUserVal));

      await act(() => {
        show = false;
        rerender1();
        rerender2();
      });

      expect(removeEventListener.mock.calls).toEqual(
        addEventListener.mock.calls,
      );
    });
  }
});
