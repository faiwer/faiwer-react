import {
  createRoot,
  useState,
  type StateSetter,
  useEffect,
  ElementNode,
  Fragment,
  createContext,
  type ReactComponentWithChildren,
  type ReactComponent,
} from '~/index';
import { act } from '~/testing';
import { expectHtml, mount } from '../helpers';
import { wait, waitFor } from '../helpers';

describe('createElement', () => {
  it('createElement creates an element', () => {
    const node = (<div className="test">content</div>) as ElementNode;
    expect(node).toEqual({
      type: 'div',
      props: { className: 'test' },
      key: null,
      children: ['content'],
    });
  });

  it('createElement inlines the only []-fragment child', () => {
    const node = (<div>{['content']}</div>) as ElementNode;
    expect(node).toEqual({
      type: 'div',
      props: {},
      key: null,
      children: ['content'],
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
        },
      ],
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
        },
      ],
    });
  });
});

const itRenders = (name: string, element: JSX.Element, html: string) =>
  it(name, () => {
    const root = mount(element);
    expectHtml(root).toBe(html);
  });

describe('Mounting: scalar values', () => {
  const nodes: Array<{ name: string; value: JSX.Element; html: string }> = [
    { name: 'null', value: null, html: '' },
    { name: 'a text node', value: 'Content', html: 'Content' },
    { name: 'a number', value: 42, html: '42' },
    { name: 'true', value: true, html: 'true' },
    { name: 'false', value: false, html: '' },
    { name: 'undefined', value: undefined, html: '' },
    { name: 'null', value: null, html: '' },
    { name: '0', value: 0, html: '0' },
  ];

  for (const { name, value, html } of nodes) {
    itRenders(`mounts ${name}`, value, html);
  }
});

