import { act } from 'faiwer-react/testing';
import {
  actAndWaitRAF,
  expectHtml,
  mount,
  useRerender,
  useStateX,
} from '../helpers';
import { useState } from 'faiwer-react';

describe('<select/>', () => {
  const abOptions = (
    <>
      <option value="a" />
      <option value="b" />
    </>
  );

  type Value = undefined | string | number | Array<string | number>;

  const extract = (root: HTMLElement) => {
    const select = root.querySelector('select') as HTMLSelectElement;
    const options = [...root.querySelectorAll('option')] as HTMLOptionElement[];
    return [select, options] as const;
  };

  const checkValue = (select: HTMLSelectElement, value: Value) => {
    if (Array.isArray(value)) {
      value = value.map((v) => String(v));
    }

    expect(select.value).toBe(
      value == null || (Array.isArray(value) && value.length === 0)
        ? ''
        : Array.isArray(value)
          ? value[0]
          : String(value),
    );

    const options = [
      ...select.querySelectorAll('option'),
    ] as HTMLOptionElement[];
    for (const o of options) {
      expect(o.selected).toBe(
        Array.isArray(value)
          ? value.includes(o.value)
          : o.value === String(value),
      );
    }
  };

  const selectOption = (select: HTMLSelectElement, value: Value) => {
    const values = Array.isArray(value)
      ? value.map((v) => String(v))
      : [String(value)];
    for (const o of select.options) {
      o.selected = values.includes(o.value);
    }

    select.dispatchEvent(new InputEvent('input'));
  };

  it('sets initial value', () => {
    const root = mount(<select value="a">{abOptions}</select>);
    expectHtml(root).toBe(
      `<select><option value="a"></option><option value="b"></option></select>`,
    );
    const [select] = extract(root);
    checkValue(select, 'a');
  });

  it(`no "value"-props means the 1st option`, () => {
    const root = mount(<select>{abOptions}</select>);
    const [select] = extract(root);
    checkValue(select, 'a');
  });

  it(`value === "" means the 1st option`, () => {
    const root = mount(<select value="">{abOptions}</select>);
    const [select] = extract(root);
    checkValue(select, 'a');
  });

  it(`wrong value means the 1st option`, () => {
    const root = mount(<select value="wrong">{abOptions}</select>);
    const [select] = extract(root);
    checkValue(select, 'a');
  });

  it(`value === undefined means the 1st option`, () => {
    const root = mount(<select value={undefined}>{abOptions}</select>);
    const [select] = extract(root);
    checkValue(select, 'a');
  });

  it('can render an empty select', () => {
    const root = mount(
      <>
        <select />
        <select value="wrong" />
      </>,
    );
    const [s1, s2] = root.querySelectorAll('select');
    expect(s1.value).toBe('');
    expect(s2.value).toBe('');
  });

  for (const mode of ['strings', 'numbers'] as const) {
    it(`handles a controlled select. ${mode}`, async () => {
      const onChange = jest.fn();
      const v = useStateX<Value>();
      const initial: Value = mode === 'strings' ? 'a' : 0;
      const options: string[] | number[] =
        mode === 'strings' ? ['a', 'b'] : [0, 1];

      const Comp = () => {
        return (
          <select
            value={v.use(initial)}
            onChange={(e) => {
              onChange(e.target.value);
              v.set(
                mode === 'numbers' ? Number(e.target.value) : e.target.value,
              );
            }}
          >
            {options.map((v) => (
              <option key={v} value={v} />
            ))}
          </select>
        );
      };

      const root = mount(<Comp />);
      const [select] = extract(root);
      checkValue(select, initial);

      const v1 = mode === 'strings' ? 'b' : 1;
      await actAndWaitRAF(() => selectOption(select, v1));
      checkValue(select, v1);

      const v2 = mode === 'strings' ? 'a' : 0;
      await actAndWaitRAF(() => selectOption(select, v2));
      checkValue(select, v2);

      const v3 = mode === 'strings' ? 'b' : 1;
      await act(() => v.set(v3));
      checkValue(select, v3);

      await act(() => v.set(undefined)); // -> unconntrolled
      checkValue(select, v3); // Kept the latest, didn't override with ''
    });
  }

  it('handles the default value', async () => {
    const onRender = jest.fn();
    const onChange = jest.fn();

    const Comp = () => {
      onRender();
      return (
        <select onChange={(e) => onChange(e.target.value)} defaultValue="a">
          {abOptions}
        </select>
      );
    };

    const root = mount(<Comp />);
    expectHtml(root).toBe(
      `<select><option value="a"></option><option value="b"></option></select>`,
    );

    const [select] = extract(root);
    checkValue(select, 'a');

    await act(() => selectOption(select, 'b'));

    checkValue(select, 'b');
    expect(onRender).toHaveBeenCalledTimes(1);
    expect(onChange.mock.calls).toEqual([['b']]);
  });

  it('supports fixed values', async () => {
    const onChange = jest.fn();
    const onRender = jest.fn();

    const Comp = () => {
      onRender();
      return (
        <select value="a" onChange={(e) => onChange(e.target.value)}>
          {abOptions}
        </select>
      );
    };

    const root = mount(<Comp />);
    const [select] = extract(root);
    checkValue(select, 'a');
    expect(onRender).toHaveBeenCalledTimes(1);

    await actAndWaitRAF(() => selectOption(select, 'b'));
    checkValue(select, 'a');
    expect(onRender).toHaveBeenCalledTimes(1);
    expect(onChange.mock.calls).toEqual([['b']]);
  });

  it('supports uncontrolled selects', async () => {
    const onChange = jest.fn();
    const onRender = jest.fn();

    const Comp = () => {
      onRender();
      return (
        <select defaultValue="a" onChange={(e) => onChange(e.target.value)}>
          {abOptions}
        </select>
      );
    };

    const root = mount(<Comp />);
    const [select] = extract(root);
    checkValue(select, 'a');
    expect(onRender).toHaveBeenCalledTimes(1);

    await act(() => selectOption(select, 'b'));
    checkValue(select, 'b');
    expect(onChange.mock.calls).toEqual([['b']]);

    await act(() => selectOption(select, 'a'));
    expect(onChange.mock.calls).toEqual([['b'], ['a']]);
    expect(onRender).toHaveBeenCalledTimes(1);
  });

  for (const mode of ['numbers', 'strings']) {
    it(`supports multiple choice: controlled. ${mode}`, async () => {
      const options = mode === 'numbers' ? [0, 1, 2] : ['a', 'b', 'c'];
      const initial = mode === 'numbers' ? [0] : ['a'];

      const onChange = jest.fn();

      const Comp = () => {
        const [value, setValue] = useState<Array<string | number>>(initial);
        return (
          <select
            multiple
            value={value}
            onChange={(e) => {
              const values = [...e.target.selectedOptions].map((o) =>
                mode === 'numbers' ? Number(o.value) : o.value,
              );
              onChange(values);
              setValue(values);
            }}
          >
            {options.map((v) => (
              <option value={v} key={v} />
            ))}
          </select>
        );
      };

      const root = mount(<Comp />);
      const [select] = extract(root);
      expectHtml(root).toBe(
        `<select multiple="">` +
          options.map((v) => `<option value="${v}"></option>`).join('') +
          '</select>',
      );

      await Promise.resolve();
      checkValue(select, initial);

      const change1 = [options[0], options[2]];
      await actAndWaitRAF(() => selectOption(select, change1));
      expect(onChange.mock.lastCall).toEqual([change1]);
      checkValue(select, change1);

      const change2 = [options[1], options[2]]; // reverse
      await actAndWaitRAF(() => selectOption(select, change2));
      expect(onChange.mock.lastCall).toEqual([change2]);
      checkValue(select, change2);

      await actAndWaitRAF(() => selectOption(select, []));
      expect(onChange.mock.lastCall).toEqual([[]]);
      checkValue(select, undefined);
    });

    it(`supports multiple choice: uncontrolled. ${mode}`, async () => {
      const options = mode === 'numbers' ? [0, 1, 2] : ['a', 'b', 'c'];
      const initial = mode === 'numbers' ? [0, 1] : ['a', 'b'];

      const onChange = jest.fn();
      const onRender = jest.fn();
      let rerender: () => void;

      const Comp = () => {
        onRender();
        rerender = useRerender();

        return (
          <select
            multiple
            defaultValue={initial}
            onChange={(e) =>
              onChange(
                [...e.target.selectedOptions].map((o) =>
                  mode === 'numbers' ? Number(o.value) : o.value,
                ),
              )
            }
          >
            {options.map((v) => (
              <option value={v} key={v} />
            ))}
          </select>
        );
      };

      const root = mount(<Comp />);
      const [select] = extract(root);
      expectHtml(root).toBe(
        `<select multiple="">` +
          options.map((v) => `<option value="${v}"></option>`).join('') +
          '</select>',
      );

      await Promise.resolve();
      checkValue(select, initial);

      const change1 = [options[0], options[2]];
      await act(() => selectOption(select, change1));
      expect(onChange.mock.lastCall).toEqual([change1]);
      checkValue(select, change1);

      await act(() => rerender());
      checkValue(select, change1); // is intact.

      const change2 = [options[1], options[2]]; // reverse
      await act(() => selectOption(select, change2));
      expect(onChange.mock.lastCall).toEqual([change2]);
      checkValue(select, change2);

      await act(() => selectOption(select, []));
      expect(onChange.mock.lastCall).toEqual([[]]);
      checkValue(select, undefined);

      await act(() => rerender());
      checkValue(select, undefined); // is intact.

      expect(onRender).toHaveBeenCalledTimes(3); // initial + 2x rerenders.
    });
  }

  it('options without a value are treated properly', async () => {
    const root = mount(
      <select defaultValue="c">
        {abOptions}
        <option>c</option>
      </select>,
    );
    const [select] = extract(root);
    await Promise.resolve();

    checkValue(select, 'c');
  });
});
