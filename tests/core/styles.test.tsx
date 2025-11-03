import { useState, type StateSetter } from 'faiwer-react';
import { expectHtml, mount } from '../helpers';
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
    let updateChanged: StateSetter<boolean>;

    const Comp = () => {
      const [changed, setChanged] = useState(false);
      updateChanged = setChanged;

      return changed ? (
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

    await act(() => updateChanged(true));
    const changedCSS = `color: red; border-width: 1px; --a: 0;`;
    expectHtml(root).toBe(
      `<div style="${changedCSS}"></div>` +
        `<span style="${changedCSS}"></span>`,
    );

    await act(() => updateChanged(false));
    expectHtml(root).toBe(
      `<div style="${initialCSS}"></div>` +
        `<span style="${initialCSS}"></span>`,
    );
  });

  it('removes styles when set to null', async () => {
    let updateShow: StateSetter<boolean>;

    const Comp = () => {
      const [show, setShow] = useState(true);
      updateShow = setShow;

      return (
        <>
          <div style={show ? 'color: red' : null} />
          <span style={show ? { color: 'red' } : undefined} />
        </>
      );
    };

    const root = mount(<Comp />);

    await act(() => updateShow!(false));
    expectHtml(root).toBe(`<div></div><span></span>`);
  });
});
