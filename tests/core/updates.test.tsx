import {
  useEffect,
  useState,
  type ReactComponentWithChildren,
  type StateSetter,
} from '~/index';
import { act } from '~/testing';
import { createToggler, expectHtml, mount, useRerender } from '../helpers';
import { waitFor } from '../helpers';
import { Fragment } from 'faiwer-react/jsx-runtime';

describe('Updates', () => {
  for (const mode of ['fragment', 'tag']) {
    for (const pos of ['first', 'middle', 'last']) {
      const items: string[] = ['first', 'middle', 'last'];

      it(`it removes the node when its ${pos} child is gone, ${mode}`, async () => {
        let hide: () => void;
        let show: () => void;

        const Comp = () => {
          const [removed, setRemoved] = useState(false);
          hide = () => setRemoved(true);
          show = () => setRemoved(false);

          const content: JSX.Element[] = items.map(
            (el): JSX.Element => (removed && el === pos ? null : el),
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
        await act(() => hide());
        const contentAfter = items.filter((el) => el !== pos).join('');
        expectHtml(root).toBe(
          mode === 'fragment' ? contentAfter : `<div>${contentAfter}</div>`,
        );

        // Phase 3: Return it back:
        await act(() => show());
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
          let setContentInserted: StateSetter<boolean>;

          const Child: ReactComponentWithChildren = (props) => props.children;

          const Comp = () => {
            const [inserted, setInserted] = useState(false);
            setContentInserted = setInserted;

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
            if (inserted)
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
          await act(() => setContentInserted!(true));
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
          await act(() => setContentInserted!(false));
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

        let setContentReversed: (v: boolean) => void;
        const Comp = () => {
          const [reversed, setReversed] = useState(false);
          setContentReversed = setReversed;

          const content: JSX.Element[] = (
            reversed ? [...items].reverse() : items
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

        await act(() => setContentReversed!(true));
        const contentAfter = `<div>3</div><div>2</div><div>1</div>`;
        expectHtml(root).toBe(wrapContent(contentAfter));

        await act(() => setContentReversed!(false));
        expectHtml(root).toBe(wrapContent(contentBefore));
      });
    }
  }

  it('remembers the latest component props', async () => {
    let setParentState: StateSetter<number>;
    let rerender: () => void;

    let childRendered = 0;
    const Child = ({ v }: { v: number }) => {
      ++childRendered;
      return v;
    };

    const Parent = () => {
      const [v, setV] = useState(42);
      rerender = useRerender();
      setParentState = setV;
      return <Child v={v} />;
    };

    const root = mount(<Parent />);
    expectHtml(root).toBe('42');
    expect(childRendered).toBe(1);

    await act(() => setParentState(43));
    expectHtml(root).toBe('43');
    expect(childRendered).toBe(2);

    await act(() => rerender());
    // Child's prop wasn't touched = no re-render.
    expect(childRendered).toBe(2);
  });

  it('updates are batched', async () => {
    let setParentState: StateSetter<number>;
    let setChildState: StateSetter<number>;

    let childRendered = 0;
    const Child = () => {
      const [v, setV] = useState(2);
      setChildState = setV;
      ++childRendered;
      return <div>{v}</div>;
    };

    let parentRendered = 0;
    const Parent = () => {
      const [v, setV] = useState(1);
      setParentState = setV;
      ++parentRendered;
      return (
        <div>
          {v}
          <Child />
        </div>
      );
    };

    const root = mount(<Parent />);
    expectHtml(root).toBe('<div>1<div>2</div></div>');
    expect(childRendered).toBe(1);
    expect(parentRendered).toBe(1);

    await act(() => {
      setParentState!(3); // Should be skipped.
      setParentState!(5);
      setChildState!(4); // Should be skipped.
      setChildState!(9);
    });
    expectHtml(root).toBe('<div>5<div>9</div></div>');
    expect(parentRendered).toBe(2);
    expect(childRendered).toBe(2);
  });

  it('internally updated component still gets prop updates', async () => {
    let setChildState: StateSetter<number>;
    let setParentState: StateSetter<number>;

    const Child = ({ prop }: { prop: number }) => {
      const [v, setV] = useState(200);
      setChildState = setV;
      return `${prop}:${v}`;
    };

    const Parent = () => {
      const [v, setV] = useState(100);
      setParentState = setV;
      return Child({ prop: v });
    };

    const root = mount(<Parent />);
    expectHtml(root).toBe('100:200');

    await act(() => {
      setChildState(201);
      setParentState(101);
    });
    expectHtml(root).toBe('101:201');
  });

  it('new key for the same node remounts it', async () => {
    const Child = () => <div>comp</div>;

    let setReactKey: StateSetter<number>;
    let rerender: () => void;
    const Comp = () => {
      const [key, setKey] = useState(1);
      rerender = useRerender();
      setReactKey = setKey;

      return [
        <Child key={`${key}-comp`} />,
        <div key={`${key}-tag`}>tag</div>,
        <Fragment key={`${key}-fragment`}>
          <div>fragment</div>
        </Fragment>,
      ];
    };

    const root = mount(<Comp />);

    const html = '<div>comp</div><div>tag</div><div>fragment</div>';
    expectHtml(root).toBe(html);
    const step1 = [...root.getElementsByTagName('div')];

    await act(() => setReactKey!(2));
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
    let setChildState: StateSetter<number>;
    const Child = () => {
      ++childRendered;
      let [state, setState] = useState(1);
      setChildState = setState;
      return state;
    };

    let hideChild: () => void;
    const Parent = () => {
      const [show, setShow] = useState(true);
      hideChild = () => setShow(false);
      return show && Child();
    };

    const root = mount(<Parent />);
    expectHtml(root).toBe('1');
    expect(childRendered).toBe(1);

    await act(() => setChildState!(2));
    expectHtml(root).toBe('2');
    expect(childRendered).toBe(2);

    await act(() => hideChild!());
    expectHtml(root).toBe('');
    expect(childRendered).toBe(2);
  });

  it(`doesn't run unrelated components`, async () => {
    let childRendered = 0;
    const Child = () => ++childRendered;

    let setParentState: StateSetter<number>;
    const Parent = () => {
      const [v, setV] = useState(1);
      setParentState = setV;
      return (
        <>
          {v}
          <Child />
        </>
      );
    };

    const root = mount(<Parent />);
    expectHtml(root).toBe('11');

    await act(() => setParentState!(2));
    expectHtml(root).toBe('21');
    expect(childRendered).toBe(1);
  });

  it("doesn't run dead nested sub-components", async () => {
    const father = createToggler();
    let updateChildState: StateSetter<number>;
    const child = {
      rendered: 0,
      mounted: 0,
      unmounted: 0,
    };

    const Child = () => {
      const [state, setState] = useState(42);
      updateChildState = setState;

      useEffect(() => {
        ++child.mounted;
        return () => ++child.unmounted;
      }, []);

      ++child.rendered;

      return state;
    };

    const Father = () => <Child />;

    const Grandfather = () => {
      const [mounted, setMounted] = useState(true);
      father.show = () => setMounted(true);
      father.hide = () => setMounted(false);
      return mounted && <Father />;
    };

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
      father.hide!();
      updateChildState(43);
    });

    expectHtml(root).toBe('');
    expect(child).toMatchObject({
      mounted: 1,
      rendered: 1,
      unmounted: 1,
    });

    await act(() => {
      father.show!();
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

    let updateV: StateSetter<number>;
    let updateComp: StateSetter<typeof A>;
    let rerenderParent: () => void;

    const Parent = () => {
      const [v, setV] = useState(2);
      updateV = setV;

      const [Comp, setComp] = useState<typeof A>(() => A);
      updateComp = setComp;

      rerenderParent = useRerender();

      return <Comp v={v} />;
    };

    const root = mount(<Parent />);
    expectHtml(root).toBe('4');

    await act(() => {
      updateV!(4);
      updateComp!(() => B);
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
    let updateMode: StateSetter<'A' | 'B' | 'C'>;

    const Parent = () => {
      const [Tag, setTag] = useState<'A' | 'B' | 'C'>('A');
      updateMode = setTag;

      return <Tag ref={onRef[Tag]}>{Tag}</Tag>;
    };

    const root = mount(<Parent />);
    expectHtml(root).toBe('<a>A</a>');
    expect(onRef.A).toHaveBeenCalledTimes(1);
    expect(onRef.A.mock.lastCall[0]?.textContent).toBe('A');
    expect(onRef.B).toHaveBeenCalledTimes(0);

    await act(() => {
      updateMode!('B');
    });
    expectHtml(root).toBe('<b>B</b>');
    expect(onRef.A).toHaveBeenCalledTimes(2);
    expect(onRef.A.mock.lastCall[0]?.textContent).toBe(undefined);
    expect(onRef.B).toHaveBeenCalledTimes(1);
    expect(onRef.B.mock.lastCall[0]?.textContent).toBe('B');

    await act(() => {
      updateMode!('C');
    });
    expectHtml(root).toBe('<c>C</c>');
    // If refs weren't updated during A->B render the following two lines will fail.
    expect(onRef.B).toHaveBeenCalledTimes(2);
    expect(onRef.B.mock.lastCall[0]?.textContent).toBe(undefined);
    expect(onRef.C).toHaveBeenCalledTimes(1);
    expect(onRef.C.mock.lastCall[0]?.textContent).toBe('C');
  });
});
