import { useState, createContext, useContext, type StateSetter } from '~/index';
import { expectHtml, mount } from '../helpers';
import { act } from '~/testing';

describe('Hooks: useContext', () => {
  const ctx = createContext(0);
  const Child = () => useContext(ctx);

  it('uses the default value when no provider is given', () => {
    const Comp = () => useContext(ctx);
    expectHtml(mount(<Comp />)).toBe('0');
  });

  it('uses the value from the provider', () => {
    const Parent = () => (
      <ctx.Provider value={42}>
        <div>
          <Child />
        </div>
      </ctx.Provider>
    );

    expectHtml(mount(<Parent />)).toBe('<div>42</div>');
  });

  it('uses the fresh value from the provider', async () => {
    let setContextValue: (v: number) => void;
    const Parent = () => {
      const [state, setState] = useState(42);
      setContextValue = setState;
      return (
        <ctx.Provider value={state}>
          <div>
            <Child />
          </div>
        </ctx.Provider>
      );
    };

    const root = mount(<Parent />);
    expectHtml(root).toBe('<div>42</div>');

    setContextValue!(43);
    await Promise.resolve();
    expectHtml(root).toBe('<div>43</div>');
  });

  it('useContext always uses the closest provider', async () => {
    const Parent = () => (
      <ctx.Provider value={1}>
        <ctx.Provider value={2}>
          <Child />
        </ctx.Provider>
      </ctx.Provider>
    );

    expectHtml(mount(<Parent />)).toBe('2');
  });

  it('supports removing and adding subscribers', async () => {
    let childRendered = 0;
    const Child = () => {
      ++childRendered;
      return useContext(ctx);
    };

    let updateChildKey: StateSetter<number>;
    const Parent = () => {
      const [key, setKey] = useState(1);
      updateChildKey = setKey;
      return (
        <ctx.Provider value={key}>
          <Child key={key} />
        </ctx.Provider>
      );
    };

    const root = mount(<Parent />);
    expectHtml(root).toBe('1');
    expect(childRendered).toBe(1);

    await act(() => updateChildKey(2));
    expectHtml(root).toBe('2');
    expect(childRendered).toBe(2); // not 3.
  });

  it('providers can be (un)mounted dynamically', async () => {
    const provider: Partial<Record<'show' | 'hide', () => void>> = {};
    const Comp = () => {
      const [mounted, setMounted] = useState(true);
      provider.show = () => setMounted(true);
      provider.hide = () => setMounted(false);

      return (
        mounted && (
          <ctx.Provider value={1}>
            <Child />
            <Child />
          </ctx.Provider>
        )
      );
    };

    const root = mount(<Comp />);
    expectHtml(root).toBe('11');

    await act(() => provider.hide!());
    expectHtml(root).toBe('');

    await act(() => provider.show!());
    expectHtml(root).toBe('11');
  });
});
