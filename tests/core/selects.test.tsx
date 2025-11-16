import { act } from 'faiwer-react/testing';
import { actAndWaitRAF, expectHtml, mount, useStateX } from '../helpers';

describe('<select/>', () => {
  const abOptions = (
    <>
      <option value="a" />
      <option value="b" />
    </>
  );

  type Value = undefined | string | number | string[];

  const extract = (root: HTMLElement) => {
    const select = root.querySelector('select') as HTMLSelectElement;
    const options = [...root.querySelectorAll('option')] as HTMLOptionElement[];
    return [select, options] as const;
  };

  const checkValue = (select: HTMLSelectElement, value: Value) => {
    expect(select.value).toBe(value == null ? '' : String(value));
    const options = [
      ...select.querySelectorAll('option'),
    ] as HTMLOptionElement[];
    for (const o of options) {
      expect(o.selected).toBe(o.value === String(value));
    }
  };

  const selectOption = (select: HTMLSelectElement, value: Value) => {
    select.value = String(value);
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
});
