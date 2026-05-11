import { expectHtml, mount, useStateX } from '../helpers';
import { act } from 'faiwer-react/testing';

describe('styles', () => {
  it('it supports string-based styles', () => {
    const root = mount(<div style="color: red; font-size: 12px">content</div>);
    expectHtml(root).toBe(
      '<div style="color: red; font-size: 12px;">content</div>',
    );
    const div = root.querySelector('div');
    expect(div?.style.color).toBe('red');
    expect(div?.style.fontSize).toBe('12px');
  });

  it('it supports object-based styles', () => {
    const root = mount(
      <div style={{ color: 'red', fontSize: '12px' }}>content</div>,
    );
    expectHtml(root).toBe(
      '<div style="color: red; font-size: 12px;">content</div>',
    );
    const div = root.querySelector('div');
    expect(div?.style.color).toBe('red');
    expect(div?.style.fontSize).toBe('12px');
  });

  it('handles numeric values', () => {
    const root = mount(<div style={{ zIndex: 5 }} />);
    expectHtml(root).toBe(`<div style="z-index: 5;"></div>`);
  });

  it('appends px to numeric values for length-like properties', () => {
    const root = mount(
      <div
        style={{
          left: 245,
          top: 'auto',
          width: 100,
          height: 100,
          zIndex: 1070,
          opacity: 0.5,
        }}
      />,
    );
    const div = root.querySelector('div')!;
    expect(div.style.left).toBe('245px');
    expect(div.style.top).toBe('auto');
    expect(div.style.width).toBe('100px');
    expect(div.style.height).toBe('100px');
    expect(div.style.zIndex).toBe('1070');
    expect(div.style.opacity).toBe('0.5');
  });

  it('updates a numeric length on re-render', async () => {
    const aligned = useStateX<boolean>();
    const Comp = () => (
      <div
        style={{
          position: 'fixed',
          left: aligned.use(false) ? 245 : '-1000vw',
          top: 50,
        }}
      />
    );

    const root = mount(<Comp />);
    expect(root.querySelector('div')!.style.left).toBe('-1000vw');
    expect(root.querySelector('div')!.style.top).toBe('50px');

    await act(() => aligned.set(true));
    expect(root.querySelector('div')!.style.left).toBe('245px');
  });

  it('supports CSS-variables', () => {
    const root = mount(
      <>
        <div
          style={{
            '--main-color': 'blue',
            '--size': 10,
            '--camelCase': 'string',
          }}
        />
        <span style="--main-color: blue; --size: 10; --camelCase: string" />
      </>,
    );

    const css = `--main-color: blue; --size: 10; --camelCase: string;`;
    expectHtml(root).toBe(
      `<div style="${css}"></div><span style="${css}"></span>`,
    );
  });

  it(`It doesn't crush when an unknown style was given`, () => {
    const unknown = 'unknown' as 'all';
    const root = mount(
      <>
        <div style="color: red; unknown: blue" />
        <span style={{ color: 'red', [unknown]: 'blue' }} />
      </>,
    );
    expectHtml(root).toBe(
      '<div style="color: red;"></div><span style="color: red;"></span>',
    );

    const div = root.querySelector('div');
    expect(div?.style.color).toBe('red');
    expect(div?.style[unknown]).toBe(undefined);

    const span = root.querySelector('span');
    expect(span?.style.color).toBe('red');
    expect(span?.style[unknown]).toBe(undefined);
  });

  it('it sync styles on rerenders', async () => {
    const changed = useStateX<boolean>();

    const Comp = () => {
      return changed.use(false) ? (
        <>
          <div style="color: red; border-width: 1px; --a: 0" />
          <span style={{ color: 'red', borderWidth: '1px', ['--a']: 0 }} />
        </>
      ) : (
        <>
          <div style="color: red; font-size: 12px; --b: 42" />
          <span style={{ color: 'red', fontSize: '12px', ['--b']: 42 }} />
        </>
      );
    };

    const root = mount(<Comp />);
    const initialCSS = `color: red; font-size: 12px; --b: 42;`;
    expectHtml(root).toBe(
      `<div style="${initialCSS}"></div>` +
        `<span style="${initialCSS}"></span>`,
    );

    await act(() => changed.set(true));
    const changedCSS = `color: red; border-width: 1px; --a: 0;`;
    expectHtml(root).toBe(
      `<div style="${changedCSS}"></div>` +
        `<span style="${changedCSS}"></span>`,
    );

    await act(() => changed.set(false));
    expectHtml(root).toBe(
      `<div style="${initialCSS}"></div>` +
        `<span style="${initialCSS}"></span>`,
    );
  });

  it('removes styles when set to null', async () => {
    const show = useStateX<boolean>();

    const Comp = () => {
      const showValue = show.use(true);
      return (
        <>
          <div style={showValue ? 'color: red' : null} />
          <span style={showValue ? { color: 'red' } : undefined} />
        </>
      );
    };

    const root = mount(<Comp />);

    await act(() => show.set(false));
    expectHtml(root).toBe(`<div></div><span></span>`);
  });
});
