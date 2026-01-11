import {
  createElement,
  createRoot,
  useEffect,
  ElementNode,
  Fragment,
  createContext,
  type ReactComponentWithChildren,
  type ReactComponent,
} from '~/index';
import { act } from '~/testing';
import { expectHtml, itRenders, mount, useStateX } from '../helpers';
import { wait, waitFor } from '../helpers';

describe('createElement', () => {
  const expectSource = expect.objectContaining({
    columnNumber: expect.any(Number),
    lineNumber: expect.any(Number),
    fileName: expect.any(String),
  });

  it('createElement creates an element', () => {
    const node = (<div className="test">content</div>) as ElementNode;
    expect(node).toEqual({
      type: 'div',
      props: { className: 'test' },
      key: null,
      children: ['content'],
      source: expectSource,
    });
  });

  it('createElement inlines the only []-fragment child', () => {
    const node = (<div>{['content']}</div>) as ElementNode;
    expect(node).toEqual({
      type: 'div',
      props: {},
      key: null,
      children: ['content'],
      source: expectSource,
    });
  });

  it(`createElement doesn't inlines a keyed <Fragment/>`, () => {
    const node = (
      <div>
        <Fragment key="custom">content</Fragment>
      </div>
    ) as ElementNode;
    expect(node).toEqual({
      type: 'div',
      props: {},
      key: null,
      children: [
        {
          type: expect.any(String),
          props: {},
          key: 'custom',
          children: ['content'],
          source: expectSource,
        },
      ],
      source: expectSource,
    });
  });

  it(`createElement doesn't inlines a context provider`, () => {
    const ctx = createContext(42);
    const node = (
      <div>
        <ctx.Provider value={123}>{null}</ctx.Provider>
      </div>
    ) as ElementNode;
    expect(node).toEqual({
      type: 'div',
      props: {},
      key: null,
      children: [
        {
          type: expect.any(Object),
          props: { value: 123 },
          key: null,
          children: [null],
          source: expectSource,
        },
      ],
      source: expectSource,
    });
  });
});

describe('Mounting: scalar values', () => {
  const nodes: Array<{ name: string; value: JSX.Element; html: string }> = [
    { name: 'null', value: null, html: '' },
    { name: 'a text node', value: 'Content', html: 'Content' },
    { name: 'a number', value: 42, html: '42' },
    { name: 'true', value: true, html: '' },
    { name: 'false', value: false, html: '' },
    { name: 'undefined', value: undefined, html: '' },
    { name: 'null', value: null, html: '' },
    { name: '0', value: 0, html: '0' },
  ];

  for (const { name, value, html } of nodes) {
    itRenders(`mounts ${name}`, value, html);
  }
});

describe('Mounting: Components & fragments', () => {
  it('mounts a component', () => {
    const Comp = () => <div>Content</div>;
    expectHtml(mount(<Comp />)).toBe('<div>Content</div>');
  });

  for (const asProp of [true, false]) {
    it(`mounts a component with children provided ${asProp ? 'as a prop' : 'as content'}`, () => {
      const Comp: ReactComponentWithChildren = ({ children }) => (
        <div>{children}</div>
      );
      const root = mount(
        asProp ? <Comp children="Content" /> : <Comp>Content</Comp>,
      );
      expectHtml(root).toBe('<div>Content</div>');
    });
  }

  for (const mode of ['array', 'fragment']) {
    it(`mounts a fragment via ${mode}`, () => {
      const content =
        mode === 'array' ? (
          ['1', '2']
        ) : (
          <>
            {'1'}
            {'2'}
          </>
        );
      const root = mount(<div>before{content}after</div>);
      expectHtml(root).toBe('<div>before12after</div>');
    });
  }

  it('mounts subcomponents', () => {
    type Props = { v: JSX.Element };
    const Child = ({ v }: Props) => v;
    const Father = ({ v }: Props) => <Child v={v} />;
    const Grandfather = () => <Father v={1} />;

    const root = mount(Grandfather());
    expectHtml(root).toBe('1');
  });

  it(`mounts self-referencing components`, () => {
    const Comp = ({ depth }: { depth: number }) =>
      depth > 2 ? 'stop' : [depth, '|', <Comp depth={depth + 1} />];
    expectHtml(mount(<Comp depth={0} />)).toBe('0|1|2|stop');
  });

  it('mounts sub-fragments', () => {
    const root = mount(['1', [[['2']]], '3']);
    expectHtml(root).toBe('123');
  });

  it('mounts a fragment as the only child of a components', () => {
    const Comp = () => ['content'];
    const root = mount(<Comp />);
    expectHtml(root).toBe('content');
  });

  it(`supports components with non-JSX children`, () => {
    const Custom: ReactComponent<{ children: (v: number) => number }> =
      ({ children }) => children(3); // prettier-ignore
    expectHtml(mount(<Custom>{(v) => v ** 2}</Custom>)).toBe('9');
  });

  it(`supports components with non-JSX children: Legacy`, () => {
    const Custom: ReactComponent<{ children: (v: number) => number }> =
      ({ children }) => children(3); // prettier-ignore
    expectHtml(
      mount(createElement(Custom, { children: (v: number) => v ** 2 })),
    ).toBe('9');
  });
});

