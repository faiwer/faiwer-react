import { createContext, useContext } from '~/hooks/useContext';
import { createPortal, type ReactComponentWithChildren } from '~/index';
import { act } from '~/testing';
import { expectHtml, mount, useStateX } from '../helpers';

describe('Portals', () => {
  it('renders into the given node', () => {
    const target = document.createElement('target');
    const Comp = () => {
      return (
        <>
          before!
          {createPortal('portal', target)}
          !after
        </>
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

    const show = useStateX<boolean>();

    const Comp = () => (
      <>
        before!
        {show.use(true) && createPortal('portal', target)}
        !after
      </>
    );

    const root = mount(<Comp />);
    const mainContent = 'before!!after';
    expectHtml(root).toBe(mainContent);
    expectHtml(target).toBe('portal');
    expectHtml(targetParent).toBe('<target>portal</target>');

    await act(() => show.set(false));
    expectHtml(root).toBe(mainContent);
    expectHtml(target).toBe('');
    expectHtml(targetParent).toBe('<target></target>'); // node is not removed.

    await act(() => show.set(true));
    expectHtml(root).toBe(mainContent);
    expectHtml(target).toBe('portal');
    expectHtml(targetParent).toBe('<target>portal</target>');
  });

  it('supports keys', async () => {
    const targetParent = document.createElement('container');
    const target = document.createElement('target');
    targetParent.appendChild(target);

    const key = useStateX<string>();

    let refLogs: string[] = [];
    const onRef = (v: HTMLDivElement | null) =>
      refLogs.push(v?.tagName ?? 'null');

    const Comp = () => {
      const keyValue = key.use('key-1');

      const portal = createPortal(
        <div ref={onRef} key={keyValue}>
          {keyValue}
        </div>,
        target,
        keyValue,
      );

      return (
        <>
          before!
          {portal}
          !after
        </>
      );
    };

    const root = mount(<Comp />);
    expectHtml(root).toBe('before!!after');
    expectHtml(target).toBe('<div>key-1</div>');
    expect(targetParent.childNodes[0]).toBe(target);
    const div: HTMLElement | null = target.querySelector('div');
    expect(refLogs.join('-')).toBe('DIV');

    refLogs = [];
    await act(() => key.set('key-2'));
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

    const tag = useStateX<'div' | 'span'>();

    const Comp = () => {
      const Tag = tag.use('div');
      return (
        <>
          before!
          {createPortal(<Tag />, target)}
          !after
        </>
      );
    };

    const root = mount(<Comp />);
    expectHtml(root).toBe('before!!after');
    expectHtml(target).toBe('<div></div>');
    expect(targetParent.childNodes[0]).toBe(target);

    await act(() => tag.set('span'));
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
        <>
          {1}
          {2}
        </>
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
      const Container: ReactComponentWithChildren<{
        target: HTMLElement;
      }> = ({ children, target }) => (
        <>
          before!
          {createPortal(children, target)}
          !after
        </>
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

    const value = useStateX<number>();
    const Top = () => (
      <ctx.Provider value={value.use(42)}>
        {createPortal(<Bottom />, target)}
      </ctx.Provider>
    );

    const root = mount(<Top />);
    expectHtml(root).toBe('');
    expectHtml(target).toBe('42');

    await act(() => value.set(101));
    expectHtml(root).toBe('');
    expectHtml(target).toBe('101');
  });
});
