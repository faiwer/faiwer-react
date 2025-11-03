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
          <div style="color: red; border-width: 1px" />
          <span style={{ color: 'red', borderWidth: '1px' }} />
        </>
      ) : (
        <>
          <div style="color: red; font-size: 12px" />
          <span style={{ color: 'red', fontSize: '12px' }} />
        </>
      );
    };

    const root = mount(<Comp />);
    const initialCSS = `color: red; font-size: 12px;`;
    expectHtml(root).toBe(
      `<div style="${initialCSS}"></div>` +
        `<span style="${initialCSS}"></span>`,
    );

    await act(() => updateChanged(true));
    const changedCSS = `color: red; border-width: 1px;`;
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
});