describe('createRoot', () => {
  it('mounts an app', () => {
    const root = document.createElement('root');
    createRoot(root).render(42);
    expectHtml(root).toBe('42');
  });

  it('can unmount an app', async () => {
    const rootDomNode = document.createElement('root');
    const onRef = jest.fn();
    const effect = jest.fn();

    const Comp = () => {
      useEffect(() => {
        effect();
      }, []);
      return <div ref={onRef}>42</div>;
    };

    const appRoot = createRoot(rootDomNode);
    appRoot.render(<Comp />);
    expectHtml(rootDomNode).toBe('<div>42</div>');

    appRoot.unmount();
    expectHtml(rootDomNode).toBe('');
    expect(onRef).toHaveBeenCalledTimes(2);
    const [[call1], [call2]] = onRef.mock.calls;
    expect(call1?.tagName).toBe('DIV');
    expect(call2).toBe(null);

    await wait(5);
    // It should synchronously drop all pending effects.
    expect(effect).toHaveBeenCalledTimes(0);

    appRoot.render(<Comp />);
    expectHtml(rootDomNode).toBe('<div>42</div>');
    await waitFor(() => expect(effect).toHaveBeenCalledTimes(1));
    expect(onRef).toHaveBeenCalledTimes(3);
  });

  it('double mount() calls unmounts the 1st app', () => {
    const rootDomNode = document.createElement('root');
    const appRoot = createRoot(rootDomNode);
    appRoot.render(42);

    const spy = jest.spyOn(appRoot, 'unmount');
    appRoot.render(24);
    expectHtml(rootDomNode).toBe('24');
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('supports multiple apps simultaneously', async () => {
    type App = 'app1' | 'app2';
    const called: Record<App, number> = { app1: 0, app2: 0 };
    const prefixApp1 = useStateX<string>();
    const prefixApp2 = useStateX<string>();

    const Comp = ({ app }: { app: App }) => {
      const prefix = app === 'app1' ? prefixApp1.use('') : prefixApp2.use('');

      useEffect(() => {
        ++called[app];
      });

      return prefix + app;
    };

    const root1 = mount(<Comp app="app1" />);
    expectHtml(root1).toBe('app1');
    expect(called).toMatchObject({ app1: 0, app2: 0 });

    const root2 = mount(<Comp app="app2" />);
    expectHtml(root2).toBe('app2');
    expect(called).toMatchObject({ app1: 0, app2: 0 });

    // Non-layout effects are not called immediately.
    await waitFor(() => {
      expect(called).toMatchObject({ app1: 1, app2: 1 });
    });

    await act(() => {
      prefixApp1.set('p1-');
      prefixApp2.set('p2-');
    });
    await waitFor(() => {
      expectHtml(root1).toBe('p1-app1');
      expectHtml(root2).toBe('p2-app2');
    });
  });
});
