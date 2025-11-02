import {
  useState,
  createContext,
  useContext,
  type StateSetter,
  type ReactComponentWithChildren,
  useLayoutEffect,
} from '~/index';
import { createToggler, expectHtml, mount } from '../helpers';
import { act } from '~/testing';
import { Fragment } from 'faiwer-react/jsx-runtime';

describe('Hooks: useContext', () => {
  const ctx = createContext(0);

  for (const mode of ['hook', '<Consumer/>']) {
    const Child =
      mode === 'hook'
        ? () => useContext(ctx)
        : () => <ctx.Consumer>{(value) => value}</ctx.Consumer>;

    it(`uses the default value when no provider is given. ${mode}`, () => {
      expectHtml(mount(<Child />)).toBe('0');
    });

    it(`uses the value from the provider. ${mode}`, () => {
      const Parent = () => (
        <ctx.Provider value={42}>
          <div>
            <Child />
          </div>
        </ctx.Provider>
      );

      expectHtml(mount(<Parent />)).toBe('<div>42</div>');
    });

    it(`uses the fresh value from the provider. ${mode}`, async () => {
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

    // add a test for a trapped component with useContext

    it(`useContext always uses the closest provider. ${mode}`, async () => {
      const Parent = () => (
        <ctx.Provider value={1}>
          <ctx.Provider value={2}>
            <Child />
          </ctx.Provider>
        </ctx.Provider>
      );

      expectHtml(mount(<Parent />)).toBe('2');
    });

    it(`supports removing and adding subscribers. ${mode}`, async () => {
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

    it(`providers can be (un)mounted dynamically. ${mode}`, async () => {
      const provider = createToggler();
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

    it(`multiple providers & consumers coexists. ${mode}`, () => {
      const ctx2 = createContext('');

      const Child = () => useContext(ctx);

      const Parent = () => [useContext(ctx2), '|', <Child />];

      const GrandParent = () => [
        useContext(ctx2),
        '-',
        useContext(ctx),
        '|',
        <Parent />,
      ];

      const root = mount(
        <ctx.Provider value={42}>
          <ctx2.Provider value="hey">
            <GrandParent />
          </ctx2.Provider>
        </ctx.Provider>,
      );

      expectHtml(root).toBe('hey-42|hey|42');
    });

    it(`It updates the component that is wrapped with a non-changing memoized parent component. ${mode}`, async () => {
      let updateState: StateSetter<number>;
      const MemoizedContainer: ReactComponentWithChildren = (_) => _.children;

      const Comp = () => {
        const [state, setState] = useState(42);
        updateState = setState;

        return (
          <ctx.Provider value={state}>
            <MemoizedContainer>
              <Child />
            </MemoizedContainer>
          </ctx.Provider>
        );
      };

      const root = mount(<Comp />);
      expectHtml(root).toBe('42');

      await act(() => updateState(99));
      expectHtml(root).toBe('99');
    });
  }

  it('properly switches between different kinds of context nodes', async () => {
    const childCreated = jest.fn();
    const Child = () => {
      useLayoutEffect(() => {
        childCreated();
      }, []);
      return useContext(ctx);
    };

    let updateMode: StateSetter<'fragment' | 'context'>;
    let updateV: StateSetter<number>;

    const Comp = () => {
      const [mode, setMode] = useState<'fragment' | 'context'>('fragment');
      const [v, setV] = useState<number>(24);
      updateMode = setMode;
      updateV = setV;

      return mode === 'fragment' ? (
        <Fragment key="1">1</Fragment>
      ) : (
        <ctx.Provider key="1" value={v}>
          <Child />
        </ctx.Provider>
      );
    };

    // At first render a regular fragment without a role.
    const root = mount(<Comp />);
    expectHtml(root).toBe('1');

    // Switch to the coontext (also a fragment)
    await act(() => updateMode('context'));
    expectHtml(root).toBe('24');
    expect(childCreated).toHaveBeenCalledTimes(1);

    // Try to update the context's value. If the 'role' is lost it either won't
    // get an update, or will remount the <Child/>.
    await act(() => {
      updateV!(42);
    });
    expectHtml(root).toBe('42');
    expect(childCreated).toHaveBeenCalledTimes(1);
  });
});