describe('Mounting: tags', () => {
  it('cleans the root before mounting', () => {
    const root = document.createElement('root');
    root.innerHTML = 'before';
    createRoot(root, { testMode: true }).render(<div>Content</div>);
    expect(root.innerHTML).toBe('<div>Content</div>');
  });

  itRenders('mounts a simple <div/>', <div>Content</div>, '<div>Content</div>');

  itRenders(
    `moutns an SVG`,
    <svg xmlns="http://www.w3.org/2000/svg" width={64} height={64}>
      <circle cx={30} cy="30" r="30" fill="black" />
    </svg>,
    `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><circle cx="30" cy="30" r="30" fill="black"></circle></svg>`,
  );

  itRenders(
    'sets html-attributes',
    <div className="cls">Content</div>,
    `<div class="cls">Content</div>`,
  );

  it('sets tag event handlers', () => {
    const onclick = jest.fn();
    const root = mount(<div onclick={onclick}>Content</div>);
    const event = new CustomEvent('click');
    root.querySelector('div')?.dispatchEvent(event);
    expect(onclick).toHaveBeenCalledTimes(1);
    expect(onclick).toHaveBeenCalledWith(event);
  });

  for (const mode of ['undefined', 'absent prop']) {
    it(`unsets tag event handlers. mode: ${mode}`, async () => {
      const onclick = jest.fn();
      let updateListen: StateSetter<boolean>;

      const Component = () => {
        const [listen, setListen] = useState(true);
        updateListen = setListen;

        return mode === 'undefined' || listen ? (
          <div onclick={listen ? onclick : undefined}>Content</div>
        ) : (
          <div>Content</div>
        );
      };

      const root = mount(<Component />);
      const event = new CustomEvent('click');
      root.querySelector('div')!.dispatchEvent(event);
      expect(onclick).toHaveBeenCalledTimes(1);

      await act(() => updateListen(false));
      root.querySelector('div')!.dispatchEvent(event);
      expect(onclick).toHaveBeenCalledTimes(1); // Wasn't called.

      await act(() => updateListen(true));
      root.querySelector('div')!.dispatchEvent(event);
      expect(onclick).toHaveBeenCalledTimes(2); // Was called again.
    });

    it(`unsets tag attributes. mode: ${mode}`, async () => {
      let updateWithAttr: StateSetter<boolean>;

      const Component = () => {
        const [withAttr, setWithAttr] = useState(true);
        updateWithAttr = setWithAttr;

        return mode === 'undefined' || withAttr ? (
          <div tabIndex={withAttr ? 42 : undefined}>Content</div>
        ) : (
          <div>Content</div>
        );
      };

      const root = mount(<Component />);
      const tag = root.querySelector('div');
      expect(tag?.getAttribute('tabIndex')).toBe('42');

      await act(() => updateWithAttr(false));
      expect(tag?.hasAttribute('tabIndex')).toBe(false);

      await act(() => updateWithAttr(true));
      expect(tag?.getAttribute('tabIndex')).toBe('42');
    });
  }

  for (const mode of ['replace tag', 'remove tag']) {
    it('removes event handlers on tag removal', async () => {
      const onclick = jest.fn();
      let updateShow: StateSetter<boolean>;

      const Comp = () => {
        const [show, setShow] = useState(true);
        updateShow = setShow;

        return show ? (
          <div onclick={onclick}>div</div>
        ) : mode === 'replace tag' ? (
          <span />
        ) : (
          []
        );
      };

      let eventHandler: EventListenerOrEventListenerObject;
      jest
        .spyOn(Element.prototype, 'addEventListener')
        .mockImplementationOnce((type, listener) => {
          expect(type).toBe('click');
          expect(typeof listener).toBe('function');
          eventHandler = listener;
        });

      const root = mount(<Comp />);
      const div = root.querySelector('div')!;
      const removeSpy = jest.spyOn(div, 'removeEventListener');
      expectHtml(div).toBe('div');

      await act(() => updateShow(false));
      expect(removeSpy).toHaveBeenCalledTimes(1);
      expect(removeSpy).toHaveBeenCalledWith('onclick', eventHandler!);
    });
  }

  itRenders(
    'mounts a tree of tags',
    <div>
      <div>1</div>2<div>3</div>
    </div>,
    '<div><div>1</div>2<div>3</div></div>',
  );

  itRenders(
    'key is not rendered',
    <div key="key">Content</div>,
    '<div>Content</div>',
  );
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
});

describe('createRoot', () => {
  it('mounts an app', () => {
    const root = document.createElement('root');
    createRoot(root).render(42);
    expectHtml(root).toBe('42');
  });

  it('can unmount an app', async () => {
    const rootDomNode = document.createElement('root');

    const effect = jest.fn().mockImplementation(() => null);
    const Comp = () => {
      useEffect(effect, []);
      return 42;
    };
    const appRoot = createRoot(rootDomNode);

    appRoot.render(<Comp />);
    expectHtml(rootDomNode).toBe('42');

    appRoot.unmount();
    expectHtml(rootDomNode).toBe('');

    await wait(5);
    // It should synchronously drop all pending effects.
    expect(effect).toHaveBeenCalledTimes(0);

    appRoot.render(<Comp />);
    expectHtml(rootDomNode).toBe('42');
    await waitFor(() => expect(effect).toHaveBeenCalledTimes(1));
  });

  it('supports multiple apps simultaneously', async () => {
    type App = 'app1' | 'app2';
    const called: Record<App, number> = { app1: 0, app2: 0 };
    const updatePrefix: Partial<Record<App, StateSetter<string>>> = {};

    const Comp = ({ app }: { app: App }) => {
      let [prefix, setPrefix] = useState('');
      updatePrefix[app] = setPrefix;

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
      updatePrefix['app1']!('p1-');
      updatePrefix['app2']!('p2-');
    });
    await waitFor(() => {
      expectHtml(root1).toBe('p1-app1');
      expectHtml(root2).toBe('p2-app2');
    });
  });
});
