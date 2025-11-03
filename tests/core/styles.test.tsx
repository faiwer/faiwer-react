import { expectHtml, mount } from '../helpers';

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
});
