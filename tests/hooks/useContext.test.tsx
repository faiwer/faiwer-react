import {
  createContext,
  useContext,
  type ReactComponentWithChildren,
  useLayoutEffect,
} from '~/index';
import { expectHtml, mount, useRerender, useStateX } from '../helpers';
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
      const contextValue = useStateX<number>();
      const Parent = () => (
        <ctx.Provider value={contextValue.use(42)}>
          <div>
            <Child />
          </div>
        </ctx.Provider>
      );

      const root = mount(<Parent />);
      expectHtml(root).toBe('<div>42</div>');

      contextValue.set(43);
      await Promise.resolve();
      expectHtml(root).toBe('<div>43</div>');
    });

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

      const childKey = useStateX<number>();
      const Parent = () => {
        const key = childKey.use(1);
        return (
          <ctx.Provider value={key}>
            <Child key={key} />
          </ctx.Provider>
        );
      };

      const root = mount(<Parent />);
      expectHtml(root).toBe('1');
      expect(childRendered).toBe(1);

      await act(() => childKey.set(2));
      expectHtml(root).toBe('2');
      expect(childRendered).toBe(2); // not 3.
    });

    it(`providers can be (un)mounted dynamically. ${mode}`, async () => {
      const mounted = useStateX<boolean>();
      const Comp = () =>
        mounted.use(true) && (
          <ctx.Provider value={1}>
            <Child />
            <Child />
          </ctx.Provider>
        );

      const root = mount(<Comp />);
      expectHtml(root).toBe('11');

      await act(() => mounted.set(false));
      expectHtml(root).toBe('');

      await act(() => mounted.set(true));
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
      const state = useStateX<number>();
      const MemoizedContainer: ReactComponentWithChildren = (_) => _.children;

      const Comp = () => (
        <ctx.Provider value={state.use(42)}>
          <MemoizedContainer>
            <Child />
          </MemoizedContainer>
        </ctx.Provider>
      );

      const root = mount(<Comp />);
      expectHtml(root).toBe('42');

      await act(() => state.set(99));
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

    const mode = useStateX<'fragment' | 'context'>();
    const v = useStateX<number>();

    const Comp = () => {
      const currentMode = mode.use('fragment');
      const currentV = v.use(24);

      return currentMode === 'fragment' ? (
        <Fragment key="1">1</Fragment>
      ) : (
        <ctx.Provider key="1" value={currentV}>
          <Child />
        </ctx.Provider>
      );
    };

    // At first render a regular fragment without a role.
    const root = mount(<Comp />);
    expectHtml(root).toBe('1');

    // Switch to the coontext (also a fragment)
    await act(() => mode.set('context'));
    expectHtml(root).toBe('24');
    expect(childCreated).toHaveBeenCalledTimes(1);

    // Try to update the context's value. If the 'role' is lost it either won't
    // get an update, or will remount the <Child/>.
    await act(() => {
      v.set(42);
    });
    expectHtml(root).toBe('42');
    expect(childCreated).toHaveBeenCalledTimes(1);
  });

  it('updates the context-fiber props', async () => {
    const v = useStateX<number>();
    let rerender: () => void;

    const Child = () => {
      rerender = useRerender();
      return useContext(ctx);
    };

    const Comp = () => (
      <ctx.Provider value={v.use(42)}>
        <Child />
      </ctx.Provider>
    );

    const root = mount(<Comp />);

    await act(() => v.set(22));
    expectHtml(root).toBe('22');

    await act(() => rerender());
    // It'll be 42 if we skipped "setProps"
    expectHtml(root).toBe('22');
  });

  it(`doesn't invalidate consumers when the value is intact`, async () => {
    let rerender: () => void;
    const onChildRender = jest.fn();

    const Child = () => {
      onChildRender();
      return useContext(ctx);
    };

    const Comp = () => {
      rerender = useRerender();

      return (
        <ctx.Provider value={24}>
          <Child />
        </ctx.Provider>
      );
    };

    const root = mount(<Comp />);
    expectHtml(root).toBe('24');
    expect(onChildRender).toHaveBeenCalledTimes(1);

    await act(() => rerender());
    expectHtml(root).toBe('24');
    expect(onChildRender).toHaveBeenCalledTimes(1);
  });
});
