import {
  createContext,
  useContext,
  useEffect,
  useLayoutEffect,
  useState,
  type ReactComponentWithChildren,
} from '~/index';
import { act } from '~/testing';
import { expectHtml, mount, useRerender, useStateX } from '../helpers';
import { waitFor } from '../helpers';
import { Fragment } from 'faiwer-react/jsx-runtime';

describe('Updates', () => {
  for (const mode of ['fragment', 'tag']) {
    for (const pos of ['first', 'middle', 'last']) {
      const items: string[] = ['first', 'middle', 'last'];

      it(`it removes the node when its ${pos} child is gone, ${mode}`, async () => {
        const removed = useStateX<boolean>();

        const Comp = () => {
          const removedValue = removed.use(false);
          const content: JSX.Element[] = items.map(
            (el): JSX.Element => (removedValue && el === pos ? null : el),
          );

          return mode === 'fragment' ? content : <div>{content}</div>;
        };

        // Phase 1: Initial render:
        const root = mount(<Comp />);
        const contentBefore = items.join('');
        const htmlBefore =
          mode === 'fragment' ? contentBefore : `<div>${contentBefore}</div>`;
        expectHtml(root).toBe(htmlBefore);

        // Phase 2: Hide the element:
        await act(() => removed.set(true));
        const contentAfter = items.filter((el) => el !== pos).join('');
        expectHtml(root).toBe(
          mode === 'fragment' ? contentAfter : `<div>${contentAfter}</div>`,
        );

        // Phase 3: Return it back:
        await act(() => removed.set(false));
        expectHtml(root).toBe(htmlBefore);
      });
    }
  }

  for (const childType of ['text', 'tag', 'fragment', 'null', 'component']) {
    for (const containerType of ['fragment', 'tag']) {
      for (const pos of [
        'first',
        'first:key',
        'middle:key',
        'middle',
        'last',
      ]) {
        it(`it inserts a new ${childType}-child into a ${containerType} at: ${pos}`, async () => {
          const inserted = useStateX<boolean>();

          const Child: ReactComponentWithChildren = (props) => props.children;

          const Comp = () => {
            const insertedValue = inserted.use(false);

            const content: JSX.Element[] =
              childType === 'text'
                ? ['1', '2']
                : childType === 'tag'
                  ? [<div>1</div>, <div>2</div>]
                  : childType === 'fragment'
                    ? [['1'], ['2']]
                    : childType === 'null'
                      ? [null, null]
                      : [<Child>1</Child>, <Child>2</Child>];
            if (insertedValue)
              switch (pos) {
                case 'first':
                  content.unshift(<div>new</div>);
                  break;
                case 'first:key':
                  content.unshift(<div key="new">new</div>);
                  break;
                case 'middle':
                  content.splice(1, 0, <div>new</div>);
                  break;
                case 'middle:key':
                  content.splice(1, 0, <div key="new">new</div>);
                  break;
                case 'last':
                  content.push('new');
                  break;
              }

            return containerType === 'fragment' ? (
              content
            ) : (
              <div>{content}</div>
            );
          };

          const getChildHtml = (v: string) =>
            childType === 'tag' ? `<div>${v}</div>` : v;

          // Phase 1: Initial render:
          const root = mount(<Comp />);
          const beforeHtmlItems: string[] = (
            childType === 'null' ? [] : ['1', '2']
          ).map((v) => getChildHtml(v));
          const beforeContent = beforeHtmlItems.join('');
          const beforeHtml =
            containerType === 'fragment'
              ? beforeContent
              : `<div>${beforeContent}</div>`;
          expectHtml(root).toBe(beforeHtml);

          // Phase 2: Hide the element:
          await act(() => inserted.set(true));
          const afterHtmlItems = [...beforeHtmlItems];
          const newNodeHtml = pos === 'last' ? 'new' : `<div>new</div>`;
          switch (pos) {
            case 'first':
            case 'first:key':
              afterHtmlItems.unshift(newNodeHtml);
              break;
            case 'middle':
            case 'middle:key':
              afterHtmlItems.splice(1, 0, newNodeHtml);
              break;
            case 'last':
              afterHtmlItems.push(newNodeHtml);
              break;
          }
          const afterContent = afterHtmlItems.join('');
          expectHtml(root).toBe(
            containerType === 'fragment'
              ? afterContent
              : `<div>${afterContent}</div>`,
          );

          // Phase 3: Return it back:
          await act(() => inserted.set(false));
          expectHtml(root).toBe(beforeHtml);
        });
      }
    }
  }

  for (const inlined of [true, false]) {
    for (const container of ['tag', 'fragment']) {
      it(`can reorder nodes in a ${container}, inlined: ${inlined}`, async () => {
        const Wrapper: ReactComponentWithChildren = ({ children }) => {
          return <div className="root">before!{children}!after</div>;
        };

        const wrapContent = (html: string): string => {
          const inner = container === 'fragment' ? html : `<div>${html}</div>`;
          return inlined
            ? `<div class="root">before!${inner}!after</div>`
            : inner;
        };

        const items: string[] = ['1', '2', '3'];

        const reversed = useStateX<boolean>();
        const Comp = () => {
          const content: JSX.Element[] = (
            reversed.use(false) ? [...items].reverse() : items
          ).map((n) => <div key={n}>{n}</div>);

          return container === 'tag' ? <div>{content}</div> : content;
        };

        const root = mount(
          inlined ? (
            <Wrapper>
              <Comp />
            </Wrapper>
          ) : (
            <Comp />
          ),
        );
        const contentBefore = '<div>1</div><div>2</div><div>3</div>';
        expectHtml(root).toBe(wrapContent(contentBefore));

        await act(() => reversed.set(true));
        const contentAfter = `<div>3</div><div>2</div><div>1</div>`;
        expectHtml(root).toBe(wrapContent(contentAfter));

        await act(() => reversed.set(false));
        expectHtml(root).toBe(wrapContent(contentBefore));
      });
    }
  }

  it('remembers the latest component props', async () => {
    const parentState = useStateX<number>();
    let rerender: () => void;

    let childRendered = 0;
    const Child = ({ v }: { v: number }) => {
      ++childRendered;
      return v;
    };

    const Parent = () => {
      rerender = useRerender();
      return <Child v={parentState.use(42)} />;
    };

    const root = mount(<Parent />);
    expectHtml(root).toBe('42');
    expect(childRendered).toBe(1);

    await act(() => parentState.set(43));
    expectHtml(root).toBe('43');
    expect(childRendered).toBe(2);

    await act(() => rerender());
    // Child's prop wasn't touched = no re-render.
    expect(childRendered).toBe(2);
  });

  it('updates are batched', async () => {
    const parentState = useStateX<number>();
    const childState = useStateX<number>();
    const onChildRender = jest.fn();
    const onParentRender = jest.fn();

    const Child = () => {
      onChildRender();
      return <div>{childState.use(2)}</div>;
    };

    const Parent = () => {
      onParentRender();
      return (
        <div>
          {parentState.use(1)}
          <Child />
        </div>
      );
    };

    const root = mount(<Parent />);
    expectHtml(root).toBe('<div>1<div>2</div></div>');
    expect(onChildRender).toHaveBeenCalledTimes(1);
    expect(onParentRender).toHaveBeenCalledTimes(1);

    await act(() => {
      parentState.set(3); // Should be skipped.
      parentState.set(5);
      childState.set(4); // Should be skipped.
      childState.set(9);
    });
    expectHtml(root).toBe('<div>5<div>9</div></div>');
    expect(onParentRender).toHaveBeenCalledTimes(2);
    expect(onChildRender).toHaveBeenCalledTimes(2);
  });

  it('internally updated component still gets prop updates', async () => {
    const childState = useStateX<number>();
    const parentState = useStateX<number>();

    const Child = ({ prop }: { prop: number }) => {
      return `${prop}:${childState.use(200)}`;
    };

    const Parent = () => {
      return Child({ prop: parentState.use(100) });
    };

    const root = mount(<Parent />);
    expectHtml(root).toBe('100:200');

    await act(() => {
      childState.set(201);
      parentState.set(101);
    });
    expectHtml(root).toBe('101:201');
  });

  it('new key for the same node remounts it', async () => {
    const Child = () => <div>comp</div>;

    const reactKey = useStateX<number>();
    let rerender: () => void;
    const Comp = () => {
      rerender = useRerender();
      const keyValue = reactKey.use(1);

      return [
        <Child key={`${keyValue}-comp`} />,
        <div key={`${keyValue}-tag`}>tag</div>,
        <Fragment key={`${keyValue}-fragment`}>
          <div>fragment</div>
        </Fragment>,
      ];
    };

    const root = mount(<Comp />);

    const html = '<div>comp</div><div>tag</div><div>fragment</div>';
    expectHtml(root).toBe(html);
    const step1 = [...root.getElementsByTagName('div')];

    await act(() => reactKey.set(2));
    expectHtml(root).toBe(html);
    const step2 = [...root.getElementsByTagName('div')];
    expect(step1.length).toBe(step2.length);
    for (const i of step1.keys()) {
      expect(step1[i]).not.toBe(step2[i]);
    }

    await act(() => rerender!());
    expectHtml(root).toBe(html);
    const step3 = [...root.getElementsByTagName('div')];
    expect(step2.length).toBe(step3.length);
    for (const i of step2.keys()) {
      expect(step2[i]).toBe(step3[i]);
    }
  });

  it(`doesn't run dead direct sub-components`, async () => {
    let childRendered = 0;
    const childState = useStateX<number>();
    const Child = () => {
      ++childRendered;
      return childState.use(1);
    };

    const show = useStateX<boolean>();
    const Parent = () => {
      return show.use(true) && <Child />;
    };

    const root = mount(<Parent />);
    expectHtml(root).toBe('1');
    expect(childRendered).toBe(1);

    await act(() => childState.set(2));
    expectHtml(root).toBe('2');
    expect(childRendered).toBe(2);

    await act(() => show.set(false));
    expectHtml(root).toBe('');
    expect(childRendered).toBe(2);
  });

  it(`doesn't run unrelated components`, async () => {
    let childRendered = 0;
    const Child = () => ++childRendered;

    const parentState = useStateX<number>();
    const Parent = () => (
      <>
        {parentState.use(1)}
        <Child />
      </>
    );

    const root = mount(<Parent />);
    expectHtml(root).toBe('11');

    await act(() => parentState.set(2));
    expectHtml(root).toBe('21');
    expect(childRendered).toBe(1);
  });

  it("doesn't run dead nested sub-components", async () => {
    const childState = useStateX<number>();
    const child = {
      rendered: 0,
      mounted: 0,
      unmounted: 0,
    };

    const Child = () => {
      useEffect(() => {
        ++child.mounted;
        return () => ++child.unmounted;
      }, []);

      ++child.rendered;

      return childState.use(42);
    };

    const Father = () => <Child />;

    const mounted = useStateX<boolean>();
    const Grandfather = () => mounted.use(true) && <Father />;

    const root = mount(<Grandfather />);
    expectHtml(root).toBe('42');
    await waitFor(() =>
      expect(child).toMatchObject({
        mounted: 1,
        rendered: 1,
        unmounted: 0,
      }),
    );

    await act(() => {
      mounted.set(false);
      childState.set(43);
    });

    expectHtml(root).toBe('');
    expect(child).toMatchObject({
      mounted: 1,
      rendered: 1,
      unmounted: 1,
    });

    await act(() => {
      mounted.set(true);
    });

    await waitFor(() => {
      expectHtml(root).toBe('42');
      expect(child).toMatchObject({
        mounted: 2,
        rendered: 2,
        unmounted: 1,
      });
    });
  });

  it('updates fiber props during replacing', async () => {
    const bRendered = jest.fn();

    const A = ({ v }: { v: number }) => v ** 2;
    const B = ({ v }: { v: number }) => {
      bRendered();
      return v * 3;
    };

    const v = useStateX<number>();
    const comp = useStateX<typeof A>();
    let rerenderParent: () => void;

    const Parent = () => {
      rerenderParent = useRerender();
      const Comp = comp.use(() => A);

      return <Comp v={v.use(2)} />;
    };

    const root = mount(<Parent />);
    expectHtml(root).toBe('4');

    await act(() => {
      v.set(4);
      comp.set(() => B);
    });
    expectHtml(root).toBe('12');
    expect(bRendered).toHaveBeenCalledTimes(1);

    await act(() => rerenderParent());
    // We haven't changed the `props` of `<B/>` so it shouldn't be rerendered.
    expect(bRendered).toHaveBeenCalledTimes(1);
  });

  it('updates fiber refs during replacing', async () => {
    const onRef = {
      A: jest.fn(),
      B: jest.fn(),
      C: jest.fn(),
    };
    const mode = useStateX<'A' | 'B' | 'C'>();

    const Parent = () => {
      const Tag = mode.use('A');

      // @ts-expect-error - A,B,C are not valid tags.
      return <Tag ref={onRef[Tag]}>{Tag}</Tag>;
    };

    const root = mount(<Parent />);
    expectHtml(root).toBe('<a>A</a>');
    expect(onRef.A).toHaveBeenCalledTimes(1);
    expect(onRef.A.mock.lastCall[0]?.textContent).toBe('A');
    expect(onRef.B).toHaveBeenCalledTimes(0);

    await act(() => {
      mode.set('B');
    });
    expectHtml(root).toBe('<b>B</b>');
    expect(onRef.A).toHaveBeenCalledTimes(2);
    expect(onRef.A.mock.lastCall[0]?.textContent).toBe(undefined);
    expect(onRef.B).toHaveBeenCalledTimes(1);
    expect(onRef.B.mock.lastCall[0]?.textContent).toBe('B');

    await act(() => {
      mode.set('C');
    });
    expectHtml(root).toBe('<c>C</c>');
    // If refs weren't updated during A->B render the following two lines will fail.
    expect(onRef.B).toHaveBeenCalledTimes(2);
    expect(onRef.B.mock.lastCall[0]?.textContent).toBe(undefined);
    expect(onRef.C).toHaveBeenCalledTimes(1);
    expect(onRef.C.mock.lastCall[0]?.textContent).toBe('C');
  });

  it(`throws after 100th render iteration`, async () => {
    const Comp = () => {
      const [v, setV] = useState(0);
      useLayoutEffect(() => {
        if (v < 100) {
          setV((v) => v + 1);
        }
      });

      return v;
    };

    mount(<Comp />);

    const onError = jest.fn();
    jest.spyOn(window.console, 'error').mockImplementationOnce(() => {});
    window.addEventListener('error', onError, { once: true });

    await waitFor(() => {
      expect(onError).toHaveBeenCalledTimes(1);
      const error = onError.mock.lastCall[0];
      expect(String(error?.message)).toContain('Maximum update depth exceeded');
    });
  });

  it('it remounts node on role change', async () => {
    const ctx = createContext(42);
    const mode = useStateX<'context' | 'fragment'>();

    const Child = () => useContext(ctx);

    const Comp = () => {
      return mode.use('fragment') === 'fragment' ? (
        <Fragment key="ctx">fragment</Fragment>
      ) : (
        <ctx.Provider key="ctx" value={22}>
          <Child />
        </ctx.Provider>
      );
    };

    const root = mount(<Comp />);
    expectHtml(root).toBe('fragment');

    await act(() => mode.set('context'));
    expectHtml(root).toBe('22');
  });
});
