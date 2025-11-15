import { nullthrows } from 'faiwer-react/utils';
import {
  actAndWaitRAF,
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

describe('value &| onChange', () => {
  const getDescriptor = (
    Element: new () => HTMLElement,
    prop: string,
  ): PropertyDescriptor =>
    Object.getOwnPropertyDescriptor(Element.prototype, prop)!;

  const descriptors: Record<string, Record<string, PropertyDescriptor>> = {
    INPUT: {
      value: getDescriptor(HTMLInputElement, 'value'),
      checked: getDescriptor(HTMLInputElement, 'checked'),
    },
    TEXTAREA: {
      value: getDescriptor(HTMLTextAreaElement, 'value'),
    },
  };

  const get = (input: Element, valueProp: 'value' | 'checked') =>
    nullthrows(descriptors[input.tagName][valueProp].get).call(input);
  const set = (
    input: Element,
    valueProp: 'value' | 'checked',
    value: boolean | string,
  ) => nullthrows(descriptors[input.tagName][valueProp].set).call(input, value);

  const changeByUser = (
    input: HTMLElement,
    valueProp: 'value' | 'checked',
    value: boolean | string,
  ) => {
    set(input, valueProp, value);
    input.dispatchEvent(new InputEvent('input'));
  };

  // `addEventListener` & `removeEventListener` calls.
  const eventCall = ['input', expect.any(Function), { capture: false }];
  const modes: Array<['input' | 'textarea', 'value' | 'checked']> = [
    ['input', 'value'],
    ['input', 'checked'],
    ['textarea', 'value'],
  ];

  for (const [Tag, valueProp] of modes) {
    const inputType =
      Tag === 'textarea'
        ? undefined
        : valueProp === 'value'
          ? 'text'
          : 'checkbox';

    const checkHtml = (root: HTMLElement) =>
      Tag === 'textarea'
        ? expectHtml(root).toBe(`<textarea></textarea>`)
        : expectHtml(root).toBe(
            `<input type="${valueProp === 'checked' ? 'checkbox' : 'text'}">`,
          );

    const PRE = `<${Tag}/>` + (Tag === 'textarea' ? '' : `.${valueProp}`);

    const getValueFromEvent = <T extends string | boolean = string | boolean>(
      event: PatchEvent<HTMLInputElement> | PatchEvent<HTMLTextAreaElement>,
    ): T =>
      valueProp === 'value'
        ? (event.target.value as T)
        : ((event.target as HTMLInputElement).checked as T);

    it(`${PRE}. converts "undefined" value to an empty string or false`, () => {
      const root = mount(
        <Tag type={inputType} {...{ [valueProp]: undefined }} />,
      );
      const control = root.querySelector(Tag)!;
      expect(get(control, valueProp)).toBe(valueProp === 'value' ? '' : false);
    });

    it(`${PRE}: It keeps value static when the "value" prop is given`, async () => {
      type K = 'initial' | 'newUserVal' | 'newStateVal';
      const values: Record<K, boolean> | Record<K, string> =
        valueProp === 'value'
          ? {
              initial: 'initial',
              newUserVal: 'newUserVal',
              newStateVal: 'newStateVal',
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
        <Tag
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
      const control = root.querySelector(Tag)!;

      checkHtml(root);
      expect(get(control, valueProp)).toBe(values.initial);
      expect(onChange).toHaveBeenCalledTimes(0);
      expect(addEventListener.mock.calls).toEqual([eventCall, eventCall]);

      await actAndWaitRAF(() =>
        changeByUser(control, valueProp, values.newUserVal),
      );

      expect(get(control, valueProp)).toBe(values.initial); // Is intact
      expect(onChange).toHaveBeenCalledTimes(1);
      // Got access to the updated value in the "onChange" handler
      expect(onChange).toHaveBeenLastCalledWith(values.newUserVal);

      await act(() => v.set(values.newStateVal));
      expect(get(control, valueProp)).toBe(values.newStateVal);
      expect(onChange).toHaveBeenCalledTimes(1);
      expect(addEventListener).toHaveBeenCalledTimes(2); // still 2.
    });

    it(`${PRE}: unsubscribes on tag removal`, async () => {
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
      expect(addEventListener.mock.calls).toEqual([eventCall, eventCall]);
      expect(removeEventListener).toHaveBeenCalledTimes(0);

      await act(() => show.set(false));

      expect(removeEventListener).toHaveBeenCalledTimes(2);
      expect(removeEventListener.mock.calls).toEqual(
        addEventListener.mock.calls,
      );
    });

    it(`${PRE}: doesn't interfere when the value-prop is nil`, () => {
      const addEventListener = jest.spyOn(
        Element.prototype,
        'addEventListener',
      );
      const onChange = jest.fn();

      const root = mount(<Tag type={inputType} onChange={onChange} />);
      const control = root.querySelector(Tag)!;

      expect(addEventListener.mock.calls).toEqual([eventCall]);

      const newValue = valueProp === 'value' ? '21' : false;
      changeByUser(control, valueProp, newValue);
      expect(get(control, valueProp)).toBe(newValue);
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
      it(`${PRE}: doesn't interfere when the value-prop is nil-ed afterwards. ${nilValue}`, async () => {
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
          <Tag
            type={inputType}
            {...{
              [valueProp]: !nil.use(false)
                ? values.initial
                : (nilValue as undefined),
            }}
            onChange={onChange}
          />
        );
        const root = mount(<Comp />);
        const control = root.querySelector(Tag)!;

        expect(addEventListener.mock.calls).toEqual([eventCall, eventCall]);

        changeByUser(control, valueProp, values.initial);
        await waitFor(() => {
          expect(get(control, valueProp)).toBe(values.initial);
        });

        await act(() => nil.set(true));

        changeByUser(control, valueProp, values.newUserVal);
        await wait(5);
        expect(get(control, valueProp)).toBe(values.newUserVal);
      });
    }

    it(`${PRE}: doesn't recover the value-prop when setState was called`, async () => {
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
          <Tag
            type={inputType}
            {...{ [valueProp]: v }}
            onChange={(event) => setV(getValueFromEvent(event))}
          />
        );
      };

      const root = mount(<Comp />);
      checkHtml(root);
      const control = root.querySelector(Tag)!;
      expect(get(control, valueProp)).toBe(
        typeof values.initial === 'boolean'
          ? values.initial
          : String(values.initial),
      );

      const newValAdapted =
        typeof values.newUserVal === 'boolean'
          ? values.newUserVal
          : String(values.newUserVal);
      await act(() => changeByUser(control, valueProp, newValAdapted));
      expect(get(control, valueProp)).toBe(newValAdapted);
      await wait(5);
      expect(get(control, valueProp)).toBe(newValAdapted);
    });

    // It doesn't work this way in original React. But, why not?
    it(`${PRE}: treats manual value changes as user events`, async () => {
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
          <Tag
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
      const control = root.querySelector(Tag)!;
      expect(get(control, valueProp)).toBe(values.initial);

      (control as unknown as Record<string, unknown>)[valueProp] =
        values.newCodeVal;
      expect(get(control, valueProp)).toBe(values.newCodeVal);
      expect(onChange.mock.calls).toEqual([[values.newCodeVal]]);
    });

    it(`${PRE}: the order of value & onChange props doesn't matter`, async () => {
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
            <Tag
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
            <Tag
              type={inputType}
              onChange={(event) => setV(getValueFromEvent(event))}
              {...{ [valueProp]: v }}
            />
          )
        );
      };

      const roots = [mount(<Comp1 />), mount(<Comp2 />)];
      const inputs = roots.map((r) => r.querySelector(Tag)!);
      inputs.forEach((i) => expect(get(i, valueProp)).toBe(values.initial));

      expect(addEventListener.mock.calls).toEqual([
        eventCall,
        eventCall,
        eventCall,
        eventCall,
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
