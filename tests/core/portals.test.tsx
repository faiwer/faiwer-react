import { createContext, useContext } from '~/hooks/useContext';
import {
  createPortal,
  useState,
  type ReactComponent,
  type StateSetter,
} from '~/index';
import { act } from '~/testing';
import { expectHtml, mount } from '../helpers';
import { Fragment } from 'faiwer-react/jsx-runtime';

describe('Portals', () => {
  it('renders into the given node', () => {
    const target = document.createElement('target');
    const Comp = () => {
      return (
        <Fragment>
          before!
          {createPortal('portal', target)}
          !after
        </Fragment>
      );
    };

    const root = mount(<Comp />);
    expectHtml(root).toBe('before!!after');
    expectHtml(target).toBe('portal');
  });

  it("doesn't destroy its target on deletion", async () => {
    const targetParent = document.createElement('container');
    const target = document.createElement('target');
    targetParent.appendChild(target);

    let showPortal: () => void;
    let hidePortal: () => void;

    const Comp = () => {
      const [show, setShow] = useState(true);
      showPortal = () => setShow(true);
      hidePortal = () => setShow(false);
      return (
        <Fragment>
          before!
          {show && createPortal('portal', target)}
          !after
        </Fragment>
      );
    };

    const root = mount(<Comp />);
    const mainContent = 'before!!after';
    expectHtml(root).toBe(mainContent);
    expectHtml(target).toBe('portal');
    expectHtml(targetParent).toBe('<target>portal</target>');

    await act(() => hidePortal!());
    expectHtml(root).toBe(mainContent);
    expectHtml(target).toBe('');
    expectHtml(targetParent).toBe('<target></target>'); // node is not removed.

    await act(() => showPortal!());
    expectHtml(root).toBe(mainContent);
    expectHtml(target).toBe('portal');
    expectHtml(targetParent).toBe('<target>portal</target>');
  });

  it('supports keys', async () => {
    const targetParent = document.createElement('container');
    const target = document.createElement('target');
    targetParent.appendChild(target);

    let updateKey: StateSetter<string>;

    let refLogs: string[] = [];
    const onRef = (v: HTMLDivElement | null) =>
      refLogs.push(v?.tagName ?? 'null');

    const Comp = () => {
      const [key, setKey] = useState('key-1');
      updateKey = setKey;

      const portal = createPortal(
        <div ref={onRef} key={key}>
          {key}
        </div>,
        target,
        key,
      );

      return (
        <Fragment>
          before!
          {portal}
          !after
        </Fragment>
      );
    };

    const root = mount(<Comp />);
    expectHtml(root).toBe('before!!after');
    expectHtml(target).toBe('<div>key-1</div>');
    expect(targetParent.childNodes[0]).toBe(target);
    const div: HTMLElement | null = target.querySelector('div');
    expect(refLogs.join('-')).toBe('DIV');

    refLogs = [];
    await act(() => updateKey('key-2'));
    expectHtml(root).toBe('before!!after');
    expectHtml(target).toBe('<div>key-2</div>');
    expectHtml(targetParent).toBe(`<target><div>key-2</div></target>`);
    expect(div).not.toBe(target.querySelector('div'));
    expect(refLogs.join('-')).toBe('null-DIV');
  });

  it('supports domNode replacement', async () => {
    const targetParent = document.createElement('container');
    const target = document.createElement('target');
    targetParent.appendChild(target);

    let updateTag: StateSetter<'div' | 'span'>;

    const Comp = () => {
      const [tag, setTag] = useState<'div' | 'span'>('div');
      updateTag = setTag;
      const Tag = tag === 'div' ? 'div' : 'span';
      return (
        <Fragment>
          before!
          {createPortal(<Tag />, target)}
          !after
        </Fragment>
      );
    };

    const root = mount(<Comp />);
    expectHtml(root).toBe('before!!after');
    expectHtml(target).toBe('<div></div>');
    expect(targetParent.childNodes[0]).toBe(target);

    await act(() => updateTag('span'));
    expectHtml(root).toBe('before!!after');
    expectHtml(target).toBe('<span></span>');
    expect(targetParent.childNodes[0]).toBe(target);
  });

  const ctx = createContext(0);
  const CtxChild = () => useContext(ctx);
  const Comp = () => 'component';

  const nodes: Array<{ name: string; element: JSX.Element; html: string }> = [
    { name: 'an array-fragment', element: ['1', '2'], html: '12' },
    {
      name: 'a <Fragment/>',
      element: (
        <Fragment>
          {1}
          {2}
        </Fragment>
      ),
      html: '12',
    },
    { name: 'a tag', element: <div>tag</div>, html: '<div>tag</div>' },
    { name: 'a component', element: <Comp />, html: 'component' },
    { name: 'a string', element: 'string', html: 'string' },
    { name: 'an empty string', element: '', html: '' },
    { name: 'null', element: null, html: '' },
    { name: 'false', element: false, html: '' },
    { name: 'undefined', element: undefined, html: '' },
    { name: 'a number', element: 42, html: '42' },
    { name: '0', element: 0, html: '0' },
    {
      name: 'a context provider',
      element: (
        <ctx.Provider value={42}>
          <CtxChild />
        </ctx.Provider>
      ),
      html: '42',
    },
  ];

  for (const { element: node, name, html } of nodes) {
    it(`can render ${name} directly`, () => {
      const Container: ReactComponent<{
        children: JSX.Element;
        target: HTMLElement;
      }> = ({ children, target }) => (
        <Fragment>
          before!
          {createPortal(children, target)}
          !after
        </Fragment>
      );

      const target = document.createElement('target');
      const root = mount(<Container target={target}>{node}</Container>);
      expectHtml(root).toBe(`before!!after`);
      expectHtml(target).toBe(html);
    });
  }

  it('supports context', async () => {
    const ctx = createContext(0);
    const target = document.createElement('target');

    const Bottom = () => useContext(ctx);

    let updateCtxValue: StateSetter<number>;
    const Top = () => {
      const [value, setValue] = useState(42);
      updateCtxValue = setValue;
      return (
        <ctx.Provider value={value}>
          {createPortal(<Bottom />, target)}
        </ctx.Provider>
      );
    };

    const root = mount(<Top />);
    expectHtml(root).toBe('');
    expectHtml(target).toBe('42');

    await act(() => updateCtxValue!(101));
    expectHtml(root).toBe('');
    expectHtml(target).toBe('101');
  });
});
